// progression.js - XP, Leveling, and Skill System for Chromatic Resonance

const Progression = (() => {
    // Level thresholds (XP required to reach each level)
    const LEVEL_THRESHOLDS = [
        0,      // Level 1 (starting)
        100,    // Level 2
        250,    // Level 3
        500,    // Level 4
        850,    // Level 5 (color mixing unlocked)
        1300,   // Level 6
        1900,   // Level 7 (expanded storage)
        2700,   // Level 8
        3800,   // Level 9
        5200    // Level 10 (extract from enemies)
    ];

    // Level-up bonuses
    const LEVEL_BONUSES = {
        2: {
            extractionChance: 0.1,  // +10% extraction chance
            description: 'Extraction Success: 70% -> 80%',
            ability: null
        },
        3: {
            extractionYield: 1,     // +1 particle per extraction
            description: 'Extraction Yield: +1 particle',
            ability: null
        },
        4: {
            spellPower: 2,          // +2 spell damage
            description: 'Spell Power: +2 damage',
            ability: null
        },
        5: {
            canMix: true,           // Unlock color mixing
            description: 'NEW ABILITY: Color Mixing',
            ability: 'COLOR_MIX'
        },
        6: {
            extractionChance: 0.1,  // Another +10%
            description: 'Extraction Success: 80% -> 90%',
            ability: null
        },
        7: {
            maxStorage: 5,          // +5 max storage per color
            description: 'Color Storage: +5 per type',
            ability: null
        },
        8: {
            spellPower: 3,          // +3 spell damage
            description: 'Spell Power: +3 damage',
            ability: null
        },
        9: {
            extractionYield: 1,     // Another +1
            description: 'Extraction Yield: +1 particle',
            ability: null
        },
        10: {
            canExtractFromEnemies: true,
            description: 'NEW ABILITY: Extract from Enemies',
            ability: 'ENEMY_EXTRACT'
        }
    };

    // XP rewards
    const XP_REWARDS = {
        enemy: {
            common: 15,
            uncommon: 25,
            rare: 40,
            boss: 100
        },
        extraction: {
            firstOfType: 10,    // First time extracting a color type
            normal: 2           // Each successful extraction
        },
        discovery: {
            newRoom: 5,
            colorSource: 8
        }
    };

    // Player progression state
    let progressionState = {
        level: 1,
        xp: 0,
        totalXpEarned: 0,
        skillPoints: 0,
        unlockedAbilities: [],
        extractedColorTypes: [],  // Track which colors player has extracted
        discoveredRooms: []
    };

    // Accumulated bonuses from leveling
    let accumulatedBonuses = {
        extractionChance: 0,
        extractionYield: 0,
        maxStorage: 0,
        spellPower: 0,
        canMix: false,
        canExtractFromEnemies: false
    };

    function init() {
        loadState();
        applyBonusesToColorSystem();
        console.log('Progression system initialized at level', progressionState.level);
    }

    function getLevel() {
        return progressionState.level;
    }

    function getXP() {
        return progressionState.xp;
    }

    function getXPForNextLevel() {
        if (progressionState.level >= LEVEL_THRESHOLDS.length) {
            return null; // Max level
        }
        return LEVEL_THRESHOLDS[progressionState.level];
    }

    function getXPProgress() {
        const currentLevelXP = progressionState.level > 1 ? LEVEL_THRESHOLDS[progressionState.level - 1] : 0;
        const nextLevelXP = getXPForNextLevel();

        if (nextLevelXP === null) return 1; // Max level

        const progressXP = progressionState.xp - currentLevelXP;
        const requiredXP = nextLevelXP - currentLevelXP;

        return progressXP / requiredXP;
    }

    function addXP(amount, source = 'unknown') {
        if (amount <= 0) return;

        progressionState.xp += amount;
        progressionState.totalXpEarned += amount;

        // Show XP gain message
        if (window.HUD) {
            HUD.showMessage(`+${amount} XP (${source})`, 'success');
        }

        // Check for level up
        checkLevelUp();

        saveState();
    }

    function checkLevelUp() {
        const nextLevelXP = getXPForNextLevel();

        if (nextLevelXP === null) return; // Max level

        if (progressionState.xp >= nextLevelXP) {
            levelUp();
        }
    }

    function levelUp() {
        progressionState.level++;
        progressionState.skillPoints++;

        const bonus = LEVEL_BONUSES[progressionState.level];
        const unlocks = [];

        if (bonus) {
            // Apply bonuses
            if (bonus.extractionChance) {
                accumulatedBonuses.extractionChance += bonus.extractionChance;
            }
            if (bonus.extractionYield) {
                accumulatedBonuses.extractionYield += bonus.extractionYield;
            }
            if (bonus.maxStorage) {
                accumulatedBonuses.maxStorage += bonus.maxStorage;
            }
            if (bonus.spellPower) {
                accumulatedBonuses.spellPower += bonus.spellPower;
            }
            if (bonus.canMix) {
                accumulatedBonuses.canMix = true;
                progressionState.unlockedAbilities.push('COLOR_MIX');
            }
            if (bonus.canExtractFromEnemies) {
                accumulatedBonuses.canExtractFromEnemies = true;
                progressionState.unlockedAbilities.push('ENEMY_EXTRACT');
            }

            unlocks.push(bonus.description);
            if (bonus.ability) {
                unlocks.push(`(${bonus.ability} unlocked!)`);
            }

            // Apply to color system
            applyBonusesToColorSystem();
        }

        // Show level up notification
        if (window.SystemNotifications) {
            SystemNotifications.showLevelUp(progressionState.level, unlocks);
        } else if (window.HUD) {
            HUD.showMessage(`LEVEL UP! Now level ${progressionState.level}`, 'critical');
        }

        // Check for another level up (in case of large XP gain)
        checkLevelUp();
    }

    function applyBonusesToColorSystem() {
        if (!window.ColorSystem) return;

        // Update ColorSystem extraction stats
        const stats = ColorSystem.getExtractionStats();

        // Apply accumulated bonuses
        ColorSystem.upgradeExtraction({
            bonusChance: accumulatedBonuses.extractionChance,
            bonusYield: accumulatedBonuses.extractionYield,
            maxStorageBonus: accumulatedBonuses.maxStorage,
            canMix: accumulatedBonuses.canMix,
            canExtractFromEnemies: accumulatedBonuses.canExtractFromEnemies
        });
    }

    // Award XP for defeating an enemy
    function awardEnemyDefeatXP(enemy) {
        let xpAmount = XP_REWARDS.enemy.common;

        if (enemy.boss) {
            xpAmount = XP_REWARDS.enemy.boss;
        } else if (enemy.loot_tier === 'rare' || enemy.loot_tier === 'epic') {
            xpAmount = XP_REWARDS.enemy.rare;
        } else if (enemy.loot_tier === 'uncommon') {
            xpAmount = XP_REWARDS.enemy.uncommon;
        }

        // Scale with floor
        const state = window.GameEngine ? GameEngine.getState() : { floor: 1 };
        xpAmount = Math.floor(xpAmount * (1 + (state.floor - 1) * 0.2));

        addXP(xpAmount, enemy.name);
    }

    // Award XP for extracting a color
    function awardExtractionXP(colorType) {
        let xpAmount = XP_REWARDS.extraction.normal;

        // Bonus for first time extracting this color type
        if (!progressionState.extractedColorTypes.includes(colorType)) {
            progressionState.extractedColorTypes.push(colorType);
            xpAmount += XP_REWARDS.extraction.firstOfType;

            if (window.SystemNotifications) {
                SystemNotifications.showDiscovery('NEW COLOR DISCOVERED', [
                    `You've attuned to ${colorType.charAt(0).toUpperCase() + colorType.slice(1)} essence!`,
                    '',
                    `Each color holds unique power. Master them all.`
                ]);
            }
        }

        addXP(xpAmount, 'extraction');
    }

    // Award XP for discovering a new room
    function awardDiscoveryXP(roomId) {
        if (progressionState.discoveredRooms.includes(roomId)) {
            return; // Already discovered
        }

        progressionState.discoveredRooms.push(roomId);
        addXP(XP_REWARDS.discovery.newRoom, 'exploration');
    }

    // Get accumulated bonuses for other systems
    function getBonuses() {
        return { ...accumulatedBonuses };
    }

    // Get spell power bonus for combat
    function getSpellPowerBonus() {
        return accumulatedBonuses.spellPower;
    }

    // Check if ability is unlocked
    function hasAbility(abilityName) {
        return progressionState.unlockedAbilities.includes(abilityName);
    }

    // Get progression state for display
    function getProgressionDisplay() {
        const nextXP = getXPForNextLevel();
        return {
            level: progressionState.level,
            xp: progressionState.xp,
            xpToNext: nextXP,
            progress: getXPProgress(),
            skillPoints: progressionState.skillPoints,
            abilities: [...progressionState.unlockedAbilities]
        };
    }

    // Save/Load state
    function saveState() {
        try {
            localStorage.setItem('chromatic-progression', JSON.stringify({
                state: progressionState,
                bonuses: accumulatedBonuses
            }));
        } catch (e) {
            console.warn('Failed to save progression:', e);
        }
    }

    function loadState() {
        try {
            const saved = localStorage.getItem('chromatic-progression');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.state) {
                    progressionState = { ...progressionState, ...data.state };
                }
                if (data.bonuses) {
                    accumulatedBonuses = { ...accumulatedBonuses, ...data.bonuses };
                }
            }
        } catch (e) {
            console.warn('Failed to load progression:', e);
        }
    }

    function reset() {
        progressionState = {
            level: 1,
            xp: 0,
            totalXpEarned: 0,
            skillPoints: 0,
            unlockedAbilities: [],
            extractedColorTypes: [],
            discoveredRooms: []
        };
        accumulatedBonuses = {
            extractionChance: 0,
            extractionYield: 0,
            maxStorage: 0,
            spellPower: 0,
            canMix: false,
            canExtractFromEnemies: false
        };
        saveState();
    }

    return {
        init,
        getLevel,
        getXP,
        getXPForNextLevel,
        getXPProgress,
        addXP,
        awardEnemyDefeatXP,
        awardExtractionXP,
        awardDiscoveryXP,
        getBonuses,
        getSpellPowerBonus,
        hasAbility,
        getProgressionDisplay,
        saveState,
        loadState,
        reset
    };
})();

// Expose to window
window.Progression = Progression;
