# SIMAP Project Notes

Enhance [simap.ch](https://www.simap.ch/) with personal notes and application status tracking directly on each project card. The extension injects an inline notes panel and radio-based status selector (Not applied, Proposal submitted, Won, Rejected), stores data in `localStorage`, and keeps everything in sync while you browse localized German, English, French, or Italian versions of SIMAP.

<p align="center">
  <img src="webstore/en_with_bgc.png" alt="SIMAP Project Notes screenshot" width="90%" />
</p>

## Features

- Per-project notes saved locally in the browser.
- Quick status toggles with color-coded highlights on cards.
- SPA-aware language support: labels switch automatically when you change `/de`, `/en`, `/fr`, or `/it` without reloading.
- Mutation observer keeps up with dynamically loaded results.
- Localized extension name/description and UI copy (DE/EN/FR/IT).

## Development

```bash
# edit source files under scripts/ and styles/

# To load extension in Chrome:
# 1. chrome://extensions
# 2. Enable Developer Mode
# 3. Load unpacked -> select repo directory
# 4. Visit https://www.simap.ch/ to search or open your project manager view

# After any code change, click the ⟳ Reload button on the SIMAP Project Notes
# card in chrome://extensions (not just browser refresh) before reloading the site.
```

## Deployment

The `deploy.sh` helper bumps the manifest version, creates a git commit and tag, and outputs a `dist/simap-project-notes-x.y.z.zip` archive ready for the Chrome Web Store upload.

```bash
./deploy.sh
# follow the prompts (requires clean git status)
```
