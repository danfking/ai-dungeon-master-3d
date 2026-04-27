// stats.js - D&D-style stat check system (ported from ai-dungeon-master)

const Stats = (() => {
    const STAT_MAP = {
        str: 'strength',
        dex: 'dexterity',
        con: 'constitution',
        int: 'intelligence',
        wis: 'wisdom',
        cha: 'charisma',
        lck: 'luck'
    };

    const STAT_ABBREV = {
        strength: 'STR',
        dexterity: 'DEX',
        constitution: 'CON',
        intelligence: 'INT',
        wisdom: 'WIS',
        charisma: 'CHA',
        luck: 'LCK',
        vitality: 'CON',
        speed: 'DEX'
    };

    const DC = {
        TRIVIAL: 5,
        EASY: 8,
        MEDIUM: 10,
        MODERATE: 12,
        HARD: 15,
        VERY_HARD: 18,
        EXTREMELY_HARD: 20,
        NEARLY_IMPOSSIBLE: 25,
        LEGENDARY: 30
    };

    const SKILL_STAT = {
        melee: 'str', attack: 'str', intimidate: 'str', break: 'str', lift: 'str', push: 'str', grapple: 'str',
        ranged: 'dex', dodge: 'dex', stealth: 'dex', sneak: 'dex', hide: 'dex', acrobatics: 'dex', lockpick: 'dex', pickpocket: 'dex', throw: 'dex',
        endure: 'con', resist: 'con', stamina: 'con',
        investigate: 'int', search: 'int', recall: 'int', lore: 'int', puzzle: 'int', arcana: 'int',
        perceive: 'wis', perception: 'wis', insight: 'wis', sense: 'wis', heal: 'wis', survival: 'wis',
        persuade: 'cha', persuasion: 'cha', deceive: 'cha', deception: 'cha', charm: 'cha', negotiate: 'cha', talk: 'cha', bluff: 'cha', perform: 'cha',
        gamble: 'lck', fortune: 'lck', chance: 'lck'
    };

    function getModifier(value) {
        return Math.floor((value - 10) / 2);
    }

    function getStatModifier(stat) {
        const stats = GameEngine.getPlayerStats();
        const statKey = STAT_MAP[stat.toLowerCase()] || stat.toLowerCase();
        let value = stats[statKey];
        if (value === undefined) {
            if (statKey === 'dexterity') value = stats.speed;
            if (statKey === 'constitution') value = stats.vitality;
            if (statKey === 'intelligence') value = stats.wisdom;
            if (statKey === 'charisma') value = stats.faith;
        }
        return getModifier(value || 10);
    }

    function rollD20() {
        return Math.floor(Math.random() * 20) + 1;
    }

    function check(stat, dc, options = {}) {
        let roll = rollD20();
        let roll2 = null;

        if (options.advantage && !options.disadvantage) {
            roll2 = rollD20();
            roll = Math.max(roll, roll2);
        } else if (options.disadvantage && !options.advantage) {
            roll2 = rollD20();
            roll = Math.min(roll, roll2);
        }

        const modifier = getStatModifier(stat);
        const total = roll + modifier;

        const stats = GameEngine.getPlayerStats();
        const luckBonus = Math.floor((stats.luck || 3) / 5);
        const luckRoll = Math.random() < 0.2 ? luckBonus : 0;
        const finalTotal = total + luckRoll;

        const critSuccess = roll === 20;
        const critFail = roll === 1;
        const success = critSuccess || (!critFail && finalTotal >= dc);

        return {
            success,
            roll,
            roll2,
            modifier,
            total: finalTotal,
            dc,
            critSuccess,
            critFail,
            stat: stat.toLowerCase(),
            luckBonus: luckRoll
        };
    }

    function contestedCheck(playerStat, enemyStat, enemy) {
        const playerMod = getStatModifier(playerStat);
        const playerRoll = rollD20();
        const playerTotal = playerRoll + playerMod;

        const enemyValue = enemy.stats?.[enemyStat] || 10;
        const enemyMod = getModifier(enemyValue);
        const enemyRoll = rollD20();
        const enemyTotal = enemyRoll + enemyMod;

        return {
            playerWins: playerTotal >= enemyTotal,
            playerRoll,
            playerModifier: playerMod,
            playerTotal,
            enemyRoll,
            enemyModifier: enemyMod,
            enemyTotal,
            tie: playerTotal === enemyTotal
        };
    }

    function getStatForAction(actionKeyword) {
        const lower = actionKeyword.toLowerCase();
        if (SKILL_STAT[lower]) return SKILL_STAT[lower];
        for (const [skill, stat] of Object.entries(SKILL_STAT)) {
            if (lower.includes(skill)) return stat;
        }
        return 'str';
    }

    function getDCForAction(actionType, context = {}) {
        const floor = context.floor || 1;
        const baseDC = DC.MEDIUM;
        const floorBonus = (floor - 1) * 2;

        let actionMod = 0;
        switch (actionType) {
            case 'trivial': actionMod = -5; break;
            case 'easy': actionMod = -2; break;
            case 'hard': actionMod = 5; break;
            case 'very_hard': actionMod = 8; break;
            case 'impossible': actionMod = 15; break;
        }

        if (context.inCombat) actionMod += 2;
        return Math.max(5, Math.min(30, baseDC + floorBonus + actionMod));
    }

    function formatCheckResult(result) {
        const statName = STAT_ABBREV[STAT_MAP[result.stat] || result.stat] || result.stat.toUpperCase();
        const sign = result.modifier >= 0 ? '+' : '';
        const outcome = result.success ? 'SUCCESS' : 'FAILURE';
        const critNote = result.critSuccess ? ' (NATURAL 20!)' : result.critFail ? ' (NATURAL 1!)' : '';
        const luckNote = result.luckBonus > 0 ? ` (+${result.luckBonus} luck)` : '';
        return `[${statName} Check: ${result.roll}${sign}${result.modifier}${luckNote} = ${result.total} vs DC ${result.dc} - ${outcome}${critNote}]`;
    }

    function getStatDescription(stat) {
        const descriptions = {
            str: 'Melee attacks, intimidation, breaking things, grappling',
            dex: 'Ranged attacks, dodging, stealth, acrobatics, lockpicking',
            con: 'Hit points, endurance, resisting poison and disease',
            int: 'Magic damage, investigation, recalling lore, solving puzzles',
            wis: 'Perception, insight, healing magic, sensing danger',
            cha: 'Persuasion, deception, dialogue, charm',
            lck: 'Critical hits, better loot, finding secrets'
        };
        return descriptions[stat.toLowerCase()] || 'Unknown stat';
    }

    return {
        check,
        contestedCheck,
        getModifier,
        getStatModifier,
        rollD20,
        getStatForAction,
        getDCForAction,
        formatCheckResult,
        getStatDescription,
        DC,
        STAT_MAP,
        STAT_ABBREV,
        SKILL_STAT
    };
})();

// Expose to window for other modules
window.Stats = Stats;
