// extraction.js - Handle color extraction from room environments

import * as THREE from 'three';
import sceneManager from '../three/scene-manager.js';
import roomRenderer from '../three/room-renderer.js';
import particleSystem from '../three/particle-system.js';

const ExtractionSystem = (() => {
    let isEnabled = true;
    let isExtracting = false;
    let extractionProgress = 0;
    let currentExtractionZone = null;
    let raycaster = null;
    let mouse = new THREE.Vector2();

    // Extraction zones in current room
    let extractionZones = [];

    // Visual elements
    let crosshair = null;
    let extractionIndicator = null;
    let probabilityTooltip = null;

    // Settings
    const EXTRACTION_TIME = 800; // ms to hold for extraction
    let extractionStartTime = 0;
    let extractionInterval = null;

    function init() {
        raycaster = new THREE.Raycaster();

        // Create crosshair element
        createCrosshair();

        // Add event listeners
        const canvas = document.getElementById('game-canvas');
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseleave', onMouseLeave);

        console.log('ExtractionSystem initialized');
    }

    function createCrosshair() {
        crosshair = document.createElement('div');
        crosshair.className = 'extraction-crosshair';
        document.body.appendChild(crosshair);

        // Create probability tooltip
        createProbabilityTooltip();
    }

    function createProbabilityTooltip() {
        probabilityTooltip = document.createElement('div');
        probabilityTooltip.className = 'extraction-tooltip';
        probabilityTooltip.innerHTML = `
            <div class="tooltip-header">
                <span class="tooltip-color-name"></span>
                <span class="tooltip-element"></span>
            </div>
            <div class="tooltip-probabilities">
                <div class="prob-row success">
                    <span class="prob-label">Extract:</span>
                    <span class="prob-value">0%</span>
                    <div class="prob-bar"><div class="prob-fill"></div></div>
                </div>
                <div class="prob-row fail">
                    <span class="prob-label">Fail:</span>
                    <span class="prob-value">0%</span>
                    <div class="prob-bar"><div class="prob-fill"></div></div>
                </div>
            </div>
            <div class="tooltip-yield">
                <span class="yield-label">Yield:</span>
                <span class="yield-value">1</span>
                <span class="yield-unit">particle(s)</span>
            </div>
            <div class="tooltip-cost">
                <span class="cost-free">FREE</span>
                <span class="cost-mana">2 MP</span>
            </div>
            <div class="tooltip-hint">Hold click to extract</div>
        `;
        document.body.appendChild(probabilityTooltip);
    }

    function updateTooltip(zone, screenX, screenY) {
        if (!probabilityTooltip || !zone) {
            if (probabilityTooltip) {
                probabilityTooltip.classList.remove('visible');
            }
            return;
        }

        const colorData = zone.colorData;
        const stats = ColorSystem.getExtractionStats();
        const state = GameEngine.getState();

        // Calculate probabilities
        const baseChance = stats.baseChance + stats.bonusChance;
        const successPercent = Math.round(baseChance * 100);
        const failPercent = 100 - successPercent;

        // Calculate yield
        let yield_amount = stats.baseYield + stats.bonusYield;
        yield_amount = Math.max(1, Math.floor(yield_amount * zone.intensity));

        // Check if free or costs mana
        const freeExtractionsUsed = getFreeExtractionsUsed();
        const isFree = freeExtractionsUsed < stats.freeExtractions;
        const hasMana = state.mana >= stats.manaCost;

        // Check storage
        const canStore = ColorSystem.canStore(zone.colorType);

        // Update tooltip content
        const header = probabilityTooltip.querySelector('.tooltip-header');
        const colorName = header.querySelector('.tooltip-color-name');
        const element = header.querySelector('.tooltip-element');

        colorName.textContent = colorData.name;
        colorName.style.color = colorData.hex;
        element.textContent = colorData.element;

        // Update probabilities
        const successRow = probabilityTooltip.querySelector('.prob-row.success');
        const failRow = probabilityTooltip.querySelector('.prob-row.fail');

        successRow.querySelector('.prob-value').textContent = `${successPercent}%`;
        successRow.querySelector('.prob-fill').style.width = `${successPercent}%`;
        successRow.querySelector('.prob-fill').style.backgroundColor = colorData.hex;

        failRow.querySelector('.prob-value').textContent = `${failPercent}%`;
        failRow.querySelector('.prob-fill').style.width = `${failPercent}%`;

        // Update yield
        const yieldValue = probabilityTooltip.querySelector('.yield-value');
        yieldValue.textContent = yield_amount;

        // Update cost
        const costFree = probabilityTooltip.querySelector('.cost-free');
        const costMana = probabilityTooltip.querySelector('.cost-mana');

        if (isFree) {
            costFree.classList.add('active');
            costMana.classList.remove('active');
        } else {
            costFree.classList.remove('active');
            costMana.classList.add('active');
            costMana.classList.toggle('insufficient', !hasMana);
        }

        // Update hint based on state
        const hint = probabilityTooltip.querySelector('.tooltip-hint');
        if (!canStore) {
            hint.textContent = 'Storage full!';
            hint.classList.add('warning');
        } else if (!isFree && !hasMana) {
            hint.textContent = 'Not enough mana!';
            hint.classList.add('warning');
        } else {
            hint.textContent = 'Hold click to extract';
            hint.classList.remove('warning');
        }

        // Position tooltip (offset from cursor)
        const tooltipWidth = 180;
        const tooltipHeight = 160;
        let tooltipX = screenX + 20;
        let tooltipY = screenY - tooltipHeight / 2;

        // Keep on screen
        if (tooltipX + tooltipWidth > window.innerWidth) {
            tooltipX = screenX - tooltipWidth - 20;
        }
        if (tooltipY < 10) {
            tooltipY = 10;
        }
        if (tooltipY + tooltipHeight > window.innerHeight - 10) {
            tooltipY = window.innerHeight - tooltipHeight - 10;
        }

        probabilityTooltip.style.left = `${tooltipX}px`;
        probabilityTooltip.style.top = `${tooltipY}px`;
        probabilityTooltip.classList.add('visible');
    }

    // Track free extractions used
    function getFreeExtractionsUsed() {
        return ColorSystem.getFreeExtractionsUsed();
    }

    function onMouseMove(event) {
        if (!isEnabled) return;

        // Update mouse position
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Update crosshair position
        crosshair.style.left = `${event.clientX}px`;
        crosshair.style.top = `${event.clientY}px`;

        // Check if hovering over extractable area
        const zone = getExtractionZoneAtMouse();
        if (zone) {
            crosshair.classList.add('visible');
            crosshair.style.borderColor = zone.colorData.hex;
            document.body.style.cursor = 'crosshair';

            // Show probability tooltip
            updateTooltip(zone, event.clientX, event.clientY);
        } else {
            crosshair.classList.remove('visible');
            document.body.style.cursor = 'default';

            // Hide tooltip
            updateTooltip(null);
        }
    }

    function onMouseDown(event) {
        if (!isEnabled || event.button !== 0) return;

        const zone = getExtractionZoneAtMouse();
        if (zone && !isExtracting) {
            startExtraction(zone, event.clientX, event.clientY);
        }
    }

    function onMouseUp(event) {
        if (isExtracting) {
            cancelExtraction();
        }
    }

    function onMouseLeave() {
        if (isExtracting) {
            cancelExtraction();
        }
        crosshair.classList.remove('visible');
        updateTooltip(null); // Hide tooltip
    }

    function startExtraction(zone, screenX, screenY) {
        isExtracting = true;
        currentExtractionZone = zone;
        extractionStartTime = Date.now();
        extractionProgress = 0;

        crosshair.classList.add('extracting');

        // Show extraction message
        HUD.showMessage(`Extracting ${zone.colorData.name}...`, 'system');

        // Start progress check
        extractionInterval = setInterval(() => {
            const elapsed = Date.now() - extractionStartTime;
            extractionProgress = Math.min(1, elapsed / EXTRACTION_TIME);

            // Update visual feedback
            crosshair.style.transform = `translate(-50%, -50%) scale(${1 + extractionProgress * 0.3})`;

            if (extractionProgress >= 1) {
                completeExtraction(screenX, screenY);
            }
        }, 50);
    }

    function completeExtraction(screenX, screenY) {
        if (!currentExtractionZone) return;

        clearInterval(extractionInterval);
        isExtracting = false;
        crosshair.classList.remove('extracting');
        crosshair.style.transform = 'translate(-50%, -50%) scale(1)';

        const zone = currentExtractionZone;
        const colorType = zone.colorType;

        // Attempt extraction through ColorSystem
        const result = ColorSystem.extractColor(colorType, zone.intensity);

        if (result.success) {
            // Play extraction particle effect
            playExtractionEffect(zone, screenX, screenY);

            // Reduce zone intensity (room fades)
            zone.intensity = Math.max(0.1, zone.intensity - 0.2);
            zone.extracted += result.amount;

            // Update room desaturation
            updateRoomDesaturation();

            // Animate particle to inventory
            ColorInventoryUI.showExtractionAnimation(colorType, { x: screenX, y: screenY });
        }

        currentExtractionZone = null;
    }

    function cancelExtraction() {
        if (extractionInterval) {
            clearInterval(extractionInterval);
        }
        isExtracting = false;
        extractionProgress = 0;
        currentExtractionZone = null;
        crosshair.classList.remove('extracting');
        crosshair.style.transform = 'translate(-50%, -50%) scale(1)';
    }

    function getExtractionZoneAtMouse() {
        if (!raycaster || extractionZones.length === 0) return null;

        const camera = sceneManager.getCamera();
        raycaster.setFromCamera(mouse, camera);

        // Check intersection with backdrop
        const backdrop = roomRenderer.backdrop;
        if (!backdrop) return null;

        const intersects = raycaster.intersectObject(backdrop);
        if (intersects.length === 0) return null;

        const hit = intersects[0];
        const uv = hit.uv;

        // Find which extraction zone this UV falls into
        for (const zone of extractionZones) {
            if (isPointInZone(uv, zone)) {
                return zone;
            }
        }

        return null;
    }

    function isPointInZone(uv, zone) {
        return uv.x >= zone.uvMin.x && uv.x <= zone.uvMax.x &&
               uv.y >= zone.uvMin.y && uv.y <= zone.uvMax.y;
    }

    function playExtractionEffect(zone, screenX, screenY) {
        // Create 3D particle effect at extraction point
        const camera = sceneManager.getCamera();
        raycaster.setFromCamera(mouse, camera);

        const backdrop = roomRenderer.backdrop;
        const intersects = raycaster.intersectObject(backdrop);

        if (intersects.length > 0) {
            const worldPos = intersects[0].point;

            // Emit colored particles from extraction point
            const colorData = zone.colorData;
            const color = new THREE.Color(colorData.hex);

            // Use particle system to emit extraction effect
            particleSystem.emitExtractionEffect(worldPos, color);
        }
    }

    function updateRoomDesaturation() {
        // Calculate total extraction from room
        let totalExtracted = 0;
        let maxExtractable = 0;

        for (const zone of extractionZones) {
            totalExtracted += zone.extracted;
            maxExtractable += zone.maxExtract;
        }

        const desaturation = totalExtracted / maxExtractable;

        // Update room renderer desaturation
        roomRenderer.setDesaturation(desaturation);
    }

    // Set up extraction zones for a room
    async function setupRoomZones(roomData) {
        extractionZones = [];

        // Try to sample colors from actual texture, fall back to defaults
        let colorMapping;
        if (roomData.colorZones) {
            // Use manually defined zones if available
            colorMapping = roomData.colorZones;
        } else {
            // Sample from texture (async)
            try {
                colorMapping = await sampleTextureColors(roomData);
            } catch (e) {
                console.warn('Texture sampling failed, using fallback:', e);
                colorMapping = getHardcodedFallbackZones();
            }
        }

        for (const zoneData of colorMapping) {
            const colorData = ColorSystem.getColorData(zoneData.colorType);
            if (!colorData) continue;

            extractionZones.push({
                colorType: zoneData.colorType,
                colorData: colorData,
                uvMin: { x: zoneData.uvMin[0], y: zoneData.uvMin[1] },
                uvMax: { x: zoneData.uvMax[0], y: zoneData.uvMax[1] },
                intensity: 1.0,
                maxExtract: zoneData.maxExtract || 3,
                extracted: 0,
                description: zoneData.description || '',
                sampledRGB: zoneData.sampledRGB || null
            });
        }

        console.log(`Set up ${extractionZones.length} extraction zones for room:`,
            extractionZones.map(z => z.colorType).join(', '));
    }

    // Map RGB color to nearest game color type
    function mapRGBToColorType(r, g, b) {
        // Calculate HSL-like values for better color mapping
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const lightness = (max + min) / 2 / 255;
        const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1)) / 255;

        // Very low saturation or very light = grey/white = no extractable color
        if (saturation < 0.15 || lightness > 0.85) {
            return lightness > 0.6 ? 'ivory' : null;
        }

        // Very dark = no extractable color
        if (lightness < 0.12) {
            return null;
        }

        // Calculate hue (0-360)
        let hue = 0;
        if (max !== min) {
            const d = max - min;
            if (max === r) {
                hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
            } else if (max === g) {
                hue = ((b - r) / d + 2) * 60;
            } else {
                hue = ((r - g) / d + 4) * 60;
            }
        }

        // Map hue to color types
        // Red/Orange: 0-45 → Crimson or Amber
        // Yellow/Orange: 45-70 → Amber
        // Green: 70-160 → Verdant
        // Cyan/Blue: 160-250 → Azure
        // Purple/Magenta: 250-320 → Violet
        // Pink/Red: 320-360 → Crimson

        if (hue < 20 || hue >= 340) {
            return 'crimson'; // Red
        } else if (hue < 50) {
            return 'amber'; // Orange/Yellow-orange
        } else if (hue < 70) {
            return 'amber'; // Yellow
        } else if (hue < 160) {
            return 'verdant'; // Green
        } else if (hue < 250) {
            return 'azure'; // Cyan/Blue
        } else if (hue < 320) {
            return 'violet'; // Purple/Magenta
        } else {
            return 'crimson'; // Pink-red
        }
    }

    // Sample colors from room texture to create extraction zones
    async function sampleTextureColors(roomData) {
        const texture = roomRenderer.loadedTextures.get(roomData.id);
        if (!texture || !texture.image) {
            console.warn('No texture available for color sampling, using defaults');
            return getHardcodedFallbackZones();
        }

        const image = texture.image;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);

        const zones = [];
        const gridSize = 3; // 3x3 grid = 9 zones covering full image
        const cellWidth = canvas.width / gridSize;
        const cellHeight = canvas.height / gridSize;

        for (let gridY = 0; gridY < gridSize; gridY++) {
            for (let gridX = 0; gridX < gridSize; gridX++) {
                // Sample multiple points across the cell for better color detection
                const samplePoints = [
                    { x: 0.25, y: 0.25 },
                    { x: 0.75, y: 0.25 },
                    { x: 0.5, y: 0.5 },
                    { x: 0.25, y: 0.75 },
                    { x: 0.75, y: 0.75 }
                ];

                let totalR = 0, totalG = 0, totalB = 0, sampleCount = 0;

                for (const point of samplePoints) {
                    const sampleX = Math.floor(gridX * cellWidth + cellWidth * point.x);
                    const sampleY = Math.floor(gridY * cellHeight + cellHeight * point.y);

                    // Sample a small area around each point
                    const sampleSize = Math.max(10, Math.floor(cellWidth / 10));
                    const startX = Math.max(0, sampleX - sampleSize / 2);
                    const startY = Math.max(0, sampleY - sampleSize / 2);
                    const width = Math.min(sampleSize, canvas.width - startX);
                    const height = Math.min(sampleSize, canvas.height - startY);

                    if (width > 0 && height > 0) {
                        const imageData = ctx.getImageData(startX, startY, width, height);

                        for (let i = 0; i < imageData.data.length; i += 4) {
                            totalR += imageData.data[i];
                            totalG += imageData.data[i + 1];
                            totalB += imageData.data[i + 2];
                            sampleCount++;
                        }
                    }
                }

                if (sampleCount === 0) continue;

                const avgR = Math.round(totalR / sampleCount);
                const avgG = Math.round(totalG / sampleCount);
                const avgB = Math.round(totalB / sampleCount);

                // Always assign a color type - fallback to nearest if too dark/neutral
                let colorType = mapRGBToColorType(avgR, avgG, avgB);
                if (!colorType) {
                    // Assign fallback based on grid position for full coverage
                    const fallbackColors = [
                        ['amber', 'violet', 'amber'],
                        ['crimson', 'ivory', 'azure'],
                        ['verdant', 'azure', 'verdant']
                    ];
                    colorType = fallbackColors[gridY][gridX];
                }

                // UV coordinates (note: Y is flipped in UV space)
                const uvMinX = gridX / gridSize;
                const uvMaxX = (gridX + 1) / gridSize;
                const uvMinY = 1 - (gridY + 1) / gridSize; // Flip Y
                const uvMaxY = 1 - gridY / gridSize;

                zones.push({
                    colorType: colorType,
                    uvMin: [uvMinX, uvMinY],
                    uvMax: [uvMaxX, uvMaxY],
                    maxExtract: 2,
                    description: getColorDescription(colorType),
                    sampledRGB: { r: avgR, g: avgG, b: avgB }
                });
            }
        }

        console.log(`Sampled ${zones.length} color zones from texture`);
        return zones.length > 0 ? zones : getHardcodedFallbackZones();
    }

    // Merge adjacent zones of the same color type
    function mergeAdjacentZones(zones) {
        // Group by color type
        const byColor = {};
        for (const zone of zones) {
            if (!byColor[zone.colorType]) {
                byColor[zone.colorType] = [];
            }
            byColor[zone.colorType].push(zone);
        }

        // Keep up to 2 zones per color type
        const result = [];
        for (const [colorType, colorZones] of Object.entries(byColor)) {
            const kept = colorZones.slice(0, 2);
            for (const zone of kept) {
                zone.maxExtract = Math.min(3, colorZones.length); // More zones = more extractable
                result.push(zone);
            }
        }

        return result;
    }

    function getColorDescription(colorType) {
        const descriptions = {
            'crimson': 'Warm firelight glow',
            'azure': 'Cool shadowed stone',
            'verdant': 'Living moss and lichen',
            'amber': 'Golden torchlight',
            'violet': 'Deep arcane shadows',
            'ivory': 'Pale dust motes'
        };
        return descriptions[colorType] || 'Colored essence';
    }

    // Hardcoded fallback when texture sampling fails - covers full image
    function getHardcodedFallbackZones() {
        // Create a 3x3 grid covering the full image with varied colors
        return [
            // Top row
            { colorType: 'amber', uvMin: [0.0, 0.67], uvMax: [0.33, 1.0], maxExtract: 2, description: 'Warm torchlight' },
            { colorType: 'violet', uvMin: [0.33, 0.67], uvMax: [0.67, 1.0], maxExtract: 2, description: 'Shadowed ceiling' },
            { colorType: 'amber', uvMin: [0.67, 0.67], uvMax: [1.0, 1.0], maxExtract: 2, description: 'Warm torchlight' },
            // Middle row
            { colorType: 'crimson', uvMin: [0.0, 0.33], uvMax: [0.33, 0.67], maxExtract: 2, description: 'Flickering embers' },
            { colorType: 'ivory', uvMin: [0.33, 0.33], uvMax: [0.67, 0.67], maxExtract: 1, description: 'Pale stone' },
            { colorType: 'azure', uvMin: [0.67, 0.33], uvMax: [1.0, 0.67], maxExtract: 2, description: 'Cool shadows' },
            // Bottom row
            { colorType: 'verdant', uvMin: [0.0, 0.0], uvMax: [0.33, 0.33], maxExtract: 2, description: 'Moss growth' },
            { colorType: 'azure', uvMin: [0.33, 0.0], uvMax: [0.67, 0.33], maxExtract: 2, description: 'Damp stone' },
            { colorType: 'verdant', uvMin: [0.67, 0.0], uvMax: [1.0, 0.33], maxExtract: 2, description: 'Moss growth' }
        ];
    }

    // Default color zones - now samples from actual texture
    function getDefaultColorZones(roomData) {
        // Return a promise that samples the texture
        // For synchronous fallback, return hardcoded zones
        return getHardcodedFallbackZones();
    }

    function enable() {
        isEnabled = true;
    }

    function disable() {
        isEnabled = false;
        cancelExtraction();
        crosshair.classList.remove('visible');
    }

    function getZones() {
        return [...extractionZones];
    }

    function isActive() {
        return isExtracting;
    }

    return {
        init,
        setupRoomZones,
        enable,
        disable,
        getZones,
        isActive
    };
})();

// Export for module use
export default ExtractionSystem;

// Also expose to window for non-module scripts
window.ExtractionSystem = ExtractionSystem;
