# The Solar System — A Scroll Journey
A 4K-ready, scroll-driven 3D Solar System website built with **Three.js** and vanilla
HTML/CSS/JS. Inspired by the "Universe Scroll" concept: land on a wide view of the full
Solar System, then **scroll** to fly the camera from planet to planet — Mercury → Venus →
Earth → Mars → Jupiter → Saturn → Uranus → Neptune — with hero and close-up detail
sections for each world.

Every planet **spins on its own axis** (with real axial tilt; Venus & Uranus rotate
retrograde) **and orbits the Sun** continuously, while scroll only moves the camera.

## Features
- **Scroll-journey camera** — 17 smoothly-interpolated keyframes (overview + 8 planets × hero/detail)
- **Procedural 4K-friendly textures** generated with fbm value-noise: Earth with oceans/continents/clouds/ice caps, Jupiter with Great Red Spot, banded gas giants, cratered Mercury, dusty Mars, Venus clouds, fiery Sun — all on canvas, no image assets
- **Saturn's rings** (with Cassini division), **Earth's Moon**
- **14,000-star starfield** + coloured nebula clouds for depth, pulsing solar glow
- Per-planet **hero section** (name, tagline, description, quick stats) + **detail section** (close-up surface + 6 real data facts)
- Glassmorphism top nav with planet jump-links, top progress bar, right-side section dots, scroll hint
- Subtle mouse parallax, ACES tone mapping, sRGB, anisotropic filtering
- Fully responsive; works offline (Three.js bundled in `/vendor`)

## How to run
Open `index.html` in any modern browser (Chrome / Edge / Firefox / Safari). No build step,
no internet required. For best performance serve it:
```bash
cd solar-system-scroll
python3 -m http.server 8000
# open http://localhost:8000
```

## Controls
- **Scroll / swipe** — fly through the Solar System, planet by planet
- **Click nav links / dots / buttons** — jump to any planet
- **Move mouse** — subtle parallax

## Project structure
```
solar-system-scroll/
├── index.html          # page structure, nav, progress, slides container
├── css/style.css       # dark space theme, Playfair Display serif, glass UI
├── js/app.js           # Three.js scene, procedural fbm textures, scroll camera
├── vendor/three.min.js # Three.js (bundled, works offline)
└── README.md
```

## Notes
- Planet sizes and orbit radii are artistically scaled so everything is visible at once
  (true-to-scale would make inner planets invisible). Orbital ordering and relative
  speeds are qualitatively Keplerian.
- All planetary facts (diameter, distance, day/year length, moons, temperature) are real.
- Moon counts verified against NASA and marked "(as of 2024)".

## Changelog

### Phase 1 — Planet graphics (shader upgrade)
- Replaced all 512×256 canvas textures with **GLSL shaders using 3D simplex noise**
  sampled from the sphere surface: no longitude seam, no pole pinching, fully
  seeded/deterministic (no Math.random), effectively infinite resolution.
- **Animated** gas-giant bands (Jupiter/Saturn/Uranus/Neptune) with swirling Great Red
  Spot (Jupiter) and dark spot (Neptune); animated Sun surface (granulation + sunspots).
- **Earth**: separate drifting cloud sphere, city lights on the night side, ocean
  specular sun-glint, polar ice.
- **Fresnel atmosphere rim glow** (additive BackSide shell) for Venus, Earth, Mars,
  Jupiter, Saturn, Uranus, Neptune + solar corona shell.
- **Bump relief** (normal perturbation from height field) on Mercury/Mars/Moon;
  Mars Valles Marineris gash + polar caps; Mercury/Moon crater field with rim brightening.
- **Rings**: high-res radial texture with Cassini + Encke gaps; faint rings added to
  Jupiter, Uranus, Neptune.
- **Moons added**: Earth's Moon, Mars (Phobos + Deimos), Jupiter (4 Galileans),
  Saturn (Titan).
- **Loading screen** with progress bar; WebGL-failure fallback retained.
- Content fix: Mercury now shows **176-day solar day** (not 58.6-day rotation) and
  "second densest planet".
- Scroll/camera/slides/nav behaviour unchanged. Pre-upgrade backup kept as
  `solar-system-scroll.BACKUP-phase0`.

### Phase 2 — Space environment
- **Twinkling starfield** (custom ShaderMaterial, per-star phase) + **Milky Way band** (45% of stars concentrated in a tilted plane).
- **Asteroid belt** between Mars and Jupiter — 1,200 rocks via `InstancedMesh`, slowly orbiting.
- **Shooting stars** every ~5–13 s (additive streak, fades out; disabled under reduced-motion).
- **Orbit lines highlight** the active planet's orbit and fade during close-up detail sections.
- Nebula sprites retained for depth.

### Phase 3 — Scroll / camera / interaction
- **Damped smooth scroll** (camera glides behind the scrollbar; disabled under reduced-motion).
- Subtle **camera roll + FOV widening** while travelling between keyframes.
- **Staggered fade/slide-in** for titles, stats, buttons (per-child `transition-delay`).
- **Click any planet (or the Sun)** in the 3D view to jump straight to its section; hover cursor changes to pointer.
- **HUD** (bottom-left): current body, distance from Sun, light-travel time from the Sun.

### Phase 4 — UI / design polish
- **Per-planet accent colour** that smoothly lerps the whole UI (nav, progress, dots, buttons, HUD) as you travel.
- **Count-up animation** for all numeric stats when a section enters.
- **Mobile hamburger menu** (full-screen overlay with planet links) — nav links are no longer dead on mobile.
- **Text scrims** (gradient darkening) behind slide text so it stays readable over bright planets.
- **Favicon** (inline SVG) + meta/OG tags. Loading screen with progress bar (Phase 1).

### Phase 5 — Performance / accessibility
- **Adaptive quality**: monitors frame time; drops pixel ratio to 1× if FPS stays below ~30.
- `prefers-reduced-motion` respected (no damping, roll, FOV, shooting stars).
- **Keyboard navigation**: ↑/↓/PageUp/PageDown/Space/Home/End.
- ARIA labels on nav, menu, dots, canvas, loader.
- **WebGL fallback**: static message shown if WebGL is unavailable; all text content remains readable.
- Fonts: Google Fonts with robust system fallbacks (Playfair Display → Georgia; IBM Plex Sans → system-ui).

### Phase 6 — Content accuracy
- Mercury shows **176-day solar day** (not 58.6-day rotation) and "second densest planet".
- Moon counts marked **"(as of 2024)"** (Jupiter 95, Saturn 146, Uranus 28, Neptune 16).
- All other planetary facts retained from NASA-standard values.

Backups: `solar-system-scroll.BACKUP-phase0` (pre-Phase-1) kept alongside.

## Texture credit
Planet surface maps (2K, in `assets/`) are by **Solar System Scope**, licensed
**CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/). Source:
https://www.solarsystemscope.com/textures/. They are loaded via Image→Canvas so the
site still works by double-clicking `index.html` (file://), no server required.
