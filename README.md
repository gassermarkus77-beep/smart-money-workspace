# Smart Money Workspace

A standalone browser application for a Smart Money / ICT-style trading workspace.

## What was wrong

The original repository only contained a React component file (`trading_workspace (2).jsx`) and no browser entry point. Opening the project directly produced a black screen because:

- There was no `index.html` with a mount element.
- There was no React mounting code (`createRoot(...).render(...)`).
- The JSX file imported bare npm packages (`react`, `recharts`, `lucide-react`) that do not resolve in a plain browser.
- JSX syntax requires a build step or Babel transform, but the project had no build tooling.
- The component used `window.storage`, which only exists in some hosted environments and fails in a normal browser.
- The chart and icon dependencies were unavailable without npm or a bundler.

## Fix

The app has been refactored into a no-build, browser-native version:

- `index.html` loads the page directly.
- `app.js` contains all application logic in vanilla JavaScript.
- Tailwind is loaded from the official CDN for utility styling.
- A small custom CSS fallback keeps the app usable if the Tailwind CDN is blocked.
- Data persists in `localStorage`.
- No React, Babel, JSX, npm, bundler, or dev server is required.

## Run

Open `index.html` directly in a modern browser, or serve the folder with any static file server:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Features

- Dashboard summary cards
- Monthly goals and watchlists
- ICT / Smart Money checklists
- Trade journal with add, edit, and delete
- Playbook cards
- Risk settings and position size calculator
- Daily plan / routine
- Statistics summary
- Psychology and discipline log
