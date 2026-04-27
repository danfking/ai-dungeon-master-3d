// hud.js - HTML overlay UI controller

const HUD = (() => {
    // DOM elements
    let elements = {};

    // Tracking for animated counters
    let _prevGold = 0;

    function init() {
        // Cache DOM elements
        elements = {
            // Enemy info
            enemyInfo: document.getElementById('enemy-info'),
            enemyName: document.getElementById('enemy-name'),
            enemyHpFill: document.getElementById('enemy-hp-fill'),

            // Player stats
            hpFill: document.getElementById('hp-fill'),
            hpText: document.getElementById('hp-text'),
            manaFill: document.getElementById('mana-fill'),
            manaText: document.getElementById('mana-text'),
            goldAmount: document.getElementById('gold-amount'),

            // XP bar
            xpBar: document.getElementById('xp-bar'),
            xpText: document.getElementById('xp-text'),

            // Action bar
            actionBar: document.getElementById('action-bar'),
            btnAttack: document.getElementById('btn-attack'),
            btnArcane: document.getElementById('btn-arcane'),
            btnHeal: document.getElementById('btn-heal'),
            btnFlee: document.getElementById('btn-flee'),

            // Messages
            turnIndicator: document.getElementById('turn-indicator'),
            combatMessages: document.getElementById('combat-messages'),

            // Loading screen
            loadingScreen: document.getElementById('loading-screen'),
            loadingProgress: document.getElementById('loading-progress'),
            loadingText: document.getElementById('loading-text'),

            // Navigation
            navigationPanel: document.getElementById('navigation-panel'),
            roomName: document.getElementById('room-name'),
            btnBack: document.getElementById('btn-back'),
            btnForward: document.getElementById('btn-forward'),
            roomHint: document.getElementById('room-hint')
        };

        // Setup action buttons
        setupActionButtons();

        // Setup navigation buttons
        setupNavigationButtons();

        // Setup keyboard shortcuts
        setupKeyboardShortcuts();

        // Setup ability tooltips
        setupTooltips();

        console.log('HUD initialized');
    }

    function setupActionButtons() {
        elements.btnAttack.addEventListener('click', () => {
            if (!elements.btnAttack.disabled) {
                Combat.playerAttack();
            }
        });

        elements.btnArcane.addEventListener('click', () => {
            if (!elements.btnArcane.disabled) {
                Combat.playerAbility('arcane_bolt');
            }
        });

        elements.btnHeal.addEventListener('click', () => {
            if (!elements.btnHeal.disabled) {
                Combat.playerAbility('heal');
            }
        });

        elements.btnFlee.addEventListener('click', () => {
            if (!elements.btnFlee.disabled) {
                Combat.playerFlee();
            }
        });
    }

    function setupNavigationButtons() {
        elements.btnBack.addEventListener('click', () => {
            if (!elements.btnBack.disabled) {
                const state = GameEngine.getState();
                if (state.previousRoom) {
                    GameEngine.enterRoom(state.previousRoom);
                }
            }
        });

        elements.btnForward.addEventListener('click', () => {
            if (!elements.btnForward.disabled) {
                const state = GameEngine.getState();
                const room = DataManager.getRoom(state.currentRoom);
                if (room && room.exits && room.exits.forward) {
                    GameEngine.enterRoom(room.exits.forward);
                }
            }
        });
    }

    // --- Keyboard Shortcuts ---

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;

            const key = e.key;

            // Number keys 1-4 for action buttons
            if (key >= '1' && key <= '4') {
                const buttons = [elements.btnAttack, elements.btnArcane, elements.btnHeal, elements.btnFlee];
                const btn = buttons[parseInt(key) - 1];
                if (btn && !btn.disabled) {
                    btn.click();
                    // Brief visual feedback
                    btn.style.transform = 'translateY(0) scale(0.95)';
                    setTimeout(() => { btn.style.transform = ''; }, 100);
                }
            }

            // Enter/Space for primary action (Attack if in combat)
            if (key === 'Enter' || key === ' ') {
                if (elements.btnAttack && !elements.btnAttack.disabled) {
                    e.preventDefault();
                    elements.btnAttack.click();
                }
            }
        });
    }

    // --- Ability Tooltips ---

    function setupTooltips() {
        elements.btnAttack.setAttribute('data-tooltip',
            'Physical attack\nSTR vs DEF');
        elements.btnArcane.setAttribute('data-tooltip',
            'Arcane Bolt\nWIS \u00d7 0.8 damage\nCost: 5 MP | Req: WIS \u2265 8');
        elements.btnHeal.setAttribute('data-tooltip',
            'Healing Prayer\nFAI \u00d7 1.5 HP restored\nCost: 5 MP | Req: FAI \u2265 8');
        elements.btnFlee.setAttribute('data-tooltip',
            'Attempt to flee\nChance based on SPD\nCannot flee bosses');
    }

    // --- Navigation ---

    function updateNavigation(state) {
        if (!elements.navigationPanel) return;

        const room = DataManager.getRoom(state.currentRoom);
        if (!room) return;

        // Update room name
        elements.roomName.textContent = room.name;

        // Update back button
        elements.btnBack.disabled = !state.previousRoom || state.inCombat;

        // Update forward button
        const hasForward = room.exits && room.exits.forward;
        elements.btnForward.disabled = !hasForward || state.inCombat;

        // Update hint based on state
        if (state.inCombat) {
            elements.roomHint.textContent = 'Defeat the enemy to proceed';
            elements.navigationPanel.classList.add('hidden');
        } else {
            const colors = ColorSystem.getTotalParticles();
            if (colors === 0) {
                elements.roomHint.textContent = 'Extract colors to power your spells';
            } else if (hasForward) {
                elements.roomHint.textContent = `${colors} colors stored. Ready to proceed?`;
            } else {
                elements.roomHint.textContent = 'Floor complete!';
            }
            elements.navigationPanel.classList.remove('hidden');
        }
    }

    // --- Stats Updates ---

    function updateStats(state) {
        if (!state) return;

        // HP bar
        const hpPercent = (state.hp / state.maxHp) * 100;
        elements.hpFill.style.width = `${hpPercent}%`;
        elements.hpText.textContent = `${state.hp}/${state.maxHp}`;

        // Mana bar
        const stats = GameEngine.getPlayerStats();
        const maxMana = stats.wisdom * 2;
        const manaPercent = (state.mana / maxMana) * 100;
        elements.manaFill.style.width = `${manaPercent}%`;
        elements.manaText.textContent = `${state.mana}/${maxMana}`;

        // Gold (no animation here — animation triggered explicitly by animateGoldChange)
        elements.goldAmount.textContent = state.gold;

        // XP bar
        updateXPBar();

        // Update button states
        updateActionButtons(state);

        // Update navigation
        updateNavigation(state);

        // Update color inventory (combat mode indicator)
        if (window.ColorInventoryUI) {
            ColorInventoryUI.update();
        }
    }

    function updateActionButtons(state) {
        const stats = GameEngine.getPlayerStats();
        const inCombat = state.inCombat;

        // Enable/disable buttons based on combat state
        elements.btnAttack.disabled = !inCombat;
        elements.btnFlee.disabled = !inCombat;

        // Arcane Bolt - needs WIS >= 8 and 5 MP
        elements.btnArcane.disabled = !inCombat || stats.wisdom < 8 || state.mana < 5;

        // Heal - needs FAI >= 8 and 5 MP
        elements.btnHeal.disabled = !inCombat || stats.faith < 8 || state.mana < 5;
    }

    // --- XP Bar ---

    function updateXPBar() {
        if (!elements.xpBar || !window.Progression) return;

        const display = Progression.getProgressionDisplay();
        const progress = display.progress;

        elements.xpBar.style.width = `${Math.min(100, progress * 100)}%`;
        elements.xpText.textContent = `Lv.${display.level}`;
    }

    // --- Enemy HP ---

    function updateEnemyHP(current, max, name = null) {
        const percent = Math.max(0, (current / max) * 100);
        elements.enemyHpFill.style.width = `${percent}%`;

        if (name) {
            elements.enemyName.textContent = name;
        }
    }

    // --- Combat UI ---

    function showCombatUI(show) {
        if (show) {
            elements.enemyInfo.classList.remove('hidden');
            elements.turnIndicator.classList.remove('hidden');
        } else {
            elements.enemyInfo.classList.add('hidden');
            elements.turnIndicator.classList.add('hidden');
            clearMessages();
        }
    }

    function showTurnIndicator(isPlayerTurn) {
        elements.turnIndicator.textContent = isPlayerTurn ? 'Your Turn' : 'Enemy Turn';
        elements.turnIndicator.classList.remove('hidden');
    }

    // --- Messages ---

    function showMessage(text, type = 'system') {
        const message = document.createElement('div');
        message.className = `combat-message msg-${type}`;
        message.textContent = text;

        elements.combatMessages.appendChild(message);

        // Keep only last 5 messages
        while (elements.combatMessages.children.length > 5) {
            elements.combatMessages.removeChild(elements.combatMessages.firstChild);
        }

        // Auto-remove after delay
        setTimeout(() => {
            if (message.parentNode) {
                message.style.opacity = '0';
                setTimeout(() => {
                    if (message.parentNode) {
                        message.remove();
                    }
                }, 300);
            }
        }, 3000);
    }

    function clearMessages() {
        elements.combatMessages.innerHTML = '';
    }

    // --- Floating Damage Numbers ---

    function showFloatingNumber(containerId, value, type = 'damage') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const el = document.createElement('div');
        el.className = `floating-number ${type}`;
        el.textContent = (type === 'heal') ? `+${value}` : `-${value}`;

        // Random horizontal offset
        const offsetX = Math.floor(Math.random() * 60 - 30);
        el.style.left = `calc(50% + ${offsetX}px)`;
        el.style.top = '50%';

        // Ensure container has relative positioning for absolute children
        const pos = getComputedStyle(container).position;
        if (pos === 'static') {
            container.style.position = 'relative';
        }

        container.appendChild(el);

        // Remove after animation completes
        setTimeout(() => {
            if (el.parentNode) el.remove();
        }, 1200);
    }

    // --- Animated Counters ---

    function animateCounter(element, from, to, duration = 600) {
        if (!element) return;
        const start = performance.now();
        const diff = to - from;

        function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out quad
            const eased = 1 - (1 - progress) * (1 - progress);
            const current = Math.round(from + diff * eased);
            element.textContent = current;
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    function animateGoldChange(from, to) {
        animateCounter(elements.goldAmount, from, to, 800);
    }

    // --- Inventory (placeholder) ---

    function updateInventory(state) {
        // TODO: Implement inventory panel
    }

    // --- Legendary Drop ---

    function showLegendaryDrop(item) {
        // TODO: Implement legendary item celebration animation
        showMessage(`LEGENDARY: ${item.name}!`, 'critical');
    }

    // --- Loading Screen ---

    function setLoadingProgress(percent, text = null) {
        elements.loadingProgress.style.width = `${percent}%`;
        if (text) {
            elements.loadingText.textContent = text;
        }
    }

    function hideLoadingScreen() {
        elements.loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            elements.loadingScreen.style.display = 'none';
        }, 500);
    }

    return {
        init,
        updateStats,
        updateNavigation,
        updateEnemyHP,
        showCombatUI,
        showTurnIndicator,
        showMessage,
        clearMessages,
        showFloatingNumber,
        animateGoldChange,
        updateInventory,
        showLegendaryDrop,
        setLoadingProgress,
        hideLoadingScreen
    };
})();

// Make HUD global for other modules
window.HUD = HUD;
