# JjapDraw

A hand-drawn style, infinite-canvas whiteboard — a clone of the [Excalidraw](https://excalidraw.com/) web app,
built with [Craft Anything](https://github.com/storytold/craft-anything).

Built with React + TypeScript + Vite, using [rough.js](https://roughjs.com/) for the sketchy rendering and
[perfect-freehand](https://github.com/steveruizok/perfect-freehand) for the pencil.

## Features

- **Tools:** selection, hand (pan), rectangle, diamond, ellipse, arrow, line (drag or click point by point),
  pencil, text, eraser, image, sticky note, laser pointer, bucket fill, lasso selection
- **Styles:** stroke and background colour, fill (hachure / cross-hatch / solid), stroke width and style,
  sloppiness, edges, opacity
- **Editing:** move, resize, rotate, box multi-select, duplicate, delete, layer order, undo/redo
- **View:** zoom and pan, grid, light/dark theme, phone layout
- **Files:** export PNG and SVG, save and open `.json` scenes, autosave to `localStorage`
- **Extras:** keyboard shortcuts (number keys and letters for tools, `Ctrl+Z`/`Ctrl+Y`, `Delete`),
  command palette (`Ctrl+/`), text search (`Ctrl+F`), library side panel, Korean UI option

Not implemented: live collaboration, frames, web embeds, "draw to shape" and AI generation
(they show a "not available yet" message).

## Run

```sh
npm ci
npm run build      # type-check and build static files into dist/
npm start          # serve dist/ at http://0.0.0.0:8100 (PORT / HOST env vars change it)
```

`npm run dev` starts the Vite dev server for development.

`server.js` is a dependency-free Node static server (gzip, long-lived caching for hashed assets,
path-traversal guard). Any static host works too: just serve `dist/`.

### As a systemd user service

```ini
# ~/.config/systemd/user/jjapdraw.service
[Unit]
Description=JjapDraw whiteboard (static server)
After=network-online.target

[Service]
WorkingDirectory=/path/to/jjapdraw
Environment=PORT=8100
ExecStart=/usr/bin/node /path/to/jjapdraw/server.js
Restart=on-failure

[Install]
WantedBy=default.target
```

```sh
systemctl --user daemon-reload
systemctl --user enable --now jjapdraw
```

## How it was made

Generated with `craft-anything-cli rebuild https://excalidraw.com "<request>"` (Craft Anything 0.6.1, Clean room
mode: only what a visitor sees was studied, not the original's source). Claude Code built it, and Craft Anything
compared the result with the original at three screen widths:

| Width | Similarity |
|---|---|
| 1440 px | 98% |
| 768 px | 96% |
| 390 px | 93% |
| **Overall** | **96%** (9 of 9 checks hold) |

The original's name and logo are replaced with JjapDraw's own. The handwriting font is
[Architects Daughter](https://fontsource.org/fonts/architects-daughter) (OFL).
Excalidraw is a trademark of its respective owners; this project is not affiliated with it.
