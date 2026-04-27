# E2E Test Runner Instructions

This document provides instructions for running automated E2E tests using Claude Code with Playwright MCP.

## Prerequisites

1. Dev server running: `cd game && npx http-server . -p 8081 -c-1`
2. Playwright MCP tools available

## Running Tests

### Quick Smoke Test

Run this to verify basic functionality:

```
Use Playwright MCP to:
1. Navigate to http://localhost:8081
2. Wait for "AI Dungeon Master 3D initialized" in console logs
3. Check that #game-canvas is visible
4. Verify no console errors (excluding favicon)
5. Take a screenshot
```

### Full Test Suite

For comprehensive testing, run each test suite:

#### 1. Initialization Tests
```javascript
// Test: Game loads without errors
await page.goto('http://localhost:8081');
await page.waitForSelector('#game-canvas');
const errors = await page.evaluate(() => window.__consoleErrors || []);
assert(errors.filter(e => !e.includes('favicon')).length === 0);
```

#### 2. Extraction Coverage Test
```javascript
// Test: Extraction works across screen
const canvas = await page.$('#game-canvas');
const box = await canvas.boundingBox();

const testPoints = [
  { xPct: 0.1, yPct: 0.1 }, { xPct: 0.5, yPct: 0.1 }, { xPct: 0.9, yPct: 0.1 },
  { xPct: 0.1, yPct: 0.5 }, { xPct: 0.5, yPct: 0.5 }, { xPct: 0.9, yPct: 0.5 },
  { xPct: 0.1, yPct: 0.8 }, { xPct: 0.5, yPct: 0.8 }, { xPct: 0.9, yPct: 0.8 }
];

let successCount = 0;
for (const pt of testPoints) {
  await page.mouse.move(box.x + box.width * pt.xPct, box.y + box.height * pt.yPct);
  await page.waitForTimeout(100);
  const visible = await page.evaluate(() =>
    document.querySelector('.extraction-crosshair')?.classList.contains('visible')
  );
  if (visible) successCount++;
}

assert(successCount >= 7, `Expected 7+ positions, got ${successCount}`);
```

#### 3. Combat Flow Test
```javascript
// Test: Combat initiates and attack works
await page.goto('http://localhost:8081');
await page.waitForTimeout(1000);
await page.click('button:has-text("Forward")');
await page.waitForTimeout(1000);

// Check combat started
const attackEnabled = await page.evaluate(() =>
  !document.querySelector('button:has-text("Attack")')?.disabled
);
assert(attackEnabled, 'Attack button should be enabled in combat');

// Perform attack
await page.click('button:has-text("Attack")');
await page.waitForTimeout(500);
```

#### 4. UI Interaction Test
```javascript
// Test: Buttons work with pointer-events pass-through
await page.goto('http://localhost:8081');

// Check Forward button works
const forwardBtn = await page.$('button:has-text("Forward")');
const isClickable = await forwardBtn.isEnabled();
assert(isClickable, 'Forward button should be clickable');

await forwardBtn.click();
// Should navigate or start combat
```

## Test Report Format

After running tests, generate a report:

```markdown
## E2E Test Report - [Date]

### Summary
- Total Tests: X
- Passed: X
- Failed: X
- Skipped: X

### Results

| Test ID | Name | Status | Notes |
|---------|------|--------|-------|
| init-001 | Game loads without errors | PASS | |
| extract-001 | Extraction coverage | PASS | 8/9 positions |
| ... | ... | ... | ... |

### Screenshots
- [Link to screenshots]

### Console Errors
- [List any errors found]

### Recommendations
- [Any issues to address]
```

## Automated Agent Execution

To run tests via QA agent:

```
@qa-agent Run the E2E test suite for Chromatic Resonance:
1. Start by running initialization tests
2. Then run extraction coverage test
3. Run combat flow test
4. Run UI interaction tests
5. Generate test report with screenshots
```
