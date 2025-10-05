## Target Directory Finder

Electron-based utility to quickly locate heavy or unwanted directories (e.g., `node_modules`, `Pods`) or files by extension (e.g., `.zip`, `.rar`) within a chosen root. Offers convenient actions to open locations in Finder and delete items after confirmation.

### Features
- **Two scan modes**
  - **Directories (by name)**: Finds folders like `node_modules`, `Pods`, `.git`, etc. The scanner will not descend into matched folders.
  - **Files (by extension)**: Finds files by extensions such as `.zip`, `.rar`, etc., skipping common bulky folders (`node_modules`, `Pods`, `.git`, `dist`, `build`).
- **Per-result actions** (both modes)
  - Show in Finder
  - Delete with confirmation (folders are removed recursively)
- **Live filtering, grouping, and sorting** of results
- **Copy list** to clipboard
- **Persistent targets and extensions** (stored locally in the app)

### Requirements
- Node.js 18+

### Install
```bash
npm install
```

### Run (development)
```bash
npm run start
```

### Build (optional)
This project includes a `build` script using Electron Builder. If you want packaged binaries, install Electron Builder first:
```bash
npm install -D electron-builder
npm run build
```

### Usage
1. Launch the app and click “Browse…” to choose a root directory.
2. Select a **Scan Mode**:
   - Directories (by name): add folder names (e.g., `node_modules`) and click “Add”.
   - Files (by extension): enter extensions such as `.zip, .rar` (with or without dots) and click “Apply”.
3. Click “Scan” to populate results.
4. Use the search box to filter, and the controls to group/sort.
5. Use the buttons on each result:
   - “Show in Finder” to reveal the item in the system file manager
   - “Delete” to remove the item after a confirmation dialog

### Notes
- Default excluded folders for file scans: `node_modules`, `Pods`, `.git`, `dist`, `build`.
- Press Enter in the extensions field to quickly apply changes.
- “Show in Finder” works cross-platform via Electron; it opens the containing folder and highlights the item.
- Deleting a folder removes it recursively. Use with caution.

### Troubleshooting
- If actions don’t appear after you change modes, reload the window (Cmd+R) and try again.
- Ensure you’ve set the proper mode before scanning.

### License
ISC


