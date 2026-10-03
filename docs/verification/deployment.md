# Pigment deployment

Published October 3, 2026 using Vercel CLI 62.2.0.

- Public repository: https://github.com/sprioleau/pigment
- Vercel account: `sprioleau-projects` (personal Hobby account)
- Vercel project: `pigment`
- Production domain: https://pigment.sprioleau.dev
- Initial production deployment: https://pigment-ihdjo2tr7-sprioleau-projects.vercel.app
- Release commit: `1fd2ec576752570ed2a94d59dbd6679eaffd1237`
- Deployment status: READY
- Cloud build duration: 30 seconds
- Framework preset: Next.js
- Runtime: Node.js 24
- Git integration: connected to `sprioleau/pigment`; main branch pushes trigger production builds
- GitHub About homepage: https://pigment.sprioleau.dev
- Domain verification: configured correctly, verified, no DNS conflicts
- Secret files: `.env*` and `.vercel` excluded from Git

## Production checks

- Production domain returned HTTP 200 over HTTPS.
- Initial HTML includes Pigment branding, web manifest, and Open Graph metadata.
- `/social-card.png`, `/manifest.json`, and `/pictures/cow-lines.png` each returned HTTP 200.
- Error-level deployment runtime log scan returned no logs shortly after release.
- Local lint and all 13 Vitest tests passed before publication.
- The local Turbopack build encountered a sandbox worker binding restriction; the Vercel production build completed successfully.

Application browser verification and visual evidence are coordinated separately. Runtime log checks are a release snapshot, not continuous monitoring.

## Illustrated cursor verification

An AI-generated transparent storybook brush is saved in `public/paintbrush.png`. Its neutral bristles receive an SVG paint overlay using the selected bucket color. The 80px pointer sprite places its tip exactly at the click hotspot and stays hidden on touch/coarse input devices.

In a controlled local Chrome browser, painting the unicorn face with mint cream and a hair region with rose pink increased progress from 0 to 1 to 2 areas. The brush appeared at the clicked tip and changed hue with the selected bucket. Scoped ESLint and TypeScript checks passed.

## Workshop release

Commit `5d8d7a31c3ed1e579cbd270720b1f09875efb80f` deployed successfully to https://pigment-iqvngleoz-sprioleau-projects.vercel.app with status READY after a 17-second cloud build. The production custom domain points to this release. It includes the illustrated cursor, corrected cow color seeds and preview, improved label placement, and puzzle workshop.

All 16 Vitest tests passed for this update. An intermediate build lacked the `Picture.labelPositions` type dependency; the complete picture metadata update repaired it, and the successful production release superseded that failed build.

## Zoom and icon verification

Navigation and game/workshop actions use named Lucide React icons with consistent 20px size and 2px strokes. Decorative icons are hidden from assistive technologies; action labels remain readable.

Game and workshop canvases now support 100%–300% zoom in 50% steps and a Fit reset. Zoom preserves the canvas pixel resolution and uses the rendered bounds for hit testing. The game treats a short pointer gesture as a tap and rejects drags longer than 8 pixels; the enlarged viewport supports native touch scrolling. Workshop users can choose Pan picture while zoomed without interfering with drawing and number movement tools.

Controlled Chrome verification confirmed 100% → 150% → 200% zoom, accurate unicorn face painting at 200%, Fit reset with retained paint, and no paint from a drag. The workshop's Save puzzle changes status remained visible after its library update. Region button debug panels are hidden unless the URL contains `?debug=1`. Scoped ESLint, TypeScript, and all 19 Vitest tests passed.

## Published zoom and preview release

Application commit `ea279e90c3886aecc311b81f052fa447c5266b78` deployed READY to https://pigment-2f2wnv74m-sprioleau-projects.vercel.app in 25 seconds. Both https://pigment.sprioleau.dev and https://pigment.sprioleau.dev/explore/puffy returned HTTP 200 over HTTPS. An error-level runtime log snapshot returned no logs. The workshop screenshot and final verification record are included in the following documentation commit.

## Approved Puffy theme and branding

The approved Puffy Paint Club theme was published throughout the application in commit `2522975cbe052d54c8b6b2b62129c50cff573185`; its production build completed READY. Branding commit `bd8fb8d` updates the approved mascot logo, exact 1200 × 630 social card, Apple icon, normal/maskable app icons, and RGBA PNG-backed ICO favicon. Brand-generation prompts and original outputs are recorded in `docs/concepts/puffy-brand-prompts.txt` and `source-art`.

## Genuine 3D paint tools release

Commit `f4023b2d801deef52b6cc8961c6e3757cf2ccab4` deployed READY to https://pigment-dwrifuq66-sprioleau-projects.vercel.app after an 18-second cloud build. The custom domain is attached to this release. It includes real Three.js bucket geometry, a shared clay brush factory, direct selected-paint material updates, viewport-aligned mesh rendering, touch-safe input, and resource cleanup.

## Background music release

A persistent global music player uses the CC0 Children's March Theme by Cleyton Kauffman. The 64-second mono 22,050 Hz, 16-bit PCM WAV is served from `/audio/childrens-march.wav`; source and license attribution are recorded in `/audio/CREDITS.md`. Short cosine fades make both loop boundary samples zero.

Controlled browser checks confirmed first-interaction playback, continued music across game screens, mute state across navigation and reload, and explicit Play music resuming playback. Full lint and all 19 behavioral tests passed before publication.

## Global cursor and button feedback

The persistent global Three.js brush replaces the earlier board-only cursor. Game and workshop paint selections update its material directly. Its animated rotation and scale preserve the exact tip hotspot; reduced motion disables animation. Fine-pointer and WebGL readiness gate native cursor hiding, and touch input retains normal controls. Board rendering retains only the bucket meshes.

Accessible buttons now produce small colored splash circles and an original synthesized paint-pop sound. The mobile music control uses a compact 48px top-right button. Controlled Chrome checks confirmed one global brush, a precise bucket-3 fill reaching 1/28 regions, keyboard zoom to 150%, eight splash circles after a button click, and all six buckets without overflow at 390px. ESLint, TypeScript, and all 19 Vitest tests passed before release.
