// main.js - Main entry point for AI Dungeon Master 3D

import * as THREE from 'three';
import sceneManager from './three/scene-manager.js';
import roomRenderer from './three/room-renderer.js';
import enemySprite from './three/enemy-sprite.js';
import particleSystem from './three/particle-system.js';
import postProcessing from './three/post-processing.js';
import ExtractionSystem from './systems/extraction.js';

// Renderer3D interface - bridges game logic to 3D rendering
const Renderer3D = {
    // Room rendering
    async setRoom(room) {
        await roomRenderer.setRoom(room);
    },

    // Enemy management
    async showEnemy(enemy, currentHp, maxHp) {
        await enemySprite.showEnemy(enemy, currentHp, maxHp);
    },

    hideEnemy() {
        enemySprite.hideEnemy();
    },

    // Combat effects
    playAttackSpell(type) {
        const enemyPos = enemySprite.sprite?.position.clone() || new THREE.Vector3(0, 1.5, -6);
        particleSystem.castSpell(type, enemyPos);
    },

    playHealEffect() {
        particleSystem.playHealEffect();
    },

    // Chromatic bubble attack - colored ring projectiles
    playBubbleAttack(colorType) {
        const enemyPos = enemySprite.sprite?.position.clone() || new THREE.Vector3(0, 1.5, -6);
        return particleSystem.castBubbleAttack(colorType, enemyPos);
    },

    // Bubble impact effect when hitting enemy
    playBubbleImpact(colorType) {
        const pos = enemySprite.sprite?.position.clone() || new THREE.Vector3(0, 1.5, -6);
        particleSystem.playBubbleImpact(pos, colorType);
    },

    playEnemyHit(isCritical = false) {
        enemySprite.playHitEffect(isCritical);
        const pos = enemySprite.sprite?.position.clone() || new THREE.Vector3(0, 1.5, -6);
        particleSystem.playHitEffect(pos, isCritical);
    },

    playEnemyAttack(colorAffinity = 'ivory') {
        // Solid particle projectiles from enemy toward player
        const enemyPos = enemySprite.sprite?.position.clone() || new THREE.Vector3(0, 1.5, -6);
        particleSystem.castEnemyAttack(colorAffinity, enemyPos);
    },

    playEnemyDeath() {
        const pos = enemySprite.sprite?.position.clone() || new THREE.Vector3(0, 1.5, -6);
        particleSystem.playDeathEffect(pos);
        enemySprite.playDeathAnimation();
    },

    shakeCamera() {
        sceneManager.shakeCamera(0.15, 250);
    },

    // Room void mode for combat
    enterVoidMode() {
        roomRenderer.enterVoidMode();
    },

    exitVoidMode() {
        roomRenderer.exitVoidMode();
    },

    // Play reveal animation when combat ends in victory
    playRoomReveal(callback) {
        roomRenderer.playRevealAnimation(2500, callback);
    },

    isInVoidMode() {
        return roomRenderer.isInVoidMode();
    },

    // Bleaching mechanic - grayscale rooms with enemies
    setDesaturation(level) {
        roomRenderer.setDesaturation(level);
    },

    // Animate color restoration when enemy defeated
    animateColorRestore(duration = 1500, callback = null) {
        roomRenderer.animateColorRestore(duration, callback);
    }
};

// Make Renderer3D global
window.Renderer3D = Renderer3D;

// Game Engine - manages game state
const GameEngine = (() => {
    // Base stats
    const BASE_STATS = {
        strength: 10,
        wisdom: 10,
        defense: 5,
        vitality: 50,
        speed: 5,
        luck: 3,
        faith: 10,
        toxicity: 0
    };

    // Initial game state
    let gameState = {
        currentRoom: 'crypt-entrance',
        previousRoom: null,
        floor: 1,
        hp: 50,
        maxHp: 50,
        mana: 20,
        gold: 0,
        stats: { ...BASE_STATS },
        inventory: [],
        equipment: {
            weapon: null,
            armor: null,
            helmet: null,
            hands: null,
            ring: null,
            amulet: null
        },
        permanentBonuses: {},
        inCombat: false,
        currentEnemy: null,
        visitedRooms: [],
        clearedEncounters: [],
        damagedEnemies: {},
        groundItems: {},
        gameOver: false,
        victory: false,
        enemiesDefeated: 0,
        itemsDismantled: 0,
        playerBuffs: []
    };

    function getState() {
        return gameState;
    }

    function getPlayerStats() {
        const stats = { ...gameState.stats };

        // Add equipment bonuses
        const equipped = Inventory.getEquippedStats(gameState);
        for (const [stat, value] of Object.entries(equipped)) {
            if (stats[stat] !== undefined) {
                stats[stat] += value;
            } else {
                stats[stat] = value;
            }
        }

        // Add permanent bonuses
        for (const [stat, value] of Object.entries(gameState.permanentBonuses)) {
            if (stats[stat] !== undefined) {
                stats[stat] += value;
            } else {
                stats[stat] = value;
            }
        }

        // Add set bonuses
        const activeSets = Inventory.getActiveSets(gameState);
        for (const [setId, setInfo] of Object.entries(activeSets)) {
            if (setInfo.bonus) {
                for (const [stat, value] of Object.entries(setInfo.bonus)) {
                    if (stats[stat] !== undefined) {
                        stats[stat] += value;
                    } else {
                        stats[stat] = value;
                    }
                }
            }
        }

        return stats;
    }

    async function enterRoom(roomId) {
        const room = DataManager.getRoom(roomId);
        if (!room) {
            console.error(`Room not found: ${roomId}`);
            return;
        }

        // Update state
        gameState.previousRoom = gameState.currentRoom;
        gameState.currentRoom = roomId;

        if (!gameState.visitedRooms.includes(roomId)) {
            gameState.visitedRooms.push(roomId);
        }

        // Update 3D scene
        await Renderer3D.setRoom(room);

        // Set up extraction zones for this room
        if (window.ExtractionSystem) {
            ExtractionSystem.setupRoomZones(room);
        }

        // Reset free extractions for new room
        if (window.ColorSystem) {
            ColorSystem.resetFreeExtractions();
        }

        // Check for encounter
        if (!gameState.clearedEncounters.includes(roomId)) {
            // Check for damaged enemy (fled from previously)
            if (gameState.damagedEnemies && gameState.damagedEnemies[roomId]) {
                const savedEnemy = gameState.damagedEnemies[roomId];
                // Bleaching mechanic - start grayscale for rooms with enemies
                roomRenderer.setDesaturation(1.0);
                Combat.startCombat(savedEnemy.enemyId, savedEnemy.hp);
            } else if (room.encounter && room.encounter.chance > 0) {
                if (Math.random() < room.encounter.chance && room.encounter.enemies.length > 0) {
                    const enemyId = room.encounter.enemies[Math.floor(Math.random() * room.encounter.enemies.length)];
                    // Bleaching mechanic - start grayscale for rooms with enemies
                    roomRenderer.setDesaturation(1.0);
                    Combat.startCombat(enemyId);
                }
            }
        }

        HUD.updateStats(gameState);
    }

    function checkDeath() {
        if (gameState.hp <= 0) {
            gameState.gameOver = true;
            HUD.showMessage('You have died...', 'error');
            // TODO: Show game over screen
        }
    }

    function checkFloorProgress() {
        // Check if current floor is complete
        const currentFloorRooms = DataManager.getRoomsForFloor(gameState.floor);
        const allCleared = currentFloorRooms.every(r =>
            r.encounter.chance === 0 || gameState.clearedEncounters.includes(r.id)
        );

        if (allCleared && gameState.floor < 3) {
            // Progress to next floor
            gameState.floor++;
            const nextStartRoom = DataManager.getFloorStartRoom(gameState.floor);
            if (nextStartRoom) {
                HUD.showMessage(`Descending to Floor ${gameState.floor}...`, 'success');
                setTimeout(() => enterRoom(nextStartRoom), 1500);
            }
        } else if (allCleared && gameState.floor === 3) {
            // Victory!
            gameState.victory = true;
            HUD.showMessage('Victory! The crypt is cleared!', 'success');
        }
    }

    function saveGame(silent = false) {
        try {
            localStorage.setItem('ai-dm-3d-save', JSON.stringify(gameState));
            if (!silent) HUD.showMessage('Game saved.', 'success');
        } catch (e) {
            console.error('Save failed:', e);
        }
    }

    function loadGame() {
        try {
            const saved = localStorage.getItem('ai-dm-3d-save');
            if (saved) {
                gameState = JSON.parse(saved);
                return true;
            }
        } catch (e) {
            console.error('Load failed:', e);
        }
        return false;
    }

    function newGame() {
        gameState = {
            currentRoom: 'crypt-entrance',
            previousRoom: null,
            floor: 1,
            hp: 50,
            maxHp: 50,
            mana: 20,
            gold: 0,
            stats: { ...BASE_STATS },
            inventory: [],
            equipment: {
                weapon: null,
                armor: null,
                helmet: null,
                hands: null,
                ring: null,
                amulet: null
            },
            permanentBonuses: {},
            inCombat: false,
            currentEnemy: null,
            visitedRooms: [],
            clearedEncounters: [],
            damagedEnemies: {},
            groundItems: {},
            gameOver: false,
            victory: false,
            enemiesDefeated: 0,
            itemsDismantled: 0,
            playerBuffs: []
        };
    }

    return {
        getState,
        getPlayerStats,
        enterRoom,
        checkDeath,
        checkFloorProgress,
        saveGame,
        loadGame,
        newGame,
        BASE_STATS
    };
})();

// Make GameEngine global
window.GameEngine = GameEngine;

// Initialize everything
async function initGame() {
    console.log('Initializing AI Dungeon Master 3D...');

    // Initialize HUD first so we can show loading progress
    HUD.init();

    HUD.setLoadingProgress(10, 'Loading data...');

    // Load game data
    DataManager.loadData();

    HUD.setLoadingProgress(20, 'Initializing 3D engine...');

    // Initialize Three.js
    const canvas = document.getElementById('game-canvas');
    await sceneManager.init(canvas);

    HUD.setLoadingProgress(40, 'Setting up scene...');

    // Initialize subsystems
    roomRenderer.init(sceneManager.getScene());
    sceneManager.setRoomRenderer(roomRenderer);

    enemySprite.init(sceneManager.getScene());
    sceneManager.setEnemySprite(enemySprite);

    particleSystem.init(sceneManager.getScene());
    sceneManager.setParticleSystem(particleSystem);

    HUD.setLoadingProgress(60, 'Initializing shaders...');

    // Initialize post-processing
    postProcessing.init(
        sceneManager.getRenderer(),
        sceneManager.getScene(),
        sceneManager.getCamera()
    );
    sceneManager.setPostProcessing(postProcessing);

    HUD.setLoadingProgress(70, 'Initializing color system...');

    // Initialize Chromatic Resonance systems
    ColorSystem.init();
    Progression.init();
    ColorInventoryUI.init();
    ExtractionSystem.init();

    // Initialize painter's palette
    if (window.PaintersPalette) {
        PaintersPalette.init();
        PaintersPalette.show(); // Show by default
    }

    // Initialize inventory panel
    if (window.InventoryPanel) {
        InventoryPanel.init();
    }

    // Initialize notification system
    SystemNotifications.init();

    HUD.setLoadingProgress(80, 'Loading room...');

    // Start new game
    GameEngine.newGame();
    await GameEngine.enterRoom('crypt-entrance');

    HUD.setLoadingProgress(100, 'Ready!');

    // Hide loading screen
    setTimeout(() => {
        HUD.hideLoadingScreen();
        // Tutorial popups disabled - will be incorporated differently later
    }, 500);

    // Start animation loop
    sceneManager.animate();

    console.log('AI Dungeon Master 3D initialized');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
