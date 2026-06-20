# Vowen 0.4.7 — Teardown (análisis estático) y plan de clon en Tauri

> Análisis hecho sobre `Vowen-Setup-0.4.7-1781896475812.exe`
> SHA256 `73ecb656c4c35fdd67057c27ed9c742f8f00c0b07e40993308cadd748b5e03a4`
> Método: extracción del instalador NSIS → `app-64.7z` → `app.asar`, y **desofuscación** del proceso main (`javascript-obfuscator`, string-array + base64 + rotación).

---

## 1. Veredicto de seguridad (¿virus?)

**No se han encontrado indicios de malware.** Es una app comercial **Electron** legítima.

Qué hace y por qué es coherente:

| Comportamiento observado | Interpretación |
|---|---|
| Instalador NSIS estándar + `vc_redist.x64.exe` + plugins NSIS normales | Empaquetado típico de electron-builder |
| Telemetría a **PostHog** y errores a **Sentry** | Analítica/diagnóstico comercial estándar |
| Backend propio: `vowen.ai` + **Supabase** (auth/datos) | Cuenta de usuario, licencias, sync |
| Hooks de teclado globales (`uiohook-napi`, `keyspy`) | **Necesario** para push-to-talk y "teclear" el dictado en la app activa |
| `@paymoapp/active-window` + PowerShell que lista accesos directos `.lnk` del Menú Inicio (`nombre|||ruta`) | Saber en qué app dictas / comandos por app. Lee local, no exfiltra en ese punto |
| `powershell Get-CimInstance Win32_VideoController` | Detectar GPU (para acelerar / telemetría) |
| `nircmd.exe` en recursos | Utilidad NirSoft (audio/sistema) |
| `security-core.js` **ofuscado (RC4)** | Módulo de **licencia/activación** (strings en claro: "activate", "licence"). Técnica anti-piratería estándar |

**Capacidades sensibles para privacidad** (esperables en un dictado, pero conviene saberlas): micrófono, hook de teclado global, lista de apps instaladas, ventana activa, captura de pantalla (meeting notes), envío de audio/texto a proveedores en la nube si los activas.

**Única salvedad honesta:** `security-core.js` está cifrado y **no se pudo leer del todo** de forma estática (usa clave RC4 por llamada). Es consistente con licencia/activación. Para certeza del 100%: subir el hash a **VirusTotal** y/o ejecución en una **VM aislada** observando red/syscalls.

---

## 2. Arquitectura

- **Electron** (Chromium + Node). Múltiples ventanas/entries en el renderer: `main.js` (la "píldora" de dictado), `settings.js`, `meeting-indicator.js`, `share-card.js`, `KeyCombo.js` (selector de atajo).
- **STT local vía servidor/daemon local**: lanza un **Parakeet daemon/CLI** (`ParakeetDaemon`, `parakeet-cli`, ONNX int8) y/o un **`whisper-server` en `localhost:3001`** (whisper.cpp, build CUDA opcional). El main habla con ese servidor.
- Base de datos local **SQLite** (`sqlite3` + `sequelize` + migraciones `umzug`).
- Auto-update (`electron-updater`).

---

## 3. Motor de voz (STT) — qué modelos descarga

**Local (offline):**
- **NVIDIA Parakeet** (motor principal): `parakeet-tdt-0.6b-v3-int8` (multilingüe, ONNX int8, Windows), v2, `-ctc-zh-cn` (chino), `-ja` (japonés), `parakeet-eou-streaming` (fin de locución). Descarga: `https://assets.vowen.ai/models/...tar.gz`. Origen: **FluidInference** en HuggingFace.
- **Whisper.cpp** (ggml): `ggml-{tiny,base,small,medium,large-v3,large-v3-turbo}{,.en}.bin` desde `huggingface.co/ggerganov/whisper.cpp`.
- **whisper-server CUDA** para GPU NVIDIA: `whisper-server-win32-x64-cuda.tar.gz` (bucket R2).
- Silero (VAD) para detección de voz.

**Nube (opcional, trae tu API key):** OpenAI (Whisper), Deepgram, AssemblyAI, Groq, ElevenLabs, Soniox, Cartesia, Mistral, + "custom server".

## 4. Capa LLM (post-proceso) — catálogo `assets.vowen.ai/ai-models.json`

Para formatear el dictado, comandos de voz, resúmenes de reunión y chat. Proveedores: OpenAI, Anthropic, Groq, Gemini, DeepSeek, Straico, Azure, Cerebras, OpenRouter, AWS Bedrock. (Modelos servidos desde su CDN, p. ej. GPT‑5.x, Claude Haiku 4.5, Gemini 3.x).

---

## 5. Superficie de funcionalidades (extraída de los canales IPC)

- **Dictado:** start/stop/pause recording, push-to-talk, **detección de tecla Fn**, manos libres ("handsfree"), "idle pill", auto-paste al portapapeles/app activa, banner de pegado.
- **Modelos:** check/download/delete model, descarga/borrado de binario CUDA, estado GPU, "warming"/optimización, cambiar modelo y re-transcribir.
- **Transcripción de archivos:** transcribe/retranscribe file, historial, etiquetas, editar texto, etiquetas de hablante.
- **Meeting Notes:** grabación de reunión, detección automática de reunión, capturas de pantalla, diarización (merge speakers), resumen y transcript generados por LLM, export a documento/audio, indicador flotante con chat de contexto.
- **Chat IA:** enviar/parar/limpiar.
- **Memoria/contexto:** add/delete/index memory items (ficheros y notas) — RAG local.
- **Vocabulario/Diccionario:** vocabulario personalizado, corrección de vocab.
- **Text expander / Snippets:** expansiones con triggers (`:date`, `:time`, etc.), tags, tutorial.
- **Workflows / Utilidades personalizadas:** get/update custom workflows & utilities; cambiar proveedor IA y reintentar.
- **Sync:** OneDrive / Obsidian vault / proveedores; push/pull, settings.
- **Webhooks** y **MCP** (Model Context Protocol: connect/disconnect/list/clear-token).
- **Permisos:** micrófono, accesibilidad, grabación de pantalla.
- **Licencia:** activate/deactivate, estado, plan/uso, feature flags.
- **Stats:** actividad diaria, lifetime stats.
- **Ventanas/UI:** settings (con pestañas), tray, redimensionado dinámico, timer window, share card, "what's new", onboarding.

**Menú de bandeja (tray):** Vowen · Stop Recording · Copy Last Transcription · Transcribe File · History · Dictionary · Workflows · Notes · Language · Microphone · Tones · Settings… · Contact Us · Privacy Policy · Quit Vowen.

---

## 6. Plan de clon en Tauri (borrador)

**Objetivo:** app ligera (Tauri = WebView del sistema + backend Rust, ~10–20 MB vs ~190 MB) para equipos con pocos recursos, con el mismo núcleo: dictado global por atajo → STT local → pegar texto.

**Stack propuesto:**
- **Tauri 2** (Rust) + frontend ligero (React/Svelte/Vanilla).
- **STT local:** `whisper.cpp` (modelo `ggml-base`/`small`, o `tiny` en equipos muy justos) vía binario o binding Rust (`whisper-rs`). Opción Parakeet (sherpa-onnx) más adelante.
- **Atajo global:** plugin `tauri-plugin-global-shortcut`.
- **Captura de audio:** `cpal` (Rust) o WebAudio en el front.
- **Inyección de texto:** `enigo` (Rust) para "teclear"/pegar en la app activa.
- **Bandeja:** API de tray de Tauri.
- **(Opcional) capa LLM** y proveedores nube como extras.

**MVP (fase 1):** atajo global → grabar mientras se mantiene → whisper.cpp local → insertar texto + copiar al portapapeles. Tray con Start/Stop, selección de micro, idioma y modelo. Ajustes mínimos.
