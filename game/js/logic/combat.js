// combat.js - Turn-based combat system (adapted for 3D version)

const Combat = (() => {
    let combatState = null;

    function startCombat(enemyId, savedHp) {
        const enemy = DataManager.getEnemy(enemyId);
        if (!enemy) {
            HUD.showMessage('ERROR: Unknown enemy.', 'error');
            return;
        }

        const state = GameEngine.getState();
        state.inCombat = true;
        state.currentEnemy = enemyId;

        const startHp = (typeof savedHp === 'number') ? savedHp : enemy.stats.hp;

        combatState = {
            enemyHp: startHp,
            enemyMaxHp: enemy.stats.hp,
            enemyBuffs: [],
            playerDebuffs: [],
            playerBuffs: [],
            playerPoison: 0,
            playerPoisonTurns: 0,
            playerPoisonStacks: 0,
            playerBleed: 0,
            playerBleedTurns: 0,
            playerBleedStacks: 0,
            playerDefenseDebuffStacks: 0,
            enemyPoison: 0,
            enemyPoisonTurns: 0,
            turnCount: 0,
            telegraphedAbility: null,
            abilityUses: {},
            frenzyTurns: 0
        };

        // Initialize ability uses
        if (enemy.abilities) {
            for (const ability of enemy.abilities) {
                if (ability.maxUses) {
                    combatState.abilityUses[ability.name] = ability.maxUses;
                }
            }
        }

        if (state.playerBuffs && state.playerBuffs.length > 0) {
            combatState.playerBuffs = [...state.playerBuffs];
            state.playerBuffs = [];
        }

        // Update 3D scene - enter void mode (room hidden during combat)
        Renderer3D.enterVoidMode();
        Renderer3D.showEnemy(enemy, combatState.enemyHp, combatState.enemyMaxHp);
        HUD.showCombatUI(true);
        HUD.showMessage(`A ${enemy.name} appears!`, 'combat');
        HUD.updateEnemyHP(combatState.enemyHp, combatState.enemyMaxHp, enemy.name);

        // Show turn order
        showTurnOrder(enemy);

        // Update HUD to enable combat buttons
        HUD.updateStats(state);
    }

    function showTurnOrder(enemy) {
        const stats = GameEngine.getPlayerStats();
        const playerSpeed = getEffectivePlayerSpeed(stats);
        const enemySpeed = getEffectiveEnemySpeed(enemy);

        if (playerSpeed >= enemySpeed) {
            HUD.showMessage(`You act first (Speed: ${playerSpeed} vs ${enemySpeed})`, 'system');
            HUD.showTurnIndicator(true);
        } else {
            HUD.showMessage(`Enemy acts first (Speed: ${enemySpeed} vs ${playerSpeed})`, 'system');
            HUD.showTurnIndicator(false);
        }
    }

    function playerAttack() {
        const state = GameEngine.getState();
        if (!state.inCombat || !combatState) return;

        const enemy = DataManager.getEnemy(state.currentEnemy);
        const stats = GameEngine.getPlayerStats();

        const enemySpeed = getEffectiveEnemySpeed(enemy);
        const playerSpeed = getEffectivePlayerSpeed(stats);
        const playerGoesFirst = playerSpeed >= enemySpeed;

        // Trigger attack animation
        Renderer3D.playAttackSpell('attack');

        if (playerGoesFirst) {
            if (doPlayerAttack(stats, enemy)) { checkCombatEnd(state, enemy); return; }
            if (checkCombatEnd(state, enemy)) return;
            doEnemyTurn(state, stats, enemy);
        } else {
            doEnemyTurn(state, stats, enemy);
            if (checkCombatEnd(state, enemy)) return;
            doPlayerAttack(stats, enemy);
        }

        applyTurnEffects(state, enemy);
        checkCombatEnd(state, enemy);
    }

    function doPlayerAttack(stats, enemy) {
        const enemyDef = getEffectiveEnemyDef(enemy);
        const playerStr = getEffectivePlayerStrength(stats);
        const rawDamage = playerStr - enemyDef + randomInt(-2, 2);
        const state = GameEngine.getState();
        let damage = Math.max(1 + Math.floor(state.floor / 2), rawDamage);

        let crit = false;
        if (Math.random() * 100 < stats.luck) {
            damage = Math.floor(damage * 1.5);
            crit = true;
        }

        combatState.enemyHp -= damage;

        if (crit) {
            HUD.showMessage(`CRITICAL HIT! ${damage} damage!`, 'critical');
            HUD.showFloatingNumber('enemy-info', damage, 'critical');
            Renderer3D.playEnemyHit(true);
        } else {
            HUD.showMessage(`You attack for ${damage} damage.`, 'damage');
            HUD.showFloatingNumber('enemy-info', damage, 'damage');
            Renderer3D.playEnemyHit(false);
        }

        if (stats.toxicity > 0) {
            const toxDmg = Math.floor(stats.toxicity / 2);
            if (toxDmg > 0) {
                combatState.enemyPoison = toxDmg;
                combatState.enemyPoisonTurns = 2;
                HUD.showMessage(`Poison applied: ${toxDmg} dmg/turn!`, 'success');
            }
        }

        HUD.updateEnemyHP(Math.max(0, combatState.enemyHp), combatState.enemyMaxHp);
        HUD.updateStats(state);

        return combatState.enemyHp <= 0;
    }

    function playerAbility(abilityType) {
        const state = GameEngine.getState();
        if (!state.inCombat || !combatState) return;

        const stats = GameEngine.getPlayerStats();
        const enemy = DataManager.getEnemy(state.currentEnemy);

        if (abilityType === 'arcane_bolt') {
            if (stats.wisdom < 8) { HUD.showMessage('Need WIS >= 8 for Arcane Bolt.', 'error'); return; }
            if (state.mana < 5) { HUD.showMessage('Not enough mana! (Need 5 MP)', 'error'); return; }
            Renderer3D.playAttackSpell('arcane');
        } else if (abilityType === 'heal') {
            if (stats.faith < 8) { HUD.showMessage('Need FAI >= 8 for Heal.', 'error'); return; }
            if (state.mana < 5) { HUD.showMessage('Not enough mana! (Need 5 MP)', 'error'); return; }
            if (state.hp >= state.maxHp) { HUD.showMessage('Already at full health.', 'system'); return; }
            Renderer3D.playHealEffect();
        }

        const enemySpeed = getEffectiveEnemySpeed(enemy);
        const playerSpeed = getEffectivePlayerSpeed(stats);
        const playerGoesFirst = playerSpeed >= enemySpeed;

        if (playerGoesFirst) {
            if (doPlayerAbility(abilityType, state, stats, enemy)) { checkCombatEnd(state, enemy); return; }
            if (checkCombatEnd(state, enemy)) return;
            doEnemyTurn(state, stats, enemy);
        } else {
            doEnemyTurn(state, stats, enemy);
            if (checkCombatEnd(state, enemy)) return;
            doPlayerAbility(abilityType, state, stats, enemy);
        }

        applyTurnEffects(state, enemy);
        checkCombatEnd(state, enemy);
    }

    function doPlayerAbility(abilityType, state, stats, enemy) {
        if (abilityType === 'arcane_bolt') {
            state.mana -= 5;
            const enemyDef = getEffectiveEnemyDef(enemy);
            const damage = Math.max(1, Math.floor(stats.wisdom * 0.8 - enemyDef * 0.5 + randomInt(-1, 1)));
            combatState.enemyHp -= damage;

            HUD.showMessage(`Arcane Bolt hits for ${damage} damage! (-5 MP)`, 'mana');
            HUD.showFloatingNumber('enemy-info', damage, 'mana');
            Renderer3D.playEnemyHit(false);
            HUD.updateEnemyHP(Math.max(0, combatState.enemyHp), combatState.enemyMaxHp);
            HUD.updateStats(state);

            return combatState.enemyHp <= 0;

        } else if (abilityType === 'heal') {
            state.mana -= 5;
            const healAmount = Math.floor(stats.faith * 1.5);
            const actualHeal = Math.min(healAmount, state.maxHp - state.hp);
            state.hp += actualHeal;

            HUD.showMessage(`Healed for ${actualHeal} HP! (-5 MP)`, 'heal');
            HUD.showFloatingNumber('player-stats', actualHeal, 'heal');
            HUD.updateStats(state);

            return false;
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════════
    // COLOR SPELL CASTING - Chromatic Resonance System
    // ═══════════════════════════════════════════════════════════════

    function castColorSpell(colorType) {
        const state = GameEngine.getState();
        if (!state.inCombat || !combatState) return;

        // Get color data
        const colorData = ColorSystem.getColorData(colorType);
        if (!colorData) {
            HUD.showMessage('Unknown color type!', 'error');
            return;
        }

        // Check if player has this color
        const inventory = ColorSystem.getInventory();
        if (inventory[colorType] < 1) {
            HUD.showMessage(`No ${colorData.name} essence available!`, 'error');
            return;
        }

        const stats = GameEngine.getPlayerStats();
        const enemy = DataManager.getEnemy(state.currentEnemy);

        // Special check for heal - don't waste if at full HP
        if (colorData.effect === 'heal' && state.hp >= state.maxHp) {
            HUD.showMessage('Already at full health!', 'system');
            return;
        }

        // Consume the color particle
        const useResult = ColorSystem.useColor(colorType, 1);
        if (!useResult.success) {
            return;
        }

        // Play spell effect based on color
        playColorSpellEffect(colorType, colorData);

        const enemySpeed = getEffectiveEnemySpeed(enemy);
        const playerSpeed = getEffectivePlayerSpeed(stats);
        const playerGoesFirst = playerSpeed >= enemySpeed;

        if (playerGoesFirst) {
            if (doColorSpell(colorType, colorData, state, stats, enemy)) {
                checkCombatEnd(state, enemy);
                return;
            }
            if (checkCombatEnd(state, enemy)) return;
            doEnemyTurn(state, stats, enemy);
        } else {
            doEnemyTurn(state, stats, enemy);
            if (checkCombatEnd(state, enemy)) return;
            doColorSpell(colorType, colorData, state, stats, enemy);
        }

        applyTurnEffects(state, enemy);
        checkCombatEnd(state, enemy);
    }

    function playColorSpellEffect(colorType, colorData) {
        // Use bubble attacks for offensive colors, heal effects for support
        switch (colorType) {
            case 'verdant':
                // Verdant is healing - use heal effect
                Renderer3D.playHealEffect();
                break;
            case 'ivory':
                // Ivory is shielding - use heal effect
                Renderer3D.playHealEffect();
                break;
            default:
                // All other colors use bubble attack
                Renderer3D.playBubbleAttack(colorType);
                // Also play bubble impact after delay
                setTimeout(() => {
                    Renderer3D.playBubbleImpact(colorType);
                }, 400);
        }
    }

    // Get enemy's color affinity based on their type/characteristics
    function getEnemyColorAffinity(enemy) {
        // Map enemies to their elemental affinity
        const affinities = {
            // Undead tend toward Azure (cold, death)
            'shambling-skeleton': 'azure',
            'skeletal-archer': 'azure',
            'bone-knight': 'azure',
            'revenant': 'azure',
            // Living creatures toward Verdant (nature)
            'tomb-rat': 'verdant',
            'grave-worm': 'verdant',
            'corpse-crawler': 'verdant',
            // Magic users toward Violet (arcane)
            'shadow-wisp': 'violet',
            'death-acolyte': 'violet',
            'lich-lord': 'violet',
            // Feral creatures toward Crimson (aggression)
            'crypt-ghoul': 'crimson'
        };
        return affinities[enemy.id] || 'ivory'; // Default to ivory (neutral)
    }

    // Apply type effectiveness to damage
    function applyEffectiveness(baseDamage, colorType, enemy) {
        const enemyAffinity = getEnemyColorAffinity(enemy);
        const effectiveness = ColorSystem.getEffectiveness(colorType, enemyAffinity);
        const finalDamage = Math.round(baseDamage * effectiveness);

        // Show effectiveness message
        const effectInfo = ColorSystem.getEffectivenessText(colorType, enemyAffinity);
        if (effectInfo.text) {
            setTimeout(() => {
                HUD.showMessage(effectInfo.text, effectInfo.class === 'super-effective' ? 'critical' : 'system');
            }, 100);
        }

        return { damage: finalDamage, multiplier: effectiveness, enemyAffinity };
    }

    function doColorSpell(colorType, colorData, state, stats, enemy) {
        const colorName = colorData.name;

        switch (colorData.effect) {
            case 'burn': // Crimson - Fire damage + DoT
                return doFireSpell(colorData, state, stats, enemy);

            case 'slow': // Azure - Ice damage + slow
                return doIceSpell(colorData, state, stats, enemy);

            case 'heal': // Verdant - Healing
                return doHealSpell(colorData, state, stats);

            case 'haste': // Amber - Lightning + speed buff
                return doLightningSpell(colorData, state, stats, enemy);

            case 'pierce': // Violet - Arcane piercing damage
                return doArcaneSpell(colorData, state, stats, enemy);

            case 'shield': // Ivory - Defense buff
                return doShieldSpell(colorData, state, stats);

            default:
                // Generic damage spell
                return doGenericColorSpell(colorData, state, stats, enemy, colorType);
        }
    }

    function doFireSpell(colorData, state, stats, enemy) {
        const baseDamage = colorData.damage;
        const bonus = Math.floor(stats.wisdom * 0.3);
        const rawDamage = baseDamage + bonus + randomInt(-2, 2);

        // Apply type effectiveness
        const { damage, multiplier } = applyEffectiveness(rawDamage, 'crimson', enemy);

        combatState.enemyHp -= damage;
        const effectText = multiplier > 1 ? ' (Super Effective!)' : multiplier < 1 ? ' (Not Effective...)' : '';
        HUD.showMessage(`${colorData.name} Blaze hits for ${damage} damage!${effectText}`, multiplier > 1 ? 'critical' : 'damage');
        HUD.showFloatingNumber('enemy-info', damage, multiplier > 1 ? 'critical' : 'damage');
        Renderer3D.playEnemyHit(multiplier > 1);

        // Apply burn DoT
        if (!combatState.enemyBurn) combatState.enemyBurn = 0;
        if (!combatState.enemyBurnTurns) combatState.enemyBurnTurns = 0;

        combatState.enemyBurn = Math.min(combatState.enemyBurn + 3, 6);
        combatState.enemyBurnTurns = 3;
        HUD.showMessage(`Enemy is burning! (${combatState.enemyBurn} dmg/turn)`, 'damage');

        HUD.updateEnemyHP(Math.max(0, combatState.enemyHp), combatState.enemyMaxHp);
        HUD.updateStats(state);

        return combatState.enemyHp <= 0;
    }

    function doIceSpell(colorData, state, stats, enemy) {
        const baseDamage = colorData.damage;
        const bonus = Math.floor(stats.wisdom * 0.2);
        const rawDamage = baseDamage + bonus + randomInt(-1, 1);

        // Apply type effectiveness
        const { damage, multiplier } = applyEffectiveness(rawDamage, 'azure', enemy);

        combatState.enemyHp -= damage;
        const effectText = multiplier > 1 ? ' (Super Effective!)' : multiplier < 1 ? ' (Not Effective...)' : '';
        HUD.showMessage(`${colorData.name} Frost hits for ${damage} damage!${effectText}`, multiplier > 1 ? 'critical' : 'mana');
        HUD.showFloatingNumber('enemy-info', damage, multiplier > 1 ? 'critical' : 'mana');
        Renderer3D.playEnemyHit(multiplier > 1);

        // Apply slow debuff to enemy
        if (!combatState.enemySlowed) combatState.enemySlowed = 0;
        combatState.enemySlowed = 3; // 3 turns of slow
        HUD.showMessage(`Enemy is slowed for 3 turns!`, 'mana');

        HUD.updateEnemyHP(Math.max(0, combatState.enemyHp), combatState.enemyMaxHp);
        HUD.updateStats(state);

        return combatState.enemyHp <= 0;
    }

    function doHealSpell(colorData, state, stats) {
        const baseHeal = colorData.healAmount || 15;
        const bonus = Math.floor(stats.faith * 0.5);
        const healAmount = baseHeal + bonus;
        const actualHeal = Math.min(healAmount, state.maxHp - state.hp);

        state.hp += actualHeal;
        HUD.showMessage(`${colorData.name} Essence heals for ${actualHeal} HP!`, 'heal');
        HUD.showFloatingNumber('player-stats', actualHeal, 'heal');
        HUD.updateStats(state);

        return false; // Heal never kills enemy
    }

    function doLightningSpell(colorData, state, stats, enemy) {
        const baseDamage = colorData.damage;
        const bonus = Math.floor(stats.speed * 0.3);
        const rawDamage = baseDamage + bonus + randomInt(-1, 2);

        // Apply type effectiveness
        const { damage, multiplier } = applyEffectiveness(rawDamage, 'amber', enemy);

        combatState.enemyHp -= damage;
        const effectText = multiplier > 1 ? ' (Super Effective!)' : multiplier < 1 ? ' (Not Effective...)' : '';
        HUD.showMessage(`${colorData.name} Bolt strikes for ${damage} damage!${effectText}`, 'critical');
        HUD.showFloatingNumber('enemy-info', damage, 'critical');
        Renderer3D.playEnemyHit(multiplier > 1);

        // Apply haste buff to player
        combatState.playerBuffs.push({
            effect: 'speed',
            value: 3,
            turnsLeft: 3
        });
        HUD.showMessage(`Haste! +3 Speed for 3 turns!`, 'success');

        HUD.updateEnemyHP(Math.max(0, combatState.enemyHp), combatState.enemyMaxHp);
        HUD.updateStats(state);

        return combatState.enemyHp <= 0;
    }

    function doArcaneSpell(colorData, state, stats, enemy) {
        // Violet ignores defense but still affected by type matchups
        const baseDamage = colorData.damage;
        const bonus = Math.floor(stats.wisdom * 0.4);
        const rawDamage = baseDamage + bonus + randomInt(-1, 3);

        // Apply type effectiveness
        const { damage, multiplier } = applyEffectiveness(rawDamage, 'violet', enemy);

        combatState.enemyHp -= damage;
        const effectText = multiplier > 1 ? ' (Super Effective!)' : multiplier < 1 ? ' (Not Effective...)' : '';
        HUD.showMessage(`${colorData.name} Ray pierces for ${damage} TRUE damage!${effectText}`, 'critical');
        HUD.showFloatingNumber('enemy-info', damage, 'critical');
        Renderer3D.playEnemyHit(true); // Always critical effect for arcane

        HUD.updateEnemyHP(Math.max(0, combatState.enemyHp), combatState.enemyMaxHp);
        HUD.updateStats(state);

        return combatState.enemyHp <= 0;
    }

    function doShieldSpell(colorData, state, stats) {
        const shieldAmount = colorData.shieldAmount || 10;
        const bonus = Math.floor(stats.defense * 0.3);
        const totalShield = shieldAmount + bonus;

        // Apply defense buff
        combatState.playerBuffs.push({
            effect: 'defense',
            value: totalShield,
            turnsLeft: 3
        });

        HUD.showMessage(`${colorData.name} Shield grants +${totalShield} Defense for 3 turns!`, 'success');
        HUD.updateStats(state);

        return false; // Shield never kills enemy
    }

    function doGenericColorSpell(colorData, state, stats, enemy, colorType) {
        const baseDamage = colorData.damage || 8;
        const rawDamage = baseDamage + randomInt(-2, 2);

        // Apply type effectiveness if we know the color type
        const { damage, multiplier } = colorType
            ? applyEffectiveness(rawDamage, colorType, enemy)
            : { damage: rawDamage, multiplier: 1 };

        combatState.enemyHp -= damage;
        const effectText = multiplier > 1 ? ' (Super Effective!)' : multiplier < 1 ? ' (Not Effective...)' : '';
        HUD.showMessage(`${colorData.name} Pulse hits for ${damage} damage!${effectText}`, multiplier > 1 ? 'critical' : 'damage');
        HUD.showFloatingNumber('enemy-info', damage, multiplier > 1 ? 'critical' : 'damage');
        Renderer3D.playEnemyHit(multiplier > 1);

        HUD.updateEnemyHP(Math.max(0, combatState.enemyHp), combatState.enemyMaxHp);
        HUD.updateStats(state);

        return combatState.enemyHp <= 0;
    }

    // ═══════════════════════════════════════════════════════════════

    function playerFlee() {
        const state = GameEngine.getState();
        if (!state.inCombat || !combatState) return;

        const enemy = DataManager.getEnemy(state.currentEnemy);

        if (enemy.boss) {
            HUD.showMessage("The Lich Lord's power holds you in place!", 'combat');
            return;
        }

        const stats = GameEngine.getPlayerStats();
        const enemySpeed = enemy.stats.speed;
        let fleeChance = 40 + (stats.speed - enemySpeed) * 5;
        fleeChance = Math.max(20, Math.min(90, fleeChance));

        if (Math.random() * 100 < fleeChance) {
            HUD.showMessage('You escape successfully!', 'success');
            if (combatState && combatState.enemyHp > 0 && combatState.enemyHp < enemy.stats.hp) {
                if (!state.damagedEnemies) state.damagedEnemies = {};
                state.damagedEnemies[state.currentRoom] = { enemyId: state.currentEnemy, hp: combatState.enemyHp };
            }
            endCombat(false);

            if (state.previousRoom) {
                HUD.showMessage('Retreating...', 'system');
                setTimeout(() => GameEngine.enterRoom(state.previousRoom), 500);
            }
        } else {
            HUD.showMessage('Failed to escape!', 'error');
            doEnemyTurn(state, stats, enemy);
            applyTurnEffects(state, enemy);
            checkCombatEnd(state, enemy);
        }
    }

    function selectEnemyAction(enemy) {
        if (!enemy.abilities || enemy.abilities.length === 0) return null;

        const hpPercent = combatState.enemyHp / combatState.enemyMaxHp;
        const baseChance = enemy.boss ? 0.5 : 0.35;
        const abilityChance = hpPercent < 0.5 ? (enemy.boss ? 0.7 : 0.6) : baseChance;

        if (Math.random() > abilityChance) return null;

        // Filter to abilities with uses remaining
        const available = enemy.abilities.filter(a => {
            const uses = combatState.abilityUses[a.name];
            return uses === undefined || uses > 0;
        });

        if (available.length === 0) return null;

        // Weighted random selection
        const totalWeight = available.reduce((s, a) => s + a.chance, 0);
        let roll = Math.random() * totalWeight;
        for (const ability of available) {
            roll -= ability.chance;
            if (roll <= 0) {
                if (combatState.abilityUses[ability.name] !== undefined) {
                    combatState.abilityUses[ability.name]--;
                }
                return ability;
            }
        }
        const last = available[available.length - 1];
        if (combatState.abilityUses[last.name] !== undefined) {
            combatState.abilityUses[last.name]--;
        }
        return last;
    }

    function doEnemyTurn(state, playerStats, enemy) {
        if (!combatState || combatState.enemyHp <= 0) return;

        const effectiveDef = getEffectivePlayerDef(playerStats);
        const enemyAtk = getEffectiveEnemyAtk(enemy);

        // Check for telegraphed ability
        if (combatState.telegraphedAbility) {
            const ability = combatState.telegraphedAbility;
            combatState.telegraphedAbility = null;
            HUD.showMessage(`${enemy.name} unleashes ${ability.name}!`, 'combat');
            applyEnemyAbility(ability, state, enemy);

            // Play enemy attack with their color affinity
            const enemyAffinity = getEnemyColorAffinity(enemy);
            Renderer3D.playEnemyAttack(enemyAffinity);
            HUD.updateStats(state);
            return;
        }

        // Select ability using smarter logic
        const selectedAbility = selectEnemyAction(enemy);

        if (selectedAbility) {
            combatState.telegraphedAbility = selectedAbility;
            HUD.showMessage(`${enemy.name} is preparing ${selectedAbility.name}!`, 'combat');
        }

        // Basic attack (always happens, even when telegraphing)
        const frenzyActive = combatState.frenzyTurns > 0;
        const attacks = frenzyActive ? 2 : 1;

        for (let i = 0; i < attacks; i++) {
            const rawDamage = enemyAtk - effectiveDef + randomInt(-2, 2);
            const damage = Math.max(1, rawDamage);
            state.hp = Math.max(0, state.hp - damage);

            if (frenzyActive && i === 0) {
                HUD.showMessage(`${enemy.name} attacks in a frenzy for ${damage} damage!`, 'combat');
            } else if (frenzyActive && i === 1) {
                HUD.showMessage(`${enemy.name} strikes again for ${damage}!`, 'combat');
            } else {
                HUD.showMessage(`${enemy.name} attacks for ${damage} damage!`, 'combat');
            }

            HUD.showFloatingNumber('player-stats', damage, 'damage');

            // Play enemy attack with their color affinity for visual effect
            const enemyAffinity = getEnemyColorAffinity(enemy);
            Renderer3D.playEnemyAttack(enemyAffinity);
            Renderer3D.shakeCamera();

            if (state.hp <= 0) break;
        }

        // Tick frenzy
        if (combatState.frenzyTurns > 0) {
            combatState.frenzyTurns--;
            if (combatState.frenzyTurns <= 0) {
                HUD.showMessage(`${enemy.name}'s frenzy subsides.`, 'system');
            }
        }

        HUD.updateStats(state);
    }

    function applyEnemyAbility(ability, state, enemy) {
        switch (ability.effect) {
            case 'reduce_defense':
                if (combatState.playerDefenseDebuffStacks >= 3) {
                    HUD.showMessage(`Defenses cannot weaken further!`, 'system');
                    break;
                }
                combatState.playerDefenseDebuffStacks++;
                combatState.playerDebuffs.push({ effect: 'defense', value: ability.value, turnsLeft: ability.duration || 3 });
                HUD.showMessage(`Defense reduced by ${ability.value} for ${ability.duration || 3} turns!`, 'combat');
                break;

            case 'poison':
                if ((combatState.playerPoisonStacks || 0) >= 2) {
                    HUD.showMessage(`Poison cannot intensify further.`, 'system');
                    break;
                }
                combatState.playerPoisonStacks = (combatState.playerPoisonStacks || 0) + 1;
                combatState.playerPoison = Math.min(combatState.playerPoison + ability.value, ability.value * 2);
                combatState.playerPoisonTurns = ability.duration || 3;
                HUD.showMessage(`Poisoned! ${combatState.playerPoison} dmg/turn (${combatState.playerPoisonStacks}/2 stacks)`, 'combat');
                break;

            case 'bleed':
                if ((combatState.playerBleedStacks || 0) >= 2) {
                    HUD.showMessage(`Bleeding cannot intensify further.`, 'system');
                    break;
                }
                combatState.playerBleedStacks = (combatState.playerBleedStacks || 0) + 1;
                combatState.playerBleed = Math.min((combatState.playerBleed || 0) + ability.value, ability.value * 2);
                combatState.playerBleedTurns = ability.duration || 3;
                HUD.showMessage(`Bleeding! ${combatState.playerBleed} dmg/turn`, 'combat');
                break;

            case 'heal':
                const healAmount = Math.min(ability.value, combatState.enemyMaxHp - combatState.enemyHp);
                if (healAmount <= 0) break;
                combatState.enemyHp += healAmount;
                HUD.showMessage(`${enemy.name} heals for ${healAmount} HP!`, 'combat');
                HUD.showFloatingNumber('enemy-info', healAmount, 'heal');
                HUD.updateEnemyHP(combatState.enemyHp, combatState.enemyMaxHp);
                break;

            case 'power_up':
                combatState.enemyBuffs.push({ effect: 'attack', value: ability.value, turnsLeft: ability.duration || 3 });
                HUD.showMessage(`${enemy.name}'s attack increased by ${ability.value}!`, 'combat');
                break;

            case 'void_shield':
                combatState.enemyBuffs.push({ effect: 'defense', value: ability.value, turnsLeft: ability.duration || 3 });
                HUD.showMessage(`${enemy.name} summons a Void Shield! +${ability.value} Defense for ${ability.duration || 3} turns!`, 'combat');
                break;

            case 'raise_dead': {
                const raiseDamage = ability.value + randomInt(-2, 2);
                const actualDmg = Math.max(1, raiseDamage);
                state.hp = Math.max(0, state.hp - actualDmg);
                HUD.showMessage(`${enemy.name} raises skeletal minions! They attack for ${actualDmg} damage!`, 'combat');
                HUD.showFloatingNumber('player-stats', actualDmg, 'damage');
                Renderer3D.shakeCamera();
                break;
            }

            case 'frenzy':
                combatState.frenzyTurns = ability.duration || 2;
                combatState.enemyBuffs.push({ effect: 'attack', value: ability.value, turnsLeft: ability.duration || 2 });
                HUD.showMessage(`${enemy.name} enters a FRENZY! Double attacks for ${ability.duration || 2} turns!`, 'critical');
                break;
        }
    }

    function applyTurnEffects(state, enemy) {
        if (!combatState) return;

        // Player poison
        if (combatState.playerPoisonTurns > 0) {
            state.hp = Math.max(0, state.hp - combatState.playerPoison);
            HUD.showMessage(`Poison deals ${combatState.playerPoison} damage!`, 'damage');
            HUD.showFloatingNumber('player-stats', combatState.playerPoison, 'damage');
            combatState.playerPoisonTurns--;
            if (combatState.playerPoisonTurns <= 0) {
                combatState.playerPoison = 0;
                combatState.playerPoisonStacks = 0;
                HUD.showMessage('Poison wears off.', 'system');
            }
        }

        // Player bleed
        if (combatState.playerBleedTurns > 0) {
            state.hp = Math.max(0, state.hp - combatState.playerBleed);
            HUD.showMessage(`Bleeding deals ${combatState.playerBleed} damage!`, 'damage');
            HUD.showFloatingNumber('player-stats', combatState.playerBleed, 'damage');
            combatState.playerBleedTurns--;
            if (combatState.playerBleedTurns <= 0) {
                combatState.playerBleed = 0;
                combatState.playerBleedStacks = 0;
                HUD.showMessage('Bleeding stops.', 'system');
            }
        }

        // Enemy poison
        if (combatState.enemyPoisonTurns > 0) {
            combatState.enemyHp -= combatState.enemyPoison;
            HUD.showMessage(`Poison deals ${combatState.enemyPoison} to ${enemy.name}!`, 'success');
            combatState.enemyPoisonTurns--;
            if (combatState.enemyPoisonTurns <= 0) {
                combatState.enemyPoison = 0;
                HUD.showMessage('Enemy poison wears off.', 'system');
            }
            HUD.updateEnemyHP(Math.max(0, combatState.enemyHp), combatState.enemyMaxHp);
        }

        // Enemy burn (from Crimson fire spells)
        if (combatState.enemyBurnTurns > 0) {
            combatState.enemyHp -= combatState.enemyBurn;
            HUD.showMessage(`Burn deals ${combatState.enemyBurn} to ${enemy.name}!`, 'damage');
            combatState.enemyBurnTurns--;
            if (combatState.enemyBurnTurns <= 0) {
                combatState.enemyBurn = 0;
                HUD.showMessage('Enemy burn fades.', 'system');
            }
            HUD.updateEnemyHP(Math.max(0, combatState.enemyHp), combatState.enemyMaxHp);
        }

        // Enemy slow countdown (from Azure ice spells)
        if (combatState.enemySlowed > 0) {
            combatState.enemySlowed--;
            if (combatState.enemySlowed <= 0) {
                HUD.showMessage(`${enemy.name} is no longer slowed.`, 'system');
            }
        }

        // Tick debuffs
        combatState.playerDebuffs = combatState.playerDebuffs.filter(d => {
            d.turnsLeft--;
            if (d.turnsLeft <= 0) {
                if (d.effect === 'defense') combatState.playerDefenseDebuffStacks = Math.max(0, combatState.playerDefenseDebuffStacks - 1);
                HUD.showMessage(`Defense debuff wears off.`, 'system');
                return false;
            }
            return true;
        });

        // Tick enemy buffs
        combatState.enemyBuffs = combatState.enemyBuffs.filter(b => {
            b.turnsLeft--;
            if (b.turnsLeft <= 0) {
                HUD.showMessage(`${enemy.name}'s ${b.effect} buff wears off.`, 'system');
                return false;
            }
            return true;
        });

        // Tick player buffs
        if (combatState.playerBuffs) {
            combatState.playerBuffs = combatState.playerBuffs.filter(b => {
                b.turnsLeft--;
                if (b.turnsLeft <= 0) {
                    HUD.showMessage(`Your ${b.effect} buff wears off.`, 'system');
                    return false;
                }
                return true;
            });
        }

        combatState.turnCount++;
        HUD.updateStats(state);
    }

    function checkCombatEnd(state, enemy) {
        if (combatState.enemyHp <= 0) {
            handleVictory(state, enemy);
            return true;
        }
        if (state.hp <= 0) {
            endCombat(false);
            GameEngine.checkDeath();
            return true;
        }
        return false;
    }

    function handleVictory(state, enemy) {
        HUD.showMessage(`You defeated the ${enemy.name}!`, 'success');
        Renderer3D.playEnemyDeath();

        state.enemiesDefeated = (state.enemiesDefeated || 0) + 1;

        // Award XP for defeating the enemy
        if (window.Progression) {
            Progression.awardEnemyDefeatXP(enemy);
        }

        const damagedEntry = state.damagedEnemies && state.damagedEnemies[state.currentRoom];
        const skipItemLoot = !!damagedEntry;

        if (state.damagedEnemies && state.damagedEnemies[state.currentRoom]) {
            delete state.damagedEnemies[state.currentRoom];
        }

        if (!state.clearedEncounters.includes(state.currentRoom)) {
            state.clearedEncounters.push(state.currentRoom);
        }

        // Play the room reveal animation - "paint splash" effect
        // Also animate the bleaching mechanic - color bleeds back
        // Delay loot and gold until reveal starts
        setTimeout(() => {
            // Bleaching mechanic - animate color restoration
            Renderer3D.animateColorRestore(1500);

            Renderer3D.playRoomReveal(() => {
                // Callback when reveal completes
                HUD.showMessage('Colors flow back into the world...', 'success');
            });

            // Gold drop (show after brief delay during reveal)
            setTimeout(() => {
                const goldMin = enemy.gold_drop[0];
                const goldMax = enemy.gold_drop[1];
                const goldDrop = randomInt(goldMin, goldMax);
                const oldGold = state.gold;
                state.gold += goldDrop;
                HUD.showMessage(`Found ${goldDrop} gold!`, 'success');
                HUD.animateGoldChange(oldGold, state.gold);

                // Loot drops
                let drops = [];
                if (skipItemLoot) {
                    HUD.showMessage('Enemy already looted.', 'system');
                } else {
                    drops = generateLootDrops(enemy, state);
                }

                endCombat(true);
                collectLoot(drops, state);
            }, 800); // Show loot partway through reveal
        }, 500); // Brief delay after enemy death before reveal starts
    }

    function generateLootDrops(enemy, state) {
        const stats = GameEngine.getPlayerStats();
        const luck = stats.luck;
        const lootTier = enemy.loot_tier || 'common';

        let dropCount = 1;
        const extraDropChance = 30 + Math.floor(luck / 5) * 10;
        if (Math.random() * 100 < extraDropChance) dropCount = 2;

        const drops = [];
        for (let i = 0; i < dropCount; i++) {
            const guaranteeTier = (enemy.boss === true && i === 0);
            const rarity = rollRarity(luck, state.floor, lootTier, guaranteeTier);
            const pool = DataManager.getItemsByRarity(rarity);
            if (pool.length > 0) {
                const item = pool[randomInt(0, pool.length - 1)];
                drops.push(item);
            }
        }
        return drops;
    }

    const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

    function rollRarity(luck, floor, lootTier, guaranteeTier) {
        let common = 38, uncommon = 34, rare = 17, epic = 9, legendary = 2;

        const luckShift = luck;
        common -= luckShift;
        uncommon += Math.floor(luckShift * 0.4);
        rare += Math.floor(luckShift * 0.3);
        epic += Math.floor(luckShift * 0.2);
        legendary += Math.floor(luckShift * 0.1);

        if (floor >= 2) { common -= 5; rare += 3; epic += 2; }
        if (floor >= 3) { common -= 10; rare += 5; epic += 3; legendary += 2; }

        common = Math.max(5, common);

        const total = common + uncommon + rare + epic + legendary;
        let roll = Math.random() * total;

        let result;
        if (roll < common) result = 'common';
        else { roll -= common;
        if (roll < uncommon) result = 'uncommon';
        else { roll -= uncommon;
        if (roll < rare) result = 'rare';
        else { roll -= rare;
        if (roll < epic) result = 'epic';
        else result = 'legendary'; } } }

        if (lootTier) {
            const resultIdx = RARITY_ORDER.indexOf(result);
            const tierIdx = RARITY_ORDER.indexOf(lootTier);
            if (tierIdx > resultIdx && (guaranteeTier || Math.random() < 0.5)) {
                result = lootTier;
            }
        }

        return result;
    }

    function collectLoot(drops, state) {
        if (drops.length === 0) {
            GameEngine.checkFloorProgress();
            return;
        }

        for (const drop of drops) {
            const item = DataManager.getItem(drop.id);
            if (!item) continue;

            if (item.rarity === 'legendary') {
                HUD.showLegendaryDrop(item);
            }

            if (Inventory.addToInventory(drop.id)) {
                const statStr = Object.entries(item.stats).filter(([k, v]) => v !== 0).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(', ');
                HUD.showMessage(`Picked up: ${item.name} (${item.rarity}) [${statStr}]`, 'success');
            } else {
                if (!state.groundItems) state.groundItems = {};
                if (!state.groundItems[state.currentRoom]) state.groundItems[state.currentRoom] = [];
                state.groundItems[state.currentRoom].push({ itemId: drop.id, rarity: item.rarity });
                HUD.showMessage(`Inventory full! ${item.name} falls to the ground.`, 'error');
            }
        }

        HUD.updateInventory(state);
        HUD.updateStats(state);
        GameEngine.checkFloorProgress();
    }

    function endCombat(victory) {
        const state = GameEngine.getState();
        state.inCombat = false;
        state.currentEnemy = null;
        combatState = null;

        Renderer3D.hideEnemy();
        HUD.showCombatUI(false);
        HUD.updateStats(state);

        // Exit void mode if not victory (flee/death) - victory uses reveal animation
        if (!victory) {
            Renderer3D.exitVoidMode();
        }

        if (victory) GameEngine.saveGame(true);
    }

    // --- Helpers ---
    function getEffectivePlayerDef(stats) {
        let def = stats.defense;
        if (combatState) {
            for (const debuff of combatState.playerDebuffs) {
                if (debuff.effect === 'defense') def -= debuff.value;
            }
            if (combatState.playerBuffs) {
                for (const buff of combatState.playerBuffs) {
                    if (buff.effect === 'defense') def += buff.value;
                }
            }
        }
        return Math.max(0, def);
    }

    function getEffectivePlayerStrength(stats) {
        let str = stats.strength;
        if (combatState && combatState.playerBuffs) {
            for (const buff of combatState.playerBuffs) {
                if (buff.effect === 'strength') str += buff.value;
            }
        }
        return str;
    }

    function getEffectiveEnemyDef(enemy) {
        let def = enemy.stats.defense;
        if (combatState) {
            for (const buff of combatState.enemyBuffs) {
                if (buff.effect === 'defense') def += buff.value;
            }
        }
        return def;
    }

    function getEffectiveEnemyAtk(enemy) {
        let atk = enemy.stats.attack;
        if (combatState) {
            for (const buff of combatState.enemyBuffs) {
                if (buff.effect === 'attack') atk += buff.value;
            }
        }
        return atk;
    }

    function getEffectiveEnemySpeed(enemy) {
        let speed = enemy.stats.speed;
        // Apply slow debuff from Azure ice spells
        if (combatState && combatState.enemySlowed > 0) {
            speed = Math.max(1, Math.floor(speed * 0.5)); // 50% speed reduction
        }
        return speed;
    }

    function getEffectivePlayerSpeed(stats) {
        let speed = stats.speed;
        if (combatState && combatState.playerBuffs) {
            for (const buff of combatState.playerBuffs) {
                if (buff.effect === 'speed') speed += buff.value;
            }
        }
        return speed;
    }

    function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

    function clearPlayerPoison() {
        if (combatState && combatState.playerPoisonTurns > 0) {
            combatState.playerPoison = 0;
            combatState.playerPoisonTurns = 0;
            combatState.playerPoisonStacks = 0;
            return true;
        }
        return false;
    }

    function isPlayerPoisoned() { return combatState && combatState.playerPoisonTurns > 0; }

    function getCombatState() { return combatState; }

    return {
        startCombat,
        playerAttack,
        playerAbility,
        castColorSpell,
        playerFlee,
        clearPlayerPoison,
        isPlayerPoisoned,
        getCombatState,
        rollRarity,
        // Type effectiveness helpers
        getEnemyColorAffinity,
        applyEffectiveness
    };
})();

// Expose to window for other modules
window.Combat = Combat;
