// inventory.js - Inventory and equipment system (adapted for 3D version)

const Inventory = (() => {
    const MAX_INVENTORY = 8;

    function addToInventory(itemId) {
        const state = GameEngine.getState();
        if (state.inventory.length >= MAX_INVENTORY) {
            HUD.showMessage('Inventory full!', 'error');
            return false;
        }
        state.inventory.push(itemId);
        HUD.updateInventory(state);
        return true;
    }

    function removeFromInventory(itemId) {
        const state = GameEngine.getState();
        const index = state.inventory.indexOf(itemId);
        if (index === -1) return false;
        state.inventory.splice(index, 1);
        HUD.updateInventory(state);
        return true;
    }

    function equipItem(itemId) {
        const state = GameEngine.getState();
        const item = DataManager.getItem(itemId);
        if (!item) { HUD.showMessage('Unknown item.', 'error'); return; }
        if (item.slot === 'consumable') { HUD.showMessage('Cannot equip consumables.', 'error'); return; }
        if (!state.inventory.includes(itemId)) { HUD.showMessage('Item not in inventory.', 'error'); return; }

        const slot = item.slot;
        const currentEquipped = state.equipment[slot];

        removeFromInventory(itemId);

        if (currentEquipped) {
            state.inventory.push(currentEquipped);
            const oldItem = DataManager.getItem(currentEquipped);
            if (oldItem) HUD.showMessage(`Unequipped ${oldItem.name}.`, 'system');
        }

        state.equipment[slot] = itemId;
        HUD.showMessage(`Equipped ${item.name} in ${slot} slot.`, 'success');
        updateMaxHp(state);
        HUD.updateInventory(state);
        HUD.updateStats(state);
    }

    function unequipItem(slot) {
        const state = GameEngine.getState();
        const itemId = state.equipment[slot];
        if (!itemId) { HUD.showMessage(`Nothing equipped in ${slot} slot.`, 'error'); return; }
        if (state.inventory.length >= MAX_INVENTORY) { HUD.showMessage('Inventory full!', 'error'); return; }

        state.equipment[slot] = null;
        state.inventory.push(itemId);
        const item = DataManager.getItem(itemId);
        if (item) HUD.showMessage(`Unequipped ${item.name}.`, 'system');

        updateMaxHp(state);
        HUD.updateInventory(state);
        HUD.updateStats(state);
    }

    function dismantleItem(itemId) {
        const state = GameEngine.getState();
        const item = DataManager.getItem(itemId);
        if (!item) { HUD.showMessage('Unknown item.', 'error'); return; }
        if (!state.inventory.includes(itemId)) { HUD.showMessage('Item not in inventory.', 'error'); return; }
        if (!item.on_dismantle || !item.on_dismantle.permanent_bonus) { HUD.showMessage('Cannot dismantle.', 'error'); return; }

        removeFromInventory(itemId);

        const bonuses = item.on_dismantle.permanent_bonus;
        for (const [stat, value] of Object.entries(bonuses)) {
            if (!state.permanentBonuses[stat]) state.permanentBonuses[stat] = 0;
            state.permanentBonuses[stat] += value;
        }
        state.itemsDismantled = (state.itemsDismantled || 0) + 1;

        const bonusStr = Object.entries(bonuses).map(([k, v]) => `${k} +${v}`).join(', ');
        HUD.showMessage(`Dismantled ${item.name}! Bonus: ${bonusStr}`, 'success');

        updateMaxHp(state);
        HUD.updateInventory(state);
        HUD.updateStats(state);
    }

    function consumeItem(itemId) {
        const state = GameEngine.getState();
        const item = DataManager.getItem(itemId);
        if (!item) { HUD.showMessage('Unknown item.', 'error'); return; }
        if (!state.inventory.includes(itemId)) { HUD.showMessage('Item not in inventory.', 'error'); return; }
        if (!item.on_consume) { HUD.showMessage('Cannot consume.', 'error'); return; }

        removeFromInventory(itemId);
        applyConsumeEffect(item.on_consume, state);
        HUD.updateInventory(state);
        HUD.updateStats(state);
    }

    function applyConsumeEffect(effect, state) {
        switch (effect.effect) {
            case 'heal':
                const healAmount = Math.min(effect.value, state.maxHp - state.hp);
                state.hp += healAmount;
                HUD.showMessage(`Healed for ${healAmount} HP!`, 'heal');
                Renderer3D.playHealEffect();
                break;
            case 'restore_mana':
                state.mana = Math.min(state.mana + effect.value, GameEngine.getPlayerStats().wisdom * 2);
                HUD.showMessage(`Restored ${effect.value} mana.`, 'mana');
                break;
            case 'cure_poison':
                if (state.inCombat && Combat.isPlayerPoisoned()) {
                    Combat.clearPlayerPoison();
                    HUD.showMessage('Poison cured!', 'success');
                } else {
                    HUD.showMessage('No poison to cure.', 'system');
                }
                break;
            case 'buff_strength':
                if (state.inCombat) {
                    if (!state.playerBuffs) state.playerBuffs = [];
                    state.playerBuffs.push({ effect: 'strength', value: effect.value, turnsLeft: effect.duration || 3 });
                    HUD.showMessage(`+${effect.value} Strength for ${effect.duration || 3} turns!`, 'success');
                } else {
                    if (!state.permanentBonuses.strength) state.permanentBonuses.strength = 0;
                    state.permanentBonuses.strength += 1;
                    HUD.showMessage(`+1 Strength permanently!`, 'success');
                }
                break;
            case 'buff_defense':
                if (state.inCombat) {
                    if (!state.playerBuffs) state.playerBuffs = [];
                    state.playerBuffs.push({ effect: 'defense', value: effect.value, turnsLeft: effect.duration || 3 });
                    HUD.showMessage(`+${effect.value} Defense for ${effect.duration || 3} turns!`, 'success');
                } else {
                    if (!state.permanentBonuses.defense) state.permanentBonuses.defense = 0;
                    state.permanentBonuses.defense += 1;
                    HUD.showMessage(`+1 Defense permanently!`, 'success');
                }
                break;
            case 'buff_speed':
                if (state.inCombat) {
                    if (!state.playerBuffs) state.playerBuffs = [];
                    state.playerBuffs.push({ effect: 'speed', value: effect.value, turnsLeft: effect.duration || 3 });
                    HUD.showMessage(`+${effect.value} Speed for ${effect.duration || 3} turns!`, 'success');
                } else {
                    if (!state.permanentBonuses.speed) state.permanentBonuses.speed = 0;
                    state.permanentBonuses.speed += 1;
                    HUD.showMessage(`+1 Speed permanently!`, 'success');
                }
                break;
            default:
                HUD.showMessage('Strange effect...', 'system');
        }
    }

    function discardItem(itemId) {
        const state = GameEngine.getState();
        const item = DataManager.getItem(itemId);
        if (!item) { HUD.showMessage('Unknown item.', 'error'); return; }
        if (!state.inventory.includes(itemId)) { HUD.showMessage('Item not in inventory.', 'error'); return; }

        removeFromInventory(itemId);
        const goldValue = Math.floor(DataManager.getRarityValue(item.rarity) * 0.1);
        state.gold += goldValue;
        HUD.showMessage(`Discarded ${item.name} for ${goldValue} gold.`, 'system');
        HUD.updateInventory(state);
        HUD.updateStats(state);
    }

    function getEquippedStats(state) {
        const stats = {};
        for (const itemId of Object.values(state.equipment)) {
            if (itemId) {
                const item = DataManager.getItem(itemId);
                if (item && item.stats) {
                    for (const [stat, value] of Object.entries(item.stats)) {
                        if (!stats[stat]) stats[stat] = 0;
                        stats[stat] += value;
                    }
                }
            }
        }
        return stats;
    }

    function getActiveSets(state) {
        const setCounts = {};
        for (const slot of Object.keys(state.equipment)) {
            const itemId = state.equipment[slot];
            if (!itemId) continue;
            const item = DataManager.getItem(itemId);
            if (item && item.set) {
                setCounts[item.set] = (setCounts[item.set] || 0) + 1;
            }
        }

        const activeSets = {};
        for (const [setId, count] of Object.entries(setCounts)) {
            const setData = DataManager.getSetBonus(setId);
            if (!setData) continue;

            if (count >= 4 && setData.bonuses[4]) {
                activeSets[setId] = { name: setData.name, pieces: count, tier: 4, maxPieces: setData.items.length, bonus: setData.bonuses[4] };
            } else if (count >= 2 && setData.bonuses[2]) {
                activeSets[setId] = { name: setData.name, pieces: count, tier: 2, maxPieces: setData.items.length, bonus: setData.bonuses[2] };
            } else {
                activeSets[setId] = { name: setData.name, pieces: count, tier: 0, maxPieces: setData.items.length, bonus: null };
            }
        }
        return activeSets;
    }

    function updateMaxHp(state) {
        const stats = GameEngine.getPlayerStats();
        const newMaxHp = stats.vitality;
        if (newMaxHp !== state.maxHp) {
            const diff = newMaxHp - state.maxHp;
            state.maxHp = newMaxHp;
            if (diff > 0) {
                state.hp = Math.min(state.hp + diff, state.maxHp);
            } else {
                state.hp = Math.min(state.hp, state.maxHp);
            }
        }
    }

    return {
        addToInventory,
        removeFromInventory,
        equipItem,
        unequipItem,
        dismantleItem,
        consumeItem,
        applyConsumeEffect,
        discardItem,
        getEquippedStats,
        getActiveSets,
        MAX_INVENTORY
    };
})();

// Expose to window for other modules
window.Inventory = Inventory;
