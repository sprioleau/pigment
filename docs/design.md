# Pigment design and implementation

## Enchanted Paintbox

The user selected this direction on October 3, 2026: ornate plum-and-gold storybook frames, cream paper, lilac, pink, mint, and jewel-colored paint buckets. The audience is five- and six-year-old children. Bespoke game controls and illustration-led screens carry the theme throughout.

The bottom row of [the concept board](concepts/pigment-directions.png) records the selected direction. The top row preserves the alternate Pixel Fairyland concept. The current game is implemented; [screenshots](../public/screenshots/) show its actual interface.

## Implemented screens

1. **Welcome:** Pigment wordmark and unicorn medallion, with Start painting, My gallery, Add a picture, and Puzzle Workshop controls.
2. **Choose a picture:** large illustration cards, difficulty filters, and responsive columns. The starter paintbox contains Cloud Unicorn, Flower Kitty, and Clover Cow.
3. **Paint:** numbered paint buckets, HTML canvas, selected-color brush cursor, progress, undo, save, and download. Touch and mouse both use Pointer Events. Smaller screens rearrange the layout while keeping controls usable.
4. **My gallery:** saved finished and unfinished drawings. Opening a drawing resumes its per-region paint state. Storage is local to the current browser.
5. **Add a picture:** import clean line art, name the picture, then choose buckets and assign numbers to enclosed areas. The setup canvas previews those colors with number labels retained.
6. **Completion:** save a masterpiece, paint again, or choose another picture.
7. **Puzzle Workshop:** a grown-up editor for starter and imported puzzles. Edit palette swatches and names, assign area numbers, move labels within their regions, draw or erase outlines, inspect analysis, and save playable changes.

## Canvas behavior

The game independently implements the standard four-neighbor flood-fill connected-component algorithm. It labels enclosed light regions from clean black-on-white line art once, then keeps an immutable region ID map. Painting uses that map, so filling an area cannot change the boundaries used by later clicks.

- Source sheets are cleaned offline into number-free line art; game numbers are overlays.
- Target colors come from curated seed points or imported region assignments. Segmentation alone does not infer an animal’s natural colors.
- A distance transform places number labels inside their region and away from outlines.
- Pointer coordinates are converted from displayed canvas bounds to artwork coordinates. Nearby-region tolerance helps small targets.
- A matching bucket fills the region, removes its number, and produces a brief burst of translucent paint circles. Reduced-motion preferences suppress the burst.
- A different bucket produces a gentle hint without penalties or countdowns. Undo restores the previous paint state.
- Keyboard users can choose numbered buckets and paint with the area buttons below the canvas. Numbers, bucket labels, status messages, and progress supplement color cues.
- Export works at any stage. It renders the current fills without number overlays, particles, or interface controls and downloads the PNG through `POST /api/export`.
- Further painting or undo closes an existing export preview so its PNG cannot silently lag behind the artwork.

## Artwork and imports

Repository artwork lives in `public/pictures/`; originals and attribution records are preserved in `source-art/`. Worksheet headers, name lines, crayons, footers, and printed numbers have been removed from the playable line art.

Cloud Unicorn is original generated artwork with an easier set of regions. Flower Kitty and Clover Cow derive from the user-supplied worksheets. Their redistribution licenses have not been verified. See [source records](../source-art/sources.json) for Creative Kids Color, Sanrio, and My Teaching Station credits.

Imported pictures accept PNG, JPEG, or WebP files up to 12 MB and are resized to at most 720 pixels along the longest edge. Imports require thick, closed outlines without printed numbers; photographs and open outlines are unsuitable. The importer rejects pictures with no enclosed regions or more than 200 regions. All areas begin at number 1, and a grown-up can assign other colors before adding the picture.

## Puzzle Workshop

The workshop offers color assignment, number placement, black boundary drawing, and white boundary erasing. A colored preview helps check the intended result. Number labels can be moved by click or drag; region buttons and percentage position fields provide keyboard editing. Positions stay within the associated region, and invalid stored positions fall back to the automatic label location.

Boundary strokes use an adjustable brush size and re-run segmentation when released. Colors transfer from the old area underneath each new region’s automatic number position; custom number positions reset after boundary changes. Split or merged regions should be checked in the preview before saving. Undo restores up to 30 workshop changes.

Region analysis reports paintable area count, smallest and largest areas, tiny excluded regions, and edge-connected regions. Edge-connected counts include the normal surrounding background; they are a diagnostic clue, not a definitive count of broken outlines. Draw boundaries across gaps to enclose regions, or erase boundaries to join them.

Saving creates or updates a browser-local override with the same picture ID. The picker uses that version without duplicating the original card. Existing gallery drawings retain their earlier picture snapshot. Unsaved drafts are discarded when leaving the workshop or selecting another picture. No shared administration account or cloud publishing is implemented.

## Persistence and platform

The game uses a versioned browser-local library for custom pictures, fills, progress, thumbnails, and timestamps. Saved data is validated before use. Storage failures show a message; failed saves prevent automatic navigation away from the painting. Downloads provide a separate copy of the artwork.

No cloud gallery or database is provisioned. Browser storage does not sync across devices and is removed when that browser’s site data is cleared. A future cross-device gallery would require identity/access decisions and real storage provisioning; the current game needs no environment variables.

The app uses Next.js 16.3.8 App Router, React, TypeScript, Tailwind CSS 4, and Vitest. A web app manifest and Apple home-screen icons support adding Pigment to an iPhone or iPad home screen with standalone display. Offline operation is not part of this implementation.

Browser verification and automated checks are recorded separately; the README screenshots depict the implemented game rather than the initial concept artwork.
