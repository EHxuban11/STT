use anyhow::{anyhow, Result};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, StreamConfig};
use ringbuf::traits::{Consumer, Producer, Split};
use ringbuf::HeapRb;
use rubato::{FftFixedIn, Resampler};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;

pub const TARGET_SR: usize = 16_000;
const RESAMPLE_CHUNK: usize = 1024;

/// Stream de captura vivo + sample rate de origen.
pub struct Capture {
    pub stream: cpal::Stream,
    pub src_sr: u32,
    /// Number of mono source-rate frames rejected because the app ring was full.
    pub dropped_samples: Arc<AtomicU64>,
}

impl Capture {
    /// Stop callbacks before dropping the stream so the consumer can drain a stable ring.
    pub fn stop(self) {
        if let Err(e) = self.stream.pause() {
            eprintln!("[audio] could not pause capture stream: {e}");
        }
    }
}

fn push_or_count_drop(
    prod: &mut impl Producer<Item = f32>,
    sample: f32,
    dropped_samples: &AtomicU64,
) {
    if prod.try_push(sample).is_err() {
        dropped_samples.fetch_add(1, Ordering::Relaxed);
    }
}

/// Construye un stream de entrada por defecto que mezcla a mono f32 y empuja a `prod`.
pub fn start_capture(mut prod: impl Producer<Item = f32> + Send + 'static) -> Result<Capture> {
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| anyhow!("no default input device"))?;
    let supported = device.default_input_config()?;
    let src_sr = supported.sample_rate().0;
    let channels = supported.channels() as usize;
    let cfg: StreamConfig = supported.config();
    let err_fn = |e| eprintln!("cpal stream error: {e}");
    let dropped_samples = Arc::new(AtomicU64::new(0));

    macro_rules! mono_push {
        ($ty:ty, $to_f32:expr) => {{
            let dropped_samples_for_callback = dropped_samples.clone();
            device.build_input_stream(
                &cfg,
                move |data: &[$ty], _: &cpal::InputCallbackInfo| {
                    for frame in data.chunks_exact(channels) {
                        let mut acc = 0.0f32;
                        for &s in frame {
                            acc += ($to_f32)(s);
                        }
                        push_or_count_drop(
                            &mut prod,
                            acc / channels as f32,
                            &dropped_samples_for_callback,
                        );
                    }
                },
                err_fn,
                None,
            )?
        }};
    }

    let stream = match supported.sample_format() {
        SampleFormat::F32 => mono_push!(f32, |s: f32| s),
        SampleFormat::I16 => mono_push!(i16, |s: i16| s as f32 / 32768.0),
        SampleFormat::U16 => mono_push!(u16, |s: u16| (s as f32 - 32768.0) / 32768.0),
        other => return Err(anyhow!("unsupported sample format {other:?}")),
    };
    stream.play()?;
    Ok(Capture {
        stream,
        src_sr,
        dropped_samples,
    })
}

/// Resampler en streaming src_sr -> 16k mono.
pub struct Resampler16k {
    inner: FftFixedIn<f32>,
    src_sr: usize,
    in_buf: Vec<f32>,
}

impl Resampler16k {
    pub fn new(src_sr: u32) -> Result<Self> {
        let inner = FftFixedIn::<f32>::new(src_sr as usize, TARGET_SR, RESAMPLE_CHUNK, 1, 1)?;
        Ok(Self {
            inner,
            src_sr: src_sr as usize,
            in_buf: Vec::with_capacity(RESAMPLE_CHUNK * 2),
        })
    }

    pub fn push(&mut self, mono: &[f32], out: &mut Vec<f32>) -> Result<()> {
        if self.src_sr == TARGET_SR {
            out.extend_from_slice(mono);
            return Ok(());
        }
        self.in_buf.extend_from_slice(mono);
        while self.in_buf.len() >= RESAMPLE_CHUNK {
            let chunk: Vec<f32> = self.in_buf.drain(..RESAMPLE_CHUNK).collect();
            let waves_in = vec![chunk];
            let waves_out = self.inner.process(&waves_in, None)?;
            out.extend_from_slice(&waves_out[0]);
        }
        Ok(())
    }

    pub fn flush(&mut self, out: &mut Vec<f32>) -> Result<()> {
        if self.src_sr == TARGET_SR || self.in_buf.is_empty() {
            return Ok(());
        }
        let mut chunk = std::mem::take(&mut self.in_buf);
        chunk.resize(RESAMPLE_CHUNK, 0.0);
        let waves_out = self.inner.process(&vec![chunk], None)?;
        out.extend_from_slice(&waves_out[0]);
        Ok(())
    }
}

/// Ring para ~2s @ 48k.
pub fn make_ring() -> (impl Producer<Item = f32>, impl Consumer<Item = f32>) {
    HeapRb::<f32>::new(48_000 * 2).split()
}

pub fn drain_into(cons: &mut impl Consumer<Item = f32>, scratch: &mut Vec<f32>) -> usize {
    scratch.clear();
    let mut tmp = [0.0f32; 2048];
    let mut total = 0;
    loop {
        let n = cons.pop_slice(&mut tmp);
        if n == 0 {
            break;
        }
        scratch.extend_from_slice(&tmp[..n]);
        total += n;
    }
    total
}

pub type RecordingFlag = Arc<AtomicBool>;
pub fn flag(v: bool) -> RecordingFlag {
    Arc::new(AtomicBool::new(v))
}
pub fn is_recording(f: &RecordingFlag) -> bool {
    f.load(Ordering::Acquire)
}
pub fn set_recording(f: &RecordingFlag, v: bool) {
    f.store(v, Ordering::Release)
}
/// Reclama la grabación de forma ATÓMICA: devuelve true solo si estaba libre (false→true).
/// Evita que eventos "ptt start" repetidos abran dos sesiones simultáneas.
pub fn try_claim(f: &RecordingFlag) -> bool {
    f.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_samples_rejected_by_a_full_ring() {
        let (mut prod, mut cons) = HeapRb::<f32>::new(2).split();
        let dropped = AtomicU64::new(0);

        push_or_count_drop(&mut prod, 0.25, &dropped);
        push_or_count_drop(&mut prod, 0.50, &dropped);
        push_or_count_drop(&mut prod, 0.75, &dropped);
        push_or_count_drop(&mut prod, 1.00, &dropped);
        push_or_count_drop(&mut prod, 1.25, &dropped);

        assert_eq!(dropped.load(Ordering::Relaxed), 3);
        assert_eq!(cons.try_pop(), Some(0.25));

        push_or_count_drop(&mut prod, 1.50, &dropped);
        assert_eq!(dropped.load(Ordering::Relaxed), 3);
        assert_eq!(cons.try_pop(), Some(0.50));
        assert_eq!(cons.try_pop(), Some(1.50));
    }

    #[test]
    fn drain_into_empties_every_queued_sample() {
        let (mut prod, mut cons) = make_ring();
        for sample in 0..5_000 {
            assert!(prod.try_push(sample as f32).is_ok());
        }

        let mut drained = Vec::new();
        assert_eq!(drain_into(&mut cons, &mut drained), 5_000);
        assert_eq!(
            drained,
            (0..5_000).map(|sample| sample as f32).collect::<Vec<_>>()
        );
        assert_eq!(cons.try_pop(), None);
    }
}
