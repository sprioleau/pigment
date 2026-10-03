# Gameplay verification

Verified with the controlled Codex in-app browser against the local application and the initial production deployment.

- Welcome → picture picker → canvas navigation works.
- A real canvas click fills an enclosed region; a wrong bucket gives a number hint.
- Undo restores the unpainted area.
- A partial drawing saves to the gallery and restores after reload.
- Cloud Unicorn can be completed through all 28 regions; completion offers replay and another picture.
- Replay resets progress.
- Export downloads a real 720 × 720 PNG through the server export route. The downloaded file is preserved as `exported-unicorn.png`.
- Number-free line art imports through the file chooser, accepts per-region color assignments, becomes playable, and persists after reload.
- A 390 × 844 viewport keeps canvas, buckets, save, and export usable.
- Production welcome and canvas load over HTTPS at https://pigment.sprioleau.dev.

- Game zoom increases from 100% through 150% to 200%; a zoomed click paints the correct region, and Fit resets the viewport while retaining paint. Dragging does not accidentally paint.
- Game and workshop region debug panels are hidden by default and available with `?debug=1`.
- Workshop boundary drawing changes the unicorn from 28 to 31 regions; Undo restores 28. Saved changes persist after reload, and the Saved status stays visible.
- Workshop includes zoom controls and a Pan picture tool while keeping draw and number movement gestures available.
- The puffy Three.js welcome preview was inspected on desktop and at 390px mobile width, with real button focus/click behavior and a usable fallback. It is published at https://pigment.sprioleau.dev/explore/puffy.

The automated engine and export-route suite contains 19 behavioral tests. ESLint and TypeScript checks passed. Vercel completed the initial production build successfully; local Turbopack worker binding was restricted by the desktop sandbox.

Gallery data and puzzle edits are browser-local. This verification does not claim cloud synchronization or offline caching.
