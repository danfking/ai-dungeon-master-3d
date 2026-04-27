# Chromatic Resonance Test Suite

## Overview

This test suite provides automated testing for Chromatic Resonance using Claude Code with Playwright MCP. Tests are organized into three categories:

- **E2E Tests**: Functional testing of game features
- **Visual Tests**: Screenshot-based regression testing
- **Performance Tests**: FPS, memory, and load time monitoring

## Quick Start

### Prerequisites
1. Game dev server running:
   ```bash
   cd game && npx http-server . -p 8081 -c-1
   ```

2. Claude Code with Playwright MCP available

### Run Smoke Test
Ask Claude Code to run a quick verification:
```
Run a smoke test for Chromatic Resonance:
1. Navigate to http://localhost:8081
2. Verify game loads without errors
3. Test extraction hover works in 8+ positions
4. Take a screenshot
```

### Run Full Test Suite
```
Run the full E2E test suite for Chromatic Resonance following tests/e2e/test-cases.json
```

## Test Structure

```
tests/
├── README.md              # This file
├── e2e/
│   ├── test-cases.json    # Test definitions
│   └── run-tests.md       # Execution instructions
├── visual/
│   ├── visual-tests.md    # Visual regression protocol
│   └── baselines/         # Baseline screenshots (gitignored)
└── performance/
    └── perf-tests.md      # Performance test protocol
```

## Agent Configuration

Test agents are defined in `.agents/`:

### QA Agent (`.agents/qa/AGENT.md`)
- Runs E2E functional tests
- Reports bugs with severity levels
- Generates test reports

### Art Director Agent (`.agents/art-director/AGENT.md`)
- Reviews visual aesthetics
- Checks watercolor style consistency
- Reports visual issues

## Test Categories

### E2E Tests

| Suite | Tests | Description |
|-------|-------|-------------|
| initialization | 3 | Game loads, systems init, HUD visible |
| extraction | 3 | Zones cover screen, tooltip works, colors vary |
| combat | 3 | Combat starts, attack works, visuals change |
| navigation | 2 | Forward/back buttons work |
| ui | 3 | Inventory opens, buttons clickable |

### Visual Tests
- Baseline screenshots for key game states
- Comparison protocol for detecting regressions
- Art Director review checklist

### Performance Tests
- Frame rate monitoring (target: 60 FPS)
- Memory leak detection
- Load time measurement

## Running Tests

### Via Claude Code

**Smoke Test:**
```
@claude Run smoke test for Chromatic Resonance
```

**Full E2E Suite:**
```
@claude Run all E2E tests for Chromatic Resonance and generate report
```

**Visual Review:**
```
@claude Capture visual baselines for Chromatic Resonance
```

**Performance Check:**
```
@claude Run performance tests for Chromatic Resonance
```

### Test Commands Reference

```javascript
// Navigate to game
await page.goto('http://localhost:8081');

// Wait for load
await page.waitForSelector('#game-canvas');

// Check console for errors
const messages = await page.evaluate(() => window.__consoleErrors || []);

// Test extraction coverage
await page.mouse.move(x, y);
const crosshairVisible = await page.evaluate(() =>
  document.querySelector('.extraction-crosshair')?.classList.contains('visible')
);

// Click button
await page.click('button:has-text("Forward")');

// Take screenshot
await page.screenshot({ path: 'test-screenshot.png' });
```

## Continuous Integration

For automated testing on each commit:

1. Start dev server in background
2. Run smoke test suite
3. Capture baseline screenshots
4. Compare with previous baselines
5. Generate test report
6. Fail build if critical tests fail

## Adding New Tests

### E2E Test
Add to `tests/e2e/test-cases.json`:
```json
{
  "id": "new-001",
  "name": "New test name",
  "steps": [
    { "action": "navigate", "url": "/" },
    { "action": "...", "..." }
  ],
  "expected": "Description of expected outcome"
}
```

### Visual Baseline
Add to `tests/visual/visual-tests.md` and capture:
```javascript
await page.screenshot({ path: 'tests/visual/baselines/new-baseline.png' });
```

## Reporting Issues

When tests find issues, report with:

1. **Test ID** that failed
2. **Expected** vs **Actual** behavior
3. **Screenshot** if visual
4. **Console errors** if present
5. **Severity** level (Critical/High/Medium/Low)
6. **Reproduction** steps

## Test Maintenance

### Weekly
- Review and update test cases
- Check for flaky tests
- Update baselines for intentional changes

### After Major Changes
- Run full test suite
- Update visual baselines
- Review performance metrics
