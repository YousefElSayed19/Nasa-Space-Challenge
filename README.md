# MissionForge

A browser-based 3D game for **NASA Space Apps Cairo 2026** (challenge: *Space Mission Design Game*).
You walk around a spacecraft hangar, carry parts with your hands, bolt them onto a Mars orbiter, fuel it, launch it,
and then the game explains which of your own decisions made the mission succeed or fail.

> MissionForge is a placeholder name. Not reviewed or endorsed by NASA.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # simulation engine tests (no browser needed)
npm run build      # static site in dist/
```

## Deploy to GitHub Pages

1. Push this folder to a public GitHub repository on the `main` branch.
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml`: install, test, build, publish.
4. The link is `https://<account>.github.io/<repository>/`. Open it in a private window to confirm it needs no login.

`vite.config.js` uses a relative `base: './'`, so the site works under any repository name.

## How the code is organised

The layers follow section 12.1 of the game design document. The simulation engine never imports React or Three.js,
so it can be tested alone and the game still works if the 3D layer is late.

```
src/
  data/      JSON content: mission, parts, rockets, stations, character options, sources
  engine/    plain JS rules: resources, rocket equation, Go/No-Go review, simulation, scoring, cause tracing
  state/     store (useSyncExternalStore), actions (every decision is logged), event bus to the scene
  audio/     sounds generated with the Web Audio API (no audio files)
  scene/     Three.js: hangar, stations, spacecraft parts, character, bloom, camera, input
  ui/        React glass interface: HUD, station panels, character creator, mission timeline, debrief
```

**Adding content needs no new code.** A new instrument is a new record in `src/data/parts.json`;
a new character option is a new entry in `src/data/character.json`.

### Engine at a glance

| Module | What it does |
|---|---|
| `model.js` | Sums installed parts into mass, power, data, propellant and budget; headroom per resource |
| `review.js` | The four roles' Go/No-Go calls |
| `simulate.js` | Mission timeline, solar storm, orbit insertion, eclipse, data downlink, score |
| `trace.js` | Links a failure to the logged decisions that caused it, in the order they were made |

### Character

Built in code from simple shapes (no outside model, no licence needed). Options: suit, accent, gloves and boots,
chest patch, helmet style, visor tint, body, height and backpack. The rig has hips, knees, elbows and a spine,
and blends walk, run, carry, install (kneel and tighten), pump and wave poses.

### Graphics

Soft shadows, studio reflections for metal and visors, bloom on glowing accents, eased movement and camera,
and adaptive resolution that lowers the pixel ratio if the frame rate drops. **Low graphics** in the corner turns off
blur, shadows and bloom for weak laptops or the projector.

Three.js is pinned to `0.128.0` because it is the version the single-file prototype was built and checked with.
Upgrading later is possible but changes the colour and lighting defaults.

## Data policy

Every number shown as real comes from a NASA or JPL source listed in [`docs/SOURCES.md`](docs/SOURCES.md).
Values that are game assumptions carry `"approximate": true` in the data files and are labelled in the game.

## Work prepared before the event

The local organisers confirmed (by chat or in person) that preparing code before the event is allowed.
**Keep that confirmation in writing.** Everything in this repository as of its first commit was prepared before
Friday 13 November 2026; work done during the hackathon starts after that commit.

## Credits and AI-use disclosure

- Game design, research, code and team decisions: the MissionForge team.
- AI tools were used to assist with research, code and documentation. The team reviewed and tested all of it.
  The full AI-use disclosure is in the project submission, as the Space Apps submission guide requires.
- Libraries: [React](https://react.dev) (MIT), [Three.js](https://threejs.org) (MIT), [Vite](https://vitejs.dev) (MIT), [Vitest](https://vitest.dev) (MIT).
- All 3D models, textures and sounds are generated in code; no third-party assets are used yet.
- NASA data is credited to its source pages in [`docs/SOURCES.md`](docs/SOURCES.md). NASA logos are not used.

## Licence

MIT, see [LICENSE](LICENSE).
