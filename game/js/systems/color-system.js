// color-system.js - Core color extraction and management system

const ColorSystem = (() => {
    // Color definitions
    const COLOR_TYPES = {
        crimson: {
            name: 'Crimson',
            element: 'Fire',
            hex: '#dc143c',
            rgb: { r: 220, g: 20, b: 60 },
            damage: 12,
            effect: 'burn',
            description: 'Searing flames that burn over time'
        },
        azure: {
            name: 'Azure',
            element: 'Ice',
            hex: '#007fff',
            rgb: { r: 0, g: 127, b: 255 },
            damage: 8,
            effect: 'slow',
            description: 'Chilling frost that slows enemies'
        },
        verdant: {
            name: 'Verdant',
            element: 'Nature',
            hex: '#228b22',
            rgb: { r: 34, g: 139, b: 34 },
            damage: 0,
            effect: 'heal',
            healAmount: 15,
            description: 'Life essence that restores vitality'
        },
        amber: {
            name: 'Amber',
            element: 'Lightning',
            hex: '#ffbf00',
            rgb: { r: 255, g: 191, b: 0 },
            damage: 10,
            effect: 'haste',
            description: 'Crackling energy for swift strikes'
        },
        violet: {
            name: 'Violet',
            element: 'Arcane',
            hex: '#8b00ff',
            rgb: { r: 139, g: 0, b: 255 },
            damage: 15,
            effect: 'pierce',
            description: 'Void magic that ignores defenses'
        },
        ivory: {
            name: 'Ivory',
            element: 'Light',
            hex: '#fffff0',
            rgb: { r: 255, g: 255, b: 240 },
            damage: 6,
            effect: 'shield',
            shieldAmount: 10,
            description: 'Pure light that protects and reveals'
        }
    };

    // Color mixing recipes
    const COLOR_MIXES = {
        'crimson+azure': {
            result: 'purple_steam',
            name: 'Purple Steam',
            damage: 14,
            effect: 'aoe_slow',
            description: 'Scalding mist that damages and slows all enemies'
        },
        'verdant+amber': {
            result: 'golden_bloom',
            name: 'Golden Bloom',
            damage: 0,
            effect: 'heal_haste',
            healAmount: 12,
            description: 'Restorative energy that heals and hastens'
        },
        'violet+ivory': {
            result: 'prismatic_ray',
            name: 'Prismatic Ray',
            damage: 20,
            effect: 'true_damage',
            description: 'Reality-bending beam of pure destruction'
        }
    };

    // Pokemon-style type matchups for damage calculation
    // Strong against = 1.5x damage, Weak against = 0.5x damage, Neutral = 1.0x
    const COLOR_MATCHUPS = {
        crimson: {
            strong: ['verdant'],      // Fire burns Nature
            weak: ['azure'],          // Fire melts against Ice (water quenches)
            description: 'Flames scorch plant life but fade against cold'
        },
        azure: {
            strong: ['crimson'],      // Ice quenches Fire
            weak: ['amber'],          // Ice shatters under Lightning
            description: 'Frost extinguishes flames but conducts electricity'
        },
        verdant: {
            strong: ['azure'],        // Nature absorbs Ice (plants insulate)
            weak: ['crimson'],        // Nature burns in Fire
            description: 'Living things endure cold but wither in flames'
        },
        amber: {
            strong: ['azure'],        // Lightning shatters Ice
            weak: ['verdant'],        // Lightning grounds into Nature
            description: 'Energy cracks frozen foes but disperses in growth'
        },
        violet: {
            strong: ['ivory'],        // Arcane corrupts Light
            weak: [],                 // No weakness (mysterious void magic)
            description: 'Void magic twists radiance but fears nothing'
        },
        ivory: {
            strong: ['violet'],       // Light purifies Arcane
            weak: [],                 // No weakness (pure divine magic)
            description: 'Pure light banishes darkness but fears nothing'
        }
    };

    // Effectiveness multipliers
    const EFFECTIVENESS = {
        SUPER_EFFECTIVE: 1.5,
        NOT_EFFECTIVE: 0.5,
        NEUTRAL: 1.0
    };

    // Get damage effectiveness multiplier for attack vs defense colors
    function getEffectiveness(attackColor, defenseColor) {
        if (!attackColor || !defenseColor) return EFFECTIVENESS.NEUTRAL;

        const matchup = COLOR_MATCHUPS[attackColor];
        if (!matchup) return EFFECTIVENESS.NEUTRAL;

        if (matchup.strong.includes(defenseColor)) {
            return EFFECTIVENESS.SUPER_EFFECTIVE;
        }
        if (matchup.weak.includes(defenseColor)) {
            return EFFECTIVENESS.NOT_EFFECTIVE;
        }
        return EFFECTIVENESS.NEUTRAL;
    }

    // Get effectiveness description for UI
    function getEffectivenessText(attackColor, defenseColor) {
        const mult = getEffectiveness(attackColor, defenseColor);
        if (mult > 1.0) {
            return { text: 'Super Effective!', class: 'super-effective', multiplier: mult };
        } else if (mult < 1.0) {
            return { text: 'Not very effective...', class: 'not-effective', multiplier: mult };
        }
        return { text: '', class: 'neutral', multiplier: mult };
    }

    // Get all matchup info for a color (for UI tooltips)
    function getColorMatchups(colorType) {
        const matchup = COLOR_MATCHUPS[colorType];
        if (!matchup) return null;

        return {
            colorType,
            strongAgainst: matchup.strong.map(c => COLOR_TYPES[c]?.name || c),
            weakAgainst: matchup.weak.map(c => COLOR_TYPES[c]?.name || c),
            description: matchup.description
        };
    }

    // Player's color storage
    let colorInventory = {
        crimson: 0,
        azure: 0,
        verdant: 0,
        amber: 0,
        violet: 0,
        ivory: 0
    };

    // Extraction stats (affected by progression)
    let extractionStats = {
        baseChance: 0.7,        // 70% base success rate
        bonusChance: 0,         // From levels/skills
        baseYield: 1,           // Particles per extraction
        bonusYield: 0,          // From levels/skills
        maxStorage: 10,         // Max particles per color
        totalMaxStorage: 30,    // Total particles across all colors
        extractionRange: 5,     // How far player can extract from
        canMix: false,          // Unlocked at level 5
        canExtractFromEnemies: false,  // Unlocked at level 10
        manaCost: 2,            // MP cost per extraction attempt
        freeExtractions: 1      // Free extractions per room (tutorial mercy)
    };

    // Track free extractions used this room
    let freeExtractionsUsed = 0;

    // Currently selected color for casting
    let selectedColor = null;

    // Extraction cooldown
    let lastExtractionTime = 0;
    const EXTRACTION_COOLDOWN = 500; // ms

    // Initialize system
    function init() {
        console.log('ColorSystem initialized');
        // Load saved state if exists
        loadState();
    }

    // Get total particles stored
    function getTotalParticles() {
        return Object.values(colorInventory).reduce((sum, count) => sum + count, 0);
    }

    // Check if can extract more
    function canStore(colorType) {
        if (colorInventory[colorType] >= extractionStats.maxStorage) {
            return false;
        }
        if (getTotalParticles() >= extractionStats.totalMaxStorage) {
            return false;
        }
        return true;
    }

    // Attempt to extract color from a zone
    function extractColor(colorType, intensity = 1.0) {
        // Check cooldown
        const now = Date.now();
        if (now - lastExtractionTime < EXTRACTION_COOLDOWN) {
            return { success: false, reason: 'cooldown' };
        }

        // Check if color type is valid
        if (!COLOR_TYPES[colorType]) {
            return { success: false, reason: 'invalid_color' };
        }

        // Check storage
        if (!canStore(colorType)) {
            HUD.showMessage(`${COLOR_TYPES[colorType].name} storage full!`, 'error');
            return { success: false, reason: 'storage_full' };
        }

        // Check mana cost (unless free extractions available)
        const state = GameEngine.getState();
        const needsMana = freeExtractionsUsed >= extractionStats.freeExtractions;

        if (needsMana) {
            if (state.mana < extractionStats.manaCost) {
                HUD.showMessage(`Not enough mana! (Need ${extractionStats.manaCost} MP)`, 'error');
                return { success: false, reason: 'no_mana', need: extractionStats.manaCost, have: state.mana };
            }
        }

        // Calculate extraction chance
        const totalChance = extractionStats.baseChance + extractionStats.bonusChance;
        const roll = Math.random();

        lastExtractionTime = now;

        // Deduct mana cost
        if (needsMana) {
            state.mana -= extractionStats.manaCost;
            HUD.updateStats(state);
        } else {
            freeExtractionsUsed++;
        }

        if (roll > totalChance) {
            HUD.showMessage('Extraction failed...', 'system');
            return { success: false, reason: 'failed_roll', roll, needed: totalChance };
        }

        // Calculate yield
        let yield_amount = extractionStats.baseYield + extractionStats.bonusYield;

        // Intensity affects yield (brighter areas give more)
        yield_amount = Math.max(1, Math.floor(yield_amount * intensity));

        // Cap at storage limits
        const spaceAvailable = Math.min(
            extractionStats.maxStorage - colorInventory[colorType],
            extractionStats.totalMaxStorage - getTotalParticles()
        );
        yield_amount = Math.min(yield_amount, spaceAvailable);

        // Add to inventory
        colorInventory[colorType] += yield_amount;

        // Show message
        const colorData = COLOR_TYPES[colorType];
        const manaMsg = needsMana ? ` (-${extractionStats.manaCost} MP)` : ' (Free)';
        HUD.showMessage(`Extracted ${yield_amount} ${colorData.name} essence!${manaMsg}`, 'success');

        // Update UI
        if (window.ColorInventoryUI) {
            ColorInventoryUI.update();
        }

        // Award XP for extraction
        if (window.Progression) {
            Progression.awardExtractionXP(colorType);
        }

        return {
            success: true,
            colorType,
            amount: yield_amount,
            total: colorInventory[colorType]
        };
    }

    // Use color for spell
    function useColor(colorType, amount = 1) {
        if (!COLOR_TYPES[colorType]) {
            return { success: false, reason: 'invalid_color' };
        }

        if (colorInventory[colorType] < amount) {
            HUD.showMessage(`Not enough ${COLOR_TYPES[colorType].name}!`, 'error');
            return { success: false, reason: 'insufficient', have: colorInventory[colorType], need: amount };
        }

        colorInventory[colorType] -= amount;

        // Update UI
        if (window.ColorInventoryUI) {
            ColorInventoryUI.update();
        }

        return {
            success: true,
            colorType,
            spent: amount,
            remaining: colorInventory[colorType],
            colorData: COLOR_TYPES[colorType]
        };
    }

    // Mix two colors (requires unlock)
    function mixColors(color1, color2) {
        if (!extractionStats.canMix) {
            HUD.showMessage('Color mixing not yet unlocked!', 'error');
            return { success: false, reason: 'locked' };
        }

        // Normalize order for lookup
        const key = [color1, color2].sort().join('+');
        const recipe = COLOR_MIXES[key];

        if (!recipe) {
            HUD.showMessage('These colors cannot be mixed!', 'error');
            return { success: false, reason: 'no_recipe' };
        }

        // Check if have both colors
        if (colorInventory[color1] < 1 || colorInventory[color2] < 1) {
            HUD.showMessage('Need at least 1 of each color to mix!', 'error');
            return { success: false, reason: 'insufficient' };
        }

        // Consume colors
        colorInventory[color1]--;
        colorInventory[color2]--;

        // Update UI
        if (window.ColorInventoryUI) {
            ColorInventoryUI.update();
        }

        HUD.showMessage(`Created ${recipe.name}!`, 'critical');

        return {
            success: true,
            mixedSpell: recipe
        };
    }

    // Select a color for casting
    function selectColor(colorType) {
        if (colorType && !COLOR_TYPES[colorType]) {
            return false;
        }

        if (colorType && colorInventory[colorType] < 1) {
            HUD.showMessage(`No ${COLOR_TYPES[colorType].name} particles!`, 'error');
            return false;
        }

        selectedColor = colorType;

        // Update UI
        if (window.ColorInventoryUI) {
            ColorInventoryUI.updateSelection(colorType);
        }

        return true;
    }

    // Get selected color
    function getSelectedColor() {
        return selectedColor;
    }

    // Cast spell with selected color
    function castSelectedColor(target) {
        if (!selectedColor) {
            HUD.showMessage('No color selected!', 'error');
            return null;
        }

        const result = useColor(selectedColor, 1);
        if (!result.success) {
            return null;
        }

        // Return spell data for combat system
        return {
            colorType: selectedColor,
            ...COLOR_TYPES[selectedColor]
        };
    }

    // Upgrade extraction stats (called by progression system)
    function upgradeExtraction(statOrBonuses, amount) {
        // Handle bulk bonus application from Progression system
        if (typeof statOrBonuses === 'object') {
            const bonuses = statOrBonuses;
            if (bonuses.bonusChance !== undefined) {
                extractionStats.bonusChance = bonuses.bonusChance;
            }
            if (bonuses.bonusYield !== undefined) {
                extractionStats.bonusYield = bonuses.bonusYield;
            }
            if (bonuses.maxStorageBonus !== undefined) {
                extractionStats.maxStorage = 10 + bonuses.maxStorageBonus;
            }
            if (bonuses.canMix !== undefined) {
                extractionStats.canMix = bonuses.canMix;
            }
            if (bonuses.canExtractFromEnemies !== undefined) {
                extractionStats.canExtractFromEnemies = bonuses.canExtractFromEnemies;
            }
            return;
        }

        // Original single-stat upgrade
        const stat = statOrBonuses;
        if (extractionStats[stat] !== undefined) {
            if (typeof extractionStats[stat] === 'boolean') {
                extractionStats[stat] = amount;
            } else {
                extractionStats[stat] += amount;
            }
            console.log(`Upgraded ${stat} to ${extractionStats[stat]}`);
        }
    }

    // Get current inventory
    function getInventory() {
        return { ...colorInventory };
    }

    // Get color type data
    function getColorData(colorType) {
        return COLOR_TYPES[colorType] || null;
    }

    // Get all color types
    function getAllColorTypes() {
        return { ...COLOR_TYPES };
    }

    // Get extraction stats
    function getExtractionStats() {
        return { ...extractionStats };
    }

    // Save state to localStorage
    function saveState() {
        const state = {
            inventory: colorInventory,
            stats: extractionStats
        };
        localStorage.setItem('chromatic-color-state', JSON.stringify(state));
    }

    // Load state from localStorage
    function loadState() {
        try {
            const saved = localStorage.getItem('chromatic-color-state');
            if (saved) {
                const state = JSON.parse(saved);
                if (state.inventory) {
                    colorInventory = { ...colorInventory, ...state.inventory };
                }
                if (state.stats) {
                    extractionStats = { ...extractionStats, ...state.stats };
                }
            }
        } catch (e) {
            console.warn('Failed to load color state:', e);
        }
    }

    // Reset free extractions (called when entering new room)
    function resetFreeExtractions() {
        freeExtractionsUsed = 0;
    }

    // Get free extractions used count
    function getFreeExtractionsUsed() {
        return freeExtractionsUsed;
    }

    // Reset for new game
    function reset() {
        colorInventory = {
            crimson: 0,
            azure: 0,
            verdant: 0,
            amber: 0,
            violet: 0,
            ivory: 0
        };
        selectedColor = null;
        freeExtractionsUsed = 0;
        localStorage.removeItem('chromatic-color-state');

        if (window.ColorInventoryUI) {
            ColorInventoryUI.update();
        }
    }

    // Debug: Add colors for testing
    function debugAddColors(amount = 3) {
        for (const color of Object.keys(colorInventory)) {
            colorInventory[color] = Math.min(
                colorInventory[color] + amount,
                extractionStats.maxStorage
            );
        }
        if (window.ColorInventoryUI) {
            ColorInventoryUI.update();
        }
        console.log('Debug: Added colors', colorInventory);
    }

    return {
        init,
        extractColor,
        useColor,
        mixColors,
        selectColor,
        getSelectedColor,
        castSelectedColor,
        upgradeExtraction,
        getInventory,
        getColorData,
        getAllColorTypes,
        getExtractionStats,
        getTotalParticles,
        canStore,
        saveState,
        loadState,
        reset,
        resetFreeExtractions,
        getFreeExtractionsUsed,
        debugAddColors,
        // Type matchup system
        getEffectiveness,
        getEffectivenessText,
        getColorMatchups,
        // Constants
        COLOR_TYPES,
        COLOR_MIXES,
        COLOR_MATCHUPS,
        EFFECTIVENESS
    };
})();

// Expose to window
window.ColorSystem = ColorSystem;
