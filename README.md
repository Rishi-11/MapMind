# 🧠 MapMind - Advanced Diagramming & Whiteboard Application

A high-performance, client-side-only diagramming and whiteboard web application built with **React 18**, **TypeScript**, **Vite**, **@xyflow/react (React Flow)**, **Dagre**, **ELK.js**, **Rough.js**, **idb (IndexedDB)**, and **browser-fs-access**.

Containerized with **Docker** for instant local development and production static hosting with **Nginx**.

---

## ✨ Key Features & Architecture

### 1. 🤖 AI Chatbot to Mind Map Generator (`/src/lib/importers/`)
- **Universal AI Prompt Copier**: 1-click tailored instructions for **ChatGPT**, **Claude**, **Gemini**, **DeepSeek**, or **Copilot** to convert chat discussions, brainstorms, meeting notes, or architecture breakdowns into mind map structures.
- **Smart Direct Generator**: Paste the chatbot's response (Markdown bulleted list, Mermaid `mindmap`, or JSON) $\rightarrow$ MapMind parses and arranges it into a balanced radial mind map or hierarchy with automatic harmonious color palettes across main branches.
- **Replace or Attach**: Choose to replace the entire whiteboard or attach the AI branch directly to your selected node.

### 2. 🌾 Canvas Moods & Paper Atmosphere (`/src/lib/canvasThemes.ts`)
- **7 Curated Canvas Palettes**:
  - 🌾 **Warm Paper**: Warm ivory cream parchment (`#fbf8f2` / `#1c1a16` sepia night) for easy on-the-eyes reading & brainstorming.
  - ☕ **Solarized Ochre**: Classic editorial warm cream & teal.
  - 🌿 **Botanical Sage**: Calming mint sage & deep forest.
  - 🌸 **Rosé Velvet**: Delicate blush paper & dark berry wine.
  - 🏔️ **Cool Slate**: Crisp modern white & slate navy.
  - 🌑 **Midnight Charcoal**: Pure matte OLED pitch dark.
  - 🌌 **Cyber Space**: Deep cosmic space navy & sky ice blue.
- **Grid Patterns**: Dots Matrix, Crosshairs, Notebook Grid Lines, or Blank Canvas.

### 3. 🎨 Rich Card Aesthetics & Shapes (`/src/components/canvas/`)
- **6 Card Aesthetic Presets**:
  - 🧊 **Frosted Glass**: Translucent acrylic glassmorphism (`backdrop-blur-2xl`) with top gloss reflection line.
  - 🪶 **Minimalist Clean**: Floating borderless card with bold left vertical accent bar (`border-l-4`).
  - 📄 **Notion Clean**: Document page card with `📄 Page Document` header divider and monospace metadata.
  - 💥 **Neo-Brutalist Bold**: High-contrast 2.5px solid border with offset retro sticker shadow (`5px 5px`).
  - ✨ **Aesthetic Glow**: Ambient neon halo with multi-stop gradient wash.
  - 🎴 **Standard**: Clean modern rounded card.
- **6 Geometries**: Card, Pill Capsule, Cloud Bubble, Sharp Square, Top Banner Strip, Diamond Badge.

### 4. 🧹 Clean Whiteboard with Time Machine Protection
- Clean slate with fresh central topic or completely blank canvas.
- **Automatic Recovery Snapshot**: Saves an instant backup snapshot to IndexedDB Time Machine before wiping so you never lose data.

### 5. 🔄 Dynamic Smart Handles & Stick-in-Place Locking
- **Automatic Real-Time Handle Flipping**: Dragging nodes from left to right or right to left flips connecting ports automatically.
- **Stick in Place (Lock)**: Click <kbd>🔒</kbd> on any node to lock its coordinates firmly in place (`draggable: false`).

### 6. 💾 Storage & State Management (`/src/lib/storage/`)
- **Native File System (`browser-fs-access`)**: Retains `FileSystemFileHandle` for silent `Ctrl+S` auto-overwrite.
- **Time Machine History (`idb`)**: 3-minute automatic background snapshots in IndexedDB.

### 7. 🖌️ Clean Presentation Exports (`/src/components/ui/`)
- **No Side Connection Dots**: Filters out editor handles (`.react-flow__handle`) and editing buttons from all PNG, PDF, and SVG exports.
- **Preserve Canvas Atmosphere**: Option to match your chosen warm paper or editorial palette in the final render.

---

## 🚀 Running with Docker

### Development Mode (with Vite HMR)
```bash
docker compose up
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build & Nginx Serving
```bash
docker build --target production -t mapmind:prod .
docker run -d -p 8080:80 mapmind:prod
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## ⌨️ Keyboard-First Mind Mapping

| Action | Shortcut | Behavior |
|---|---|---|
| **Add Child Node** | <kbd>Tab</kbd> | Creates child node & immediately starts editing |
| **Add Sibling Node** | <kbd>Enter</kbd> | Creates sibling node & immediately starts editing |
| **Edit Selected Node** | <kbd>Space</kbd> or <kbd>F2</kbd> | Enters inline text editing mode |
| **Commit & Next Sibling** | <kbd>Enter</kbd> (in input) | Saves label and creates next sibling |
| **Commit & Create Child** | <kbd>Tab</kbd> (in input) | Saves label and creates child branch |
| **Exit Edit Mode** | <kbd>Escape</kbd> | Commits text and returns focus to canvas |
| **Center / Focus View** | <kbd>f</kbd> | Smoothly pans and centers on active node |
| **Fit Full View** | <kbd>Shift + F</kbd> | Zooms to fit all whiteboard elements |
| **Navigate Up / Down** | <kbd>↑</kbd> / <kbd>↓</kbd> | Moves to adjacent sibling or vertical neighbor |
| **Navigate In / Out** | <kbd>→</kbd> / <kbd>←</kbd> | Traverses between parents and children |
| **Delete Node** | <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Deletes node and auto-selects parent |
| **Toggle Subtree** | <kbd>c</kbd> or <kbd>/</kbd> | Collapses or expands descendant branches |
| **Shortcuts Cheat Sheet** | <kbd>?</kbd> | Opens interactive shortcut cheatsheet |
| **Silent Save File** | <kbd>Ctrl + S</kbd> | Silently overwrites active file |
| **Save As New File** | <kbd>Ctrl + Shift + S</kbd> | Prompts file destination dialog |
| **Open Diagram File** | <kbd>Ctrl + O</kbd> | Opens `.mapmind.json` or `.json` file |
