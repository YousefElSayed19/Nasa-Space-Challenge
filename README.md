# MissionForge

A browser-based 3D game for **NASA Space Apps Cairo 2026** (challenge: *Space Mission Design Game*).
You walk around a spacecraft hangar, carry parts with your hands, bolt them onto a spacecraft, fuel it, launch it,
and then the game explains which of your own decisions made the mission succeed or fail.

## Flight emergencies

During the flight, real-world problems come up: safe mode, a comet’s dust, a collision warning, the asteroid belt, a faulty propellant valve. They are random: each flight gets none, one or two. Pick A, B or C. The right answer is what NASA actually did; a wrong one can lose the spacecraft. The flight panel also works through the real orbit equations (Hohmann transfer, Kepler’s third law, rocket equation) with NASA planetary constants. See docs/SOURCES.md.

## ▶ Play now

**https://yousefelsayed19.github.io/Nasa-Space-Challenge/**

Opens in any modern browser on a laptop, tablet or phone (landscape). No installation, no login. On touch screens: joystick to walk, drag to look, on-screen buttons to use, jump and run.

> MissionForge is a placeholder name. Not reviewed or endorsed by NASA.

## What is in the game

- **A mission facility:** a central Assembly Hall with the spacecraft and ten themed rooms around it (four instrument labs, power, communications, protection and entry, propulsion and fueling, the launch vehicle hall, and mission control). A minimap shows where you are and pulses the room of your next task; press M for the full map and travel through a portal, or follow the gold arrows from door to door.

- **Four missions** that unlock in order: Lunar Orbiter (inspired by LRO), Mars Orbiter (MRO), Mars Lander (InSight, with heat shield, parachute and a landing) and Europa Flyby Explorer (Europa Clipper).
- **Three modes:** Campaign, Sandbox (no locks, no budget limit) and Replay a real mission (start from the real NASA design).
- **1 to 4 players on one screen.** The four roles (Systems Engineer, Science Lead, Launch and Orbit Lead, Budget and Risk Manager)
  are shared between players, and every stage needs all four roles to approve before it locks. Solo players get an advisor instead.
- **Hands-on build:** carry parts, hold to install, pump propellant, and run four pre-launch checks. Skipped checks can cause faults.
- **Events:** solar storms, eclipses, Jupiter radiation, antenna pointing during flybys, random instrument faults.
- **Debrief:** score, cause trace back to your decisions, comparison with the real mission, and saved designs you can compare.
- **Interactive tour** on first play: each step waits for you to try it, then you press Next (or Skip).
- **Task list and guide arrow:** the current stage's tasks with an arrow on the one to do now, a floating arrow over the station, and an edge arrow when it is off screen.
- **Intro video** made live from the game's own scenes, with captions and an optional narrator: what the game is for, what to do, and why every component choice matters. A recorded gameplay video at `public/intro.mp4` plays instead if present (see `docs/INTRO_VIDEO.md`). Then an interactive tour.
- **Educational flight:** liftoff, booster separation, fairing split and spacecraft separation, then a guided tour of everything on the way (the Moon, the Sun, Venus, gravity-assist flybys, the asteroid belt) with facts and sources, orbit insertion or landing, and the data coming home by radio.
- **Recommended choices (optional):** every room can sort its options with the best fit for your current design first and say why; switch hints off on the start page for a harder game.
- **Online multiplayer (1–4 players):** host a room and share a 4-letter code or an invite link; each player takes one of the four roles, walks the facility with their own engineer, and signs off only their own role. See `docs/MULTIPLAYER.md`.
- **Go/No-Go review board:** four reviewers, one per role, sit behind the consoles in Mission Control. During the review they turn to you, and each says GO or NO-GO with the reason in a speech bubble.
- **Score explained:** the debrief lists every point you did not get, under each part of the score, with the reason and how to win it back.
- **Change requests:** click a completed stage (or a ↩ button) to change only that step, for example to add a forgotten battery, for a fee that grows the later you are. Every other confirmed step stays; you only top up propellant if the change needs it.
- **Flight at your own pace:** the flight waits at every stop until you press Continue (or Auto runs out), and you can click any passed stop to read it again. The Mars Lander lands step by step with NASA's real InSight numbers, a live altitude and speed readout, and the rocket equation worked out for your design.
- **Real instrument data:** each mission's real instruments with their NASA mass and power (HiRISE 65 kg, LROC 19.2 kg, HP3 3 kg…), specifications, a NASA or approximate badge, and a link to the source on every card. Detailed 3D models for each instrument type.
- **Full-screen part and rocket picker:** one big card at a time with a live 3D model you can turn, price, real-world values, strengths and weaknesses, how to use it, and the budget after choosing. Carry it yourself or install it directly.
- **Jump and fly:** hold Space to fire the suit thrusters, or press F for flight mode (Space up, Q down).
- **Launch countdown, and a 3D flight** for each mission: liftoff from Earth, cruise with a chase camera, orbit insertion and science orbits.
- **Budget in dollars everywhere:** money left in the top bar, cost and budget-after on every card.
- **Optional extra funding** (a loan with interest: if the mission fails while you hold it, the program is cancelled).
- **Cause tracing** that also names a decision that fixed one thing and broke another.
- **Leaderboard on this device** for campaign flights.
- **Badges** in the debrief, a **Help** page with controls, and a **glossary** of the twelve engineering ideas the game teaches.

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

**Adding content needs no new code.** A new mission is a record in `src/data/missions.json`, a new instrument is a record in `src/data/parts.json`;
a new character option is a new entry in `src/data/character.json`.

### Engine at a glance

| Module | What it does |
|---|---|
| `model.js` | Current mission, parts and rockets; sums installed parts into mass, power, data, propellant and budget |
| `review.js` | The four roles' Go/No-Go calls and team sign-off checks |
| `simulate.js` | Mission timeline, events, skipped checks, orbit insertion, data downlink, score |
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
