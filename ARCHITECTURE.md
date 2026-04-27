# Architecture

Notes for anyone reading the code. Covers the render pipeline, combat flow, and conventions used across the codebase.

## Directory layout

```
ai-dungeon-master-3d/
├── electron/                    Desktop app wrapper
│   ├── main.js                 Electron main process
│   └── preload.js              IPC bridge
│
├── game/                        Web app (this is the deployable site)
│   ├── index.html              Entry point with Three.js canvas
│   ├── css/style.css           Watercolour-themed HUD styles
│   ├── js/
│   │   ├── logic/              Ported from text-based ancestor
│   │   │   ├── data.js         Content data (rooms, enemies, items)
│   │   │   ├── stats.js        D&D stat check system
│   │   │   ├── inventory.js    Equipment system
│   │   │   └── combat.js       Turn-based combat
│   │   ├── three/              Three.js rendering
│   │   ├── shaders/            GLSL fragment shaders
│   │   ├── systems/            Colour extraction, progression
│   │   ├── ui/                 Painter's palette, inventory panel
│   │   ├── hud.js              HTML overlay UI
│   │   └── main.js             Entry point and GameEngine
│   └── assets/
│       ├── rooms/              Watercolour backgrounds (1920×1080)
│       ├── enemies/            Watercolour sprites (512×512, with @2x and @4x)
│       ├── textures/           Paper, noise maps
│       └── particles/          Paint splotch textures
│
└── package.json                 Electron + dev dependencies
```

The art-pipeline directory (`.agents/art-pipeline/`) sits outside the public tree because it depends on a local ComfyUI install and contains generation scratch. The conventions used there are documented below.

## Module system

Mixed by design. ES modules for Three.js components (anything in `game/js/three/`), classic IIFE globals for game logic (`game/js/logic/`). The logic was ported in from a text-based ancestor where global objects were already the style, and the cost of migrating wasn't worth paying.

Key globals exposed by the logic layer:

- `DataManager` — content lookups (rooms, enemies, items)
- `Stats` — D&D stat check system
- `Inventory` — equipment system
- `Combat` — turn-based combat
- `GameEngine` — game state machine
- `HUD` — UI controller
- `Renderer3D` — 3D rendering interface

## Render pipeline

The watercolour look is built by stacking post-processing on top of an otherwise unremarkable Three.js scene.

1. **RenderPass.** Three.js scene with a curved backdrop (180° cylinder) showing the room artwork. Enemies are billboarded `THREE.Sprite` instances against this backdrop. A particle system handles spell effects.
2. **KuwaharaPass.** Painterly filter, radius 3-4. The biggest single contributor to the watercolour look. Higher radius is too aggressive and erases shape detail.
3. **EdgeDarkeningPass.** Sobel-based edge detection that thickens the dark linework, mimicking watercolour ink outlines.
4. **UnrealBloomPass.** Subtle magical glow on highlights.
5. **PaperTexturePass.** Grain overlay and saturation reduction. Pulls everything toward a unified paper-on-table feel.

The ordering matters. Kuwahara before edges so edges thicken the painterly result rather than the raw scene. Paper texture last so it sits on top of everything.

## Combat flow

```
Player input (HUD button)
        ↓
Combat.playerAction()
        ↓
Turn order resolved by Speed
        ↓
Player attack/ability  →  Renderer3D.playAttackSpell()  →  ParticleSystem
        ↓
Enemy response  →  Renderer3D.playEnemyAttack()  →  Camera shake
        ↓
HUD.updateStats()
        ↓
Victory / defeat check
```

## Colour extraction

The chromatic essence system works by sampling pixel colour from the rendered scene at the cursor position, classifying that colour into one of six pigment buckets (fire, ice, nature, light, arcane, life), and adding it to a palette inventory. Spells consume pigments from the palette to fire. The whole system lives in `game/js/systems/color-system.js`.

This was a late addition to the project and is the most distinctive mechanic. It works because the watercolour backdrops have *real, physical* colour fields you can read off the scene rather than abstract hit zones. The visual style and the gameplay are coupled in a satisfying way.

## Coding conventions

- **Naming:** camelCase for functions and variables, UPPER_SNAKE for constants, kebab-case for files and CSS classes, PascalCase for classes.
- **Watercolour palette** (CSS custom properties):
  - `--wc-background: #1a1a2e`
  - `--wc-paper: #f5f0e6`
  - `--wc-gold: #d4a574`
  - `--wc-blood: #8b3a3a`
  - `--wc-mana: #4a6fa5`
  - `--wc-heal: #5a8a5a`
  - `--wc-arcane: #7a5aaa`
- **Shaders** receive `tDiffuse` (input texture), `resolution` (vec2 screen size), and effect-specific uniforms.
- **HUD messages** use `HUD.showMessage(text, type)`. Types: `system`, `combat`, `success`, `error`, `heal`, `mana`, `damage`, `critical`. Colour and styling are derived from the type.

## Asset pipeline conventions

Even though the art-pipeline directory isn't in the public tree, the conventions are worth recording.

- **Generator:** ComfyUI, locally hosted on `http://127.0.0.1:8188`.
- **Sampler:** dpmpp_2m with karras scheduler. 30 steps, CFG 7.0, 5-minute timeout per image.
- **Room backgrounds:** 1920×1080 (16:9 to match modern screens).
- **Enemy sprites:** 512×512 base, with @2x and @4x upscales for high-DPI displays. The upscale pipeline ran each base sprite through Real-ESRGAN.
- **Particles:** 128×128, transparent background.
- **Style anchors used in prompts:** "watercolor painting", "soft edges", "pigment bleeding", "paper texture visible". Negatives that mattered: "pixel art", "photorealistic", "sharp edges", "digital art".
- **Generated output** lived in `.agents/art-pipeline/output/`. The processed subset was hand-curated and copied into `game/assets/`.

## Performance targets

- 60 FPS at 1920×1080 on a modern desktop GPU.
- Kuwahara radius capped at 4. Higher is the easiest way to tank framerate.
- Maximum 200 active particles.
- Room textures stay at 1920×1080. Don't go higher, the screen-space filter chain swallows the detail anyway.

## Testing

Test definitions and protocols live in `tests/` (e2e, visual, performance subdirectories). They were authored as natural-language test plans, executable by an agent driving Playwright.
