use anyhow::{anyhow, Context, Result};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelEntry {
    pub id: String,
    pub kind: ModelKind,
    pub url: String,
    pub sha256: Option<String>,
    pub bytes: u64,
    pub files: ModelFiles,
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
    Transducer { encoder: String, decoder: String, joiner: String, tokens: String },
    Whisper { encoder: String, decoder: String, tokens: String },
    Vad { model: String },
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
    Transducer { dir: PathBuf, encoder: PathBuf, decoder: PathBuf, joiner: PathBuf, tokens: PathBuf },
    Whisper { dir: PathBuf, encoder: PathBuf, decoder: PathBuf, tokens: PathBuf },
    Vad { model: PathBuf },
}

pub fn model_dir(root: &Path, id: &str) -> PathBuf {
    root.join(id)
}

pub fn resolve(root: &Path, entry: &ModelEntry) -> Option<ResolvedModel> {
    let dir = model_dir(root, &entry.id);
    match &entry.files {
        ModelFiles::Transducer { encoder, decoder, joiner, tokens } => {
            let (e, d, j, t) = (dir.join(encoder), dir.join(decoder), dir.join(joiner), dir.join(tokens));
            (e.exists() && d.exists() && j.exists() && t.exists())
                .then_some(ResolvedModel::Transducer { dir, encoder: e, decoder: d, joiner: j, tokens: t })
        }
        ModelFiles::Whisper { encoder, decoder, tokens } => {
            let (e, d, t) = (dir.join(encoder), dir.join(decoder), dir.join(tokens));
            (e.exists() && d.exists() && t.exists())
                .then_some(ResolvedModel::Whisper { dir, encoder: e, decoder: d, tokens: t })
        }
        ModelFiles::Vad { model } => {
            let m = dir.join(model);
            m.exists().then_some(ResolvedModel::Vad { model: m })
        }
    }
}

/// Descarga (con callback de progreso), verifica sha256 y extrae si es un archivo.
pub async fn ensure_downloaded<F>(root: &Path, entry: &ModelEntry, mut progress: F) -> Result<ResolvedModel>
where
    F: FnMut(u64, u64),
{
    if let Some(r) = resolve(root, entry) {
        return Ok(r);
    }
    let dir = model_dir(root, &entry.id);
    std::fs::create_dir_all(&dir).context("create model dir")?;

    let is_archive = entry.url.ends_with(".tar.bz2");
    let tmp = dir.join(if is_archive {
        PathBuf::from("download.tar.bz2")
    } else {
        match &entry.files {
            ModelFiles::Vad { model } => PathBuf::from(model),
            _ => PathBuf::from("download.bin"),
        }
    });

    let resp = reqwest::get(&entry.url).await.context("GET model")?.error_for_status()?;
    let total = resp.content_length().unwrap_or(entry.bytes);
    let mut hasher = Sha256::new();
    let mut downloaded = 0u64;
    {
        let mut file = std::fs::File::create(&tmp).context("create tmp")?;
        use std::io::Write;
        let mut stream = resp.bytes_stream();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.context("stream chunk")?;
            hasher.update(&chunk);
            file.write_all(&chunk).context("write chunk")?;
            downloaded += chunk.len() as u64;
            progress(downloaded, total);
        }
        file.flush().ok();
    }

    if let Some(expected) = &entry.sha256 {
        let got = hex_lower(hasher.finalize());
        if &got != expected {
            std::fs::remove_file(&tmp).ok();
            return Err(anyhow!("sha256 mismatch for {}: expected {expected}, got {got}", entry.id));
        }
    }

    if is_archive {
        extract_tar_bz2_flatten(&tmp, &dir).context("extract archive")?;
        std::fs::remove_file(&tmp).ok();
    }

    resolve(root, entry).ok_or_else(|| anyhow!("model files missing after install: {}", entry.id))
}

/// Extrae un .tar.bz2 en `dest`, aplanando el directorio raíz del archivo.
fn extract_tar_bz2_flatten(archive: &Path, dest: &Path) -> Result<()> {
    let f = std::fs::File::open(archive)?;
    let bz = bzip2::read::BzDecoder::new(f);
    let mut ar = tar::Archive::new(bz);
    for entry in ar.entries()? {
        let mut entry = entry?;
        let path = entry.path()?.into_owned();
        let stripped: PathBuf = path.components().skip(1).collect();
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
