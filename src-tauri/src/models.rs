use anyhow::{anyhow, Context, Result};
use futures_util::StreamExt;
use reqwest::header::RANGE;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelEntry {
    pub id: String,
    pub kind: ModelKind,
    pub url: String,
    pub sha256: Option<String>,
    pub bytes: u64,
    #[serde(default)]
    pub contextual_biasing: Option<ContextualBiasingAsset>,
    pub files: ModelFiles,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextualBiasingAsset {
    pub vocab: String,
    pub url: String,
    pub range_start: u64,
    pub range_end: u64,
    pub sha256: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ModelKind {
    Transducer,
    Whisper,
    Vad,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ModelFiles {
    Transducer {
        encoder: String,
        decoder: String,
        joiner: String,
        tokens: String,
    },
    Whisper {
        encoder: String,
        decoder: String,
        tokens: String,
    },
    Vad {
        model: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Catalog {
    pub models: Vec<ModelEntry>,
}

impl Catalog {
    pub fn load(path: Option<&Path>) -> Result<Self> {
        if let Some(p) = path {
            let txt = std::fs::read_to_string(p)
                .with_context(|| format!("read catalog {}", p.display()))?;
            return Ok(serde_json::from_str(&txt)?);
        }
        Ok(serde_json::from_str(DEFAULT_CATALOG_JSON)?)
    }
    pub fn get(&self, id: &str) -> Option<&ModelEntry> {
        self.models.iter().find(|m| m.id == id)
    }
}

#[derive(Debug, Clone)]
pub enum ResolvedModel {
    Transducer {
        dir: PathBuf,
        encoder: PathBuf,
        decoder: PathBuf,
        joiner: PathBuf,
        tokens: PathBuf,
        bpe_vocab: Option<PathBuf>,
    },
    Whisper {
        dir: PathBuf,
        encoder: PathBuf,
        decoder: PathBuf,
        tokens: PathBuf,
    },
    Vad {
        model: PathBuf,
    },
}

pub fn model_dir(root: &Path, id: &str) -> PathBuf {
    root.join(id)
}

pub fn resolve(root: &Path, entry: &ModelEntry) -> Option<ResolvedModel> {
    let dir = model_dir(root, &entry.id);
    if has_incomplete_install(&dir) {
        return None;
    }
    resolve_files(root, entry)
}

fn resolve_files(root: &Path, entry: &ModelEntry) -> Option<ResolvedModel> {
    let dir = model_dir(root, &entry.id);
    match &entry.files {
        ModelFiles::Transducer {
            encoder,
            decoder,
            joiner,
            tokens,
        } => {
            let (e, d, j, t) = (
                dir.join(encoder),
                dir.join(decoder),
                dir.join(joiner),
                dir.join(tokens),
            );
            let bpe_vocab = entry
                .contextual_biasing
                .as_ref()
                .map(|asset| dir.join(&asset.vocab))
                .filter(|path| path.exists());
            (e.exists() && d.exists() && j.exists() && t.exists()).then_some(
                ResolvedModel::Transducer {
                    dir,
                    encoder: e,
                    decoder: d,
                    joiner: j,
                    tokens: t,
                    bpe_vocab,
                },
            )
        }
        ModelFiles::Whisper {
            encoder,
            decoder,
            tokens,
        } => {
            let (e, d, t) = (dir.join(encoder), dir.join(decoder), dir.join(tokens));
            (e.exists() && d.exists() && t.exists()).then_some(ResolvedModel::Whisper {
                dir,
                encoder: e,
                decoder: d,
                tokens: t,
            })
        }
        ModelFiles::Vad { model } => {
            let m = dir.join(model);
            m.exists().then_some(ResolvedModel::Vad { model: m })
        }
    }
}

struct InstallLock {
    path: PathBuf,
}

impl Drop for InstallLock {
    fn drop(&mut self) {
        fs::remove_file(&self.path).ok();
    }
}

fn has_incomplete_install(dir: &Path) -> bool {
    let lock = dir.join(".install.lock");
    lock.exists() && !is_stale_lock(&lock)
}

fn cleanup_incomplete_artifacts(dir: &Path) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let name = entry.file_name();
        let Some(name) = name.to_str() else {
            continue;
        };
        if name.starts_with(".download.") {
            fs::remove_file(entry.path()).ok();
        } else if name.starts_with(".extract.") {
            fs::remove_dir_all(entry.path()).ok();
        }
    }
}

fn acquire_install_lock(dir: &Path) -> Result<InstallLock> {
    let path = dir.join(".install.lock");
    loop {
        match OpenOptions::new().write(true).create_new(true).open(&path) {
            Ok(mut file) => {
                writeln!(
                    file,
                    "pid={} created={}",
                    std::process::id(),
                    timestamp_nanos()
                )
                .ok();
                file.sync_all().ok();
                return Ok(InstallLock { path });
            }
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                if is_stale_lock(&path) {
                    fs::remove_file(&path).ok();
                } else {
                    thread::sleep(Duration::from_millis(400));
                }
            }
            Err(e) => return Err(e).context("create install lock"),
        }
    }
}

fn is_stale_lock(path: &Path) -> bool {
    let Ok(metadata) = fs::metadata(path) else {
        return false;
    };
    let Ok(modified) = metadata.modified() else {
        return false;
    };
    modified
        .elapsed()
        .map(|age| age > Duration::from_secs(60 * 60 * 2))
        .unwrap_or(false)
}

fn timestamp_nanos() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or_default()
}

fn unique_temp_path(dir: &Path, ext: &str) -> PathBuf {
    dir.join(format!(
        ".download.{}.{}.{}",
        std::process::id(),
        timestamp_nanos(),
        ext
    ))
}

fn unique_stage_dir(dir: &Path) -> PathBuf {
    dir.join(format!(
        ".extract.{}.{}",
        std::process::id(),
        timestamp_nanos()
    ))
}

fn expected_files(entry: &ModelEntry) -> Vec<PathBuf> {
    match &entry.files {
        ModelFiles::Transducer {
            encoder,
            decoder,
            joiner,
            tokens,
        } => vec![encoder, decoder, joiner, tokens]
            .into_iter()
            .map(PathBuf::from)
            .collect(),
        ModelFiles::Whisper {
            encoder,
            decoder,
            tokens,
        } => vec![encoder, decoder, tokens]
            .into_iter()
            .map(PathBuf::from)
            .collect(),
        ModelFiles::Vad { model } => vec![PathBuf::from(model)],
    }
}

/// Descarga (con callback de progreso), verifica sha256 y extrae si es un archivo.
pub async fn ensure_downloaded<F>(
    root: &Path,
    entry: &ModelEntry,
    mut progress: F,
) -> Result<ResolvedModel>
where
    F: FnMut(u64, u64),
{
    if let Some(r) = resolve(root, entry) {
        return Ok(r);
    }
    let dir = model_dir(root, &entry.id);
    fs::create_dir_all(&dir).context("create model dir")?;
    let _lock = acquire_install_lock(&dir)?;
    cleanup_incomplete_artifacts(&dir);

    if let Some(r) = resolve_files(root, entry) {
        return Ok(r);
    }

    let is_archive = entry.url.ends_with(".tar.bz2");
    let tmp = unique_temp_path(&dir, if is_archive { "tar.bz2" } else { "bin" });
    let final_single = if is_archive {
        None
    } else {
        match &entry.files {
            ModelFiles::Vad { model } => Some(dir.join(model)),
            _ => None,
        }
    };

    let resp = reqwest::get(&entry.url)
        .await
        .context("GET model")?
        .error_for_status()?;
    let expected_total = resp.content_length();
    let total = expected_total.unwrap_or(entry.bytes);
    let mut hasher = Sha256::new();
    let mut downloaded = 0u64;
    {
        let mut file = fs::File::create(&tmp).context("create tmp")?;
        let mut stream = resp.bytes_stream();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.context("stream chunk")?;
            hasher.update(&chunk);
            file.write_all(&chunk).context("write chunk")?;
            downloaded += chunk.len() as u64;
            progress(downloaded, total);
        }
        file.flush().ok();
        file.sync_all().ok();
    }

    if let Some(expected) = expected_total {
        if downloaded != expected {
            fs::remove_file(&tmp).ok();
            return Err(anyhow!(
                "incomplete download for {}: expected {expected} bytes, got {downloaded}",
                entry.id
            ));
        }
    }

    if let Some(expected) = &entry.sha256 {
        let got = hex_lower(hasher.finalize());
        if &got != expected {
            fs::remove_file(&tmp).ok();
            return Err(anyhow!(
                "sha256 mismatch for {}: expected {expected}, got {got}",
                entry.id
            ));
        }
    }

    if is_archive {
        let stage = unique_stage_dir(&dir);
        fs::create_dir_all(&stage).context("create extract staging dir")?;
        extract_tar_bz2_flatten(&tmp, &stage).context("extract archive")?;
        let expected = expected_files(entry);
        for file in &expected {
            if !stage.join(file).exists() {
                fs::remove_dir_all(&stage).ok();
                fs::remove_file(&tmp).ok();
                return Err(anyhow!(
                    "model file missing from archive: {}",
                    file.display()
                ));
            }
        }
        for file in expected {
            let from = stage.join(&file);
            let to = dir.join(&file);
            if let Some(parent) = to.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::remove_file(&to).ok();
            fs::rename(&from, &to)
                .with_context(|| format!("move extracted model file {}", file.display()))?;
        }
        fs::remove_dir_all(&stage).ok();
        fs::remove_file(&tmp).ok();
    } else if let Some(final_path) = final_single {
        fs::remove_file(&final_path).ok();
        fs::rename(&tmp, &final_path)
            .with_context(|| format!("install model file {}", final_path.display()))?;
    } else {
        fs::remove_file(&tmp).ok();
        return Err(anyhow!(
            "unsupported non-archive model layout: {}",
            entry.id
        ));
    }

    resolve_files(root, entry)
        .ok_or_else(|| anyhow!("model files missing after install: {}", entry.id))
}

/// Downloads the tiny SentencePiece vocabulary required to turn user-entered
/// phrases into Parakeet tokens. The source `.nemo` files are uncompressed tar
/// archives, so an HTTP range request retrieves only the vocabulary member.
pub async fn ensure_contextual_biasing_vocab(
    root: &Path,
    entry: &ModelEntry,
) -> Result<Option<PathBuf>> {
    let Some(asset) = &entry.contextual_biasing else {
        return Ok(None);
    };
    if asset.range_end < asset.range_start {
        return Err(anyhow!(
            "invalid contextual vocabulary byte range for {}",
            entry.id
        ));
    }

    let dir = model_dir(root, &entry.id);
    fs::create_dir_all(&dir).context("create model dir")?;
    let final_path = dir.join(&asset.vocab);
    if verified_file(&final_path, &asset.sha256)? {
        return Ok(Some(final_path));
    }

    let _lock = acquire_install_lock(&dir)?;
    if verified_file(&final_path, &asset.sha256)? {
        return Ok(Some(final_path));
    }

    let tmp = unique_temp_path(&dir, "bpe.vocab");
    let response = reqwest::Client::new()
        .get(&asset.url)
        .header(
            RANGE,
            format!("bytes={}-{}", asset.range_start, asset.range_end),
        )
        .send()
        .await
        .context("GET contextual vocabulary")?
        .error_for_status()
        .context("contextual vocabulary response")?;

    let expected_len = asset.range_end - asset.range_start + 1;
    let mut stream = response.bytes_stream();
    let mut hasher = Sha256::new();
    let mut downloaded = 0u64;
    {
        let mut file = fs::File::create(&tmp).context("create contextual vocabulary tmp")?;
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.context("stream contextual vocabulary")?;
            downloaded += chunk.len() as u64;
            if downloaded > expected_len {
                break;
            }
            hasher.update(&chunk);
            file.write_all(&chunk)
                .context("write contextual vocabulary")?;
        }
        file.flush().ok();
        file.sync_all().ok();
    }

    let digest = hex_lower(hasher.finalize());
    if downloaded != expected_len || digest != asset.sha256.to_lowercase() {
        fs::remove_file(&tmp).ok();
        return Err(anyhow!(
            "contextual vocabulary verification failed for {}",
            entry.id
        ));
    }

    fs::remove_file(&final_path).ok();
    fs::rename(&tmp, &final_path).context("install contextual vocabulary")?;
    Ok(Some(final_path))
}

fn verified_file(path: &Path, expected_sha256: &str) -> Result<bool> {
    if !path.exists() {
        return Ok(false);
    }
    let bytes = fs::read(path).with_context(|| format!("read {}", path.display()))?;
    Ok(hex_lower(Sha256::digest(bytes)) == expected_sha256.to_lowercase())
}

/// Extrae un .tar.bz2 en `dest`, aplanando el directorio raíz del archivo.
fn extract_tar_bz2_flatten(archive: &Path, dest: &Path) -> Result<()> {
    let f = std::fs::File::open(archive)?;
    let bz = bzip2::read::BzDecoder::new(f);
    let mut ar = tar::Archive::new(bz);
    for entry in ar.entries()? {
        let mut entry = entry?;
        let path = entry.path()?.into_owned();
        let mut stripped = PathBuf::new();
        for component in path.components().skip(1) {
            match component {
                Component::Normal(part) => stripped.push(part),
                Component::CurDir => {}
                _ => continue,
            }
        }
        if stripped.as_os_str().is_empty() {
            continue;
        }
        let out = dest.join(stripped);
        if let Some(parent) = out.parent() {
            std::fs::create_dir_all(parent)?;
        }
        entry.unpack(&out)?;
    }
    Ok(())
}

fn hex_lower(bytes: impl AsRef<[u8]>) -> String {
    bytes.as_ref().iter().map(|b| format!("{b:02x}")).collect()
}

pub const DEFAULT_CATALOG_JSON: &str = include_str!("../models.json");

#[cfg(test)]
mod contextual_biasing_asset_tests {
    use super::*;

    #[test]
    fn parakeet_catalog_entries_pin_verified_contextual_vocabularies() {
        let catalog = Catalog::load(None).expect("embedded catalog");
        for id in ["parakeet-tdt-0.6b-v2-int8", "parakeet-tdt-0.6b-v3-int8"] {
            let asset = catalog
                .get(id)
                .and_then(|entry| entry.contextual_biasing.as_ref())
                .expect("Parakeet contextual vocabulary metadata");
            assert!(asset.url.contains("/resolve/"));
            assert!(!asset.url.contains("/resolve/main/"));
            assert!(asset.range_end >= asset.range_start);
            assert_eq!(asset.sha256.len(), 64);
        }
    }

    #[test]
    #[ignore = "network integration test for the pinned NVIDIA tokenizer range"]
    fn downloads_and_verifies_pinned_contextual_vocabularies() {
        let catalog = Catalog::load(None).expect("embedded catalog");
        let root = std::env::temp_dir().join(format!(
            "yawningface-contextual-vocab-test-{}",
            timestamp_nanos()
        ));

        for (id, length, sha256) in [
            (
                "parakeet-tdt-0.6b-v2-int8",
                10_393,
                "dbe7ec6bd066c4526080940e1614e6582b9161515e856c2c39a1d49267c88cbc",
            ),
            (
                "parakeet-tdt-0.6b-v3-int8",
                101_024,
                "41130ff456706304a1adec782ccc9e003c4d417e8e324353d281be958cac4e17",
            ),
        ] {
            let entry = catalog.get(id).expect("Parakeet entry").clone();
            let path =
                tauri::async_runtime::block_on(ensure_contextual_biasing_vocab(&root, &entry))
                    .expect("download contextual vocabulary")
                    .expect("contextual vocabulary path");
            assert_eq!(fs::metadata(&path).expect("metadata").len(), length);
            assert!(verified_file(&path, sha256).expect("verify downloaded vocabulary"));
        }

        fs::remove_dir_all(root).ok();
    }
}
