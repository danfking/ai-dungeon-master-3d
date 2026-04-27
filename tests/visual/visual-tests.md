# Visual Regression Tests

## Purpose
Capture baseline screenshots and compare against them to detect visual regressions.

## Baseline Screenshots to Capture

### Core Screens
1. `baseline-init.png` - Initial game load, crypt entrance
2. `baseline-combat.png` - During combat with enemy visible
3. `baseline-extraction.png` - Hovering with extraction tooltip visible
4. `baseline-inventory.png` - Inventory panel open
5. `baseline-combat-victory.png` - Room reveal animation complete

### UI States
1. `ui-hover-forward.png` - Forward button hover state
2. `ui-color-selected.png` - Color slot selected state
3. `ui-tooltip-crimson.png` - Crimson color tooltip
4. `ui-tooltip-azure.png` - Azure color tooltip

### Combat States
1. `combat-player-attack.png` - During player attack animation
2. `combat-enemy-attack.png` - During enemy attack animation
3. `combat-critical.png` - Critical hit effect
4. `combat-defeat.png` - Enemy death animation

## Capture Protocol

### Using Playwright MCP

```javascript
// Capture baseline screenshot
await page.goto('http://localhost:8081');
await page.waitForTimeout(2000); // Wait for animations
await page.screenshot({ path: 'tests/visual/baselines/baseline-init.png' });

// Capture combat state
await page.click('button:has-text("Forward")');
await page.waitForTimeout(1000);
await page.screenshot({ path: 'tests/visual/baselines/baseline-combat.png' });

// Capture extraction tooltip
await page.goto('http://localhost:8081');
const canvas = await page.$('#game-canvas');
const box = await canvas.boundingBox();
await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.8);
await page.waitForTimeout(200);
await page.screenshot({ path: 'tests/visual/baselines/baseline-extraction.png' });
```

## Comparison Strategy

### Manual Comparison (Art Director Review)
1. Capture current state screenshot
2. Place side-by-side with baseline
3. Note any differences
4. Categorize as: Regression / Intentional Change / Acceptable Variance

### Automated Checks
While pixel-perfect comparison is unreliable for games, check for:
- Screenshot is not blank/black
- Key UI elements are visible (color sampling specific regions)
- No obvious rendering failures

### Regions to Sample

```javascript
// Check specific regions for expected content
const regions = [
  { name: 'room-background', x: 0.5, y: 0.3, expectedNotBlack: true },
  { name: 'navigation-panel', x: 0.9, y: 0.1, expectedNotBlack: true },
  { name: 'color-inventory', x: 0.5, y: 0.6, expectedNotBlack: true },
  { name: 'player-stats', x: 0.1, y: 0.9, expectedNotBlack: true }
];

// Sample each region and verify content exists
for (const region of regions) {
  const pixel = await page.evaluate(({x, y}) => {
    const canvas = document.querySelector('#game-canvas');
    // Get pixel color at position
    // Return true if not pure black
  }, { x: region.x, y: region.y });
}
```

## Visual Test Report Format

```markdown
# Visual Test Report - [Date]

## Screenshots Captured
| Name | Status | Notes |
|------|--------|-------|
| baseline-init | CAPTURED | Room visible, UI loaded |
| baseline-combat | CAPTURED | Enemy visible, desaturated bg |
| ... | ... | ... |

## Comparison Results
| Baseline | Current | Status | Diff |
|----------|---------|--------|------|
| init | init-current | MATCH | - |
| combat | combat-current | DIFF | Enemy position changed |
| ... | ... | ... | ... |

## Visual Issues Detected
- [List any regressions found]

## Art Director Notes
- [Any aesthetic feedback]
```

## Regression Categories

### Acceptable Variance
- Slight particle position differences (random)
- Minor anti-aliasing differences
- Animation timing variations

### Investigate
- Color shifts
- Element position changes
- Missing UI elements
- New visual artifacts

### Definite Regression
- UI element completely missing
- Black/broken rendering
- Text not displaying
- Severe color corruption
