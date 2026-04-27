// data.js - Content loader with embedded data (ported from ai-dungeon-master)

const DataManager = (() => {
    // ── Embedded Room Data ──────────────────────────────────────────────
    const ROOMS_DATA = [
        {
            id: "crypt-entrance",
            name: "Crypt Entrance",
            floor: 1,
            description: "Cold stone steps descend into darkness. Torch sconces line the walls, most long extinguished. A single flame gutters near the base, casting jittering shadows across carved warnings you cannot read.",
            exits: { forward: "dusty-hall" },
            encounter: { chance: 0, enemies: [] },
            loot_theme: "mundane",
            scene_color: "#2a0a3a",
            map_pos: { x: 0, y: 0 }
        },
        {
            id: "dusty-hall",
            name: "Dusty Hall",
            floor: 1,
            description: "A long corridor choked with centuries of dust. Footprints — not yours — trail through the grime ahead. Crumbling pillars hold up a ceiling that groans with the weight of earth above.",
            exits: { forward: "guard-alcove", back: "crypt-entrance" },
            encounter: { chance: 0.7, enemies: ["shambling-skeleton", "tomb-rat", "grave-worm"] },
            loot_theme: "mundane",
            scene_color: "#1a1a2e",
            map_pos: { x: 0, y: 1 }
        },
        {
            id: "guard-alcove",
            name: "Guard Alcove",
            floor: 1,
            description: "A small chamber cut into the rock, furnished with a rotting wooden chair and an overturned table. Something rattles in the darkness beyond — bones scraping against stone.",
            exits: { forward: "burial-niche", back: "dusty-hall" },
            encounter: { chance: 1.0, enemies: ["shambling-skeleton", "tomb-rat", "grave-worm"] },
            loot_theme: "mundane",
            scene_color: "#16213e",
            map_pos: { x: 0, y: 2 }
        },
        {
            id: "burial-niche",
            name: "Burial Niche",
            floor: 1,
            description: "Narrow alcoves line the walls, each containing wrapped bundles of bones. Some have been disturbed, their contents scattered across the dusty floor.",
            exits: { forward: "collapsed-stairwell", back: "guard-alcove" },
            encounter: { chance: 1.0, enemies: ["tomb-rat", "skeletal-archer"] },
            loot_theme: "mundane",
            scene_color: "#1a1a2e",
            map_pos: { x: 0, y: 3 }
        },
        {
            id: "collapsed-stairwell",
            name: "Collapsed Stairwell",
            floor: 1,
            description: "Ancient stone stairs spiral downward into darkness. Rubble from a partial collapse narrows the passage, but a way through remains. The path ahead leads deeper into the crypt.",
            exits: { back: "burial-niche" },
            encounter: { chance: 0.8, enemies: ["shambling-skeleton", "skeletal-archer"] },
            loot_theme: "mundane",
            scene_color: "#16213e",
            map_pos: { x: 0, y: 4 }
        },
        {
            id: "ossuary",
            name: "Ossuary",
            floor: 2,
            description: "Walls of skulls stare at you with hollow eyes, stacked floor to ceiling in grotesque order. The air is thick with the smell of old death and something sweeter — incense, perhaps, from a ritual long past.",
            exits: { forward: "collapsed-passage" },
            encounter: { chance: 0.0, enemies: [] },
            loot_theme: "arcane",
            scene_color: "#0f3460",
            map_pos: { x: 0, y: 0 }
        },
        {
            id: "collapsed-passage",
            name: "Collapsed Passage",
            floor: 2,
            description: "Half the ceiling has caved in, leaving a treacherous path through rubble and shattered stone. Water drips steadily from above, pooling in the depressions between fallen blocks.",
            exits: { forward: "ritual-chamber", back: "ossuary" },
            encounter: { chance: 0.5, enemies: ["crypt-ghoul", "corpse-crawler"] },
            loot_theme: "mundane",
            scene_color: "#1a1a2e",
            map_pos: { x: 0, y: 1 }
        },
        {
            id: "ritual-chamber",
            name: "Ritual Chamber",
            floor: 2,
            description: "A pentagram etched into the floor pulses with faint violet light. Melted candles ring the circle, their wax pooled into strange shapes. The air crackles with residual energy.",
            exits: { forward: "tomb-antechamber", back: "collapsed-passage" },
            encounter: { chance: 1.0, enemies: ["crypt-ghoul", "shadow-wisp", "corpse-crawler"] },
            loot_theme: "arcane",
            scene_color: "#533483",
            map_pos: { x: 0, y: 2 }
        },
        {
            id: "tomb-antechamber",
            name: "Tomb Antechamber",
            floor: 2,
            description: "Grand stone doors stand ajar, revealing a chamber of faded grandeur. Gold leaf peels from the walls. A sarcophagus sits in the center, its lid cracked and askew. Something moves inside.",
            exits: { back: "ritual-chamber" },
            encounter: { chance: 1.0, enemies: ["bone-knight", "crypt-ghoul", "corpse-crawler"] },
            loot_theme: "treasure",
            scene_color: "#4a0e4e",
            map_pos: { x: 0, y: 3 }
        },
        {
            id: "bone-throne-hall",
            name: "Bone Throne Hall",
            floor: 3,
            description: "A vast hall stretches before you, its ceiling lost in shadow. At the far end, a throne assembled from countless bones looms on a raised dais. Pale blue flames burn in braziers along the walls.",
            exits: { forward: "cursed-vault" },
            encounter: { chance: 0.0, enemies: [] },
            loot_theme: "arcane",
            scene_color: "#0a0a2a",
            map_pos: { x: 0, y: 0 }
        },
        {
            id: "cursed-vault",
            name: "Cursed Vault",
            floor: 3,
            description: "Iron-bound chests line the walls, each sealed with glowing sigils. The treasure of ages lies here, but the protections are fierce. Spectral chains rattle as you enter.",
            exits: { forward: "lich-sanctum", back: "bone-throne-hall" },
            encounter: { chance: 1.0, enemies: ["revenant", "death-acolyte"] },
            loot_theme: "arcane",
            scene_color: "#1b0a3a",
            map_pos: { x: 0, y: 1 }
        },
        {
            id: "lich-sanctum",
            name: "Lich Sanctum",
            floor: 3,
            description: "The air itself seems to recoil from this place. A robed figure hovers above a glowing phylactery, skeletal hands tracing arcane symbols in the air. Two burning points of light turn toward you — the Lich Lord has noticed your intrusion.",
            exits: { back: "cursed-vault" },
            encounter: { chance: 1.0, enemies: ["lich-lord"] },
            loot_theme: "legendary",
            scene_color: "#0d0d2b",
            map_pos: { x: 0, y: 2 }
        }
    ];

    const FLOOR_START_ROOMS = { "1": "crypt-entrance", "2": "ossuary", "3": "bone-throne-hall" };

    // ── Embedded Item Data ──────────────────────────────────────────────
    const ITEMS_DATA = [
        // Chromancer's signature weapon - the transformed paintbrush
        { id: "prisms-edge", name: "Prism's Edge", rarity: "legendary", slot: "weapon", description: "Your brush, transformed. Crystal bristles channel color into devastating magic.", stats: { wisdom: 3, luck: 2 }, set: null, on_consume: null, on_dismantle: null, unique: true },
        { id: "rusty-sword", name: "Rusty Sword", rarity: "common", slot: "weapon", description: "A pitted blade, barely holding an edge.", stats: { strength: 3 }, set: null, on_consume: null, on_dismantle: { permanent_bonus: { strength: 1 } } },
        { id: "cracked-shield", name: "Cracked Shield", rarity: "common", slot: "hands", description: "A wooden shield split down the middle. Better than nothing.", stats: { defense: 2 }, set: "crypt-guardian", on_consume: null, on_dismantle: { permanent_bonus: { defense: 1 } } },
        { id: "leather-cap", name: "Leather Cap", rarity: "common", slot: "helmet", description: "A simple leather cap, stiff with age.", stats: { defense: 1, speed: 1 }, set: "shadow-walker", on_consume: null, on_dismantle: { permanent_bonus: { defense: 1 } } },
        { id: "tattered-robe", name: "Tattered Robe", rarity: "common", slot: "armor", description: "Moth-eaten robes that still carry a faint enchantment.", stats: { defense: 1, wisdom: 2, faith: 1 }, set: "lichs-legacy", on_consume: null, on_dismantle: { permanent_bonus: { wisdom: 1 } } },
        { id: "bone-ring", name: "Bone Ring", rarity: "common", slot: "ring", description: "A ring carved from a single piece of bone. It hums faintly.", stats: { luck: 2 }, set: null, on_consume: null, on_dismantle: { permanent_bonus: { luck: 1 } } },
        { id: "minor-healing-potion", name: "Minor Healing Potion", rarity: "common", slot: "consumable", description: "A small vial of red liquid. Restores a modest amount of health.", stats: {}, set: null, on_consume: { effect: "heal", value: 15 }, on_dismantle: { permanent_bonus: { vitality: 1 } } },
        { id: "bone-talisman", name: "Bone Talisman", rarity: "common", slot: "amulet", description: "A small charm carved from ancient bone, strung on a frayed cord. It pulses faintly with residual death magic.", stats: { faith: 2, wisdom: 1 }, set: null, on_consume: null, on_dismantle: { permanent_bonus: { faith: 1 } } },
        { id: "worn-boots", name: "Worn Boots", rarity: "common", slot: "hands", description: "Scuffed leather boots that have seen better days, but still offer some protection.", stats: { speed: 2, defense: 1 }, set: "shadow-walker", on_consume: null, on_dismantle: { permanent_bonus: { defense: 1 } } },
        { id: "iron-mace", name: "Iron Mace", rarity: "uncommon", slot: "weapon", description: "A solid iron mace with a flanged head. Dents instead of cuts.", stats: { strength: 5, defense: 1 }, set: null, on_consume: null, on_dismantle: { permanent_bonus: { strength: 2 } } },
        { id: "chainmail-vest", name: "Chainmail Vest", rarity: "uncommon", slot: "armor", description: "Interlocking iron rings form a vest that turns aside blades.", stats: { defense: 4, speed: -1 }, set: null, on_consume: null, on_dismantle: { permanent_bonus: { defense: 2 } } },
        { id: "iron-helm", name: "Iron Helm", rarity: "uncommon", slot: "helmet", description: "A sturdy iron helmet with a nose guard. Limits vision slightly.", stats: { defense: 3 }, set: "crypt-guardian", on_consume: null, on_dismantle: { permanent_bonus: { defense: 1 } } },
        { id: "gauntlets-of-grip", name: "Gauntlets of Grip", rarity: "uncommon", slot: "hands", description: "Iron gauntlets with textured palms. Your strikes land true.", stats: { strength: 2, defense: 2 }, set: "crypt-guardian", on_consume: null, on_dismantle: { permanent_bonus: { strength: 1 } } },
        { id: "serpent-amulet", name: "Serpent Amulet", rarity: "uncommon", slot: "amulet", description: "A coiled serpent pendant. Venom drips from its fangs even now.", stats: { toxicity: 4, speed: 1 }, set: null, on_consume: null, on_dismantle: { permanent_bonus: { toxicity: 2 } } },
        { id: "ethereal-elixir", name: "Ethereal Elixir", rarity: "uncommon", slot: "consumable", description: "A shimmering vial of distilled spirit energy.", stats: {}, set: null, on_consume: { effect: "restore_mana", value: 10 }, on_dismantle: { permanent_bonus: { wisdom: 1 } } },
        { id: "antidote", name: "Antidote", rarity: "uncommon", slot: "consumable", description: "A bitter herbal remedy that purges toxins from the body.", stats: {}, set: null, on_consume: { effect: "cure_poison" }, on_dismantle: { permanent_bonus: { wisdom: 1 } } },
        { id: "elixir-of-swiftness", name: "Elixir of Swiftness", rarity: "uncommon", slot: "consumable", description: "A pale blue liquid that crackles with energy.", stats: {}, set: null, on_consume: { effect: "buff_speed", value: 5, duration: 3 }, on_dismantle: { permanent_bonus: { speed: 1 } } },
        { id: "sigil-ring", name: "Sigil Ring", rarity: "uncommon", slot: "ring", description: "A silver ring engraved with arcane symbols that pulse with faint magical energy.", stats: { wisdom: 3, faith: 2 }, set: "lichs-legacy", on_consume: null, on_dismantle: { permanent_bonus: { wisdom: 1 } } },
        { id: "band-of-vitality", name: "Band of Vitality", rarity: "uncommon", slot: "ring", description: "A simple iron band that pulses with life force.", stats: { vitality: 3, defense: 2 }, set: null, on_consume: null, on_dismantle: { permanent_bonus: { vitality: 1, defense: 1 } } },
        { id: "shadow-blade", name: "Shadow Blade", rarity: "rare", slot: "weapon", description: "A blade forged from condensed shadow. It seems to drink the light.", stats: { strength: 8, speed: 2 }, set: "shadow-walker", on_consume: null, on_dismantle: { permanent_bonus: { strength: 3 } } },
        { id: "plate-of-the-fallen", name: "Plate of the Fallen", rarity: "rare", slot: "armor", description: "Dented plate armor stripped from a dead knight. Still remarkably protective.", stats: { defense: 7, vitality: 5, speed: -2 }, set: "crypt-guardian", on_consume: null, on_dismantle: { permanent_bonus: { defense: 3 } } },
        { id: "crown-of-whispers", name: "Crown of Whispers", rarity: "rare", slot: "helmet", description: "A circlet of tarnished silver. Voices of the dead murmur secrets of combat.", stats: { wisdom: 5, luck: 3 }, set: "lichs-legacy", on_consume: null, on_dismantle: { permanent_bonus: { wisdom: 2 } } },
        { id: "ring-of-fortune", name: "Ring of Fortune", rarity: "rare", slot: "ring", description: "A golden ring set with a cat's eye gem. Fortune favors the wearer.", stats: { luck: 5, speed: 2 }, set: "shadow-walker", on_consume: null, on_dismantle: { permanent_bonus: { luck: 2 } } },
        { id: "healing-potion", name: "Healing Potion", rarity: "rare", slot: "consumable", description: "A generous flask of potent healing liquid.", stats: {}, set: null, on_consume: { effect: "heal", value: 35 }, on_dismantle: { permanent_bonus: { vitality: 2 } } },
        { id: "doomcleaver", name: "Doomcleaver", rarity: "epic", slot: "weapon", description: "A massive black axe that screams when swung. Its edge never dulls.", stats: { strength: 12, toxicity: 3 }, set: null, on_consume: null, on_dismantle: { permanent_bonus: { strength: 4 } } },
        { id: "soulward-aegis", name: "Soulward Aegis", rarity: "epic", slot: "armor", description: "Armor infused with captured souls that deflect incoming blows.", stats: { defense: 10, vitality: 10, faith: 3 }, set: null, on_consume: null, on_dismantle: { permanent_bonus: { defense: 4, vitality: 3 } } },
        { id: "amulet-of-the-lich", name: "Amulet of the Lich", rarity: "epic", slot: "amulet", description: "A phylactery fragment on a chain. Dark power courses through it.", stats: { wisdom: 8, toxicity: 5, faith: -3 }, set: "lichs-legacy", on_consume: null, on_dismantle: { permanent_bonus: { wisdom: 3, toxicity: 2 } } },
        { id: "greater-healing-potion", name: "Greater Healing Potion", rarity: "epic", slot: "consumable", description: "A large vial of luminous red liquid. Heals grievous wounds instantly.", stats: {}, set: null, on_consume: { effect: "heal", value: 60 }, on_dismantle: { permanent_bonus: { strength: 2 } } },
        { id: "crown-of-the-undying", name: "Crown of the Undying", rarity: "legendary", slot: "helmet", description: "A crown of black iron and bone, radiating absolute authority over death.", stats: { strength: 5, defense: 5, wisdom: 5, vitality: 15, luck: 5 }, set: null, on_consume: null, on_dismantle: { permanent_bonus: { strength: 3, defense: 3, vitality: 5 } } },
        { id: "soulreaver", name: "Soulreaver", rarity: "legendary", slot: "weapon", description: "A spectral greatsword that cleaves not flesh but the soul itself.", stats: { strength: 12, speed: 4, toxicity: 6, luck: 3 }, set: null, on_consume: null, on_dismantle: { permanent_bonus: { strength: 5, speed: 2, toxicity: 3 } } },
        { id: "vestments-of-eternal-night", name: "Vestments of Eternal Night", rarity: "legendary", slot: "armor", description: "Grand robes woven from shadow and silence.", stats: { defense: 10, vitality: 10, wisdom: 3, faith: 3 }, set: null, on_consume: null, on_dismantle: { permanent_bonus: { defense: 4, vitality: 4, wisdom: 2 } } },
        { id: "ring-of-the-damned", name: "Ring of the Damned", rarity: "legendary", slot: "ring", description: "Souls of the condemned swirl within this obsidian band.", stats: { strength: 6, luck: 8, toxicity: 5, speed: 3, wisdom: 3 }, set: null, on_consume: null, on_dismantle: { permanent_bonus: { luck: 3, toxicity: 2, strength: 2 } } },
        { id: "pendant-of-eternal-darkness", name: "Pendant of Eternal Darkness", rarity: "legendary", slot: "amulet", description: "A shard of the void itself, suspended in tarnished silver.", stats: { wisdom: 10, faith: 5, defense: 4, vitality: 5 }, set: null, on_consume: null, on_dismantle: { permanent_bonus: { wisdom: 4, faith: 2, vitality: 2 } } },
        { id: "elixir-of-iron-skin", name: "Elixir of Iron Skin", rarity: "uncommon", slot: "consumable", description: "Hardens your skin like metal.", stats: {}, set: null, on_consume: { effect: "buff_defense", value: 5, duration: 3 }, on_dismantle: { permanent_bonus: { defense: 1 } } },
        { id: "berserker-draught", name: "Berserker Draught", rarity: "uncommon", slot: "consumable", description: "Fills you with battle rage.", stats: {}, set: null, on_consume: { effect: "buff_strength", value: 5, duration: 3 }, on_dismantle: { permanent_bonus: { strength: 1 } } }
    ];

    const RARITY_VALUES = { common: 10, uncommon: 25, rare: 50, epic: 100, legendary: 250 };
    const RARITY_COLORS = { common: "#aaaaaa", uncommon: "#55ff55", rare: "#5555ff", epic: "#aa00aa", legendary: "#ffaa00" };

    // ── Equipment Set Bonuses ─────────────────────────────────────────────
    const SET_BONUSES = {
        "crypt-guardian": {
            name: "Crypt Guardian",
            items: ["plate-of-the-fallen", "iron-helm", "gauntlets-of-grip", "cracked-shield"],
            bonuses: { 2: { defense: 3, maxHp: 5 }, 4: { defense: 8, maxHp: 15 } }
        },
        "shadow-walker": {
            name: "Shadow Walker",
            items: ["shadow-blade", "leather-cap", "worn-boots", "ring-of-fortune"],
            bonuses: { 2: { speed: 3, luck: 2 }, 4: { speed: 6, luck: 5 } }
        },
        "lichs-legacy": {
            name: "Lich's Legacy",
            items: ["crown-of-whispers", "amulet-of-the-lich", "tattered-robe", "sigil-ring"],
            bonuses: { 2: { wisdom: 4, faith: 2 }, 4: { wisdom: 8, faith: 5 } }
        }
    };

    // ── Embedded Enemy Data ─────────────────────────────────────────────
    const ENEMIES_DATA = [
        { id: "shambling-skeleton", name: "Shambling Skeleton", description: "Bones held together by dark magic, it lurches forward with a rusted blade.", floor_range: [1, 1], stats: { hp: 20, attack: 5, defense: 2, speed: 3 }, abilities: [{ name: "Bone Rattle", type: "debuff", effect: "reduce_defense", value: 2, chance: 0.3, duration: 3 }], loot_tier: "common", gold_drop: [5, 15] },
        { id: "tomb-rat", name: "Tomb Rat", description: "A bloated rat the size of a dog, its eyes gleaming with unnatural intelligence.", floor_range: [1, 1], stats: { hp: 15, attack: 4, defense: 1, speed: 5 }, abilities: [{ name: "Festering Bite", type: "dot", effect: "poison", value: 3, chance: 0.4, duration: 3 }], loot_tier: "common", gold_drop: [3, 10] },
        { id: "grave-worm", name: "Grave Worm", description: "A bloated worm that feeds on the dead. Its segments pulse with necrotic fluid.", floor_range: [1, 1], stats: { hp: 18, attack: 5, defense: 1, speed: 4 }, abilities: [{ name: "Corpse Venom", type: "dot", effect: "poison", value: 2, chance: 0.35, duration: 2 }], loot_tier: "common", gold_drop: [3, 8] },
        { id: "skeletal-archer", name: "Skeletal Archer", description: "An animated skeleton clutching a cracked bow. Its empty eye sockets track your every move.", floor_range: [1, 1], stats: { hp: 14, attack: 7, defense: 0, speed: 8 }, abilities: [{ name: "Bone Arrow", type: "dot", effect: "bleed", value: 1, chance: 0.4, duration: 3, message: "A bone arrow lodges in your flesh!" }], loot_tier: "common", gold_drop: [4, 10] },
        { id: "crypt-ghoul", name: "Crypt Ghoul", description: "Once human, now a hunched and ravenous thing. Its claws are stained with old blood.", floor_range: [2, 2], stats: { hp: 35, attack: 9, defense: 4, speed: 5 }, abilities: [{ name: "Ravenous Claw", type: "buff", effect: "power_up", value: 3, chance: 0.25, duration: 3 }], loot_tier: "uncommon", gold_drop: [10, 30] },
        { id: "shadow-wisp", name: "Shadow Wisp", description: "A flickering orb of dark energy that drifts silently through the air.", floor_range: [2, 2], stats: { hp: 30, attack: 11, defense: 5, speed: 8 }, abilities: [{ name: "Soul Drain", type: "heal", effect: "heal", value: 8, chance: 0.3, duration: 0 }], loot_tier: "uncommon", gold_drop: [12, 25] },
        { id: "bone-knight", name: "Bone Knight", description: "An animated suit of corroded armor, wielding a massive two-handed sword.", floor_range: [2, 2], stats: { hp: 50, attack: 12, defense: 7, speed: 4 }, abilities: [{ name: "Shield Wall", type: "buff", effect: "power_up", value: 4, chance: 0.2, duration: 3 }, { name: "Crushing Blow", type: "debuff", effect: "reduce_defense", value: 3, chance: 0.25, duration: 3 }], loot_tier: "rare", gold_drop: [20, 45] },
        { id: "corpse-crawler", name: "Corpse Crawler", description: "A writhing mass of carrion insects that nests in the dead.", floor_range: [2, 2], stats: { hp: 20, attack: 8, defense: 1, speed: 9 }, abilities: [{ name: "Swarm", type: "buff", effect: "power_up", value: 3, chance: 0.3, duration: 2 }, { name: "Burrow", type: "debuff", effect: "reduce_defense", value: 2, chance: 0.25, duration: 2 }], loot_tier: "uncommon", gold_drop: [8, 22] },
        { id: "revenant", name: "Revenant", description: "A vengeful spirit given terrible form. Its hollow eyes burn with hatred.", floor_range: [3, 3], stats: { hp: 55, attack: 14, defense: 6, speed: 9 }, abilities: [{ name: "Spectral Wail", type: "debuff", effect: "reduce_defense", value: 4, chance: 0.3, duration: 3 }, { name: "Life Siphon", type: "heal", effect: "heal", value: 10, chance: 0.2, duration: 0 }], loot_tier: "rare", gold_drop: [25, 50] },
        { id: "death-acolyte", name: "Death Acolyte", description: "A robed figure chanting in a dead language. Dark energy coalesces around its hands.", floor_range: [3, 3], stats: { hp: 40, attack: 15, defense: 5, speed: 6 }, abilities: [{ name: "Necrotic Bolt", type: "dot", effect: "poison", value: 5, chance: 0.35, duration: 3 }, { name: "Dark Mending", type: "heal", effect: "heal", value: 12, chance: 0.25, duration: 0 }], loot_tier: "rare", gold_drop: [20, 45] },
        { id: "lich-lord", name: "Lich Lord", description: "The master of this crypt, a skeletal sorcerer of immense power.", floor_range: [3, 3], stats: { hp: 100, attack: 18, defense: 10, speed: 7 }, abilities: [{ name: "Death Ray", type: "dot", effect: "poison", value: 5, chance: 0.3, duration: 3, maxUses: 3 }, { name: "Phylactery Heal", type: "heal", effect: "heal", value: 20, chance: 0.25, duration: 0, maxUses: 2 }, { name: "Void Shield", type: "buff", effect: "void_shield", value: 5, chance: 0.2, duration: 3, maxUses: 2 }, { name: "Raise Dead", type: "attack", effect: "raise_dead", value: 8, chance: 0.15, duration: 0, maxUses: 2 }, { name: "Frenzy", type: "buff", effect: "frenzy", value: 2, chance: 0.15, duration: 2, maxUses: 1 }], loot_tier: "legendary", gold_drop: [100, 250], boss: true }
    ];

    // ── State ───────────────────────────────────────────────────────────
    let rooms = [];
    let items = [];
    let enemies = [];
    let floorStartRooms = {};
    let rarityValues = {};
    let rarityColors = {};

    function loadData() {
        rooms = ROOMS_DATA;
        floorStartRooms = FLOOR_START_ROOMS;
        items = ITEMS_DATA;
        rarityValues = RARITY_VALUES;
        rarityColors = RARITY_COLORS;
        enemies = ENEMIES_DATA;
        return true;
    }

    function getRoom(id) { return rooms.find(r => r.id === id) || null; }
    function getItem(id) { return items.find(i => i.id === id) || null; }
    function getEnemy(id) { return enemies.find(e => e.id === id) || null; }
    function getItemsByRarity(rarity) { return items.filter(i => i.rarity === rarity); }
    function getEquippableItemsByRarity(rarity) { return items.filter(i => i.rarity === rarity && i.slot !== 'consumable'); }
    function getConsumablesByRarity(rarity) { return items.filter(i => i.rarity === rarity && i.slot === 'consumable'); }
    function getEnemiesForFloor(floor) { return enemies.filter(e => floor >= e.floor_range[0] && floor <= e.floor_range[1]); }
    function getRoomsForFloor(floor) { return rooms.filter(r => r.floor === floor); }
    function getFloorStartRoom(floor) { return floorStartRooms[String(floor)] || null; }
    function getRarityValue(rarity) { return rarityValues[rarity] || 0; }
    function getRarityColor(rarity) { return rarityColors[rarity] || '#aaaaaa'; }
    function getAllItems() { return [...items]; }
    function getAllEnemies() { return [...enemies]; }
    function getSetBonus(setId) { return SET_BONUSES[setId] || null; }
    function getAllSets() { return { ...SET_BONUSES }; }

    return {
        loadData,
        getRoom,
        getItem,
        getEnemy,
        getItemsByRarity,
        getEquippableItemsByRarity,
        getConsumablesByRarity,
        getEnemiesForFloor,
        getRoomsForFloor,
        getFloorStartRoom,
        getRarityValue,
        getRarityColor,
        getAllItems,
        getAllEnemies,
        getSetBonus,
        getAllSets
    };
})();

// Expose to window for other modules
window.DataManager = DataManager;
