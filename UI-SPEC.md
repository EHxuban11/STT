# Vowen — UI Specification (for React rebuild)

This document specifies the UI of **Vowen**, a desktop speech-to-text / dictation app, reconstructed from screenshots. It is intended for a developer to rebuild every page faithfully in React.

- **Source screenshots:** `C:\Users\Usuario\Desktop\Vowen-screenshots\1.png` … `32.png`
- **Screenshots 1–12:** Onboarding wizard (summarized only — see "Onboarding (reference only)").
- **Screenshots 13–32:** Main app pages + Settings modal + dialogs (documented in full).

> Notes on fidelity: All quoted text is transcribed verbatim from the screenshots. Where a value is partially obscured (e.g. the Sync tab is dimmed behind a "Cloud Sync — Upgrade to Pro" overlay), this is flagged inline. Hex colors are **visual approximations**, not sampled values. App version shown in Settings footer: **v0.4.7**.

---

## 1. Design System (global)

### 1.1 Color palette (approximate)

| Token | Approx hex | Usage |
|---|---|---|
| App background (content) | `#FFFFFF` | Main content area, light mode |
| Page/hero card background | `#F4F4F5` / `#F2F2F3` | Soft gray rounded "hero" banner cards (e.g. "Choose your transcription engine") |
| Sidebar background | `#F0F0F1` (very light warm gray) | Left navigation rail |
| Card background | `#FFFFFF` with subtle border | List rows, stat cards |
| Card / row border | `#ECECEC` / `#E5E5E5` | 1px hairline borders |
| Text primary | `#1A1A1A` / near-black | Headings, body |
| Text secondary | `#8A8A8A` / `#9CA3AF` | Helper/subtitle text, counters |
| Purple accent (brand) | `~#7C6FE8` / `#8B7DF0` | Logo, "Vowen" gradient word, accent highlights, "Pro" badge text, links, lock icons |
| Green success | `~#34C759` / `#3BB273` | Selected-model check, "Granted", "Transcription successful", permission check badge |
| Primary button (dark) | `#1C1C1E` bg / `#FFFFFF` text | "Get started", "Continue", "Try it out", "Add Word", "Create Tone", etc. |
| Toggle ON track | `#1C1C1E` (near-black) | Switches in ON state |
| Toggle OFF track | `#D9D9DE` (light gray) | Switches in OFF state |
| "Setup" link/badge | `~#E0922B` / amber-orange | "Setup" affordance on provider rows |
| "Upgrade to Pro" pill | white bg, purple text + border | Pro-gated controls |
| Amber/warning note bg | `~#FBF3E0` | "This is Preview only…" notice (onboarding) |

### 1.2 Typography
- Sans-serif system UI font (Inter / SF-like). Headings are bold and fairly large (e.g. "Hi there, XC" ~28–32px bold). Body ~14px. Helper text ~12–13px, secondary gray.
- Brand word **Vowen** and section accent words are rendered with a purple/gradient tint (e.g. "**Code** faster", "Personalize", "permissions", "local AI", "workflow", "expansion", "threads", "commands", "notes").

### 1.3 Shape & spacing
- **Border radius:** Cards/hero banners ~12–16px; list rows ~10–12px; pills/buttons fully rounded (pill) or ~8–10px; the brand logo tile is a rounded square ~10px.
- Generous padding inside cards (~16–24px). Comfortable vertical rhythm between sections.
- Primary CTA buttons are **pill-shaped, near-black, white bold text**.

### 1.4 Window chrome (frameless)
- **Top-right window controls** on every main page: a **theme toggle** (moon/crescent icon), an **account icon** (circle-user / person-in-circle), then **minimize (–)**, and **close (×)**. (Maximize may exist but the visible set reads as theme · account · minimize · close.)
- **Top-left of content:** a small **sidebar-collapse icon** (panel-left / sidebar toggle) sits at the very top-left, above the logo region.
- Each page has a **contextual top bar** centered/left area that changes per page (tabs, a primary action button, or a model pill).

### 1.5 Persistent left sidebar (all main pages)
Top to bottom:
1. **Logo:** purple rounded-square mark + wordmark "**Vowen**" + small outlined pill badge "**Free**".
2. **Nav group (primary):**
   - **Home** — house icon
   - **Transcribe** — microphone icon
   - **Speech models** — 3D box / cube icon
   - **Dictionary** — open-book icon
   - **Workflows** — connected-nodes / workflow icon
3. **Section header:** "**VOWEN AI**" (small uppercase, purple) with a small pencil/edit icon next to it.
4. **Nav group (AI):**
   - **Configure your AI** — sparkles/wand-with-stars icon
   - **Notes** — document/file-text icon
   - **Tones** — sliders/equalizer icon
5. **Bottom (pinned):**
   - **Settings** — gear icon
   - **Help** — question-mark-in-circle icon

**Active nav item style:** filled light-gray rounded rectangle highlight with the label in near-black bold (e.g. Home highlighted on screenshot 13, Speech models on 15). Inactive items use medium-gray icon + text. (Tones on screenshot 21 shows an additional focus ring — an amber/orange 1px outline — indicating keyboard focus rather than the normal selected fill.)

---

## 2. Onboarding (reference only — screenshots 1–12)

Wizard with **progress dots** centered at top, a "Back" link top-left, "Help" bottom-left, theme toggle top-right. One line each:

1. **1.png** — Welcome / hero: "**Code** faster **with your voice.**" — subtitle "Voice-first productivity for your desktop.", primary **Get started**, "By continuing, I accept Vowen's Privacy Policy".
2. **2.png** — "**Personalize** your experience": Name + Email inputs (email optional), and "What will you use your voice for?" choice chips (Chatting with AI, Sending messages, Coding with AI, Drafting emails, Writing documents, Taking notes, Meeting summaries, Automating tasks, Something else). **Continue**.
3. **3.png** — Privacy: "What you say stays with **you**" — local/private processing message, "privacy policy" link. **Continue**.
4. **4.png** — "**Grant permissions**": Microphone row "Required for voice recording" with "● Granted". **Continue**.
5. **5.png** — "Your **local AI**": model picker (Parakeet V2 "English only · 451 MB" **Recommended**, selected; Parakeet V3 "Multilingual · 478 MB"), **Download model**.
6. **6.png** — "Try your **voice**": press-and-hold Ctrl + mic to record; transcription textarea placeholder "Your transcription will appear here…"; "✓ Transcription successful". **Continue**.
7. **7.png** — "Try a **workflow**": hold Ctrl + shift, sample phrases ("Google weather today", "YouTube steak recipes", "Open Downloads"). **Continue**.
8. **8.png** — "Try an **expansion**": type `:ooo` / `:sign` / `:addr` to expand; "Try it out" input. **Continue**.
9. **9.png** — "Try **threads**": hold Ctrl+shift and say "You can reach us at our phone or our email." **Continue**.
10. **10.png** — "Try **commands**" (Command Mode): hold Alt + 2; chips (Polish text, Convert media, Merge PDFs, Compress images, Translate); note "This is Preview only. Command Mode requires an API key." **Continue**.
11. **11.png** — "Capture **notes**": auto-detect meetings, transcribe, write minutes. **Continue**.
12. **12.png** — **Paywall modal**: "Free vs Vowen **Pro**" two-column comparison, "Stay on Free" vs "Get Vowen Pro →" ($49), close ×. (Dimensions in screenshot are small; full feature lists not legible — treat as a pricing/comparison modal.)

---

## 3. Main App Pages (screenshots 13–32)

### 3.1 Home (screenshot 13)

**Layout:** Sidebar present (Home active). Top bar: small **"Get Pro"** pill button (purple-outlined, top-left of content) · centered **segmented tab control "Overview | History"** (Overview selected = dark pill, History inactive) · top-right: a small model pill "**◐ Parakeet**" (shows the active speech model with a small headphone/icon), theme toggle, account icon, minimize, close.

**Content (Overview tab), top to bottom:**

1. **Announcement / feature banner card** (soft gray rounded card):
   - Heading: "**Try out the new Expansions feature**"
   - Body: "Type a shortcut anywhere and it expands instantly."
   - Buttons: **Try it out** (dark primary), **Dismiss** (light/ghost).
   - Right side: a circular badge with a **lightning-bolt (zap) icon** in purple.

2. **Greeting:**
   - "**Hi there, XC** 👋" (large bold; "XC" is the user's name/initials, 👋 waving-hand emoji).
   - Subtitle (gray): "You've spoken 0 words today"

3. **Stats cards row — four equal cards** (white, bordered, rounded), each: small icon top-left, big metric, label, and a small green pill delta at bottom:
   - Card 1 — icon "**T**" (text/type) · "**0**" · "Total Words" · green pill "**+0 this week**"
   - Card 2 — flame icon · "**0 days**" · "Longest Streak" · green pill "**0-day active streak**"
   - Card 3 — clock icon · "**0 hour**" · "Total Time Saved" · green pill "**+0m this week**"
   - Card 4 — microphone icon · "**0**" · "Transcriptions" · green pill "**+0 this week**"

4. **Dictation hint card** (soft gray, full width):
   - "**Hold** `Ctrl` + `⇧` **to dictate anywhere.**" (the `Ctrl` and `⇧`/Shift are rendered as keycap chips inline).
   - Button: **Enable AI Mode ✨** (dark primary pill with sparkle emoji).
   - Right side: circular badge with a **microphone icon** (purple).

5. **Cloud model upsell card** (soft gray, full width):
   - Heading: "**Want faster transcription?**"
   - Body: "Switch to a cloud-based model for lightning-fast transcription in Windows. We recommend Groq — it's free, easy to set up, and incredibly fast."
   - Button: **Switch to Cloud Model** (dark primary pill).
   - Right side: circular badge with a **cloud icon** (purple).

> **History tab:** The "History" tab exists (visible in the top segmented control) but **no screenshot in 13–32 shows its content**. Treat as: same shell, History selected; content not captured. Per the General settings ("Save transcriptions to history"), History is expected to list saved transcription entries — but the exact layout is **not documented here** because it was not screenshotted.

---

### 3.2 Transcribe (screenshot 14)

**Layout:** Sidebar present (Transcribe active). Top bar: primary button top-right "**+ Transcribe**" (dark pill with a plus icon), then theme toggle, account, minimize, close. No tabs.

**Content:**

1. **Upload hero card** (soft gray, full width, with a dashed/drop affordance feel):
   - Heading: "**Transcribe any audio or video. Export as text or subtitles.**"
   - Body: "Click to start a new transcription."
   - Right side: circular badge with an **up-arrow / upload icon** (purple).

2. **Counter** (right-aligned, small pill/text): "**0/10  transcriptions**" with an **ⓘ info icon**. (Free-tier quota; "0/10".)

3. **Empty state** (centered):
   - **Headphones icon** (outline, gray).
   - "**No transcriptions yet**" (purple-ish heading)
   - "Drop an audio or video file above to get started." (gray subtitle)

---

### 3.3 Speech models (screenshots 15 & 16)

**Layout:** Sidebar present (Speech models active). Top bar: theme toggle, account, minimize, close (no page-specific action button). The content scrolls (screenshot 15 = top, screenshot 16 = scrolled down).

**Content:**

**Hero card** (soft gray):
- Heading: "**Choose your transcription engine.**"
- Body: "Smaller models are faster. Larger models are more accurate. Pick what fits your workflow."

The body is grouped into sections, each with a small uppercase section header + icon. Each model is a **bordered white row**: small brand/provider logo tile, name, and a sub-label (size or model variant). Cloud rows show an amber "**Setup**" affordance on the right; local rows show a **download icon** on the right; the selected local model is a **black/dark filled row with a green check** on the right.

**☁ CLOUD** (two-column grid of provider rows, each "Name / sub-label" + "Setup"):
- **Groq** — Whisper Large v3 Turbo — Setup
- **Groq** — Whisper Large v3 — Setup
- **Deepgram** — Nova 2 — Setup
- **Deepgram** — Nova 3 — Setup
- **ElevenLabs** — Scribe v2 — Setup
- **AssemblyAI** — Universal — Setup
- **Mistral** — Voxtral Mini — Setup
- **Sarvam AI** — Saaras v3 — Setup
- **xAI** — Aurora — Setup
- **Cartesia** — Ink 2 — Setup
- **Soniox** — Real-Time STT — Setup
- **Speechmatics** — Speechmatics — Setup
- **OpenAI** — OpenAI — Setup
- **Google** — Google Gemini — Setup
- **Local / Self-hosted** — Custom Server — Setup

**⚙ LOCAL** → sub-group **🅰 ENGLISH ONLY** (two-column grid; each row name + size, right-side download icon unless selected):
- **Parakeet V2** — 451 MB — *selected* (dark filled row, green check) ✓
- **Medium** — 1.4 GB
- **Small** — 465 MB
- **Base** — 141 MB
- **Tiny** — 74 MB

**⚙ LOCAL** → sub-group **🌐 MULTILINGUAL** (two-column grid):
- **Parakeet V3** — 478 MB
- **Large v3** — 2.9 GB
- **Large v3 Turbo** — 1.5 GB
- **Medium** — 1.4 GB
- **Small** — 465 MB
- **Base** — 141 MB
- **Tiny** — 74 MB

**🖥 GPU ACCELERATION** (single full-width row):
- **NVIDIA CUDA** — "RTX 2000+ · ~631 MB · No CUDA install needed" — right-side download icon.

> Icon note: The "Tiny/Base/Small/Medium/Large" entries use a green/teal "swirl"-style logo tile (Whisper/OpenAI-style); Parakeet entries use a dark/black logo tile. Cloud providers use their brand glyphs (Groq, Deepgram, ElevenLabs, AssemblyAI, Mistral, Sarvam, xAI, Cartesia, Soniox, Speechmatics, OpenAI, Google).

---

### 3.4 Dictionary (screenshot 17)

**Layout:** Sidebar present (Dictionary active). Top bar: primary button top-right "**+ Add Word**" (dark pill with plus), then theme toggle, account, minimize, close.

**Content:**

1. **Tabs** (segmented, top-left of content): "**Dictionary**" (selected = dark pill) · "**Threads**" · "**Expansions**".
2. **Hero card** (soft gray):
   - Heading: "**Words that belong to you.**"
   - Body: "Model size matters. Add words you say often — they guide transcription on Small models and above."
3. **Empty state** (after a hairline divider): centered gray text "**No vocabulary words yet**".

> Threads and Expansions tab contents were **not screenshotted** (only the Dictionary tab is shown). Their per-tab content is not documented here.

---

### 3.5 Workflows (screenshot 18)

**Layout:** Sidebar present (Workflows active). Top bar: primary button top-right "**+ Create Workflow**" (dark pill with plus), then theme toggle, account, minimize, close.

**Content:**

1. **Hero card** (soft gray):
   - Heading: "**Hold** `Ctrl` + `⇧` **and say the word.**" (keycap chips inline).
   - Body: "Speak a trigger phrase to open apps, search the web, or talk to AI — hands-free."
2. **Counter** (right-aligned): "**0/3  custom workflows**" + **ⓘ info icon**. (Free-tier quota for custom workflows.)
3. **Table** with header row "**TRIGGER PHRASE** | **ACTION** | **ENABLED**". Each row has a trigger phrase, an action description, and a right-aligned **toggle switch (ON, dark)**. Verbatim default rows (all enabled/ON):

| TRIGGER PHRASE | ACTION | ENABLED |
|---|---|---|
| google | Opens Google search with your query | ON |
| ask chat gpt | Opens ChatGPT with your question | ON |
| ask claude | Opens Claude AI with your question | ON |
| ask perplexity | Opens Perplexity AI search with your query | ON |
| youtube | Opens YouTube search with your query | ON |
| duck duck go | Opens DuckDuckGo search with your query | ON |
| open | Opens common folders in File Explorer | ON |

---

### 3.6 Configure your AI (screenshot 19)

**Layout:** Sidebar present (Configure your AI active). Top bar: theme toggle, account, minimize, close (no page action button).

**Content:**

1. **Tabs** (segmented, top-left): "**Configuration**" (selected = dark pill) · "**Command Mode**" · "**Memory**".
2. **Section header:** "🔒 **AI PROVIDER**" (small uppercase with a small lock icon).
3. **Provider grid** (two columns; each row = logo tile + name + amber "**Setup**" on right):
   - **OpenAI** — OpenAI — Setup
   - **Anthropic** — Anthropic — Setup
   - **Groq** — Groq — Setup
   - **Google** — Google — Setup
   - **DeepSeek** — DeepSeek — Setup
   - **OpenRouter** — OpenRouter — Setup
   - **Straico** — Straico — Setup
   - **Azure** — Azure — Setup
   - **Cerebras** — Cerebras — Setup
   - **AWS Bedrock** — AWS Bedrock — Setup
   - **Custom API** — Custom API — Setup
   - **+ Add Custom API** — with a "**◈ Pro**" purple pill badge (dashed/ghost row; Pro-gated add).
4. **Enhance Transcription card** (soft gray, full width):
   - Heading: "🔒 **Enhance Transcription** ⓘ" (lock icon + info icon).
   - Body: "Automatically clean up filler words, fix punctuation, and format your transcriptions using an AI model of your choice."
   - Button: **Connect an AI provider** (light/outline button).

> The "Command Mode" and "Memory" tabs were **not screenshotted**; their content is not documented here.

---

### 3.7 Notes (screenshot 20)

**Layout:** Sidebar present (Notes active). Top bar (right side): a small **gear/settings icon**, then **"● Start Taking Notes"** button (dark pill with a small record dot), then **"⬆ Import"** button (dark pill with upload icon), then theme toggle, account, minimize, close.

**Content:**

1. **Counter** (right-aligned, top): "**0/10  notes**" + **ⓘ info icon**.
2. **Hero card** (soft gray):
   - Heading: "**Capture every meeting, effortlessly.**"
   - Body: "AI-powered summaries, action items, and key decisions — all from your voice."
   - Right side: small **refresh / sync icon** button (top-right of the card).
3. **Empty state** (centered):
   - **Clapperboard / movie-clapper icon** (gray).
   - "**No notes yet**"
   - "Click \"Start Taking Notes\" to begin recording."

---

### 3.8 Tones (screenshot 21)

**Layout:** Sidebar present (Tones active — shown with an amber focus-ring outline). Top bar: primary button top-right "**+ Create Tone**" (dark pill with plus), then theme toggle, account, minimize, close.

**Content:**

1. **Hero card** (soft gray):
   - Heading: "**Tones**"
   - Body: "Create tailored recording modes for different contexts and apps."
2. **Counter** (right-aligned): "**0/1  tones**" + **ⓘ info icon**.
3. **Empty state** (centered, gray text): "**No tones yet — create one to override settings for specific apps.**"

---

### 3.9 Dialog — New Tone (screenshot 32)

> Note: This modal is shown in **dark mode** (the rest of the documented pages are light mode). It opens from "+ Create Tone".

**Layout:** Modal dialog, dark background (`~#1A1A1A`), title "**New Tone**" top-left, **×** close top-right. Two-column body, footer with actions bottom-right.

**Left column:**
- **Icon & Name** — a square **microphone-icon button** (icon picker) + text input placeholder "**Tone name…**".
- **Active in Apps** — a dashed square "**+**" add button (to attach apps).
- **Custom Instructions** — a large textarea. While disabled, it shows a dimmed placeholder ("e.g. Always use Oxford comma. Keep responses under 3 sentences." — partially legible) and an overlaid pill/note: "**Enable AI Enhancement to use custom instructions**".

**Right column:**
- **Speech Model** — dropdown, current value "**◐ Parakeet V2**" (chevron).
- **AI Enhancement** — heading + helper "Enhance transcriptions with an AI model" + a **toggle switch (OFF)** on the right.

**Footer:**
- **Cancel** (secondary/outline) and **Create Tone** (disabled/primary, appears dimmed until valid).

---

## 4. Settings Modal (screenshots 22–31)

Opened via the **Settings** item in the sidebar (also accessible via the account icon — screenshot 22 is titled "Account" and was opened from the account control). It is a **centered modal/overlay** atop the dimmed app.

### 4.1 Modal shell
- **Left rail (settings nav):** a **search input** ("Search" with magnifier) at top, then a vertical list of section links; app version "**v0.4.7**" pinned bottom-left.
  - Sections (top → bottom): **Account**, **General**, **Audio**, **Language**, **Recording**, **Shortcuts**, **Permissions**, **Sync**, **Experimental**.
  - Active section = light-gray filled rounded highlight, bold near-black label. Inactive = blue-gray text.
- **Right content area:** large **section title** top-left (matches selected nav), **×** close top-right. Content is laid out as white bordered cards containing labeled rows. Most rows: bold label + gray helper subtitle on the left, and a control (toggle / dropdown / button / keycaps) on the right.

### 4.2 Account (screenshot 22)
Title: **Account**.
- **Profile card:**
  - Avatar (person icon) + "**XC**" + email "**xuban.ceccon@gmail.com**".
  - Field **Name** — input value "XC".
  - Field **Email** — input value "xuban.ceccon@gmail.com".
  - Button: **Edit Information** (dark primary).
- **Current Plan card:**
  - Label "**Current Plan**" + pill "**FREE**".
  - Buttons (right): **🔑 Activate License** (dark primary), **◈ Buy License** (outline), **⤴ Manage License** (outline, external-link icon).
- **Data card:**
  - Heading "**Data**" + body "Back up or restore your dictionary, threads, and workflows."
  - Button (right): **◈ Upgrade to Pro** (purple-outline pill).
- **Footer links** (bottom-right): "**Privacy Policy**" · "**Terms of Service**".

### 4.3 General (screenshots 23 & 24, scrolled)
Title: **General**. Rows (label / helper / control):
- **Software Updates** — "Check for the latest version of Vowen" — button **Check for Updates** (outline).
- **Open at Login** — "Automatically launch Vowen when you log into your computer" — toggle **OFF**.
- **Start Minimized to Tray** — "Start the app minimized to the system tray (access via tray icon only)" — toggle **OFF**.
- **Auto-paste transcription** — "Automatically paste transcribed text into focused field" — toggle **ON**.
- **Text Insertion Method** — "How transcribed text is inserted. \"Paste method\" uses the clipboard; \"Direct insertion\" types characters directly — the clipboard is never read, written, or modified in any way." — dropdown, value "**Paste method**" (chevron).
- **Auto Enter** — "Automatically press Enter after pasting transcription" — toggle **OFF**.
- **Restore clipboard after paste** — "Restore your original clipboard content after transcription is pasted" — toggle **OFF**.
- **Sound Effects** — "Play audio feedback when recording starts and stops" — toggle **ON**.
- **Save transcriptions to history** — "Transcription entries will be saved to History. Your word count and activity data are always tracked." — toggle **ON**.
- **Remove filler words** — "Automatically remove filler words like \"uh\", \"um\", and \"hmm\" from transcriptions." — toggle **ON**.

### 4.4 Audio (screenshot 25)
Title: **Audio**. Single card:
- Heading "**Microphone**" + helper "Select your audio input device".
- Dropdown, value "**Default microphone / Same as system**" (chevron).
- Button: **Refresh** (dark primary).

### 4.5 Language (screenshot 26)
Title: **Language**. Single card with three sub-sections:
- **UI Language** — "Select the language for the application interface" — dropdown "**English**".
- **Transcription Language** — "Select transcription language (auto-detect recommended)" — info notice (gray strip): "**Parakeet V2 (English):** This model only transcribes English speech." — dropdown "**English**" (appears disabled/locked because the active model is English-only).
- **English Spelling** — "Choose the spelling convention used for English transcriptions" — dropdown "**American English (default)**".

### 4.6 Recording (screenshot 27)
Title: **Recording**. Rows:
- **Recording Indicator Position** — "Choose where the recording indicator appears on your screen" — **segmented control**: "**Top**" (selected, dark) · "Bottom" · "Don't show".
- **Show idle pill** — "Display a minimized bar at the screen edge when idle. Hover to expand and start a recording." — toggle **OFF**.
- **Save audio recordings** — "Keep .wav audio files in ~/Documents/Vowen Recordings" — toggle **OFF**.
- **Mute system audio during recording** — "Automatically mute system audio when recording starts and unmute after transcription is pasted" — **◈ Upgrade to Pro** pill (Pro-gated; no toggle).
- **Real-time transcription preview** — "Show a live preview of your transcription below the recording indicator while speaking." — **◈ Upgrade to Pro** pill (Pro-gated).

> Implies a **floating recording indicator / idle pill** UI exists on screen during recording (the "indicator position" + "idle pill" settings), but **no standalone screenshot of that floating pill is in 13–32**, so its exact appearance is not documented here.

### 4.7 Shortcuts (screenshot 28)
Title: **Shortcuts**. Each row: bold label + helper, a **keycap combo display** (gray keycaps with primary/secondary labels, e.g. "Ctrl / control" + "⇧ / shift"), a small **edit (pencil-in-box) icon**, and a **toggle**. Pro upsell "**◈ Multiple shortcuts — Upgrade to Pro**" link appears under the first three.
- **Transcription Shortcut** — "Trigger audio transcription" — keys `Ctrl` + `⇧ Shift` — toggle **ON** — (link: Multiple shortcuts — Upgrade to Pro).
- **Command Mode Shortcut** — "Trigger Command Mode processing" — keys `Alt` + `⇧ Shift` — toggle **ON** — (link: Multiple shortcuts — Upgrade to Pro).
- **Hands-Free Mode** — "Press to start and stop dictation" — keys `Ctrl` + `H` — toggle **ON** — (link: Multiple shortcuts — Upgrade to Pro).
- **Start New Note** — "Open the Start Taking Notes modal" — keys `Alt` + `N` — toggle **OFF**.
- **Paste Last Transcription** — "Paste your most recent transcription into the focused app" — keys `Ctrl` + `⇧ Shift` + `L` — toggle **OFF**.
- (List may continue below the fold; rows beyond "Paste Last Transcription" are not captured.)

### 4.8 Permissions (screenshot 29)
Title: **Permissions**. Single card:
- **Microphone Access** — "Required for recording audio when you speak" — right side: a **green circular check badge** (granted).
- Button: **Refresh Status** (dark primary).

### 4.9 Sync (screenshot 30)
Title: **Sync**. The whole card is **dimmed behind a centered overlay**: a **lock icon** + "**Cloud Sync — Upgrade to Pro**" (purple link). The (dimmed) underlying card content:
- Intro: "Sync your dictionary, threads, expansions, workflows, tones, preferences, hotkeys, and transcription data across devices. Your data is stored in your own cloud storage folder — Vowen never sees it."
- Provider rows (each name + setup hint + a "Not detected" status on the right, all dimmed):
  - **☁ iCloud Drive** — "Enable iCloud Drive in System Settings > Apple Account > iCloud > iCloud Drive." — *Not detected*
  - **▲ Google Drive** — "Install Google Drive for Desktop and sign in to your Google account." — *Not detected*
  - **▦ Dropbox** — "Install the Dropbox desktop app and sign in to your account." — *Not detected*
  - **☁ OneDrive** — (status row) — button "**Connect**" (disabled/dimmed).

> This whole feature is Pro-gated; the row text is partially obscured by the upgrade overlay but transcribed as accurately as possible above.

### 4.10 Experimental (screenshot 31)
Title: **Experimental**. Intro (gray): "These features are in active development and may behave unexpectedly. Enable only if you're experiencing a specific issue." Each row has an "**EXPERIMENTAL**" amber pill next to the label.
- **Enable Connectors** `EXPERIMENTAL` — "Connect external apps (Linear, Notion, Vercel, …) so Live Ask, Chat with Notes, and Command Mode can read from and act on them. This feature is in early stages — connections may break or behave unexpectedly. Requires a Pro plan." — toggle **OFF**.
- **Enable Cursor/Windsurf file tagging** `EXPERIMENTAL` — "When dictating in Cursor or Windsurf, automatically detect file references and insert them as @ mentions using the IDE's file picker" — **◈ Upgrade to Pro** pill (Pro-gated; no toggle).
- **Enhanced silence detection** `EXPERIMENTAL` — "Increases the silence threshold for cloud models (Groq, etc.) to prevent phantom transcriptions in moderately noisy environments — fans, AC, keyboard noise. Enable this if you get empty or hallucinated transcriptions while not speaking." — toggle **OFF**.

---

## 5. Reusable component inventory (for the React build)

- **Sidebar** — persistent nav rail with brand header, "Free" badge, two nav groups, "VOWEN AI" section label, pinned Settings/Help, collapse toggle.
- **TopBar (per-page slot)** — left contextual area (tabs / Get Pro / model pill), right window-controls cluster (theme · account · min · close) plus optional page primary action ("+ Add Word", "+ Create Workflow", "+ Create Tone", "+ Transcribe", "Start Taking Notes" / "Import", gear).
- **HeroCard** — soft-gray rounded banner: bold heading + gray body + optional right-side circular icon badge + optional inline buttons.
- **StatCard** — icon + big metric + label + green delta pill.
- **SegmentedTabs** — pill segmented control (Overview/History; Dictionary/Threads/Expansions; Configuration/Command Mode/Memory).
- **ProviderRow** — logo tile + name + sub-label + right affordance ("Setup" amber link / download icon / "Connect" / Pro pill).
- **ModelRow** — like ProviderRow; supports a **selected (dark filled + green check)** state.
- **SettingRow** — label + helper + right control (Toggle / Dropdown / Button / KeycapCombo / segmented).
- **Toggle (Switch)** — dark ON / gray OFF.
- **KeycapCombo** — gray keycap chips with primary+secondary key labels, "+" separators, edit pencil affordance.
- **CounterPill** — "x/y label" + info icon (quota indicator).
- **EmptyState** — centered gray icon + heading + subtitle.
- **ProBadge / "Upgrade to Pro" pill** — purple-outlined; "◈ Pro" mini badge variant.
- **SettingsModal** — left search + section nav + version footer; right titled content with × close.
- **Dialog** (e.g. New Tone) — title, × close, two-column body, footer Cancel / primary action; also seen in **dark mode**.

---

## 6. Gaps / ambiguities (not invented)
- **Home "History" tab content** — tab exists, content not screenshotted.
- **Dictionary "Threads" and "Expansions" tab contents** — only "Dictionary" tab shown.
- **Configure your AI "Command Mode" and "Memory" tab contents** — only "Configuration" shown.
- **Floating recording pill / idle pill UI** — referenced by Recording settings but never shown standalone.
- **Shortcuts list** may extend below the captured fold (after "Paste Last Transcription").
- **Sync provider row text** is partially obscured by the Pro-upgrade overlay (best-effort transcription).
- **Paywall/pricing modal (onboarding 12)** — feature comparison columns too small to read fully.
- All **hex colors are visual approximations**; sample real values from the app if exact fidelity is required.
