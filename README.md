# Book Smithy

A desktop book-writing application built with Electron, React 19, and TypeScript. Forge your story from idea to finished book.

## Features

### Dashboard
- Project metadata editor (title, author, genre, description, word count goal)
- Word count progress bar with live stats (chapters, characters, scenes)
- Quick-access grid to all writing phases
- **Feature toggles** — enable or disable Ideation, World, Characters, and Outline per project, with the option to keep data hidden or delete it

### Ideation
- **Premise** — dedicated rich-text editor for your core story idea
- **Themes** — separate editor for thematic exploration
- **Notes** — create, rename (inline), and delete research notes; search by name or content
- **Note linking** — connect related notes via a Links sidebar (add, edit label, delete, go-to)
- **Links visualization** — force-directed graph showing note connections (drag to reposition, positions persist)

### World Building
- Organize lore across categories: Locations, Lore, and Systems
- Rich-text editor with frontmatter metadata per entry

### Characters
- **Profiles** — create and manage characters with name, role, age, arc, and a rich-text backstory editor
- **Search** — filter the character list by name
- **Relationships sidebar** — link characters together, label the nature of each relationship, navigate to linked characters
- **Relationships visualization** — read-only force-directed graph with Obsidian-style circle nodes, straight-line edges, and persistent drag positions

### Outline
- Three-act structure with acts and scenes
- Drag-reorder scenes, assign to acts, add summaries

### Manuscript
- Chapter management with status tracking (draft / revising / complete)
- Rich-text editor per chapter with auto-save
- Live word count

### Revision
- Create named snapshots of the full manuscript
- Side-by-side diff viewer comparing any two snapshots

### Export
- Export to **Markdown** or **PDF**
- File save dialog with format filters

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 41 + Electron Forge |
| Frontend | React 19, TypeScript, Tailwind CSS 3 |
| State | Zustand |
| Rich-text editor | Tiptap 3 |
| Graph visualization | React Flow (@xyflow/react) |
| Build | Vite 5 |

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9

### Install dependencies

```bash
npm install
```

### Run in development mode

```bash
npm start
```

This launches the Electron app with hot-reload via Vite.

### Package for distribution

```bash
npm run package
```

Or create platform-specific installers:

```bash
npm run make
```

### Lint

```bash
npm run lint
```

## Project Structure

```
src/
├── main/               # Electron main process
│   ├── main.ts         # App entry, window creation
│   └── ipc/            # IPC handlers (project, filesystem, export)
├── preload/            # Context bridge (preload.ts)
└── renderer/           # React frontend
    ├── components/     # Reusable UI components
    │   ├── canvas/     # GraphCanvas (force-directed graph)
    │   ├── characters/ # RelationshipSidebar
    │   ├── editor/     # MarkdownEditor (Tiptap wrapper)
    │   ├── ideation/   # LinksSidebar
    │   └── layout/     # AppShell, Sidebar, WelcomeScreen, StatusBar
    ├── pages/          # Top-level page components
    ├── stores/         # Zustand store (projectStore)
    └── lib/            # Utilities (frontmatter, word count)
```

## License

MIT
