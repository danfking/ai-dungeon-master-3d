# The Chromancer's Focus - Weapon Design Document

## Overview

The **Chromancer's Focus** is the signature weapon of the player character - a hybrid between a painter's brush and a mage's staff. It is the tool through which extracted color essence is channeled into devastating magical attacks.

---

## The Weapon: "Prism's Edge"

### Lore Description

```
When you fell into the Painted Realm, you carried nothing but your brush.
But the brush *changed*. It drank the ambient color, grew, solidified.
The wooden handle became a staff of petrified pigment. The bristles
crystallized into prisms that split light into its component spectrums.

This is no longer a tool for painting canvas.
This is the Chromancer's Focus - a weapon for painting reality.
```

### Visual Design

**Overall Shape**: A staff approximately 4-5 feet tall, elegant but clearly functional as both art tool and weapon.

**Components**:

1. **The Shaft (Staff Body)**
   - Made of "Crystallized Pigment" - wood that has absorbed so much color it became semi-translucent
   - Surface has visible layers of color, like geological strata or a painter's palette
   - Colors shift subtly based on equipped color essence
   - Faint brushstroke texture visible in the material
   - Spiraling grooves run along the length, channeling color energy

2. **The Crown (Brush Head)**
   - Where bristles would be, there is now a cluster of **Prism Crystals**
   - 5-7 crystal "bristles" of varying lengths, arranged like a brush tip
   - Each crystal catches and refracts light differently
   - When casting, the appropriate color crystal glows brightest
   - Crystals are slightly translucent, showing inner light

3. **The Reservoir (Mid-Section)**
   - A bulbous section near the grip containing swirling liquid color
   - Like a glass bulb filled with watercolor pigment
   - Shows the currently "loaded" color essence
   - Colors flow and mix within like lava lamp effect
   - Six small color wells around the reservoir for quick-access

4. **The Grip**
   - Wrapped in canvas-textured leather
   - Stained with countless colors from use
   - Comfortable and worn, clearly well-used
   - Small paint splatters frozen in the leather

5. **The Ferrule (Bottom Cap)**
   - Metal cap with dried paint drops frozen in metal
   - Can be used for melee strikes
   - Small drain hole for releasing excess color

---

## Art Pipeline Specifications

### Primary Asset: Weapon Sprite

```
Prompt for ComfyUI/SDXL:
"watercolor painting of a magical staff-paintbrush hybrid weapon,
crystal brush tips that glow with prismatic light,
wooden staff made of crystallized colorful pigment with visible layers,
glass reservoir bulb containing swirling liquid colors in the middle,
canvas-wrapped handle stained with paint,
fantasy RPG weapon, vertical composition,
watercolor style, soft edges, paper texture visible,
transparent background, high detail"

Negative prompt:
"photorealistic, 3D render, digital art, hard edges, modern"
```

### Size: 512x1024 (tall format for staff)

### Variants Needed:

1. **Base Staff** - Default appearance
2. **Crimson Charged** - Crystals glow red, reservoir shows crimson
3. **Azure Charged** - Crystals glow blue, reservoir shows azure
4. **Verdant Charged** - Crystals glow green, reservoir shows verdant
5. **Amber Charged** - Crystals glow gold, reservoir shows amber
6. **Violet Charged** - Crystals glow purple, reservoir shows violet
7. **Prismatic** - All crystals glow (used for mixed spells)

---

## Game Integration

### Item Definition

```javascript
{
    id: 'prisms-edge',
    name: "Prism's Edge",
    description: "Your brush, transformed. A conduit between artist and art, between color and chaos.",
    slot: 'weapon',
    rarity: 'legendary',
    unique: true, // Cannot be dropped or sold
    stats: {
        wisdom: 3,
        luck: 1
    },
    special: {
        colorDamageBonus: 0.15, // +15% damage with color spells
        extractionBonus: 0.05   // +5% extraction chance
    },
    lore: "The bristles remember every color they have touched."
}
```

### Visual Effects

When casting spells, the weapon should:
1. Have the appropriate crystal "bristle" glow brightly
2. Show color flowing from reservoir up through shaft to crystals
3. Emit particles of the spell's color from the brush tip
4. Leave brief "brushstroke" trails in the air

### Animation Notes

- **Idle**: Subtle shimmer in crystals, occasional color swirl in reservoir
- **Extraction**: Weapon points at target, colors stream INTO the reservoir
- **Attack**: Sweeping motion like painting a stroke, colors emit from tip
- **Healing**: Gentle wave, verdant/ivory droplets float upward

---

## Upgrade Path (Future)

As the player progresses through the five books, the weapon evolves:

| Stage | Name | Appearance Change |
|-------|------|-------------------|
| Book 1 | Prism's Edge | Base form, 5 crystal bristles |
| Book 2 | Twilight Brush | Crystals develop purple tint, reservoir larger |
| Book 3 | Ember Staff | Red accent lines appear, grip charred |
| Book 4 | Abyssal Focus | Dark core visible in crystals, deep colors |
| Book 5 | The Final Stroke | Pure white/prismatic, all colors visible |

---

## UI Representation

For the HUD and inventory:
- Show a simplified icon of the staff (crystal tip + shaft)
- When charged with a color, icon tints to match
- Subtle glow animation when spell is ready

**Icon Prompt**:
```
"simple watercolor icon of a crystal-tipped magical paintbrush staff,
glowing prismatic tip, colorful wooden shaft,
64x64 pixel icon style but watercolor aesthetic,
transparent background"
```

---

## Integration with Bubble Attacks

When the player fires bubble attacks, they originate from the staff:

1. Player raises staff (weapon sprite briefly visible)
2. Relevant crystal glows intensely
3. Bubble particles emit from the crystal tips
4. Each bubble carries a small trail back to the weapon

This reinforces that the weapon is the source of the Chromancer's power.

---

## Summary

The Chromancer's Focus ("Prism's Edge") is:
- A paintbrush that became a staff
- Made of crystallized pigment and prismatic crystals
- The visual anchor for all color-based abilities
- Upgradeable throughout the five-book arc
- A constant reminder of the player's artist origins

The weapon bridges the gap between "painter" and "mage", reinforcing the game's core theme: **You are an artist. Your canvas is reality. Your paint is pure magic.**
