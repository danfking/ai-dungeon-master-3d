# Chromatic Resonance - Implementation Plan

**Status**: Planning Phase
**Date**: 2026-02-03

---

## Overview

This plan addresses major gameplay and visual changes to transform Chromatic Resonance from a 3D pivotable scene to a fixed 2D presentation with enhanced color extraction, combat, and inventory systems.

---

## Phase 1: Core Visual Overhaul

### 1.1 Remove 3D Camera Controls (Make Fixed/Flat)

**Current State**: OrbitControls allow camera rotation around the scene.

**Changes Required**:
- **File**: `game/js/three/scene-manager.js`
  - Remove `OrbitControls` import and initialization
  - Set camera to fixed position: `(0, 1.6, 0)` looking at `(0, 1.6, -5)`
  - Remove `controls.update()` from animation loop

- **Rationale**: Creates a classic 2D dungeon crawler feel while keeping Three.js for particles and effects.

**Estimated Effort**: Small (1 file, ~20 lines)

---

### 1.2 Enemy Blending with Greyed Room Background

**Current State**: During combat, void overlay covers room; enemy renders on black.

**Desired State**: Enemy appears on top of a desaturated/greyed version of the room backdrop with smooth blending.

**Changes Required**:
- **File**: `game/js/three/room-renderer.js`
  - Modify `enterVoidMode()`:
    - Instead of dark void overlay, apply grayscale shader to backdrop
    - Keep backdrop visible at 100% but desaturated
    - Add vignette darkening at edges
  - New shader uniform: `desaturationAmount` (0.0 = full color, 1.0 = grayscale)

- **File**: `game/js/three/enemy-sprite.js`
  - Add subtle drop shadow beneath sprite for depth
  - Implement blend mode (multiply or soft light) with background

**Visual Approach**:
```
[COMBAT MODE]
┌─────────────────────────────┐
│   Greyed Room Background    │
│   (desaturated, vignette)   │
│                             │
│      ┌─────────────┐        │
│      │   ENEMY     │        │
│      │   SPRITE    │        │
│      │  (blended)  │        │
│      └─────────────┘        │
│         ░░░░░░░             │ ← soft shadow
└─────────────────────────────┘
```

**Estimated Effort**: Medium (2 files, new shader logic)

---

### 1.3 Enemy Looping Idle Animations

**Research Required**: How to implement subtle animations for static sprites.

**Options to Research**:

1. **Shader-Based Animation** (Recommended)
   - Vertex displacement for gentle sway/bob
   - UV manipulation for breathing effect
   - Fragment shader for eye blink (if eyes are a defined region)

2. **Sprite Sheet Animation**
   - Requires multiple frames per enemy
   - More art pipeline work
   - Smoother results for complex animations

3. **Skeletal/Bone Animation**
   - Requires sprite rigging
   - Complex setup but flexible
   - Overkill for subtle movements

**Proposed Implementation** (Shader-Based):
```glsl
// Vertex shader for idle animation
uniform float time;
uniform float swayAmount;
uniform float bobAmount;

void main() {
    vec3 pos = position;

    // Gentle horizontal sway (slower at bottom, more at top)
    float swayFactor = uv.y * swayAmount;
    pos.x += sin(time * 1.5) * swayFactor;

    // Vertical bob
    pos.y += sin(time * 2.0) * bobAmount;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

**Eye Blink** (Fragment shader region detection):
- Define eye UV regions in enemy metadata
- Periodically darken/close eyes using time-based interpolation
- Requires enemy art to have consistent eye placement

**Estimated Effort**: Medium-Large (shader work + per-enemy tuning)

---

## Phase 2: Color Extraction System Fixes

### 2.1 Fix Color Detection (Purple from Orange/Grey)

**Current Issue**: Extraction zones are predefined with random colors, not derived from actual image.

**Root Cause** (from `extraction.js`):
```javascript
setupRoomZones(roomData) {
    // Currently assigns DEFAULT colors, not image-sampled colors
    const defaultColors = ['crimson', 'azure', 'verdant', 'amber', 'violet', 'ivory'];
}
```

**Solution**: Sample actual pixel colors from room texture.

**Implementation**:
- **File**: `game/js/systems/extraction.js`
  - Load room texture into canvas for pixel sampling
  - Sample dominant colors from extraction zone regions
  - Map sampled RGB to nearest game color type:
    ```javascript
    function mapRGBToColorType(r, g, b) {
        // Dominant channel analysis
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = (max - min) / max;

        // Low saturation = grey → Ivory (light) or no extraction
        if (saturation < 0.2) {
            return b > 180 ? 'ivory' : null; // Grey = no color
        }

        // Hue-based mapping
        // Red/Orange → Crimson (0-30°) or Amber (30-60°)
        // Yellow → Amber (60-90°)
        // Green → Verdant (90-150°)
        // Cyan/Blue → Azure (150-240°)
        // Purple/Magenta → Violet (240-330°)
        // Back to Red → Crimson
    }
    ```

- **File**: `game/js/logic/data.js`
  - Add optional `color_zones` override per room for manual control

**Estimated Effort**: Medium (image sampling + color mapping algorithm)

---

### 2.2 Extraction Probability Display on Hover

**Current State**: No feedback on extraction success chance or color probabilities.

**Desired State**: Hovering over extractable area shows tooltip with:
- Dominant color(s) in that zone
- % chance to extract each color
- % chance of extraction failure

**Implementation**:
- **File**: `game/js/systems/extraction.js`
  - Add `getZoneProbabilities(zoneIndex)` method
  - Track zone color composition (sampled from image)

- **File**: `game/js/ui/extraction-tooltip.js` (NEW)
  - Create floating tooltip UI component
  - Show on hover, hide on mouse leave
  - Position near cursor

**Tooltip Design**:
```
┌─────────────────────────┐
│ EXTRACTION CHANCE       │
├─────────────────────────┤
│ ● Crimson    45%        │
│ ● Amber      35%        │
│ ● No Extract 20%        │
├─────────────────────────┤
│ Zone Intensity: ████░░  │
│ (depletes with use)     │
└─────────────────────────┘
```

**Probability Factors**:
- Base success rate (70% → 90% with levels)
- Zone intensity (depletes after extractions)
- Color composition of zone
- Player extraction skill bonuses

**Estimated Effort**: Medium (new UI component + probability system)

---

## Phase 3: Painter's Palette UI with Particle Life

### 3.1 Palette Visual Design

**Concept**: Replace the current horizontal color slots with a painter's palette shape.

**Visual Layout**:
```
         ╭──────────────────────────────╮
        ╱                                ╲
       │   ●Crim    ●Azur    ●Verd       │
       │                                  │
       │        ●Ambr    ●Viol           │
       │                                  │
       │             ●Ivor               │
       │                                  │
       ╰──○─────────────────────────────╯
           ↑ thumb hole
```

**Implementation**:
- **File**: `game/js/ui/color-palette.js` (NEW - replaces color-inventory.js)
  - Canvas-based rendering for organic shape
  - SVG or image background for palette texture
  - Color "wells" positioned on palette surface

- **File**: `game/css/style.css`
  - Position palette in bottom-left corner
  - Angled rotation for natural painter feel
  - Subtle paper/wood texture

**Estimated Effort**: Medium (new UI component with canvas)

---

### 3.2 Particle Life Visualization

**Concept**: Extracted colors appear as living particles that interact within their palette wells.

**Particle Life Rules** (simplified):
- Particles of same color attract each other
- Particles gently repel from well edges
- More particles = more active movement
- Visual representation of stored color amount

**Implementation**:
- **File**: `game/js/ui/particle-life.js` (NEW)
  ```javascript
  class ParticleLifeSystem {
      constructor(canvas) {
          this.particles = {}; // Keyed by color type
          this.wells = {}; // Circular boundaries per color
      }

      addParticles(colorType, count) {
          // Spawn particles at well center
          // Each particle has: x, y, vx, vy, color
      }

      update() {
          for (const [color, particles] of Object.entries(this.particles)) {
              for (const p of particles) {
                  // Apply attraction to same-color neighbors
                  // Apply repulsion from well boundary
                  // Apply damping
                  // Update position
              }
          }
      }

      render() {
          // Draw each particle as small colored circle
          // Glow effect for magical appearance
      }
  }
  ```

**Visual Effect**:
- Small glowing dots (~3-5px) clustered in wells
- Organic swirling movement
- Brightness increases with particle count
- Subtle trails for motion blur

**Estimated Effort**: Large (custom physics simulation + rendering)

---

## Phase 4: Chromancer Weapon Design

### 4.1 Staff-Brush Weapon Concept

**Lore Integration** (from STORY-BIBLE.md):
> You can *extract* the essence of color and wield it as magic.
> You are a **Chromancer**—one who can extract color without being absorbed by it.

**Weapon Design - "The Chromatic Stylus"**:

```
    ╭──╮ ← Crystal tip (glows with selected color)
    │◇ │
    ├──┤ ← Metal ferrule (holds crystal)
    │▓▓│
    │▓▓│ ← Wooden shaft (paint-stained)
    │▓▓│   with absorbed color swirls
    │▓▓│
    ├──┤ ← Grip section (worn leather)
    │░░│
    │░░│
    ╰══╯ ← Brush tip (horse hair, for extraction)
```

**Design Elements**:
- **Crystal Tip**: Changes color based on selected spell
- **Staff Body**: Aged wood with visible color stains from past extractions
- **Brush End**: For extracting color (dual-purpose tool)
- **Runes**: Faint chromatic runes along shaft

**Art Asset Requirements**:
- Static weapon image for UI/inventory (256x512)
- Simplified version for combat animation origin point
- Color variants for crystal glow

**Implementation**:
- **File**: `game/assets/weapons/chromatic-stylus.png` (NEW)
- **File**: `game/js/three/weapon-sprite.js` (NEW)
  - Render weapon at bottom-center of screen
  - Crystal glows with selected color
  - Subtle idle animation (gentle sway)
  - Attack animation (thrust forward, particles emit from tip)

**Estimated Effort**: Medium (art asset + sprite implementation)

---

## Phase 5: Combat Visual Overhaul

### 5.1 Player Attack - Particle Stream

**Concept**: Firing stream of colored particles from weapon to enemy.

**Visual Flow**:
```
[PLAYER]  ════●●●●●●●●═══>  [ENEMY]
 Weapon         Stream         Impact
```

**Particle Behavior**:
- Emit from weapon crystal tip
- Travel in arc toward enemy
- "Bubble" appearance: colored border, transparent center
- On impact: splash effect, color drains from enemy

**Implementation**:
- **File**: `game/js/three/particle-system.js`
  - New spell type: `colorStream`
  - Particle properties:
    ```javascript
    colorStream: {
        count: 30,
        color: 'dynamic', // Based on selected color
        lifetime: 0.8,
        spread: 0.1,
        speed: 8,
        trailEnabled: true,
        bubbleMode: true, // NEW: hollow center rendering
        arcHeight: 0.5,   // NEW: arc trajectory
    }
    ```

- **Bubble Shader**:
  ```glsl
  // Fragment shader for bubble particles
  float dist = length(gl_PointCoord - vec2(0.5));
  float ring = smoothstep(0.35, 0.4, dist) - smoothstep(0.45, 0.5, dist);
  float alpha = ring * particleLife;
  gl_FragColor = vec4(particleColor, alpha);
  ```

**Estimated Effort**: Medium (shader modification + trajectory system)

---

### 5.2 Enemy Color Drain Effect

**Concept**: When particles hit enemy, color visibly drains from them.

**Implementation**:
- **File**: `game/js/three/enemy-sprite.js`
  - Add `colorDrain` uniform to shader
  - On hit, increment drain value
  - Shader desaturates sprite based on drain amount
  - Drain resets on new enemy or after recovery time

**Shader Effect**:
```glsl
uniform float colorDrain; // 0.0 = full color, 1.0 = grayscale

void main() {
    vec4 texColor = texture2D(map, vUv);
    float gray = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    vec3 drained = mix(texColor.rgb, vec3(gray), colorDrain);
    gl_FragColor = vec4(drained, texColor.a);
}
```

**Animation**: Drain spreads from impact point outward (radial gradient).

**Estimated Effort**: Medium (shader work + impact detection)

---

### 5.3 Color Weaknesses & Strengths (Pokemon-Style)

**System Design**:

| Attacking | Strong Against | Weak Against |
|-----------|---------------|--------------|
| Crimson (Fire) | Verdant (Nature) | Azure (Ice) |
| Azure (Ice) | Crimson (Fire) | Amber (Lightning) |
| Verdant (Nature) | Azure (Ice) | Crimson (Fire) |
| Amber (Lightning) | Azure (Ice) | Verdant (Nature) |
| Violet (Arcane) | Ivory (Light) | None |
| Ivory (Light) | Violet (Arcane) | None |

**Damage Modifiers**:
- Strong: 1.5x damage
- Weak: 0.5x damage
- Neutral: 1.0x damage

**Enemy Color Types**:
- Each enemy assigned a color affinity in data.js
- Displayed in enemy info panel
- Affects which colors deal bonus/reduced damage

**Implementation**:
- **File**: `game/js/systems/color-system.js`
  - Add `COLOR_MATCHUPS` constant
  - `getEffectiveness(attackColor, defenseColor)` method

- **File**: `game/js/logic/combat.js`
  - Apply effectiveness multiplier to color spell damage
  - Show "Super Effective!" or "Not Very Effective..." messages

- **File**: `game/js/logic/data.js`
  - Add `colorAffinity` to enemy definitions

**UI Feedback**:
- Green flash + "Super Effective!" for strong
- Gray flash + "Not Very Effective..." for weak

**Estimated Effort**: Medium (new system + UI integration)

---

### 5.4 Enemy Attacks - Solid Particles

**Concept**: Enemies fire solid-colored particles at player.

**Visual**:
```
[ENEMY]  ════████████═══>  [PLAYER]
              Solid           Screen
             Particles        Shake
```

**Implementation**:
- **File**: `game/js/three/particle-system.js`
  - New spell type: `enemyAttack`
  - Solid particles (no hollow center)
  - Travel from enemy position toward camera
  - Impact triggers screen shake + red vignette flash

**Particle Properties**:
```javascript
enemyAttack: {
    count: 15,
    color: 'enemyColor', // Based on enemy affinity
    lifetime: 0.6,
    spread: 0.3,
    speed: 6,
    solidMode: true, // Fully opaque particles
}
```

**Estimated Effort**: Small (variant of existing particle system)

---

## Phase 6: Inventory & Equipment UI

### 6.1 Inventory Panel Design

**Narrative Fit**: The inventory represents your "Artist's Satchel" - a bag of collected artifacts and tools.

**Panel Layout**:
```
╔══════════════════════════════════════════════════╗
║  📦 ARTIST'S SATCHEL                    [X]     ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  EQUIPPED                      INVENTORY         ║
║  ┌─────┐ ┌─────┐              ┌───┬───┬───┬───┐ ║
║  │Helm │ │Weap │              │ 1 │ 2 │ 3 │ 4 │ ║
║  └─────┘ └─────┘              ├───┼───┼───┼───┤ ║
║  ┌─────┐ ┌─────┐              │ 5 │ 6 │ 7 │ 8 │ ║
║  │Armor│ │Hands│              └───┴───┴───┴───┘ ║
║  └─────┘ └─────┘                                 ║
║  ┌─────┐ ┌─────┐              GOLD: 150         ║
║  │Ring │ │Amlut│                                 ║
║  └─────┘ └─────┘                                 ║
║                                                  ║
╠══════════════════════════════════════════════════╣
║  [ITEM NAME]                                     ║
║  Rarity: Uncommon                                ║
║  +3 Strength, +2 Defense                         ║
║  Set: Crypt Guardian (0/4)                       ║
║  ───────────────────────                         ║
║  [EQUIP] [DISMANTLE] [DISCARD]                   ║
╚══════════════════════════════════════════════════╝
```

**Implementation**:
- **File**: `game/js/ui/inventory-panel.js` (NEW)
  - Modal overlay panel
  - Drag-drop or click-to-equip functionality
  - Item tooltip on hover
  - Action buttons per item

- **File**: `game/css/style.css`
  - Inventory panel styling
  - Item rarity color borders (common→legendary)
  - Set bonus highlighting

**Open Trigger**: Button in HUD or keyboard shortcut (I key)

**Estimated Effort**: Large (full UI panel implementation)

---

### 6.2 Stat Boosts Integration

**Current Stats** (from BASE_STATS in main.js):
- Strength: Physical damage
- Wisdom: Magic damage, arcane bolt
- Defense: Damage reduction
- Vitality: Max HP
- Speed: Turn order, flee chance
- Luck: Crit chance, loot quality
- Faith: Healing power
- Toxicity: Status effect resistance

**Stat Display in Inventory**:
```
BASE STATS          TOTAL (with equipment)
STR: 10             STR: 14 (+4)
WIS: 10             WIS: 12 (+2)
DEF: 5              DEF: 9  (+4)
VIT: 50             VIT: 60 (+10)
SPD: 5              SPD: 7  (+2)
LCK: 3              LCK: 5  (+2)
FAI: 10             FAI: 10 (+0)
TOX: 0              TOX: 3  (+3)
```

**Bonus Sources**:
1. Equipment stats
2. Set bonuses (2-piece, 4-piece)
3. Permanent bonuses (from dismantling)
4. Consumable buffs (temporary)

**Implementation**:
- **File**: `game/js/ui/inventory-panel.js`
  - Stats section showing base vs. total
  - Highlight bonuses in green

- **File**: `game/js/logic/inventory.js`
  - Already has `getEquippedStats()` - ensure it aggregates correctly

**Estimated Effort**: Small (UI display of existing data)

---

## Phase 7: Implementation Order

### Sprint 1: Core Visual Fixes (1-2 days)
1. ☐ Remove 3D camera controls
2. ☐ Fix color extraction detection
3. ☐ Enemy blending with greyed room

### Sprint 2: Combat Visuals (2-3 days)
4. ☐ Player attack particle stream (bubble particles)
5. ☐ Enemy color drain effect
6. ☐ Enemy solid particle attacks
7. ☐ Color weakness/strength system

### Sprint 3: UI Overhaul (3-4 days)
8. ☐ Painter's palette UI
9. ☐ Particle life visualization
10. ☐ Extraction probability tooltip
11. ☐ Inventory panel

### Sprint 4: Polish & Animation (2-3 days)
12. ☐ Chromancer weapon design & implementation
13. ☐ Enemy idle animations (shader-based)
14. ☐ Final integration testing

---

## Questions for Clarification

1. **Enemy Color Affinity**: Should each enemy have one fixed color, or can they have multiple?

2. **Particle Life Complexity**: How many particles per color well? (More = better visual, worse performance)

3. **Inventory Access**: Should inventory be accessible during combat or only outside?

4. **Weapon Visibility**: Should the weapon always be visible on screen, or only during attacks?

5. **Color Mixing in Combat**: Can players combine colors mid-combat, or must they pre-select?

---

## Technical Risks

1. **Particle Life Performance**: 6 wells × N particles = potential frame drops on low-end devices
   - Mitigation: Cap at 20-30 particles per well, use instanced rendering

2. **Image Color Sampling**: CORS issues loading textures into canvas
   - Mitigation: Ensure same-origin, or pre-compute color data

3. **Shader Complexity**: Multiple custom shaders may conflict
   - Mitigation: Unified shader system with feature flags

---

## Asset Requirements

### Art Assets Needed
- [ ] Painter's palette background (512x512)
- [ ] Chromatic Stylus weapon (256x512)
- [ ] Inventory panel background/frame
- [ ] Item rarity border decorations (5 variants)
- [ ] Eye/mouth regions defined for enemy animation (metadata)

### Sound Effects (Optional Future)
- Color extraction "woosh"
- Particle stream "firing"
- Impact "splash"
- Super effective "ding"
- Not effective "thud"

---

*End of Implementation Plan*
