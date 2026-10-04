# 🎬 AstrahContent — AI Educational Video Studio

> **Transform any complex educational topic into cinematic motion-graphic explainer videos in minutes.**  
> Powered by **HyperFrames animation engine** and **NVIDIA Nemotron 3 Ultra 550B AI**.

---

## 🌟 Overview & Project Idea

Creating high-retention educational videos traditionally demands dozens of hours in After Effects, 3D modeling tools, or complex motion design suites. **AstrahContent** changes this paradigm by combining cutting-edge LLM pedagogy with programmable motion graphics:

1. **AI Pedagogy & Scripting**: Utilizes **NVIDIA Nemotron 3 Ultra** (via OpenRouter) to break down complex scientific, mathematical, and historical concepts into structured, visual-first storyboards with timed scenes, narrations, and key takeaways.
2. **HyperFrames Motion Engine**: Renders dynamic canvas compositions (orbiting electron models, calculus curves, animated historical timelines, interactive data visualizations) running at 60 FPS.
3. **Interactive Timeline & Scrubber**: Real-time canvas playback scrubber with sub-second precision, timecode display, and scene markers.
4. **Headless & CLI Rendering**: Export projects directly to MP4/WebM or compile ready-to-run HyperFrames CLI commands.

---

## 🚀 Key Features

- **🎨 Multi-Discipline Template Catalog**: 50+ curated templates covering Science & Biology, Mathematics & Physics, Historical Timelines, Data Visualization, and Coding Algorithms.
- **⚡ Real-Time Canvas Player**: Built-in 2D/WebGL canvas playback engine with interactive play, pause, rewind, and timeline scrubber.
- **🧠 Intelligent Prompt Engineering**: Custom system prompts instructing the AI model on didactic clarity, scene duration pacing, and visual transitions.
- **🛡️ Deterministic Offline Mode**: High-fidelity offline script generation fallback ensuring zero interruption even without network connectivity.
- **📱 Production Architecture**: Clean separation into modular ES modules (`js/api`, `js/canvas`, `js/data`, `js/ui`), modular CSS design system, and dedicated Landing Page (`index.html`) & Studio Workspace (`studio.html`).
- **🔒 Secure Credentials**: Zero API keys bundled in client builds; loaded dynamically via `.env` or saved locally in browser storage.

---

## 📁 Project Architecture

```
AstrahContent/
├── index.html                   # High-converting Landing Page & Showcase
├── studio.html                  # Full-featured Video Creator Studio Workspace
├── server.js                    # Lightweight zero-dependency dev server with .env loader
├── package.json                 # Project configuration & npm scripts
├── .env.example                 # Template for environment configuration
├── .gitignore                   # Ignores .env, apikeys.txt, and build outputs
├── README.md                    # Project documentation & guide
│
├── styles/
│   ├── base.css                 # Design tokens, CSS variables, typography reset
│   ├── components.css           # Buttons, form controls, badges, cards, spinners
│   ├── landing.css              # Hero section, floating cards, feature grids
│   └── studio.css               # Studio layout, canvas player, scrubber timeline
│
├── js/
│   ├── config.js                # Central environment & model configuration
│   ├── state.js                 # Global singleton application state
│   ├── main.js                  # Landing page entry point
│   ├── studio-main.js           # Studio application entry point
│   │
│   ├── api/
│   │   └── openrouter.js        # OpenRouter / NVIDIA Nemotron API client & fallback
│   │
│   ├── canvas/
│   │   ├── hero.js              # Science, math, and history landing canvas animations
│   │   ├── scenes.js            # Video scene renderers (Intro, Concept, Motion, Outro)
│   │   └── player.js            # Playback engine, 60fps loop, and timeline scrub
│   │
│   ├── data/
│   │   └── templates.js         # Educational template catalog
│   │
│   └── ui/
│       ├── landing.js           # Landing page filter & scroll controllers
│       └── studio.js            # Studio panels, AI generation workflow & export engine
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- An OpenRouter API Key (Supports free access to `nvidia/nemotron-3-ultra-550b-a55b`)

### 2. Installation & Setup

Clone the repository:
```bash
git clone https://github.com/rahuldusa9/astrahcontent.git
cd astrahcontent
```

Configure your environment:
```bash
cp .env.example .env
```
Open `.env` and add your OpenRouter API key:
```env
OPENROUTER_API_KEY=your_actual_key_here
PORT=3000
```

### 3. Launch Development Server

Start the local server (zero external dependencies required):
```bash
npm start
```
Open your browser:
- **Landing Page**: [http://localhost:3000](http://localhost:3000)
- **Video Studio**: [http://localhost:3000/studio.html](http://localhost:3000/studio.html)

---

## ⚙️ HyperFrames CLI Export Pipeline

To render production-grade videos headless on a CI/CD server or high-performance workstation:

```bash
npx hyperframes render ./composition.hf.json \
  --output ./dist/video.mp4 \
  --fps 60 \
  --resolution 1920x1080 \
  --quality max
```

---

## 🔒 Security Best Practices

- Never commit your `.env` or `apikeys.txt` files to version control.
- In production deployment (e.g., Vercel, Cloudflare Pages, Netlify), supply `OPENROUTER_API_KEY` as an environment variable or use a backend proxy.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
