# 🧠 MapMind - Local-First AI Knowledge Notebook & Mind Map Studio

A unified, high-performance, 100% client-side web application combining an **Advanced Mind Mapping & Whiteboard Canvas** with a **Local-First AI Knowledge Notebook**.

Built with **React 18**, **TypeScript**, **Vite**, **Tailwind CSS**, **@xyflow/react (React Flow)**, **Dagre**, **ELK.js**, **Rough.js**, and **idb (IndexedDB)**.

---

## 🌟 Core Product Features

### 1. 📓 Digital Knowledge Notebook
- **Full Hierarchy**: Workspace $\rightarrow$ Notebooks $\rightarrow$ Sections $\rightarrow$ Markdown Pages.
- **Markdown Editor Modes**:
  - **Live Preview Mode**: Rich formatting, clickable `[[Wiki Links]]`, interactive task checklist toggling (`- [ ]`, `- [x]`), callout admonitions (`> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`), KaTeX math, tables, and syntax-highlighted code blocks with 1-click copy.
  - **Source Mode**: Clean monospaced editing with fast auto-closing brackets.
  - **Split Mode**: Side-by-side synchronized editor + live preview.
- **Obsidian-Style Wiki Links**: Type `[[` to trigger autocomplete across all notes in your vault.
- **Deterministic Backlinks & Unlinked Mentions**: Automatically extracts incoming backlinks with context snippets and detects unlinked page mentions with a 1-click "+ Link" converter.
- **YAML Frontmatter & Properties**: Visual property badges for type, status, priority, and tags.

### 2. 🧠 Visual Mind Mapping & Whiteboard Studio
- **Radial & Tree Layouts**: ELK.js balanced left/right mind maps and Dagre top-down / left-right directed graphs.
- **Bi-Directional Bridge**:
  - **Note $\rightarrow$ Mind Map**: 1-click converts any Markdown note into an interactive diagram hierarchy.
  - **Mind Map $\rightarrow$ Note**: 1-click exports diagram branches and whiteboard nodes into structured Markdown notes.
- **Rich Aesthetics**: 7 canvas atmosphere palettes (Warm Paper, Botanical Sage, Solarized Ochre, Cyber Space, etc.) and 6 card aesthetics (Frosted Glass, Notion Clean, Neo-Brutalist, Aesthetic Glow).
- **Presentation Mode & Clean Vector Exports**: Export as SVG, PNG, or PDF with editor handles filtered out.

### 3. 🕸️ 2D Interactive Knowledge Graph
- Force-directed physics canvas visualizing notes as nodes and links as edges.
- Color-coded by Notebook or Page Type.
- Visual distinction: Solid edges for manual Wiki Links, glowing purple dashed edges for AI suggested connections.
- Filter by Notebook, Tags, and zoom/pan controls.

### 4. 🤖 Local Multi-Signal AI & Knowledge Assistant
- **100% Client-Side Privacy**: Computes relationships, embeddings, and search vectors locally with zero server requirements.
- **Multi-Signal Relationship Engine**:
  1. Semantic / TF-IDF cosine similarity (50%)
  2. Shared concepts & keyword intersection (20%)
  3. Graph link distance (15%)
  4. Shared tags & properties (10%)
  5. Title token match (5%)
- **4 Connection Modes**: Off, Suggest, Assisted, Autonomous.
- **"Ask My Knowledge" Assistant**: Ask questions and receive synthesized answers citing your local notes (`[[Source]]`).

### 5. 📚 Study & Learning Hub
- **Interactive Flashcards**: Spaced repetition algorithm (SM-2) with 3D flip animation and difficulty ratings (Hard, Good, Easy).
- **Automated Quizzes**: Generates multiple-choice verification quizzes based on note content with instant scoring.
- **Executive Summaries**: Automated extraction of core takeaways, reading time, and prerequisites.

### 6. ⚡ Vault Tasks & Daily Notes
- **Task Aggregator**: Centralized view of all `- [ ]` and `- [x]` markdown checklists across notes.
- **Daily Notes**: 1-click creates or opens today's daily journal note (`Daily Note - YYYY-MM-DD`).

---

## ⌨️ Universal Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Ctrl + K</kbd> / <kbd>Cmd + K</kbd> | Universal Command Palette & Search |
| <kbd>Ctrl + P</kbd> / <kbd>Cmd + P</kbd> | Quick Open Page |
| <kbd>Ctrl + 1</kbd> | Switch to Knowledge Notes View |
| <kbd>Ctrl + 2</kbd> | Switch to Mind Map Whiteboard View |
| <kbd>Ctrl + 3</kbd> | Switch to 2D Knowledge Graph View |
| <kbd>Ctrl + 4</kbd> | Switch to Study & Quiz Hub |
| <kbd>Ctrl + 5</kbd> | Switch to Vault Tasks View |
| <kbd>Ctrl + 6</kbd> | Switch to Dashboard Hub |
| <kbd>Tab</kbd> | Add Child Node (in Mind Map) |
| <kbd>Enter</kbd> | Add Sibling Node (in Mind Map) |
| <kbd>Space</kbd> / <kbd>F2</kbd> | Edit Selected Node (in Mind Map) |
| <kbd>[[</kbd> | Trigger Wiki Link Autocomplete (in Editor) |

---

## 🚀 Running Locally

### Development Mode
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
```

### Docker
```bash
docker compose up
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
