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

The approved Puffy Paint Club direction now appears throughout the main home, picture picker, canvas, gallery, importer, and workshop. Palette buckets and the pointer brush are genuine Three.js meshes with lighting and shared geometry/materials. Bucket buttons and numbers remain accessible HTML controls. The selected brush paint material updates directly from the bucket color. The mesh tip is anchored at the real canvas click point; the brush stays hidden for touch input. Renderer resources are disposed on leaving the board, and CSS controls remain available when WebGL cannot initialize.

Chrome verification confirmed all six real bucket models, enlarged bucket sizing, a real Rose pink bucket click followed by a successful mane fill, and correct brush hotspot alignment. Reduced-motion mode removes hover/dab animation. The fullscreen 3D overlay renders the current viewport; mobile evidence uses viewport screenshots with the palette scrolled into view.

The brush is now one persistent global Three.js cursor across all screens. Its paint tip stays exactly at the mouse location while its handle gently turns and breathes. Game and workshop selections update its paint material through a shared color event. Native cursors are hidden only after the fine-pointer WebGL cursor initializes and receives mouse input; touch and WebGL failure retain usable controls. The board renderer now draws buckets only, avoiding duplicate brushes.

Latest local Chrome checks confirmed the global brush on Home, a single brush during painting, bucket 3 updating its color, and a precise real fill from 0 to 1 of 28 regions. Keyboard zoom reached 150%, an actual button click produced eight splash circles, and the 390px layout had no horizontal overflow with all six buckets accessible. The mobile music control occupies a 48px top-right button without covering menu actions. Full ESLint, TypeScript, and all 19 behavioral tests passed. Button clicks also synthesize a short original paint-pop sound independently of the music mute preference.

Production browser verification of commit `684bc5d` confirmed the global brush and hidden native cursor on Home, Start/Home navigation, eight splash droplets after a real click, active music, and no runtime errors. The production screenshot is preserved in `global-brush.jpg`.
