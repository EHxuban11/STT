use anyhow::{anyhow, Result};
use rubato::{FftFixedIn, Resampler};
use std::fs::File;
use std::path::Path;
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error as SymphoniaError;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;

use crate::stt::SAMPLE_RATE;

const RESAMPLE_CHUNK: usize = 2048;

pub struct DecodedAudio {
    pub samples_16k: Vec<f32>,
    pub duration_seconds: f32,
}

pub fn decode_to_16k_mono(path: &Path) -> Result<DecodedAudio> {
    let file = File::open(path).map_err(|e| anyhow!("Could not open file: {e}"))?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
        hint.with_extension(ext);
    }

    let probed = symphonia::default::get_probe()
        .format(
            &hint,
            mss,
            &FormatOptions::default(),
            &MetadataOptions::default(),
        )
        .map_err(|e| anyhow!("Unsupported or unreadable media file: {e}"))?;
    let mut format = probed.format;

    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or_else(|| anyhow!("No supported audio track found in this file"))?;

    let track_id = track.id;
    let src_rate = track
        .codec_params
        .sample_rate
        .ok_or_else(|| anyhow!("Audio track has no sample rate"))?;
    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .map_err(|e| anyhow!("Could not create decoder for this audio track: {e}"))?;

    let mut mono = Vec::<f32>::new();

    loop {
        let packet = match format.next_packet() {
            Ok(packet) => packet,
            Err(SymphoniaError::IoError(_)) => break,
            Err(SymphoniaError::ResetRequired) => {
                return Err(anyhow!(
                    "Decoder reset required; this media file is not supported yet"
                ));
            }
            Err(e) => return Err(anyhow!("Could not read media packet: {e}")),
        };

        if packet.track_id() != track_id {
            continue;
        }

        let decoded = match decoder.decode(&packet) {
            Ok(decoded) => decoded,
            Err(SymphoniaError::DecodeError(_)) => continue,
            Err(e) => return Err(anyhow!("Could not decode audio packet: {e}")),
        };

        let spec = *decoded.spec();
        let channels = spec.channels.count().max(1);
        let mut sample_buf = SampleBuffer::<f32>::new(decoded.capacity() as u64, spec);
        sample_buf.copy_interleaved_ref(decoded);

        for frame in sample_buf.samples().chunks(channels) {
            let sum: f32 = frame.iter().copied().sum();
            mono.push(sum / frame.len() as f32);
        }
    }

    if mono.is_empty() {
        return Err(anyhow!("No decodable audio samples found"));
    }

    let duration_seconds = mono.len() as f32 / src_rate as f32;
    let samples_16k = resample_mono(&mono, src_rate as usize, SAMPLE_RATE as usize)?;

    Ok(DecodedAudio {
        samples_16k,
        duration_seconds,
    })
}

fn resample_mono(mono: &[f32], src_rate: usize, target_rate: usize) -> Result<Vec<f32>> {
    if src_rate == target_rate {
        return Ok(mono.to_vec());
    }

    let mut resampler = FftFixedIn::<f32>::new(src_rate, target_rate, RESAMPLE_CHUNK, 1, 1)?;
    let mut input = mono.to_vec();
    let mut out = Vec::with_capacity(
        (mono.len() as f64 * target_rate as f64 / src_rate as f64) as usize + target_rate,
    );

    while input.len() >= RESAMPLE_CHUNK {
        let chunk: Vec<f32> = input.drain(..RESAMPLE_CHUNK).collect();
        let waves_out = resampler.process(&vec![chunk], None)?;
        out.extend_from_slice(&waves_out[0]);
    }

    if !input.is_empty() {
        input.resize(RESAMPLE_CHUNK, 0.0);
        let waves_out = resampler.process(&vec![input], None)?;
        out.extend_from_slice(&waves_out[0]);
    }

    Ok(out)
}
