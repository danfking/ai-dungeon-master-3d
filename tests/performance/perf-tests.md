# Performance Tests

## Metrics to Track

### Frame Rate
- **Target**: 60 FPS minimum
- **Acceptable**: 30 FPS minimum
- **Critical**: Below 30 FPS

### Memory Usage
- **Target**: < 200MB heap
- **Warning**: > 300MB heap
- **Critical**: > 500MB or continuous growth

### Load Time
- **Target**: < 3 seconds to interactive
- **Acceptable**: < 5 seconds
- **Critical**: > 10 seconds

## Performance Test Protocol

### 1. Initial Load Performance

```javascript
// Measure load time
const startTime = Date.now();
await page.goto('http://localhost:8081');
await page.waitForFunction(() =>
  document.querySelector('#loading-screen')?.style.display === 'none'
);
const loadTime = Date.now() - startTime;
console.log(`Load time: ${loadTime}ms`);
```

### 2. Frame Rate Measurement

```javascript
// Measure FPS over 5 seconds
const fps = await page.evaluate(() => {
  return new Promise(resolve => {
    let frameCount = 0;
    const startTime = performance.now();

    function countFrame() {
      frameCount++;
      if (performance.now() - startTime < 5000) {
        requestAnimationFrame(countFrame);
      } else {
        resolve(frameCount / 5);
      }
    }
    requestAnimationFrame(countFrame);
  });
});
console.log(`Average FPS: ${fps.toFixed(1)}`);
```

### 3. Memory Monitoring

```javascript
// Check memory usage (Chrome only)
const memory = await page.evaluate(() => {
  if (performance.memory) {
    return {
      usedHeap: (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
      totalHeap: (performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)
    };
  }
  return null;
});
if (memory) {
  console.log(`Memory: ${memory.usedHeap}MB / ${memory.totalHeap}MB`);
}
```

### 4. Stress Tests

#### Particle System Stress
```javascript
// Trigger many particle effects rapidly
await page.goto('http://localhost:8081');
await page.click('button:has-text("Forward")');
await page.waitForTimeout(500);

// Rapid attacks to stress particle system
for (let i = 0; i < 10; i++) {
  await page.click('button:has-text("Attack")');
  await page.waitForTimeout(100);
}

// Measure FPS after stress
const fpsAfterStress = await measureFPS(page);
```

#### Memory Leak Check
```javascript
// Navigate through rooms multiple times
const memorySnapshots = [];

for (let i = 0; i < 5; i++) {
  await page.goto('http://localhost:8081');
  await page.waitForTimeout(1000);

  memorySnapshots.push(await getMemoryUsage(page));

  // Navigate forward and back
  await page.click('button:has-text("Forward")');
  await page.waitForTimeout(1000);
  await page.click('button:has-text("Back")');
  await page.waitForTimeout(1000);
}

// Check for memory growth
const growth = memorySnapshots[4] - memorySnapshots[0];
if (growth > 50) {
  console.warn(`Potential memory leak: ${growth}MB growth`);
}
```

## Performance Test Report Format

```markdown
# Performance Test Report - [Date]

## Environment
- Browser: Chrome [version]
- Resolution: [width]x[height]
- Device: [specs if relevant]

## Results

### Load Time
| Metric | Value | Status |
|--------|-------|--------|
| Time to interactive | Xms | PASS/FAIL |
| Total load time | Xms | PASS/FAIL |

### Frame Rate
| Scenario | FPS | Status |
|----------|-----|--------|
| Idle | XX | PASS/FAIL |
| Combat | XX | PASS/FAIL |
| Particles active | XX | PASS/FAIL |
| Stress test | XX | PASS/FAIL |

### Memory
| Metric | Value | Status |
|--------|-------|--------|
| Initial heap | XXMB | PASS/FAIL |
| After 5min | XXMB | PASS/FAIL |
| Growth | XXMB | PASS/FAIL |

## Issues Found
- [List any performance issues]

## Recommendations
- [Optimization suggestions]
```

## Performance Budgets

### Per-Frame Budget (16.6ms for 60fps)
- Render: < 8ms
- Game logic: < 4ms
- UI updates: < 2ms
- Buffer: 2.6ms

### Asset Budgets
- Room texture: < 2MB
- Enemy sprite: < 500KB
- Total textures: < 20MB
- JS bundle: < 500KB

## Automated Performance Monitoring

Add to game code for continuous monitoring:

```javascript
// Performance monitor (dev mode only)
if (window.location.hostname === 'localhost') {
  let frameCount = 0;
  let lastTime = performance.now();

  function updatePerfStats() {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      console.log(`FPS: ${frameCount}`);
      frameCount = 0;
      lastTime = now;
    }
    requestAnimationFrame(updatePerfStats);
  }
  updatePerfStats();
}
```
