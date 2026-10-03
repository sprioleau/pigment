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
