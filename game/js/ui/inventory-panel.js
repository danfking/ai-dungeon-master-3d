// inventory-panel.js - Inventory and Equipment UI Panel

const InventoryPanel = (() => {
    let panel = null;
    let isOpen = false;
    let selectedItem = null;

    // Equipment slots
    const EQUIPMENT_SLOTS = ['weapon', 'armor', 'accessory', 'charm'];

    function init() {
        createPanel();
        addKeyboardShortcut();
        console.log('InventoryPanel initialized');
    }

    function createPanel() {
        panel = document.createElement('div');
        panel.id = 'inventory-panel';
        panel.className = 'inventory-panel';

        panel.innerHTML = `
            <div class="inv-header">
                <span class="inv-title">◆ INVENTORY</span>
                <button class="inv-close-btn">×</button>
            </div>

            <div class="inv-content">
                <!-- Equipment Section -->
                <div class="inv-section equipment-section">
                    <div class="section-title">EQUIPMENT</div>
                    <div class="equipment-grid">
                        ${EQUIPMENT_SLOTS.map(slot => `
                            <div class="equipment-slot" data-slot="${slot}">
                                <div class="slot-icon"></div>
                                <div class="slot-label">${slot.toUpperCase()}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Stats Preview -->
                <div class="inv-section stats-section">
                    <div class="section-title">STATS</div>
                    <div class="stats-grid"></div>
                </div>

                <!-- Inventory Section -->
                <div class="inv-section items-section">
                    <div class="section-title">ITEMS <span class="item-count">0/8</span></div>
                    <div class="inventory-grid"></div>
                </div>

                <!-- Item Actions -->
                <div class="inv-section actions-section hidden">
                    <div class="selected-item-name"></div>
                    <div class="selected-item-desc"></div>
                    <div class="selected-item-stats"></div>
                    <div class="action-buttons">
                        <button class="action-btn equip-btn">Equip</button>
                        <button class="action-btn use-btn">Use</button>
                        <button class="action-btn dismantle-btn">Dismantle</button>
                        <button class="action-btn discard-btn">Discard</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Add event listeners
        panel.querySelector('.inv-close-btn').addEventListener('click', close);
        panel.querySelectorAll('.equipment-slot').forEach(slot => {
            slot.addEventListener('click', () => handleEquipmentSlotClick(slot.dataset.slot));
        });

        // Action buttons
        panel.querySelector('.equip-btn').addEventListener('click', () => handleAction('equip'));
        panel.querySelector('.use-btn').addEventListener('click', () => handleAction('use'));
        panel.querySelector('.dismantle-btn').addEventListener('click', () => handleAction('dismantle'));
        panel.querySelector('.discard-btn').addEventListener('click', () => handleAction('discard'));
    }

    function addKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'i' || e.key === 'I') {
                // Don't toggle if typing in an input
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                toggle();
            }
            if (e.key === 'Escape' && isOpen) {
                close();
            }
        });
    }

    function open() {
        if (!panel) return;
        isOpen = true;
        panel.classList.add('open');
        update();
    }

    function close() {
        if (!panel) return;
        isOpen = false;
        panel.classList.remove('open');
        selectedItem = null;
        updateActions();
    }

    function toggle() {
        if (isOpen) {
            close();
        } else {
            open();
        }
    }

    function update() {
        if (!panel || !isOpen) return;

        const state = GameEngine.getState();
        updateEquipment(state);
        updateInventory(state);
        updateStats(state);
    }

    function updateEquipment(state) {
        EQUIPMENT_SLOTS.forEach(slot => {
            const slotEl = panel.querySelector(`.equipment-slot[data-slot="${slot}"]`);
            const itemId = state.equipment[slot];

            if (itemId) {
                const item = DataManager.getItem(itemId);
                slotEl.classList.add('equipped');
                slotEl.classList.remove('empty');
                slotEl.dataset.itemId = itemId;

                const iconEl = slotEl.querySelector('.slot-icon');
                iconEl.textContent = getItemIcon(item);
                iconEl.style.color = getRarityColor(item.rarity);
                slotEl.title = `${item.name}\n${item.description || ''}`;
            } else {
                slotEl.classList.remove('equipped');
                slotEl.classList.add('empty');
                delete slotEl.dataset.itemId;

                const iconEl = slotEl.querySelector('.slot-icon');
                iconEl.textContent = getSlotIcon(slot);
                iconEl.style.color = '';
                slotEl.title = `Empty ${slot} slot`;
            }
        });
    }

    function updateInventory(state) {
        const grid = panel.querySelector('.inventory-grid');
        const countEl = panel.querySelector('.item-count');
        grid.innerHTML = '';

        countEl.textContent = `${state.inventory.length}/${Inventory.MAX_INVENTORY}`;

        // Create inventory slots
        for (let i = 0; i < Inventory.MAX_INVENTORY; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.dataset.index = i;

            if (i < state.inventory.length) {
                const itemId = state.inventory[i];
                const item = DataManager.getItem(itemId);

                if (item) {
                    slot.classList.add('has-item');
                    slot.classList.add(`rarity-${item.rarity}`);
                    slot.dataset.itemId = itemId;
                    slot.innerHTML = `
                        <span class="item-icon" style="color: ${getRarityColor(item.rarity)}">${getItemIcon(item)}</span>
                    `;
                    slot.title = `${item.name}\n${item.rarity}\n${item.description || ''}`;

                    slot.addEventListener('click', () => selectItem(itemId, item));
                }
            } else {
                slot.classList.add('empty');
            }

            grid.appendChild(slot);
        }
    }

    function updateStats(state) {
        const statsGrid = panel.querySelector('.stats-grid');
        const playerStats = GameEngine.getPlayerStats();
        const equippedStats = Inventory.getEquippedStats(state);

        const statsToShow = ['strength', 'defense', 'wisdom', 'speed', 'luck'];

        statsGrid.innerHTML = statsToShow.map(stat => {
            const baseValue = playerStats[stat] || 0;
            const equipBonus = equippedStats[stat] || 0;

            return `
                <div class="stat-row">
                    <span class="stat-name">${stat.substring(0, 3).toUpperCase()}</span>
                    <span class="stat-value">${baseValue}</span>
                    ${equipBonus !== 0 ? `<span class="stat-bonus ${equipBonus > 0 ? 'positive' : 'negative'}">${equipBonus > 0 ? '+' : ''}${equipBonus}</span>` : ''}
                </div>
            `;
        }).join('');
    }

    function selectItem(itemId, item) {
        selectedItem = { id: itemId, data: item };

        // Highlight selected slot
        panel.querySelectorAll('.inventory-slot').forEach(s => s.classList.remove('selected'));
        const selectedSlot = panel.querySelector(`.inventory-slot[data-item-id="${itemId}"]`);
        if (selectedSlot) {
            selectedSlot.classList.add('selected');
        }

        updateActions();
    }

    function updateActions() {
        const actionsSection = panel.querySelector('.actions-section');

        if (!selectedItem) {
            actionsSection.classList.add('hidden');
            return;
        }

        actionsSection.classList.remove('hidden');

        const item = selectedItem.data;

        // Update item info
        panel.querySelector('.selected-item-name').textContent = item.name;
        panel.querySelector('.selected-item-name').style.color = getRarityColor(item.rarity);
        panel.querySelector('.selected-item-desc').textContent = item.description || '';

        // Show stats
        if (item.stats) {
            const statsStr = Object.entries(item.stats)
                .filter(([k, v]) => v !== 0)
                .map(([k, v]) => `${k}: ${v > 0 ? '+' : ''}${v}`)
                .join(', ');
            panel.querySelector('.selected-item-stats').textContent = statsStr;
        } else {
            panel.querySelector('.selected-item-stats').textContent = '';
        }

        // Show/hide appropriate buttons
        const equipBtn = panel.querySelector('.equip-btn');
        const useBtn = panel.querySelector('.use-btn');
        const dismantleBtn = panel.querySelector('.dismantle-btn');

        // Can equip if not consumable
        equipBtn.classList.toggle('hidden', item.slot === 'consumable');

        // Can use if consumable
        useBtn.classList.toggle('hidden', !item.on_consume);

        // Can dismantle if has dismantle bonus
        dismantleBtn.classList.toggle('hidden', !item.on_dismantle);
    }

    function handleEquipmentSlotClick(slot) {
        const state = GameEngine.getState();
        const equippedItemId = state.equipment[slot];

        if (equippedItemId) {
            // Unequip item
            Inventory.unequipItem(slot);
            update();
        }
    }

    function handleAction(action) {
        if (!selectedItem) return;

        switch (action) {
            case 'equip':
                Inventory.equipItem(selectedItem.id);
                break;
            case 'use':
                Inventory.consumeItem(selectedItem.id);
                break;
            case 'dismantle':
                Inventory.dismantleItem(selectedItem.id);
                break;
            case 'discard':
                Inventory.discardItem(selectedItem.id);
                break;
        }

        selectedItem = null;
        update();
        updateActions();
    }

    function getItemIcon(item) {
        const icons = {
            weapon: '⚔',
            armor: '🛡',
            accessory: '💎',
            charm: '✧',
            consumable: '🧪'
        };
        return icons[item.slot] || '?';
    }

    function getSlotIcon(slot) {
        const icons = {
            weapon: '⚔',
            armor: '🛡',
            accessory: '💎',
            charm: '✧'
        };
        return icons[slot] || '?';
    }

    function getRarityColor(rarity) {
        const colors = {
            common: '#a0a0a0',
            uncommon: '#4aaa4a',
            rare: '#4a6faa',
            epic: '#9a4aaa',
            legendary: '#d4a574'
        };
        return colors[rarity] || '#ffffff';
    }

    return {
        init,
        open,
        close,
        toggle,
        update
    };
})();

// Expose to window
window.InventoryPanel = InventoryPanel;
