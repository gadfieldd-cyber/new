import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────
const CLAUDE_MODEL = "claude-sonnet-4-6";
const STORAGE_PREFIX = "dungeon_time_claude_";

const XP_THRESHOLDS = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];
const PROF_BONUS = [2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6];

const HIT_DICE = { Barbarian:12, Fighter:10, Paladin:10, Ranger:10, Bard:8, Cleric:8, Druid:8, Monk:8, Rogue:8, Warlock:8, Sorcerer:6, Wizard:6 };

// ─────────────────────────────────────────────────────────
// 2024 D&D DATA
// ─────────────────────────────────────────────────────────
const BACKGROUNDS_2024 = [
  { id:"acolyte",    name:"Acolyte",      stats:{wis:2,int:1},   skills:["Insight","Religion"],         feat:"Magic Initiate (Cleric)",    desc:"Devoted to a temple and a god." },
  { id:"artisan",    name:"Artisan",      stats:{dex:2,wis:1},   skills:["Insight","Persuasion"],       feat:"Crafter",                    desc:"Trained in a skilled trade." },
  { id:"charlatan",  name:"Charlatan",    stats:{cha:2,dex:1},   skills:["Deception","Sleight of Hand"],feat:"Skilled",                    desc:"Master of disguise and deception." },
  { id:"criminal",   name:"Criminal",     stats:{dex:2,int:1},   skills:["Deception","Stealth"],        feat:"Alert",                      desc:"Operated outside the law." },
  { id:"entertainer",name:"Entertainer",  stats:{cha:2,dex:1},   skills:["Acrobatics","Performance"],   feat:"Musician",                   desc:"Performer, acrobat, or storyteller." },
  { id:"farmer",     name:"Farmer",       stats:{con:2,wis:1},   skills:["Animal Handling","Nature"],   feat:"Tough",                      desc:"Raised on the land." },
  { id:"guard",      name:"Guard",        stats:{str:2,int:1},   skills:["Athletics","Perception"],     feat:"Alert",                      desc:"Trained to watch and protect." },
  { id:"guide",      name:"Guide",        stats:{wis:2,dex:1},   skills:["Stealth","Survival"],         feat:"Magic Initiate (Druid)",     desc:"Wilderness explorer and trailblazer." },
  { id:"hermit",     name:"Hermit",       stats:{wis:2,con:1},   skills:["Medicine","Religion"],        feat:"Magic Initiate (Druid)",     desc:"Lived in seclusion, seeking truth." },
  { id:"noble",      name:"Noble",        stats:{cha:2,wis:1},   skills:["History","Persuasion"],       feat:"Skilled",                    desc:"Born into wealth and privilege." },
  { id:"sage",       name:"Sage",         stats:{int:2,wis:1},   skills:["Arcana","History"],           feat:"Magic Initiate (Wizard)",    desc:"Scholar of ancient lore." },
  { id:"sailor",     name:"Sailor",       stats:{str:2,dex:1},   skills:["Acrobatics","Perception"],    feat:"Tavern Brawler",             desc:"Life spent at sea." },
  { id:"soldier",    name:"Soldier",      stats:{str:2,con:1},   skills:["Athletics","Intimidation"],   feat:"Savage Attacker",            desc:"Battle-hardened warrior." },
  { id:"wayfarer",   name:"Wayfarer",     stats:{wis:2,cha:1},   skills:["Insight","Stealth"],          feat:"Lucky",                      desc:"Wanderer who lives by their wits." },
];

const ORIGIN_FEATS_2024 = [
  { id:"alert",           name:"Alert",                 desc:"Add your Proficiency Bonus to Initiative. Can't be Surprised while conscious. Swap initiative with a willing ally after rolls." },
  { id:"crafter",         name:"Crafter",               desc:"Proficiency with 3 Artisan's Tools of your choice. 20% discount when purchasing non-magical items." },
  { id:"healer",          name:"Healer",                desc:"Healer's Kit: stabilize and heal 1d6+4+max_hit_dice HP once per creature per rest. Restore 1d6+4 HP as Magic Action using kit." },
  { id:"lucky",           name:"Lucky",                 desc:"3 Luck Points per Long Rest. Before any attack roll, ability check, or saving throw, spend 1 point to roll an extra d20. Choose which die to use." },
  { id:"magic_cleric",    name:"Magic Initiate (Cleric)",desc:"Learn 2 Cleric cantrips + 1 level 1 Cleric spell (cast once per Long Rest free, or with a slot). WIS is your spellcasting ability." },
  { id:"magic_druid",     name:"Magic Initiate (Druid)", desc:"Learn 2 Druid cantrips + 1 level 1 Druid spell (cast once per Long Rest free, or with a slot). WIS is your spellcasting ability." },
  { id:"magic_wizard",    name:"Magic Initiate (Wizard)",desc:"Learn 2 Wizard cantrips + 1 level 1 Wizard spell (cast once per Long Rest free, or with a slot). INT is your spellcasting ability." },
  { id:"musician",        name:"Musician",              desc:"Proficiency with 3 Musical Instruments. Encourage: grant Bardic Inspiration (1d6) to up to 5 allies after a Short or Long Rest." },
  { id:"savage_attacker", name:"Savage Attacker",       desc:"Once per turn when you roll weapon damage, reroll the dice and use either result." },
  { id:"skilled",         name:"Skilled",               desc:"Gain proficiency in any combination of 3 skills or tools." },
  { id:"tavern_brawler",  name:"Tavern Brawler",        desc:"Unarmed Strike damage becomes 1d4+STR. Shove costs a Bonus Action. +1 to STR or CON (your choice)." },
  { id:"tough",           name:"Tough",                 desc:"+2 HP per character level (past and future). Your HP maximum increases by double your level." },
];

const SPECIES_2024 = [
  { id:"human",      name:"Human",       traits:["Resourceful (Heroic Inspiration after Long Rest)","Skillful (+1 Skill Proficiency)","Versatile (Origin Feat)"],     speed:30, size:"Medium", darkvision:0 },
  { id:"elf_high",   name:"Elf (High)",  traits:["Darkvision 60 ft","Fey Ancestry (Charm immunity, can't be put to sleep)","Keen Senses (Perception Prof)","Trance (4hr rest)","Cantrip (INT, WIS, or CHA)"],  speed:30, size:"Medium", darkvision:60 },
  { id:"elf_wood",   name:"Elf (Wood)",  traits:["Darkvision 60 ft","Fey Ancestry","Keen Senses","Trance","Mask of the Wild (Hide in natural cover)"],                 speed:35, size:"Medium", darkvision:60 },
  { id:"elf_drow",   name:"Elf (Drow)",  traits:["Superior Darkvision 120 ft","Fey Ancestry","Keen Senses","Trance","Drow Magic (Dancing Lights, Faerie Fire, Darkness)"], speed:30, size:"Medium", darkvision:120 },
  { id:"dwarf_hill", name:"Dwarf (Hill)",traits:["Darkvision 120 ft","Dwarven Resilience (Poison Resistance + Advantage on Poison saves)","Stonecunning","Toughness (+1 HP per level)"], speed:30, size:"Medium", darkvision:120 },
  { id:"dwarf_mtn",  name:"Dwarf (Mountain)", traits:["Darkvision 120 ft","Dwarven Resilience","Stonecunning","Armor Training (Light, Medium)"],                       speed:30, size:"Medium", darkvision:120 },
  { id:"halfling",   name:"Halfling",    traits:["Lucky (reroll 1s on d20 Tests)","Brave (advantage vs Frightened)","Halfling Nimbleness (through larger creatures' spaces)"], speed:25, size:"Small", darkvision:0 },
  { id:"gnome_forest",name:"Gnome (Forest)",traits:["Darkvision 60 ft","Gnomish Cunning (Adv. on INT/WIS/CHA saves)","Speak with Small Beasts"],                       speed:30, size:"Small", darkvision:60 },
  { id:"gnome_rock", name:"Gnome (Rock)",traits:["Darkvision 60 ft","Gnomish Cunning","Tinker (proficiency + Expertise with Tinker's Tools)"],                          speed:30, size:"Small", darkvision:60 },
  { id:"dragonborn", name:"Dragonborn", traits:["Breath Weapon (2d6 at Lv1, DEX/CON save DC = 8+CON+Prof)","Damage Resistance (matching ancestry)","Darkvision 60 ft"], speed:30, size:"Medium", darkvision:60 },
  { id:"orc",        name:"Orc",         traits:["Darkvision 120 ft","Adrenaline Rush (Dash + gain Lv Temp HP as Bonus Action, 2/Short Rest)","Relentless Endurance (drop to 1 HP instead of 0, 1/Long Rest)"], speed:30, size:"Medium", darkvision:120 },
  { id:"tiefling",   name:"Tiefling",    traits:["Darkvision 60 ft","Hellish Resistance (Fire Resistance)","Otherworldly Presence (Thaumaturgy cantrip)","Fiendish Legacy (spells by lineage)"], speed:30, size:"Medium", darkvision:60 },
  { id:"aasimar",    name:"Aasimar",     traits:["Darkvision 60 ft","Celestial Resistance (Necrotic & Radiant Resistance)","Healing Hands (1/Long Rest: heal Lv×d4 HP)","Light Bearer (Light cantrip, CHA)","Angelic Flight / Radiant Soul / Necrotic Shroud (Lv3)"], speed:30, size:"Medium", darkvision:60 },
  { id:"goliath",    name:"Goliath",     traits:["Giant Ancestry (choose 1: Frost/Fire/Stone/Storm/Cloud lineage)","Large Form (once/Long Rest, become Large for 10 min)","Powerful Build (count as one size larger for carrying)"], speed:35, size:"Medium", darkvision:0 },
];

const CLASSES_2024 = [
  { name:"Barbarian", hitDie:12, saves:["str","con"], primaryStat:"str", armor:"Light, Medium, Shields", subclassLv:3, subclassName:"Primal Path" },
  { name:"Bard",      hitDie:8,  saves:["dex","cha"], primaryStat:"cha", armor:"Light",                  subclassLv:3, subclassName:"Bard College" },
  { name:"Cleric",    hitDie:8,  saves:["wis","cha"], primaryStat:"wis", armor:"Light, Medium, Shields", subclassLv:3, subclassName:"Divine Domain" },
  { name:"Druid",     hitDie:8,  saves:["int","wis"], primaryStat:"wis", armor:"Light, Medium, Shields", subclassLv:3, subclassName:"Druid Circle" },
  { name:"Fighter",   hitDie:10, saves:["str","con"], primaryStat:"str", armor:"All, Shields",           subclassLv:3, subclassName:"Martial Archetype" },
  { name:"Monk",      hitDie:8,  saves:["str","dex"], primaryStat:"dex", armor:"None",                   subclassLv:3, subclassName:"Monastic Tradition" },
  { name:"Paladin",   hitDie:10, saves:["wis","cha"], primaryStat:"cha", armor:"All, Shields",           subclassLv:3, subclassName:"Sacred Oath" },
  { name:"Ranger",    hitDie:10, saves:["str","dex"], primaryStat:"dex", armor:"Light, Medium, Shields", subclassLv:3, subclassName:"Ranger Conclave" },
  { name:"Rogue",     hitDie:8,  saves:["dex","int"], primaryStat:"dex", armor:"Light",                  subclassLv:3, subclassName:"Roguish Archetype" },
  { name:"Sorcerer",  hitDie:6,  saves:["con","cha"], primaryStat:"cha", armor:"None",                   subclassLv:3, subclassName:"Sorcerous Origin" },
  { name:"Warlock",   hitDie:8,  saves:["wis","cha"], primaryStat:"cha", armor:"Light",                  subclassLv:3, subclassName:"Otherworldly Patron" },
  { name:"Wizard",    hitDie:6,  saves:["int","wis"], primaryStat:"int", armor:"None",                   subclassLv:3, subclassName:"Arcane Tradition" },
];

const SUBCLASSES_2024 = {
  Barbarian:["Path of the Berserker","Path of the Totem Warrior","Path of the Wild Heart","Path of the World Tree","Path of the Zealot"],
  Bard:     ["College of Dance","College of Glamour","College of Lore","College of Valor","College of Swords"],
  Cleric:   ["Life Domain","Light Domain","War Domain","Trickery Domain","Nature Domain","Tempest Domain","Knowledge Domain","Death Domain"],
  Druid:    ["Circle of the Land","Circle of the Moon","Circle of the Sea","Circle of the Stars","Circle of Wildfire"],
  Fighter:  ["Battle Master","Champion","Eldritch Knight","Psi Warrior","Arcane Archer","Echo Knight"],
  Monk:     ["Warrior of the Open Hand","Warrior of Shadow","Warrior of the Elements","Warrior of Mercy"],
  Paladin:  ["Oath of Devotion","Oath of the Ancients","Oath of Glory","Oath of Vengeance","Oathbreaker"],
  Ranger:   ["Beast Master","Gloom Stalker","Hunter","Fey Wanderer","Swarmkeeper"],
  Rogue:    ["Thief","Assassin","Arcane Trickster","Soulknife","Phantom"],
  Sorcerer: ["Aberrant Mind","Clockwork Soul","Draconic Bloodline","Shadow Magic","Wild Magic"],
  Warlock:  ["The Archfey","The Fiend","The Great Old One","The Undead","The Celestial"],
  Wizard:   ["Abjuration","Conjuration","Divination","Evocation","Illusion","Necromancy","Transmutation"],
};


// ─────────────────────────────────────────────────────────
// SUBCLASS PROGRESSION (features, spells, proficiencies per level)
// ─────────────────────────────────────────────────────────
// Each entry: { features, spells:[{name,lvl}], proficiencies:[string], attacks:[attack obj] }
const SC = (features=[], spells=[], proficiencies=[], attacks=[], choices=[], passiveEffects=[]) =>
  ({features: features.map(([name,desc])=>({name,type:"Subclass",desc})), spells, proficiencies, attacks, choices, passiveEffects});

const SUBCLASS_PROGRESSION = {
  // ── BARBARIAN ────────────────────────────────────────────
  "Path of the Berserker": {
    3:  SC([["Frenzy","When you Rage you can go into a Frenzy — make one melee weapon attack as a bonus action each turn. After the Rage you suffer one level of Exhaustion."]]),
    6:  SC([["Mindless Rage","You can't be Charmed or Frightened while raging. If Charmed/Frightened when you Rage, it ends."]]),
    10: SC([["Intimidating Presence","Action: Frighten one creature within 30 ft (WIS save DC 8+PB+CHA). Each turn, repeat as bonus action."]]),
    14: SC([["Retaliation","When a creature deals damage to you, use Reaction to make one melee weapon attack against it."]]),
  },
  "Path of the Totem Warrior": {
    3:  SC([["Totem Spirit","Choose Bear/Eagle/Elk/Tiger/Wolf totem. Bear: resistance to all dmg while raging. Eagle: Dash as bonus action while raging. Wolf: allies have advantage on melee attacks vs enemies adjacent to you."]]),
    6:  SC([["Aspect of the Beast","Gain a persistent totem trait: Bear=carrying capacity doubled; Eagle=see 1 mile clearly; Wolf=track at fast pace."]]),
    10: SC([["Spirit Walker","Cast Commune with Nature as a ritual."]]),
    14: SC([["Totemic Attunement","Totem power while raging: Bear=enemies near you have disadv. on attacks vs others; Eagle=opportunity attacks have disadv. on you; Wolf=knock prone on hit."]]),
  },
  "Path of the Wild Heart": {
    3:  SC([["Animal Speaker","Cast Beast Sense and Speak with Animals as rituals."],["Rage of the Wilds","Gain an animal spirit form (Ape/Bear/Bull/Elk/Eagle/Serpent/Tiger/Wolf) granting special benefits while raging."]]),
    6:  SC([["Elk's Charge / Bear's Toughness","Additional animal spirit benefit based on chosen form."]]),
    10: SC([["Visitor in the Dream","Cast Dream of the Blue Veil once per Long Rest."]]),
    14: SC([["Nourishing Storm","Regain 1d8+CON HP when you start your turn raging and dealt damage last round."]]),
  },
  "Path of the World Tree": {
    3:  SC([["Vitality of the Tree","Gain Lv×PB Temp HP at the start of each Rage. Allies within 10 ft may spend a HD as a reaction when you Rage."]]),
    6:  SC([["Branches of the Tree","While raging, teleport a creature you hit to an unoccupied space you can see within 30 ft (STR save DC 8+PB+STR)."]]),
    10: SC([["Battering Roots","While raging, your reach increases by 10 ft. Hits may cause target to be Restrained until start of your next turn (STR save)."]]),
    14: SC([["Travel Along the Tree","When you activate Rage, teleport up to 60 ft. Allies within 30 ft may follow (using their reaction)."]]),
  },
  "Path of the Zealot": {
    3:  SC([["Divine Fury","When you hit a creature with a weapon attack while raging, deal extra 1d6+PB/2 necrotic or radiant damage once per turn."],["Warrior of the Gods","When you die, Revivify, Raise Dead, and Resurrection on you require no material components."]]),
    6:  SC([["Fanatical Focus","When you fail a saving throw while Raging, reroll (once per Rage)."]]),
    10: SC([["Zealous Presence","Once per Long Rest: roar and grant advantage on attack rolls and saving throws to up to 10 allies for 1 min."]]),
    14: SC([["Rage Beyond Death","While Raging, you have 1 HP instead of dying. You can still die from massive damage. Rage ends immediately after."]]),
  },

  // ── BARD ─────────────────────────────────────────────────
  "College of Lore": {
    3:  SC([["Bonus Proficiencies","You gain proficiency in 3 skills of your choice."],["Cutting Words","Use Bardic Inspiration as a Reaction to impose a die roll penalty on an attack, check, or save within 60 ft."]],
        [], ["Arcana","Nature","History"]),
    6:  SC([["Magical Secrets","Learn 2 spells from any class list. These count as Bard spells for you."]]),
    10: SC([["Peerless Skill","When you fail an ability check, expend one Bardic Inspiration to possibly succeed (add die to check)."],[" Additional Magical Secrets","Learn 2 more spells from any class list."]]),
    14: SC([["Peerless Skill (Lv14)","When you fail an ability check, expend one Bardic Inspiration to add it and possibly succeed."]]),
  },
  "College of Valor": {
    3:  SC([["Bonus Proficiencies","Proficiency with medium armor, shields, and martial weapons."],["Combat Inspiration","Allies can use Bardic Inspiration die to add to an AC check against an attack or a weapon damage roll."]],
        [], ["Medium Armor","Shields","Martial Weapons"]),
    6:  SC([["Extra Attack","Attack twice when you take the Attack action."]]),
    10: SC([["Battle Magic","Use a Bonus Action to make one weapon attack after casting a Bard spell (not cantrip) on your turn."]]),
    14: SC([["Battle Magic (Lv14)","Your Bardic Inspiration dice become d10s and your Extra Attack provides 3 attacks."]]),
  },
  "College of Glamour": {
    3:  SC([["Mantle of Inspiration","Bonus action: spend Bardic Inspiration — up to PB allies within 60 ft gain Inspiration die as Temp HP and may move without opportunity attacks."],["Enthralling Performance","After 1 min performance: PB humanoids charmed for 1 hr (WIS save DC 8+PB+CHA)."]]),
    6:  SC([["Mantle of Majesty","Bonus Action: assume fey appearance for 1 min. Cast Command as a bonus action each turn for free."]]),
    10: SC([["Unbreakable Majesty","Bonus Action: assume divinely beautiful form 1 min. Attackers must WIS save or miss, then immunity on a miss."]]),
    14: SC([["Unbreakable Majesty (Lv14)","Your Mantle of Majesty lasts an hour and Command requires no spell slot once per Long Rest."]]),
  },
  "College of Dance": {
    3:  SC([["Dazzling Footwork","While not wearing armor, AC = 10+DEX+CHA. Unarmed strikes deal 1d6+DEX. On using Bardic Inspiration, gain bonus to AC until start of next turn."]]),
    6:  SC([["Inspiring Movement","When a Bardic Inspiration target moves, you may move up to half speed without opportunity attacks (reaction)."]]),
    10: SC([["Tandem Footwork","When you roll initiative, spend Bardic Inspiration — allies who can see you gain bonus to initiative equal to the die result."]]),
    14: SC([["Leading Evasion","When subjected to area-of-effect saving throw, allies next to you get your Evasion and Uncanny Dodge benefits."]]),
  },
  "College of Swords": {
    3:  SC([["Bonus Proficiencies","Medium armor and scimitars proficiency."],["Blade Flourish","When you take the Attack action, move up to 10 ft (no opportunity attacks). On hit, use Bardic Inspiration: Defensive Flourish (+die to AC), Slashing Flourish (deal Inspiration die to target and another creature), or Mobile Flourish (push target, move to them)."]],
        [], ["Medium Armor","Scimitar"]),
    6:  SC([["Extra Attack","Attack twice when you take the Attack action."]]),
    10: SC([["Master's Flourish","Once per turn Blade Flourish costs no Bardic Inspiration."]]),
    14: SC([["Blade Flourish (Lv14)","Your Bardic Inspiration dice become d10s. Master's Flourish works on every attack."]]),
  },

  // ── CLERIC DOMAINS ────────────────────────────────────────
  "Life Domain": {
    3:  SC([["Disciple of Life","Your healing spells restore extra HP equal to 2+spell slot level."],["Preserve Life","Channel Divinity: As an action, restore HP totaling 5×your level among creatures within 30 ft (up to half max HP each)."]],
        [{name:"Bless",lvl:1},{name:"Cure Wounds",lvl:1}]),
    5:  SC([], [{name:"Lesser Restoration",lvl:2},{name:"Spiritual Weapon",lvl:2}]),
    7:  SC([["Blessed Healer","When you cast a healing spell, you regain 2+spell slot level HP."]],
        [{name:"Revivify",lvl:3},{name:"Mass Healing Word",lvl:3}]),
    9:  SC([], [{name:"Death Ward",lvl:4},{name:"Guardian of Faith",lvl:4}]),
    11: SC([["Supreme Healing","When you roll healing dice for a spell, use maximum value instead of rolling."]],
        [{name:"Mass Cure Wounds",lvl:5},{name:"Raise Dead",lvl:5}]),
  },
  "Light Domain": {
    3:  SC([["Warding Flare","Reaction: impose disadvantage on attack rolls against you or a creature within 30 ft (PB times/Long Rest)."],["Radiance of the Dawn","Channel Divinity: Dispel magical darkness in 30 ft. Creatures in range take 2d10+Cleric level radiant damage (CON save halves)."]],
        [{name:"Burning Hands",lvl:1},{name:"Faerie Fire",lvl:1}]),
    5:  SC([], [{name:"Scorching Ray",lvl:2},{name:"See Invisibility",lvl:2}]),
    7:  SC([["Improved Warding Flare","Warding Flare now works on all visible creatures within 30 ft."]],
        [{name:"Daylight",lvl:3},{name:"Fireball",lvl:3}]),
    9:  SC([], [{name:"Arcane Eye",lvl:4},{name:"Wall of Fire",lvl:4}]),
    11: SC([["Corona of Light","Action: activate an aura of 60ft bright/30ft dim light for 1 min. Enemies in bright light have disadvantage on saves vs fire and radiant spells."]],
        [{name:"Flame Strike",lvl:5},{name:"Scrying",lvl:5}]),
  },
  "War Domain": {
    3:  SC([["War Priest","When you take the Attack action, make one weapon attack as a Bonus Action (PB times/Long Rest)."],["Guided Strike","Channel Divinity: Reaction. Give +10 to an attack roll (yours or an ally's within 30 ft)."]],
        [{name:"Divine Favor",lvl:1},{name:"Shield of Faith",lvl:1}],
        ["Martial Weapons","Heavy Armor"]),
    5:  SC([], [{name:"Magic Weapon",lvl:2},{name:"Spiritual Weapon",lvl:2}]),
    7:  SC([["War God's Blessing","When an ally within 30 ft misses an attack, use Reaction to give them +10 to the roll (Channel Divinity)."]],
        [{name:"Crusader's Mantle",lvl:3},{name:"Spirit Guardians",lvl:3}]),
    9:  SC([], [{name:"Freedom of Movement",lvl:4},{name:"Stoneskin",lvl:4}]),
    11: SC([["Avatar of Battle","You gain resistance to bludgeoning, piercing, and slashing damage from nonmagical weapons."]],
        [{name:"Flame Strike",lvl:5},{name:"Hold Monster",lvl:5}]),
  },
  "Trickery Domain": {
    3:  SC([["Blessing of the Trickster","Touch a creature: they gain advantage on DEX (Stealth) checks for 1 hr (once per Long Rest per target)."],["Invoke Duplicity","Channel Divinity: Create illusory duplicate within 30 ft for 1 min. Concentration. Spells can originate from duplicate's location."]],
        [{name:"Charm Person",lvl:1},{name:"Disguise Self",lvl:1}]),
    5:  SC([], [{name:"Mirror Image",lvl:2},{name:"Pass without Trace",lvl:2}]),
    7:  SC([["Trickster's Magic","When you cast Invoke Duplicity, you can make your duplicate appear identical to you without Concentration."]],
        [{name:"Blink",lvl:3},{name:"Dispel Magic",lvl:3}]),
    9:  SC([], [{name:"Dimension Door",lvl:4},{name:"Polymorph",lvl:4}]),
    11: SC([["Improved Duplicity","Create up to 4 duplicates; each as a Bonus Action for free."]],
        [{name:"Dominate Person",lvl:5},{name:"Modify Memory",lvl:5}]),
  },
  "Nature Domain": {
    3:  SC([["Acolyte of Nature","Learn one Druid cantrip. Also gain proficiency in one of Animal Handling, Nature, or Survival."],["Charm Animals and Plants","Channel Divinity: Charm all beasts and plants within 30 ft for 1 min (WIS save)."]],
        [{name:"Animal Friendship",lvl:1},{name:"Speak with Animals",lvl:1}],
        ["Heavy Armor"]),
    5:  SC([], [{name:"Barkskin",lvl:2},{name:"Spike Growth",lvl:2}]),
    7:  SC([["Dampen Elements","Reaction: grant resistance to acid, cold, fire, lightning, or thunder to a creature within 30 ft."]],
        [{name:"Plant Growth",lvl:3},{name:"Wind Wall",lvl:3}]),
    9:  SC([], [{name:"Dominate Beast",lvl:4},{name:"Grasping Vine",lvl:4}]),
    11: SC([["Master of Nature","Bonus Action: command creatures charmed by Charm Animals and Plants."]],
        [{name:"Insect Plague",lvl:5},{name:"Tree Stride",lvl:5}]),
  },
  "Tempest Domain": {
    3:  SC([["Wrath of the Storm","Reaction: when a creature hits you, deal 2d8 lightning or thunder damage (DEX save halves), PB times/Long Rest."],["Destructive Wrath","Channel Divinity: Deal maximum damage with lightning or thunder (once per Channel Divinity use)."]],
        [{name:"Fog Cloud",lvl:1},{name:"Thunderwave",lvl:1}],
        ["Martial Weapons","Heavy Armor"]),
    5:  SC([], [{name:"Gust of Wind",lvl:2},{name:"Shatter",lvl:2}]),
    7:  SC([["Thunderbolt Strike","When you deal lightning damage to a Large or smaller creature, push it up to 10 ft away."]],
        [{name:"Call Lightning",lvl:3},{name:"Sleet Storm",lvl:3}]),
    9:  SC([], [{name:"Control Water",lvl:4},{name:"Ice Storm",lvl:4}]),
    11: SC([["Stormborn","You have a fly speed equal to your walking speed whenever you are outdoors and not underground."]],
        [{name:"Destructive Wave",lvl:5},{name:"Insect Plague",lvl:5}]),
  },
  "Knowledge Domain": {
    3:  SC([["Blessings of Knowledge","Proficiency + expertise in two of: Arcana, History, Nature, or Religion."],["Knowledge of the Ages","Channel Divinity: Gain proficiency in any skill or tool for 10 min."],["Read Thoughts","Channel Divinity: Read a creature's thoughts (INT save DC 8+PB+WIS) for 1 min; cast Suggestion for free while active."]],
        [{name:"Command",lvl:1},{name:"Identify",lvl:1}],
        ["Arcana","History"]),
    5:  SC([], [{name:"Augury",lvl:2},{name:"Suggestion",lvl:2}]),
    7:  SC([["Read Thoughts (Lv7)","Channel Divinity: Read thoughts works with Suggestion once per activation."]],
        [{name:"Nondetection",lvl:3},{name:"Speak with Dead",lvl:3}]),
    9:  SC([], [{name:"Arcane Eye",lvl:4},{name:"Confusion",lvl:4}]),
    11: SC([["Visions of the Past","Concentrate to receive visual impressions of recent events near you or on a held object (PB min / Long Rest)."]],
        [{name:"Legend Lore",lvl:5},{name:"Scrying",lvl:5}]),
  },
  "Death Domain": {
    3:  SC([["Reaper","When you cast a Necromancy cantrip targeting only one creature, target an additional creature within 5 ft."],["Touch of Death","Channel Divinity: Deal extra necrotic damage (max(character.level×5, 5)) on a melee attack this turn."]],
        [{name:"False Life",lvl:1},{name:"Inflict Wounds",lvl:1}],
        ["Martial Weapons"]),
    5:  SC([], [{name:"Blindness/Deafness",lvl:2},{name:"Ray of Enfeeblement",lvl:2}]),
    7:  SC([["Inescapable Destruction","Necrotic damage you deal ignores resistance."]],
        [{name:"Animate Dead",lvl:3},{name:"Vampiric Touch",lvl:3}]),
    9:  SC([], [{name:"Blight",lvl:4},{name:"Death Ward",lvl:4}]),
    11: SC([["Improved Reaper","When you cast a Necromancy spell of 1st–5th level that targets only one creature, target an additional creature within 5 ft (spell slot only used once)."]],
        [{name:"Antilife Shell",lvl:5},{name:"Cloudkill",lvl:5}]),
  },

  // ── DRUID CIRCLES ──────────────────────────────────────────
  "Circle of the Land": {
    3:  SC([["Land's Aid","Channel the Circle: Touch a plant or stand on ground—PB creatures within 10 ft regain 2d6+WIS HP. Hostile creatures in 10 ft take 2d6 necrotic (CON save halves)."],["Natural Recovery","Short Rest: recover spell slots totaling ≤ half Druid level (min 1), once per Long Rest."]]),
    6:  SC([["Land's Stride","Moving through nonmagical difficult terrain costs no extra movement. Advantage on saves vs plants (magical or mundane)."]]),
    10: SC([["Nature's Ward","Immune to disease and poison. Charms and frights from fey and elementals don't affect you."]]),
    14: SC([["Nature's Sanctuary","When a beast or plant attacks you, it must make a WIS save DC 8+PB+WIS or redirect the attack."]]),
  },
  "Circle of the Moon": {
    3:  SC([["Combat Wild Shape","Use Wild Shape as a Bonus Action. While in Wild Shape, use a Bonus Action to expend spell slots for 1d8 HP per slot level."],["Circle Forms","When transforming, choose from Moon Circle beast list — can become CR 1 Beast (scales with level: CR 1/3 per Druid level)."]]),
    6:  SC([["Primal Strike","Wild Shape attacks count as magical for damage resistance."]]),
    10: SC([["Elemental Wild Shape","Expend 2 Wild Shape uses to transform into an Air/Earth/Fire/Water Elemental."]]),
    14: SC([["Thousand Forms","Cast Alter Self at will (no spell slot needed)."]]),
  },
  "Circle of the Sea": {
    3:  SC([["Wrath of the Sea","Channel the Circle: Unleash a 10 ft aura of crashing waves for 1 min. Start of each turn: CON save or pushed 15 ft + knocked prone + 1d6+WIS cold damage."]]),
    6:  SC([["Aquatic Affinity","Swim speed = walk speed. Breathe water. Water Breathing at will (no slot)."]]),
    10: SC([["Stormborn","Outdoor flight speed = walk speed. Resistance to lightning and thunder damage."]]),
    14: SC([["Oceanic Gift","Once per Long Rest: grant an ally within 60 ft the Sea's wrath aura for free."]]),
  },
  "Circle of the Stars": {
    3:  SC([["Star Map","Create a star map as a focus. Cast Guidance as a cantrip (doesn't require Concentration at Lv10). Guiding Bolt prepared always."],["Starry Form","Wild Shape becomes a starry avatar: Archer (radiant dart as bonus action), Chalice (healing spell restores 1d8+WIS to self too), or Dragon (Concentration saves have advantage, use INT for them)."]],
        [{name:"Guiding Bolt",lvl:1}]),
    6:  SC([["Cosmic Omen","After a Long Rest, roll a die: Weal (odd) — Reaction to add d6 to an attack/check/save within 30ft. Woe (even) — Reaction to subtract d6."]]),
    10: SC([["Twinkling Constellations","Starry Form lasts 10 min. You can change form each turn (bonus action). Add 2d8 radiant to Dragon form attacks."]]),
    14: SC([["Full of Stars","While in Starry Form, you become semi-incorporeal — attacks against you have disadvantage."]]),
  },
  "Circle of Wildfire": {
    3:  SC([["Summon Wildfire Spirit","Channel the Circle: Summon a wildfire spirit in an unoccupied space within 30 ft. It acts on your turn using Wildfire Spirit stat block."],["Enhanced Bond","Bonus to fire spells and healing spells when your wildfire spirit is present (+1d8 fire or +1d8 healing)."]],
        [{name:"Burning Hands",lvl:1},{name:"Cure Wounds",lvl:1}]),
    6:  SC([["Cauterizing Flames","When a Small+ creature dies within 30 ft, a spectral flame appears. Any creature can spend its action to touch the flame and regain 2d10+WIS HP."]],
        [{name:"Flaming Sphere",lvl:2},{name:"Scorching Ray",lvl:2}]),
    10: SC([["Blazing Revival","When your wildfire spirit vanishes, you can use Reaction to have it explode (10 ft, 2d10+WIS fire, DEX save halves) and regain PB×d8 HP."]],
        [{name:"Plant Growth",lvl:3},{name:"Revivify",lvl:3}]),
    14: SC([["Firestorm","Cast Fire Storm once per Long Rest without using a spell slot."]],
        [{name:"Aura of Life",lvl:4},{name:"Fire Shield",lvl:4}]),
  },

  // ── FIGHTER ARCHETYPES ────────────────────────────────────
  "Battle Master": {
    3:  SC([["Combat Superiority","You gain 4 Superiority Dice (d8) per Short/Long Rest. Save DC = 8+PB+STR/DEX."],["Student of War","Proficiency with one type of artisan's tools."]],
        [], ["Artisan's Tools (1 type)"],
        [{name:"Superiority Die (d8)",bonus:0,damage:"1d8",type:"Special",mastery:"",range:"Special",properties:"Maneuver: add to atk/dmg/save. PB×4/Short Rest.",actionType:"action"}],
        [{type:"maneuvers",count:3,label:"Choose 3 Battle Maneuvers"}],
        [{type:"class_resource",id:"superiority_dice",label:"Superiority Dice",icon:"⚔️",die:"d8",max:4,resetOn:"short",color:"#f59e0b"}]),
    7:  SC([["Know Your Enemy","Spend 1 min studying a creature to learn if it is superior, inferior, or equal to you in two chosen stats."],["Improved Combat Superiority","Superiority Dice upgrade to d10s (5 dice)."]],[],[],[],
        [{type:"maneuvers",count:2,label:"Learn 2 More Maneuvers"}],
        [{type:"class_resource",id:"superiority_dice",label:"Superiority Dice",icon:"⚔️",die:"d10",max:5,resetOn:"short",color:"#f59e0b"}]),
    10: SC([["Relentless Training","Your training grants mastery of one additional maneuver."]],[],[],[],
        [{type:"maneuvers",count:1,label:"Learn 1 More Maneuver"}]),
    15: SC([["Relentless","Regain 1 Superiority Die at start of each turn if none remain."],["Superiority Dice Upgrade","Superiority Dice become d12s (6 dice)."]],[],[],[],[],[{type:"class_resource",id:"superiority_dice",label:"Superiority Dice",icon:"⚔️",die:"d12",max:6,resetOn:"short",color:"#f59e0b"}]),
  },
  "Champion": {
    3:  SC([["Improved Critical","Weapon attacks score a critical hit on 19 or 20."]]),
    7:  SC([["Remarkable Athlete","Add half PB (rounded up) to STR/DEX/CON checks you're not proficient in. Running long jump distance +1 ft per point of STR modifier."]]),
    10: SC([["Additional Fighting Style","Choose a second Fighting Style option."]]),
    15: SC([["Superior Critical","Weapon attacks crit on 18–20."]]),
    18: SC([["Survivor","At start of your turn if you have fewer than half your max HP, regain 5+CON modifier HP."]]),
  },
  "Eldritch Knight": {
    3:  SC([["Spellcasting","Cast Wizard spells using INT. Learn 3 cantrips (2 must be from Abjuration/Evocation). Learn 3 spells (2 from Abjuration/Evocation)."],["Weapon Bond","Bond with 2 weapons. Can't be disarmed. Teleport them to hand as bonus action."]],
        [{name:"Shield",lvl:1},{name:"Magic Missile",lvl:1},{name:"Thunderwave",lvl:1}]),
    7:  SC([["War Magic","When you use your action to cast a cantrip, make one weapon attack as a bonus action."]]),
    10: SC([["Eldritch Strike","When you hit with a weapon attack, impose disadvantage on next save vs next spell you cast before end of next turn."]]),
    15: SC([["Arcane Charge","When you Action Surge, teleport up to 30 ft before or after extra attacks."]]),
  },
  "Psi Warrior": {
    3:  SC([["Psionic Power","Gain PB Psionic Energy Dice (d6) per Long Rest. Use for Protective Field (Reaction: reduce dmg by 1 die+INT), Psionic Strike (after hit: +1d6+INT psychic dmg, once per turn), and Telekinetic Movement (object or creature within 30ft, 1 die use)."]]),
    7:  SC([["Telekinetic Adept","Psi-Powered Leap: fly up to 2× speed (once/Long Rest, no die). Telekinetic Thrust: on Psionic Strike, target STR save DC 8+PB+INT or knocked prone + pushed 10 ft."]]),
    10: SC([["Guarded Mind","Psionic Energy Die: Reaction to resist psychic damage, end frightened/charmed on yourself."]]),
    15: SC([["Bulwark of Force","Bonus Action: choose PB creatures within 30 ft. Grant them half cover until start of your next turn (uses 1 Psionic die)."]]),
  },
  "Arcane Archer": {
    3:  SC([["Arcane Archer Lore","Arcana or Nature proficiency."],["Arcane Shot","Use a magical shot 2×/Short Rest: Banishing (CON save or banished 1 round), Beguiling (CHA save or charmed), Bursting (2d6 force to nearby), Enfeebling (1d6 necrotic + STR disadv), Grasping (Restrained 1 min), Piercing (pass through one more target), Seeking (reroll miss once), Shadow (2d6 necrotic + Darkness aura)."]]),
    7:  SC([["Magic Arrow","Arrows count as magical."],["Curving Shot","When you miss with Arcane Shot, use Bonus Action to redirect at different target within 60 ft."]]),
    10: SC([["Additional Arcane Shot","Learn a 3rd Arcane Shot option."]]),
    15: SC([["Ever-Ready Shot","Regain one Arcane Shot use when rolling initiative with none remaining."]]),
  },
  "Echo Knight": {
    3:  SC([["Manifest Echo","Bonus Action: create a magical echo (AC 14, 1 HP, immune to all conditions) anywhere within 15 ft. Can attack from echo's position. Echo vanishes if 30+ ft away or dismissed."],["Unleash Incarnation","When you take the Attack action, make one additional melee attack from echo's position (CON mod times/Long Rest)."]]),
    7:  SC([["Echo Avatar","Use your Echo as a scrying sensor — see and hear through it (up to 10 min, PB times/Long Rest) while blinded/deafened yourself."]]),
    10: SC([["Shadow Martyr","Reaction: if an ally is hit, teleport echo to that space — the attack hits the echo instead (once/Short Rest)."]]),
    15: SC([["Reclaim Potential","When echo is destroyed, gain 2d6+CON Temp HP (PB times/Long Rest)."]]),
  },

  // ── MONK TRADITIONS ──────────────────────────────────────
  "Warrior of the Open Hand": {
    3:  SC([["Open Hand Technique","After hitting with Flurry of Blows, impose one effect: STR save or prone; DEX save or pushed 15 ft; reaction is stopped until start of next turn."]]),
    6:  SC([["Wholeness of Body","Bonus Action: regain 3× Monk level HP (once/Long Rest)."]]),
    11: SC([["Tranquility","End of Long Rest, gain effect of Sanctuary spell. Also: Advantage on DEX saves for 1 round when hit."]]),
    17: SC([["Quivering Palm","Set up lethal vibrations in a hit target (costs 3 ki). Later: use Action — 10d10 necrotic (CON save, DC 8+PB+WIS, fail=die; success=10d10)."]]),
  },
  "Warrior of Shadow": {
    3:  SC([["Shadow Arts","Spend 2 ki: cast Darkness, Darkvision, Pass without Trace, or Silence (no spell slot)."]],
        [{name:"Darkness",lvl:2},{name:"Darkvision",lvl:2},{name:"Pass without Trace",lvl:2},{name:"Silence",lvl:2}]),
    6:  SC([["Shadow Step","Bonus Action: teleport from one area of dim/no light to another within 60 ft. Advantage on next melee attack."]]),
    11: SC([["Cloak of Shadows","If in dim light/darkness, spend 1 ki — become invisible until attack, cast, or turn ends."]]),
    17: SC([["Opportunist","Reaction: attack a creature when it is attacked by someone other than you."]]),
  },
  "Warrior of the Elements": {
    3:  SC([["Elemental Attunement","At start of your turn while using Unarmed Strikes, choose one: deal 1d6 extra acid/cold/fire/lightning/thunder. Reach increases by 10 ft."],["Manipulate Elements","Action: spend 1 ki to cause minor elemental effect in 5 ft cube."]]),
    6:  SC([["Elemental Burst","When you spend ki, you can cause elemental eruption (DEX save, PB×d6 damage)."]]),
    11: SC([["Stride of the Elements","When you take Step of the Wind, gain flying + swimming speed = walking speed until end of turn."]]),
    17: SC([["Elemental Epitome","Resistance to your chosen element while attuned. Immunity at 17th level to that element."]]),
  },
  "Warrior of Mercy": {
    3:  SC([["Implements of Mercy","Proficiency with Herbalism Kit and Insight. Touch healing (2+PB HP) or harm (WIS save or Poisoned until next turn) for 1 ki."]],
        [], ["Insight","Herbalism Kit"]),
    6:  SC([["Physician's Touch","Touch a creature: end one disease or condition (Blinded, Deafened, Paralyzed, Poisoned, or Stunned). Spend 1 ki to also end one spell effect."]]),
    11: SC([["Flurry of Healing and Harm","Once per Flurry of Blows: one healing touch free (no ki), one harmful touch free (no ki)."]]),
    17: SC([["Hand of Ultimate Mercy","Spend 5 ki: touch a creature dead ≤24 hr. Restore it to 4d10+WIS HP and remove any curses/diseases."]]),
  },

  // ── PALADIN OATHS ─────────────────────────────────────────
  "Oath of Devotion": {
    3:  SC([["Channel Divinity: Sacred Weapon","Action: imbue one held weapon with holy energy for 1 min. +CHA to attack rolls (min +1), emits 20 ft bright light, counts as magical."],["Channel Divinity: Turn the Unholy","Action: each undead or fiend within 30 ft that can see/hear you must WIS save or be Turned for 1 min."]],
        [{name:"Protection from Evil and Good",lvl:1},{name:"Sanctuary",lvl:1}]),
    5:  SC([], [{name:"Lesser Restoration",lvl:2},{name:"Zone of Truth",lvl:2}]),
    7:  SC([["Aura of Devotion","You and allies within 10 ft are immune to the Charmed condition while you're conscious. (Expands to 30 ft at 18th level.)"]],
        [{name:"Beacon of Hope",lvl:3},{name:"Dispel Magic",lvl:3}]),
    9:  SC([], [{name:"Freedom of Movement",lvl:4},{name:"Guardian of Faith",lvl:4}]),
    11: SC([["Purity of Spirit","You are always under the effect of Protection from Evil and Good."]],
        [{name:"Commune",lvl:5},{name:"Flame Strike",lvl:5}]),
  },
  "Oath of the Ancients": {
    3:  SC([["Channel Divinity: Nature's Wrath","Action: vines restrain a creature within 10 ft (STR/DEX save DC 8+PB+CHA, repeat each turn)."],["Channel Divinity: Turn the Faithless","Turn fey and fiends within 30 ft for 1 min (WIS save)."]],
        [{name:"Ensnaring Strike",lvl:1},{name:"Speak with Animals",lvl:1}]),
    5:  SC([], [{name:"Moonbeam",lvl:2},{name:"Misty Step",lvl:2}]),
    7:  SC([["Aura of Warding","You and allies within 10 ft have resistance to spell damage."]],
        [{name:"Plant Growth",lvl:3},{name:"Protection from Energy",lvl:3}]),
    9:  SC([], [{name:"Ice Storm",lvl:4},{name:"Stoneskin",lvl:4}]),
    11: SC([["Undying Sentinel","When reduced to 0 HP, drop to 1 HP instead (once/Long Rest). You don't age."]],
        [{name:"Commune with Nature",lvl:5},{name:"Tree Stride",lvl:5}]),
  },
  "Oath of Vengeance": {
    3:  SC([["Channel Divinity: Abjure Enemy","Action: 60 ft — one fiend/undead is Frightened for 1 min (WIS save) or slowed to 0 speed (on success); other creatures Frightened on fail."],["Channel Divinity: Vow of Enmity","Bonus Action: Advantage on attack rolls vs one creature you can see within 10 ft for 1 min."]],
        [{name:"Bane",lvl:1},{name:"Hunter's Mark",lvl:1}]),
    5:  SC([], [{name:"Hold Person",lvl:2},{name:"Misty Step",lvl:2}]),
    7:  SC([["Relentless Avenger","When you hit with opportunity attack, move up to half speed immediately (no opportunity attacks)."]],
        [{name:"Haste",lvl:3},{name:"Protection from Energy",lvl:3}]),
    9:  SC([], [{name:"Banishment",lvl:4},{name:"Dimension Door",lvl:4}]),
    11: SC([["Soul of Vengeance","When your Vow of Enmity target attacks, Reaction: make one melee weapon attack against it."]],
        [{name:"Hold Monster",lvl:5},{name:"Scrying",lvl:5}]),
  },
  "Oath of Glory": {
    3:  SC([["Channel Divinity: Inspiring Smite","After Divine Smite, distribute 2d8+PB Temp HP to yourself and up to 5 allies within 30 ft."],["Channel Divinity: Peerless Athlete","Action: for 10 min, advantage on Athletics and Acrobatics, double carrying capacity, +10 ft jump distance."]],
        [{name:"Guiding Bolt",lvl:1},{name:"Heroism",lvl:1}]),
    5:  SC([], [{name:"Enhance Ability",lvl:2},{name:"Magic Weapon",lvl:2}]),
    7:  SC([["Aura of Alacrity","You and allies within 10 ft have +10 ft walking speed (30 ft at Lv18) at start of combat."]],
        [{name:"Haste",lvl:3},{name:"Protection from Energy",lvl:3}]),
    9:  SC([], [{name:"Compulsion",lvl:4},{name:"Freedom of Movement",lvl:4}]),
    11: SC([["Glorious Defense","Reaction: when you or an ally is hit by an attack you can see within 30 ft, add CHA modifier to AC (potentially causing a miss). For each hit prevented, one free weapon attack against attacker."]],
        [{name:"Legend Lore",lvl:5},{name:"Yolande's Regal Presence",lvl:5}]),
  },
  "Oathbreaker": {
    3:  SC([["Channel Divinity: Dreadful Aspect","30 ft — each non-undead/non-fiend must WIS save or be Frightened for 1 min."],["Channel Divinity: Control Undead","Command an undead within 30 ft (WIS save DC 8+PB+CHA or under your control for 24 hr)."]],
        [{name:"Hellish Rebuke",lvl:1},{name:"Inflict Wounds",lvl:1}]),
    5:  SC([], [{name:"Crown of Madness",lvl:2},{name:"Darkness",lvl:2}]),
    7:  SC([["Aura of Hate","You and undead/fiends within 10 ft add CHA modifier to melee weapon damage rolls."]],
        [{name:"Animate Dead",lvl:3},{name:"Bestow Curse",lvl:3}]),
    9:  SC([], [{name:"Blight",lvl:4},{name:"Confusion",lvl:4}]),
    11: SC([["Supernatural Resistance","Resistance to bludgeoning, piercing, and slashing damage from nonmagical weapons."]],
        [{name:"Contagion",lvl:5},{name:"Dominate Person",lvl:5}]),
  },

  // ── RANGER CONCLAVES ──────────────────────────────────────
  "Gloom Stalker": {
    3:  SC([["Dread Ambusher","Add PB to initiative. On first turn of combat, attack speed +10 ft and one extra attack (1d8 extra damage on the first attack)."],["Umbral Sight","Darkvision 60 ft (or +60 ft). Invisible to creatures relying on darkvision."],["Iron Mind","Proficiency in WIS saves (or expertise if already proficient)."]],
        [{name:"Disguise Self",lvl:1},{name:"Fear",lvl:3},{name:"Rope Trick",lvl:2}]),
    7:  SC([["Stalker's Flurry","Once per turn on a miss, make one additional weapon attack."]]),
    11: SC([["Shadowy Dodge","Reaction: impose disadvantage on an attack roll against you."]]),
    15: SC([["Shadowy Dodge (Lv15)","Perfect Ambush: you always act in the surprise round."]]),
  },
  "Hunter": {
    3:  SC([["Hunter's Prey","Choose one: Colossus Slayer (1d8 extra vs wounded target, once/turn), Giant Killer (Reaction attack vs Large+ creature that misses you), or Horde Breaker (second attack vs different creature within 5 ft of first target)."]]),
    7:  SC([["Defensive Tactics","Choose one: Escape the Horde (disadv on opportunity attacks vs you), Multiattack Defense (+4 AC after being hit until start of your next turn), or Steel Will (advantage on saves vs Frightened)."]]),
    11: SC([["Multiattack","Choose: Volley (ranged attack vs all in 10 ft cylinder within range) or Whirlwind Attack (melee attack vs all within 5 ft)."]]),
    15: SC([["Superior Hunter's Defense","Choose: Evasion, Stand Against the Tide (when enemy misses you, redirect to adjacent enemy), or Uncanny Dodge (halve damage when hit once per turn)."]]),
  },
  "Beast Master": {
    3:  SC([["Primal Companion","Summon a primal beast (land/sea/sky) that obeys your commands. Uses a stat block tied to your PB. You can direct it on your turn as a bonus action."]]),
    7:  SC([["Exceptional Training","On your turn, command Beast to Dash/Disengage/Help (bonus action). Beast attacks are magical."]]),
    11: SC([["Bestial Fury","Beast can make two attacks when you command it to attack."]]),
    15: SC([["Share Spells","When you cast a spell targeting yourself, you can also make the spell target your beast companion."]]),
  },
  "Fey Wanderer": {
    3:  SC([["Dreadful Strikes","Weapon attacks deal an extra 1d4 psychic damage (increases to 1d6 at Lv11)."],["Otherworldly Glamour","Add WIS modifier to CHA checks. Proficiency in Deception, Performance, or Persuasion (your choice)."]],
        [{name:"Charm Person",lvl:1},{name:"Misty Step",lvl:2},{name:"Dispel Magic",lvl:3}],
        ["Deception"]),
    7:  SC([["Beguiling Twist","Reaction when creature succeeds on save vs Charm/Frighten: redirect effect to another creature within 30 ft."]]),
    11: SC([["Fey Reinforcements","Learn Summon Fey. Cast it once per Long Rest for free."]],
        [{name:"Summon Fey",lvl:3}]),
    15: SC([["Misty Wanderer","Misty Step free once per Long Rest. Bring willing creature with you."]]),
  },
  "Swarmkeeper": {
    3:  SC([["Gathered Swarm","Summon a swarm of fey spirits (insects/birds/etc). On a weapon hit: bonus 1d6 damage OR move target 15 ft OR move yourself 5 ft (all STR save DC 8+PB+WIS)."]]),
    7:  SC([["Writhing Tide","Bonus Action: fly speed = walk speed using the swarm for 1 min (once per Long Rest)."]]),
    11: SC([["Mighty Swarm","Swarm attacks grapple or blind on a failed save."]]),
    15: SC([["Swarming Dispersal","Reaction when taking damage: vanish (Invisibility until end of next turn) and teleport up to 30 ft."]]),
  },

  // ── ROGUE ARCHETYPES ──────────────────────────────────────
  "Thief": {
    3:  SC([["Fast Hands","Use Sleight of Hand, use a tool, or use an object as a Bonus Action."],["Second-Story Work","Climbing costs no extra movement. Running jump distance increased by DEX modifier."]]),
    9:  SC([["Supreme Sneak","Advantage on Stealth checks when moving ≤ half speed."]]),
    13: SC([["Use Magic Device","Ignore class/race/level requirements on magic items."]]),
    17: SC([["Thief's Reflexes","Take two turns in first round of combat (one at normal initiative, one at -10)."]]),
  },
  "Assassin": {
    3:  SC([["Bonus Proficiencies","Disguise Kit and Poisoner's Kit proficiency."],["Assassinate","Advantage on attacks vs creatures that haven't taken a turn yet. Attacks against surprised creatures are critical hits."]],
        [], ["Disguise Kit","Poisoner's Kit"]),
    9:  SC([["Infiltration Expertise","Spend 25 gp and 7 days to create a new identity. Establish a convincing persona."]]),
    13: SC([["Impostor","Unerringly mimic another person's speech, writing, and behavior."]]),
    17: SC([["Death Strike","When you Assassinate, target must make CON save DC 8+PB+DEX or take double damage."]]),
  },
  "Arcane Trickster": {
    3:  SC([["Spellcasting","Cast Wizard spells using INT. Learn 3 cantrips (2 Enchantment/Illusion). Learn 3 spells (2 Enchantment/Illusion)."],["Mage Hand Legerdemain","Mage Hand is invisible, can stow/retrieve objects, pick locks/disarm traps remotely."]],
        [{name:"Mage Hand",lvl:0},{name:"Minor Illusion",lvl:0},{name:"Charm Person",lvl:1}]),
    9:  SC([["Magical Ambush","If hidden when you cast a spell, target has disadvantage on saving throw."]]),
    13: SC([["Versatile Trickster","Bonus Action: distract a creature with Mage Hand (advantage on attacks vs it until end of turn)."]]),
    17: SC([["Spell Thief","Reaction when targeted by a spell: make INT save DC 8+PB+caster's spellcasting mod. On success: steal the spell (caster loses it) and you can cast it once for free within 8 hours."]]),
  },
  "Soulknife": {
    3:  SC([["Psionic Power","Gain PB Psionic Energy Dice (d6) per Long Rest."],["Psychic Blades","Manifest one or two psychic blades as part of an attack (1d6+DEX psychic, off-hand 1d4+DEX). Disappear after attack. Count as thrown (60 ft)."]]),
    9:  SC([["Soul Blades","Homing Strikes (spend 1 die: reroll missed attack), Psychic Teleportation (bonus action: throw blade up to 10×Psionic die, teleport there)."]]),
    13: SC([["Psychic Veil","Bonus Action: spend 1 die — Invisible for 1 hr or until you dismiss/attack/force a save."]]),
    17: SC([["Rend Mind","When you Sneak Attack a creature with psychic blades, impose STR save DC 8+PB+DEX — fail: Stunned until end of next turn (costs 3 Psionic dice)."]]),
  },
  "Phantom": {
    3:  SC([["Whispers of the Dead","After Short/Long Rest, gain proficiency in one skill or tool chosen from those the dead knew."],["Wails from the Grave","After Sneak Attack, deal half the Sneak Attack dice as necrotic damage to a DIFFERENT creature within 30 ft (PB times/Long Rest)."]]),
    9:  SC([["Tokens of the Departed","When humanoid within 30 ft dies, conjure Tiny Soul Trinket (object of your choice). While you hold it: Speak with Dead once per death, Advantage on INT/WIS/CHA checks vs undead."]]),
    13: SC([["Ghost Walk","Bonus Action: assume spectral form for 10 min (fly speed 10 ft, hover; attacks have disadvantage vs you). Once/Long Rest."]]),
    17: SC([["Death's Friend","Wails from the Grave works on the first creature you Sneak Attack AND another creature. Soul Trinket grants +PB to attack and damage rolls."]]),
  },

  // ── SORCERER ORIGINS ──────────────────────────────────────
  "Draconic Bloodline": {
    3:  SC([["Dragon Ancestor","Choose a dragon type (determines damage type for features)."],["Draconic Resilience","HP max +1 per Sorcerer level. While not wearing armor, AC = 13+DEX."],["Draconic Lineage Spell","Add dragon-type spell to Sorcerer known spells."]]),
    6:  SC([["Elemental Affinity","When you cast a spell dealing your dragon ancestor's damage type, add CHA to one damage roll. Spend 1 Sorcery Point to gain resistance to that type for 1 hr."]]),
    14: SC([["Dragon Wings","Bonus Action: sprout wings — fly speed = walk speed."]]),
    18: SC([["Draconic Presence","Spend 5 Sorcery Points: aura of 60 ft for 1 min. Enemies in range are Frightened or Charmed (your choice, WIS save)."]]),
  },
  "Wild Magic": {
    3:  SC([["Wild Magic Surge","When you cast a spell of 1st level+, DM may ask you to roll 1d20. On a 1, roll on Wild Magic Surge table."],["Tides of Chaos","Advantage on one attack roll, ability check, or save. Recharges after Long Rest or when Wild Magic Surge triggers."]]),
    6:  SC([["Bend Luck","Reaction: spend 2 Sorcery Points to add/subtract 1d4 to a creature's attack roll/save/ability check within 60 ft."]]),
    14: SC([["Controlled Chaos","When you roll on the Wild Magic Surge table, roll twice and use either result."]]),
    18: SC([["Spell Bombardment","Once per turn when spell damage dice show max, roll one extra die and add it."]]),
  },
  "Aberrant Mind": {
    3:  SC([["Psionic Spells","Aberrant Mind spells added to Sorcerer known list."],["Telepathic Speech","Bonus Action: communicate telepathically with one creature within 30 ft for CHA minutes."]],
        [{name:"Arms of Hadar",lvl:1},{name:"Dissonant Whispers",lvl:1}]),
    6:  SC([["Psionic Sorcery","When you cast a spell from Aberrant Mind list, cast it using 1 fewer Sorcery Point (min 1)."],["Psychic Defenses","Resistance to psychic damage. Advantage on saves vs Frightened/Charmed."]],
        [{name:"Calm Emotions",lvl:2},{name:"Detect Thoughts",lvl:2}]),
    14: SC([["Revelation in Flesh","Bonus Action: spend 1+ Sorcery Points to transform (fly/swim speed, see invisible, move through objects 1 ft thick per turn, etc)."]],
        [{name:"Hunger of Hadar",lvl:3},{name:"Telekinesis",lvl:5}]),
    18: SC([["Warping Implosion","Action: teleport up to 120 ft. Creatures within 30 ft of origin take 3d10 force and pulled 30 ft toward you (STR save halves/resists)."]]),
  },
  "Clockwork Soul": {
    3:  SC([["Clockwork Magic","Add Clockwork Soul spells to known list."],["Restore Balance","Reaction: cancel advantage or disadvantage on a d20 roll within 60 ft (PB times/Long Rest)."]],
        [{name:"Alarm",lvl:1},{name:"Protection from Evil and Good",lvl:1}]),
    6:  SC([["Bastion of Law","Spend 1–5 Sorcery Points: create Ward of X×d8 Temp HP on a creature within 30 ft. Ward absorbs damage until depleted or Long Rest."]],
        [{name:"Aid",lvl:2},{name:"Lesser Restoration",lvl:2}]),
    14: SC([["Trance of Order","Bonus Action: enter trance for 1 min. Attack rolls against you can't benefit from advantage. Minimum 10 on all your d20 rolls."]],
        [{name:"Protection from Energy",lvl:3},{name:"Dispel Magic",lvl:3}]),
    18: SC([["Clockwork Cavalcade","Channel the plane of order — cast Dispel Magic and Heal for free within 30 ft cone."]]),
  },
  "Shadow Magic": {
    3:  SC([["Eyes of the Dark","Darkvision 120 ft. At 3rd level: spend 1 Sorcery Point to cast Darkness without requiring Concentration."],["Strength of the Grave","When reduced to 0 HP, make CHA save DC 5+damage taken to drop to 1 HP instead (once/Long Rest, not vs radiant/critical)."]]),
    6:  SC([["Hound of Ill Omen","Spend 3 Sorcery Points: summon Hound of Ill Omen to hound a target. Target has disadvantage on saves vs your spells while hound is adjacent."]]),
    14: SC([["Shadow Walk","When in dim light/darkness at start of your turn, teleport up to 120 ft to another dim/dark space as Bonus Action."]]),
    18: SC([["Umbral Form","Spend 6 Sorcery Points: become shadow for 1 min. Resistance to all damage except psychic/radiant. Move through creatures/objects."]]),
  },

  // ── WARLOCK PATRONS ───────────────────────────────────────
  "The Archfey": {
    3:  SC([["Fey Presence","Action: fey aura in 10 ft cube — creatures must WIS save DC 8+PB+CHA or Charmed/Frightened until end of your next turn (once/Short Rest)."]],
        [{name:"Faerie Fire",lvl:1},{name:"Sleep",lvl:1}]),
    6:  SC([["Misty Escape","Reaction when taking damage: turn invisible and teleport 60 ft. Invisibility ends when you attack/cast (once/Short Rest)."]],
        [{name:"Calm Emotions",lvl:2},{name:"Phantasmal Force",lvl:2}]),
    10: SC([["Beguiling Defenses","Immune to Charmed. Reaction: reflect charm — charmer must WIS save or be charmed for 1 min."]],
        [{name:"Blink",lvl:3},{name:"Plant Growth",lvl:3}]),
    14: SC([["Dark Delirium","Action: one creature within 60 ft — WIS save DC 8+PB+CHA or Charmed/Frightened for 1 min (ends if damaged). Once/Long Rest."]],
        [{name:"Dominate Beast",lvl:4},{name:"Greater Invisibility",lvl:4}]),
  },
  "The Fiend": {
    3:  SC([["Dark One's Blessing","When you reduce a creature to 0 HP, gain Temp HP = CHA+Warlock level."],["Dark One's Own Luck","When you make an ability check or save, add 1d10 to the roll (once per Short/Long Rest for each feature use)."]],
        [{name:"Burning Hands",lvl:1},{name:"Command",lvl:1}]),
    6:  SC([["Dark One's Own Luck (Lv6)","Add 1d10 to any ability check or save (separate uses per Short/Long Rest)."]],
        [{name:"Blindness/Deafness",lvl:2},{name:"Scorching Ray",lvl:2}]),
    10: SC([["Fiendish Resilience","Short Rest: choose one damage type. Resistance to that type until next Short/Long Rest."]],
        [{name:"Fireball",lvl:3},{name:"Stinking Cloud",lvl:3}]),
    14: SC([["Hurl Through Hell","When you hit a creature, banish it to hell for 10 sec. Returns to previous space, takes 10d10 psychic damage (not vs fiends/undead). Once/Long Rest."]],
        [{name:"Fire Shield",lvl:4},{name:"Wall of Fire",lvl:4}]),
  },
  "The Great Old One": {
    3:  SC([["Awakened Mind","Telepathically communicate with creature within 30 ft that has a language. Two-way communication begins at Lv6."]],
        [{name:"Dissonant Whispers",lvl:1},{name:"Tasha's Hideous Laughter",lvl:1}]),
    6:  SC([["Entropic Ward","Reaction: impose disadvantage on attack roll against you. If it misses, advantage on next attack vs attacker (once/Short Rest)."]],
        [{name:"Detect Thoughts",lvl:2},{name:"Phantasmal Force",lvl:2}]),
    10: SC([["Thought Shield","Resistance to psychic damage. When a creature deals psychic damage to you, they take equal damage."]],
        [{name:"Clairvoyance",lvl:3},{name:"Hunger of Hadar",lvl:3}]),
    14: SC([["Create Thrall","Touch an incapacitated humanoid — it becomes Charmed by you until Remove Curse is cast. Telepathy with it at any distance."]],
        [{name:"Dominate Beast",lvl:4},{name:"Evard's Black Tentacles",lvl:4}]),
  },
  "The Undead": {
    3:  SC([["Form of Dread","Bonus Action: frightening form for 1 min (PB times/Long Rest). Immunity to Frightened, attacks impose Frightened on fail (WIS save DC 8+PB+CHA), and choose one: necrotic damage can't reduce your HP below 1."]],
        [{name:"Bane",lvl:1},{name:"False Life",lvl:1}]),
    6:  SC([["Grave Touched","You stop aging. Once per turn: change one die of damage to necrotic, and deal +1d10 necrotic while in Form of Dread."]],
        [{name:"Blindness/Deafness",lvl:2},{name:"Phantasmal Force",lvl:2}]),
    10: SC([["Necrotic Husk","Resistance to necrotic damage. Immunity while in Form of Dread. When dropped to 0 HP, drop to 1 HP and end Form of Dread (once/Long Rest)."]],
        [{name:"Phantom Steed",lvl:3},{name:"Speak with Dead",lvl:3}]),
    14: SC([["Spirit Projection","Bonus Action: leave body. Astral projection for 1 hr: fly speed = walk, resistance to all damage, Necrotic Husk and Grave Touched work; body is unconscious."]]),
  },
  "The Celestial": {
    3:  SC([["Healing Light","Pool of d6s = Warlock level+CHA. As bonus action, heal a creature within 60 ft (spend any number of dice). Replenish pool on Long Rest."],["Sacred Flame (bonus cantrip)","Learn Sacred Flame and Light as bonus cantrips."]],
        [{name:"Cure Wounds",lvl:1},{name:"Guiding Bolt",lvl:1}]),
    6:  SC([["Radiant Soul","Resistance to radiant damage. Add CHA to one radiant/fire damage roll per spell cast."]],
        [{name:"Flaming Sphere",lvl:2},{name:"Lesser Restoration",lvl:2}]),
    10: SC([["Celestial Resilience","When you finish a Short/Long Rest, you and 5 allies gain Temp HP = Warlock level+CHA."]],
        [{name:"Daylight",lvl:3},{name:"Revivify",lvl:3}]),
    14: SC([["Searing Vengeance","When you start your turn at 0 HP, you can return to PB×2d8+CHA HP. Nearby creatures take radiant damage and are Blinded. Once/Long Rest."]],
        [{name:"Guardian of Faith",lvl:4},{name:"Wall of Fire",lvl:4}]),
  },

  // ── WIZARD TRADITIONS ─────────────────────────────────────
  "Evocation": {
    3:  SC([["Evocation Savant","Gold and time to copy Evocation spells halved."],["Sculpt Spells","Create pockets of safety in Evocation spells — chosen creatures automatically succeed saves and take no damage from the spell."]]),
    6:  SC([["Potent Cantrip","Failed save against damage cantrip still takes half damage."]]),
    10: SC([["Empowered Evocation","Add INT modifier to damage rolls of Wizard Evocation spells."]]),
    14: SC([["Overchannel","Deal maximum damage with Evocation spell of 5th level or lower (no Concentration). First use free, subsequent uses that turn: 2d12 necrotic damage per spell level."]]),
  },
  "Abjuration": {
    3:  SC([["Abjuration Savant","Halve gold/time to copy Abjuration spells."],["Arcane Ward","When you cast an Abjuration spell, create a ward with HP = 2×Wizard level+INT. Absorbs damage first. Refresh when casting Abjuration spells of 1st+ level (+2×slot level HP)."]]),
    6:  SC([["Projected Ward","Reaction: when creature within 30 ft takes damage, your Arcane Ward intercepts."]]),
    10: SC([["Improved Abjuration","Add PB to Counterspell and Dispel Magic ability checks."]]),
    14: SC([["Spell Resistance","Advantage on saves vs spells. Resistance to spell damage."]]),
  },
  "Divination": {
    3:  SC([["Divination Savant","Halve gold/time for Divination spells."],["Portent","After Long Rest, roll 2d20 and record. Replace any roll made by you or visible creature with one Portent die (lose that die)."]]),
    6:  SC([["Expert Divination","When you cast a Divination spell of 2nd+, regain a spell slot of lower level (once per Long Rest)."]]),
    10: SC([["The Third Eye","Bonus Action: gain one of: Darkvision 60 ft; Ethereal Sight 60 ft; greater comprehension (read any language); or see invisibility 10 ft."]]),
    14: SC([["Greater Portent","Roll 3 portent dice instead of 2 after Long Rest."]]),
  },
  "Conjuration": {
    3:  SC([["Conjuration Savant","Halve cost for Conjuration spells."],["Minor Conjuration","Action: conjure a Tiny non-magical inanimate object (max 10 lb) in your hand or on a surface. Lasts 1 hr or until used as a spell focus."]]),
    6:  SC([["Benign Transposition","Teleport to unoccupied space within 30 ft, or swap with a willing Small/Medium creature. Recharges on Long Rest (or on conjuration spell cast)."]]),
    10: SC([["Focused Conjuration","Concentration on Conjuration spells can't be broken by taking damage."]]),
    14: SC([["Durable Summons","Conjured/summoned creatures gain 30 Temp HP."]]),
  },
  "Illusion": {
    3:  SC([["Illusion Savant","Halve cost for Illusion spells."],["Improved Minor Illusion","Cast Minor Illusion as a bonus action. Can create both a sound and image simultaneously."]]),
    6:  SC([["Malleable Illusions","Action: change Illusion spell's nature while concentrating on it."]]),
    10: SC([["Illusory Self","Reaction when attacked: an illusion appears, causing the attack to miss (recharges Short Rest)."]]),
    14: SC([["Illusory Reality","After casting Illusion spell of 1st+, make one non-creature object in the illusion real for 1 min (no concentration, no damage)."]]),
  },
  "Necromancy": {
    3:  SC([["Necromancy Savant","Halve cost for Necromancy spells."],["Grim Harvest","Once per turn when you kill with a spell: regain HP = 2×spell level (3× for Necromancy spells). Doesn't work on undead/constructs."]]),
    6:  SC([["Undead Thralls","Animate Dead targets an extra body. Undead you animate have: +PB to damage rolls, +Wizard level to max HP."]]),
    10: SC([["Inured to Undeath","Resistance to necrotic damage. Max HP can't be reduced."]]),
    14: SC([["Command Undead","Action: one undead within 60 ft — CHA save DC 8+PB+INT or under your control indefinitely (INT 8+ can repeat the save after 24 hr)."]]),
  },
  "Transmutation": {
    3:  SC([["Transmutation Savant","Halve cost for Transmutation spells."],["Minor Alchemy","Transmute a non-magical object of one material into another (wood/stone/iron/copper/silver/gold) for 1 hr per 10 min of concentration."]]),
    6:  SC([["Transmuter's Stone","Create a stone granting one benefit: Darkvision 60 ft, +10 ft speed, proficiency in CON saves, or resistance to acid/cold/fire/lightning/thunder. Change benefit as an action."]]),
    10: SC([["Shapechanger","Cast Polymorph on self without a slot (once/Short Rest). Revert to normal when Concentration ends."]]),
    14: SC([["Master Transmuter","Action: destroy Transmuter's Stone to cast one of: Polymorph, Resurrection, a 5th-level transmutation spell, or remove all curses/diseases/poisons on a creature."]]),
  },
};

// ── Feat spell grants (spells added to character sheet on feat selection) ──
// Helper: given subclass name + level → returns gains object from SUBCLASS_PROGRESSION
const getSubclassGains = (subclassName, level) => {
  const match = subclassName?.match(/\(([^)]+)\)/);
  const key = match ? match[1] : subclassName;
  return SUBCLASS_PROGRESSION[key]?.[level] || null;
};
// ════════════════════════════════════════════════════════════════════
// STATUS_CONDITIONS_DATABASE — D&D 2024 condition definitions.
// Each entry: id, name, color (badge), icon, effects[] (human text),
//   forcesDisadvantage: ["attack","check","save"] — auto-applied in performRoll
//   locksActions: true — greys-out Actions/Bonus/Reactions tabs
//   locksMovement: true — movement locked to 0
// ════════════════════════════════════════════════════════════════════
const STATUS_CONDITIONS_DATABASE = {
  blinded:       { id:"blinded",       name:"Blinded",       color:"#374151", icon:"🙈",
    effects:["Automatically fail any ability check requiring sight","Attack rolls against you have advantage","Your attack rolls have disadvantage"],
    forcesDisadvantage:["attack"],
  },
  bloodied:      { id:"bloodied",      name:"Bloodied",      color:"#b91c1c", icon:"🩸",
    effects:["Below half maximum HP — a signal of serious injury (narrative/mechanical marker)"],
  },
  charmed:       { id:"charmed",       name:"Charmed",       color:"#db2777", icon:"💞",
    effects:["Can't attack the charmer or target them with harmful abilities or magical effects","Charmer has advantage on Charisma checks against you"],
  },
  concentrating: { id:"concentrating", name:"Concentrating", color:"#0284c7", icon:"🔮",
    effects:["Maintaining a Concentration spell","Take damage → DC 10 or half-damage (whichever is higher) CON save or lose Concentration"],
  },
  deafened:      { id:"deafened",      name:"Deafened",      color:"#6b7280", icon:"🔇",
    effects:["Can't hear","Automatically fail any ability check requiring hearing"],
  },
  exhaustion:    { id:"exhaustion",    name:"Exhausted",     color:"#92400e", icon:"😓",
    effects:["Level 1: Disadvantage on d20 Tests","Level 2: Speed halved","Level 3: Disadvantage on all attacks and saves","Level 4: Max HP halved","Level 5: Speed 0","Level 6: Death"],
  },
  frightened:    { id:"frightened",    name:"Frightened",    color:"#7c3aed", icon:"😱",
    effects:["Disadvantage on Ability Checks and Attack rolls while the source of fear is within line of sight","Can't willingly move closer to the source of your fear"],
    forcesDisadvantage:["attack","check"],
  },
  grappled:      { id:"grappled",      name:"Grappled",      color:"#b45309", icon:"🤼",
    effects:["Speed becomes 0","Speed can't increase","Ends if grappler is incapacitated or grappled creature is moved out of reach"],
    locksMovement:true,
  },
  incapacitated: { id:"incapacitated", name:"Incapacitated", color:"#6b7280", icon:"💤",
    effects:["Can't take Actions","Can't take Bonus Actions","Can't take Reactions","Can't concentrate on spells"],
    locksActions:true,
  },
  invisible:     { id:"invisible",     name:"Invisible",     color:"#1e3a5f", icon:"👻",
    effects:["Impossible to see without special sense","Attack rolls against you have disadvantage","Your attack rolls have advantage","You gain advantage on DEX (Stealth) checks"],
  },
  paralyzed:     { id:"paralyzed",     name:"Paralyzed",     color:"#4b5563", icon:"⚡",
    effects:["Incapacitated (no Actions, Bonus Actions, Reactions)","Can't move or speak","Automatically fail STR and DEX saves","Attack rolls against you have advantage","Any hit within 5 ft is a critical hit"],
    locksActions:true,
    locksMovement:true,
    forcesDisadvantage:["save"],
  },
  petrified:     { id:"petrified",     name:"Petrified",     color:"#78716c", icon:"🗿",
    effects:["Transformed into solid inanimate substance","Incapacitated, can't move or speak","Weight increases by factor of 10, stops aging","Resistant to all damage","Immune to Poison and Disease","Automatically fail STR and DEX saves"],
    locksActions:true,
    locksMovement:true,
  },
  poisoned:      { id:"poisoned",      name:"Poisoned",      color:"#15803d", icon:"🤢",
    effects:["Disadvantage on Attack rolls","Disadvantage on Ability Checks"],
    forcesDisadvantage:["attack","check"],
  },
  prone:         { id:"prone",         name:"Prone",         color:"#854d0e", icon:"⬇️",
    effects:["Disadvantage on Attack rolls","Melee attacks against you have advantage","Ranged attacks against you have disadvantage","Getting up costs half your movement speed"],
    forcesDisadvantage:["attack"],
  },
  restrained:    { id:"restrained",    name:"Restrained",    color:"#92400e", icon:"⛓",
    effects:["Speed becomes 0","Attack rolls against you have advantage","Your attack rolls have disadvantage","Disadvantage on DEX saves"],
    forcesDisadvantage:["attack"],
    locksMovement:true,
  },
  stunned:       { id:"stunned",       name:"Stunned",       color:"#1e40af", icon:"💫",
    effects:["Incapacitated (no Actions, Bonus Actions, Reactions)","Can't move","Can speak only falteringly","Automatically fail STR and DEX saves","Attack rolls against you have advantage"],
    locksActions:true,
    locksMovement:true,
    forcesDisadvantage:["save"],
  },
  unconscious:   { id:"unconscious",   name:"Unconscious",   color:"#1f2937", icon:"💀",
    effects:["Incapacitated","Can't move or speak","Unaware of surroundings","Drop everything held","Fall Prone","Automatically fail STR and DEX saves","Attack rolls against you have advantage","Any hit within 5 ft is a critical hit"],
    locksActions:true,
    locksMovement:true,
  },
};

// Flat CONDITIONS list for tracker pill menu (preserves legacy compat)
const CONDITIONS = Object.values(STATUS_CONDITIONS_DATABASE).map(c=>c.name);

// Helper — given a combatant/character's conditions array, return set of active condition IDs
// Reads from both .conditions (planned future field) and .status (combat tracker field)
const getActiveConditions = (entity) => {
  const conds = [...(entity?.conditions||[]), ...(entity?.status||[])];
  return new Set(
    conds.map(c => {
      if (typeof c === "string") {
        // Legacy: match by name
        const found = Object.values(STATUS_CONDITIONS_DATABASE).find(d => d.name === c || d.id === c.toLowerCase());
        return found ? found.id : null;
      }
      return c;
    }).filter(Boolean)
  );
};

// Returns true if any active condition forces disadvantage on the given roll type
const conditionForcesDisadvantage = (entity, rollType) => {
  const activeIds = getActiveConditions(entity);
  return [...activeIds].some(id => (STATUS_CONDITIONS_DATABASE[id]?.forcesDisadvantage||[]).includes(rollType));
};

// Returns true if any active condition locks actions (Incapacitated, Paralyzed, Stunned)
const conditionLocksActions = (entity) => {
  const activeIds = getActiveConditions(entity);
  return [...activeIds].some(id => STATUS_CONDITIONS_DATABASE[id]?.locksActions);
};


const VENDOR_INVENTORIES = {
  "Dragon's Rest - Myla's Workshop": [
    { name:"Tinker's Tools",cost:"50 gp",desc:"A set of tools for tinkering." },
    { name:"Alchemist's Fire",cost:"50 gp",desc:"Sticky fluid that ignites when exposed to air (2d4 fire/turn)." },
    { name:"Light Crossbow",cost:"25 gp",desc:"Simple ranged weapon. 1d8 piercing." },
    { name:"Crossbow Bolts (20)",cost:"1 gp",desc:"Ammunition for a crossbow." },
    { name:"Rope, Hempen (50 ft)",cost:"1 gp",desc:"A strong rope." },
    { name:"Lantern, Bullseye",cost:"10 gp",desc:"Bright light in a 60-foot cone." },
  ],
  "Neverwinter - Port Docks": [
    { name:"Dagger",cost:"2 gp",desc:"Simple melee/thrown. 1d4 piercing. Mastery: Nick." },
    { name:"Shortsword",cost:"10 gp",desc:"Martial melee. 1d6 piercing. Mastery: Vex." },
    { name:"Leather Armor",cost:"10 gp",desc:"Light armor. AC 11+DEX." },
    { name:"Potion of Healing",cost:"50 gp",desc:"Restores 2d4+2 HP." },
    { name:"Rope, Hempen (50 ft)",cost:"1 gp",desc:"A strong rope." },
  ],
  "Neverwinter - Protector's Enclave Market": [
    { name:"Backpack",cost:"2 gp",desc:"A large canvas bag." },
    { name:"Rations (1 day)",cost:"5 sp",desc:"Dry foods suitable for travel." },
    { name:"Torch",cost:"1 cp",desc:"Burns for 1 hour. Bright 20 ft, dim 20 ft." },
    { name:"Waterskin",cost:"2 sp",desc:"Holds 4 pints of liquid." },
    { name:"Bedroll",cost:"1 gp",desc:"A basic sleeping roll." },
  ],
  "Neverwinter - Shining Knight Arms & Armor": [
    { name:"Longsword",cost:"15 gp",desc:"Versatile martial. 1d8/1d10 slashing. Mastery: Sap." },
    { name:"Battleaxe",cost:"10 gp",desc:"Versatile martial. 1d8/1d10 slashing. Mastery: Topple." },
    { name:"Shield",cost:"10 gp",desc:"+2 AC." },
    { name:"Chain Mail",cost:"75 gp",desc:"Heavy armor. AC 16. STR 13 req. Stealth disadv." },
    { name:"Breastplate",cost:"400 gp",desc:"Medium armor. AC 14 + DEX (max 2)." },
  ],
  "Neverwinter - The Beached Leviathan": [
    { name:"Ale (Mug)",cost:"4 cp",desc:"A refreshing drink." },
    { name:"Hearty Meal",cost:"5 sp",desc:"A filling meal." },
    { name:"Room Key (1 night)",cost:"5 sp",desc:"A comfortable bed." },
    { name:"Local Rumors",cost:"1 sp",desc:"Juicy gossip or useful information." },
  ],
};

const CAMPAIGN_TEXT = `
# Dragons of Stormwreck Isle - DM Guide

## Adventure Background
Two dragon families—Bahamut's metallic dragons and Tiamat's chromatic dragons—are in eternal conflict. Sharruth, an ancient red dragon, was imprisoned beneath the ocean by metallic dragons, causing volcanic activity that formed Stormwreck Isle. Her magic drew other dragons, making the island a battlefield.

## Key Locations
- **Neverwinter**: Major city on the Sword Coast, starting point.
- **Dragon's Rest**: A cloister on Stormwreck Isle, home base. Run by Elder Runara (ancient brass dragon in human form).
- **Seagrow Caves**: Sea caves with sea spawn serving the Scaled Queen.
- **Cursed Shipwreck**: The Compass Rose, wrecked by Sparkrender (blue dragon wyrmling).
- **Stormwreck Isle Summit**: Lair of Sparkrender, who seeks to free Sharruth.

## Key NPCs
- **Elder Runara**: Ancient brass dragon as elderly human. Wise, kind. Runs Dragon's Rest.
- **Tarak**: Half-orc monk at Dragon's Rest. Suspicious of strangers but loyal.
- **Myla**: Gnome tinker at Dragon's Rest workshop.
- **Sparkrender**: Young blue dragon wyrmling, antagonist. Wants to free Sharruth.
- **The Scaled Queen**: Large two-headed merrow blessed by Demogorgon.

## Scripted Event: Merrow Encounter
TRIGGER: Players charter a ship to leave Neverwinter for Stormwreck Isle.
ACTION: Describe journey, storm, a Merrow boards demanding "400 gold or your lives" for the Scaled Queen.
RESOLUTION: Negotiate (DC 15, each success = -100gp), attack (roll initiative), or creative solution.

## Encounters
- Sea Spawn (CR 1): HP 32, AC 11, +4 melee, 1d6+2
- Zombie (CR 1/4): HP 22, AC 8, Slam +3 1d6+1
- Sparkrender (Blue Dragon Wyrmling, CR 3): HP 52, AC 17, Bite +4 2d10+2, Lightning Breath DC12 DEX 4d8
- Merrow (CR 2): HP 45, AC 13, Harpoon +6 2d6+4

## 2024 D&D Rules Notes
- Weapon Mastery: Each class has a set of weapons they can apply Mastery to.
- Bloodied: A creature at 50% or less HP is considered Bloodied (visible to all).
- Exhaustion 2024: Each level imposes -2 to all d20 Tests (attacks, ability checks, saves). 10 levels = death.
- Critical Hits: Roll all damage dice twice (including Sneak Attack, Divine Smite, etc.).
`;

// ─────────────────────────────────────────────────────────
// INITIAL CHARACTERS (pre-built 2024 party)
// ─────────────────────────────────────────────────────────
const makeSkills = (stats, profMap = {}, expertMap = {}) => {
  const SKILL_STAT = { "Acrobatics":"dex","Animal Handling":"wis","Arcana":"int","Athletics":"str","Deception":"cha","History":"int","Insight":"wis","Intimidation":"cha","Investigation":"int","Medicine":"wis","Nature":"int","Perception":"wis","Performance":"cha","Persuasion":"cha","Religion":"int","Sleight of Hand":"dex","Stealth":"dex","Survival":"wis" };
  const prof = 2;
  return Object.entries(SKILL_STAT).map(([name, stat]) => {
    const base = Math.floor((stats[stat] - 10) / 2);
    const p = profMap[name] || false;
    const e = expertMap[name] || false;
    return { name, mod: base + (e ? prof*2 : p ? prof : 0), prof: p, expert: e };
  });
};

const INITIAL_CHARACTERS = [
  {
    id:"ariyah", name:"Ariyah", species:"Orc", speciesId:"orc", class:"Fighter", subclass:null,
    background:"Soldier", backgroundId:"soldier", originFeat:"Alert",
    level:1, xp:0, inspiration:false, exhaustion:0,
    currency:{ pp:0, gp:79, sp:0, cp:0 },
    stats:{ str:20, dex:12, con:14, int:8, wis:11, cha:10 },
    hp:{ current:16, max:16, temp:0 }, ac:16, speed:30, initiative:3, proficiency:2,
    skills: makeSkills({ str:20,dex:12,con:14,int:8,wis:11,cha:10 }, { "Athletics":true,"Intimidation":true,"Perception":true,"Survival":true }),
    attacks:[
      { name:"Greatsword", bonus:7, damage:"2d6+5", type:"Slashing", mastery:"Graze", range:"Melee", properties:"Heavy, Two-Handed" },
      { name:"Unarmed Strike", bonus:7, damage:"6",   type:"Bludgeoning", mastery:"", range:"Melee", properties:"" },
    ],
    spells:{ cantrips:[], lvl1:[], slots:{ 1:{ max:0, used:0 } } },
    features:[
      { name:"Second Wind", type:"Class", desc:"Bonus Action: Regain 1d10+Level HP. (2/Long Rest).", action:{ type:"SelfHeal", roll:"1d10+1", label:"Use Second Wind" } },
      { name:"Weapon Mastery", type:"Class", desc:"Apply Mastery to Greatsword (Graze) and one other weapon you're proficient with." },
      { name:"Great Weapon Fighting", type:"Fighting Style", desc:"Reroll 1 or 2 on damage dice for two-handed weapons. Use new roll." },
      { name:"Alert", type:"Origin Feat", desc:"Add Proficiency Bonus to Initiative. Can't be Surprised. May swap initiative with a willing ally." },
      { name:"Adrenaline Rush", type:"Species", desc:"Bonus Action: Dash and gain Level Temp HP. (2/Short Rest)." },
      { name:"Relentless Endurance", type:"Species", desc:"Drop to 1 HP instead of 0. (1/Long Rest)." },
      { name:"Darkvision", type:"Species", desc:"Darkvision 120 ft." },
    ],
    equipment:[
      { name:"Chain Mail", weight:55, qty:1, category:"Armor", equipped:true, desc:"AC 16. STR 13 req." },
      { name:"Greatsword", weight:6, qty:1, category:"Weapon", equipped:true, desc:"2d6 Slashing. Mastery: Graze." },
      { name:"Backpack", weight:5, qty:1, category:"Gear", equipped:false },
      { name:"Rations", weight:2, qty:10, category:"Consumable", equipped:false, isConsumable:true },
      { name:"Potion of Healing", weight:0.5, qty:2, category:"Consumable", equipped:false, isConsumable:true, healDice:"2d4", healMod:2, desc:"Bonus Action: Restores 2d4+2 HP.", actionType:"bonus" },
      { name:"Rope", weight:5, qty:1, category:"Gear", equipped:false },
      { name:"Torch", weight:1, qty:10, category:"Gear", equipped:false },
    ],
    attunedItems:[],
    avatarColor:"#475569",
  },
  {
    id:"brandi", name:"Brandi", species:"Aasimar", speciesId:"aasimar", class:"Cleric", subclass:null,
    background:"Acolyte", backgroundId:"acolyte", originFeat:"Magic Initiate (Cleric)",
    level:1, xp:0, inspiration:false, exhaustion:0,
    currency:{ pp:0, gp:78, sp:0, cp:0 },
    stats:{ str:15, dex:11, con:16, int:11, wis:20, cha:14 },
    hp:{ current:14, max:14, temp:0 }, ac:18, speed:30, initiative:0, proficiency:2,
    skills: makeSkills({ str:15,dex:11,con:16,int:11,wis:20,cha:14 }, { "Animal Handling":true,"Insight":true,"Medicine":true,"Religion":true }),
    attacks:[
      { name:"Mace", bonus:4, damage:"1d6+2", type:"Bludgeoning", mastery:"Sap", range:"Melee", properties:"Simple" },
      { name:"Unarmed Strike", bonus:4, damage:"3", type:"Bludgeoning", mastery:"", range:"Melee", properties:"" },
    ],
    spells:{
      cantrips:[
        { name:"Guidance",type:"Utility",desc:"D:1m, V/S" },
        { name:"Toll the Dead",type:"Save (WIS)",damage:"1d8/1d12",desc:"V/S" },
        { name:"Word of Radiance",type:"Save (CON)",damage:"1d6",desc:"5ft, V/M" },
      ],
      lvl1:[
        { name:"Bless",type:"Buff",desc:"D:1m, V/S/M" },
        { name:"Cure Wounds",type:"Heal",damage:"2d8+5",desc:"V/S" },
        { name:"Guiding Bolt",type:"Attack",damage:"4d6",desc:"V/S" },
        { name:"Healing Word",type:"Heal",damage:"2d4+5",desc:"V, Bonus Action" },
        { name:"Inflict Wounds",type:"Attack",damage:"3d10",desc:"V/S" },
        { name:"Shield of Faith",type:"Buff",desc:"D:10m, V/S/M, Concentration" },
      ],
      slots:{ 1:{ max:2, used:0 } },
    },
    features:[
      { name:"Divine Order: Protector", type:"Class", desc:"Proficiency with Martial Weapons and Heavy Armor." },
      { name:"Healing Hands", type:"Species", desc:"Magic Action: Restore Level×d4 HP. (1/Long Rest).", action:{ type:"Heal", roll:"1d4", label:"Healing Hands" } },
      { name:"Celestial Resistance", type:"Species", desc:"Resistance to Necrotic and Radiant damage." },
      { name:"Darkvision", type:"Species", desc:"Darkvision 60 ft." },
      { name:"Magic Initiate (Cleric)", type:"Origin Feat", desc:"2 extra Cleric cantrips + 1 Lv1 Cleric spell free per Long Rest." },
    ],
    equipment:[
      { name:"Chain Mail", weight:55, qty:1, category:"Armor", equipped:true, desc:"AC 16." },
      { name:"Shield", weight:6, qty:1, category:"Armor", equipped:true, desc:"+2 AC." },
      { name:"Mace", weight:4, qty:1, category:"Weapon", equipped:true, desc:"1d6 Bludgeoning. Mastery: Sap." },
      { name:"Rations", weight:2, qty:10, category:"Consumable", equipped:false, isConsumable:true },
      { name:"Potion of Healing", weight:0.5, qty:2, category:"Consumable", equipped:false, isConsumable:true, healDice:"2d4", healMod:2, desc:"Bonus Action: Restores 2d4+2 HP.", actionType:"bonus" },
      { name:"Rope", weight:5, qty:1, category:"Gear", equipped:false },
    ],
    attunedItems:[],
    avatarColor:"#92400e",
  },
  {
    id:"david", name:"David", species:"Elf (Drow)", speciesId:"elf_drow", class:"Rogue", subclass:null,
    background:"Criminal", backgroundId:"criminal", originFeat:"Alert",
    level:1, xp:0, inspiration:false, exhaustion:0,
    currency:{ pp:0, gp:83, sp:0, cp:0 },
    stats:{ str:9, dex:19, con:16, int:16, wis:13, cha:13 },
    hp:{ current:14, max:14, temp:0 }, ac:16, speed:30, initiative:6, proficiency:2,
    skills: makeSkills({ str:9,dex:19,con:16,int:16,wis:13,cha:13 },
      { "Acrobatics":true,"Deception":true,"Insight":true,"Investigation":true,"Perception":true,"Sleight of Hand":true,"Stealth":true },
      { "Perception":true,"Stealth":true }),
    attacks:[
      { name:"Shortsword +1", bonus:7, damage:"1d6+5", type:"Piercing", mastery:"Vex",  range:"Melee", properties:"Finesse, Light" },
      { name:"Fine Dagger",   bonus:7, damage:"1d4+5", type:"Piercing", mastery:"Nick",  range:"20/60 ft", properties:"Finesse, Light, Thrown" },
      { name:"Shortbow",      bonus:6, damage:"1d6+4", type:"Piercing", mastery:"Vex",  range:"80/320 ft", properties:"Ammunition, Two-Handed" },
    ],
    spells:{ cantrips:[{ name:"Dancing Lights",type:"Utility",desc:"D:1m, V/S/M" }], lvl1:[], slots:{ 1:{ max:0, used:0 } } },
    features:[
      { name:"Sneak Attack",  type:"Class", desc:"1d6 extra damage once per turn when you have advantage or an ally is adjacent to the target.", action:{ type:"Damage", roll:"1d6", label:"Roll Sneak Attack" } },
      { name:"Expertise",     type:"Class", desc:"Double Proficiency Bonus on Stealth and Perception checks." },
      { name:"Thieves' Cant", type:"Class", desc:"Understand the secret thieves' cant and cipher." },
      { name:"Alert",         type:"Origin Feat", desc:"Add Proficiency Bonus to Initiative. Can't be Surprised. May swap initiative." },
      { name:"Fey Ancestry",  type:"Species", desc:"Immunity to Charmed condition. Can't be put to sleep by magic." },
      { name:"Drow Magic",    type:"Species", desc:"Dancing Lights cantrip. Faerie Fire at 3rd level. Darkness at 5th level." },
      { name:"Superior Darkvision", type:"Species", desc:"Darkvision 120 ft." },
    ],
    equipment:[
      { name:"Studded Leather", weight:13, qty:1, category:"Armor", equipped:true },
      { name:"Shortsword +1",   weight:2,  qty:1, category:"Weapon", equipped:true },
      { name:"Shortbow",        weight:2,  qty:1, category:"Weapon", equipped:true },
      { name:"Fine Dagger",     weight:1,  qty:2, category:"Weapon", equipped:true },
      { name:"Thieves' Tools",  weight:1,  qty:1, category:"Gear", equipped:false },
      { name:"Arrows",          weight:0.05,qty:20,category:"Ammo", equipped:false, isAmmo:true, ammoFor:["Shortbow","Longbow","Hand Crossbow","Heavy Crossbow"] },
      { name:"Potion of Healing", weight:0.5, qty:2, category:"Consumable", equipped:false, isConsumable:true, healDice:"2d4", healMod:2, desc:"Bonus Action: Restores 2d4+2 HP.", actionType:"bonus" },
      { name:"Rations",         weight:2,  qty:5, category:"Consumable", equipped:false },
    ],
    attunedItems:[],
    avatarColor:"#3730a3",
  },
  {
    id:"talon", name:"Talon", species:"Tiefling", speciesId:"tiefling", class:"Sorcerer", subclass:null,
    background:"Sage", backgroundId:"sage", originFeat:"Magic Initiate (Wizard)",
    level:1, xp:0, inspiration:false, exhaustion:0,
    currency:{ pp:0, gp:36, sp:0, cp:0 },
    stats:{ str:9, dex:13, con:16, int:13, wis:14, cha:18 },
    hp:{ current:9, max:9, temp:0 }, ac:11, speed:30, initiative:1, proficiency:2,
    skills: makeSkills({ str:9,dex:13,con:16,int:13,wis:14,cha:18 },
      { "Arcana":true,"Deception":true,"History":true,"Persuasion":true }),
    attacks:[
      { name:"Fire Bolt",    bonus:6, damage:"1d10",  type:"Fire",        mastery:"",       range:"120 ft", properties:"Spell" },
      { name:"Quarterstaff", bonus:1, damage:"1d6-1", type:"Bludgeoning", mastery:"Topple", range:"Melee",  properties:"Versatile" },
    ],
    spells:{
      cantrips:[
        { name:"Fire Bolt",     type:"Attack",  damage:"1d10", desc:"V/S" },
        { name:"Mage Hand",     type:"Utility", desc:"D:1m, V/S" },
        { name:"Minor Illusion",type:"Utility", desc:"D:1m, S/M" },
        { name:"Thaumaturgy",   type:"Utility", desc:"D:1m, V" },
      ],
      lvl1:[
        { name:"Chromatic Orb",  type:"Attack", damage:"3d8",    desc:"V/S/M (50gp diamond) | Matching dice → Bounce (half dmg, 2nd target)" },
        { name:"Sleep",          type:"Control",                  desc:"D:1m, 5ft sphere, V/S/M" },
        { name:"Magic Missile",  type:"Attack", damage:"3×1d4+1",desc:"V/S" },
      ],
      slots:{ 1:{ max:2, used:0 } },
    },
    features:[
      { name:"Innate Sorcery",  type:"Class", desc:"Bonus Action: Advantage on spell attacks, +1 to DC for 1 min. (2/Long Rest)." },
      { name:"Fiendish Legacy", type:"Species", desc:"Fire Resistance (Hellish Resistance). Thaumaturgy cantrip." },
      { name:"Darkvision",      type:"Species", desc:"Darkvision 60 ft." },
      { name:"Magic Initiate (Wizard)", type:"Origin Feat", desc:"2 extra Wizard cantrips + 1 Lv1 Wizard spell free per Long Rest." },
    ],
    equipment:[
      { name:"Quarterstaff", weight:4, qty:1, category:"Weapon", equipped:true },
      { name:"Crystal (arcane focus)", weight:1, qty:1, category:"Gear", equipped:true },
      { name:"Diamond (50gp)", weight:0, qty:1, category:"Gear", equipped:false, desc:"Spell component for Chromatic Orb." },
      { name:"Rations", weight:2, qty:10, category:"Consumable", equipped:false, isConsumable:true },
      { name:"Potion of Healing", weight:0.5, qty:2, category:"Consumable", equipped:false, isConsumable:true, healDice:"2d4", healMod:2, desc:"Bonus Action: Restores 2d4+2 HP.", actionType:"bonus" },
    ],
    attunedItems:[],
    avatarColor:"#991b1b",
  },
];

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
const rollDie = (sides) => Math.floor(Math.random() * sides) + 1;

const rollDamageString = (dmgStr, isCrit=false) => {
  const m = dmgStr.replace(/\s/g,"").match(/(\d+)d(\d+)(?:([+-])(\d+))?/);
  if (!m) return { text: dmgStr, total: parseInt(dmgStr)||0, rolls: [], sides: 0 };
  let count = parseInt(m[1]); if (isCrit) count *= 2;
  const sides = parseInt(m[2]);
  const mod = m[4] ? parseInt(m[4]) * (m[3]==="-"?-1:1) : 0;
  const rolls = Array.from({length:count},()=>rollDie(sides));
  const total = rolls.reduce((a,b)=>a+b,0) + mod;
  const modStr = mod!==0 ? (mod>0?`+${mod}`:`${mod}`) : "";
  return { text:`[${rolls.join(",")}]${modStr}=${total}`, total, rolls, sides };
};

const playDice = () => {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(440,ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(110,ctx.currentTime+0.15);
    g.gain.setValueAtTime(0.3,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);
    o.start(); o.stop(ctx.currentTime+0.3);
  } catch(e){}
};

const SKILL_STAT = { "Acrobatics":"dex","Animal Handling":"wis","Arcana":"int","Athletics":"str","Deception":"cha","History":"int","Insight":"wis","Intimidation":"cha","Investigation":"int","Medicine":"wis","Nature":"int","Perception":"wis","Performance":"cha","Persuasion":"cha","Religion":"int","Sleight of Hand":"dex","Stealth":"dex","Survival":"wis" };

const recalcSkills = (skills, stats, prof) => skills.map(sk => {
  const base = Math.floor(((stats[SKILL_STAT[sk.name]]||10)-10)/2);
  return { ...sk, mod: base + (sk.expert ? prof*2 : sk.prof ? prof : 0) };
});

// ─────────────────────────────────────────────────────────
// BATTLE MAP  (v3: pan/zoom, bg image, token sizes,
//              AoE templates, ruler, fog of war)
// ─────────────────────────────────────────────────────────
//
// Token coordinate system
//   tok.cx / tok.cy  = world-space CENTER (px at scale=1)
//   tok.size         = 1 Medium, 2 Large, 3 Huge, 4 Gargantuan
//
// Camera  cam.{x,y,s}
// AoE template: { id, type, wx, wy, radiusFt, dirAngle, lengthFt, widthFt, color }
// Fog: fogRevealed = Set<"col,row">
//
const BMAP_BTN = {
  padding:"3px 9px", fontSize:11, borderRadius:4, border:"1px solid #334155",
  background:"#1e293b", color:"#94a3b8", cursor:"pointer", fontWeight:"bold",
};

const AOE_COLORS = [
  { key:"red",    stroke:"#ef4444", fill:"#ef444428", label:"Fire/Force" },
  { key:"blue",   stroke:"#3b82f6", fill:"#3b82f628", label:"Cold/Lightning" },
  { key:"purple", stroke:"#a855f7", fill:"#a855f728", label:"Necrotic/Psychic" },
  { key:"green",  stroke:"#22c55e", fill:"#22c55e28", label:"Acid/Poison" },
];

function drawAoeTemplate(ctx, tpl, s, isPreview) {
  const col = AOE_COLORS.find(c => c.key === tpl.color) || AOE_COLORS[0];
  const G = 50;
  ctx.save();
  ctx.setLineDash(isPreview ? [6/s, 3/s] : []);
  ctx.strokeStyle = col.stroke;
  ctx.fillStyle   = col.fill;
  ctx.lineWidth   = (isPreview ? 1.5 : 2) / s;

  if (tpl.type === "circle") {
    const r = tpl.radiusFt / 5 * G;
    ctx.beginPath(); ctx.arc(tpl.wx, tpl.wy, r, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = col.stroke;
    ctx.beginPath(); ctx.arc(tpl.wx, tpl.wy, 4/s, 0, Math.PI*2); ctx.fill();
    ctx.font = `bold ${10/s}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`${tpl.radiusFt}ft r`, tpl.wx, tpl.wy - r - 8/s);

  } else if (tpl.type === "cone") {
    const len = tpl.lengthFt / 5 * G;
    const halfA = Math.atan(0.5); // 5e cone ≈ 53° spread
    const a0 = tpl.dirAngle - halfA, a1 = tpl.dirAngle + halfA;
    ctx.beginPath();
    ctx.moveTo(tpl.wx, tpl.wy);
    ctx.lineTo(tpl.wx + Math.cos(a0)*len, tpl.wy + Math.sin(a0)*len);
    ctx.arc(tpl.wx, tpl.wy, len, a0, a1);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = col.stroke;
    ctx.beginPath(); ctx.arc(tpl.wx, tpl.wy, 4/s, 0, Math.PI*2); ctx.fill();
    ctx.font = `bold ${10/s}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(`${tpl.lengthFt}ft`,
      tpl.wx + Math.cos(tpl.dirAngle)*len*0.55,
      tpl.wy + Math.sin(tpl.dirAngle)*len*0.55);

  } else if (tpl.type === "line") {
    const len = tpl.lengthFt / 5 * G;
    const wid = (tpl.widthFt || 5) / 5 * G;
    const cos = Math.cos(tpl.dirAngle), sin = Math.sin(tpl.dirAngle);
    const px = -sin * wid/2, py = cos * wid/2;
    ctx.beginPath();
    ctx.moveTo(tpl.wx+px,          tpl.wy+py);
    ctx.lineTo(tpl.wx+cos*len+px,  tpl.wy+sin*len+py);
    ctx.lineTo(tpl.wx+cos*len-px,  tpl.wy+sin*len-py);
    ctx.lineTo(tpl.wx-px,          tpl.wy-py);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = col.stroke;
    ctx.beginPath(); ctx.arc(tpl.wx, tpl.wy, 4/s, 0, Math.PI*2); ctx.fill();
    ctx.font = `bold ${10/s}px sans-serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(`${tpl.lengthFt}ft`, tpl.wx+cos*len*0.5, tpl.wy+sin*len*0.5);
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────
// LINE-OF-SIGHT HELPERS  (pure, outside component)
// ─────────────────────────────────────────────────────────

// Strict segment-segment intersection.
// Returns true if AB and CD cross at an interior point (not at endpoints).
function segSegIntersect(ax,ay,bx,by,cx,cy,dx,dy) {
  const d1x=bx-ax, d1y=by-ay, d2x=dx-cx, d2y=dy-cy;
  const denom = d1x*d2y - d1y*d2x;
  if (Math.abs(denom) < 1e-10) return false;
  const t = ((cx-ax)*d2y - (cy-ay)*d2x) / denom;
  const u = ((cx-ax)*d1y - (cy-ay)*d1x) / denom;
  // t > small epsilon: ignore the ray's own start point touching a wall vertex
  return t > 0.005 && t < 1 && u > 0 && u < 1;
}

// Derive a token's vision range in feet from its character sheet.
// Returns darkvision ft (from species or feat text) or 60 ft default (a torch).
function getTokenVisionFt(tok, characters) {
  if (tok.type !== "player") return tok.visionFt || 60;
  const char = characters.find(c => c.id === tok.id);
  if (!char) return 60;

  // 1. Species base darkvision
  const species = (typeof SPECIES_2024 !== "undefined" ? SPECIES_2024 : [])
    .find(s => s.id === char.speciesId);
  let dv = species?.darkvision || 0;

  // 2. Scan features/passiveEffects for "Darkvision N ft" text
  const scanDV = str => {
    const m = str && str.match(/[Dd]arkvision\s+(\d+)/);
    return m ? parseInt(m[1]) : 0;
  };
  (char.features || []).forEach(f => {
    dv = Math.max(dv, scanDV(f.name), scanDV(f.desc));
  });
  (char.passiveEffects || []).forEach(pe => {
    dv = Math.max(dv, scanDV(pe.desc));
  });

  return dv > 0 ? dv : 60; // 60 ft = standard torch/lantern
}

// Cast LoS from (ox,oy) with visionPx radius against blocking wall segments.
// Returns a Set of "col,row" grid-cell keys that are visible.
function computeLoS(ox, oy, visionPx, blocking, G, gox, goy) {
  const r = Math.ceil(visionPx / G) + 1;
  const originCol = Math.floor((ox - gox) / G);
  const originRow = Math.floor((oy - goy) / G);
  const visible = new Set();

  for (let dc = -r; dc <= r; dc++) {
    for (let dr = -r; dr <= r; dr++) {
      const col = originCol + dc;
      const row = originRow + dr;
      // Cell centre in world coords
      const cx = gox + (col + 0.5) * G;
      const cy = goy + (row + 0.5) * G;
      // Circular range check
      if (Math.hypot(cx - ox, cy - oy) > visionPx) continue;
      // LoS check: does the line (ox,oy)→(cx,cy) cross any blocking wall?
      let blocked = false;
      for (const w of blocking) {
        if (segSegIntersect(ox, oy, cx, cy, w.x1, w.y1, w.x2, w.y2)) {
          blocked = true;
          break;
        }
      }
      if (!blocked) visible.add(`${col},${row}`);
    }
  }
  return visible;
}

// ─────────────────────────────────────────────────────────
// GENERATE MAP CONTEXT  —  pure, for AI DM system prompt
// Returns a clean text block describing the current board
// state: token positions, distances, LoS, door states.
// Returns "" if there are no tokens (nothing to describe).
// ─────────────────────────────────────────────────────────
function generateMapContext(tokens, characters, walls, combatState, gridCell, gridOffX = 0, gridOffY = 0) {
  if (!tokens || tokens.length === 0) return "";

  const G    = gridCell || 50;
  const fox  = gridOffX || 0;
  const foy  = gridOffY || 0;

  // px world-coords → grid cell address  (col, row)
  const toCell = (cx, cy) => ({
    col: Math.floor((cx - fox) / G),
    row: Math.floor((cy - foy) / G),
  });

  // Euclidean distance in feet between two world-space centres
  const distFt = (ax, ay, bx, by) =>
    Math.round(Math.hypot(bx - ax, by - ay) / G * 5 / 5) * 5; // round to nearest 5 ft

  // Range band label
  const band = ft =>
    ft <=  5 ? "melee" :
    ft <= 30 ? "near"  :
    ft <= 60 ? "mid"   : "far";

  // LoS: does the ray (ax,ay)→(bx,by) cross a sight-blocking wall?
  const blockers = (walls || []).filter(
    w => w.wtype === "wall" || w.wtype === "door-closed"
  );
  const hasLoS = (ax, ay, bx, by) =>
    !blockers.some(w => segSegIntersect(ax, ay, bx, by, w.x1, w.y1, w.x2, w.y2));

  // Split tokens into PCs and foes
  const pcs  = tokens.filter(t => t.type === "player");
  const foes = tokens.filter(t => t.type !== "player");

  const lines = [];
  lines.push("══ VTT MAP STATE ══════════════════════════════════════════");

  // ── PARTY ─────────────────────────────────────────────
  if (pcs.length > 0) {
    lines.push("PARTY");
    for (const tok of pcs) {
      const char = (characters || []).find(c => c.id === tok.id);
      const { col, row } = toCell(tok.cx, tok.cy);
      const hp  = char ? `HP ${char.hp?.current ?? "?"}/${char.hp?.max ?? "?"}` : "";
      const ac  = char ? `AC ${char.ac ?? "?"}` : "";
      const cls = char ? `${char.class} ${char.level}` : "unknown";
      const cnd = char && (char.exhaustion || 0) > 0 ? `  exhaustion ${char.exhaustion}` : "";
      lines.push(`  ${tok.name.padEnd(12)} ${cls.padEnd(14)} cell(${col},${row})  ${hp}  ${ac}${cnd}`);
    }
  }

  // ── FOES ──────────────────────────────────────────────
  if (foes.length > 0) {
    lines.push("FOES");
    for (const tok of foes) {
      const cbt = (combatState?.combatants || []).find(c => c.id === tok.id);
      const { col, row } = toCell(tok.cx, tok.cy);
      const hp   = cbt ? `HP ${cbt.hp}/${cbt.maxHp}` : "HP ?";
      const ac   = cbt ? `AC ${cbt.ac}` : "";
      const cnd  = cbt?.status?.length ? `  [${cbt.status.join(", ")}]` : "";
      // Wound descriptor (helps DM decide flee/morale)
      const pct  = cbt ? cbt.hp / (cbt.maxHp || 1) : 1;
      const wnd  = pct <= 0.25 ? "  ⚠ near death" : pct <= 0.5 ? "  bloodied" : "";
      lines.push(`  ${tok.name.padEnd(16)} cell(${col},${row})  ${hp}  ${ac}${cnd}${wnd}`);
    }
  }

  // ── SIGHT LINES  (every PC × every foe) ──────────────
  if (pcs.length > 0 && foes.length > 0) {
    lines.push("SIGHT");
    for (const pc of pcs) {
      for (const foe of foes) {
        const ft    = distFt(pc.cx, pc.cy, foe.cx, foe.cy);
        const los   = hasLoS(pc.cx, pc.cy, foe.cx, foe.cy);
        const rb    = band(ft);
        // Find which wall type blocks (for the description)
        let blocker = "";
        if (!los) {
          const blocking = blockers.find(
            w => segSegIntersect(pc.cx, pc.cy, foe.cx, foe.cy, w.x1, w.y1, w.x2, w.y2)
          );
          blocker = blocking ? ` — ${blocking.wtype === "door-closed" ? "closed door" : "wall"}` : "";
        }
        const status = los ? "CLEAR" : `BLOCKED${blocker}`;
        lines.push(`  ${pc.name} → ${foe.name}  ${ft} ft  [${rb}]  ${status}`);
      }
    }
  }

  // ── DOORS ─────────────────────────────────────────────
  const doors = (walls || []).filter(
    w => w.wtype === "door-closed" || w.wtype === "door-open"
  );
  if (doors.length > 0) {
    const doorList = doors.map(d => {
      const { col, row } = toCell((d.x1 + d.x2) / 2, (d.y1 + d.y2) / 2);
      const state = d.wtype === "door-open" ? "OPEN" : "CLOSED";
      return `cell(${col},${row}) ${state}`;
    }).join("  ·  ");
    lines.push(`DOORS   ${doorList}`);
  }

  // ── WALLS ─────────────────────────────────────────────
  const solidWalls = (walls || []).filter(w => w.wtype === "wall");
  const windows    = (walls || []).filter(w => w.wtype === "window");
  if (solidWalls.length > 0 || windows.length > 0) {
    const parts = [];
    if (solidWalls.length) parts.push(`${solidWalls.length} solid wall${solidWalls.length !== 1 ? "s" : ""}`);
    if (windows.length)    parts.push(`${windows.length} window${windows.length !== 1 ? "s" : ""}`);
    lines.push(`TERRAIN  ${parts.join("  ·  ")}  (dungeon/interior scene)`);
  }

  // ── COMBAT STATE ──────────────────────────────────────
  if (combatState?.isActive) {
    const active = combatState.combatants?.[combatState.turn];
    const turnName = active ? active.name : "unknown";
    lines.push(`COMBAT   Round ${combatState.round ?? 1}  ·  ${turnName}'s turn`);
  }

  lines.push("══════════════════════════════════════════════════════════");
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────
function BattleMap({ characters, combatState, onUpdateMapState, mapState, onCombatUpdate, onSystemMessage, onAppendInput }) {
  const GRID = 50;

  // ── Canvas / image refs ────────────────────────────────
  const canvasRef    = useRef(null);
  const fileInputRef = useRef(null);
  const bgImgRef     = useRef(null);

  // ── Live-value refs (sync'd from state on every render) ─
  const camRef       = useRef({ x:0, y:0, s:1 });
  const tokRef       = useRef([]);
  const templRef     = useRef([]);
  const fogRevRef    = useRef(new Set());
  const fogEnRef     = useRef(false);
  const combatRef    = useRef(combatState);
  const toolModeRef  = useRef("select");
  const aoeShapeRef  = useRef("circle");
  const aoeColorRef  = useRef("red");
  const fogBrushRef  = useRef(1);
  const redrawRef    = useRef(null);

  // ── Interaction refs ───────────────────────────────────
  const dragRef      = useRef(null);
  const rulerRef     = useRef(null);     // {wx1,wy1,wx2,wy2} or null
  const aoePrevRef   = useRef(null);     // AoE preview while dragging
  const fogPainting  = useRef(false);
  const fogPaintMode = useRef("reveal"); // "reveal" | "cover"
  const wallsRef     = useRef([]);       // committed wall segments
  const wallPrevRef  = useRef(null);     // in-progress wall: {x1,y1,x2,y2,wtype}
  const wallTypeRef  = useRef("wall");   // current wall type selection
  const charsRef     = useRef(characters); // characters array (for LoS vision lookup inside redraw)
  const selTokRef    = useRef(null);       // id of the currently-selected token

  // ── State ──────────────────────────────────────────────
  const [cam, setCam]             = useState({ x:0, y:0, s:1 });
  const [tokens, setTokens]       = useState(() => {
    const saved = mapState.tokens || [];
    if (saved.length) return saved.map(t => ({
      ...t,
      cx: t.cx ?? ((t.x ?? GRID) + GRID/2),
      cy: t.cy ?? ((t.y ?? GRID) + GRID/2),
      size: t.size || 1,
    }));
    return characters.map((c, i) => ({
      id: c.id, name: c.name, color: c.avatarColor || "#4b5563",
      cx: (i + 0.5)*GRID, cy: 0.5*GRID, type:"player", size:1,
    }));
  });
  const [templates,   setTemplates]   = useState(mapState.templates || []);
  const [bgSrc,       setBgSrc]       = useState(mapState.bgImage || null);
  const [fogEnabled,  setFogEnabled]  = useState(mapState.fogEnabled ?? false);
  const [fogRevealed, setFogRevealed] = useState(() => new Set(mapState.fogRevealed || []));
  const [walls,       setWalls]       = useState(mapState.walls || []);
  const [selectedTokId, setSelectedTokId] = useState(null); // LoS-selected token

  // Tool-mode UI state
  const [toolMode,    setToolMode]    = useState("select");
  const [aoeShape,    setAoeShape]    = useState("circle");
  const [aoeColor,    setAoeColor]    = useState("red");
  const [fogBrush,    setFogBrush]    = useState(1);
  const [wallType,    setWallType]    = useState("wall"); // "wall"|"door-closed"|"door-open"|"window"
  const [showFoeForm, setShowFoeForm] = useState(false);
  const [foeName,     setFoeName]     = useState("Foe");
  const [foeSize,     setFoeSize]     = useState(1);

  // ── Grid calibration (align overlay grid to bg image's baked-in grid) ──
  const [gridCell, setGridCell] = useState(mapState.gridCell ?? 50);   // px per square
  const [gridOffX, setGridOffX] = useState(mapState.gridOffX ?? 0);    // px offset X
  const [gridOffY, setGridOffY] = useState(mapState.gridOffY ?? 0);    // px offset Y
  const [showGridCal, setShowGridCal] = useState(false);
  const gridRef = useRef({ cell: mapState.gridCell ?? 50, offX: mapState.gridOffX ?? 0, offY: mapState.gridOffY ?? 0 });

  // ── Sync tokens from App when spawn_enemy (or other external writes) updates mapState.tokens ──
  // BattleMap owns its own tokens state for drag/drop, but we need to merge in
  // any tokens added externally (e.g. via spawn_enemy in handleCombatUpdate).
  useEffect(() => {
    const incoming = mapState.tokens || [];
    if (!incoming.length) return;
    setTokens(prev => {
      const prevIds = new Set(prev.map(t => t.id));
      const brandNew = incoming.filter(t => !prevIds.has(t.id)).map(t => ({
        ...t,
        cx: t.cx ?? 0,
        cy: t.cy ?? 0,
        size: t.size || 1,
      }));
      if (!brandNew.length) return prev; // nothing new — skip re-render
      const updated = [...prev, ...brandNew];
      tokRef.current = updated;
      return updated;
    });
  }, [mapState.tokens]);

  // Sync live refs on every render
  camRef.current      = cam;
  tokRef.current      = tokens;
  templRef.current    = templates;
  fogRevRef.current   = fogRevealed;
  fogEnRef.current    = fogEnabled;
  combatRef.current   = combatState;
  toolModeRef.current = toolMode;
  aoeShapeRef.current = aoeShape;
  aoeColorRef.current = aoeColor;
  fogBrushRef.current = fogBrush;
  wallsRef.current    = walls;
  wallTypeRef.current = wallType;
  charsRef.current    = characters;
  selTokRef.current   = selectedTokId;
  gridRef.current     = { cell: gridCell, offX: gridOffX, offY: gridOffY };

  // ── Coordinate helpers ─────────────────────────────────
  const s2w = (sx, sy, c) => {
    const { x, y, s } = c || camRef.current;
    return { x:(sx-x)/s, y:(sy-y)/s };
  };
  const canvasPos = e => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const tokR      = sz => { const G = gridRef.current.cell; return (sz * G) / 2 * 0.88; };
  const snapTok   = (rawCx, rawCy, sz) => {
    const { cell:G, offX:gox, offY:goy } = gridRef.current;
    return {
      cx: Math.round((rawCx - gox - sz*G/2) / G) * G + gox + sz*G/2,
      cy: Math.round((rawCy - goy - sz*G/2) / G) * G + goy + sz*G/2,
    };
  };
  const snapCorner = (wx, wy) => {
    const { cell:G, offX:gox, offY:goy } = gridRef.current;
    return {
      wx: Math.round((wx - gox) / G) * G + gox,
      wy: Math.round((wy - goy) / G) * G + goy,
    };
  };
  const hitTestToken = (wx, wy) => {
    let found = null;
    tokRef.current.forEach(t => {
      if (Math.hypot(wx-t.cx, wy-t.cy) < tokR(t.size||1)) found = t;
    });
    return found;
  };

  // Distance from point (px,py) to segment (ax,ay)→(bx,by)
  const ptSegDist = (px, py, ax, ay, bx, by) => {
    const dx=bx-ax, dy=by-ay;
    const lenSq = dx*dx + dy*dy;
    if (lenSq === 0) return Math.hypot(px-ax, py-ay);
    const t = Math.max(0, Math.min(1, ((px-ax)*dx + (py-ay)*dy) / lenSq));
    return Math.hypot(px - (ax+t*dx), py - (ay+t*dy));
  };
  // Hit-test a wall segment (returns wall object or null)
  const hitTestWall = (wx, wy, thresh) => {
    const px = thresh || 8;
    return wallsRef.current.find(w => ptSegDist(wx,wy,w.x1,w.y1,w.x2,w.y2) <= px) || null;
  };

  // Returns true if the move-path (ox,oy)→(nx,ny) crosses any movement-blocking wall.
  // wall / door-closed / window all block physical movement; door-open does not.
  const crossesBlockingWall = (ox, oy, nx, ny) => {
    const blockers = wallsRef.current.filter(
      w => w.wtype === "wall" || w.wtype === "door-closed" || w.wtype === "window"
    );
    return blockers.some(w => segSegIntersect(ox, oy, nx, ny, w.x1, w.y1, w.x2, w.y2));
  };

  // Returns a door wall under the cursor (closed or open) — for click-to-toggle.
  const hitTestDoor = (wx, wy) => {
    const thresh = 10 / camRef.current.s;
    return wallsRef.current.find(
      w => (w.wtype === "door-closed" || w.wtype === "door-open") &&
           ptSegDist(wx, wy, w.x1, w.y1, w.x2, w.y2) <= thresh
    ) || null;
  };
  const hitTestTemplate = (wx, wy) =>
    templRef.current.find(t => Math.hypot(wx-t.wx, wy-t.wy) < 12/camRef.current.s);

  // ── Build AoE preview from drag ────────────────────────
  const buildAoePrev = (wx0, wy0, wx1, wy1) => {
    const dx = wx1-wx0, dy = wy1-wy0;
    const dist  = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const snap5 = v => Math.max(5, Math.round(v/GRID*5/5)*5);
    const color = aoeColorRef.current;
    const shape = aoeShapeRef.current;
    if (shape === "circle") {
      return { type:"circle", wx:wx0, wy:wy0, radiusFt:snap5(Math.max(GRID/2, dist)), color };
    } else if (shape === "cone") {
      return { type:"cone", wx:wx0, wy:wy0, dirAngle:angle, lengthFt:snap5(Math.max(GRID, dist)), color };
    } else {
      return { type:"line", wx:wx0, wy:wy0, dirAngle:angle, lengthFt:snap5(Math.max(GRID, dist)), widthFt:5, color };
    }
  };

  // ── Paint fog cells ────────────────────────────────────
  const paintFog = useCallback((wx, wy, reveal) => {
    const { cell:FG, offX:fox, offY:foy } = gridRef.current;
    const col  = Math.floor((wx - fox) / FG);
    const row  = Math.floor((wy - foy) / FG);
    const br   = fogBrushRef.current;
    const next = new Set(fogRevRef.current);
    for (let dc = -(br-1); dc <= (br-1); dc++) {
      for (let dr = -(br-1); dr <= (br-1); dr++) {
        const key = `${col+dc},${row+dr}`;
        if (reveal) next.add(key); else next.delete(key);
      }
    }
    fogRevRef.current = next;
    setFogRevealed(next);
    onUpdateMapState({ fogRevealed: [...next] });
    redrawRef.current?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onUpdateMapState]);

  // ── LoS: reveal fog for a token's sight cone ───────────
  // Only runs when fog is enabled. Unions new visible cells into the
  // existing revealed set (exploration-style: you don't un-see visited rooms).
  const applyLoS = useCallback((tok) => {
    if (!fogEnRef.current) return;
    const { cell:G, offX:gox, offY:goy } = gridRef.current;
    const visionFt = getTokenVisionFt(tok, charsRef.current);
    const visionPx = (visionFt / 5) * G;          // convert ft → world px
    const blocking  = wallsRef.current.filter(
      w => w.wtype === "wall" || w.wtype === "door-closed"
    );
    const visible = computeLoS(tok.cx, tok.cy, visionPx, blocking, G, gox, goy);
    const next = new Set([...fogRevRef.current, ...visible]);
    fogRevRef.current = next;
    setFogRevealed(next);
    onUpdateMapState({ fogRevealed: [...next] });
    redrawRef.current?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onUpdateMapState]);

  // ── Master draw (reads all live refs – stable, no deps) ─
  const redraw = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    const { x:ox, y:oy, s } = camRef.current;
    const toks   = tokRef.current;
    const templs = templRef.current;
    const combat = combatRef.current;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);

    const vx = -ox/s, vy = -oy/s, vw = W/s, vh = H/s;

    // ── Layer 1: Background ──────────────────────────────
    ctx.fillStyle = "#0a0f1a";
    ctx.fillRect(vx, vy, vw, vh);
    if (bgImgRef.current) ctx.drawImage(bgImgRef.current, 0, 0);

    // ── Layer 2: Grid ────────────────────────────────────
    const { cell:G, offX:gox, offY:goy } = gridRef.current;
    const gx0 = gox + Math.floor((vx - gox) / G) * G;
    const gy0 = goy + Math.floor((vy - goy) / G) * G;
    ctx.strokeStyle = bgImgRef.current ? "#ffffff1a" : "#1e293b";
    ctx.lineWidth = 0.5/s;
    for (let gx = gx0; gx < vx+vw+G; gx+=G) {
      ctx.beginPath(); ctx.moveTo(gx, gy0-G); ctx.lineTo(gx, vy+vh+G); ctx.stroke();
    }
    for (let gy = gy0; gy < vy+vh+G; gy+=G) {
      ctx.beginPath(); ctx.moveTo(gx0-G, gy); ctx.lineTo(vx+vw+G, gy); ctx.stroke();
    }

    // ── Layer 3: Walls ───────────────────────────────────
    const drawWall = (w, preview) => {
      const { x1,y1,x2,y2,wtype="wall" } = w;
      ctx.save();
      ctx.lineCap = "round";
      ctx.globalAlpha = preview ? 0.6 : 1;
      if (wtype === "wall") {
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth   = 4/s;
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        // Dark outline for depth
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth   = 6/s;
        ctx.globalCompositeOperation = "destination-over";
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      } else if (wtype === "door-closed") {
        // Thick amber line
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth   = 4/s;
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        // Two small perpendicular tick marks at ends to indicate door frame
        const ang = Math.atan2(y2-y1, x2-x1) + Math.PI/2;
        const tk  = 6/s;
        [[x1,y1],[x2,y2]].forEach(([ex,ey]) => {
          ctx.beginPath();
          ctx.moveTo(ex - Math.cos(ang)*tk, ey - Math.sin(ang)*tk);
          ctx.lineTo(ex + Math.cos(ang)*tk, ey + Math.sin(ang)*tk);
          ctx.stroke();
        });
      } else if (wtype === "door-open") {
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth   = 3/s;
        ctx.setLineDash([8/s, 4/s]);
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        ctx.setLineDash([]);
      } else if (wtype === "window") {
        ctx.strokeStyle = "#67e8f9";
        ctx.lineWidth   = 2/s;
        ctx.setLineDash([4/s, 3/s]);
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        ctx.setLineDash([]);
        // Center diamond marker
        const mx2=(x1+x2)/2, my2=(y1+y2)/2, d2=5/s;
        ctx.beginPath(); ctx.arc(mx2,my2,d2,0,Math.PI*2);
        ctx.fillStyle="#67e8f9"; ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    wallsRef.current.forEach(w => drawWall(w, false));
    if (wallPrevRef.current) drawWall(wallPrevRef.current, true);

    // ── Layer 4: AoE templates ───────────────────────────
    templs.forEach(t => drawAoeTemplate(ctx, t, s, false));
    if (aoePrevRef.current) drawAoeTemplate(ctx, aoePrevRef.current, s, true);

    // ── Layer 4: Tokens ──────────────────────────────────
    toks.forEach(tok => {
      const sz = tok.size || 1;
      const r  = tokR(sz);
      const { cx:tcx, cy:tcy } = tok;
      const combatant = combat.combatants.find(c => c.id === tok.id);
      const isActive  = combatant && combat.combatants[combat.turn]?.id === tok.id;
      const isSelected = tok.id === selTokRef.current;

      // LoS vision-radius ring (subtle, only when fog is on and token is selected)
      if (isSelected && fogEnRef.current) {
        const visionFt = getTokenVisionFt(tok, charsRef.current);
        const visionPx = (visionFt / 5) * G;
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.arc(tcx, tcy, visionPx, 0, Math.PI*2);
        ctx.fillStyle = tok.type === "player" ? "#fbbf2420" : tok.type === "npc" ? "#94a3b820" : "#ef444420";
        ctx.fill();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = tok.type === "player" ? "#fbbf24" : tok.type === "npc" ? "#94a3b8" : "#ef4444";
        ctx.lineWidth = 1/s;
        ctx.setLineDash([6/s, 4/s]);
        ctx.stroke();
        ctx.setLineDash([]);
        // Tiny label: "60 ft darkvision"
        ctx.globalAlpha = 0.6;
        ctx.font = `${9/s}px sans-serif`;
        ctx.fillStyle = "#fbbf24";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(`${visionFt} ft`, tcx, tcy - visionPx - 8/s);
        ctx.restore();
      }

      // Combat-turn glow
      if (isActive) {
        ctx.beginPath(); ctx.arc(tcx, tcy, r+6/s, 0, Math.PI*2);
        ctx.strokeStyle="#f59e0b"; ctx.lineWidth=3/s; ctx.stroke();
      }
      // Selection ring (white outer ring for the LoS-selected token)
      if (isSelected) {
        ctx.beginPath(); ctx.arc(tcx, tcy, r+4/s, 0, Math.PI*2);
        ctx.strokeStyle="#ffffff88"; ctx.lineWidth=1.5/s;
        ctx.setLineDash([4/s,3/s]); ctx.stroke(); ctx.setLineDash([]);
      }

      ctx.beginPath(); ctx.arc(tcx, tcy, r, 0, Math.PI*2);
      ctx.fillStyle=tok.color; ctx.fill();
      ctx.strokeStyle=tok.type==="player"?"#fbbf24":tok.type==="npc"?"#94a3b8":"#ef4444";
      ctx.lineWidth=Math.max(1.5,sz)/s; ctx.stroke();

      const fsPx = (sz===1?11:sz===2?14:18)/s;
      ctx.font=`bold ${fsPx}px sans-serif`;
      ctx.fillStyle="#fff"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(sz>1?tok.name.slice(0,2).toUpperCase():tok.name[0].toUpperCase(), tcx, tcy);

      if (sz > 1) {
        ctx.font=`bold ${8/s}px sans-serif`; ctx.fillStyle="#f59e0b";
        ctx.fillText(["","","L","H","G"][sz]||"G", tcx+r*0.68, tcy-r*0.68);
      }
      if (combatant) {
        const bw=sz*G*0.8, bh=5/s, bx=tcx-bw/2, by=tcy+r+4/s;
        ctx.fillStyle="#1e293b"; ctx.fillRect(bx,by,bw,bh);
        const pct=Math.max(0,combatant.hp/combatant.maxHp);
        ctx.fillStyle=pct>.5?"#22c55e":pct>.25?"#f59e0b":"#ef4444";
        ctx.fillRect(bx,by,bw*pct,bh);
      }
    });

    // ── Layer 5: Fog of War ───────────────────────────────
    if (fogEnRef.current) {
      const { cell:FG, offX:fox, offY:foy } = gridRef.current;
      const revealed = fogRevRef.current;
      const c0 = Math.floor((vx - fox)/FG)-1, r0 = Math.floor((vy - foy)/FG)-1;
      const c1 = Math.ceil((vx+vw - fox)/FG)+1, r1 = Math.ceil((vy+vh - foy)/FG)+1;

      // Solid fog on unrevealed cells
      ctx.fillStyle = "rgba(4,8,18,0.88)";
      for (let col = c0; col <= c1; col++) {
        for (let row = r0; row <= r1; row++) {
          if (!revealed.has(`${col},${row}`)) {
            ctx.fillRect(fox + col*FG, foy + row*FG, FG, FG);
          }
        }
      }
      // Soft vignette on revealed edge cells
      ctx.fillStyle = "rgba(4,8,18,0.35)";
      for (let col = c0; col <= c1; col++) {
        for (let row = r0; row <= r1; row++) {
          if (revealed.has(`${col},${row}`)) {
            const neighbors = [`${col-1},${row}`,`${col+1},${row}`,`${col},${row-1}`,`${col},${row+1}`];
            if (neighbors.some(k => !revealed.has(k))) {
              ctx.fillRect(fox + col*FG, foy + row*FG, FG, FG);
            }
          }
        }
      }
    }

    // ── Layer 6: Ruler ────────────────────────────────────
    const ruler = rulerRef.current;
    if (ruler) {
      const { wx1,wy1,wx2,wy2 } = ruler;
      const dist = Math.hypot(wx2-wx1,wy2-wy1)/gridRef.current.cell*5;
      const feet = Math.max(5, Math.round(dist/5)*5);
      const mx=(wx1+wx2)/2, my=(wy1+wy2)/2;

      ctx.save();
      ctx.strokeStyle="#f59e0b"; ctx.lineWidth=2/s;
      ctx.setLineDash([8/s,4/s]);
      ctx.beginPath(); ctx.moveTo(wx1,wy1); ctx.lineTo(wx2,wy2); ctx.stroke();
      ctx.setLineDash([]);

      // End caps
      [[wx1,wy1],[wx2,wy2]].forEach(([cx,cy]) => {
        ctx.beginPath(); ctx.arc(cx,cy,4/s,0,Math.PI*2);
        ctx.fillStyle="#f59e0b"; ctx.fill();
        ctx.strokeStyle="#0a0f1a"; ctx.lineWidth=1.5/s; ctx.stroke();
      });

      // Distance label pill
      const label = `${feet} ft`;
      const fs = 11/s;
      ctx.font=`bold ${fs}px sans-serif`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      const tw = ctx.measureText(label).width;
      const pad=5/s;
      const rx=mx-tw/2-pad, ry=my-fs*0.72, rw=tw+pad*2, rh=fs*1.44;
      ctx.fillStyle="#0a0f1acc";
      if (ctx.roundRect) ctx.roundRect(rx,ry,rw,rh,3/s);
      else ctx.rect(rx,ry,rw,rh);
      ctx.fill();
      ctx.strokeStyle="#f59e0b66"; ctx.lineWidth=0.5/s; ctx.stroke();
      ctx.fillStyle="#f59e0b";
      ctx.fillText(label, mx, my);
      ctx.restore();
    }

    ctx.restore();
  }, []); // stable – reads live refs only

  redrawRef.current = redraw;

  useEffect(() => { redraw(); }, [tokens, cam, templates, walls, fogEnabled, fogRevealed, combatState, selectedTokId, redraw]);

  // ── BG image load ──────────────────────────────────────
  useEffect(() => {
    if (!bgSrc) { bgImgRef.current = null; redrawRef.current?.(); return; }
    const img = new Image();
    img.onload = () => { bgImgRef.current = img; redrawRef.current?.(); };
    img.src = bgSrc;
  }, [bgSrc]);

  // ── Canvas auto-resize ─────────────────────────────────
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const resize = () => {
      const { width, height } = cv.getBoundingClientRect();
      const w = Math.round(width)||700, h = Math.round(height)||480;
      if (cv.width!==w || cv.height!==h) { cv.width=w; cv.height=h; }
      redrawRef.current?.();
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);
    return () => ro.disconnect();
  }, []);

  // Clear ruler when leaving ruler mode
  useEffect(() => {
    if (toolMode !== "ruler") { rulerRef.current=null; redrawRef.current?.(); }
  }, [toolMode]);

  // ── Mouse handlers ─────────────────────────────────────
  const onMouseDown = e => {
    if (e.button !== 0) return;
    const sp = canvasPos(e);
    const wp = s2w(sp.x, sp.y);
    const mode = toolModeRef.current;

    if (mode === "select") {
      const tok = hitTestToken(wp.x, wp.y);
      if (tok) {
        // Select always
        selTokRef.current = tok.id;
        setSelectedTokId(tok.id);
        applyLoS(tok);
        // Lock enemy tokens when combat is active and placement phase is over
        const isLockedEnemy = tok.type === "foe" && combatState?.isActive && !combatState?.isPlacementPhase;
        if (!isLockedEnemy) {
          // Capture the guaranteed origin NOW — before onMouseMove mutates tokRef.current
          dragRef.current = {
            type:"token", id:tok.id,
            offX:wp.x-tok.cx, offY:wp.y-tok.cy,
            originCx:tok.cx, originCy:tok.cy,   // ← immutable drag-start world coords
          };
        }
      } else {
        // Check for a door click before falling through to pan
        const door = hitTestDoor(wp.x, wp.y);
        if (door) {
          // Toggle door state
          const newWtype = door.wtype === "door-closed" ? "door-open" : "door-closed";
          const updated = wallsRef.current.map(w =>
            w.id === door.id ? { ...w, wtype: newWtype } : w
          );
          wallsRef.current = updated;
          setWalls(updated);
          onUpdateMapState({ walls: updated });
          // Re-cast LoS for the currently-selected token — door state affects visibility
          const selTok = tokRef.current.find(t => t.id === selTokRef.current);
          if (selTok) applyLoS(selTok);
          redrawRef.current?.();
          dragRef.current = null; // don't start a pan from a door click
        } else {
          // Click on empty space — deselect and begin pan
          selTokRef.current = null;
          setSelectedTokId(null);
          dragRef.current = { type:"pan", sx:sp.x, sy:sp.y, cx0:camRef.current.x, cy0:camRef.current.y };
        }
      }
      canvasRef.current.style.cursor = "grabbing";
    } else if (mode === "ruler") {
      dragRef.current = { type:"ruler", wx1:wp.x, wy1:wp.y };
      rulerRef.current = { wx1:wp.x, wy1:wp.y, wx2:wp.x, wy2:wp.y };
    } else if (mode === "fog-reveal" || mode === "fog-cover") {
      fogPainting.current = true;
      fogPaintMode.current = mode === "fog-reveal" ? "reveal" : "cover";
      paintFog(wp.x, wp.y, mode === "fog-reveal");
    } else if (mode === "aoe") {
      const { wx, wy } = snapCorner(wp.x, wp.y);
      dragRef.current = { type:"aoe", wx0:wx, wy0:wy };
      aoePrevRef.current = buildAoePrev(wx, wy, wx, wy);
      redrawRef.current?.();
    } else if (mode === "wall") {
      const { wx, wy } = snapCorner(wp.x, wp.y);
      dragRef.current = { type:"wall", x1:wx, y1:wy };
      wallPrevRef.current = { x1:wx, y1:wy, x2:wx, y2:wy, wtype:wallTypeRef.current };
      redrawRef.current?.();
    }
  };

  const onMouseMove = e => {
    const sp = canvasPos(e);
    const wp = s2w(sp.x, sp.y);

    if (fogPainting.current) {
      paintFog(wp.x, wp.y, fogPaintMode.current === "reveal");
      return;
    }

    // Door hover: show pointer cursor when hovering a door in select mode
    if (!dragRef.current && toolModeRef.current === "select") {
      const overDoor = hitTestDoor(wp.x, wp.y);
      const overTok  = hitTestToken(wp.x, wp.y);
      canvasRef.current.style.cursor = overDoor && !overTok ? "pointer" : "grab";
    }

    if (!dragRef.current) return;

    const d = dragRef.current;
    if (d.type === "pan") {
      const nc = { ...camRef.current, x:d.cx0+(sp.x-d.sx), y:d.cy0+(sp.y-d.sy) };
      camRef.current = nc; setCam(nc);
    } else if (d.type === "token") {
      tokRef.current = tokRef.current.map(t =>
        t.id===d.id ? {...t, cx:wp.x-d.offX, cy:wp.y-d.offY} : t
      );
      redrawRef.current?.();
    } else if (d.type === "ruler") {
      rulerRef.current = { wx1:d.wx1, wy1:d.wy1, wx2:wp.x, wy2:wp.y };
      redrawRef.current?.();
    } else if (d.type === "aoe") {
      aoePrevRef.current = buildAoePrev(d.wx0, d.wy0, wp.x, wp.y);
      redrawRef.current?.();
    } else if (d.type === "wall") {
      const { wx, wy } = snapCorner(wp.x, wp.y);
      wallPrevRef.current = { x1:d.x1, y1:d.y1, x2:wx, y2:wy, wtype:wallTypeRef.current };
      redrawRef.current?.();
    }
  };

  const onMouseUp = e => {
    fogPainting.current = false;
    if (!dragRef.current) return;
    const sp = canvasPos(e);
    const wp = s2w(sp.x, sp.y);
    const d  = dragRef.current;

    if (d.type === "token") {
      const tok = tokRef.current.find(t => t.id===d.id);
      if (tok) {
        const { cx: rawCx, cy: rawCy } = snapTok(wp.x-d.offX, wp.y-d.offY, tok.size||1);

        // Use the origin captured at mouseDown — tok.cx/cy is already at drag position by now
        const ox = d.originCx, oy = d.originCy;

        console.log("[Collision] drag origin:", ox.toFixed(1), oy.toFixed(1),
          "→ destination:", rawCx.toFixed(1), rawCy.toFixed(1));

        const blockers = wallsRef.current.filter(
          w => w.wtype === "wall" || w.wtype === "door-closed" || w.wtype === "window"
        );
        console.log("[Collision] checking against", blockers.length, "blocking wall(s)");
        blockers.forEach(w => {
          const hit = segSegIntersect(ox, oy, rawCx, rawCy, w.x1, w.y1, w.x2, w.y2);
          console.log(`  wall ${w.id} (${w.wtype}) [${w.x1.toFixed(0)},${w.y1.toFixed(0)}→${w.x2.toFixed(0)},${w.y2.toFixed(0)}]: ${hit ? "BLOCKED ✗" : "clear ✓"}`);
        });

        const blocked = crossesBlockingWall(ox, oy, rawCx, rawCy);
        console.log("[Collision] result:", blocked ? "BLOCKED — snapping back" : "allowed");

        const { cx, cy } = blocked
          ? { cx: ox, cy: oy }   // snap back to true origin
          : { cx: rawCx, cy: rawCy };

        // ── Player movement speed gate ────────────────────────────
        let finalCx = cx, finalCy = cy;
        if (!blocked && tok.type === "player" && combatState?.isActive) {
          const activeCombatant = combatState.combatants?.[combatState.turn];
          const isMyTurn = activeCombatant?.id === tok.id;
          if (isMyTurn) {
            const G = gridRef.current.cell || 50;
            const distFt = (Math.hypot(cx - ox, cy - oy) / G) * 5;
            const remaining = combatState.turnResources?.movement ?? 0;
            if (distFt > remaining + 0.5) {
              // Reject — not enough movement
              finalCx = ox; finalCy = oy;
              onSystemMessage?.(`⚠ Not enough movement — ${tok.name} needs ${Math.round(distFt)} ft but only ${remaining} ft remaining.`);
            } else {
              // Accept — consume movement
              const consumed = Math.min(Math.round(distFt / 5) * 5, remaining);
              onCombatUpdate?.({ action: "consume_resource", resource: "movement", amount: consumed });
            }
          }
        }

        const snapped = { ...tok, cx: finalCx, cy: finalCy };
        const updated = tokRef.current.map(t => t.id===d.id ? snapped : t);
        tokRef.current = updated;
        setTokens(updated);
        onUpdateMapState({ tokens: updated });
        applyLoS(snapped);
      }
    } else if (d.type === "aoe") {
      const prev = aoePrevRef.current;
      if (prev && Math.hypot((prev.wx||0)-(d.wx0||0), (prev.wy||0)-(d.wy0||0)) >= 0) {
        const newT = [...templRef.current, { ...prev, id:`aoe_${Date.now()}` }];
        templRef.current = newT;
        setTemplates(newT);
        onUpdateMapState({ templates: newT });
        // ── AoE auto-targeting ───────────────────────────────────────
        const G = gridRef.current.cell || 50;
        const caught = tokRef.current.filter(tok => {
          if (prev.type === "circle") {
            const distPx = Math.hypot(tok.cx - prev.wx, tok.cy - prev.wy);
            return distPx <= (prev.radiusFt / 5) * G;
          }
          if (prev.type === "cone") {
            const dx = tok.cx - prev.wx, dy = tok.cy - prev.wy;
            const distPx = Math.hypot(dx, dy);
            const lengthPx = (prev.lengthFt / 5) * G;
            if (distPx > lengthPx) return false;
            const tokAngle = Math.atan2(dy, dx);
            let diff = tokAngle - prev.dirAngle;
            while (diff > Math.PI)  diff -= 2*Math.PI;
            while (diff < -Math.PI) diff += 2*Math.PI;
            return Math.abs(diff) <= Math.PI / 4; // 45° half-angle = 90° cone
          }
          if (prev.type === "line") {
            const dx = tok.cx - prev.wx, dy = tok.cy - prev.wy;
            const lengthPx = (prev.lengthFt / 5) * G;
            const widthPx  = ((prev.widthFt||5) / 5) * G;
            // Project onto line axis
            const ax = Math.cos(prev.dirAngle), ay = Math.sin(prev.dirAngle);
            const along = dx*ax + dy*ay;
            const perp  = Math.abs(-dx*ay + dy*ax);
            return along >= 0 && along <= lengthPx && perp <= widthPx / 2;
          }
          return false;
        });
        if (caught.length > 0 && onAppendInput) {
          const names = caught.map(t => t.name).join(", ");
          onAppendInput(`[AoE Targets: ${names}]`);
        }
      }
      aoePrevRef.current = null;
    } else if (d.type === "wall") {
      const prev = wallPrevRef.current;
      if (prev && (Math.abs(prev.x2-prev.x1) > 2 || Math.abs(prev.y2-prev.y1) > 2)) {
        const newW = [...wallsRef.current, { ...prev, id:`wall_${Date.now()}` }];
        wallsRef.current = newW;
        setWalls(newW);
        onUpdateMapState({ walls: newW });
      }
      wallPrevRef.current = null;
    }
    // ruler: stays visible after mouseup until tool change or new drag

    dragRef.current = null;
    if (toolModeRef.current==="select") canvasRef.current.style.cursor="grab";
  };

  // Right-click to delete a template or wall
  const onContextMenu = e => {
    e.preventDefault();
    const sp = canvasPos(e);
    const wp = s2w(sp.x, sp.y);
    const mode = toolModeRef.current;
    if (mode === "wall") {
      const hitW = hitTestWall(wp.x, wp.y, 10 / camRef.current.s);
      if (hitW) {
        const updated = wallsRef.current.filter(w => w.id !== hitW.id);
        wallsRef.current = updated;
        setWalls(updated);
        onUpdateMapState({ walls: updated });
      }
      return;
    }
    const hit = hitTestTemplate(wp.x, wp.y);
    if (hit) {
      const updated = templRef.current.filter(t => t.id!==hit.id);
      templRef.current = updated;
      setTemplates(updated);
      onUpdateMapState({ templates: updated });
    }
  };

  // ── Scroll to zoom ─────────────────────────────────────
  const onWheel = useCallback(e => {
    e.preventDefault();
    const sp = canvasPos(e);
    const factor = e.deltaY < 0 ? 1.12 : 1/1.12;
    const old = camRef.current;
    const ns = Math.min(5, Math.max(0.15, old.s*factor));
    const ratio = ns/old.s;
    const nc = { s:ns, x:sp.x-(sp.x-old.x)*ratio, y:sp.y-(sp.y-old.y)*ratio };
    camRef.current = nc; setCam(nc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    cv.addEventListener("wheel", onWheel, { passive:false });
    return () => cv.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // ── Zoom controls ──────────────────────────────────────
  const zoomBy = f => {
    const cv=canvasRef.current;
    const cx=cv?cv.width/2:350, cy=cv?cv.height/2:240;
    const old=camRef.current;
    const ns=Math.min(5,Math.max(0.15,old.s*f));
    const ratio=ns/old.s;
    const nc={s:ns, x:cx-(cx-old.x)*ratio, y:cy-(cy-old.y)*ratio};
    camRef.current=nc; setCam(nc);
  };
  const resetCam = () => { const nc={x:0,y:0,s:1}; camRef.current=nc; setCam(nc); };

  // ── BG upload ──────────────────────────────────────────
  const handleBgUpload = e => {
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const src=ev.target.result;
      setBgSrc(src); onUpdateMapState({bgImage:src});
    };
    reader.readAsDataURL(file);
    e.target.value="";
  };

  // ── Add foe ────────────────────────────────────────────
  const doAddFoe = () => {
    const cv=canvasRef.current;
    const wp=s2w(cv?cv.width/2:350, cv?cv.height/2:240);
    const {cx,cy}=snapTok(wp.x, wp.y, foeSize);
    const tok={id:`e_${Date.now()}`,name:foeName,color:"#7f1d1d",cx,cy,type:"enemy",size:foeSize};
    setTokens(prev=>{const u=[...prev,tok];onUpdateMapState({tokens:u});return u;});
    setShowFoeForm(false); setFoeName("Foe"); setFoeSize(1);
  };

  // ── Cursor style per tool ──────────────────────────────
  const cursorForTool = {
    select:"grab", ruler:"crosshair",
    "fog-reveal":"cell", "fog-cover":"cell", aoe:"crosshair", wall:"crosshair",
  }[toolMode]||"grab";

  const ToolBtn = ({id, icon, label}) => (
    <button title={label} onClick={()=>setToolMode(id)} style={{
      ...BMAP_BTN,
      background:toolMode===id?"#334155":"#1e293b",
      color:toolMode===id?"#f1f5f9":"#94a3b8",
      borderColor:toolMode===id?"#475569":"#334155",
      padding:"3px 7px",
    }}>{icon} <span style={{fontSize:10}}>{label}</span></button>
  );

  // ── Render ─────────────────────────────────────────────
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#0a0f1a"}}>

      {/* ── Row 1: Main toolbar ── */}
      <div style={{padding:"5px 8px",borderBottom:"1px solid #1e293b",display:"flex",gap:4,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
        <span style={{color:"#475569",fontSize:10,fontWeight:"bold",textTransform:"uppercase",letterSpacing:1.5,marginRight:2}}>Map</span>

        <ToolBtn id="select"     icon="↖" label="Select" />
        <ToolBtn id="ruler"      icon="📏" label="Ruler" />
        <ToolBtn id="wall"       icon="▦" label="Wall" />
        <ToolBtn id="fog-reveal" icon="👁" label="Reveal" />
        <ToolBtn id="fog-cover"  icon="🌑" label="Cover" />
        <ToolBtn id="aoe"        icon="💥" label="AoE" />

        <div style={{display:"flex",alignItems:"center",gap:2,marginLeft:"auto"}}>
          <button onClick={()=>zoomBy(1/1.2)} style={BMAP_BTN}>−</button>
          <span style={{color:"#64748b",fontSize:10,minWidth:32,textAlign:"center",fontFamily:"monospace"}}>{Math.round(cam.s*100)}%</span>
          <button onClick={()=>zoomBy(1.2)} style={BMAP_BTN}>+</button>
          <button onClick={resetCam} title="Reset view" style={BMAP_BTN}>↺</button>
        </div>

        <button onClick={()=>fileInputRef.current?.click()} style={BMAP_BTN} title="Upload dungeon map image">🖼</button>
        {bgSrc&&<button onClick={()=>{setBgSrc(null);onUpdateMapState({bgImage:null});}} style={{...BMAP_BTN,color:"#ef4444",borderColor:"#ef444440",padding:"3px 5px"}}>✕BG</button>}
        {bgSrc&&(
          <button
            onClick={()=>setShowGridCal(v=>!v)}
            title="Calibrate overlay grid to match map image"
            style={{...BMAP_BTN, background:showGridCal?"#1e3a5f":"#1e293b", color:showGridCal?"#93c5fd":"#94a3b8", borderColor:showGridCal?"#3b82f6":"#334155"}}
          >⊞ Cal</button>
        )}
        <button
          onClick={()=>setFogEnabled(v=>{const n=!v;onUpdateMapState({fogEnabled:n});return n;})}
          style={{...BMAP_BTN, background:fogEnabled?"#1e3a5f":"#1e293b", color:fogEnabled?"#60a5fa":"#94a3b8", borderColor:fogEnabled?"#1d4ed8":"#334155"}}
          title="Toggle fog of war"
        >🌫 Fog</button>
        {templates.length>0&&<button onClick={()=>{setTemplates([]);onUpdateMapState({templates:[]});}} style={{...BMAP_BTN,color:"#f59e0b",borderColor:"#78350f",padding:"3px 5px"}} title="Clear AoE templates">✕AoE</button>}
        {walls.length>0&&<button onClick={()=>{wallsRef.current=[];setWalls([]);onUpdateMapState({walls:[]});}} style={{...BMAP_BTN,color:"#e2e8f0",borderColor:"#334155",padding:"3px 5px"}} title="Clear all walls">✕Walls</button>}
        <button onClick={()=>setShowFoeForm(v=>!v)} style={{...BMAP_BTN,background:showFoeForm?"#7f1d1d":"#991b1b",color:"#fff",border:"none"}}>+Foe</button>
        <button onClick={()=>{
          const existing=new Set(tokRef.current.map(t=>t.id));
          const G=gridRef.current.cell||50;
          const cam=camRef.current||{x:0,y:0,s:1};
          const centerX=-cam.x/cam.s;
          const centerY=-cam.y/cam.s;
          const missing=characters.filter(c=>!existing.has(c.id));
          if(!missing.length) return;
          const newToks=missing.map((c,i)=>({
            id:c.id, name:c.name, type:"player", size:1,
            color:c.avatarColor||"#4b5563",
            cx:centerX+(i-(missing.length-1)/2)*G,
            cy:centerY,
          }));
          const updated=[...tokRef.current,...newToks];
          tokRef.current=updated;
          setTokens(updated);
          onUpdateMapState({tokens:updated});
        }} style={{...BMAP_BTN,background:"#166534",color:"#86efac",border:"1px solid #22c55e40"}}>+Party</button>
        <button onClick={()=>{setTokens([]);onUpdateMapState({tokens:[]});}} style={BMAP_BTN}>Clear</button>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleBgUpload} style={{display:"none"}}/>
      </div>

      {/* ── Grid calibration panel (only shown when bg image loaded) ── */}
      {showGridCal && bgSrc && (
        <div style={{padding:"7px 10px",borderBottom:"1px solid #1e293b",background:"#04080f",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
          <span style={{color:"#3b82f6",fontSize:10,fontWeight:"bold",textTransform:"uppercase",letterSpacing:1,whiteSpace:"nowrap"}}>⊞ Grid Cal</span>

          {/* Cell size */}
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{color:"#64748b",fontSize:10,whiteSpace:"nowrap"}}>Cell px:</span>
            <input type="range" min={10} max={200} step={1} value={gridCell}
              onChange={e => {
                const v = Number(e.target.value);
                setGridCell(v);
                onUpdateMapState({ gridCell: v, gridOffX, gridOffY });
              }}
              style={{width:90,accentColor:"#3b82f6",cursor:"pointer"}}
            />
            <span style={{color:"#93c5fd",fontSize:10,fontFamily:"monospace",minWidth:26,textAlign:"right"}}>{gridCell}</span>
            <button onClick={()=>{setGridCell(50);onUpdateMapState({gridCell:50,gridOffX,gridOffY});}} style={{...BMAP_BTN,padding:"1px 5px",fontSize:9}}>50</button>
          </div>

          {/* Offset X */}
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{color:"#64748b",fontSize:10,whiteSpace:"nowrap"}}>Offset X:</span>
            <input type="range" min={0} max={gridCell-1} step={1} value={gridOffX}
              onChange={e => {
                const v = Number(e.target.value);
                setGridOffX(v);
                onUpdateMapState({ gridCell, gridOffX: v, gridOffY });
              }}
              style={{width:80,accentColor:"#a855f7",cursor:"pointer"}}
            />
            <span style={{color:"#c4b5fd",fontSize:10,fontFamily:"monospace",minWidth:22,textAlign:"right"}}>{gridOffX}</span>
          </div>

          {/* Offset Y */}
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{color:"#64748b",fontSize:10,whiteSpace:"nowrap"}}>Offset Y:</span>
            <input type="range" min={0} max={gridCell-1} step={1} value={gridOffY}
              onChange={e => {
                const v = Number(e.target.value);
                setGridOffY(v);
                onUpdateMapState({ gridCell, gridOffX, gridOffY: v });
              }}
              style={{width:80,accentColor:"#a855f7",cursor:"pointer"}}
            />
            <span style={{color:"#c4b5fd",fontSize:10,fontFamily:"monospace",minWidth:22,textAlign:"right"}}>{gridOffY}</span>
          </div>

          {/* Reset all */}
          <button onClick={()=>{setGridCell(50);setGridOffX(0);setGridOffY(0);onUpdateMapState({gridCell:50,gridOffX:0,gridOffY:0});}}
            style={{...BMAP_BTN,marginLeft:"auto",color:"#64748b",fontSize:9}}>Reset</button>

          <span style={{color:"#1e3a5f",fontSize:9,whiteSpace:"nowrap"}}>Tip: zoom in, then nudge sliders until overlay lines sit on image lines</span>
        </div>
      )}

      {/* ── Row 2: Context toolbar (tool-dependent) ── */}
      {toolMode==="aoe"&&(
        <div style={{padding:"5px 8px",borderBottom:"1px solid #1e293b",background:"#070c14",display:"flex",gap:5,alignItems:"center",flexShrink:0,flexWrap:"wrap"}}>
          <span style={{color:"#475569",fontSize:10,fontWeight:"bold"}}>Shape:</span>
          {["circle","cone","line"].map(sh=>(
            <button key={sh} onClick={()=>setAoeShape(sh)} style={{...BMAP_BTN, background:aoeShape===sh?"#334155":"#1e293b", color:aoeShape===sh?"#f1f5f9":"#94a3b8"}}>
              {sh==="circle"?"○ Circle":sh==="cone"?"∠ Cone":"— Line"}
            </button>
          ))}
          <span style={{color:"#475569",fontSize:10,fontWeight:"bold",marginLeft:6}}>Color:</span>
          {AOE_COLORS.map(c=>(
            <button key={c.key} onClick={()=>setAoeColor(c.key)} title={c.label}
              style={{width:18,height:18,borderRadius:3,background:c.stroke,border:aoeColor===c.key?"2px solid #fff":"2px solid transparent",cursor:"pointer",padding:0,flexShrink:0}}/>
          ))}
          <span style={{color:"#334155",fontSize:10,marginLeft:4}}>Drag to size • right-click to delete</span>
        </div>
      )}

      {(toolMode==="fog-reveal"||toolMode==="fog-cover")&&(
        <div style={{padding:"5px 8px",borderBottom:"1px solid #1e293b",background:"#070c14",display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
          <span style={{color:"#475569",fontSize:10,fontWeight:"bold"}}>Brush:</span>
          {[[1,"1×1"],[2,"3×3"],[3,"5×5"]].map(([sz,lbl])=>(
            <button key={sz} onClick={()=>setFogBrush(sz)} style={{...BMAP_BTN, background:fogBrush===sz?"#334155":"#1e293b", color:fogBrush===sz?"#f1f5f9":"#94a3b8"}}>{lbl}</button>
          ))}
          <span style={{color:"#334155",fontSize:10,marginLeft:4}}>
            {toolMode==="fog-reveal"?"Paint to reveal fog":"Paint to hide revealed cells"}
          </span>
          {fogEnabled&&(
            <button onClick={()=>{setFogRevealed(new Set());onUpdateMapState({fogRevealed:[]});}} style={{...BMAP_BTN,color:"#ef4444",borderColor:"#ef444440",marginLeft:"auto"}}>Reset All Fog</button>
          )}
          {!fogEnabled&&<span style={{color:"#f59e0b",fontSize:10,marginLeft:"auto"}}>⚠ Enable fog with the 🌫 Fog button first</span>}
        </div>
      )}

      {toolMode==="ruler"&&(
        <div style={{padding:"5px 8px",borderBottom:"1px solid #1e293b",background:"#070c14",display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
          <span style={{color:"#475569",fontSize:10}}>📏 Click and drag to measure • 1 square = 5 ft • ruler stays until you drag again</span>
          {rulerRef.current&&(
            <button onClick={()=>{rulerRef.current=null;redrawRef.current?.();}} style={{...BMAP_BTN,marginLeft:"auto",color:"#ef4444",borderColor:"#ef444440",padding:"2px 7px"}}>✕ Clear ruler</button>
          )}
        </div>
      )}

      {toolMode==="wall"&&(
        <div style={{padding:"5px 8px",borderBottom:"1px solid #1e293b",background:"#070c14",display:"flex",gap:4,alignItems:"center",flexShrink:0,flexWrap:"wrap"}}>
          {/* Wall type buttons */}
          {[
            { key:"wall",        icon:"▬", label:"Wall",        color:"#e2e8f0", desc:"Solid stone/wood — blocks sight & movement" },
            { key:"door-closed", icon:"🚪", label:"Door (closed)",color:"#f59e0b", desc:"Closed door — blocks sight until opened" },
            { key:"door-open",   icon:"↔",  label:"Door (open)", color:"#22c55e", desc:"Open door — does not block sight" },
            { key:"window",      icon:"🪟", label:"Window",      color:"#67e8f9", desc:"Window/arrow-slit — blocks movement, not sight" },
          ].map(wt => (
            <button key={wt.key} title={wt.desc} onClick={()=>setWallType(wt.key)} style={{
              ...BMAP_BTN,
              background: wallType===wt.key ? "#1e293b" : "transparent",
              color:       wallType===wt.key ? wt.color  : "#475569",
              borderColor: wallType===wt.key ? wt.color  : "#1e293b",
              padding:"2px 8px", gap:4, display:"flex", alignItems:"center",
            }}>
              <span>{wt.icon}</span>
              <span style={{fontSize:10}}>{wt.label}</span>
              {wallType===wt.key && <span style={{width:6,height:6,borderRadius:"50%",background:wt.color,display:"inline-block",marginLeft:2,flexShrink:0}}/>}
            </button>
          ))}

          {/* Visual legend swatch */}
          <div style={{marginLeft:"auto",display:"flex",gap:10,alignItems:"center"}}>
            {[
              {color:"#e2e8f0", label:"Wall"},
              {color:"#f59e0b", label:"Door"},
              {color:"#22c55e", label:"Open"},
              {color:"#67e8f9", label:"Window"},
            ].map(s=>(
              <span key={s.label} style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:"#475569"}}>
                <span style={{width:14,height:3,background:s.color,borderRadius:2,display:"inline-block"}}/>
                {s.label}
              </span>
            ))}
          </div>

          <span style={{color:"#334155",fontSize:10,marginLeft:4,whiteSpace:"nowrap"}}>
            Drag to draw · Right-click to erase
          </span>
        </div>
      )}

      {showFoeForm&&(
        <div style={{padding:"5px 8px",borderBottom:"1px solid #1e293b",background:"#070c14",display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
          <span style={{color:"#64748b",fontSize:11}}>Name:</span>
          <input value={foeName} onChange={e=>setFoeName(e.target.value)} placeholder="Goblin…"
            style={{flex:1,minWidth:60,background:"#0f172a",border:"1px solid #334155",borderRadius:4,color:"#e2e8f0",padding:"3px 7px",fontSize:12,outline:"none"}}/>
          <span style={{color:"#64748b",fontSize:11}}>Size:</span>
          <select value={foeSize} onChange={e=>setFoeSize(Number(e.target.value))}
            style={{background:"#0f172a",border:"1px solid #334155",borderRadius:4,color:"#e2e8f0",padding:"2px 5px",fontSize:11,cursor:"pointer"}}>
            <option value={1}>Med/Small</option>
            <option value={2}>Large (2×2)</option>
            <option value={3}>Huge (3×3)</option>
            <option value={4}>Garg. (4×4)</option>
          </select>
          <button onClick={doAddFoe} style={{...BMAP_BTN,background:"#991b1b",color:"#fff",border:"none"}}>Add</button>
          <button onClick={()=>setShowFoeForm(false)} style={{background:"none",border:"none",color:"#475569",fontSize:14,cursor:"pointer",lineHeight:1}}>✕</button>
        </div>
      )}

      {/* ── Canvas + floating overlay wrapper ── */}
      <div style={{flex:1,position:"relative",overflow:"hidden"}}>
        <canvas
          ref={canvasRef}
          style={{width:"100%",height:"100%",display:"block",cursor:cursorForTool,touchAction:"none"}}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onContextMenu={onContextMenu}
        />
        {/* ── Floating enemy info popup ── */}
        {(()=>{
          if(!selectedTokId) return null;
          const tok=tokens.find(t=>t.id===selectedTokId);
          if(!tok||tok.type==="player") return null;
          const combatant=combatState?.combatants?.find(c=>c.id===tok.id);
          // Convert world coords to screen coords
          const sx=tok.cx*cam.s+cam.x;
          const sy=tok.cy*cam.s+cam.y;
          const G=(gridRef.current?.cell||50)*cam.s;
          return (
            <div style={{
              position:"absolute",
              left:sx+G*0.6, top:Math.max(4,sy-G*0.5),
              background:"#0a0f1a",border:"1px solid #ef444460",
              borderRadius:10,padding:"10px 12px",minWidth:140,
              boxShadow:"0 4px 20px #00000080",pointerEvents:"auto",
              zIndex:10,
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6,gap:8}}>
                <div style={{fontWeight:"900",color:"#e2e8f0",fontSize:12,lineHeight:1.2}}>{tok.name}</div>
                <button onClick={()=>setSelectedTokId(null)} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:12,lineHeight:1,padding:0,flexShrink:0}}>✕</button>
              </div>
              {combatant?(
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <div style={{textAlign:"center",flex:1,background:"#0f172a",borderRadius:6,padding:"4px 6px"}}>
                    <div style={{fontSize:8,color:"#475569",textTransform:"uppercase",fontWeight:"bold"}}>HP</div>
                    <div style={{fontSize:12,fontWeight:"bold",color:combatant.hp<=combatant.maxHp/2?"#ef4444":"#22c55e",fontFamily:"monospace"}}>{combatant.hp}/{combatant.maxHp}</div>
                  </div>
                  <div style={{textAlign:"center",flex:1,background:"#0f172a",borderRadius:6,padding:"4px 6px"}}>
                    <div style={{fontSize:8,color:"#475569",textTransform:"uppercase",fontWeight:"bold"}}>AC</div>
                    <div style={{fontSize:12,fontWeight:"bold",color:"#60a5fa"}}>{combatant.ac}</div>
                  </div>
                </div>
              ):(
                <div style={{fontSize:10,color:"#334155",marginBottom:8,fontStyle:"italic"}}>Not in combat</div>
              )}
              {combatant?.status?.length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:8}}>
                  {combatant.status.map(s=>(
                    <span key={s} style={{fontSize:9,background:"#7f1d1d20",border:"1px solid #ef444440",borderRadius:4,padding:"1px 5px",color:"#fca5a5"}}>{s}</span>
                  ))}
                </div>
              )}
              <button
                onClick={()=>onAppendInput?.(`[Targeting: ${tok.name}]`)}
                style={{width:"100%",padding:"5px 8px",background:"#1c0a08",border:"1px solid #ef444460",borderRadius:6,color:"#fca5a5",fontSize:11,fontWeight:"bold",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                🎯 Target
              </button>
            </div>
          );
        })()}
      </div>

      {/* ── Status bar ── */}
      <div style={{padding:"2px 10px",color:"#1e293b",fontSize:10,flexShrink:0,display:"flex",gap:12,alignItems:"center"}}>
        <span>↖ pan</span>
        <span>scroll zoom</span>
        <span>{tokens.length} token{tokens.length!==1?"s":""}</span>
        {walls.length>0&&<span>{walls.length} wall{walls.length!==1?"s":""}</span>}
        {templates.length>0&&<span>{templates.length} AoE template{templates.length!==1?"s":""}</span>}
        {fogEnabled&&<span style={{color:"#1d4ed840"}}>🌫 Fog on</span>}
        {fogEnabled && selectedTokId && (()=>{
          const tok = tokens.find(t=>t.id===selectedTokId);
          if (!tok) return null;
          const vft = getTokenVisionFt(tok, characters);
          return (
            <span style={{marginLeft:"auto",color:"#f59e0b",fontSize:10,display:"flex",alignItems:"center",gap:4}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:tok.color,border:"1px solid #f59e0b",display:"inline-block",flexShrink:0}}/>
              👁 {tok.name} · {vft} ft {vft===60&&tok.type==="player"?"(torch)":"darkvision"}
              <button
                onClick={()=>{
                  const t=tokens.find(t2=>t2.id===selectedTokId);
                  if(t) applyLoS(t);
                }}
                title="Recalculate LoS now"
                style={{background:"none",border:"1px solid #f59e0b44",borderRadius:3,color:"#f59e0b",fontSize:9,cursor:"pointer",padding:"1px 5px",marginLeft:2}}
              >↺ LoS</button>
            </span>
          );
        })()}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// COMBAT TRACKER
// ─────────────────────────────────────────────────────────
const btnSm=(bg,color)=>({padding:"5px 8px",background:bg,color,border:"none",borderRadius:4,cursor:"pointer",fontSize:13,fontWeight:"bold"});
const inputSt={width:"100%",background:"#0f172a",border:"1px solid #334155",borderRadius:4,color:"#e2e8f0",padding:"4px 6px",fontSize:12,boxSizing:"border-box"};

function CombatTracker({ combatState, onUpdate, characters }) {
  const [statusMenuId,setStatusMenuId]=useState(null);
  const [editId,setEditId]=useState(null);
  const [editForm,setEditForm]=useState({});

  if(!combatState.isActive) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",padding:24,textAlign:"center",gap:16}}>
      <div style={{fontSize:40}}>⚔️</div>
      <div style={{color:"#64748b",fontWeight:"bold",fontSize:13}}>No Active Combat</div>
      <div style={{color:"#475569",fontSize:12}}>Start an encounter to track initiative and HP.</div>
      <button onClick={()=>onUpdate({action:"start",combatants:characters.map(c=>({id:c.id,name:c.name,type:"player",hp:c.hp.current,maxHp:c.hp.max,ac:c.ac,initiative:rollDie(20)+Math.floor((c.stats.dex-10)/2),status:[]}))})}
        style={{padding:"10px 20px",background:"#b45309",color:"#fff",border:"none",borderRadius:8,fontWeight:"bold",cursor:"pointer",fontSize:13}}>▶ Start Combat</button>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"10px 12px",borderBottom:"1px solid #1e293b",display:"flex",alignItems:"center",gap:8}}>
        <span style={{color:"#f59e0b",fontWeight:"bold",fontSize:11,textTransform:"uppercase",letterSpacing:1.5,flex:1}}>⚔️ Round {combatState.round}</span>
        <button onClick={()=>onUpdate({action:"add_combatant",combatant:{id:`npc_${Date.now()}`,name:"NPC",type:"monster",hp:10,maxHp:10,ac:10,initiative:rollDie(20),status:[]}})} style={btnSm("#1e293b","#94a3b8")}>+</button>
        <button onClick={()=>onUpdate({action:"prev_turn"})} style={btnSm("#1e293b","#94a3b8")}>◀</button>
        <button onClick={()=>onUpdate({action:"next_turn"})} style={btnSm("#1e293b","#f59e0b")}>▶</button>
        <button onClick={()=>onUpdate({action:"end_combat"})} style={btnSm("#1e293b","#ef4444")}>✕</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"8px"}}>
        {combatState.combatants.map((c,i)=>{
          const isActive=i===combatState.turn;
          const isBloodied=c.hp<=c.maxHp/2;
          return (
            <div key={c.id} style={{marginBottom:6,padding:"8px 10px",borderRadius:8,border:`1px solid ${isActive?"#f59e0b":"#1e293b"}`,background:isActive?"#1c1407":"#0f172a",transition:"all 0.2s"}}>
              {editId===c.id ? (
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <input value={editForm.name} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))} style={inputSt}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4}}>
                    {["initiative","hp","maxHp","ac"].map(k=>(
                      <div key={k}><div style={{color:"#475569",fontSize:9,textTransform:"uppercase",marginBottom:2}}>{k}</div>
                        <input type="number" value={editForm[k]} onChange={e=>setEditForm(p=>({...p,[k]:e.target.value}))} style={{...inputSt,textAlign:"center"}}/></div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={()=>{onUpdate({action:"update_combatants",combatants:[{id:editId,...editForm,hp:+editForm.hp,maxHp:+editForm.maxHp,ac:+editForm.ac,initiative:+editForm.initiative}]});setEditId(null);}} style={{...btnSm("#166534","#fff"),flex:1,fontSize:11}}>Save</button>
                    <button onClick={()=>setEditId(null)} style={{...btnSm("#1e293b","#94a3b8"),flex:1,fontSize:11}}>Cancel</button>
                    <button onClick={()=>{onUpdate({action:"remove_combatant",targetId:c.id});setEditId(null);}} style={{...btnSm("#7f1d1d","#fca5a5"),flex:1,fontSize:11}}>Del</button>
                  </div>
                </div>
              ):(
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    {isActive&&<span style={{color:"#f59e0b",fontSize:12}}>▶</span>}
                    {isBloodied&&<span title="Bloodied" style={{fontSize:11}}>🩸</span>}
                    <span style={{fontWeight:"bold",fontSize:13,color:c.type==="player"?"#e2e8f0":"#fca5a5",flex:1}}>{c.name}</span>
                    <span style={{color:"#475569",fontSize:10,fontFamily:"monospace"}}>I:{c.initiative}</span>
                    <span style={{color:"#475569",fontSize:10}}>AC{c.ac}</span>
                    <button onClick={()=>{setEditId(c.id);setEditForm({name:c.name,initiative:c.initiative,hp:c.hp,maxHp:c.maxHp,ac:c.ac});}} style={{color:"#475569",background:"none",border:"none",cursor:"pointer",fontSize:12}}>✎</button>
                      <div style={{position:"relative"}}>
                        <button onClick={()=>setStatusMenuId(statusMenuId===c.id?null:c.id)} style={{color:"#475569",background:"none",border:"none",cursor:"pointer",fontSize:12}} title="Add/Remove Condition">+</button>
                        {statusMenuId===c.id&&(
                          <div style={{position:"absolute",right:0,top:"100%",background:"#0a0f1a",border:"1px solid #334155",borderRadius:8,zIndex:50,width:200,maxHeight:260,overflowY:"auto",padding:6,boxShadow:"0 8px 24px #000a"}}>
                            <div style={{fontSize:9,color:"#475569",fontWeight:"bold",textTransform:"uppercase",letterSpacing:1,padding:"2px 4px 6px"}}>Conditions</div>
                            {Object.values(STATUS_CONDITIONS_DATABASE).map(cond=>{
                              const isOn=(c.status||[]).includes(cond.name);
                              return (
                                <button key={cond.id} onClick={()=>{onUpdate({action:"update_status",targetId:c.id,status:cond.name,add:!isOn});if(isOn||!isOn)setStatusMenuId(null);}}
                                  style={{display:"flex",alignItems:"center",gap:7,width:"100%",textAlign:"left",padding:"5px 7px",background:isOn?cond.color+"40":"none",border:"none",borderRadius:5,color:isOn?"#f1f5f9":"#94a3b8",fontSize:10,cursor:"pointer",marginBottom:1,transition:"background 0.1s"}}>
                                  <span style={{fontSize:13,width:18,textAlign:"center",flexShrink:0}}>{cond.icon}</span>
                                  <div style={{flex:1}}>
                                    <div style={{fontWeight:"bold",fontSize:10}}>{cond.name}</div>
                                    <div style={{fontSize:8,color:"#475569",lineHeight:1.2,marginTop:1}}>{cond.effects[0]}</div>
                                  </div>
                                  {isOn&&<span style={{fontSize:8,color:"#ef4444",flexShrink:0}}>✕</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <button onClick={()=>onUpdate({action:"update_combatants",combatants:[{id:c.id,hp:Math.max(0,c.hp-1)}]})} style={{color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:14,lineHeight:1}}>−</button>
                    <div style={{flex:1,height:6,background:"#1e293b",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.min(100,(c.hp/c.maxHp)*100)}%`,background:c.hp<c.maxHp/2?"#ef4444":"#22c55e",transition:"width 0.3s"}}/>
                    </div>
                    <button onClick={()=>onUpdate({action:"update_combatants",combatants:[{id:c.id,hp:Math.min(c.maxHp,c.hp+1)}]})} style={{color:"#22c55e",background:"none",border:"none",cursor:"pointer",fontSize:14,lineHeight:1}}>+</button>
                    <span style={{color:"#94a3b8",fontSize:11,fontFamily:"monospace",minWidth:50,textAlign:"right"}}>{c.hp}/{c.maxHp}</span>
                  </div>
                  {c.status&&c.status.length>0&&(
                    <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:5}}>
                      {c.status.map((s,si)=>{
                        const def = Object.values(STATUS_CONDITIONS_DATABASE).find(d=>d.name===s||d.id===s.toLowerCase());
                        const bg = def ? def.color+"40" : "#1e293b";
                        const border = def ? def.color : "#334155";
                        const icon = def ? def.icon : "◈";
                        const isLock = def?.locksActions;
                        return (
                          <button key={si} onClick={()=>onUpdate({action:"update_status",targetId:c.id,status:s,add:false})}
                            title={def ? def.effects.join(" • ") : s}
                            style={{padding:"2px 6px",background:bg,border:`1px solid ${border}`,borderRadius:4,color:"#f1f5f9",fontSize:9,cursor:"pointer",fontWeight:"bold",display:"flex",alignItems:"center",gap:3,textTransform:"uppercase",letterSpacing:0.3}}>
                            <span style={{fontSize:10}}>{icon}</span>
                            <span>{s}</span>
                            {isLock&&<span style={{color:"#ef4444",fontSize:8}}>🚫</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* ── AI Tactics for this turn (DM-generated) ── */}
                  {c.tactics&&(
                    <div style={{marginTop:6,padding:"5px 8px",background:"#0a1628",border:"1px solid #1e40af",borderRadius:5,display:"flex",gap:6,alignItems:"flex-start"}}>
                      <span style={{fontSize:11,flexShrink:0}}>🧠</span>
                      <span style={{fontSize:10,color:"#93c5fd",lineHeight:1.4,fontStyle:"italic"}}>{c.tactics}</span>
                    </div>
                  )}
                  {/* ── Monster stat block preview (collapsed by default) ── */}
                  {c.type==="monster"&&c.monsterActions&&c.monsterActions.length>0&&isActive&&(
                    <div style={{marginTop:5,padding:"5px 8px",background:"#0f1a0a",border:"1px solid #166534",borderRadius:5}}>
                      <div style={{fontSize:9,color:"#4ade80",fontWeight:"bold",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>Actions</div>
                      {c.monsterActions.map((a,ai)=>(
                        <div key={ai} style={{fontSize:10,color:"#86efac",marginBottom:2,lineHeight:1.3}}>
                          <span style={{fontWeight:"bold"}}>{a.name}</span>
                          {a.bonus!==undefined&&<span style={{color:"#4ade80"}}> +{a.bonus}</span>}
                          {a.damage&&<span style={{color:"#fbbf24"}}> • {a.damage} {a.damageType||""}</span>}
                          {a.desc&&<span style={{color:"#475569"}}> — {a.desc}</span>}
                          {a.special&&<span style={{color:"#f97316"}}> ⚠ {a.special}</span>}
                        </div>
                      ))}
                      {c.monsterBonusActions&&c.monsterBonusActions.length>0&&(
                        <div style={{marginTop:3,borderTop:"1px solid #14532d",paddingTop:3}}>
                          <div style={{fontSize:9,color:"#22c55e",fontWeight:"bold",textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>Bonus Actions</div>
                          {c.monsterBonusActions.map((a,ai)=>(<div key={ai} style={{fontSize:10,color:"#86efac"}}><span style={{fontWeight:"bold"}}>{a.name}</span><span style={{color:"#475569"}}> — {a.desc}</span></div>))}
                        </div>
                      )}
                    </div>
                  )}
                  {/* ── Tactic hints (always visible for monsters) ── */}
                  {c.type==="monster"&&c.tacticHints&&!c.tactics&&(
                    <div style={{marginTop:5,padding:"4px 7px",background:"#0a0f1a",border:"1px solid #1e293b",borderRadius:4}}>
                      <span style={{fontSize:9,color:"#475569",fontStyle:"italic"}}>{c.tacticHints}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TTS HOOK
// ─────────────────────────────────────────────────────────
function useTTS() {
  const [isSpeaking,setIsSpeaking]=useState(false);
  const [speakingId,setSpeakingId]=useState(null);

  const getVoice=()=>{
    const voices=window.speechSynthesis?.getVoices()||[];
    for(const name of ["Google UK English Male","Microsoft George - English (United Kingdom)","Daniel","Arthur","Google US English"]){
      const v=voices.find(v=>v.name===name); if(v) return v;
    }
    return voices.find(v=>/en/i.test(v.lang)&&/male/i.test(v.name))||voices.find(v=>/en/i.test(v.lang))||voices[0]||null;
  };

  const speak=(text,id)=>{
    if(!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if(speakingId===id&&isSpeaking){ setIsSpeaking(false); setSpeakingId(null); return; }
    const clean=text.replace(/\*\*(.*?)\*\*/g,"$1").replace(/\*(.*?)\*/g,"$1").replace(/\[COMBAT_UPDATE\][\s\S]*?\[\/COMBAT_UPDATE\]/g,"").replace(/[#`_~]/g,"").trim();
    const u=new SpeechSynthesisUtterance(clean);
    u.pitch=0.8; u.rate=0.92; u.volume=1;
    const setV=()=>{ const v=getVoice(); if(v) u.voice=v; };
    setV();
    if(!u.voice) window.speechSynthesis.addEventListener("voiceschanged",setV,{once:true});
    u.onstart=()=>{setIsSpeaking(true);setSpeakingId(id);};
    u.onend=()=>{setIsSpeaking(false);setSpeakingId(null);};
    u.onerror=()=>{setIsSpeaking(false);setSpeakingId(null);};
    window.speechSynthesis.speak(u);
  };
  const stop=()=>{ window.speechSynthesis?.cancel(); setIsSpeaking(false); setSpeakingId(null); };
  return { speak,stop,isSpeaking,speakingId };
}

// ─────────────────────────────────────────────────────────
// CHAT MESSAGE
// ─────────────────────────────────────────────────────────
function ChatMessage({ msg, msgId, onSpeak, speakingId }) {
  const isDM=msg.role==="assistant", isSystem=msg.role==="system";
  const isPlaying=speakingId===msgId;
  if(isSystem) return (
    <div style={{textAlign:"center",margin:"8px 0"}}>
      <span style={{fontSize:10,color:"#475569",background:"#0f172a",border:"1px solid #1e293b",padding:"3px 12px",borderRadius:20,textTransform:"uppercase",letterSpacing:1}}>{msg.content}</span>
    </div>
  );
  return (
    <div style={{display:"flex",justifyContent:isDM?"flex-start":"flex-end",marginBottom:16}}>
      <div style={{maxWidth:"85%",borderRadius:isDM?"4px 16px 16px 16px":"16px 4px 16px 16px",padding:"12px 14px",background:isDM?"#1e293b":"#1c1407",border:`1px solid ${isDM?(isPlaying?"#f59e0b":"#334155"):"#78350f"}`,color:"#e2e8f0",position:"relative",transition:"border-color 0.2s"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{fontSize:9,fontWeight:"bold",textTransform:"uppercase",letterSpacing:1.5,color:isDM?"#64748b":"#92400e"}}>{isDM?"🎲 Dungeon Master":"🗡️ Player"}</div>
          {isDM&&<button onClick={()=>onSpeak(msg.content,msgId)} title={isPlaying?"Stop":"Narrate"} style={{background:isPlaying?"#78350f":"none",border:`1px solid ${isPlaying?"#f59e0b":"#334155"}`,borderRadius:6,padding:"3px 7px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,color:isPlaying?"#fbbf24":"#475569",fontSize:10,transition:"all 0.2s"}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
            <span style={{fontWeight:"bold",letterSpacing:0.5}}>{isPlaying?"STOP":"SAY"}</span>
          </button>}
        </div>
        <div style={{fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{msg.content}</div>
        {isPlaying&&<div style={{position:"absolute",inset:-1,borderRadius:"inherit",border:"1px solid #f59e0b40",animation:"tts-pulse 1.5s ease-in-out infinite",pointerEvents:"none"}}/>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// STAT BLOCK
// ─────────────────────────────────────────────────────────
function StatBlock({ label, value, onClick }) {
  const mod=Math.floor((value-10)/2);
  return (
    <button onClick={()=>onClick(label,mod)} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",width:58,height:70,background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,cursor:"pointer",transition:"all 0.15s",color:"#e2e8f0"}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.style.background="#1e293b";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e293b";e.currentTarget.style.background="#0f172a";}}>
      <span style={{fontSize:8,fontWeight:"900",color:"#64748b",textTransform:"uppercase",letterSpacing:0.5}}>{label}</span>
      <span style={{fontSize:18,fontWeight:"900",fontFamily:"Georgia,serif",margin:"2px 0"}}>{value}</span>
      <span style={{fontSize:10,fontWeight:"bold",color:"#f59e0b"}}>{mod>=0?"+":""}{mod}</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// RULES ENGINE — Centralized 2024 PHB Data Dictionary
// Every feat and subclass level maps: prerequisites → statBonuses →
// grantedSpells → actions → passiveEffects → features (text).
// applyMechanics() is the single function that drives ALL level-up changes.
// ═══════════════════════════════════════════════════════════════════════

// ── Spellcasting helpers ─────────────────────────────────────────────
const SPELLCASTING_CLASSES=["Bard","Cleric","Druid","Paladin","Ranger","Sorcerer","Warlock","Wizard"];
const hasSpellcasting=(char)=>SPELLCASTING_CLASSES.includes(char.class.split(" ")[0])||(char.features||[]).some(f=>f.name.toLowerCase().includes("spellcasting")||f.name.toLowerCase().includes("magic initiate")||f.name.toLowerCase().includes("pact magic"));
const hasProficiency=(char,prof)=>{
  const armor={light:["Bard","Cleric","Druid","Paladin","Ranger","Rogue","Warlock","Fighter","Barbarian"],medium:["Cleric","Druid","Paladin","Ranger","Fighter","Barbarian"],heavy:["Paladin","Fighter","Barbarian"],shield:["Cleric","Druid","Paladin","Ranger","Fighter","Barbarian"]};
  return (armor[prof]||[]).includes(char.class.split(" ")[0]);
};

// ── SPELL DATABASE ────────────────────────────────────────────────────
const SPELL_DB={
  Bard:{
    cantrips:["Blade Ward","Friends","Light","Mage Hand","Minor Illusion","Prestidigitation","Thunderclap","True Strike","Vicious Mockery"],
    1:["Animal Friendship","Bane","Charm Person","Color Spray","Cure Wounds","Detect Magic","Disguise Self","Dissonant Whispers","Faerie Fire","Feather Fall","Healing Word","Heroism","Identify","Illusory Script","Longstrider","Silent Image","Sleep","Speak with Animals","Tasha's Hideous Laughter","Thunderwave","Unseen Servant"],
    2:["Aid","Animal Messenger","Blindness/Deafness","Calm Emotions","Crown of Madness","Detect Thoughts","Enhance Ability","Enthrall","Heat Metal","Hold Person","Invisibility","Knock","Lesser Restoration","Locate Animals or Plants","Locate Object","Magic Mouth","Mirror Image","Phantasmal Force","See Invisibility","Shatter","Silence","Suggestion","Zone of Truth"],
    3:["Bestow Curse","Clairvoyance","Dispel Magic","Fear","Feign Death","Glyph of Warding","Hypnotic Pattern","Leomund's Tiny Hut","Major Image","Nondetection","Plant Growth","Sending","Speak with Dead","Speak with Plants","Stinking Cloud","Tongues"],
    4:["Compulsion","Confusion","Dimension Door","Freedom of Movement","Greater Invisibility","Hallucinatory Terrain","Locate Creature","Polymorph"],
    5:["Animate Objects","Awaken","Dominate Person","Dream","Geas","Hold Monster","Legend Lore","Mass Cure Wounds","Mislead","Modify Memory","Planar Binding","Raise Dead","Scrying","Seeming","Teleportation Circle"],
  },
  Cleric:{
    cantrips:["Guidance","Light","Mending","Resistance","Sacred Flame","Spare the Dying","Thaumaturgy","Toll the Dead","Word of Radiance"],
    1:["Bane","Bless","Command","Create or Destroy Water","Cure Wounds","Detect Evil and Good","Detect Magic","Detect Poison and Disease","Guiding Bolt","Healing Word","Inflict Wounds","Protection from Evil and Good","Purify Food and Drink","Sanctuary","Shield of Faith"],
    2:["Aid","Augury","Blindness/Deafness","Calm Emotions","Continual Flame","Enhance Ability","Find Traps","Gentle Repose","Hold Person","Lesser Restoration","Locate Object","Prayer of Healing","Protection from Poison","Silence","Spiritual Weapon","Warding Bond","Zone of Truth"],
    3:["Animate Dead","Beacon of Hope","Bestow Curse","Clairvoyance","Create Food and Water","Daylight","Dispel Magic","Feign Death","Glyph of Warding","Magic Circle","Mass Healing Word","Meld into Stone","Protection from Energy","Remove Curse","Revivify","Sending","Speak with Dead","Spirit Guardians","Tongues","Water Walk"],
    4:["Banishment","Control Water","Death Ward","Divination","Freedom of Movement","Guardian of Faith","Locate Creature","Stone Shape"],
    5:["Commune","Contagion","Dawn","Dispel Evil and Good","Flame Strike","Geas","Greater Restoration","Hallow","Holy Weapon","Insect Plague","Legend Lore","Mass Cure Wounds","Planar Binding","Raise Dead","Scrying","Summon Celestial"],
  },
  Druid:{
    cantrips:["Druidcraft","Guidance","Mending","Poison Spray","Produce Flame","Resistance","Shillelagh","Spare the Dying","Thorn Whip","Thunderclap"],
    1:["Animal Friendship","Charm Person","Create or Destroy Water","Cure Wounds","Detect Magic","Detect Poison and Disease","Entangle","Faerie Fire","Fog Cloud","Goodberry","Healing Word","Jump","Longstrider","Purify Food and Drink","Speak with Animals","Thunderwave"],
    2:["Animal Messenger","Barkskin","Beast Sense","Darkvision","Enhance Ability","Find Traps","Flame Blade","Flaming Sphere","Gust of Wind","Heat Metal","Hold Person","Lesser Restoration","Locate Animals or Plants","Locate Object","Moonbeam","Pass without Trace","Protection from Poison","Spike Growth"],
    3:["Call Lightning","Conjure Animals","Daylight","Dispel Magic","Erupting Earth","Feign Death","Meld into Stone","Plant Growth","Protection from Energy","Sleet Storm","Speak with Plants","Summon Fey","Water Breathing","Water Walk","Wind Wall"],
    4:["Blight","Conjure Minor Elementals","Conjure Woodland Beings","Control Water","Dominate Beast","Freedom of Movement","Giant Insect","Hallucinatory Terrain","Ice Storm","Locate Creature","Polymorph","Stone Shape","Stoneskin","Wall of Fire"],
    5:["Antilife Shell","Awaken","Commune with Nature","Cone of Cold","Conjure Elemental","Contagion","Geas","Greater Restoration","Insect Plague","Mass Cure Wounds","Planar Binding","Reincarnate","Scrying","Tree Stride","Wall of Stone"],
  },
  Paladin:{
    1:["Bless","Command","Compelled Duel","Cure Wounds","Detect Evil and Good","Detect Magic","Detect Poison and Disease","Divine Favor","Divine Smite","Heroism","Protection from Evil and Good","Purify Food and Drink","Sanctuary","Shield of Faith","Thunderous Smite","Wrathful Smite"],
    2:["Aid","Branding Smite","Find Steed","Lesser Restoration","Locate Object","Magic Weapon","Prayer of Healing","Protection from Poison","Warding Bond","Zone of Truth"],
    3:["Aura of Vitality","Blinding Smite","Create Food and Water","Crusader's Mantle","Daylight","Dispel Magic","Elemental Weapon","Magic Circle","Remove Curse","Revivify"],
    4:["Aura of Life","Aura of Purity","Banishment","Death Ward","Locate Creature","Staggering Smite"],
    5:["Banishing Smite","Circle of Power","Destructive Wave","Dispel Evil and Good","Geas","Holy Weapon","Raise Dead","Summon Celestial"],
  },
  Ranger:{
    1:["Alarm","Animal Friendship","Cure Wounds","Detect Magic","Detect Poison and Disease","Ensnaring Strike","Fog Cloud","Goodberry","Hail of Thorns","Hunter's Mark","Jump","Longstrider","Speak with Animals"],
    2:["Animal Messenger","Barkskin","Beast Sense","Cordon of Arrows","Darkvision","Find Traps","Lesser Restoration","Locate Animals or Plants","Locate Object","Pass without Trace","Protection from Poison","Silence","Spike Growth"],
    3:["Conjure Animals","Conjure Barrage","Daylight","Lightning Arrow","Nondetection","Plant Growth","Protection from Energy","Speak with Plants","Summon Fey","Water Breathing","Water Walk","Wind Wall"],
    4:["Conjure Woodland Beings","Freedom of Movement","Grasping Vine","Locate Creature","Stoneskin"],
    5:["Commune with Nature","Conjure Volley","Steel Wind Strike","Swift Quiver","Tree Stride"],
  },
  Sorcerer:{
    cantrips:["Acid Splash","Blade Ward","Chill Touch","Fire Bolt","Friends","Light","Mage Hand","Minor Illusion","Poison Spray","Prestidigitation","Ray of Frost","Shocking Grasp","Thunderclap","True Strike"],
    1:["Burning Hands","Charm Person","Chromatic Orb","Color Spray","Comprehend Languages","Detect Magic","Disguise Self","Expeditious Retreat","False Life","Feather Fall","Fog Cloud","Jump","Mage Armor","Magic Missile","Ray of Sickness","Shield","Silent Image","Sleep","Thunderwave","Witch Bolt"],
    2:["Blindness/Deafness","Blur","Crown of Madness","Darkness","Darkvision","Detect Thoughts","Enhance Ability","Enlarge/Reduce","Gust of Wind","Hold Person","Invisibility","Knock","Levitate","Mirror Image","Misty Step","Phantasmal Force","Scorching Ray","See Invisibility","Shatter","Spider Climb","Suggestion","Web"],
    3:["Blink","Clairvoyance","Counterspell","Daylight","Dispel Magic","Fear","Fireball","Fly","Gaseous Form","Haste","Hypnotic Pattern","Lightning Bolt","Major Image","Protection from Energy","Slow","Stinking Cloud","Tongues","Water Breathing","Water Walk"],
    4:["Banishment","Blight","Confusion","Dimension Door","Dominate Beast","Fire Shield","Greater Invisibility","Ice Storm","Polymorph","Stoneskin","Wall of Fire"],
    5:["Animate Objects","Cloudkill","Cone of Cold","Creation","Dominate Person","Hold Monster","Insect Plague","Seeming","Telekinesis","Teleportation Circle","Wall of Stone"],
  },
  Warlock:{
    cantrips:["Blade Ward","Chill Touch","Eldritch Blast","Friends","Mage Hand","Minor Illusion","Poison Spray","Prestidigitation","True Strike"],
    1:["Armor of Agathys","Arms of Hadar","Charm Person","Comprehend Languages","Expeditious Retreat","Hellish Rebuke","Hex","Illusory Script","Protection from Evil and Good","Unseen Servant","Witch Bolt"],
    2:["Cloud of Daggers","Crown of Madness","Darkness","Enthrall","Hold Person","Invisibility","Mirror Image","Misty Step","Ray of Enfeeblement","Shatter","Spider Climb","Suggestion"],
    3:["Counterspell","Dispel Magic","Fear","Fly","Gaseous Form","Hunger of Hadar","Hypnotic Pattern","Magic Circle","Major Image","Remove Curse","Tongues","Vampiric Touch"],
    4:["Banishment","Blight","Dimension Door","Hallucinatory Terrain"],
    5:["Contact Other Plane","Dream","Hold Monster","Mislead","Modify Memory","Planar Binding","Scrying","Seeming","Teleportation Circle"],
  },
  Wizard:{
    cantrips:["Acid Splash","Blade Ward","Chill Touch","Dancing Lights","Fire Bolt","Friends","Light","Mage Hand","Mending","Message","Minor Illusion","Poison Spray","Prestidigitation","Ray of Frost","Shocking Grasp","True Strike"],
    1:["Alarm","Burning Hands","Charm Person","Chromatic Orb","Color Spray","Comprehend Languages","Detect Magic","Disguise Self","Expeditious Retreat","False Life","Feather Fall","Find Familiar","Fog Cloud","Grease","Identify","Jump","Longstrider","Mage Armor","Magic Missile","Protection from Evil and Good","Ray of Sickness","Shield","Silent Image","Sleep","Thunderwave","Unseen Servant","Witch Bolt"],
    2:["Alter Self","Arcane Lock","Blindness/Deafness","Blur","Cloud of Daggers","Continual Flame","Crown of Madness","Darkness","Darkvision","Detect Thoughts","Enlarge/Reduce","Flaming Sphere","Gentle Repose","Gust of Wind","Hold Person","Invisibility","Knock","Levitate","Locate Object","Magic Mouth","Magic Weapon","Mirror Image","Misty Step","Phantasmal Force","Ray of Enfeeblement","Rope Trick","Scorching Ray","See Invisibility","Shatter","Spider Climb","Suggestion","Web"],
    3:["Animate Dead","Bestow Curse","Blink","Clairvoyance","Counterspell","Dispel Magic","Fear","Fireball","Fly","Gaseous Form","Glyph of Warding","Haste","Hypnotic Pattern","Leomund's Tiny Hut","Lightning Bolt","Magic Circle","Major Image","Nondetection","Phantom Steed","Protection from Energy","Remove Curse","Sending","Sleet Storm","Slow","Speak with Dead","Stinking Cloud","Tongues","Vampiric Touch","Water Breathing"],
    4:["Arcane Eye","Banishment","Blight","Confusion","Conjure Minor Elementals","Control Water","Dimension Door","Divination","Evard's Black Tentacles","Fabricate","Fire Shield","Greater Invisibility","Hallucinatory Terrain","Ice Storm","Locate Creature","Otiluke's Resilient Sphere","Phantasmal Killer","Polymorph","Stone Shape","Stoneskin","Wall of Fire"],
    5:["Animate Objects","Bigby's Hand","Cloudkill","Cone of Cold","Conjure Elemental","Contact Other Plane","Creation","Dominate Person","Dream","Geas","Hold Monster","Legend Lore","Mislead","Modify Memory","Passwall","Planar Binding","Scrying","Seeming","Telekinesis","Teleportation Circle","Wall of Force","Wall of Stone"],
  },
};

// ── Spellcasting config per class ─────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
// SPELL_MECHANICS_DB — per-spell conditional trigger definitions (2024 rules)
//
// Each entry:
//   damageDice: { count, sides }  — what the base roll looks like
//   triggers: [{ id, label, check(rolls,sides), notify(rolls,caster) }]
//     check(rolls, sides) → bool  — fires addSystem message if true
//     notify(rolls, caster) → string — the message injected into chat
// ═══════════════════════════════════════════════════════════════════════════
const SPELL_MECHANICS_DB = {

  "Chromatic Orb": {
    // 2024: if any two damage dice show the same number, the orb bounces to
    // a second target within 30 ft and deals half the rolled damage.
    damageDice: { count: 3, sides: 8 },
    upcasting: { extraDicePerSlot: 1, sides: 8, startSlot: 2 },
    triggers: [
      {
        id: "chromatic_bounce",
        label: "Chromatic Orb — Bounce",
        check: (rolls) => {
          const seen = new Set();
          return rolls.some(r => { if (seen.has(r)) return true; seen.add(r); return false; });
        },
        notify: (rolls, caster, total) =>
          `⚡ CHROMATIC ORB BOUNCE! ${caster} rolled [${rolls.join(",")}] — matching dice trigger the 2024 bounce rule. ` +
          `The orb ricochets to a SECOND target within 30 ft dealing ${Math.floor(total/2)} damage (half the rolled amount, same type). ` +
          `DM: resolve the bounce attack now, before the next initiative turn.`,
      },
    ],
  },

  "Scorching Ray": {
    // Three separate rays — each is its own attack roll. Tracked narratively.
    damageDice: { count: 2, sides: 6 },
    triggers: [
      {
        id: "scorching_ray_crit",
        label: "Scorching Ray — Critical Hit",
        check: (rolls) => rolls.some(r => r === 6),  // max die = potential crit signal
        notify: (rolls, caster, total) =>
          `🔥 SCORCHING RAY: ${caster} rolled [${rolls.join(",")}] on one ray. ` +
          `Remember: each of the 3 rays requires its own separate attack roll. ` +
          `DM: confirm remaining rays and apply damage per hit ray.`,
      },
    ],
  },

  "Magic Missile": {
    // Each dart is guaranteed — 3 darts at level 1. 2024: still auto-hit.
    damageDice: { count: 1, sides: 4 },
    triggers: [
      {
        id: "magic_missile_all_same",
        label: "Magic Missile — Uniform Damage",
        check: (rolls) => rolls.length >= 3 && new Set(rolls).size === 1,
        notify: (rolls, caster, total) =>
          `✨ MAGIC MISSILE: All ${rolls.length} darts dealt [${rolls[0]}] damage — every dart hits automatically. ` +
          `Total guaranteed damage: ${total}. DM: apply to target(s) of ${caster}'s choice, no attack roll needed.`,
      },
    ],
  },

  "Chaos Bolt": {
    // 2024: if both d8s show the same number, the bolt leaps to another target.
    damageDice: { count: 2, sides: 8 },
    upcasting: { extraDicePerSlot: 1, sides: 6, startSlot: 2 },
    triggers: [
      {
        id: "chaos_bolt_leap",
        label: "Chaos Bolt — Chaotic Leap",
        check: (rolls) => rolls.length >= 2 && rolls[0] === rolls[1],
        notify: (rolls, caster, total) =>
          `🌀 CHAOS BOLT LEAPS! ${caster} rolled [${rolls.join(",")}] — matching d8s trigger a leap to a second target within 30 ft. ` +
          `DM: immediately make a new Chaos Bolt attack roll against a second target before the next turn. ` +
          `The leap can chain again if that roll also matches.`,
      },
    ],
  },

  "Toll the Dead": {
    // More damage if target is already hurt
    damageDice: { count: 1, sides: 8 },
    triggers: [
      {
        id: "toll_injured",
        label: "Toll the Dead — Injured Target",
        check: (rolls) => rolls[0] >= 6,
        notify: (rolls, caster, total) =>
          `🔔 TOLL THE DEAD: ${caster} rolled ${rolls[0]}. ` +
          `Reminder — if the target is missing ANY hit points, this deals d12 damage instead of d8. ` +
          `DM: confirm whether target is injured and reroll as d12 if so.`,
      },
    ],
  },

  "Thunderwave": {
    // Save-based: half on success. Remind DM to push targets.
    damageDice: { count: 2, sides: 8 },
    triggers: [
      {
        id: "thunderwave_push",
        label: "Thunderwave — Push Effect",
        check: (rolls) => rolls.reduce((a,b)=>a+b,0) >= 10,
        notify: (rolls, caster, total) =>
          `💨 THUNDERWAVE: ${caster} rolled [${rolls.join(",")}]=${total} thunder damage (CON save for half). ` +
          `2024 Rule: Creatures that FAIL the save are pushed 10 ft away AND deafened until start of your next turn. ` +
          `DM: apply push and deafen to all failed saves before next initiative.`,
      },
    ],
  },

  "Dissonant Whispers": {
    // Target must use reaction to move away
    damageDice: { count: 3, sides: 6 },
    triggers: [
      {
        id: "dissonant_flee",
        label: "Dissonant Whispers — Flee Reaction",
        check: () => true,  // always remind on cast
        notify: (rolls, caster, total) =>
          `👂 DISSONANT WHISPERS: ${caster} dealt [${rolls.join(",")}]=${total} psychic damage (WIS save). ` +
          `2024 Rule: On a FAILED save the target MUST use its Reaction to immediately move its speed directly away. ` +
          `Opportunity attacks against this movement are possible. DM: resolve flee movement now.`,
      },
    ],
  },

};

// ── evaluateSpellTriggers ────────────────────────────────────────────────────
// Called after any spell damage roll. Checks all triggers for the spell and
// injects system messages for any that fire.
const evaluateSpellTriggers = (spellName, rolls, total, casterName, addSysMsg) => {
  const mech = SPELL_MECHANICS_DB[spellName];
  if (!mech || !Array.isArray(rolls) || rolls.length === 0) return;
  mech.triggers.forEach(trigger => {
    try {
      if (trigger.check(rolls, mech.damageDice?.sides || 6)) {
        addSysMsg(trigger.notify(rolls, casterName, total));
      }
    } catch(_) {}
  });
};


// ═══════════════════════════════════════════════════════════════════════════
// ENEMY_DATABASE — 2024 monster stat blocks for the Tactics Engine
// Each entry: { name, cr, hp:{dice,sides,mod}, ac, speed, initiative(dex mod),
//   stats, actions[], passiveTraits[], color, xp }
// hp is rolled fresh per spawn via: Σ(dice × sides) + mod
// ═══════════════════════════════════════════════════════════════════════════
const ENEMY_DATABASE = {

  goblin: {
    name:"Goblin", cr:"1/4", color:"#16a34a", xp:50,
    hp:{ dice:2, sides:6, mod:2 },   // avg 9
    ac:15, speed:30, initiativeMod:2,
    stats:{ str:8, dex:14, con:10, int:10, wis:8, cha:8 },
    actions:[
      { name:"Scimitar", type:"Melee Weapon Attack", bonus:4, reach:"5 ft", targets:1, damage:"1d6+2", damageType:"Slashing" },
      { name:"Shortbow",  type:"Ranged Weapon Attack", bonus:4, range:"80/320 ft", targets:1, damage:"1d6+2", damageType:"Piercing" },
    ],
    bonusActions:[
      { name:"Nimble Escape", desc:"Disengage or Hide as a Bonus Action." },
    ],
    passiveTraits:[ { name:"Darkvision 60 ft" } ],
    tacticHints:"Goblins use Nimble Escape to hide after attacking. They prefer ranged attacks and gang up on wounded targets. If badly hurt (Bloodied), they flee.",
  },

  goblin_boss: {
    name:"Goblin Boss", cr:1, color:"#15803d", xp:200,
    hp:{ dice:6, sides:6, mod:6 },   // avg 27
    ac:17, speed:30, initiativeMod:2,
    stats:{ str:10, dex:14, con:10, int:10, wis:8, cha:10 },
    actions:[
      { name:"Multiattack", type:"Special", desc:"Two Scimitar attacks." },
      { name:"Scimitar", type:"Melee Weapon Attack", bonus:4, reach:"5 ft", targets:1, damage:"1d6+2", damageType:"Slashing" },
      { name:"Javelin",   type:"Ranged Weapon Attack", bonus:2, range:"30/120 ft", targets:1, damage:"1d6", damageType:"Piercing" },
    ],
    reactions:[
      { name:"Redirect Attack", desc:"When a creature misses the Boss, redirect that miss to another goblin within 5 ft." },
    ],
    passiveTraits:[ { name:"Darkvision 60 ft" } ],
    tacticHints:"Boss stays back, uses Redirect Attack to protect itself. Commands goblins to focus on the most dangerous PC.",
  },

  bandit: {
    name:"Bandit", cr:"1/8", color:"#b45309", xp:25,
    hp:{ dice:2, sides:8, mod:2 },   // avg 11
    ac:12, speed:30, initiativeMod:1,
    stats:{ str:11, dex:12, con:12, int:10, wis:10, cha:10 },
    actions:[
      { name:"Scimitar",  type:"Melee Weapon Attack", bonus:3, reach:"5 ft", targets:1, damage:"1d6+1", damageType:"Slashing" },
      { name:"Hand Crossbow", type:"Ranged Weapon Attack", bonus:3, range:"30/120 ft", targets:1, damage:"1d6+1", damageType:"Piercing" },
    ],
    passiveTraits:[],
    tacticHints:"Bandits fight in groups, focusing the same target. They surrender if reduced below half their number.",
  },

  bandit_captain: {
    name:"Bandit Captain", cr:2, color:"#92400e", xp:450,
    hp:{ dice:10, sides:8, mod:30 },  // avg 65
    ac:15, speed:30, initiativeMod:3,
    stats:{ str:15, dex:16, con:14, int:14, wis:11, cha:14 },
    actions:[
      { name:"Multiattack", type:"Special", desc:"Three attacks: two with Scimitar, one with Dagger." },
      { name:"Scimitar", type:"Melee Weapon Attack", bonus:5, reach:"5 ft", targets:1, damage:"1d6+3", damageType:"Slashing" },
      { name:"Dagger",   type:"Melee/Ranged Attack", bonus:5, reach:"5 ft / 20/60 ft", targets:1, damage:"1d4+3", damageType:"Piercing" },
    ],
    reactions:[
      { name:"Parry", desc:"Add +3 to AC against one melee attack that would hit (must see attacker)." },
    ],
    passiveTraits:[],
    tacticHints:"Captain targets spellcasters first. Uses Parry against the highest-attack-bonus player. Commands bandits to flank.",
  },

  guard: {
    name:"Guard", cr:"1/8", color:"#334155", xp:25,
    hp:{ dice:2, sides:8, mod:2 },   // avg 11
    ac:16, speed:30, initiativeMod:1,
    stats:{ str:13, dex:12, con:12, int:10, wis:11, cha:10 },
    actions:[
      { name:"Spear", type:"Melee/Ranged Attack", bonus:3, reach:"5 ft / 20/60 ft", targets:1, damage:"1d6+1", damageType:"Piercing" },
    ],
    passiveTraits:[],
    tacticHints:"Guards call for reinforcements on the first turn. They protect each other and focus on the nearest threat.",
  },

  merrow: {
    name:"Merrow", cr:2, color:"#1d4ed8", xp:450,
    hp:{ dice:9, sides:10, mod:27 },  // avg 77
    ac:13, speed:"10 ft, swim 40 ft", initiativeMod:0,
    stats:{ str:18, dex:10, con:15, int:8, wis:10, cha:9 },
    actions:[
      { name:"Multiattack", type:"Special", desc:"Two attacks: one Claws, one Harpoon." },
      { name:"Claws", type:"Melee Weapon Attack", bonus:6, reach:"5 ft", targets:1, damage:"2d6+4", damageType:"Slashing" },
      { name:"Harpoon", type:"Melee/Ranged Attack", bonus:6, reach:"5 ft / 20/60 ft", targets:1, damage:"2d6+4", damageType:"Piercing",
        special:"On hit: DC 14 STR save or the target is dragged 20 ft toward the Merrow." },
    ],
    passiveTraits:[{ name:"Amphibious" }, { name:"Darkvision 60 ft" }],
    tacticHints:"Merrow leads with Harpoon to drag casters into melee. Targets armoured fighters last. If on a ship, tries to drag prey overboard.",
  },

  zombie: {
    name:"Zombie", cr:"1/4", color:"#4d7c0f", xp:50,
    hp:{ dice:3, sides:8, mod:9 },   // avg 22
    ac:8, speed:20, initiativeMod:-2,
    stats:{ str:13, dex:6, con:16, int:3, wis:6, cha:5 },
    actions:[
      { name:"Slam", type:"Melee Weapon Attack", bonus:3, reach:"5 ft", targets:1, damage:"1d6+1", damageType:"Bludgeoning" },
    ],
    passiveTraits:[
      { name:"Undead Fortitude", desc:"When reduced to 0 HP by non-radiant, non-critical damage: DC 5+damage CON save or die. On success, drop to 1 HP instead." },
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"Zombies mindlessly pursue the nearest creature. No tactics — they never retreat. Use Undead Fortitude frequently.",
  },

  skeleton: {
    name:"Skeleton", cr:"1/4", color:"#d4d4aa", xp:50,
    hp:{ dice:2, sides:8, mod:4 },   // avg 13
    ac:13, speed:30, initiativeMod:2,
    stats:{ str:10, dex:14, con:15, int:6, wis:8, cha:5 },
    actions:[
      { name:"Shortsword", type:"Melee Weapon Attack", bonus:4, reach:"5 ft", targets:1, damage:"1d6+2", damageType:"Piercing" },
      { name:"Shortbow",   type:"Ranged Weapon Attack", bonus:4, range:"80/320 ft", targets:1, damage:"1d6+2", damageType:"Piercing" },
    ],
    passiveTraits:[
      { name:"Vulnerability: Bludgeoning" },
      { name:"Immunity: Poison, Exhaustion" },
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"Skeletons prefer ranged attacks. They advance methodically and never retreat. Target lightly-armoured PCs.",
  },

  // ── STORMWRECK ISLE MONSTERS ─────────────────────────────────────────────

  kobold: {
    name:"Kobold", cr:"1/8", color:"#dc2626", xp:25,
    hp:{ dice:2, sides:6, mod:-2 },  // avg 5
    ac:12, speed:30, initiativeMod:2,
    stats:{ str:7, dex:15, con:9, int:8, wis:7, cha:8 },
    actions:[
      { name:"Dagger",    type:"Melee Weapon Attack",  bonus:4, reach:"5 ft",       targets:1, damage:"1d4+2", damageType:"Piercing" },
      { name:"Sling",     type:"Ranged Weapon Attack",  bonus:4, range:"30/120 ft",  targets:1, damage:"1d4+2", damageType:"Bludgeoning" },
    ],
    passiveTraits:[
      { name:"Pack Tactics", desc:"Advantage on attack rolls when an ally is adjacent to the target and not incapacitated." },
      { name:"Sunlight Sensitivity", desc:"Disadvantage on attack rolls and Perception checks in direct sunlight." },
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"Kobolds swarm to trigger Pack Tactics — they never fight alone. They avoid sunlight and prefer ambushes in caves. Bloodied kobolds scatter and hide immediately.",
  },

  winged_kobold: {
    name:"Winged Kobold", cr:"1/4", color:"#ef4444", xp:50,
    hp:{ dice:3, sides:6, mod:-3 },  // avg 7
    ac:13, speed:"30 ft, fly 30 ft", initiativeMod:2,
    stats:{ str:7, dex:16, con:9, int:8, wis:7, cha:8 },
    actions:[
      { name:"Dagger",     type:"Melee Weapon Attack",  bonus:5, reach:"5 ft",      targets:1, damage:"1d4+3", damageType:"Piercing" },
      { name:"Drop Rock",  type:"Ranged Weapon Attack",  bonus:5, range:"30/60 ft", targets:1, damage:"2d6",   damageType:"Bludgeoning",
        special:"Can only be used while flying. Drops a rock on a target directly below." },
    ],
    passiveTraits:[
      { name:"Pack Tactics", desc:"Advantage on attack rolls when an ally is adjacent to the target and not incapacitated." },
      { name:"Sunlight Sensitivity", desc:"Disadvantage on attack rolls and Perception checks in direct sunlight." },
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"Winged kobolds fly over the party and drop rocks from above, staying out of melee reach. They dive-bomb isolated or prone targets. Land only to flee.",
  },

  fume_drake: {
    name:"Fume Drake", cr:1, color:"#7c3aed", xp:200,
    hp:{ dice:4, sides:8, mod:4 },   // avg 22
    ac:13, speed:"20 ft, fly 30 ft", initiativeMod:2,
    stats:{ str:10, dex:14, con:13, int:5, wis:8, cha:10 },
    actions:[
      { name:"Bite",         type:"Melee Weapon Attack", bonus:4, reach:"5 ft",      targets:1, damage:"1d6+2", damageType:"Piercing" },
      { name:"Noxious Breath", type:"Special — Recharge 5–6",
        desc:"Exhales a 15-ft cone of poisonous gas. Each creature in the area must succeed on a DC 11 CON save or take 2d6 Poison damage and be Poisoned until the end of their next turn. Half damage on a success.",
        damage:"2d6", damageType:"Poison", special:"DC 11 CON save; Poisoned on fail. Recharge 5–6." },
    ],
    passiveTraits:[
      { name:"Poison Immunity", desc:"Immune to Poison damage and the Poisoned condition." },
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"The Fume Drake opens with Noxious Breath to Poison as many PCs as possible. It hovers at 10 ft to stay out of melee while waiting for Breath to recharge. It retreats if below half HP.",
  },

  owlbear: {
    name:"Owlbear", cr:3, color:"#92400e", xp:700,
    hp:{ dice:7, sides:10, mod:21 }, // avg 59
    ac:13, speed:40, initiativeMod:1,
    stats:{ str:20, dex:12, con:17, int:3, wis:12, cha:7 },
    actions:[
      { name:"Multiattack", type:"Special", desc:"Two attacks: one Beak, one Claws." },
      { name:"Beak",   type:"Melee Weapon Attack", bonus:7, reach:"5 ft", targets:1, damage:"1d10+5", damageType:"Piercing" },
      { name:"Claws",  type:"Melee Weapon Attack", bonus:7, reach:"5 ft", targets:1, damage:"2d8+5",  damageType:"Slashing" },
    ],
    passiveTraits:[
      { name:"Keen Sight and Smell", desc:"Advantage on Perception checks that rely on sight or smell." },
    ],
    tacticHints:"The owlbear charges the nearest creature and uses Multiattack relentlessly. It focuses on one target until it drops. It fights to the death protecting its lair — it will never flee.",
  },

  stirge: {
    name:"Stirge", cr:"1/8", color:"#be185d", xp:25,
    hp:{ dice:1, sides:4, mod:0 },   // avg 2
    ac:14, speed:"10 ft, fly 40 ft", initiativeMod:3,
    stats:{ str:4, dex:16, con:11, int:2, wis:8, cha:6 },
    actions:[
      { name:"Blood Drain", type:"Melee Weapon Attack", bonus:5, reach:"5 ft", targets:1, damage:"1d4+3", damageType:"Piercing",
        special:"On hit, stirge attaches. While attached: no attack rolls, but deals 1d4+3 automatic damage at start of each of stirge's turns. Stirge detaches if it drains 10 HP total or target dies. Creature or adjacent ally can use Action to detach it (DC 8 STR check)." },
    ],
    passiveTraits:[],
    tacticHints:"Stirges fly in and attach to the nearest creature. Once latched on, they drain every turn automatically. Priority target: lowest-AC PC. Multiple stirges can attach to the same target simultaneously.",
  },

  myconid_sprout: {
    name:"Myconid Sprout", cr:"0", color:"#65a30d", xp:10,
    hp:{ dice:2, sides:6, mod:0 },   // avg 7
    ac:10, speed:10, initiativeMod:0,
    stats:{ str:8, dex:10, con:10, int:8, wis:11, cha:5 },
    actions:[
      { name:"Fist",  type:"Melee Weapon Attack", bonus:1, reach:"5 ft", targets:1, damage:"1d4-1", damageType:"Bludgeoning" },
      { name:"Distress Spores", type:"Special",
        desc:"When the sprout takes damage, it ejects spores in a 10-ft radius. Any myconid within range is alerted and moves toward the sprout on its next turn." },
    ],
    passiveTraits:[
      { name:"Rapport Spores", desc:"Can communicate telepathically with creatures within 30 ft that have inhaled its spores (non-combat; spores last 1 hour)." },
    ],
    tacticHints:"Sprouts are weak and mostly flee. If cornered, they release Distress Spores to summon adult myconids. They never attack first — only in self-defence.",
  },

  myconid_adult: {
    name:"Myconid Adult", cr:"1/2", color:"#4d7c0f", xp:100,
    hp:{ dice:4, sides:8, mod:4 },   // avg 22
    ac:12, speed:20, initiativeMod:0,
    stats:{ str:10, dex:10, con:12, int:11, wis:13, cha:7 },
    actions:[
      { name:"Fist",  type:"Melee Weapon Attack", bonus:2, reach:"5 ft", targets:1, damage:"1d6",   damageType:"Bludgeoning" },
      { name:"Hallucination Spores", type:"Special — Recharge after Short Rest",
        desc:"Ejects spores at one creature within 5 ft. DC 11 CON save or the target is Poisoned for 1 minute (Stunned while Poisoned). Repeat save at end of each turn." },
      { name:"Pacifying Spores", type:"Special — Recharge 5–6",
        desc:"Ejects spores at one creature within 5 ft. DC 11 CON save or Stunned for 1 minute. Repeat save at end of each turn." },
    ],
    passiveTraits:[
      { name:"Distress Spores", desc:"When the adult takes damage, it ejects spores in a 10-ft radius alerting all myconids within range." },
      { name:"Rapport Spores", desc:"Can communicate telepathically with creatures within 30 ft that have inhaled its spores." },
    ],
    tacticHints:"Adults use Hallucination Spores on melee fighters first, then Pacifying Spores on spellcasters. They protect sprouts. They prefer to incapacitate rather than kill, and may try to parley if combat turns against them.",
  },

  violet_fungus: {
    name:"Violet Fungus", cr:"1/4", color:"#7e22ce", xp:50,
    hp:{ dice:4, sides:8, mod:0 },   // avg 18
    ac:5, speed:5, initiativeMod:-4,
    stats:{ str:3, dex:1, con:10, int:1, wis:3, cha:1 },
    actions:[
      { name:"Multiattack", type:"Special", desc:"Up to 1d4 Rotting Touch attacks (roll each separately) targeting creatures within 10 ft." },
      { name:"Rotting Touch", type:"Melee Weapon Attack", bonus:2, reach:"10 ft", targets:1, damage:"1d8", damageType:"Necrotic" },
    ],
    passiveTraits:[
      { name:"False Appearance", desc:"While motionless, indistinguishable from an ordinary mushroom. DC 15 Perception to spot it before it attacks." },
      { name:"Immunity: Blinded, Deafened, Frightened, Prone, Condition Immunities" },
    ],
    tacticHints:"Violet Fungi are immobile ambush predators. They lurk among other mushrooms (False Appearance) and attack any creature that steps within 10 ft. They lash out with up to 4 Rotting Touch attacks per turn. Cannot retreat.",
  },

  fire_snake: {
    name:"Fire Snake", cr:1, color:"#ea580c", xp:200,
    hp:{ dice:5, sides:6, mod:5 },   // avg 22
    ac:14, speed:"30 ft, swim 30 ft", initiativeMod:2,
    stats:{ str:12, dex:14, con:12, int:3, wis:10, cha:6 },
    actions:[
      { name:"Multiattack", type:"Special", desc:"One Bite and one Constrict attack." },
      { name:"Bite",       type:"Melee Weapon Attack", bonus:3, reach:"5 ft",  targets:1, damage:"1d4+1", damageType:"Piercing",
        special:"Plus 1d4 Fire damage on hit." },
      { name:"Constrict",  type:"Melee Weapon Attack", bonus:3, reach:"5 ft",  targets:1, damage:"1d6+1", damageType:"Bludgeoning",
        special:"Target is Grappled (escape DC 11). While Grappled, target is Restrained and takes 1d4 Fire damage at start of each of its turns." },
    ],
    passiveTraits:[
      { name:"Fire Immunity", desc:"Immune to Fire damage." },
      { name:"Heated Body", desc:"A creature that touches the fire snake or hits it with a melee attack takes 1d4 Fire damage." },
    ],
    tacticHints:"Fire Snakes lead with Constrict to Restrain a front-liner, then Bite the same target each turn for bonus fire damage. They are drawn to cold or water and attack cold-resistance enemies last.",
  },

  spore_servant_octopus: {
    name:"Spore Servant Octopus", cr:"1/4", color:"#0e7490", xp:50,
    hp:{ dice:3, sides:8, mod:0 },   // avg 13
    ac:12, speed:"5 ft, swim 30 ft", initiativeMod:2,
    stats:{ str:4, dex:15, con:11, int:0, wis:10, cha:4 },
    actions:[
      { name:"Tentacles", type:"Melee Weapon Attack", bonus:4, reach:"5 ft", targets:1, damage:"1d6+2", damageType:"Bludgeoning",
        special:"Target is Grappled (escape DC 10). Until Grapple ends, target is Restrained." },
      { name:"Ink Cloud (Recharge 6)", type:"Special",
        desc:"Underwater only. Ejects ink in a 5-ft radius — that area is heavily obscured for 1 minute. The octopus can then Dash as a Bonus Action." },
    ],
    passiveTraits:[
      { name:"Myconid Thrall", desc:"Animated by myconid spores. Mindless — cannot be Frightened, Charmed, or made to retreat. Fights until destroyed." },
      { name:"Underwater Camouflage", desc:"Advantage on Stealth checks made underwater." },
    ],
    tacticHints:"Spore Servant Octopuses grapple the lowest-STR PC and drag them underwater if possible. Mindless — they never retreat. If multiple octopuses are present, each latches onto a different target.",
  },

  harpy: {
    name:"Harpy", cr:1, color:"#be185d", xp:200,
    hp:{ dice:7, sides:8, mod:7 },   // avg 38
    ac:11, speed:"20 ft, fly 40 ft", initiativeMod:1,
    stats:{ str:12, dex:13, con:12, int:7, wis:10, cha:13 },
    actions:[
      { name:"Multiattack", type:"Special", desc:"Two attacks: one Claws, one Club." },
      { name:"Claws", type:"Melee Weapon Attack", bonus:3, reach:"5 ft", targets:1, damage:"2d4+1", damageType:"Slashing" },
      { name:"Club",  type:"Melee Weapon Attack", bonus:3, reach:"5 ft", targets:1, damage:"1d4+1", damageType:"Bludgeoning" },
      { name:"Luring Song", type:"Special — Ongoing",
        desc:"All humanoids within 300 ft that can hear the harpy must succeed on a DC 11 WIS save or be Charmed. Charmed creatures are Incapacitated and move toward the harpy each turn. New save each turn if they take damage. Effect ends if the harpy stops singing or the creature succeeds the save." },
    ],
    passiveTraits:[
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"The harpy opens combat with Luring Song to incapacitate the highest-WIS PC (usually the cleric). It swoops in to Multiattack Charmed targets. If two or more PCs resist the song, it focuses on hit-and-run tactics from the air.",
  },

  ghoul: {
    name:"Ghoul", cr:1, color:"#6b7280", xp:200,
    hp:{ dice:5, sides:8, mod:0 },   // avg 22
    ac:12, speed:30, initiativeMod:2,
    stats:{ str:13, dex:15, con:10, int:7, wis:10, cha:6 },
    actions:[
      { name:"Bite",   type:"Melee Weapon Attack", bonus:2, reach:"5 ft", targets:1, damage:"2d6+2", damageType:"Piercing",
        special:"Target must succeed DC 10 CON save or be Paralyzed for 1 minute (not Elves/Undead). Repeat save at end of each turn." },
      { name:"Claws",  type:"Melee Weapon Attack", bonus:4, reach:"5 ft", targets:1, damage:"2d4+2", damageType:"Slashing",
        special:"Same Paralysis save as Bite (DC 10 CON). Paralysis ends if the target takes damage." },
    ],
    passiveTraits:[
      { name:"Undead Nature", desc:"Doesn't require air, food, drink, or sleep. Immune to Poison and Exhaustion." },
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"Ghouls use Claws first to attempt Paralysis — a Paralyzed target grants advantage on all attacks. Once a PC is Paralyzed, every ghoul in the encounter converges on that target. Never retreat; fight until destroyed.",
  },

  blue_dragon_wyrmling: {
    name:"Blue Dragon Wyrmling", cr:3, color:"#2563eb", xp:700,
    hp:{ dice:8, sides:8, mod:16 },  // avg 52
    ac:17, speed:"30 ft, burrow 15 ft, fly 60 ft", initiativeMod:0,
    stats:{ str:17, dex:10, con:15, int:12, wis:11, cha:15 },
    actions:[
      { name:"Bite", type:"Melee Weapon Attack", bonus:5, reach:"5 ft", targets:1, damage:"1d10+3", damageType:"Piercing",
        special:"Plus 1d6 Lightning damage on hit." },
      { name:"Lightning Breath", type:"Special — Recharge 5–6",
        desc:"30-ft line, 5 ft wide. Each creature in the line makes a DC 12 DEX save, taking 4d10 Lightning damage on a failed save, or half as much on a success.",
        damage:"4d10", damageType:"Lightning", special:"DC 12 DEX save; half on success. 30-ft line. Recharge 5–6." },
    ],
    passiveTraits:[
      { name:"Lightning Immunity", desc:"Immune to Lightning damage." },
      { name:"Blindsight 10 ft / Darkvision 60 ft" },
    ],
    tacticHints:"Sparkrender opens at range with Lightning Breath, targeting as many PCs as possible in the line. It flies to stay at 30 ft range, forcing the party to spread out. It uses Bite on anyone who closes to melee. It will use Breath the instant it recharges. If Bloodied, it becomes frenzied and reckless.",
  },

  bronze_dragon_wyrmling: {
    name:"Bronze Dragon Wyrmling", cr:2, color:"#b45309", xp:450,
    hp:{ dice:5, sides:8, mod:10 },  // avg 32
    ac:17, speed:"30 ft, fly 60 ft, swim 30 ft", initiativeMod:0,
    stats:{ str:15, dex:10, con:14, int:14, wis:11, cha:15 },
    actions:[
      { name:"Bite", type:"Melee Weapon Attack", bonus:4, reach:"5 ft", targets:1, damage:"1d10+2", damageType:"Piercing",
        special:"Plus 1d6 Lightning damage on hit." },
      { name:"Lightning Breath", type:"Special — Recharge 5–6",
        desc:"40-ft line, 5 ft wide. Each creature makes a DC 12 DEX save, taking 3d10 Lightning damage on a failed save, or half on a success.",
        damage:"3d10", damageType:"Lightning", special:"DC 12 DEX save; half on success. 40-ft line. Recharge 5–6." },
      { name:"Repulsion Breath", type:"Special — Recharge 5–6",
        desc:"Exhales repulsion gas in a 30-ft cone. Each creature must succeed on a DC 12 STR save or be pushed 30 ft away from the dragon and knocked Prone.",
        special:"DC 12 STR save or pushed 30 ft and knocked Prone. 30-ft cone." },
    ],
    passiveTraits:[
      { name:"Lightning Immunity", desc:"Immune to Lightning damage." },
      { name:"Amphibious", desc:"Can breathe air and water." },
      { name:"Blindsight 10 ft / Darkvision 60 ft" },
    ],
    tacticHints:"Bronze wyrmlings are clever and may parley before fighting. In combat: uses Lightning Breath to hit clusters, Repulsion Breath to push melee fighters away from allies. It fights near water to use its swim speed as an escape route. Unlike blue wyrmlings, a bronze dragon may disengage if Bloodied — it fights for survival, not glory.",
  },

  // ── COASTAL & ISLAND BEASTS ─────────────────────────────────────────────

  giant_crab: {
    name:"Giant Crab", cr:"1/8", color:"#dc2626", xp:25,
    hp:{ dice:2, sides:8, mod:2 },   // avg 13
    ac:15, speed:"30 ft, swim 30 ft", initiativeMod:1,
    stats:{ str:13, dex:15, con:11, int:1, wis:9, cha:3 },
    actions:[
      { name:"Claw", type:"Melee Weapon Attack", bonus:3, reach:"5 ft", targets:1, damage:"1d6+1", damageType:"Bludgeoning",
        special:"Target is Grappled (escape DC 11). Giant crab has two claws and can grapple two creatures simultaneously. A grappled creature is Restrained." },
    ],
    passiveTraits:[
      { name:"Amphibious", desc:"Can breathe air and water." },
      { name:"Blindsight 30 ft" },
    ],
    tacticHints:"Giant crabs use both claws to Grapple and Restrain two separate targets. Once a target is Restrained, the free claw attacks it each turn with advantage. They retreat into water if Bloodied.",
  },

  reef_shark: {
    name:"Reef Shark", cr:"1/2", color:"#0e7490", xp:100,
    hp:{ dice:6, sides:8, mod:6 },   // avg 33
    ac:12, speed:"swim 40 ft", initiativeMod:1,
    stats:{ str:14, dex:13, con:13, int:1, wis:10, cha:4 },
    actions:[
      { name:"Bite", type:"Melee Weapon Attack", bonus:4, reach:"5 ft", targets:1, damage:"1d8+2", damageType:"Piercing" },
    ],
    passiveTraits:[
      { name:"Pack Tactics", desc:"Advantage on attack rolls when an ally is adjacent to the target and not incapacitated." },
      { name:"Water Breathing", desc:"Can breathe only underwater." },
      { name:"Blindsight 30 ft" },
    ],
    tacticHints:"Reef sharks hunt in groups of 3–4 using Pack Tactics. They circle a Bloodied target and converge. Out of water they are helpless — use terrain to force them out if possible.",
  },

  blood_hawk: {
    name:"Blood Hawk", cr:"1/8", color:"#b91c1c", xp:25,
    hp:{ dice:2, sides:6, mod:0 },   // avg 7
    ac:12, speed:"10 ft, fly 60 ft", initiativeMod:2,
    stats:{ str:6, dex:14, con:10, int:3, wis:14, cha:5 },
    actions:[
      { name:"Beak", type:"Melee Weapon Attack", bonus:4, reach:"5 ft", targets:1, damage:"1d4+2", damageType:"Piercing" },
    ],
    passiveTraits:[
      { name:"Keen Sight", desc:"Advantage on Perception checks relying on sight." },
      { name:"Pack Tactics", desc:"Advantage on attack rolls when an ally is adjacent to the target and not incapacitated." },
    ],
    tacticHints:"Blood Hawks dive-bomb from above and use Pack Tactics. They target the smallest or most isolated PC. A flock of 4–6 can seriously harass a low-level party. They break off the attack if two or more of the flock are killed.",
  },

  poisonous_snake: {
    name:"Poisonous Snake", cr:"1/8", color:"#16a34a", xp:25,
    hp:{ dice:1, sides:4, mod:1 },   // avg 3
    ac:13, speed:"30 ft, swim 30 ft", initiativeMod:3,
    stats:{ str:2, dex:16, con:11, int:1, wis:10, cha:3 },
    actions:[
      { name:"Bite", type:"Melee Weapon Attack", bonus:5, reach:"5 ft", targets:1, damage:"1", damageType:"Piercing",
        special:"Target must succeed on a DC 10 CON save or take 2d4 Poison damage. On a success, takes no Poison damage." },
    ],
    passiveTraits:[
      { name:"Blindsight 10 ft" },
    ],
    tacticHints:"Poisonous snakes are ambush predators hiding in tall grass, rubble, or debris. They strike once and slither away. Multiple snakes in an encounter can force many CON saves quickly, burning Concentration.",
  },

  // ── ADVANCED UNDEAD ──────────────────────────────────────────────────────

  ghast: {
    name:"Ghast", cr:2, color:"#4b5563", xp:450,
    hp:{ dice:8, sides:8, mod:8 },   // avg 36+8 = avg 44
    ac:13, speed:30, initiativeMod:2,
    stats:{ str:16, dex:17, con:10, int:11, wis:10, cha:8 },
    actions:[
      { name:"Bite",   type:"Melee Weapon Attack", bonus:3, reach:"5 ft", targets:1, damage:"2d8+3", damageType:"Piercing",
        special:"DC 10 CON save or Poisoned for 1 minute (Stunned while Poisoned). Repeat save at end of each turn." },
      { name:"Claws",  type:"Melee Weapon Attack", bonus:5, reach:"5 ft", targets:1, damage:"2d6+3", damageType:"Slashing",
        special:"DC 10 CON save (not Elves/Undead) or Paralyzed for 1 minute. Repeat save at end of each turn." },
    ],
    passiveTraits:[
      { name:"Stench", desc:"Any creature that starts its turn within 5 ft must succeed on a DC 10 CON save or be Poisoned until the start of its next turn. Elves and Undead are immune." },
      { name:"Turning Defiance", desc:"Advantage on saving throws against effects that Turn Undead." },
      { name:"Undead Nature", desc:"Immune to Poison damage, Exhaustion, and the Poisoned condition (except Stench)." },
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"Ghasts are more dangerous than ghouls. Lead with Claws to Paralyze — every adjacent ghast then attacks the Paralyzed PC with advantage. Their Stench punishes anyone who stays adjacent. Bring torches: use fire to deny their close-quarters advantage.",
  },

  specter: {
    name:"Specter", cr:1, color:"#6366f1", xp:200,
    hp:{ dice:5, sides:8, mod:0 },   // avg 22
    ac:12, speed:"0 ft, fly 50 ft (hover)", initiativeMod:2,
    stats:{ str:1, dex:14, con:11, int:10, wis:10, cha:11 },
    actions:[
      { name:"Life Drain", type:"Melee Spell Attack", bonus:4, reach:"5 ft", targets:1, damage:"3d6", damageType:"Necrotic",
        special:"Target must succeed on a DC 10 CON save or its HP maximum is reduced by the damage dealt until a Long Rest. Target dies if this reduces its HP maximum to 0." },
    ],
    passiveTraits:[
      { name:"Incorporeal Movement", desc:"Can move through creatures and objects as if difficult terrain. Takes 1d10 Force damage if it ends its turn inside a solid object." },
      { name:"Sunlight Sensitivity", desc:"Disadvantage on attack rolls and Perception checks in direct sunlight." },
      { name:"Resistance: Acid, Fire, Lightning, Thunder; Bludgeoning/Piercing/Slashing from non-magical weapons" },
      { name:"Immunity: Cold, Necrotic, Poison; Charmed, Exhaustion, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained, Unconscious" },
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"Specters fly through walls and surfaces to ambush from unexpected angles. They target low-CON creatures (sorcerers, rogues) to reduce HP maximum — a steady HP max drain creates mounting dread. They retreat through solid walls when Bloodied, forcing pursuit through difficult terrain.",
  },

  wight: {
    name:"Wight", cr:3, color:"#374151", xp:700,
    hp:{ dice:8, sides:8, mod:16 },  // avg 52
    ac:14, speed:30, initiativeMod:2,
    stats:{ str:15, dex:14, con:16, int:10, wis:13, cha:15 },
    actions:[
      { name:"Multiattack", type:"Special", desc:"Two attacks: one Longsword (or two Longbow), one Life Drain." },
      { name:"Longsword",  type:"Melee Weapon Attack", bonus:4, reach:"5 ft",      targets:1, damage:"1d8+2",  damageType:"Slashing" },
      { name:"Longbow",    type:"Ranged Weapon Attack", bonus:4, range:"150/600 ft",targets:1, damage:"1d8+2", damageType:"Piercing" },
      { name:"Life Drain", type:"Melee Weapon Attack",  bonus:4, reach:"5 ft",     targets:1, damage:"1d6+2", damageType:"Necrotic",
        special:"DC 13 CON save or HP maximum is reduced by the damage until a Long Rest. Any humanoid killed by Life Drain rises as a Zombie under the wight's control after 24 hours." },
    ],
    passiveTraits:[
      { name:"Sunlight Sensitivity", desc:"Disadvantage on attack rolls and Perception checks in direct sunlight." },
      { name:"Resistance: Necrotic; Bludgeoning/Piercing/Slashing from non-magical, non-silvered weapons" },
      { name:"Immunity: Poison, Exhaustion, Poisoned" },
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"Wights use Multiattack to combine a weapon strike with Life Drain every turn. They target the highest-CON character to reduce HP maximum over time. A wight that kills a PC creates a Zombie — spawn a zombie combatant if this happens. Stay out of sunlight at all costs.",
  },

  // ── HUMANOIDS ────────────────────────────────────────────────────────────

  cultist: {
    name:"Cultist", cr:"1/8", color:"#7c2d12", xp:25,
    hp:{ dice:2, sides:8, mod:2 },   // avg 11
    ac:12, speed:30, initiativeMod:1,
    stats:{ str:11, dex:12, con:10, int:10, wis:11, cha:10 },
    actions:[
      { name:"Scimitar", type:"Melee Weapon Attack", bonus:3, reach:"5 ft", targets:1, damage:"1d6+1", damageType:"Slashing" },
    ],
    passiveTraits:[
      { name:"Dark Devotion", desc:"Advantage on saving throws against being Charmed or Frightened." },
    ],
    tacticHints:"Cultists are fanatically obedient. They form a tight mob around their Cult Fanatic leader and rush the nearest enemy. They fight to the death unless their leader falls — then they route immediately. Prioritise killing the Cult Fanatic to collapse the group.",
  },

  cult_fanatic: {
    name:"Cult Fanatic", cr:2, color:"#991b1b", xp:450,
    hp:{ dice:6, sides:8, mod:6 },   // avg 33
    ac:13, speed:30, initiativeMod:2,
    stats:{ str:11, dex:14, con:12, int:10, wis:13, cha:14 },
    actions:[
      { name:"Multiattack", type:"Special", desc:"Two Dagger attacks." },
      { name:"Dagger",      type:"Melee/Ranged Attack", bonus:4, reach:"5 ft / 20/60 ft", targets:1, damage:"1d4+2", damageType:"Piercing" },
      { name:"Inflict Wounds (1st)",  type:"Melee Spell Attack", bonus:3, reach:"5 ft", targets:1, damage:"3d10", damageType:"Necrotic", special:"Spell slot expended on cast." },
      { name:"Hold Person (2nd)",     type:"Special", desc:"DC 11 WIS save or Paralyzed for 1 minute. Concentration. 2 targets within 30 ft.", damage:"—", damageType:"Control", special:"Concentration. 60 ft range." },
      { name:"Spiritual Weapon (2nd)",type:"Bonus Action Spell", desc:"Summons spectral weapon within 60 ft; deals 1d8+WIS Radiant on hit as a Bonus Action each turn. Not concentration.", damage:"1d8+1", damageType:"Force" },
    ],
    bonusActions:[
      { name:"Spiritual Weapon Attack", desc:"Attack with an active Spiritual Weapon (if cast this or previous turn). Bonus Action." },
    ],
    passiveTraits:[
      { name:"Dark Devotion", desc:"Advantage on saving throws against being Charmed or Frightened." },
      { name:"Spellcasting (WIS, DC 11, +3)", desc:"Spells: Inflict Wounds, Command, Hold Person, Spiritual Weapon, Blindness/Deafness." },
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"The Cult Fanatic casts Hold Person on the highest-AC fighter on Turn 1 (advantage on all attacks vs Paralyzed), then Spiritual Weapon as a Bonus Action. Each subsequent turn: Multiattack + Spiritual Weapon bonus action. If heavily wounded, it casts Blindness on a healer. Cultists rally around it — killing it first causes a morale collapse.",
  },

  // ── NAMED NPC — RUNARA (ADULT BRONZE DRAGON) ─────────────────────────────

  adult_bronze_dragon: {
    name:"Runara (Adult Bronze Dragon)", cr:15, color:"#d97706", xp:13000,
    hp:{ dice:17, sides:12, mod:85 }, // avg 195
    ac:19, speed:"40 ft, fly 80 ft, swim 40 ft", initiativeMod:2,
    stats:{ str:25, dex:11, con:23, int:20, wis:17, cha:19 },
    actions:[
      { name:"Multiattack", type:"Special", desc:"Three attacks: one Bite and two Claws. Can replace Bite with one use of Frightful Presence." },
      { name:"Bite",   type:"Melee Weapon Attack", bonus:13, reach:"10 ft", targets:1, damage:"2d10+7", damageType:"Piercing",
        special:"Plus 4d6 Lightning damage on hit." },
      { name:"Claw",   type:"Melee Weapon Attack", bonus:13, reach:"5 ft",  targets:1, damage:"2d6+7",  damageType:"Slashing" },
      { name:"Tail",   type:"Melee Weapon Attack", bonus:13, reach:"15 ft", targets:1, damage:"2d8+7",  damageType:"Bludgeoning" },
      { name:"Lightning Breath", type:"Special — Recharge 5–6",
        desc:"120-ft line, 10 ft wide. DC 19 DEX save — 12d10 Lightning damage on a fail, half on a success.",
        damage:"12d10", damageType:"Lightning", special:"DC 19 DEX save, half on success. 120-ft line. Recharge 5–6." },
      { name:"Repulsion Breath", type:"Special — Recharge 5–6",
        desc:"30-ft cone of repulsion gas. DC 19 STR save or pushed 60 ft and knocked Prone.",
        special:"DC 19 STR save or pushed 60 ft and Prone. 30-ft cone." },
      { name:"Frightful Presence", type:"Special",
        desc:"Each creature of Runara's choice within 120 ft must succeed on a DC 18 WIS save or be Frightened for 1 minute. Repeat save at end of each turn. Immune after success for 24 hours." },
      { name:"Change Shape", type:"Special",
        desc:"Runara polymorphs into a Humanoid or Beast of CR ≤ 15, or back into her dragon form. Statistics unchanged except for size and speed." },
    ],
    reactions:[
      { name:"Wing Attack (Costs 2 Actions)", desc:"Each creature within 10 ft must succeed on a DC 21 DEX save or take 2d6+7 Bludgeoning damage and be knocked Prone. Runara can then fly up to half her fly speed." },
    ],
    passiveTraits:[
      { name:"Legendary Resistance (3/Day)", desc:"If Runara fails a saving throw, she can choose to succeed instead." },
      { name:"Amphibious", desc:"Can breathe air and water." },
      { name:"Lightning Immunity", desc:"Immune to Lightning damage." },
      { name:"Blindsight 60 ft / Darkvision 120 ft" },
    ],
    tacticHints:"⚠️ WARNING: Runara is Elder Runara — an ancient ally in human form. If the party attacks her, she will transform and use Legendary Resistance to resist the first three saves. She opens with Frightful Presence to Frighten the party, then withdraws to range and uses Lightning Breath. She will NOT fight to the death — at Bloodied she offers parley, reminding the party who she is. This combat is unwinnable at Level 1.",
  },

  // ── BOSS: THE SCALED QUEEN (TWO-HEADED MERROW) ───────────────────────────

  scaled_queen: {
    name:"The Scaled Queen", cr:5, color:"#4f46e5", xp:1800,
    hp:{ dice:10, sides:10, mod:30 }, // avg 85
    ac:15, speed:"15 ft, swim 40 ft", initiativeMod:1,
    stats:{ str:22, dex:12, con:16, int:10, wis:11, cha:14 },
    actions:[
      { name:"Multiattack", type:"Special", desc:"Three attacks: two Bites (one per head) and one Harpoon or Claw." },
      { name:"Bite (Head 1)", type:"Melee Weapon Attack", bonus:8, reach:"5 ft", targets:1, damage:"2d8+6", damageType:"Piercing",
        special:"Demonic ichor — target must succeed on a DC 14 CON save or be Poisoned until the end of its next turn." },
      { name:"Bite (Head 2)", type:"Melee Weapon Attack", bonus:8, reach:"5 ft", targets:1, damage:"2d8+6", damageType:"Piercing",
        special:"Can target the same or a different creature from Head 1." },
      { name:"Harpoon",     type:"Ranged Weapon Attack", bonus:8, range:"20/60 ft", targets:1, damage:"2d6+6", damageType:"Piercing",
        special:"On hit: Contested STR check (Scaled Queen +8 vs. target's STR check). If the Queen wins, target is dragged up to 20 ft toward her." },
      { name:"Claw",        type:"Melee Weapon Attack", bonus:8, reach:"10 ft", targets:1, damage:"2d6+6", damageType:"Slashing" },
      { name:"Demogorgon's Roar", type:"Special — Recharge 5–6",
        desc:"The Queen screams with both heads simultaneously. All creatures within 30 ft must succeed on a DC 14 WIS save or be Frightened until the end of their next turn and use their movement to move away from her on their turn.",
        damage:"—", damageType:"Fear", special:"DC 14 WIS save or Frightened, forced movement. 30-ft radius. Recharge 5–6." },
    ],
    bonusActions:[
      { name:"Reel", desc:"Pulls one creature Grappled by her Harpoon up to 20 ft toward her as a Bonus Action." },
    ],
    reactions:[
      { name:"Second-Head Snap", desc:"When a creature within 5 ft hits the Scaled Queen with a melee attack, her second head lashes out. She makes one Bite attack against that attacker as a Reaction (uses one of her Multiattack bites, not an extra one)." },
    ],
    passiveTraits:[
      { name:"Two Heads", desc:"Advantage on saving throws against being Blinded, Charmed, Deafened, Frightened, Stunned, or knocked Unconscious. Also, the Queen cannot be Surprised while both heads are aware." },
      { name:"Amphibious", desc:"Can breathe air and water." },
      { name:"Demonic Blessing (Demogorgon)", desc:"Magic resistance — advantage on saving throws against spells and other magical effects." },
      { name:"Legendary Will", desc:"If reduced to 0 HP in water, make a DC 15 CON save. On success, drop to 1 HP instead (once per encounter)." },
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"Phase 1 (Full HP→Bloodied): The Scaled Queen opens with Harpoon to drag the biggest armoured threat into melee range, then unleashes both Bites. She uses Demogorgon's Roar when 3+ PCs cluster within 30 ft. Her Second-Head Snap punishes anyone who closes to melee recklessly. Phase 2 (Bloodied): She becomes frenzied — all three Multiattack attacks go to the same target (trying to drop one PC). She uses Reel every Bonus Action to keep a dragged target adjacent. She fights to the death; the Scaled Queen will NEVER surrender or retreat.",
  },
};

// ── EXTENDED BESTIARY ─────────────────────────────────────────────────────────
// Appended separately so the base database stays clean.
Object.assign(ENEMY_DATABASE, {

  orc: {
    name:"Orc", cr:"1/2", color:"#16a34a", xp:100,
    hp:{ dice:2, sides:8, mod:6 },   // avg 15
    ac:13, speed:30, initiativeMod:1,
    stats:{ str:16, dex:12, con:16, int:7, wis:11, cha:10 },
    actions:[
      { name:"Greataxe", type:"Melee Weapon Attack", bonus:5, reach:"5 ft", targets:1, damage:"1d12+3", damageType:"Slashing" },
      { name:"Handaxe",  type:"Ranged Weapon Attack", bonus:5, range:"20/60 ft", targets:1, damage:"1d6+3", damageType:"Slashing" },
    ],
    bonusActions:[
      { name:"Aggressive", desc:"Move up to speed toward a hostile creature (Bonus Action)." },
    ],
    passiveTraits:[{ name:"Darkvision 60 ft" }],
    tacticHints:"Orcs use Aggressive every turn to close distance. They charge the weakest-looking PC. They fight until half their number fall, then rage harder.",
  },

  hobgoblin: {
    name:"Hobgoblin", cr:"1/2", color:"#b91c1c", xp:100,
    hp:{ dice:2, sides:8, mod:2 },   // avg 11
    ac:18, speed:30, initiativeMod:1,
    stats:{ str:13, dex:12, con:12, int:10, wis:10, cha:9 },
    actions:[
      { name:"Longsword", type:"Melee Weapon Attack", bonus:3, reach:"5 ft", targets:1, damage:"1d8+1", damageType:"Slashing" },
      { name:"Longbow",   type:"Ranged Weapon Attack", bonus:3, range:"150/600 ft", targets:1, damage:"1d8+1", damageType:"Piercing" },
    ],
    passiveTraits:[
      { name:"Martial Advantage", desc:"Once per turn, deal extra 2d6 damage on a hit if an ally is within 5 ft of the target and not incapacitated." },
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"Hobgoblins fight in disciplined formations to trigger Martial Advantage. They focus fire on one target at a time. Longbow units stay at range; swordsmen hold a defensive line. They retreat in good order — never rout.",
  },

  ogre: {
    name:"Ogre", cr:2, color:"#78350f", xp:450,
    hp:{ dice:7, sides:10, mod:21 }, // avg 59
    ac:11, speed:40, initiativeMod:-1,
    stats:{ str:19, dex:8, con:16, int:5, wis:7, cha:7 },
    actions:[
      { name:"Greatclub", type:"Melee Weapon Attack", bonus:6, reach:"5 ft", targets:1, damage:"2d8+4", damageType:"Bludgeoning" },
      { name:"Javelin",   type:"Ranged Weapon Attack", bonus:6, range:"30/120 ft", targets:1, damage:"2d6+4", damageType:"Piercing" },
    ],
    passiveTraits:[{ name:"Darkvision 60 ft" }],
    tacticHints:"The ogre hurls a javelin on round 1, then charges with Greatclub. It picks the smallest target and pounds it flat. Stupid but dangerous — it ignores flanking and tactics entirely.",
  },

  troll: {
    name:"Troll", cr:5, color:"#166534", xp:1800,
    hp:{ dice:8, sides:10, mod:40 }, // avg 84
    ac:15, speed:30, initiativeMod:1,
    stats:{ str:18, dex:13, con:20, int:7, wis:9, cha:7 },
    actions:[
      { name:"Multiattack", type:"Special", desc:"One Bite and two Claw attacks." },
      { name:"Bite",  type:"Melee Weapon Attack", bonus:7, reach:"5 ft", targets:1, damage:"1d6+4", damageType:"Piercing" },
      { name:"Claws", type:"Melee Weapon Attack", bonus:7, reach:"5 ft", targets:1, damage:"2d6+4", damageType:"Slashing" },
    ],
    passiveTraits:[
      { name:"Regeneration", desc:"The troll regains 10 HP at the start of each turn. If it takes Acid or Fire damage, this trait doesn't function until start of its next turn. It only dies if it starts its turn at 0 HP and regeneration is suppressed." },
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"CRITICAL: Trolls regenerate 10 HP per round unless hit by acid or fire. Always note when a PC deals fire/acid — suppress regeneration that turn. Trolls are reckless: Multiattack every turn, focus on the nearest target. They never retreat.",
  },

  gelatinous_cube: {
    name:"Gelatinous Cube", cr:2, color:"#a3e635", xp:450,
    hp:{ dice:8, sides:10, mod:16 }, // avg 60
    ac:6, speed:15, initiativeMod:-5,
    stats:{ str:14, dex:1, con:20, int:1, wis:6, cha:1 },
    actions:[
      { name:"Pseudopod", type:"Melee Weapon Attack", bonus:4, reach:"5 ft", targets:1, damage:"3d6", damageType:"Acid" },
      { name:"Engulf", type:"Special",
        desc:"Moves up to speed and can enter Large-or-smaller creature spaces. Each creature in its path: DC 12 DEX save. On fail: Engulfed (Restrained, Blinded, 0 speed; takes 6d6 acid at start of each Cube turn; can escape DC 12 STR check). On success: pushed 5 ft and not Engulfed." },
    ],
    passiveTraits:[
      { name:"Transparent", desc:"DC 15 Perception to notice while still. Effectively invisible until it moves or attacks." },
      { name:"Immunity: Blinded, Charmed, Deafened, Exhaustion, Frightened, Prone" },
      { name:"Ooze Cube", desc:"Occupies its entire 10-ft cube space. Can move through openings at least 1 ft wide." },
    ],
    tacticHints:"The Cube is nearly invisible until attacked. It moves silently to engulf isolated PCs. Engulfed characters are blinded and helpless — free melee attacks vs them are irrelevant since the Cube can only Pseudopod one target per turn anyway. Fire and cold both damage it normally.",
  },

  mind_flayer: {
    name:"Mind Flayer", cr:7, color:"#7c3aed", xp:2900,
    hp:{ dice:13, sides:8, mod:26 }, // avg 71
    ac:15, speed:30, initiativeMod:2,
    stats:{ str:11, dex:12, con:12, int:19, wis:17, cha:17 },
    actions:[
      { name:"Mind Blast", type:"Special — Recharge 5–6",
        desc:"Psychic energy in a 60-ft cone. Each creature must succeed on a DC 15 INT save or take 4d8+4 Psychic damage and be Stunned for 1 minute. Repeat save at end of each turn.",
        damage:"4d8+4", damageType:"Psychic", special:"DC 15 INT save or Stunned 1 min. 60-ft cone. Recharge 5–6." },
      { name:"Tentacles", type:"Melee Weapon Attack", bonus:7, reach:"5 ft", targets:1, damage:"2d10+4", damageType:"Psychic",
        special:"Target is Grappled (escape DC 15) and Stunned until Grapple ends." },
      { name:"Extract Brain", type:"Special",
        desc:"Melee — can only target a creature already Grappled by tentacles. +7 to hit. On hit: 10d10 Piercing damage. Target dies if reduced to 0 HP this way (brain extracted).", },
      { name:"Dominate Monster", type:"Special", desc:"DC 15 WIS save or Charmed/dominated for 1 hour. Concentration. Can only target one creature at a time." },
    ],
    passiveTraits:[
      { name:"Magic Resistance", desc:"Advantage on saving throws against spells and other magical effects." },
      { name:"Telepathy 120 ft" },
      { name:"Darkvision 120 ft" },
      { name:"Spellcasting (INT, DC 15)", desc:"Detect Thoughts, Levitate, Plane Shift (self only), Dominate Monster." },
    ],
    tacticHints:"Mind Flayers open with Mind Blast to stun as many PCs as possible in the cone. They Dominate the highest-damage PC and turn them against allies. Once a PC is Stunned and adjacent, they use Tentacles to Grapple-stun and eventually Extract Brain. They will not die protecting the Elder Brain — if losing, they retreat by Levitating up and teleporting.",
  },

  vampire_spawn: {
    name:"Vampire Spawn", cr:5, color:"#7f1d1d", xp:1800,
    hp:{ dice:11, sides:8, mod:22 }, // avg 71
    ac:15, speed:30, initiativeMod:4,
    stats:{ str:16, dex:18, con:18, int:11, wis:10, cha:12 },
    actions:[
      { name:"Multiattack", type:"Special", desc:"Two Claws attacks, or one Claw and one Bite." },
      { name:"Claws", type:"Melee Weapon Attack", bonus:6, reach:"5 ft", targets:1, damage:"2d4+3", damageType:"Slashing",
        special:"Target is Grappled (escape DC 13). While Grappled, target is Restrained." },
      { name:"Bite",  type:"Melee Weapon Attack", bonus:6, reach:"5 ft", targets:1, damage:"1d6+3", damageType:"Piercing",
        special:"Only vs. willing, Incapacitated, or Grappled creatures. Plus 3d6 Necrotic. Target's HP max reduced by necrotic taken until Long Rest. Vampire regains HP equal to necrotic dealt." },
    ],
    passiveTraits:[
      { name:"Regeneration", desc:"Regains 10 HP at start of turn if at 1+ HP. Suppressed if takes Radiant or is in Running Water." },
      { name:"Resistance: Necrotic; Bludgeoning/Piercing/Slashing from non-magical weapons" },
      { name:"Spider Climb / Mist Form limitation", desc:"Can climb difficult surfaces. Destroyed by Sunlight (10 radiant/turn in sunlight, 3 CON saves at dawn or destroyed)." },
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"Vampire Spawn Claw to Grapple first, then Bite the Restrained target for life-drain each subsequent turn. They regenerate 10 HP/turn — only Radiant damage suppresses it. They avoid sunlight and running water at all costs. If Bloodied, they use Mist Form to flee through cracks.",
  },

  young_red_dragon: {
    name:"Young Red Dragon", cr:10, color:"#dc2626", xp:5900,
    hp:{ dice:17, sides:10, mod:85 }, // avg 178
    ac:18, speed:"40 ft, climb 40 ft, fly 80 ft", initiativeMod:0,
    stats:{ str:23, dex:10, con:21, int:14, wis:11, cha:19 },
    actions:[
      { name:"Multiattack", type:"Special", desc:"One Bite and two Claws." },
      { name:"Bite",  type:"Melee Weapon Attack", bonus:10, reach:"10 ft", targets:1, damage:"2d10+6", damageType:"Piercing",
        special:"Plus 2d6 Fire damage on hit." },
      { name:"Claw",  type:"Melee Weapon Attack", bonus:10, reach:"5 ft",  targets:1, damage:"2d6+6", damageType:"Slashing" },
      { name:"Fire Breath", type:"Special — Recharge 5–6",
        desc:"30-ft cone. DC 18 DEX save — 16d6 Fire damage on fail, half on success.",
        damage:"16d6", damageType:"Fire", special:"DC 18 DEX save, half on success. 30-ft cone. Recharge 5–6." },
    ],
    passiveTraits:[
      { name:"Fire Immunity", desc:"Immune to Fire damage." },
      { name:"Blindsight 30 ft / Darkvision 120 ft" },
    ],
    tacticHints:"The dragon opens at range with Fire Breath aiming to catch 3+ PCs. It stays airborne at 30+ ft between breaths to deny melee. When Breath recharges, it swoops in to use it again. It uses Multiattack only when it can't position safely for Breath. Bloodied: enraged, reckless, uses Breath the instant it recharges even at bad angles.",
  },

  werewolf: {
    name:"Werewolf", cr:3, color:"#92400e", xp:700,
    hp:{ dice:9, sides:8, mod:18 }, // avg 58
    ac:11, speed:30, initiativeMod:1,
    stats:{ str:15, dex:13, con:14, int:10, wis:11, cha:10 },
    actions:[
      { name:"Multiattack (Hybrid form)", type:"Special", desc:"One Bite and one Claws attack." },
      { name:"Bite",  type:"Melee Weapon Attack", bonus:4, reach:"5 ft", targets:1, damage:"1d8+2", damageType:"Piercing",
        special:"Humanoid target: DC 12 CON save or cursed with Lycanthropy." },
      { name:"Claws", type:"Melee Weapon Attack", bonus:4, reach:"5 ft", targets:1, damage:"2d4+2", damageType:"Slashing" },
      { name:"Spear (Human form)", type:"Melee/Ranged Attack", bonus:4, reach:"5 ft / 20/60 ft", targets:1, damage:"1d6+2", damageType:"Piercing" },
    ],
    passiveTraits:[
      { name:"Shapechanger", desc:"Can use Bonus Action to polymorph between humanoid, wolf, and hybrid forms. Stats are the same." },
      { name:"Immunity: Bludgeoning/Piercing/Slashing from non-silvered, non-magical weapons" },
      { name:"Keen Hearing and Smell", desc:"Advantage on Perception checks using hearing or smell." },
    ],
    tacticHints:"Werewolves shift to hybrid form immediately and use Multiattack. They prioritize Biting lightly-armoured PCs to spread Lycanthropy. Only silvered or magical weapons bypass their damage immunity — non-magic weapons deal zero effective damage. They howl when Bloodied to call wolf allies.",
  },

  banshee: {
    name:"Banshee", cr:4, color:"#a78bfa", xp:1100,
    hp:{ dice:13, sides:8, mod:0 }, // avg 58
    ac:12, speed:"0 ft, fly 40 ft (hover)", initiativeMod:2,
    stats:{ str:1, dex:14, con:10, int:12, wis:11, cha:17 },
    actions:[
      { name:"Corrupting Touch", type:"Melee Spell Attack", bonus:4, reach:"5 ft", targets:1, damage:"3d6", damageType:"Necrotic" },
      { name:"Horrifying Visage", type:"Special",
        desc:"Each non-undead creature within 60 ft that can see the banshee: DC 13 WIS save or Frightened for 1 minute. If save fails by 5+, creature also ages 1d4×10 years. Effect ends if the creature leaves sight." },
      { name:"Wail", type:"Special — 1/Day",
        desc:"Each non-undead creature within 30 ft that can hear: DC 13 CON save or drop to 0 HP. On success, take 3d6+3 Psychic damage.",
        damage:"3d6+3", damageType:"Psychic", special:"DC 13 CON save or drop to 0 HP instantly. 1/day." },
    ],
    passiveTraits:[
      { name:"Incorporeal Movement", desc:"Can move through creatures and objects as if difficult terrain. Takes 1d10 force if it ends its turn inside an object." },
      { name:"Undead Nature", desc:"Immunity to Poison, Psychic. Resistance to Acid, Fire, Lightning, Thunder; non-magic weapon damage." },
      { name:"Detect Life", desc:"Senses living creatures within 5 miles (can't be blocked by barriers)." },
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"The Banshee opens with Horrifying Visage to Frighten — Frightened PCs have disadvantage on checks and can't approach. Its Wail (1/day) can instantly drop an entire party. Save it until 3+ PCs are within 30 ft. Corrupting Touch is its only reliable damage. It cannot enter a home uninvited.",
  },

  knight: {
    name:"Knight", cr:3, color:"#1e40af", xp:700,
    hp:{ dice:8, sides:8, mod:16 }, // avg 52
    ac:18, speed:30, initiativeMod:0,
    stats:{ str:16, dex:11, con:14, int:11, wis:11, cha:15 },
    actions:[
      { name:"Multiattack", type:"Special", desc:"Two Greatsword attacks." },
      { name:"Greatsword", type:"Melee Weapon Attack", bonus:5, reach:"5 ft", targets:1, damage:"2d6+3", damageType:"Slashing" },
      { name:"Heavy Crossbow", type:"Ranged Weapon Attack", bonus:2, range:"100/400 ft", targets:1, damage:"1d10", damageType:"Piercing" },
    ],
    reactions:[
      { name:"Parry", desc:"+2 to AC against one melee attack that would hit (must see attacker and hold a melee weapon)." },
    ],
    passiveTraits:[
      { name:"Brave", desc:"Advantage on saving throws against the Frightened condition." },
    ],
    tacticHints:"Knights anchor the battleline and use Parry to prevent crits. They use Multiattack on the closest high-damage PC. If protecting an NPC, they interpose themselves between the party and their ward.",
  },

  mage: {
    name:"Mage", cr:6, color:"#6d28d9", xp:2300,
    hp:{ dice:9, sides:8, mod:9 }, // avg 40
    ac:12, speed:30, initiativeMod:2,
    stats:{ str:9, dex:14, con:11, int:17, wis:12, cha:11 },
    actions:[
      { name:"Dagger", type:"Melee/Ranged Attack", bonus:5, reach:"5 ft / 20/60 ft", targets:1, damage:"1d4+2", damageType:"Piercing" },
      { name:"Fireball (3rd)", type:"Special",
        desc:"DC 14 DEX save — 8d6 Fire damage on fail, half on success. 20-ft radius sphere, 150 ft range.",
        damage:"8d6", damageType:"Fire", special:"DC 14 DEX save, half on success. 20-ft radius. Range 150 ft." },
      { name:"Lightning Bolt (3rd)", type:"Special",
        desc:"DC 14 DEX save — 8d6 Lightning damage on fail, half on success. 100-ft line.",
        damage:"8d6", damageType:"Lightning", special:"DC 14 DEX save, half on success. 100-ft line." },
      { name:"Cone of Cold (5th)", type:"Special",
        desc:"DC 14 CON save — 8d8 Cold damage on fail, half on success. 60-ft cone.",
        damage:"8d8", damageType:"Cold", special:"DC 14 CON save, half on success. 60-ft cone." },
    ],
    passiveTraits:[
      { name:"Magic Resistance", desc:"Advantage on saving throws against spells and magical effects." },
      { name:"Spellcasting (INT DC 14, +6)", desc:"Spell slots: 1st×4, 2nd×3, 3rd×3, 4th×3, 5th×1. Spells: Shield, Misty Step, Fireball, Lightning Bolt, Counterspell, Fly, Cone of Cold." },
      { name:"Darkvision 60 ft" },
    ],
    tacticHints:"Mage uses Fireball on clustered PCs round 1. Counterspell any enemy concentration spell. Misty Step away if melee closes. Fly if available to deny ground-based PCs. Final option: Cone of Cold when cornered. They use Shield as a reaction whenever hit.",
  },

  sea_spawn: {
    name:"Sea Spawn", cr:1, color:"#0e7490", xp:200,
    hp:{ dice:4, sides:8, mod:4 }, // avg 22
    ac:11, speed:"20 ft, swim 30 ft", initiativeMod:0,
    stats:{ str:15, dex:8, con:15, int:6, wis:10, cha:8 },
    actions:[
      { name:"Multiattack", type:"Special", desc:"Two Unarmed Strikes and one Piscine Appendage." },
      { name:"Unarmed Strike", type:"Melee Weapon Attack", bonus:4, reach:"5 ft", targets:1, damage:"1d4+2", damageType:"Bludgeoning" },
      { name:"Piscine Appendage", type:"Melee Weapon Attack", bonus:4, reach:"10 ft", targets:1, damage:"1d6+2", damageType:"Varies",
        special:"Roll 1d3: 1 = Piercing (spine); 2 = Bludgeoning (tentacle, target Grappled escape DC 12); 3 = Poison (DC 12 CON or Poisoned 1 min)." },
    ],
    passiveTraits:[
      { name:"Amphibious", desc:"Can breathe air and water." },
      { name:"Resistance: Cold" },
    ],
    tacticHints:"Sea Spawn Multiattack with the hope of triggering a Grapple or Poison via Piscine Appendage. They pull Grappled victims toward water. They fight in groups — 3+ sea spawn on a single PC is a serious threat.",
  },

});

// Roll HP for a spawned monster from its dice formula
const rollMonsterHp = (entry) => {
  const rolls = Array.from({length: entry.hp.dice}, () => Math.ceil(Math.random() * entry.hp.sides));
  return Math.max(1, rolls.reduce((a,b)=>a+b,0) + (entry.hp.mod||0));
};

const SPELLCASTING_CONFIG={
  Bard:    {type:"known",   stat:"cha", known:(lv)=>[0,4,5,6,7,8,9,10,11,12,14][Math.min(lv,10)],       maxSlotLv:(lv)=>Math.min(9,Math.ceil(lv/2)),  cantrips:true},
  Cleric:  {type:"prepared",stat:"wis", prepared:(c,lv)=>lv+Math.floor((c.stats.wis-10)/2),              maxSlotLv:(lv)=>Math.min(9,Math.ceil(lv/2)),  cantrips:true},
  Druid:   {type:"prepared",stat:"wis", prepared:(c,lv)=>lv+Math.floor((c.stats.wis-10)/2),              maxSlotLv:(lv)=>Math.min(9,Math.ceil(lv/2)),  cantrips:true},
  Paladin: {type:"prepared",stat:"cha", prepared:(c,lv)=>Math.floor(lv/2)+Math.floor((c.stats.cha-10)/2),maxSlotLv:(lv)=>Math.min(5,Math.ceil(lv/4)),  cantrips:false},
  Ranger:  {type:"known",   stat:"wis", known:(lv)=>[0,0,2,3,3,4,4,5,5,6,6][Math.min(lv,10)],           maxSlotLv:(lv)=>Math.min(5,Math.ceil((lv-1)/4)+1),cantrips:false},
  Sorcerer:{type:"known",   stat:"cha", known:(lv)=>[0,2,3,4,5,6,7,8,9,10,11][Math.min(lv,10)],         maxSlotLv:(lv)=>Math.min(9,Math.ceil(lv/2)),  cantrips:true},
  Warlock: {type:"known",   stat:"cha", known:(lv)=>[0,2,3,4,5,6,7,8,9,10,10][Math.min(lv,10)],         maxSlotLv:(lv)=>Math.min(5,[0,1,1,2,2,3,3,4,4,5,5][Math.min(lv,10)]),cantrips:true},
  Wizard:  {type:"spellbook",stat:"int",learn:2,                                                          maxSlotLv:(lv)=>Math.min(9,Math.ceil(lv/2)),  cantrips:true},
};

// ── SPELL SLOTS TABLE ─────────────────────────────────────────────────
const SPELL_SLOTS_TABLE={
  full:{
    1:{1:2}, 2:{1:3}, 3:{1:4,2:2}, 4:{1:4,2:3}, 5:{1:4,2:3,3:2},
    6:{1:4,2:3,3:3}, 7:{1:4,2:3,3:3,4:1}, 8:{1:4,2:3,3:3,4:2},
    9:{1:4,2:3,3:3,4:3,5:1}, 10:{1:4,2:3,3:3,4:3,5:2},
  },
  half:{
    1:{}, 2:{1:2}, 3:{1:3}, 4:{1:3}, 5:{1:4,2:2}, 6:{1:4,2:2},
    7:{1:4,2:3}, 8:{1:4,2:3}, 9:{1:4,2:3,3:2}, 10:{1:4,2:3,3:2},
  },
  warlock:{
    1:{1:1}, 2:{1:2}, 3:{2:2}, 4:{2:2}, 5:{3:2}, 6:{3:2},
    7:{4:2}, 8:{4:2}, 9:{5:2}, 10:{5:2},
  },
};
const getSpellSlots=(cls,lv)=>{
  const capped=Math.min(lv,10);
  if(cls==="Warlock") return SPELL_SLOTS_TABLE.warlock[capped]||{};
  if(cls==="Paladin"||cls==="Ranger") return SPELL_SLOTS_TABLE.half[capped]||{};
  if(SPELL_DB[cls]) return SPELL_SLOTS_TABLE.full[capped]||{};
  return {};
};
const buildSpellsObj=(cls,lv,existing)=>{
  const slots=getSpellSlots(cls,lv);
  const slotsObj={};
  for(let l=1;l<=9;l++){
    const max=slots[l]||0;
    const prev=existing.slots?.[l];
    slotsObj[l]={max,used:max>0?(prev?.used||0):0};
  }
  const out={...existing,slots:slotsObj};
  for(let l=1;l<=9;l++){ if(!out["lvl"+l]) out["lvl"+l]=[]; }
  return out;
};

const normalizeSpell=(sp)=>typeof sp==="string"?{name:sp,type:"Spell",damage:null,desc:""}:(sp||{});

// Extracts AoE shape from a spell description, e.g. "20-foot radius" → "20ft Sphere",
// "15 ft cone" → "15ft Cone", "100-foot line" → "100ft Line", "10ft cube" → "10ft Cube"
const getSpellAoE=(sp)=>{
  const text=[(sp?.desc||""),(sp?.type||""),(sp?.special||"")].join(" ");
  const m=text.match(/(\d+)[- ]?(?:ft|foot)[- ]?(?:radius(?:\s+sphere)?|sphere|cone|line|cube|cylinder)/i);
  if(!m) return null;
  const size=m[1];
  const raw=m[0].toLowerCase();
  const shape=raw.includes("cone")?"Cone":raw.includes("line")?"Line":raw.includes("cube")?"Cube":raw.includes("cylinder")?"Cylinder":"Sphere";
  return `${size}ft ${shape}`;
};

// ═══════════════════════════════════════════════════════════════════════
// ACTION ECONOMY — 2024 D&D Rules
// Every action, bonus action, reaction, and free action is classified here.
// All UI categorization and resource deduction reads from this data.
// ═══════════════════════════════════════════════════════════════════════

// Canonical action type for every spell by name.
// "action" = standard Action, "bonus" = Bonus Action, "reaction" = Reaction,
// "free" = no action / part of another action, "ritual" = ritual only
const SPELL_ACTION_TYPES = {
  // ── Bonus Action spells ──────────────────────────────────────────
  "Healing Word":"bonus","Healing Word (Mass)":"bonus",
  "Spiritual Weapon":"bonus","Shillelagh":"bonus","Misty Step":"bonus",
  "Thunderous Smite":"bonus","Wrathful Smite":"bonus","Divine Smite":"bonus",
  "Branding Smite":"bonus","Blinding Smite":"bonus","Staggering Smite":"bonus",
  "Banishing Smite":"bonus","Wrathful Smite":"bonus","Swift Quiver":"bonus",
  "Flame Blade":"bonus","Magic Bonus Action":"bonus","Silvery Barbs":"bonus",
  "Hunter's Mark":"bonus","Hex":"bonus","Expeditious Retreat":"bonus",
  "Hail of Thorns":"bonus","Ensnaring Strike":"bonus","Thunderous Smite":"bonus",
  "Compelled Duel":"bonus","Armor of Agathys":"bonus","Sanctuary":"bonus",
  // ── Reaction spells ──────────────────────────────────────────────
  "Shield":"reaction","Shield of Faith":"reaction","Counterspell":"reaction",
  "Hellish Rebuke":"reaction","Feather Fall":"reaction","Absorb Elements":"reaction",
  "Silvery Barbs":"reaction","Gift of Alacrity":"reaction",
  // ── Ritual / no-action ──────────────────────────────────────────
  "Find Familiar":"ritual","Identify":"ritual","Detect Magic":"ritual",
  "Alarm":"ritual","Leomund's Tiny Hut":"ritual",
};

// Common generic actions in the 2024 PHB — classified by type
// ── Universal actions every creature can take (PHB 2024) ─────────────
const COMMON_ACTIONS = {
  action: [
    {id:"attack",   label:"Attack",    icon:"⚔️", desc:"Make one or more weapon attacks."},
    {id:"cast",     label:"Cast Spell",icon:"✨", desc:"Cast a spell with an Action casting time."},
    {id:"dash",     label:"Dash",      icon:"💨", desc:"Double your movement speed this turn."},
    {id:"disengage",label:"Disengage", icon:"↩️", desc:"Avoid opportunity attacks for the rest of your turn."},
    {id:"dodge",    label:"Dodge",     icon:"🛡", desc:"Attacks against you have disadvantage; DEX saves have advantage."},
    {id:"help",     label:"Help",      icon:"🤝", desc:"Grant an ally advantage on their next ability check or attack."},
    {id:"hide",     label:"Hide",      icon:"👁", desc:"Make a DEX (Stealth) check to become hidden."},
    {id:"influence",label:"Influence", icon:"🗣", desc:"Make a CHA or WIS check to sway a creature."},
    {id:"magic",    label:"Magic",     icon:"🔮", desc:"Activate a magic item or use a magical feature."},
    {id:"ready",    label:"Ready",     icon:"⏱", desc:"Prepare a reaction for a specified trigger."},
    {id:"search",   label:"Search",    icon:"🔍", desc:"Make a WIS (Perception) or INT (Investigation) check."},
    {id:"study",    label:"Study",     icon:"📖", desc:"Make an INT check using a skill to recall lore."},
    {id:"utilize",  label:"Utilize",   icon:"🔧", desc:"Use a nonmagical object."},
  ],
  bonus: [
    {id:"off_hand", label:"Off-Hand Attack", icon:"⚔️",
     desc:"When you Attack with a Light weapon, make one Light weapon attack with your off-hand (no ability mod to damage unless negative)."},
  ],
  reaction: [
    {id:"opportunity", label:"Opportunity Attack", icon:"⚔️",
     desc:"When a hostile creature within your reach moves out without Disengaging, make one melee weapon attack against it."},
  ],
};

// ════════════════════════════════════════════════════════════════════
// CLASS_ABILITY_ACTIONS — every active class ability keyed by id.
// unlock(char) → true/false — checked at render time against the
// character's class string, level integer, subclass string, and
// features/passiveEffects arrays.
// ════════════════════════════════════════════════════════════════════
const CLASS_ABILITY_ACTIONS = [
  // ── BARBARIAN ──────────────────────────────────────────────────
  {id:"rage",            label:"Rage",                icon:"😤", actionType:"bonus",
   desc:"Enter a Rage. Resistance to B/P/S damage, advantage on STR checks/saves, +2 rage damage. Lasts 1 min.",
   unlock:c=>c.class.includes("Barbarian")&&c.level>=1},
  {id:"reckless_atk",    label:"Reckless Attack",     icon:"⚔️", actionType:"action",
   desc:"Gain advantage on your first melee attack this turn; attacks against you also have advantage until your next turn.",
   unlock:c=>c.class.includes("Barbarian")&&c.level>=2},
  {id:"danger_sense",    label:"Danger Sense",        icon:"👁", actionType:"reaction",
   desc:"When you would fail a DEX save vs. a visible effect, use your Reaction to succeed instead. 1/Long Rest.",
   unlock:c=>c.class.includes("Barbarian")&&c.level>=2},
  // ── BARD ───────────────────────────────────────────────────────
  {id:"bardic_insp",     label:"Bardic Inspiration",  icon:"🎵", actionType:"bonus",
   desc:c=>`Grant a Bardic Inspiration d${c.level>=15?12:c.level>=10?10:c.level>=5?8:6} to one creature within 60 ft. Add it to any attack, check, or save.`,
   unlock:c=>c.class.includes("Bard")&&c.level>=1},
  {id:"countercharm",    label:"Countercharm",        icon:"🎶", actionType:"action",
   desc:"Performance gives all friendly creatures within 30 ft advantage on saves vs. Charm and Frighten until end of your next turn.",
   unlock:c=>c.class.includes("Bard")&&c.level>=6},
  // ── CLERIC ─────────────────────────────────────────────────────
  {id:"channel_div",     label:"Channel Divinity",    icon:"✝️", actionType:"action",
   desc:"Expend a Channel Divinity use to trigger a subclass effect. Recharges on Short Rest.",
   unlock:c=>c.class.includes("Cleric")&&c.level>=2},
  {id:"turn_undead",     label:"Turn Undead",         icon:"☀️", actionType:"action",
   desc:"Undead within 30 ft make a WIS save (DC = Spell Save DC) or are Turned for 1 minute.",
   unlock:c=>c.class.includes("Cleric")&&c.level>=2},
  {id:"divine_inter",    label:"Divine Intervention", icon:"🌟", actionType:"action",
   desc:"Call on your deity for aid. Roll d100; success if result ≤ your Cleric level. 7-day cooldown after success.",
   unlock:c=>c.class.includes("Cleric")&&c.level>=10},
  // ── DRUID ──────────────────────────────────────────────────────
  {id:"wild_shape",      label:"Wild Shape",          icon:"🐺", actionType:"bonus",
   desc:c=>`Transform into a Beast (max CR ${c.level>=8?"1":c.level>=4?"1/2":"1/4"}). 2 uses/Short Rest. Lasts ${Math.floor(c.level/2)} hours.`,
   unlock:c=>c.class.includes("Druid")&&c.level>=2},
  {id:"wild_shape_end",  label:"End Wild Shape",      icon:"🧍", actionType:"bonus",
   desc:"Revert to your normal form as a Bonus Action.",
   unlock:c=>c.class.includes("Druid")&&c.level>=2},
  // ── FIGHTER ────────────────────────────────────────────────────
  {id:"second_wind",     label:"Second Wind",         icon:"❤️", actionType:"bonus",
   desc:c=>`Regain 1d10 + ${c.level} HP. 2 uses/Short Rest.`,
   unlock:c=>c.class.includes("Fighter")&&c.level>=1},
  {id:"action_surge",    label:"Action Surge",        icon:"⚡", actionType:"free",
   desc:"Take one additional Action this turn. 1 use/Short Rest (2 at Lv17).",
   unlock:c=>c.class.includes("Fighter")&&c.level>=2},
  {id:"indomitable",     label:"Indomitable",         icon:"🛡", actionType:"reaction",
   desc:"Reroll a failed saving throw and use the new roll. 1/Long Rest (2 at Lv11, 3 at Lv17).",
   unlock:c=>c.class.includes("Fighter")&&c.level>=9},
  // ── MONK ───────────────────────────────────────────────────────
  {id:"flurry",          label:"Flurry of Blows",     icon:"👊", actionType:"bonus",
   desc:"After the Attack action, spend 1 Discipline Point to make two Unarmed Strikes.",
   unlock:c=>c.class.includes("Monk")&&c.level>=2},
  {id:"patient_def",     label:"Patient Defense",     icon:"🛡", actionType:"bonus",
   desc:"Spend 1 Discipline Point to take the Dodge action as a Bonus Action.",
   unlock:c=>c.class.includes("Monk")&&c.level>=2},
  {id:"step_wind",       label:"Step of the Wind",    icon:"💨", actionType:"bonus",
   desc:"Spend 1 Discipline Point to Dash or Disengage as a Bonus Action. Jump distance doubled.",
   unlock:c=>c.class.includes("Monk")&&c.level>=2},
  {id:"stunning_strike", label:"Stunning Strike",     icon:"⚡", actionType:"bonus",
   desc:"After hitting, spend 1 Discipline Point. Target makes CON save or is Stunned until end of your next turn.",
   unlock:c=>c.class.includes("Monk")&&c.level>=5},
  {id:"deflect_missiles",label:"Deflect Missiles",    icon:"🛡", actionType:"reaction",
   desc:"Reduce ranged weapon hit damage by 1d10 + DEX mod + Monk level. If reduced to 0, spend 1 DP to throw it back.",
   unlock:c=>c.class.includes("Monk")&&c.level>=3},
  {id:"slow_fall",       label:"Slow Fall",           icon:"🍃", actionType:"reaction",
   desc:"Reduce fall damage by 5 × your Monk level.",
   unlock:c=>c.class.includes("Monk")&&c.level>=4},
  // ── PALADIN ────────────────────────────────────────────────────
  {id:"lay_on_hands",    label:"Lay on Hands",        icon:"🙌", actionType:"action",
   desc:c=>`Restore HP from a pool of ${c.level*5}. Spend 5 HP to cure one disease or poison instead.`,
   unlock:c=>c.class.includes("Paladin")&&c.level>=1},
  {id:"divine_smite",    label:"Divine Smite",        icon:"✨", actionType:"bonus",
   desc:"After hitting with a melee weapon, expend a spell slot to deal extra Radiant damage (2d8 + 1d8/slot level above 1st).",
   unlock:c=>c.class.includes("Paladin")&&c.level>=1},
  {id:"channel_oath",    label:"Channel Oath",        icon:"✝️", actionType:"action",
   desc:"Expend a Channel Oath use to trigger your subclass's oath effect.",
   unlock:c=>c.class.includes("Paladin")&&c.level>=3},
  // ── RANGER ─────────────────────────────────────────────────────
  {id:"hunters_mark_cast",label:"Hunter's Mark",      icon:"🎯", actionType:"bonus",
   desc:"Cast Hunter's Mark (expends a spell slot). Marked target takes +1d6 weapon damage from your attacks.",
   unlock:c=>c.class.includes("Ranger")&&c.level>=1},
  // ── ROGUE ──────────────────────────────────────────────────────
  {id:"cunning_action",  label:"Cunning Action",      icon:"🐱", actionType:"bonus",
   desc:"Take the Dash, Disengage, or Hide action as a Bonus Action.",
   unlock:c=>c.class.includes("Rogue")&&c.level>=2},
  {id:"uncanny_dodge",   label:"Uncanny Dodge",       icon:"🌀", actionType:"reaction",
   desc:"When an attacker you can see hits you, halve the damage against you.",
   unlock:c=>c.class.includes("Rogue")&&c.level>=5},
  {id:"evasion_r",       label:"Evasion",             icon:"💨", actionType:"reaction",
   desc:"Succeed on a DEX save that deals half damage → take no damage instead.",
   unlock:c=>c.class.includes("Rogue")&&c.level>=7},
  // ── SORCERER ───────────────────────────────────────────────────
  {id:"flexible_cast",   label:"Flexible Casting",    icon:"🔮", actionType:"bonus",
   desc:"Convert Sorcery Points to spell slots or slots to Sorcery Points as a Bonus Action.",
   unlock:c=>c.class.includes("Sorcerer")&&c.level>=2},
  {id:"metamagic",       label:"Metamagic",           icon:"✨", actionType:"free",
   desc:"Modify a spell using Sorcery Points (Quickened, Twinned, Subtle, Empowered, etc.).",
   unlock:c=>c.class.includes("Sorcerer")&&c.level>=3},
  // ── WARLOCK ────────────────────────────────────────────────────
  {id:"misty_escape",    label:"Misty Escape",        icon:"🌫", actionType:"reaction",
   desc:"When you take damage, cast Misty Step as a Reaction (expends a spell slot). 1/Short Rest. [Archfey]",
   unlock:c=>c.class.includes("Warlock")&&c.level>=6&&(c.subclass||"").includes("Archfey")},
  {id:"dark_own_luck",   label:"Dark One's Own Luck", icon:"🎲", actionType:"free",
   desc:"Add 1d10 to an ability check or saving throw after rolling. 1/Short Rest. [Fiend]",
   unlock:c=>c.class.includes("Warlock")&&c.level>=6&&(c.subclass||"").includes("Fiend")},
  // ── WIZARD ─────────────────────────────────────────────────────
  {id:"arcane_recovery", label:"Arcane Recovery",     icon:"📚", actionType:"free",
   desc:c=>`Once/Long Rest during a Short Rest: recover spell slots totaling ≤ ${Math.ceil(c.level/2)} levels (max Lv5).`,
   unlock:c=>c.class.includes("Wizard")&&c.level>=1},
  // ── UNIVERSAL — spellcasters / feat-based ─────────────────────
  {id:"reaction_spell",  label:"Reaction Spell",      icon:"✨", actionType:"reaction",
   desc:"Cast a spell with a Reaction casting time (Shield, Counterspell, Hellish Rebuke, Silvery Barbs, etc.).",
   unlock:c=>hasSpellcasting(c)},
  {id:"reaction_attack_feat",label:"Reaction Attack", icon:"⚔️", actionType:"reaction",
   desc:"Make a melee attack as a Reaction (Sentinel feat, Riposte maneuver, etc.).",
   unlock:c=>(c.passiveEffects||[]).some(pe=>pe.type==="reaction_attack")},
  {id:"def_duelist_react",label:"Defensive Duelist",  icon:"🛡", actionType:"reaction",
   desc:"When hit by an attack while holding a Finesse weapon, add your Proficiency Bonus to AC against it.",
   unlock:c=>(c.features||[]).some(f=>f.name==="Defensive Duelist")},
  {id:"inspiring_leader_use",label:"Inspiring Leader",icon:"🗣", actionType:"action",
   desc:"10-minute speech: up to 6 creatures gain Temp HP = Level + CHA mod. 1/Short Rest.",
   unlock:c=>(c.features||[]).some(f=>f.name==="Inspiring Leader")},
  {id:"healer_kit_use",  label:"Healer's Kit",        icon:"⚕️", actionType:"action",
   desc:"Stabilize a creature and restore 1d6 + 4 + max_hit_die HP. Once per creature per rest.",
   unlock:c=>(c.features||[]).some(f=>f.name==="Healer")},
  {id:"lucky_use",       label:"Lucky",               icon:"🍀", actionType:"free",
   desc:"Spend 1 Luck Point before a d20 Test to roll an extra d20 and choose which to use. 3/Long Rest.",
   unlock:c=>(c.features||[]).some(f=>f.name==="Lucky")},
  {id:"chef_treats_use", label:"Chef's Treats",       icon:"🍖", actionType:"free",
   desc:"Distribute treats after a Long Rest. Each grants 2d4 Temporary HP when consumed.",
   unlock:c=>(c.features||[]).some(f=>f.name==="Chef")},
  // ── FEAT: Speedy ── Disengage as Bonus Action ─────────────────
  {id:"speedy_disengage",   label:"Disengage",              icon:"↩️", actionType:"bonus",
   desc:"Speedy feat: Take the Disengage action as a Bonus Action. Your movement avoids opportunity attacks this turn.",
   unlock:c=>(c.features||[]).some(f=>f.name==="Speedy")},

  // ── FEAT: Tavern Brawler ── Shove as Bonus Action after hit ───
  {id:"tavern_brawler_shove",label:"Shove",                 icon:"👊", actionType:"bonus",
   desc:"Tavern Brawler feat: After hitting a creature with an Unarmed Strike, Shove it as a Bonus Action — push 5 ft or knock Prone.",
   unlock:c=>(c.features||[]).some(f=>f.name==="Tavern Brawler")},

  // ── FEAT: Mage Slayer ── Reaction attack when adjacent caster ─
  {id:"mage_slayer_react",   label:"Mage Slayer",           icon:"⚡", actionType:"reaction",
   desc:"Mage Slayer feat: When a creature within 5 ft of you casts a spell, use your Reaction to make one melee weapon attack against it.",
   unlock:c=>(c.features||[]).some(f=>f.name==="Mage Slayer")},

  // ── FEAT: War Caster ── Reaction spell as opportunity attack ──
  {id:"war_caster_react",    label:"War Caster: Spell OA",  icon:"✨", actionType:"reaction",
   desc:"War Caster feat: When a creature provokes an Opportunity Attack from you, cast a spell targeting it instead of making a weapon attack.",
   unlock:c=>(c.features||[]).some(f=>f.name==="War Caster")},

  // ── FEAT: Great Weapon Master ── power-attack toggle ──────────
  {id:"gwm_power_atk",       label:"GWM: Power Attack",    icon:"💪", actionType:"free",
   isToggle:true, toggleKey:"gwm",
   descOff:"Toggle ON to take -5 to hit / +10 damage on all Heavy weapon attacks this turn.",
   descOn: "ACTIVE — All Heavy weapon attacks this turn: -5 to hit, +10 damage.",
   unlock:c=>(c.features||[]).some(f=>f.name==="Great Weapon Master")},

  // ── FEAT: Sharpshooter ── precise-shot toggle ─────────────────
  {id:"ss_precise_shot",     label:"Sharpshooter: Precise Shot",icon:"🎯", actionType:"free",
   isToggle:true, toggleKey:"ss",
   descOff:"Toggle ON to take -5 to ranged hit / +10 damage on all ranged weapon attacks this turn.",
   descOn: "ACTIVE — All ranged weapon attacks this turn: -5 to hit, +10 damage.",
   unlock:c=>(c.features||[]).some(f=>f.name==="Sharpshooter")},

];

// Returns only the CLASS_ABILITY_ACTIONS this character has unlocked,
// partitioned by actionType. Desc can be a string or a function(char).
// Also injects chosen maneuvers from char.choices.maneuvers via MANEUVER_DATABASE.
const getCharacterActions = (char) => {
  const unlocked = CLASS_ABILITY_ACTIONS.filter(a => {
    try { return a.unlock(char); } catch(_){ return false; }
  }).map(a => ({
    ...a,
    desc: typeof a.desc === "function" ? a.desc(char) : a.desc,
  }));

  // Inject chosen maneuvers as CLASS_ABILITY_ACTIONS entries
  const charManeuvers = getCharacterManeuvers(char);
  charManeuvers.forEach(m => {
    unlocked.push({
      id: "maneuver_" + m.id,
      label: m.name,
      icon: m.icon,
      actionType: m.actionType,
      desc: m.desc,
      isManeuver: true,
    });
  });

  // Inject reaction-type fighting styles as CLASS_ABILITY_ACTIONS entries
  // (Interception, Protection — they require using your Reaction in combat)
  const reactionStyles = ["Interception", "Protection"];
  (char.choices?.fighting_styles||[]).forEach(styleName => {
    if (!reactionStyles.includes(styleName)) return;
    const style = Object.values(FIGHTING_STYLE_DATABASE).find(s => s.name === styleName);
    if (!style) return;
    unlocked.push({
      id: "style_" + style.id,
      label: style.name,
      icon: style.icon,
      actionType: "reaction",
      desc: style.desc,
      isFightingStyle: true,
    });
  });

  return {
    action:   unlocked.filter(a => a.actionType === "action"),
    bonus:    unlocked.filter(a => a.actionType === "bonus"),
    reaction: unlocked.filter(a => a.actionType === "reaction"),
    free:     unlocked.filter(a => a.actionType === "free"),
  };
};


// Given a spell object or name, return its action type
const getSpellActionType = (spellNameOrObj) => {
  const name = typeof spellNameOrObj === "string" ? spellNameOrObj : spellNameOrObj?.name || "";
  if (SPELL_ACTION_TYPES[name]) return SPELL_ACTION_TYPES[name];
  // Infer from desc keywords
  const desc = (typeof spellNameOrObj === "object" ? spellNameOrObj?.desc : "") || "";
  if (/bonus action/i.test(desc)) return "bonus";
  if (/reaction/i.test(desc)) return "reaction";
  if (/ritual/i.test(desc)) return "ritual";
  return "action";
};

// Given an attack object, return its action type
const getAttackActionType = (atk) => {
  if (atk.actionType) return atk.actionType;
  const props = (atk.properties || "").toLowerCase();
  const name  = (atk.name || "").toLowerCase();
  if (/bonus action/i.test(props) || /bonus action/i.test(name)) return "bonus";
  if (/reaction/i.test(props)) return "reaction";
  if (/off.hand|off hand|second attack|extra.*light/i.test(props)) return "bonus";
  return "action";
};

// Returns the human-readable label for an action type
const ACTION_TYPE_META = {
  action:   {label:"Actions",       color:"#f59e0b", border:"#b45309", bg:"#1c140720", icon:"⚔️"},
  bonus:    {label:"Bonus Actions",  color:"#22c55e", border:"#15803d", bg:"#14532d20", icon:"⚡"},
  reaction: {label:"Reactions",      color:"#a855f7", border:"#7c3aed", bg:"#2d1b6920", icon:"↩️"},
  ritual:   {label:"Rituals",        color:"#60a5fa", border:"#3b82f6", bg:"#0a152020", icon:"📖"},
  free:     {label:"Free",           color:"#64748b", border:"#334155", bg:"#1e293b20", icon:"○"},
};


// ════════════════════════════════════════════════════════════════════
// FEAT_DATABASE — Single source of truth for every 2024 PHB feat.
// Shape: { name, cat, desc, prereqs[], statBonuses{}, grantedCantrips[],
//          grantedSpells[], actions[], passiveEffects[], features[] }
// passiveEffects shape: { type, desc, ...typeSpecificFields }
//   types: "resistance" | "immunity_condition" | "advantage_save" |
//          "ac_unarmored" | "hp_per_level" | "speed" | "initiative" |
//          "no_surprise" | "advantage_concentration" | "save_prof" |
//          "skill_expertise" | "halfcover_self" | "damage_reduction"
// ════════════════════════════════════════════════════════════════════
const FEAT_DATABASE = {

  // ── ORIGIN FEATS ────────────────────────────────────────────────────
  alert: {
    name:"Alert", cat:"Origin",
    desc:"Add Proficiency Bonus to Initiative. Can't be Surprised while conscious. Swap initiative with a willing ally after rolls.",
    prereqs:[],
    statBonuses:{},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[
      {type:"initiative", value:"prof", desc:"Alert: +Proficiency Bonus to Initiative"},
      {type:"no_surprise", desc:"Alert: Cannot be Surprised while conscious"},
    ],
    features:[{name:"Alert",type:"Origin Feat",desc:"Add Proficiency Bonus to Initiative. Can't be Surprised. May swap initiative with a willing ally after initiative rolls."}],
  },

  crafter: {
    name:"Crafter", cat:"Origin",
    desc:"Proficiency with 3 Artisan's Tools. 20% discount on nonmagical item purchases.",
    prereqs:[],
    statBonuses:{},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"tool_prof", tools:["Artisan's Tools (×3)"], desc:"Crafter: Proficiency with 3 Artisan's Tools"}],
    features:[{name:"Crafter",type:"Origin Feat",desc:"Proficiency with 3 Artisan's Tools of your choice. 20% discount when purchasing nonmagical items."}],
  },

  healer: {
    name:"Healer", cat:"Origin",
    desc:"Healer's Kit: stabilize and heal 1d6+4+max_hit_dice HP once per creature per rest. Restore 1d6+4 HP as Magic Action.",
    prereqs:[],
    statBonuses:{},
    grantedCantrips:[], grantedSpells:[],
    actions:[{name:"Healer's Kit (Heal)",bonus:0,damage:"1d6+4",type:"Healing",mastery:"",range:"Touch",properties:"Healer feat. 1/creature/rest. Magic Action.",fixedBonus:0,actionType:"action"}],
    passiveEffects:[],
    features:[{name:"Healer",type:"Origin Feat",desc:"Using a Healer's Kit: stabilize a creature and restore 1d6+4+max_hit_dice HP (once per creature per rest). Magic Action: restore 1d6+4 HP to a creature."}],
  },

  lucky: {
    name:"Lucky", cat:"Origin",
    desc:"3 Luck Points per Long Rest. Spend 1 before any attack, check, or save to roll an extra d20 and choose which to use.",
    prereqs:[],
    statBonuses:{},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"luck_points", value:3, desc:"Lucky: 3 Luck Points per Long Rest (reroll any d20 test)"}],
    features:[{name:"Lucky",type:"Origin Feat",desc:"3 Luck Points per Long Rest. Before a d20 Test, spend 1 point to roll an extra d20 and choose which die to use."}],
  },

  magic_cleric: {
    name:"Magic Initiate (Cleric)", cat:"Origin",
    desc:"Learn 2 Cleric cantrips + 1 level 1 Cleric spell (cast once/Long Rest free, or with slot). WIS is spellcasting ability.",
    prereqs:[],
    statBonuses:{},
    grantedCantrips:["Sacred Flame","Word of Radiance"],
    grantedSpells:[{name:"Healing Word",lvl:1,type:"Heal",damage:"1d4",desc:"(Magic Initiate) 1/Long Rest free or use slot. WIS mod."}],
    actions:[],
    passiveEffects:[],
    features:[{name:"Magic Initiate (Cleric)",type:"Origin Feat",desc:"Learn 2 Cleric cantrips + 1 level 1 Cleric spell. Cast the spell once per Long Rest for free, or expend a spell slot. WIS is your spellcasting ability for these spells."}],
  },

  magic_druid: {
    name:"Magic Initiate (Druid)", cat:"Origin",
    desc:"Learn 2 Druid cantrips + 1 level 1 Druid spell (cast once/Long Rest free, or with slot). WIS is spellcasting ability.",
    prereqs:[],
    statBonuses:{},
    grantedCantrips:["Shillelagh","Guidance"],
    grantedSpells:[{name:"Healing Word",lvl:1,type:"Heal",damage:"1d4",desc:"(Magic Initiate) 1/Long Rest free or use slot. WIS mod."}],
    actions:[],
    passiveEffects:[],
    features:[{name:"Magic Initiate (Druid)",type:"Origin Feat",desc:"Learn 2 Druid cantrips + 1 level 1 Druid spell. Cast the spell once per Long Rest for free, or expend a spell slot. WIS is your spellcasting ability for these spells."}],
  },

  magic_wizard: {
    name:"Magic Initiate (Wizard)", cat:"Origin",
    desc:"Learn 2 Wizard cantrips + 1 level 1 Wizard spell (cast once/Long Rest free, or with slot). INT is spellcasting ability.",
    prereqs:[],
    statBonuses:{},
    grantedCantrips:["Mage Hand","Prestidigitation"],
    grantedSpells:[{name:"Find Familiar",lvl:1,type:"Utility",desc:"(Magic Initiate) 1/Long Rest free or use slot. INT mod."}],
    actions:[],
    passiveEffects:[],
    features:[{name:"Magic Initiate (Wizard)",type:"Origin Feat",desc:"Learn 2 Wizard cantrips + 1 level 1 Wizard spell. Cast the spell once per Long Rest for free, or expend a spell slot. INT is your spellcasting ability for these spells."}],
  },

  musician: {
    name:"Musician", cat:"Origin",
    desc:"Proficiency with 3 Musical Instruments. Encourage: grant Bardic Inspiration (1d6) to up to 5 allies after a Short or Long Rest.",
    prereqs:[],
    statBonuses:{},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"tool_prof", tools:["Musical Instruments (×3)"], desc:"Musician: Proficiency with 3 Musical Instruments"}],
    features:[{name:"Musician",type:"Origin Feat",desc:"Proficiency with 3 Musical Instruments. After a Short or Long Rest, grant Bardic Inspiration (1d6) to up to 5 allies who can hear you."}],
  },

  savage_attacker: {
    name:"Savage Attacker", cat:"Origin",
    desc:"Once per turn when you roll weapon damage dice, you can reroll the dice and use either result.",
    prereqs:[],
    statBonuses:{},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"reroll_damage", desc:"Savage Attacker: Once per turn, reroll weapon damage dice and take either result"}],
    features:[{name:"Savage Attacker",type:"Origin Feat",desc:"Once per turn when you roll damage for a weapon attack, you can reroll the dice and use either result."}],
  },

  skilled: {
    name:"Skilled", cat:"Origin",
    desc:"Gain proficiency in any combination of 3 skills or tools.",
    prereqs:[],
    statBonuses:{},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[],
    features:[{name:"Skilled",type:"Origin Feat",desc:"Gain Proficiency in any combination of 3 skills or tools of your choice."}],
  },

  tavern_brawler: {
    name:"Tavern Brawler", cat:"Origin",
    desc:"Unarmed Strike damage = 1d4+STR. Shove costs a Bonus Action after a hit. +1 STR or CON (your choice).",
    prereqs:[],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[{name:"Unarmed (Tavern Brawler)",bonus:0,damage:"1d4",type:"Bludgeoning",mastery:"",range:"Melee",properties:"Tavern Brawler: 1d4 damage. Shove as Bonus Action after hit.",bonusStat:"str",actionType:"action"}],
    passiveEffects:[],
    features:[{name:"Tavern Brawler",type:"Origin Feat",desc:"Unarmed Strike deals 1d4+STR damage. After hitting a creature, use Bonus Action to Shove it. +1 to STR or CON."}],
  },

  tough: {
    name:"Tough", cat:"Origin",
    desc:"+2 HP per character level (past and future). HP maximum increases by 2× your level.",
    prereqs:[],
    statBonuses:{},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"hp_per_level", value:2, desc:"Tough: +2 HP per character level"}],
    features:[{name:"Tough",type:"Origin Feat",desc:"Your HP maximum increases by 2 for each character level you have, and each time you gain a level."}],
  },

  // ── PHYSICAL / COMBAT FEATS ─────────────────────────────────────────
  actor: {
    name:"Actor", cat:"Social",
    desc:"Expertise in Deception & Performance while disguised. Mimic other people's voices and sounds. +1 CHA.",
    prereqs:[{label:"CHA 13",check:(c)=>c.stats.cha>=13}],
    statBonuses:{cha:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"skill_expertise",skills:["Deception","Performance"],desc:"Actor: Expertise in Deception & Performance while disguised"}],
    features:[{name:"Actor",type:"Feat",desc:"When disguised as someone else, you have Expertise in Deception and Performance checks. You can mimic voices and sounds you've heard."}],
  },

  athlete: {
    name:"Athlete", cat:"Physical",
    desc:"Stand from prone uses only 5 ft. Climbing costs no extra movement. Running long jump needs only 5 ft run-up. +1 STR or DEX.",
    prereqs:[],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"movement",desc:"Athlete: Stand from prone uses 5 ft; climb no extra cost; long jump 5 ft run-up"}],
    features:[{name:"Athlete",type:"Feat",desc:"Stand up from prone using only 5 ft of movement. Climbing costs no extra movement. Running long jump only needs a 5-ft run-up."}],
  },

  charger: {
    name:"Charger", cat:"Combat",
    desc:"Charge attack: after Dashing 10+ ft in a straight line, hit = +1d8 damage or Shove 10 ft. +1 STR or CON.",
    prereqs:[],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[{name:"Charge Attack",bonus:0,damage:"1d8",type:"Bludgeoning",mastery:"",range:"Melee",properties:"After Dash 10+ ft straight. Extra 1d8 or Shove 10 ft.",bonusStat:"str",actionType:"action"}],
    passiveEffects:[],
    features:[{name:"Charger",type:"Feat",desc:"When you Dash at least 10 ft in a straight line toward a creature and then hit it on the same turn, you deal an extra 1d8 damage or push it 10 ft (your choice)."}],
  },

  crossbow_expert: {
    name:"Crossbow Expert", cat:"Combat",
    desc:"Ignore Loading property. No disadvantage firing in melee. Bonus action: fire a hand crossbow after attacking with a one-handed weapon. +1 DEX.",
    prereqs:[],
    statBonuses:{dex:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[{name:"Crossbow (Bonus Attack)",bonus:0,damage:"1d6",type:"Piercing",mastery:"Vex",range:"30/120 ft",properties:"Crossbow Expert bonus action attack after Attack action.",bonusStat:"dex",actionType:"bonus"}],
    passiveEffects:[{type:"no_loading",desc:"Crossbow Expert: Ignore Loading property on crossbows"}],
    features:[{name:"Crossbow Expert",type:"Feat",desc:"Ignore the Loading property of crossbows. No disadvantage on crossbow attacks in melee. Bonus action attack with a hand crossbow after using Attack action with a one-handed weapon."}],
  },

  crusher: {
    name:"Crusher", cat:"Combat",
    desc:"Bludgeoning hit: push target 5 ft (once/turn). Critical hit: all attacks have advantage vs target until start of your next turn. +1 STR or CON.",
    prereqs:[],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"on_hit",damage_type:"bludgeoning",effect:"push_5",desc:"Crusher: Bludgeoning hits can push target 5 ft once per turn"}],
    features:[{name:"Crusher",type:"Feat",desc:"When you deal Bludgeoning damage with a weapon or unarmed strike, you can push the target 5 ft (once per turn). On a critical hit, all attacks have Advantage vs the target until your next turn starts."}],
  },

  defensive_duelist: {
    name:"Defensive Duelist", cat:"Combat",
    desc:"Reaction: when hit while holding a finesse weapon, add your Proficiency Bonus to AC against that attack (possibly turning it into a miss). +1 DEX.",
    prereqs:[{label:"DEX 13",check:(c)=>c.stats.dex>=13}],
    statBonuses:{dex:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"reaction_ac",desc:"Defensive Duelist: Reaction — add PB to AC when hit while holding finesse weapon"}],
    features:[{name:"Defensive Duelist",type:"Feat",desc:"When you are hit by an attack while holding a Finesse weapon you are proficient with, use your Reaction to add your Proficiency Bonus to your AC for that attack, potentially causing a miss."}],
  },

  dual_wielder: {
    name:"Dual Wielder", cat:"Combat",
    desc:"No restriction on weapon size for two-weapon fighting. +1 to AC while wielding two weapons. Can draw/stow both weapons simultaneously. +1 STR or DEX.",
    prereqs:[],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"ac_bonus",value:1,condition:"two_weapons",desc:"Dual Wielder: +1 AC while wielding a weapon in each hand"}],
    features:[{name:"Dual Wielder",type:"Feat",desc:"No size restriction on two-weapon fighting. +1 to AC when wielding two weapons. Draw or stow two weapons at once. +1 STR or DEX."}],
  },

  durable: {
    name:"Durable", cat:"Physical",
    desc:"When you roll a Hit Die to regain HP, the minimum you regain equals twice your CON modifier (min 2). +1 CON.",
    prereqs:[],
    statBonuses:{con:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"min_hit_die",desc:"Durable: Minimum HP from Hit Die = twice your CON modifier (min 2)"}],
    features:[{name:"Durable",type:"Feat",desc:"When you roll a Hit Die to recover HP, the minimum result is twice your Constitution modifier (minimum 2)."}],
  },

  great_weapon_master: {
    name:"Great Weapon Master", cat:"Combat",
    desc:"On crit or kill, make a melee weapon attack as Bonus Action. Can take -5 to hit for +10 damage on heavy weapon attacks. +1 STR.",
    prereqs:[],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[{name:"GWM Bonus Attack",bonus:0,damage:"1d6",type:"Bludgeoning",mastery:"",range:"Melee",properties:"After crit or reducing creature to 0 HP. Bonus Action.",bonusStat:"str",actionType:"bonus"}],
    passiveEffects:[{type:"power_attack",penalty:-5,bonus:10,desc:"Great Weapon Master: Optionally -5 to hit for +10 damage with Heavy weapons"}],
    features:[{name:"Great Weapon Master",type:"Feat",desc:"After scoring a Critical Hit or reducing a creature to 0 HP with a melee weapon, make a bonus melee weapon attack. With heavy weapons, optionally take -5 to attack for +10 damage."}],
  },

  heavily_armored: {
    name:"Heavily Armored", cat:"Armor",
    desc:"Proficiency with Heavy Armor. +1 STR.",
    prereqs:[{label:"Medium Armor Prof",check:(c)=>hasProficiency(c,"medium")}],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"armor_prof",armor:["Heavy"],desc:"Heavily Armored: Proficiency with Heavy Armor"}],
    features:[{name:"Heavily Armored",type:"Feat",desc:"You gain proficiency with Heavy Armor. +1 STR."}],
  },

  heavy_armor_master: {
    name:"Heavy Armor Master", cat:"Armor",
    desc:"While wearing heavy armor, Bludgeoning, Piercing, and Slashing damage from nonmagical attacks reduced by 3. +1 STR.",
    prereqs:[{label:"Heavy Armor Prof",check:(c)=>hasProficiency(c,"heavy")}],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"damage_reduction",value:3,damage_types:["Bludgeoning","Piercing","Slashing"],condition:"heavy_armor",desc:"Heavy Armor Master: Reduce nonmagical B/P/S damage by 3 while in Heavy Armor"}],
    features:[{name:"Heavy Armor Master",type:"Feat",desc:"While wearing Heavy Armor, reduce nonmagical Bludgeoning, Piercing, and Slashing damage by 3."}],
  },

  inspiring_leader: {
    name:"Inspiring Leader", cat:"Social",
    desc:"10-min speech after Short/Long Rest: up to 6 creatures gain Temp HP = your level + CHA modifier. +1 CHA.",
    prereqs:[{label:"CHA 13",check:(c)=>c.stats.cha>=13}],
    statBonuses:{cha:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[{name:"Inspiring Leader",bonus:0,damage:"Temp HP",type:"Utility",mastery:"",range:"30 ft",properties:"10 min speech, Short/Long Rest. Up to 6 creatures gain Level+CHA Temp HP.",fixedBonus:0,actionType:"action"}],
    passiveEffects:[],
    features:[{name:"Inspiring Leader",type:"Feat",desc:"After a 10-minute speech, up to 6 creatures gain Temp HP = your Level + CHA modifier. Once per Short or Long Rest."}],
  },

  keen_mind: {
    name:"Keen Mind", cat:"Mental",
    desc:"Always know North, elapsed time, and recall anything you saw/heard in the past month. +1 INT.",
    prereqs:[],
    statBonuses:{int:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"perfect_recall",desc:"Keen Mind: Always know N/S, time passed, and recall anything seen/heard in past month"}],
    features:[{name:"Keen Mind",type:"Feat",desc:"You always know which way North is and how many hours remain until sunrise or sunset. You can recall anything you've seen or heard within the past month."}],
  },

  lightly_armored: {
    name:"Lightly Armored", cat:"Armor",
    desc:"Proficiency with Light Armor. +1 STR or DEX.",
    prereqs:[],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"armor_prof",armor:["Light"],desc:"Lightly Armored: Proficiency with Light Armor"}],
    features:[{name:"Lightly Armored",type:"Feat",desc:"You gain proficiency with Light Armor. +1 STR or DEX."}],
  },

  mage_slayer: {
    name:"Mage Slayer", cat:"Combat",
    desc:"When creature within 5 ft casts a spell, use Reaction to make a melee attack. Advantage on saves vs spells cast by adjacent creatures. +1 STR.",
    prereqs:[],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[
      {type:"reaction_attack",trigger:"adjacent_cast",desc:"Mage Slayer: Reaction melee attack when adjacent creature casts a spell"},
      {type:"advantage_save",trigger:"adjacent_spell",desc:"Mage Slayer: Advantage on saves vs spells cast by adjacent creatures"},
    ],
    features:[{name:"Mage Slayer",type:"Feat",desc:"When a creature within 5 ft casts a spell, use your Reaction to make one melee weapon attack against it. You also have Advantage on saves against spells cast by creatures within 5 ft of you."}],
  },

  medium_armor_master: {
    name:"Medium Armor Master", cat:"Armor",
    desc:"While wearing medium armor: DEX bonus to AC max is 3 (not 2), and no disadvantage on Stealth checks. +1 STR or DEX.",
    prereqs:[{label:"Medium Armor Prof",check:(c)=>hasProficiency(c,"medium")}],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"medium_armor_dex",max:3,stealth_penalty:false,desc:"Medium Armor Master: +3 max DEX to AC in medium armor, no Stealth penalty"}],
    features:[{name:"Medium Armor Master",type:"Feat",desc:"While wearing Medium Armor: your maximum DEX bonus to AC is 3 (not 2), and you impose no Stealth disadvantage on yourself."}],
  },

  moderately_armored: {
    name:"Moderately Armored", cat:"Armor",
    desc:"Proficiency with Medium Armor and Shields. +1 STR or DEX.",
    prereqs:[{label:"Light Armor Prof",check:(c)=>hasProficiency(c,"light")}],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"armor_prof",armor:["Medium","Shields"],desc:"Moderately Armored: Proficiency with Medium Armor and Shields"}],
    features:[{name:"Moderately Armored",type:"Feat",desc:"You gain proficiency with Medium Armor and Shields. +1 STR or DEX."}],
  },

  mounted_combatant: {
    name:"Mounted Combatant", cat:"Combat",
    desc:"Advantage on melee attacks vs unmounted creatures smaller than your mount. Redirect attacks targeting mount to self. Mount uses your DEX save on AOE effects. +1 STR.",
    prereqs:[],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[
      {type:"advantage_attack",condition:"unmounted_smaller",desc:"Mounted Combatant: Advantage on melee attacks vs unmounted smaller creatures"},
      {type:"redirect_attack",trigger:"mount_targeted",desc:"Mounted Combatant: Force attacks targeting your mount to target you instead"},
    ],
    features:[{name:"Mounted Combatant",type:"Feat",desc:"Advantage on melee attacks vs unmounted creatures smaller than your mount. Redirect attacks targeting your mount to yourself. Your mount uses your DEX save for area-of-effect saves."}],
  },

  observant: {
    name:"Observant", cat:"Mental",
    desc:"+5 to passive Perception and passive Investigation. Read lips. +1 INT or WIS.",
    prereqs:[],
    statBonuses:{int:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[
      {type:"passive_bonus",skill:"Perception",value:5,desc:"Observant: +5 to passive Perception"},
      {type:"passive_bonus",skill:"Investigation",value:5,desc:"Observant: +5 to passive Investigation"},
      {type:"lip_reading",desc:"Observant: Can read lips of creatures speaking a language you know"},
    ],
    features:[{name:"Observant",type:"Feat",desc:"+5 bonus to passive Perception and passive Investigation scores. You can read lips of creatures that speak a language you know."}],
  },

  polearm_master: {
    name:"Polearm Master", cat:"Combat",
    desc:"Bonus action attack with butt of polearm (1d4 bludgeoning). Opportunity attack when creature enters your reach. +1 STR or DEX.",
    prereqs:[],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[{name:"Polearm Butt Strike",bonus:0,damage:"1d4",type:"Bludgeoning",mastery:"",range:"Melee",properties:"Polearm Master. Bonus Action after Attack action with glaive/halberd/pike/quarterstaff.",bonusStat:"str",actionType:"bonus"}],
    passiveEffects:[{type:"reach_opportunity",desc:"Polearm Master: Opportunity Attack when creatures enter your reach with a polearm"}],
    features:[{name:"Polearm Master",type:"Feat",desc:"After taking Attack action with glaive/halberd/pike/quarterstaff, use Bonus Action to attack with the weapon's butt (1d4 bludgeoning). Make opportunity attacks when creatures enter your reach."}],
  },

  resilient: {
    name:"Resilient", cat:"Physical",
    desc:"Proficiency in saving throws using a chosen ability score. +1 to that ability score.",
    prereqs:[],
    statBonuses:{con:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"save_prof",stat:"con",desc:"Resilient: Proficiency in Constitution saving throws"}],
    features:[{name:"Resilient",type:"Feat",desc:"Choose one ability score. You gain proficiency in saving throws using that score and increase it by 1."}],
  },

  sentinel: {
    name:"Sentinel", cat:"Combat",
    desc:"Opportunity attacks: target speed becomes 0. Opportunity attacks even when target uses Disengage. Reaction attack vs creature attacking an adjacent ally. +1 STR.",
    prereqs:[],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[
      {type:"opportunity_attack",effect:"stop_movement",desc:"Sentinel: Opportunity attacks reduce target speed to 0"},
      {type:"opportunity_attack",trigger:"disengage",desc:"Sentinel: Can make opportunity attacks even if target uses Disengage"},
      {type:"reaction_attack",trigger:"ally_attacked_adjacent",desc:"Sentinel: Reaction attack when creature within 5 ft attacks an ally"},
    ],
    features:[{name:"Sentinel",type:"Feat",desc:"Your opportunity attacks reduce the target's speed to 0. You can make opportunity attacks even if the target Disengages. When a creature within 5 ft attacks an ally, use your Reaction to make a melee attack against that creature."}],
  },

  sharpshooter: {
    name:"Sharpshooter", cat:"Combat",
    desc:"No disadvantage at long range. Ranged attacks ignore half/three-quarters cover. Optionally take -5 to ranged attack hit for +10 damage. +1 DEX.",
    prereqs:[],
    statBonuses:{dex:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[
      {type:"no_long_range_penalty",desc:"Sharpshooter: No disadvantage at long range with ranged weapons"},
      {type:"ignore_cover",level:2,desc:"Sharpshooter: Ranged attacks ignore half and three-quarters cover"},
      {type:"power_attack_ranged",penalty:-5,bonus:10,desc:"Sharpshooter: Optionally -5 to ranged attack for +10 damage"},
    ],
    features:[{name:"Sharpshooter",type:"Feat",desc:"Ranged weapon attacks have no disadvantage at long range. Ignore half and three-quarters cover. Optionally take -5 to attack for +10 damage."}],
  },

  shield_master: {
    name:"Shield Master", cat:"Combat",
    desc:"Shove as Bonus Action after Attack action (while wielding shield). +2 to DEX saves. Can negate AOE damage on successful save. +1 STR.",
    prereqs:[],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[{name:"Shove (Shield Master)",bonus:0,damage:"—",type:"Special",mastery:"",range:"Melee",properties:"Bonus Action after Attack action (shield required). Push 5 ft or knock prone. STR(Athletics) vs STR/DEX(Acrobatics).",fixedBonus:0,actionType:"bonus"}],
    passiveEffects:[{type:"save_bonus",stat:"dex",value:2,desc:"Shield Master: +2 bonus to DEX saving throws while bearing a shield"}],
    features:[{name:"Shield Master",type:"Feat",desc:"When you take the Attack action while wielding a shield, use Bonus Action to Shove. +2 bonus to DEX saves while bearing a shield. On successful DEX save vs AOE, negate all damage instead of halving."}],
  },

  skulker: {
    name:"Skulker", cat:"Stealth",
    desc:"Can hide in light obscurement. Missing a ranged attack doesn't reveal position. Dim light doesn't impose disadvantage on Perception. +1 DEX.",
    prereqs:[{label:"DEX 13",check:(c)=>c.stats.dex>=13}],
    statBonuses:{dex:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[
      {type:"hide_in_obscurement",desc:"Skulker: Can attempt to Hide in lightly obscured areas"},
      {type:"no_reveal_on_miss",desc:"Skulker: Missing a ranged attack doesn't reveal your position"},
    ],
    features:[{name:"Skulker",type:"Feat",desc:"You can attempt to Hide when only Lightly Obscured. Missing a ranged attack doesn't reveal your position. Dim light doesn't impose disadvantage on Perception checks."}],
  },

  slasher: {
    name:"Slasher", cat:"Combat",
    desc:"Slashing hit: target speed reduced by 10 ft until start of your next turn. Critical hit: target has disadvantage on all attack rolls until start of your next turn. +1 STR or DEX.",
    prereqs:[],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"on_hit",damage_type:"slashing",effect:"slow_10",desc:"Slasher: Slashing hits reduce target speed by 10 ft; crits impose attack disadvantage"}],
    features:[{name:"Slasher",type:"Feat",desc:"When you deal Slashing damage with a weapon, reduce target's speed by 10 ft until your next turn starts. On a Critical Hit, the target has Disadvantage on attack rolls until your next turn."}],
  },

  speedy: {
    name:"Speedy", cat:"Physical",
    desc:"+10 ft walking speed. Disengage as Bonus Action. +1 DEX or CON.",
    prereqs:[],
    statBonuses:{dex:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"speed",value:10,desc:"Speedy: +10 ft walking speed"}],
    features:[{name:"Speedy",type:"Feat",desc:"+10 ft to your walking speed. You can take the Disengage action as a Bonus Action."}],
  },

  weapon_master: {
    name:"Weapon Master", cat:"Combat",
    desc:"Proficiency with 4 simple or martial weapons of your choice. +1 STR or DEX.",
    prereqs:[],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"weapon_prof",count:4,desc:"Weapon Master: Proficiency with 4 chosen simple or martial weapons"}],
    features:[{name:"Weapon Master",type:"Feat",desc:"You gain proficiency with 4 simple or martial weapons of your choice. +1 STR or DEX."}],
  },

  chef: {
    name:"Chef", cat:"Utility",
    desc:"Proficiency with Cook's Utensils. Short Rest cooking: up to PB creatures regain extra 1d8 HP from Hit Dice. Long Rest: create PB treats that grant 2d4 Temp HP each. +1 CON or WIS.",
    prereqs:[],
    statBonuses:{con:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[{name:"Chef's Treats",bonus:0,damage:"2d4 TempHP",type:"Utility",mastery:"",range:"30 ft",properties:"Long Rest. Create PB treats, each granting 2d4 Temp HP when consumed.",fixedBonus:0,actionType:"free"}],
    passiveEffects:[],
    features:[{name:"Chef",type:"Feat",desc:"Proficiency with Cook's Utensils. Short Rest: up to PB creatures regain extra 1d8 HP from Hit Dice. Long Rest: create PB treats granting 2d4 Temp HP. +1 CON or WIS."}],
  },

  dungeon_delver: {
    name:"Dungeon Delver", cat:"Exploration",
    desc:"Advantage on Perception/Investigation to detect secret doors. Resistance to damage from traps. +1 STR or INT.",
    prereqs:[],
    statBonuses:{int:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[
      {type:"advantage_check",skills:["Perception","Investigation"],condition:"secret_doors",desc:"Dungeon Delver: Advantage on checks to detect secret doors"},
      {type:"resistance",damage:"Trap",desc:"Dungeon Delver: Resistance to damage dealt by traps"},
    ],
    features:[{name:"Dungeon Delver",type:"Feat",desc:"Advantage on Perception and Investigation checks to detect secret doors and traps. Resistance to damage from traps. +1 STR or INT."}],
  },

  // ── MAGIC FEATS ──────────────────────────────────────────────────────
  elemental_adept: {
    name:"Elemental Adept", cat:"Magic",
    desc:"Spells ignore resistance to your chosen element. Treat 1s as 2s on damage dice for that element. +1 INT.",
    prereqs:[{label:"Spellcasting",check:(c)=>hasSpellcasting(c)}],
    statBonuses:{int:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"ignore_resistance",damage_type:"chosen",desc:"Elemental Adept: Ignore resistance to your chosen damage type; treat 1s as 2s on its damage dice"}],
    features:[{name:"Elemental Adept",type:"Feat",desc:"Choose a damage type: Acid, Cold, Fire, Lightning, or Thunder. Your spells ignore resistance to that damage type, and you treat 1s as 2s on its damage dice."}],
  },

  fey_touched: {
    name:"Fey Touched", cat:"Magic",
    desc:"Learn Misty Step + one 1st-level Divination or Enchantment spell. Cast each once/Long Rest for free or use spell slots. +1 INT, WIS, or CHA.",
    prereqs:[],
    statBonuses:{wis:1},
    grantedCantrips:[],
    grantedSpells:[
      {name:"Misty Step",lvl:2,type:"Utility",desc:"(Fey Touched) Teleport 30 ft. Bonus Action. 1/Long Rest free or use slot."},
      {name:"Silvery Barbs",lvl:1,type:"Reaction",desc:"(Fey Touched) Force reroll, give ally advantage. 1/Long Rest free or use slot."},
    ],
    actions:[],
    passiveEffects:[],
    features:[{name:"Fey Touched",type:"Feat",desc:"Learn Misty Step and one 1st-level Divination or Enchantment spell. Cast each once/Long Rest for free, or expend a spell slot. +1 INT, WIS, or CHA."}],
  },

  shadow_touched: {
    name:"Shadow Touched", cat:"Magic",
    desc:"Learn Invisibility + one 1st-level Illusion or Necromancy spell. Cast each once/Long Rest for free or use slot. +1 INT, WIS, or CHA.",
    prereqs:[],
    statBonuses:{wis:1},
    grantedCantrips:[],
    grantedSpells:[
      {name:"Invisibility",lvl:2,type:"Utility",desc:"(Shadow Touched) 1/Long Rest free or use slot."},
      {name:"Inflict Wounds",lvl:1,type:"Attack",damage:"3d10",desc:"(Shadow Touched) Melee spell attack. 1/Long Rest free or use slot."},
    ],
    actions:[],
    passiveEffects:[],
    features:[{name:"Shadow Touched",type:"Feat",desc:"Learn Invisibility and one 1st-level Illusion or Necromancy spell. Cast each once/Long Rest for free, or expend a spell slot. +1 INT, WIS, or CHA."}],
  },

  ritual_caster: {
    name:"Ritual Caster", cat:"Magic",
    desc:"Learn 2 Ritual spells of 1st level. Add others to ritual book. Cast any known ritual without expending a slot (10 extra min). +1 INT or WIS.",
    prereqs:[{label:"INT or WIS 13",check:(c)=>c.stats.int>=13||c.stats.wis>=13}],
    statBonuses:{int:1},
    grantedCantrips:[],
    grantedSpells:[
      {name:"Find Familiar",lvl:1,type:"Utility",desc:"(Ritual) Cast as ritual only. No slot required."},
      {name:"Identify",lvl:1,type:"Utility",desc:"(Ritual) Cast as ritual only. No slot required."},
    ],
    actions:[],
    passiveEffects:[],
    features:[{name:"Ritual Caster",type:"Feat",desc:"You've learned to cast spells as rituals. Start with 2 ritual spells of your choice in a ritual book. Add others you find. Cast any ritual spell you know without expending a slot (takes 10 extra minutes). +1 INT or WIS."}],
  },

  spell_sniper: {
    name:"Spell Sniper", cat:"Magic",
    desc:"Double the range of spells requiring attack rolls. Ranged spell attacks ignore half/three-quarters cover. Learn 1 attack cantrip. +1 INT, WIS, or CHA.",
    prereqs:[{label:"Spellcasting",check:(c)=>hasSpellcasting(c)}],
    statBonuses:{int:1},
    grantedCantrips:["Fire Bolt"],
    grantedSpells:[],
    actions:[],
    passiveEffects:[
      {type:"double_spell_range",desc:"Spell Sniper: Double range on spell attack rolls"},
      {type:"ignore_cover",level:2,trigger:"spell_attack",desc:"Spell Sniper: Ranged spell attacks ignore half/three-quarters cover"},
    ],
    features:[{name:"Spell Sniper",type:"Feat",desc:"Double the range of spells that require an attack roll. Ignore half and three-quarters cover with ranged spell attacks. Learn one extra attack cantrip. +1 INT, WIS, or CHA."}],
  },

  // ── CHOICE-DRIVEN FEATS ─────────────────────────────────────────────
  // These feats use the choices[] schema: [{type, count, label}]
  // choices[] is processed by LevelUpModal's choice architecture.

  martial_adept: {
    name:"Martial Adept", cat:"Combat",
    desc:"Learn 2 Battle Maneuvers from the Battle Master list. Gain 1 Superiority Die (d6) per Short/Long Rest to fuel them. Maneuver save DC = 8+PB+STR/DEX mod.",
    prereqs:[],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[{type:"class_resource",id:"martial_adept_sd",label:"Adept's Die",icon:"⚔️",die:"d6",max:1,resetOn:"short",color:"#6ee7b7"}],
    features:[{name:"Martial Adept",type:"Feat",desc:"You learn 2 Battle Master maneuvers (see chosen). Gain 1 Superiority Die (d6) per Short/Long Rest. Maneuver save DC = 8+PB+STR or DEX mod."}],
    choices:[{type:"maneuvers",count:2,label:"Choose 2 Battle Maneuvers"}],
  },

  fighting_initiate: {
    name:"Fighting Initiate", cat:"Combat",
    desc:"Learn 1 Fighting Style of your choice from the Fighter list. +1 STR, DEX, or CON.",
    prereqs:[{label:"Martial Weapon Prof",check:(c)=>(c.features||[]).some(f=>f.desc&&f.desc.toLowerCase().includes("martial weapon"))||(c.class||'').match(/Fighter|Ranger|Paladin|Barbarian/)}],
    statBonuses:{str:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[],
    features:[{name:"Fighting Initiate",type:"Feat",desc:"Learn 1 Fighting Style from the Fighter list. If you already have it, choose a different one. +1 STR, DEX, or CON."}],
    choices:[{type:"fighting_style",count:1,label:"Choose a Fighting Style"}],
  },

  war_caster: {
    name:"War Caster", cat:"Magic",
    desc:"Advantage on Concentration saves. Perform somatic components while holding weapons/shields. Reaction: cast a spell instead of making an opportunity attack. +1 INT, WIS, or CHA.",
    prereqs:[{label:"Spellcasting",check:(c)=>hasSpellcasting(c)}],
    statBonuses:{int:1},
    grantedCantrips:[], grantedSpells:[],
    actions:[],
    passiveEffects:[
      {type:"advantage_concentration",desc:"War Caster: Advantage on Constitution saves to maintain Concentration"},
      {type:"somatic_while_armed",desc:"War Caster: Perform somatic components while holding weapons or shield"},
      {type:"reaction_spell",trigger:"opportunity",desc:"War Caster: Use Reaction to cast a spell instead of opportunity attack"},
    ],
    features:[{name:"War Caster",type:"Feat",desc:"Advantage on Constitution saves to maintain Concentration. Perform somatic components while holding weapons/shield. Cast a spell as a Reaction opportunity attack."}],
  },
};

// ════════════════════════════════════════════════════════════════════
// GENERAL_FEATS_2024 — Derived from FEAT_DATABASE for the Level-Up UI
// (prereqs, name, id, cat, desc — same fields the feat picker needs)
// ════════════════════════════════════════════════════════════════════
const GENERAL_FEATS_2024 = Object.entries(FEAT_DATABASE).map(([id, fd]) => ({
  id, name:fd.name, cat:fd.cat, desc:fd.desc, prereqs:fd.prereqs,
  choices:fd.choices||[], // choice requirements (e.g. maneuvers, fighting_style)
}));

// ════════════════════════════════════════════════════════════════════
// applyMechanics — THE Rules Engine.
// Given a feat id (or null) and/or subclass gains object, applies ALL
// mechanical changes to character state in one deterministic pass.
// Returns updated state object; no mutation of inputs.
// ════════════════════════════════════════════════════════════════════
const applyMechanics = (state, prof) => {
  // state = { stats, features, attacks, spells, passiveEffects, featId, scGains, choiceSelections }
  let stats = {...state.stats};
  let features = [...(state.features||[])];
  let attacks = [...(state.attacks||[])];
  let passiveEffects = [...(state.passiveEffects||[])];
  let spells = state.spells || {cantrips:[], slots:{1:{max:0,used:0}}};
  let choices = {...(state.choices||{})};

  const addFeature = (f) => { if(!features.some(x=>x.name===f.name)) features.push(f); };
  const addAttack  = (a) => { if(!attacks.some(x=>x.name===a.name)) attacks.push(a); };
  const addPassive = (pe) => {
    if (pe.type === "class_resource") {
      // Upgradeable resources: replace existing entry with same id (e.g. d8→d10 at Lv7)
      const idx = passiveEffects.findIndex(x => x.type === "class_resource" && x.id === pe.id);
      if (idx >= 0) passiveEffects[idx] = pe;
      else passiveEffects.push(pe);
    } else {
      if (!passiveEffects.some(x => x.desc === pe.desc)) passiveEffects.push(pe);
    }
  };
  const addCantrip = (name) => {
    if(!(spells.cantrips||[]).some(s=>normalizeSpell(s).name===name))
      spells={...spells,cantrips:[...(spells.cantrips||[]),normalizeSpell(name)]};
  };
  const addSpell = (sp) => {
    const key="lvl"+(sp.lvl||1);
    if(!spells[key]) spells={...spells,[key]:[]};
    if(!spells[key].some(s=>normalizeSpell(s).name===sp.name))
      spells={...spells,[key]:[...spells[key],{...sp}]};
  };

  // ── 1. FEAT from FEAT_DATABASE ─────────────────────────────────────
  if (state.featId) {
    const fd = FEAT_DATABASE[state.featId];
    if (fd) {
      // Stat bonuses
      for (const [k,v] of Object.entries(fd.statBonuses||{})) stats[k]=(stats[k]||10)+v;
      // Actions → attacks list (compute hit bonus from bonusStat)
      (fd.actions||[]).forEach(a => {
        const bonusStat = a.bonusStat||"str";
        addAttack({...a, bonus: a.fixedBonus!=null ? a.fixedBonus : Math.floor((stats[bonusStat]-10)/2)+prof});
      });
      // Granted cantrips
      (fd.grantedCantrips||[]).forEach(addCantrip);
      // Granted spells
      (fd.grantedSpells||[]).forEach(addSpell);
      // Feature text entries
      (fd.features||[]).forEach(addFeature);
      // Passive effects
      (fd.passiveEffects||[]).forEach(addPassive);
    }
  }

  // ── 2. SUBCLASS GAINS (from SUBCLASS_PROGRESSION) ──────────────────
  if (state.scGains) {
    const g = state.scGains;
    // Text features
    (g.features||[]).forEach(addFeature);
    // Subclass-granted attacks
    (g.attacks||[]).forEach(addAttack);
    // Passive effects from subclass (e.g. Draconic unarmored AC)
    (g.passiveEffects||[]).forEach(addPassive);
    // Domain/Oath/Patron spells
    (g.spells||[]).forEach(({name,lvl}) => addSpell({name,lvl,type:"Spell",desc:"Domain/Oath spell — always prepared."}));
    // Proficiency grants (stored as feature)
    const scProfs = g.proficiencies||[];
    if (scProfs.length>0) {
      addFeature({name:"Proficiencies: "+scProfs.join(", "),type:"Subclass",desc:"Proficiencies granted by your subclass: "+scProfs.join(", ")});
    }
  }

  // ── 3. CHOICE SELECTIONS — Universal handler for all choice types ─────
  // Supports: maneuvers (Battle Master / Martial Adept),
  //           fighting_styles (Fighting Initiate / future class features)
  //           Future: metamagic, eldritch_invocations, warlock_spells, etc.
  if (state.choiceSelections) {
    const cs = state.choiceSelections;

    // ── Maneuvers (Battle Master subclass + Martial Adept feat) ──────────
    if (cs.maneuvers && cs.maneuvers.length > 0) {
      const prev = choices.maneuvers || [];
      choices.maneuvers = [...new Set([...prev, ...cs.maneuvers])];
      const newPicks = cs.maneuvers.filter(n => !prev.includes(n));
      if (newPicks.length > 0) {
        // Update or create the "Battle Maneuvers" feature with full list
        const existing = features.find(f => f.name === "Battle Maneuvers");
        const fullDesc = `Maneuvers mastered: ${choices.maneuvers.join(", ")}. Each costs 1 Superiority Die.`;
        if (existing) {
          existing.desc = fullDesc;
        } else {
          addFeature({ name:"Battle Maneuvers", type:"Subclass", desc:fullDesc });
        }
      }
    }

    // ── Fighting Styles (Fighting Initiate feat + future class choices) ──
    if (cs.fighting_styles && cs.fighting_styles.length > 0) {
      const prev = choices.fighting_styles || [];
      choices.fighting_styles = [...new Set([...prev, ...cs.fighting_styles])];
      const newStyles = cs.fighting_styles.filter(n => !prev.includes(n));
      newStyles.forEach(styleName => {
        const style = Object.values(FIGHTING_STYLE_DATABASE).find(s => s.name === styleName);
        if (style) {
          // Add passive effects from fighting style
          (style.passiveEffects||[]).forEach(addPassive);
          // Add feature entry
          addFeature({ name:styleName, type:"Fighting Style", desc:style.desc });
        }
      });
    }
  }

  return {stats, features, attacks, spells, passiveEffects, choices};
};

// ── Computed stats from passiveEffects ───────────────────────────────
// These functions let the Character Sheet dynamically derive bonus values.
const getPassiveBonus = (char, type) => (char.passiveEffects||[]).filter(pe=>pe.type===type);
const hasPassive      = (char, type) => (char.passiveEffects||[]).some(pe=>pe.type===type);

// Returns computed initiative (base DEX mod + passive bonuses)
const computedInitiative = (char) => {
  const dexMod = Math.floor((char.stats.dex-10)/2);
  const hasBonuses = getPassiveBonus(char,"initiative");
  const profBonus = hasBonuses.some(p=>p.value==="prof") ? (char.proficiency||2) : 0;
  return dexMod + profBonus + hasBonuses.filter(p=>typeof p.value==="number").reduce((a,p)=>a+p.value,0);
};


// ════════════════════════════════════════════════════════════════════
// MANEUVER_DATABASE — Battle Master (Fighter) Superiority Die maneuvers.
// Sets the schema precedent for future METAMAGIC_DATABASE / INVOCATION_DATABASE.
// Each entry: { id, name, actionType, icon, die, desc, tags[] }
// actionType: "action" (used on Attack), "bonus", "reaction", "free" (passive modifier)
// ════════════════════════════════════════════════════════════════════
const MANEUVER_DATABASE = {
  disarming_attack: {
    id:"disarming_attack", name:"Disarming Attack",
    actionType:"action", icon:"🗡️",
    desc:"When you hit a creature with a weapon attack, expend one Superiority Die and add it to the damage roll. If the target is Large or smaller, it must make a STR save (DC 8+PB+STR/DEX) or drop one item of your choice.",
    tags:["damage","debuff"],
  },
  distracting_strike: {
    id:"distracting_strike", name:"Distracting Strike",
    actionType:"action", icon:"👁",
    desc:"When you hit a creature with a weapon attack, expend a Superiority Die and add it to damage. The next attack roll against that creature before the start of your next turn has advantage.",
    tags:["damage","utility"],
  },
  evasive_footwork: {
    id:"evasive_footwork", name:"Evasive Footwork",
    actionType:"free", icon:"💨",
    desc:"When you move, expend one Superiority Die and add the result to your AC until you stop moving. (Used during your move, not a separate action.)",
    tags:["defense","movement"],
  },
  feinting_attack: {
    id:"feinting_attack", name:"Feinting Attack",
    actionType:"bonus", icon:"🎭",
    desc:"Expend one Superiority Die as a Bonus Action. Choose one creature within 5 ft. You have advantage on your next attack roll against it this turn, and add the Superiority Die to the damage if you hit.",
    tags:["attack","advantage"],
  },
  goading_attack: {
    id:"goading_attack", name:"Goading Attack",
    actionType:"action", icon:"😠",
    desc:"When you hit a creature with a weapon attack, expend a Superiority Die and add it to the damage. The target must make a WIS save or have disadvantage on attack rolls against creatures other than you until the start of your next turn.",
    tags:["damage","debuff"],
  },
  lunging_attack: {
    id:"lunging_attack", name:"Lunging Attack",
    actionType:"free", icon:"🏃",
    desc:"When you make a melee weapon attack, expend a Superiority Die to increase your reach by 5 ft. Add the die result to the damage if you hit.",
    tags:["damage","reach"],
  },
  maneuvering_attack: {
    id:"maneuvering_attack", name:"Maneuvering Attack",
    actionType:"action", icon:"🧭",
    desc:"When you hit a creature, expend a Superiority Die and add it to damage. Choose a friendly creature who can see or hear you — it can use its Reaction to move up to half its speed without provoking opportunity attacks.",
    tags:["damage","ally"],
  },
  menacing_attack: {
    id:"menacing_attack", name:"Menacing Attack",
    actionType:"action", icon:"😱",
    desc:"When you hit a creature with a weapon attack, expend a Superiority Die and add it to the damage. The target must make a WIS save or be Frightened of you until the end of your next turn.",
    tags:["damage","fear"],
  },
  parry: {
    id:"parry", name:"Parry",
    actionType:"reaction", icon:"🛡",
    desc:"When another creature damages you with a melee attack, use your Reaction and expend one Superiority Die to reduce the damage by the die result + your DEX modifier.",
    tags:["defense","mitigation"],
  },
  precision_attack: {
    id:"precision_attack", name:"Precision Attack",
    actionType:"free", icon:"🎯",
    desc:"When you make a weapon attack roll against a creature, expend one Superiority Die and add it to the roll. You can use this maneuver before or after making the attack roll, but before any effects of the attack are applied.",
    tags:["attack","accuracy"],
  },
  pushing_attack: {
    id:"pushing_attack", name:"Pushing Attack",
    actionType:"action", icon:"💪",
    desc:"When you hit a creature with a weapon attack, expend a Superiority Die and add it to the damage. If the target is Large or smaller, it must make a STR save or be pushed up to 15 ft away from you.",
    tags:["damage","push"],
  },
  rally: {
    id:"rally", name:"Rally",
    actionType:"bonus", icon:"❤️",
    desc:"Expend one Superiority Die as a Bonus Action. Choose a friendly creature you can see or hear. It gains Temporary HP equal to the Superiority Die roll + your CHA modifier.",
    tags:["support","temp_hp"],
  },
  riposte: {
    id:"riposte", name:"Riposte",
    actionType:"reaction", icon:"⚔️",
    desc:"When a creature misses you with a melee attack, use your Reaction and expend one Superiority Die to make a melee weapon attack against it. Add the Superiority Die to the damage roll.",
    tags:["attack","counterattack"],
  },
  sweeping_attack: {
    id:"sweeping_attack", name:"Sweeping Attack",
    actionType:"action", icon:"🌊",
    desc:"When you hit a creature with a melee weapon attack, expend a Superiority Die. Choose another creature within 5 ft of the original target that is also within your reach — deal damage equal to the Superiority Die roll (same damage type, no modifiers).",
    tags:["damage","cleave"],
  },
  trip_attack: {
    id:"trip_attack", name:"Trip Attack",
    actionType:"action", icon:"🦵",
    desc:"When you hit a creature with a weapon attack, expend a Superiority Die and add it to the damage. If the target is Large or smaller, it must make a STR save or be knocked Prone.",
    tags:["damage","prone"],
  },
  brace: {
    id:"brace", name:"Brace",
    actionType:"reaction", icon:"🛡",
    desc:"When a creature you can see moves into your reach, expend a Superiority Die to use your Reaction and make one weapon attack against it. Add the Superiority Die to the damage if you hit.",
    tags:["attack","control"],
  },
};

// Ordered list for picker display
const MANEUVER_LIST = Object.values(MANEUVER_DATABASE);

// Get all maneuvers a character has chosen (from choices.maneuvers)
const getCharacterManeuvers = (char) =>
  (char.choices?.maneuvers || [])
    .map(name => Object.values(MANEUVER_DATABASE).find(m => m.name === name))
    .filter(Boolean);

function SpellPicker({ character, newLevel, currentSpells, onUpdate }) {
  const cls=character.class.split(" ")[0];
  const cfg=SPELLCASTING_CONFIG[cls];
  if(!cfg) return null;
  const db=SPELL_DB[cls]||{};

  // Normalize existing spells to name strings for selection tracking
  const prevSpellNames=[];
  for(let k in currentSpells){ if(k.startsWith("lvl")) prevSpellNames.push(...(currentSpells[k]||[]).map(s=>typeof s==="string"?s:s?.name).filter(Boolean)); }
  const prevCantripNames=(currentSpells.cantrips||[]).map(s=>typeof s==="string"?s:s?.name).filter(Boolean);

  const [selectedSpells,setSelectedSpells]=useState(new Set(prevSpellNames));
  const [selectedCantrips,setSelectedCantrips]=useState(new Set(prevCantripNames));
  const [tab,setTab]=useState(cfg.cantrips?"C":"1");

  const maxSlotLv=cfg.maxSlotLv(newLevel);
  const prevMaxSlotLv=cfg.maxSlotLv(newLevel-1);
  const unlockedLevels=[];
  for(let i=1;i<=maxSlotLv;i++) unlockedLevels.push(i);

  let targetKnown=0, targetCantrips=0;
  if(cfg.type==="known") targetKnown=cfg.known(newLevel);
  if(cfg.type==="spellbook") targetKnown=prevSpellNames.length+cfg.learn;
  if(cfg.type==="prepared") targetKnown=cfg.prepared(character,newLevel);
  if(cfg.cantrips){
    const ct=[0,2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4];
    targetCantrips=ct[Math.min(newLevel,20)];
  }

  const newSpellSlotsAvailable=maxSlotLv>prevMaxSlotLv;
  const spellsToAdd=cfg.type==="prepared"?0:Math.max(0,targetKnown-prevSpellNames.length);
  const cantripsToAdd=Math.max(0,targetCantrips-prevCantripNames.length);
  // For known casters: how many NEW (non-prev) spells selected
  const newlySelected=[...selectedSpells].filter(s=>!prevSpellNames.includes(s)).length;
  const newlySelectedCantrips=[...selectedCantrips].filter(s=>!prevCantripNames.includes(s)).length;

  const pushUpdate=(spells,cantrips)=>{
    const newSpellsObj={...currentSpells};
    // Store as normalized objects
    newSpellsObj.cantrips=[...cantrips].map(n=>normalizeSpell(n));
    for(let l=1;l<=9;l++){
      newSpellsObj["lvl"+l]=[...spells].filter(n=>(db[l]||[]).includes(n)).map(n=>normalizeSpell(n));
    }
    onUpdate(newSpellsObj);
  };

  const toggleSpell=(spellName,isCantrip)=>{
    if(isCantrip){
      setSelectedCantrips(prev=>{
        const next=new Set(prev);
        if(next.has(spellName)){
          // Always allow deselect
          next.delete(spellName);
        } else {
          // Cap: for known casters, cap new cantrips; prepared can freely swap
          const newCount=[...next].filter(s=>!prevCantripNames.includes(s)).length;
          if(cfg.type!=="prepared"&&targetCantrips>0&&newCount>=cantripsToAdd&&!prevCantripNames.includes(spellName)) return prev;
          next.add(spellName);
        }
        pushUpdate(selectedSpells,next);
        return next;
      });
    } else {
      setSelectedSpells(prev=>{
        const next=new Set(prev);
        if(next.has(spellName)){
          // For prepared: always allow toggle. For known: only allow removing non-prev (new picks)
          if(cfg.type==="prepared"||!prevSpellNames.includes(spellName)){
            next.delete(spellName);
          }
        } else {
          // Cap check: for known/spellbook, cap new picks
          if(cfg.type!=="prepared"){
            const newCount=[...next].filter(s=>!prevSpellNames.includes(s)).length;
            const cap=cfg.type==="spellbook"?cfg.learn:spellsToAdd;
            if(newCount>=cap&&!prevSpellNames.includes(spellName)) return prev;
          } else {
            // Prepared: cap total at targetKnown
            if(next.size>=targetKnown) return prev;
          }
          next.add(spellName);
        }
        pushUpdate(next,selectedCantrips);
        return next;
      });
    }
  };

  const levelTabs=[...(cfg.cantrips?["C"]:[]),...unlockedLevels.map(String)];

  const getSpellsForTab=()=>{
    if(tab==="C") return db.cantrips||[];
    return db[parseInt(tab)]||[];
  };

  // Progress indicator
  const spellProgress=cfg.type==="prepared"
    ?`${selectedSpells.size}/${targetKnown} prepared`
    :cfg.type==="spellbook"
    ?`${newlySelected}/${cfg.learn} new spells chosen`
    :`${newlySelected}/${spellsToAdd} new spells chosen`;

  const cantripProgress=targetCantrips>0?`${newlySelectedCantrips}/${cantripsToAdd} new cantrips chosen`:"";
  const atSpellCap=cfg.type==="prepared"?selectedSpells.size>=targetKnown:(newlySelected>=(cfg.type==="spellbook"?cfg.learn:spellsToAdd));
  const atCantripCap=newlySelectedCantrips>=cantripsToAdd;

  return (
    <div>
      <div style={{background:"#0d1629",border:"1px solid #1e3a5f",borderRadius:10,padding:12,marginBottom:10,fontSize:11,color:"#94a3b8"}}>
        {cfg.type==="prepared"?(
          <div>📖 <strong style={{color:"#3b82f6"}}>{cls}</strong> prepares spells daily. Prepare up to <strong style={{color:"#f59e0b"}}>{targetKnown} spells</strong>. Toggle any spell on/off freely.</div>
        ):cfg.type==="spellbook"?(
          <div>📚 <strong style={{color:"#3b82f6"}}>{cls}</strong> Spellbook: Choose <strong style={{color:"#f59e0b"}}>{cfg.learn} new spells</strong> (up to Lv {maxSlotLv}). Previously learned spells stay.</div>
        ):(
          <div>✨ <strong style={{color:"#3b82f6"}}>{cls}</strong>: Learn <strong style={{color:"#f59e0b"}}>{spellsToAdd} new spell{spellsToAdd!==1?"s":""}</strong>. Max slot level: {maxSlotLv}{newSpellSlotsAvailable?<span style={{color:"#22c55e",fontWeight:"bold"}}> — NEW Lv {maxSlotLv} slots!</span>:""}.</div>
        )}
        {cantripsToAdd>0&&<div style={{marginTop:4}}>🔮 Learn <strong style={{color:"#a855f7"}}>{cantripsToAdd} new cantrip{cantripsToAdd!==1?"s":""}</strong>.</div>}
      </div>
      {/* Progress bar */}
      <div style={{display:"flex",gap:12,marginBottom:10,fontSize:11}}>
        <span style={{color:atSpellCap?"#22c55e":"#f59e0b",fontWeight:"bold"}}>{spellProgress}</span>
        {cantripProgress&&<span style={{color:atCantripCap?"#22c55e":"#a855f7",fontWeight:"bold"}}>{cantripProgress}</span>}
      </div>
      {/* Spell level tabs */}
      <div style={{display:"flex",gap:4,marginBottom:10,overflowX:"auto",paddingBottom:4}}>
        {levelTabs.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"5px 10px",background:tab===t?"#1e0d2e":"#0f172a",border:`1px solid ${tab===t?"#a855f7":"#334155"}`,borderRadius:6,color:tab===t?"#d8b4fe":"#475569",cursor:"pointer",fontWeight:"bold",fontSize:11,flexShrink:0}}>
            {t==="C"?"Cantrips":`Spell Lv ${t}`}
          </button>
        ))}
      </div>
      {/* Spell list */}
      <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:260,overflowY:"auto"}}>
        {getSpellsForTab().map(spellName=>{
          const isCantrip=tab==="C";
          const sel=isCantrip?selectedCantrips.has(spellName):selectedSpells.has(spellName);
          const wasPrev=isCantrip?prevCantripNames.includes(spellName):prevSpellNames.includes(spellName);
          // Disable adding if at cap (but always allow deselect)
          const isNewSel=sel&&!wasPrev;
          const atCap=isCantrip?atCantripCap:atSpellCap;
          const cantAdd=!sel&&atCap&&!wasPrev&&cfg.type!=="prepared";
          const prepCantAdd=!sel&&cfg.type==="prepared"&&selectedSpells.size>=targetKnown;
          const disabled=cantAdd||prepCantAdd;
          return (
            <button key={spellName} onClick={()=>toggleSpell(spellName,isCantrip)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"7px 12px",background:sel?(wasPrev?"#0a1f0d":"#1e0d2e"):"#0f172a",border:`1px solid ${sel?(wasPrev?"#22c55e":"#a855f7"):"#1e293b"}`,borderRadius:8,cursor:disabled?"not-allowed":"pointer",textAlign:"left",opacity:disabled?0.4:1,transition:"all 0.15s"}}>
              <div style={{width:14,height:14,borderRadius:3,border:`2px solid ${sel?(wasPrev?"#22c55e":"#a855f7"):"#334155"}`,background:sel?(wasPrev?"#22c55e":"#a855f7"):"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff"}}>{sel?"✓":""}</div>
              <span style={{fontSize:12,color:sel?(wasPrev?"#86efac":"#d8b4fe"):"#94a3b8",fontWeight:sel?"bold":"normal",flex:1}}>{spellName}</span>
              {wasPrev&&sel&&<span style={{fontSize:9,color:"#22c55e",fontWeight:"bold",textTransform:"uppercase",letterSpacing:0.5,flexShrink:0}}>{cfg.type==="prepared"?"Prepared":"Known"}</span>}
              {isNewSel&&<span style={{fontSize:9,color:"#a855f7",fontWeight:"bold",textTransform:"uppercase",letterSpacing:0.5,flexShrink:0}}>New ✓</span>}
              {disabled&&<span style={{fontSize:9,color:"#475569",flexShrink:0}}>Cap reached</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// FIGHTING_STYLE_DATABASE — Completes the choice-type schema pattern
// alongside MANEUVER_DATABASE. Consumed by Fighting Initiate feat and
// future Fighter/Paladin/Ranger class level-up choices.
// Each entry: { id, name, icon, desc, passiveEffects[] }
// ════════════════════════════════════════════════════════════════════
const FIGHTING_STYLE_DATABASE = {
  archery:          { id:"archery",          name:"Archery",              icon:"🏹", desc:"+2 bonus to attack rolls with ranged weapons.",                                                                        passiveEffects:[{type:"attack_bonus",weapon_type:"ranged",value:2,desc:"Archery Fighting Style: +2 to ranged attack rolls"}] },
  blind_fighting:   { id:"blind_fighting",   name:"Blind Fighting",       icon:"🙈", desc:"Blindsight 10 ft. You can attack invisible creatures within 10 ft without disadvantage.",                             passiveEffects:[{type:"blindsight",range:10,desc:"Blind Fighting Style: Blindsight 10 ft"}] },
  defense:          { id:"defense",          name:"Defense",              icon:"🛡", desc:"+1 to AC while wearing armor.",                                                                                         passiveEffects:[{type:"ac_bonus",value:1,condition:"wearing_armor",desc:"Defense Fighting Style: +1 AC while wearing armor"}] },
  dueling:          { id:"dueling",          name:"Dueling",              icon:"⚔️", desc:"+2 damage with a melee weapon held in one hand while other hand is empty.",                                           passiveEffects:[{type:"damage_bonus",value:2,condition:"one_handed_melee",desc:"Dueling Fighting Style: +2 damage when fighting with one weapon"}] },
  great_weapon:     { id:"great_weapon",     name:"Great Weapon Fighting", icon:"🗡️", desc:"Reroll 1s and 2s on damage dice for two-handed/versatile weapons. Must use new roll.",                             passiveEffects:[{type:"reroll_damage",min:2,condition:"two_handed",desc:"Great Weapon Fighting Style: Reroll 1s and 2s on two-handed weapon damage"}] },
  interception:     { id:"interception",     name:"Interception",         icon:"🤝", desc:"Reaction: reduce damage to a creature within 5 ft by 1d10 + PB (requires weapon or shield).",                       passiveEffects:[{type:"reaction_reduce_damage",desc:"Interception Fighting Style: Reaction to reduce ally's damage by 1d10+PB"}] },
  protection:       { id:"protection",       name:"Protection",           icon:"🛡", desc:"Reaction: impose disadvantage on attack rolls against an adjacent ally (requires shield).",                           passiveEffects:[{type:"reaction_protection",desc:"Protection Fighting Style: Reaction to impose disadvantage on attacks vs adjacent ally (shield)"}] },
  thrown_weapon:    { id:"thrown_weapon",    name:"Thrown Weapon Fighting",icon:"🎯", desc:"+2 damage with thrown weapons. Drawing a thrown weapon is free.",                                                   passiveEffects:[{type:"damage_bonus",value:2,condition:"thrown",desc:"Thrown Weapon Fighting: +2 damage with thrown weapons; free draw"}] },
  two_weapon:       { id:"two_weapon",       name:"Two-Weapon Fighting",  icon:"⚔️", desc:"When two-weapon fighting, add ability modifier to off-hand damage roll.",                                            passiveEffects:[{type:"offhand_damage_mod",desc:"Two-Weapon Fighting Style: Add ability mod to off-hand weapon damage"}] },
  unarmed_fighting: { id:"unarmed_fighting", name:"Unarmed Fighting",     icon:"👊", desc:"Unarmed Strikes deal 1d6 (1d8 if both hands free). Grappled creatures take 1d4 bludgeoning at start of your turn.", passiveEffects:[{type:"unarmed_damage",base:"1d6",both_hands:"1d8",desc:"Unarmed Fighting Style: Unarmed Strikes deal 1d6 (1d8 with both hands free)"}] },
};

const FIGHTING_STYLE_LIST = Object.values(FIGHTING_STYLE_DATABASE);

// ════════════════════════════════════════════════════════════════════
// MAGIC_ITEM_DATABASE — Rules Engine schema for magic items.
// requiresAttunement: true means the item must be attuned (max 3 at once).
// passiveEffects inject into the character sheet like feat passiveEffects.
// actions inject into the Action Economy UI like class ability actions.
// ════════════════════════════════════════════════════════════════════
const MAGIC_ITEM_DATABASE = {

  plus1_longsword: {
    id:"plus1_longsword", name:"+1 Longsword", rarity:"Uncommon",
    requiresAttunement:false,
    desc:"A finely balanced blade with a subtle magical edge. +1 to attack and damage rolls.",
    icon:"⚔️",
    passiveEffects:[
      { type:"attack_bonus", weapon_type:"melee", value:1, desc:"+1 Longsword: +1 to melee attack rolls" },
      { type:"damage_bonus", value:1, condition:"melee", desc:"+1 Longsword: +1 to melee damage rolls" },
    ],
    actions:[
      { id:"plus1_longsword_atk", label:"+1 Longsword", icon:"⚔️", actionType:"action",
        desc:"+1 to attack and damage. Versatile (1d10 two-handed).",
        attack:{ name:"+1 Longsword", bonus:null, bonusStat:"str", bonusExtra:1, damage:"1d8", type:"Slashing", mastery:"Flex", range:"Melee", properties:"Versatile" } },
    ],
  },

  plus1_shield: {
    id:"plus1_shield", name:"+1 Shield", rarity:"Uncommon",
    requiresAttunement:false,
    desc:"A magically reinforced shield. While held, it grants +3 AC total (+2 shield + 1 magic).",
    icon:"🛡",
    passiveEffects:[
      { type:"ac_bonus", value:1, desc:"+1 Shield: +1 AC (in addition to the shield's base +2)" },
    ],
    actions:[],
  },

  cloak_of_protection: {
    id:"cloak_of_protection", name:"Cloak of Protection", rarity:"Uncommon",
    requiresAttunement:true,
    desc:"While attuned, you gain +1 to AC and all saving throws. Requires attunement.",
    icon:"🧥",
    passiveEffects:[
      { type:"ac_bonus",   value:1, desc:"Cloak of Protection: +1 AC (attunement)" },
      { type:"save_bonus", value:1, desc:"Cloak of Protection: +1 to all saving throws (attunement)" },
    ],
    actions:[],
  },

  ring_of_evasion: {
    id:"ring_of_evasion", name:"Ring of Evasion", rarity:"Rare",
    requiresAttunement:true,
    desc:"3 charges. When you fail a DEX save, use your Reaction to expend 1 charge and succeed instead. Regains 1d3 charges each dawn.",
    icon:"💍",
    passiveEffects:[
      { type:"passive_bonus", desc:"Ring of Evasion: 3 charges — Reaction to turn a failed DEX save into a success" },
    ],
    actions:[
      { id:"ring_evasion_use", label:"Ring of Evasion", icon:"💍", actionType:"reaction",
        desc:"Expend 1 charge (max 3) to turn a failed DEX saving throw into a success." },
    ],
  },

  boots_of_speed: {
    id:"boots_of_speed", name:"Boots of Speed", rarity:"Rare",
    requiresAttunement:true,
    desc:"While attuned, click your heels as a Bonus Action to double your speed and impose disadvantage on Opportunity Attacks against you for 1 minute (10 rounds). Recharges at dawn.",
    icon:"👢",
    passiveEffects:[
      { type:"passive_bonus", desc:"Boots of Speed: Bonus Action to double speed + impose disadv on OAs for 1 min (1/day)" },
    ],
    actions:[
      { id:"boots_speed_activate", label:"Boots of Speed", icon:"👢", actionType:"bonus",
        desc:"Double your speed and give attackers disadvantage on Opportunity Attacks for 1 minute. Recharges at dawn." },
    ],
  },

  wand_of_magic_missiles: {
    id:"wand_of_magic_missiles", name:"Wand of Magic Missiles", rarity:"Uncommon",
    requiresAttunement:false,
    desc:"7 charges. Expend 1–3 charges as an Action to cast Magic Missile at 1st–3rd level (1–3 extra darts). Regains 1d6+1 charges each dawn; destroyed if reduced to 0 charges.",
    icon:"🪄",
    passiveEffects:[
      { type:"passive_bonus", desc:"Wand of Magic Missiles: 7 charges — cast Magic Missile (1–3 charges, 1st–3rd level). Regains 1d6+1/dawn." },
    ],
    actions:[
      { id:"wand_mm_1", label:"Magic Missile (1 charge)", icon:"🪄", actionType:"action",
        desc:"3 darts, each auto-hits for 1d4+1 Force. (1st level — expend 1 charge)" },
      { id:"wand_mm_2", label:"Magic Missile (2 charges)", icon:"🪄", actionType:"action",
        desc:"4 darts, each auto-hits for 1d4+1 Force. (2nd level — expend 2 charges)" },
      { id:"wand_mm_3", label:"Magic Missile (3 charges)", icon:"🪄", actionType:"action",
        desc:"5 darts, each auto-hits for 1d4+1 Force. (3rd level — expend 3 charges)" },
    ],
  },

  amulet_of_health: {
    id:"amulet_of_health", name:"Amulet of Health", rarity:"Rare",
    requiresAttunement:true,
    desc:"Your CON score is 19 while you wear this amulet (no effect if your CON is already 19 or higher). Requires attunement.",
    icon:"📿",
    passiveEffects:[
      { type:"passive_bonus", desc:"Amulet of Health: CON score becomes 19 (if lower than 19)" },
    ],
    actions:[],
  },

  periapt_of_wound_closure: {
    id:"periapt_of_wound_closure", name:"Periapt of Wound Closure", rarity:"Uncommon",
    requiresAttunement:true,
    desc:"While attuned: you stabilise automatically when dying. When you roll a Hit Die to regain HP, double the result. Requires attunement.",
    icon:"🔮",
    passiveEffects:[
      { type:"passive_bonus", desc:"Periapt of Wound Closure: Auto-stabilise when dying; double Hit Die healing rolls" },
    ],
    actions:[],
  },

  potion_of_healing: {
    id:"potion_of_healing", name:"Potion of Healing", rarity:"Common",
    requiresAttunement:false,
    desc:"Bonus Action: drink or administer. Restores 2d4+2 HP. Single use.",
    icon:"🧪",
    passiveEffects:[],
    actions:[
      { id:"potion_healing_drink", label:"Potion of Healing", icon:"🧪", actionType:"bonus",
        desc:"Drink this potion to regain 2d4+2 HP. Consumable — expended on use." },
    ],
  },

  potion_of_greater_healing: {
    id:"potion_of_greater_healing", name:"Potion of Greater Healing", rarity:"Uncommon",
    requiresAttunement:false,
    desc:"Bonus Action: drink or administer. Restores 4d4+4 HP. Single use.",
    icon:"🧪",
    passiveEffects:[],
    actions:[
      { id:"potion_gtr_healing_drink", label:"Potion of Greater Healing", icon:"🧪", actionType:"bonus",
        desc:"Drink this potion to regain 4d4+4 HP. Consumable — expended on use." },
    ],
  },

  cloak_of_elvenkind: {
    id:"cloak_of_elvenkind", name:"Cloak of Elvenkind", rarity:"Uncommon",
    requiresAttunement:true,
    desc:"While attuned and the hood is up: advantage on Stealth checks. Creatures relying on sight have disadvantage on Perception to find you. Requires attunement.",
    icon:"🧥",
    passiveEffects:[
      { type:"passive_bonus", desc:"Cloak of Elvenkind: Advantage on Stealth; disadvantage on enemy Perception vs you (hood up, attunement)" },
    ],
    actions:[],
  },

  bag_of_holding: {
    id:"bag_of_holding", name:"Bag of Holding", rarity:"Uncommon",
    requiresAttunement:false,
    desc:"A bag with an extradimensional interior (500 lb / 64 cu ft capacity). Weighs 15 lb regardless of contents. Creatures inside can breathe for 10 minutes. Destroyed if punctured or placed inside another extradimensional space.",
    icon:"🎒",
    passiveEffects:[
      { type:"passive_bonus", desc:"Bag of Holding: 500 lb / 64 cu ft extradimensional storage. Always weighs 15 lb." },
    ],
    actions:[],
  },

  plus1_dagger: {
    id:"plus1_dagger", name:"+1 Dagger", rarity:"Uncommon",
    requiresAttunement:false,
    desc:"+1 to attack and damage rolls. Finesse, Thrown (20/60 ft). Can be used with Sneak Attack.",
    icon:"🗡️",
    passiveEffects:[
      { type:"attack_bonus", weapon_type:"melee", value:1, desc:"+1 Dagger: +1 to attack rolls" },
      { type:"damage_bonus", value:1, condition:"melee", desc:"+1 Dagger: +1 to damage rolls" },
    ],
    actions:[
      { id:"plus1_dagger_atk", label:"+1 Dagger", icon:"🗡️", actionType:"action",
        desc:"+1 attack/damage. Finesse, Thrown 20/60 ft. Counts as magical.",
        attack:{ name:"+1 Dagger", bonus:null, bonusStat:"dex", bonusExtra:1, damage:"1d4", type:"Piercing", range:"Melee or 20/60 ft", properties:"Finesse, Thrown" } },
    ],
  },

  gauntlets_of_ogre_power: {
    id:"gauntlets_of_ogre_power", name:"Gauntlets of Ogre Power", rarity:"Uncommon",
    requiresAttunement:true,
    desc:"Your STR score is 19 while you wear these gauntlets (no effect if STR is already 19+). Requires attunement.",
    icon:"🥊",
    passiveEffects:[
      { type:"passive_bonus", desc:"Gauntlets of Ogre Power: STR score becomes 19 (if lower than 19, attunement)" },
    ],
    actions:[],
  },

  necklace_of_fireballs: {
    id:"necklace_of_fireballs", name:"Necklace of Fireballs", rarity:"Rare",
    requiresAttunement:false,
    desc:"1d6+3 beads. As an Action, detach 1–3 beads and throw up to 60 ft. Each bead explodes: 20-ft radius, DC 15 DEX save, 2d6 Fire per bead (beads not detached from a thrown set explode too). Beads explode if the necklace is consumed by fire.",
    icon:"📿",
    passiveEffects:[
      { type:"passive_bonus", desc:"Necklace of Fireballs: 1–3 beads per action, each 2d6 fire, 20-ft radius, DC 15 DEX save." },
    ],
    actions:[
      { id:"necklace_fireball_1", label:"Necklace — 1 Bead", icon:"📿", actionType:"action",
        desc:"Throw 1 bead: 2d6 fire damage, 20-ft radius, DC 15 DEX save." },
      { id:"necklace_fireball_3", label:"Necklace — 3 Beads", icon:"📿", actionType:"action",
        desc:"Throw 3 beads: 6d6 fire damage, 20-ft radius, DC 15 DEX save." },
    ],
  },

  sword_of_life_stealing: {
    id:"sword_of_life_stealing", name:"Sword of Life Stealing", rarity:"Rare",
    requiresAttunement:true,
    desc:"On a natural 20 against a non-construct, non-undead: deal extra 10 Necrotic damage and regain 10 HP. Requires attunement.",
    icon:"⚔️",
    passiveEffects:[
      { type:"passive_bonus", desc:"Sword of Life Stealing: Natural 20 vs living creatures deals +10 necrotic and heals you 10 HP (attunement)" },
    ],
    actions:[
      { id:"life_stealing_atk", label:"Sword of Life Stealing", icon:"⚔️", actionType:"action",
        desc:"Longsword. Nat 20 vs living: +10 necrotic damage, regain 10 HP.",
        attack:{ name:"Sword of Life Stealing", bonus:null, bonusStat:"str", bonusExtra:0, damage:"1d8", type:"Slashing", range:"Melee", properties:"Natural 20: +10 necrotic, heal 10 HP" } },
    ],
  },

};

// Returns merged passiveEffects + action-economy actions from all attuned magic items.
// Called at render time — never baked into character state — so attunement is live.
const getMagicItemEffects = (char) => {
  const attuned = char.attunedItems || [];
  const equipped = (char.equipment || []).filter(it => it.magicItemId && !MAGIC_ITEM_DATABASE[it.magicItemId]?.requiresAttunement);
  const ids = [
    ...attuned,
    ...equipped.map(it => it.magicItemId),
  ];
  const passiveEffects = [];
  const actions = [];
  ids.forEach(id => {
    const entry = MAGIC_ITEM_DATABASE[id];
    if (!entry) return;
    (entry.passiveEffects || []).forEach(pe => {
      if (!passiveEffects.some(x => x.desc === pe.desc)) passiveEffects.push({...pe, source:"magic_item", itemName:entry.name});
    });
    (entry.actions || []).forEach(a => {
      if (!actions.some(x => x.id === a.id)) actions.push({...a, source:"magic_item", itemName:entry.name});
    });
  });
  return { passiveEffects, actions };
};

// ─────────────────────────────────────────────────────────
// MANEUVER PICKER — Battle Master subclass choice UI
// Follows same pattern as SpellPicker.
// Props: existingNames[], count (max picks), onUpdate(selectedNames[])
// ─────────────────────────────────────────────────────────
function ManeuverPicker({ existingNames=[], count, onUpdate }) {
  const [selected, setSelected] = useState(new Set(existingNames));
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("all");

  const allTags = ["all", ...new Set(MANEUVER_LIST.flatMap(m => m.tags))];
  const newlyPicked = [...selected].filter(n => !existingNames.includes(n));
  const remaining = count - newlyPicked.length;
  const atCap = remaining <= 0;

  const filtered = MANEUVER_LIST.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    const matchTag = filterTag === "all" || m.tags.includes(filterTag);
    return matchSearch && matchTag;
  });

  const toggle = (name) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        // Only allow deselecting newly picked ones, not existing ones
        if (!existingNames.includes(name)) {
          next.delete(name);
          onUpdate([...next]);
        }
      } else if (!atCap) {
        next.add(name);
        onUpdate([...next]);
      }
      return next;
    });
  };

  const typeColors = {action:"#f59e0b", bonus:"#22c55e", reaction:"#a855f7", free:"#60a5fa"};
  const typeLabels = {action:"Action", bonus:"Bonus Action", reaction:"Reaction", free:"Free"};

  return (
    <div>
      {/* Header / progress */}
      <div style={{background:"#0a1a0a",border:"1px solid #15803d40",borderRadius:10,padding:"10px 14px",marginBottom:10,fontSize:11,color:"#94a3b8"}}>
        <div>⚔️ <strong style={{color:"#22c55e"}}>Battle Master</strong> — Choose <strong style={{color:"#f59e0b"}}>{count} maneuver{count!==1?"s":""}</strong>. Existing maneuvers remain.</div>
        {existingNames.length > 0 && (
          <div style={{marginTop:4,color:"#475569"}}>Already learned: <span style={{color:"#22c55e"}}>{existingNames.join(", ")}</span></div>
        )}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
        <span style={{fontSize:12,fontWeight:"bold",color:atCap?"#22c55e":"#f59e0b"}}>
          {newlyPicked.length}/{count} chosen{atCap?" ✓":""}
        </span>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search maneuvers…"
          style={{flex:1,minWidth:100,padding:"5px 9px",background:"#0f172a",border:"1px solid #334155",borderRadius:6,color:"#e2e8f0",fontSize:11,outline:"none"}}/>
        <select value={filterTag} onChange={e=>setFilterTag(e.target.value)}
          style={{padding:"5px 8px",background:"#0f172a",border:"1px solid #334155",borderRadius:6,color:"#94a3b8",fontSize:11,cursor:"pointer"}}>
          {allTags.map(t=><option key={t} value={t}>{t==="all"?"All Tags":t}</option>)}
        </select>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:300,overflowY:"auto"}}>
        {filtered.map(m => {
          const isExisting = existingNames.includes(m.name);
          const isSel = selected.has(m.name);
          const isNewPick = isSel && !isExisting;
          const cantAdd = !isSel && atCap && !isExisting;
          const color = typeColors[m.actionType] || "#94a3b8";
          return (
            <button key={m.id} onClick={()=>toggle(m.name)} disabled={isExisting}
              style={{display:"flex",gap:10,alignItems:"flex-start",padding:"9px 12px",textAlign:"left",
                background:isExisting?"#0a1a0a":isSel?"#0e1f1a":"#0f172a",
                border:`1px solid ${isExisting?"#1e293b":isSel?"#22c55e":"#1e293b"}`,
                borderLeft:`3px solid ${isExisting?"#334155":isSel?color:"#1e293b"}`,
                borderRadius:8,cursor:isExisting?"default":cantAdd?"not-allowed":"pointer",
                opacity:cantAdd?0.4:1,transition:"all 0.15s",width:"100%"}}
              onMouseEnter={e=>{if(!isExisting&&!cantAdd)e.currentTarget.style.borderColor=color+"66";}}
              onMouseLeave={e=>{if(!isExisting&&!cantAdd)e.currentTarget.style.borderColor=isSel?"#22c55e":"#1e293b";}}>
              {/* Checkbox */}
              <div style={{width:14,height:14,borderRadius:3,flexShrink:0,marginTop:2,
                border:`2px solid ${isExisting?"#334155":isSel?color:"#334155"}`,
                background:isExisting?"#1e293b":isSel?color:"transparent",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#000"}}>
                {isExisting?"—":isSel?"✓":""}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:2}}>
                  <span style={{fontSize:13}}>{m.icon}</span>
                  <span style={{fontWeight:"bold",color:isExisting?"#475569":isSel?"#e2e8f0":"#94a3b8",fontSize:12}}>{m.name}</span>
                  <span style={{fontSize:9,fontWeight:"bold",color,background:color+"18",border:`1px solid ${color}44`,borderRadius:3,padding:"1px 5px",textTransform:"uppercase",letterSpacing:0.5}}>
                    {typeLabels[m.actionType]||m.actionType}
                  </span>
                  {m.tags.map(t=>(
                    <span key={t} style={{fontSize:9,color:"#475569",background:"#1e293b",borderRadius:3,padding:"1px 4px"}}>{t}</span>
                  ))}
                  {isExisting&&<span style={{fontSize:9,color:"#22c55e",fontWeight:"bold",marginLeft:"auto"}}>✓ Learned</span>}
                  {isNewPick&&<span style={{fontSize:9,color:"#22c55e",fontWeight:"bold",marginLeft:"auto"}}>New ✓</span>}
                </div>
                <div style={{fontSize:10,color:"#475569",lineHeight:1.4}}>{m.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// FIGHTING STYLE PICKER — Fighting Initiate feat / future class choices
// ─────────────────────────────────────────────────────────
function FightingStylePicker({ existingNames=[], count=1, onUpdate }) {
  const [selected, setSelected] = useState(new Set(existingNames));
  const newlyPicked = [...selected].filter(n => !existingNames.includes(n));
  const atCap = newlyPicked.length >= count;

  const toggle = (name) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        if (!existingNames.includes(name)) { next.delete(name); onUpdate([...next]); }
      } else if (!atCap) {
        next.add(name); onUpdate([...next]);
      }
      return next;
    });
  };

  return (
    <div>
      <div style={{background:"#0a0f1a",border:"1px solid #1e3a5f40",borderRadius:10,padding:"10px 14px",marginBottom:10,fontSize:11,color:"#94a3b8"}}>
        🛡 Choose <strong style={{color:"#f59e0b"}}>{count} Fighting Style{count!==1?"s":""}</strong>.
        {existingNames.length>0&&<span style={{color:"#475569"}}> Already known: <span style={{color:"#60a5fa"}}>{existingNames.join(", ")}</span></span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <span style={{fontSize:12,fontWeight:"bold",color:atCap?"#22c55e":"#f59e0b"}}>
          {newlyPicked.length}/{count} chosen{atCap?" ✓":""}
        </span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:260,overflowY:"auto"}}>
        {FIGHTING_STYLE_LIST.map(s => {
          const isExisting = existingNames.includes(s.name);
          const isSel = selected.has(s.name);
          const cantAdd = !isSel && atCap && !isExisting;
          return (
            <button key={s.id} onClick={()=>toggle(s.name)} disabled={isExisting}
              style={{display:"flex",gap:10,alignItems:"flex-start",padding:"9px 12px",textAlign:"left",
                background:isExisting?"#0a0f1a":isSel?"#0d1629":"#0f172a",
                border:`1px solid ${isExisting?"#1e293b":isSel?"#3b82f6":"#1e293b"}`,
                borderLeft:`3px solid ${isExisting?"#334155":isSel?"#3b82f6":"#1e293b"}`,
                borderRadius:8,cursor:isExisting?"default":cantAdd?"not-allowed":"pointer",
                opacity:cantAdd?0.4:1,transition:"all 0.15s",width:"100%"}}>
              <div style={{width:14,height:14,borderRadius:3,flexShrink:0,marginTop:2,
                border:`2px solid ${isExisting?"#334155":isSel?"#3b82f6":"#334155"}`,
                background:isExisting?"#1e293b":isSel?"#3b82f6":"transparent",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff"}}>
                {isExisting?"—":isSel?"✓":""}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                  <span style={{fontSize:13}}>{s.icon}</span>
                  <span style={{fontWeight:"bold",color:isExisting?"#475569":isSel?"#93c5fd":"#94a3b8",fontSize:12}}>{s.name}</span>
                  {isExisting&&<span style={{fontSize:9,color:"#3b82f6",fontWeight:"bold",marginLeft:"auto"}}>✓ Known</span>}
                  {isSel&&!isExisting&&<span style={{fontSize:9,color:"#22c55e",fontWeight:"bold",marginLeft:"auto"}}>New ✓</span>}
                </div>
                <div style={{fontSize:10,color:"#475569",lineHeight:1.4}}>{s.desc}</div>
                {(s.passiveEffects||[]).length>0&&(
                  <div style={{marginTop:3,fontSize:9,color:"#60a5fa"}}>⚙ {s.passiveEffects[0].desc}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════
// CLASS RESOURCE TRACKER
// Reads resource definitions from char.passiveEffects (type="class_resource")
// and current counts from char.classResources. Renders pip rows.
// onSpend(id) decrements current; external caller handles updateCharacter.
// ═══════════════════════════════════════════════════════════════════════
function ClassResourceTracker({ char, onSpend, onRefill }) {
  const defs = (char.passiveEffects||[]).filter(pe=>pe.type==="class_resource");
  if (defs.length === 0) return null;
  const resources = char.classResources || {};

  return (
    <div style={{background:"#080e1a",border:"1px solid #1e3a5f",borderRadius:10,padding:"10px 14px",marginBottom:12}}>
      <div style={{fontSize:10,color:"#94a3b8",fontWeight:"bold",textTransform:"uppercase",letterSpacing:1,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>⚡ Class Resources</span>
        <button onClick={onRefill} title="Short Rest: refill Short Rest resources"
          style={{fontSize:9,color:"#475569",background:"#0f172a",border:"1px solid #1e293b",borderRadius:4,padding:"2px 7px",cursor:"pointer",letterSpacing:0.3}}>
          ☕ Short Rest
        </button>
      </div>
      {defs.map(def => {
        const current = resources[def.id]?.current ?? def.max;
        const pips = Array.from({length: def.max});
        return (
          <div key={def.id} style={{marginBottom:8,lastChild:{marginBottom:0}}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
              <span style={{fontSize:12}}>{def.icon}</span>
              <span style={{fontSize:11,fontWeight:"bold",color:"#e2e8f0",flex:1}}>{def.label}</span>
              <span style={{fontSize:10,color:def.color,fontFamily:"monospace",fontWeight:"bold"}}>{def.die}</span>
              <span style={{fontSize:10,color:"#475569"}}>{current}/{def.max}</span>
              <span style={{fontSize:9,color:"#334155",textTransform:"uppercase",letterSpacing:0.3}}>
                {def.resetOn==="short"?"Short":"Long"} Rest
              </span>
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {pips.map((_,i) => {
                const filled = i < current;
                return (
                  <button key={i} onClick={()=>{ if(filled) onSpend(def.id); }}
                    title={filled?`Spend 1 ${def.label}`:"Already spent"}
                    style={{
                      width:22, height:22, borderRadius:"50%",
                      background: filled ? def.color : "#0a0f1a",
                      border: `2px solid ${filled ? def.color : "#1e293b"}`,
                      cursor: filled ? "pointer" : "default",
                      transition:"all 0.15s",
                      boxShadow: filled ? `0 0 6px ${def.color}66` : "none",
                      flexShrink:0,
                    }}
                    onMouseEnter={e=>{ if(filled) e.currentTarget.style.transform="scale(1.15)"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.transform="scale(1)"; }}
                  />
                );
              })}
              {current < def.max && (
                <button onClick={()=>onRefill(def.id)}
                  title="Manually refill this resource"
                  style={{height:22,padding:"0 7px",borderRadius:11,background:"transparent",
                    border:`1px dashed #334155`,cursor:"pointer",fontSize:9,color:"#475569"}}>
                  +refill
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// LEVEL UP MODAL (2024 rules)
// ─────────────────────────────────────────────────────────
function LevelUpModal({ character, onClose, onConfirm }) {
  const newLevel=character.level+1;
  const newProf=PROF_BONUS[newLevel-1];
  const cls=character.class.split(" ")[0];
  const isSubclassLevel=newLevel===3&&!character.subclass;
  const isASILevel=[4,8,12,16,19].includes(newLevel);
  const isSpellcaster=!!SPELLCASTING_CONFIG[cls];
  const hitDie=HIT_DICE[cls]||8;
  const conMod=Math.floor((character.stats.con-10)/2);
  const avgHP=Math.floor(hitDie/2)+1+conMod;

  // Subclass gains at this exact level (for already-subclassed chars)
  const subclassGains=character.subclass?getSubclassGains(character.subclass,newLevel):null;

  const [hpChoice,setHpChoice]=useState("avg");
  const [hpRolled,setHpRolled]=useState(null);
  const [subclassChoice,setSubclassChoice]=useState("");
  const [asiMode,setAsiMode]=useState("asi");
  const [asiStats,setAsiStats]=useState({str:0,dex:0,con:0,int:0,wis:0,cha:0});
  const [selectedFeat,setSelectedFeat]=useState(null);
  const [featSearch,setFeatSearch]=useState("");
  const [updatedSpells,setUpdatedSpells]=useState(character.spells||{cantrips:[],slots:{1:{max:0,used:0}}});
  const [featCat,setFeatCat]=useState("All");
  const [selectedManeuvers,setSelectedManeuvers]=useState([...(character.choices?.maneuvers||[])]);
  const [selectedStyles,setSelectedStyles]=useState([...(character.choices?.fighting_styles||[])]);

  // ── Universal choice detection: subclass + feat sources ─────────────
  const effectiveGains=isSubclassLevel?getSubclassGains(subclassChoice||"",3):subclassGains;

  // Maneuver choices — subclass source (e.g. Battle Master Lv3/7/10)
  const scManeuverChoice=(effectiveGains?.choices||[]).find(c=>c.type==="maneuvers");
  // Maneuver choices — feat source (e.g. Martial Adept)
  const featData=(isASILevel&&asiMode==="feat"&&selectedFeat)?FEAT_DATABASE[selectedFeat.id]:null;
  const featManeuverChoice=(featData?.choices||[]).find(c=>c.type==="maneuvers");
  // Fighting style choices — feat source (e.g. Fighting Initiate)
  const featStyleChoice=(featData?.choices||[]).find(c=>c.type==="fighting_style");

  // Totals needed across all sources
  const totalManeuversNeeded=(scManeuverChoice?.count||0)+(featManeuverChoice?.count||0);
  const existingManeuvers=character.choices?.maneuvers||[];
  const newManeuverPicks=[...selectedManeuvers].filter(n=>!existingManeuvers.includes(n));
  const maneuversMissing=totalManeuversNeeded>0&&newManeuverPicks.length<totalManeuversNeeded;

  const existingStyles=character.choices?.fighting_styles||[];
  const newStylePicks=[...selectedStyles].filter(n=>!existingStyles.includes(n));
  const stylesMissing=featStyleChoice?newStylePicks.length<featStyleChoice.count:false;

  // Unified canProceed flag (all choice requirements satisfied)
  const choicesMissing=maneuversMissing||stylesMissing;

  const totalASI=Object.values(asiStats).reduce((a,b)=>a+b,0);
  const subclassOptions=SUBCLASSES_2024[cls]||[];
  const hpGain=hpChoice==="avg"?avgHP:(hpRolled!==null?hpRolled+conMod:null);
  const handleRollHP=()=>{ const r=rollDie(hitDie); setHpRolled(r); playDice(); };

  // Feat prereq checking
  const featCategories=["All",...[...new Set(GENERAL_FEATS_2024.map(f=>f.cat))]];
  const filteredFeats=GENERAL_FEATS_2024.filter(f=>{
    const matchCat=featCat==="All"||f.cat===featCat;
    const matchSearch=!featSearch||f.name.toLowerCase().includes(featSearch.toLowerCase());
    return matchCat&&matchSearch;
  });
  const checkPrereqs=(feat)=>({ok:feat.prereqs.every(p=>p.check(character,newLevel)),fails:feat.prereqs.filter(p=>!p.check(character,newLevel))});
  const alreadyHas=(feat)=>(character.features||[]).some(f=>f.name.toLowerCase()===feat.name.toLowerCase());

  const canConfirm=hpGain!==null&&
    (!isSubclassLevel||!!subclassChoice)&&
    (!isASILevel||asiMode==="feat"||totalASI===2)&&
    (!isASILevel||asiMode==="asi"||!!selectedFeat)&&
    !choicesMissing;

  const handleConfirm=()=>{
    if(!canConfirm) return;

    // ── 1. Base ASI (if not taking a feat) ────────────────────────
    let baseStats={...character.stats};
    if(isASILevel&&asiMode==="asi") for(const k in asiStats) baseStats[k]+=asiStats[k];

    // ── 2. Subclass name for this level ───────────────────────────
    const scName=isSubclassLevel?subclassChoice:character.subclass;
    const gainsAtThisLevel=isSubclassLevel
      ? (getSubclassGains(scName,3)||null)
      : (subclassGains||null);

    // ── 3. Seed feature list with subclass label ───────────────────
    const seedFeatures=[...(character.features||[])];
    if(isSubclassLevel) seedFeatures.push({name:`Subclass: ${scName}`,type:"Class",desc:`${cls} subclass chosen at Level 3.`});

    // ── 4. Build spell slots for new level first ───────────────────
    const slottedSpells=isSpellcaster?buildSpellsObj(cls,newLevel,updatedSpells):updatedSpells;

    // ── 5. Run applyMechanics ENGINE — single authoritative pass ──
    const engineResult = applyMechanics({
      stats:    baseStats,
      features: seedFeatures,
      attacks:  [...(character.attacks||[])],
      spells:   slottedSpells,
      passiveEffects: [...(character.passiveEffects||[])],
      featId:   (isASILevel&&asiMode==="feat"&&selectedFeat) ? selectedFeat.id : null,
      scGains:  gainsAtThisLevel,
      choiceSelections: { maneuvers: selectedManeuvers, fighting_styles: selectedStyles },
    }, newProf);

    // ── 6. Derived stats (skills, initiative) ─────────────────────
    const newSkills=recalcSkills(character.skills||[],engineResult.stats,newProf);
    const newInitiative=computedInitiative({
      stats:engineResult.stats,
      proficiency:newProf,
      passiveEffects:engineResult.passiveEffects,
    });

    // ── 7. Sync classResources from new passiveEffects (initialize new, upgrade existing) ──
    const prevResources = character.classResources||{};
    const newClassResources = {...prevResources};
    engineResult.passiveEffects.filter(pe=>pe.type==="class_resource").forEach(pe=>{
      if (!newClassResources[pe.id]) {
        // First time acquiring this resource — initialize at full
        newClassResources[pe.id] = { current: pe.max };
      } else {
        // Upgrade (e.g. d8→d10): keep current but cap at new max
        newClassResources[pe.id] = { current: Math.min(newClassResources[pe.id].current, pe.max) };
      }
    });

    onConfirm({
      level:newLevel, proficiency:newProf,
      subclass:isSubclassLevel?scName:character.subclass,
      hp:{...character.hp,current:character.hp.current+hpGain,max:character.hp.max+hpGain},
      stats:engineResult.stats,
      features:engineResult.features,
      skills:newSkills,
      initiative:newInitiative,
      class:isSubclassLevel?`${character.class} (${scName})`:character.class,
      spells:engineResult.spells,
      attacks:engineResult.attacks,
      passiveEffects:engineResult.passiveEffects,
      choices:{...(character.choices||{}), maneuvers:engineResult.choices?.maneuvers||selectedManeuvers, fighting_styles:engineResult.choices?.fighting_styles||selectedStyles},
      classResources:newClassResources,
    });
  };

  const Hdr=({icon,label,color="#94a3b8"})=>(
    <div style={{fontSize:11,color,fontWeight:"bold",textTransform:"uppercase",letterSpacing:1,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
      <span>{icon}</span><span>{label}</span>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"#000b",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{background:"#0a0f1a",border:"2px solid #f59e0b",borderRadius:20,width:"100%",maxWidth:620,maxHeight:"92vh",overflowY:"auto",padding:28}}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:36,marginBottom:4}}>⬆️</div>
          <h2 style={{color:"#f59e0b",fontFamily:"Georgia,serif",fontSize:24,margin:0}}>{character.name} reaches Level {newLevel}!</h2>
          <div style={{color:"#475569",fontSize:12,marginTop:4}}>Proficiency Bonus is now +{newProf}</div>
        </div>

        {/* ── SUBCLASS GAINS (already have subclass, at a feature level) ── */}
        {subclassGains&&(subclassGains.features.length>0||subclassGains.spells.length>0||subclassGains.proficiencies.length>0)&&(
          <div style={{marginBottom:22,background:"#0f172a",borderRadius:12,padding:14,border:"1px solid #a855f720"}}>
            <Hdr icon="✨" label={`${character.subclass} — Level ${newLevel} Features`} color="#a855f7"/>
            {subclassGains.features.map((f,i)=>(
              <div key={i} style={{marginBottom:8,background:"#1e0d2e",borderRadius:8,padding:"10px 12px",borderLeft:"3px solid #a855f7"}}>
                <div style={{fontWeight:"bold",color:"#d8b4fe",fontSize:13,marginBottom:3}}>{f.name}</div>
                <div style={{fontSize:11,color:"#94a3b8",lineHeight:1.5}}>{f.desc}</div>
              </div>
            ))}
            {subclassGains.spells.length>0&&(
              <div style={{marginTop:8}}>
                <div style={{fontSize:10,color:"#7c3aed",fontWeight:"bold",textTransform:"uppercase",marginBottom:6}}>Domain/Oath Spells Unlocked</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {subclassGains.spells.map((sp,i)=>(
                    <span key={i} style={{fontSize:11,background:"#2d1b69",border:"1px solid #4c1d95",borderRadius:5,padding:"3px 9px",color:"#c4b5fd",fontWeight:"bold"}}>
                      {sp.name} <span style={{color:"#7c3aed",fontWeight:"normal"}}>Lv{sp.lvl}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {subclassGains.proficiencies.length>0&&(
              <div style={{marginTop:8,fontSize:11,color:"#94a3b8"}}>
                🛡 <strong style={{color:"#d8b4fe"}}>New Proficiencies:</strong> {subclassGains.proficiencies.join(", ")}
              </div>
            )}
            <div style={{fontSize:10,color:"#475569",marginTop:8,fontStyle:"italic"}}>These features will be automatically applied when you confirm.</div>
          </div>
        )}

        {/* ── HP ── */}
        <div style={{marginBottom:22,background:"#0f172a",borderRadius:12,padding:14}}>
          <Hdr icon="❤️" label={`Hit Points — d${hitDie} (CON ${conMod>=0?"+":""}${conMod})`} color="#ef4444"/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setHpChoice("avg")} style={{flex:1,padding:"10px",background:hpChoice==="avg"?"#1c1407":"transparent",border:`1px solid ${hpChoice==="avg"?"#f59e0b":"#334155"}`,borderRadius:8,color:hpChoice==="avg"?"#f59e0b":"#64748b",cursor:"pointer",fontWeight:"bold",fontSize:13}}>
              Average +{avgHP}
            </button>
            <button onMouseDown={()=>setHpChoice("roll")} onClick={handleRollHP} style={{flex:1,padding:"10px",background:hpChoice==="roll"?"#1c1407":"transparent",border:`1px solid ${hpChoice==="roll"?"#f59e0b":"#334155"}`,borderRadius:8,color:hpChoice==="roll"?"#f59e0b":"#64748b",cursor:"pointer",fontWeight:"bold",fontSize:13}}>
              🎲 Roll {hpRolled!==null?`→ ${hpRolled}+${conMod}=${hpRolled+conMod}`:`d${hitDie}`}
            </button>
          </div>
        </div>

        {/* ── SUBCLASS CHOICE (level 3) ── */}
        {isSubclassLevel&&(
          <div style={{marginBottom:22,background:"#0f172a",borderRadius:12,padding:14}}>
            <Hdr icon="✨" label={`Choose your ${CLASSES_2024.find(c=>c.name===cls)?.subclassName||"Subclass"}`} color="#a855f7"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
              {subclassOptions.map(sc=>{
                const preview=getSubclassGains(sc,3);
                return (
                  <button key={sc} onClick={()=>setSubclassChoice(sc)}
                    style={{padding:"10px 12px",background:subclassChoice===sc?"#1e0d2e":"transparent",border:`1px solid ${subclassChoice===sc?"#a855f7":"#334155"}`,borderRadius:8,color:subclassChoice===sc?"#d8b4fe":"#64748b",cursor:"pointer",fontSize:12,textAlign:"left",transition:"all 0.15s"}}>
                    <div style={{fontWeight:"bold",marginBottom:2}}>{sc}</div>
                    {preview&&preview.features[0]&&<div style={{fontSize:10,color:"#475569",lineHeight:1.3}}>{preview.features[0].name}</div>}
                  </button>
                );
              })}
            </div>
            <input value={subclassChoice} onChange={e=>setSubclassChoice(e.target.value)} placeholder="Or type a custom subclass…" style={{...inputSt,fontSize:12}}/>
            {/* Preview chosen subclass features */}
            {subclassChoice&&getSubclassGains(subclassChoice,3)&&(
              <div style={{marginTop:12,borderTop:"1px solid #1e293b",paddingTop:12}}>
                <div style={{fontSize:10,color:"#a855f7",fontWeight:"bold",textTransform:"uppercase",marginBottom:8}}>Level 3 Features You'll Gain</div>
                {(getSubclassGains(subclassChoice,3)?.features||[]).map((f,i)=>(
                  <div key={i} style={{background:"#150a29",borderRadius:6,padding:"8px 10px",marginBottom:6,borderLeft:"2px solid #a855f7"}}>
                    <div style={{fontWeight:"bold",color:"#d8b4fe",fontSize:12}}>{f.name}</div>
                    <div style={{fontSize:10,color:"#94a3b8",marginTop:2,lineHeight:1.4}}>{f.desc}</div>
                  </div>
                ))}
                {(getSubclassGains(subclassChoice,3)?.spells||[]).length>0&&(
                  <div style={{marginTop:6}}>
                    <div style={{fontSize:10,color:"#7c3aed",fontWeight:"bold",marginBottom:4}}>Domain/Oath Spells Added</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {(getSubclassGains(subclassChoice,3)?.spells||[]).map((sp,i)=>(
                        <span key={i} style={{fontSize:11,background:"#2d1b69",border:"1px solid #4c1d95",borderRadius:4,padding:"2px 8px",color:"#c4b5fd"}}>{sp.name} (Lv{sp.lvl})</span>
                      ))}
                    </div>
                  </div>
                )}
                {(getSubclassGains(subclassChoice,3)?.proficiencies||[]).length>0&&(
                  <div style={{marginTop:6,fontSize:11,color:"#94a3b8"}}>
                    🛡 Proficiencies: {(getSubclassGains(subclassChoice,3)?.proficiencies||[]).join(", ")}
                  </div>
                )}
                {/* Maneuver choices scroll to the picker section below */}
                {(getSubclassGains(subclassChoice,3)?.choices||[]).find(c=>c.type==="maneuvers")&&(
                  <div style={{marginTop:10,borderTop:"1px solid #1e293b",paddingTop:8,fontSize:11,color:"#22c55e",fontWeight:"bold"}}>
                    ⚔️ Maneuver selection required — see picker below ↓
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SPELLS ── */}
        {isSpellcaster&&(
          <div style={{marginBottom:22,background:"#0f172a",borderRadius:12,padding:14}}>
            <Hdr icon="📚" label="Spell Selection" color="#3b82f6"/>
            <SpellPicker character={character} newLevel={newLevel} currentSpells={updatedSpells} onUpdate={setUpdatedSpells}/>
          </div>
        )}

        {/* ── ASI / FEAT ── */}
        {isASILevel&&(
          <div style={{marginBottom:22,background:"#0f172a",borderRadius:12,padding:14}}>
            <Hdr icon="🌟" label={`Level ${newLevel} Bonus — ASI or General Feat`} color="#22c55e"/>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <button onClick={()=>setAsiMode("asi")} style={{flex:1,padding:"9px",background:asiMode==="asi"?"#0a1f0d":"transparent",border:`1px solid ${asiMode==="asi"?"#22c55e":"#334155"}`,borderRadius:8,color:asiMode==="asi"?"#86efac":"#64748b",cursor:"pointer",fontWeight:"bold",fontSize:12}}>+2 Ability Score (ASI)</button>
              <button onClick={()=>setAsiMode("feat")} style={{flex:1,padding:"9px",background:asiMode==="feat"?"#0d1629":"transparent",border:`1px solid ${asiMode==="feat"?"#3b82f6":"#334155"}`,borderRadius:8,color:asiMode==="feat"?"#93c5fd":"#64748b",cursor:"pointer",fontWeight:"bold",fontSize:12}}>General Feat</button>
            </div>

            {asiMode==="asi"?(
              <div>
                <div style={{fontSize:10,color:"#475569",marginBottom:8}}>Distribute 2 points across ability scores (max 20 cap).</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>
                  {Object.entries(asiStats).map(([k,v])=>(
                    <div key={k} style={{textAlign:"center"}}>
                      <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase",marginBottom:4}}>{k}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
                        <button onClick={()=>{ if(totalASI<2&&character.stats[k]+v<20) setAsiStats(p=>({...p,[k]:p[k]+1})); }} style={{width:24,height:24,background:v>0?"#166534":"#1e293b",border:"none",borderRadius:4,color:"#fff",cursor:"pointer",fontWeight:"bold",fontSize:14}}>+</button>
                        <span style={{color:"#f59e0b",fontWeight:"bold",fontSize:14}}>{character.stats[k]+v}</span>
                        <button onClick={()=>{ if(v>0) setAsiStats(p=>({...p,[k]:p[k]-1})); }} style={{width:24,height:24,background:v>0?"#7f1d1d":"#1e293b",border:"none",borderRadius:4,color:"#fff",cursor:"pointer",fontWeight:"bold",fontSize:14}}>−</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{textAlign:"center",marginTop:8,fontSize:11,color:totalASI===2?"#22c55e":"#f59e0b",fontWeight:"bold"}}>{totalASI}/2 points used</div>
              </div>
            ):(
              <div>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <input value={featSearch} onChange={e=>setFeatSearch(e.target.value)} placeholder="Search feats…" style={{...inputSt,flex:1,fontSize:12}}/>
                  <select value={featCat} onChange={e=>setFeatCat(e.target.value)} style={{...inputSt,flex:"0 0 auto",width:130,cursor:"pointer"}}>
                    {featCategories.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:300,overflowY:"auto"}}>
                  {filteredFeats.map(feat=>{
                    const {ok,fails}=checkPrereqs(feat);
                    const has=alreadyHas(feat);
                    const disabled=!ok||has;
                    const isChosen=selectedFeat?.id===feat.id;
                    const fd=FEAT_DATABASE[feat.id];
                    const hasStatBonus=fd&&Object.keys(fd.statBonuses||{}).length>0;
                    const hasActions=(fd?.actions||[]).length>0;
                    const hasSpells=(fd?.grantedCantrips||[]).length+(fd?.grantedSpells||[]).length>0;
                    const hasPassives=(fd?.passiveEffects||[]).length>0;
                    const hasChoices=(feat.choices||[]).length>0;
                    return (
                      <button key={feat.id} onClick={()=>{ if(!disabled) setSelectedFeat(isChosen?null:feat); }}
                        disabled={disabled}
                        style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 12px",background:isChosen?"#0d1629":disabled?"#0a0f1a":"#0f172a",border:`1px solid ${isChosen?"#3b82f6":disabled?"#1a2435":"#1e293b"}`,borderRadius:10,cursor:disabled?"not-allowed":"pointer",textAlign:"left",opacity:disabled?0.6:1,transition:"all 0.15s"}}
                        onMouseEnter={e=>{ if(!disabled) e.currentTarget.style.borderColor="#3b82f655"; }}
                        onMouseLeave={e=>{ if(!disabled) e.currentTarget.style.borderColor=isChosen?"#3b82f6":"#1e293b"; }}>
                        <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${isChosen?"#3b82f6":disabled?"#1e293b":"#334155"}`,background:isChosen?"#3b82f6":"transparent",flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff"}}>{isChosen?"✓":""}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap",marginBottom:2}}>
                            <span style={{fontWeight:"bold",color:isChosen?"#93c5fd":disabled?"#475569":"#e2e8f0",fontSize:13}}>{feat.name}</span>
                            <span style={{fontSize:9,fontWeight:"bold",background:"#1e293b",border:"1px solid #334155",borderRadius:3,padding:"1px 5px",color:"#64748b",textTransform:"uppercase"}}>{feat.cat}</span>
                            {hasStatBonus&&<span style={{fontSize:9,background:"#14532d",borderRadius:3,padding:"1px 5px",color:"#86efac",fontWeight:"bold"}}>+{Object.entries(fd.statBonuses).map(([k,v])=>`${v} ${k.toUpperCase()}`).join(" ")}</span>}
                            {hasActions&&<span style={{fontSize:9,background:"#78350f",borderRadius:3,padding:"1px 5px",color:"#fcd34d",fontWeight:"bold"}}>+Action</span>}
                            {hasChoices&&<span style={{fontSize:9,background:"#064e3b",borderRadius:3,padding:"1px 5px",color:"#6ee7b7",fontWeight:"bold"}}>⚙ Choose {(feat.choices||[]).map(c=>c.count+" "+c.type).join(", ")}</span>}
                            {hasSpells&&<span style={{fontSize:9,background:"#1e1b4b",borderRadius:3,padding:"1px 5px",color:"#a5b4fc",fontWeight:"bold"}}>+Spells</span>}
                            {hasPassives&&<span style={{fontSize:9,background:"#0a1520",border:"1px solid #1e3a5f",borderRadius:3,padding:"1px 5px",color:"#60a5fa",fontWeight:"bold"}}>+Passive</span>}
                            {has&&<span style={{fontSize:9,background:"#166534",borderRadius:3,padding:"1px 5px",color:"#86efac",fontWeight:"bold"}}>Known</span>}
                          </div>
                          <div style={{fontSize:11,color:disabled?"#334155":"#64748b",lineHeight:1.4}}>{feat.desc}</div>
                          {/* Expanded mechanics preview when selected */}
                          {isChosen&&fd&&(
                            <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:5}}>
                              {hasSpells&&(
                                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                  {(fd.grantedCantrips||[]).map((s,i)=><span key={i} style={{fontSize:10,background:"#1e1b4b",border:"1px solid #3730a3",borderRadius:3,padding:"1px 6px",color:"#a5b4fc"}}>🔮 {s} (cantrip)</span>)}
                                  {(fd.grantedSpells||[]).map((s,i)=><span key={i} style={{fontSize:10,background:"#1e1b4b",border:"1px solid #3730a3",borderRadius:3,padding:"1px 6px",color:"#a5b4fc"}}>✨ {s.name} (Lv{s.lvl})</span>)}
                                </div>
                              )}
                              {hasPassives&&(
                                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                                  {(fd.passiveEffects||[]).map((pe,i)=><div key={i} style={{fontSize:10,color:"#60a5fa"}}>⚙ {pe.desc}</div>)}
                                </div>
                              )}
                              {hasActions&&(
                                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                  {(fd.actions||[]).map((a,i)=><span key={i} style={{fontSize:10,background:"#1a0f00",border:"1px solid #92400e",borderRadius:3,padding:"1px 6px",color:"#fcd34d"}}>⚔ {a.name} ({a.damage})</span>)}
                                </div>
                              )}
                            </div>
                          )}
                          {fails.length>0&&(
                            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
                              {fails.map((f,fi)=>(
                                <span key={fi} style={{fontSize:10,background:"#7f1d1d20",border:"1px solid #7f1d1d50",borderRadius:4,padding:"1px 7px",color:"#f87171",fontWeight:"bold"}}>⚠ {f.label}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}


        {/* ── CHOICE PICKERS — Maneuvers (subclass + feat combined) ── */}
        {totalManeuversNeeded>0&&(
          <div style={{marginBottom:22,background:"#0f172a",borderRadius:12,padding:14,border:"1px solid #22c55e30"}}>
            <Hdr icon="⚔️" label={
              [scManeuverChoice&&`${scManeuverChoice.count} from ${subclassChoice||character.subclass||"Subclass"}`,
               featManeuverChoice&&`${featManeuverChoice.count} from ${selectedFeat?.name||"Feat"}`]
              .filter(Boolean).join(" + ")
            } color="#22c55e"/>
            {(scManeuverChoice||featManeuverChoice)&&(
              <div style={{fontSize:11,color:"#475569",marginBottom:10}}>
                {scManeuverChoice&&<div>⚔️ <strong style={{color:"#22c55e"}}>{scManeuverChoice.label}</strong> <span style={{color:"#334155"}}>(subclass feature)</span></div>}
                {featManeuverChoice&&<div>🎖 <strong style={{color:"#6ee7b7"}}>{featManeuverChoice.label}</strong> <span style={{color:"#334155"}}>({selectedFeat?.name} feat)</span></div>}
                <div style={{marginTop:4,color:"#475569"}}>Pick <strong style={{color:"#f59e0b"}}>{totalManeuversNeeded} total</strong> maneuver{totalManeuversNeeded!==1?"s":""} below.</div>
              </div>
            )}
            <ManeuverPicker
              existingNames={existingManeuvers}
              count={totalManeuversNeeded}
              onUpdate={setSelectedManeuvers}
            />
            {maneuversMissing&&(
              <div style={{marginTop:8,fontSize:11,color:"#f59e0b",fontWeight:"bold"}}>
                ⚠ Choose {totalManeuversNeeded-newManeuverPicks.length} more maneuver{totalManeuversNeeded-newManeuverPicks.length!==1?"s":""} to continue.
              </div>
            )}
          </div>
        )}

        {/* ── CHOICE PICKERS — Fighting Styles (feat-granted) ── */}
        {featStyleChoice&&(
          <div style={{marginBottom:22,background:"#0f172a",borderRadius:12,padding:14,border:"1px solid #3b82f630"}}>
            <Hdr icon="🛡" label={`${featStyleChoice.label} — ${selectedFeat?.name||"Feat"}`} color="#3b82f6"/>
            <FightingStylePicker
              existingNames={existingStyles}
              count={featStyleChoice.count}
              onUpdate={setSelectedStyles}
            />
            {stylesMissing&&(
              <div style={{marginTop:8,fontSize:11,color:"#f59e0b",fontWeight:"bold"}}>
                ⚠ Choose {featStyleChoice.count-newStylePicks.length} more fighting style{featStyleChoice.count-newStylePicks.length!==1?"s":""} to continue.
              </div>
            )}
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
          <button onClick={onClose} style={{padding:"12px",background:"transparent",border:"1px solid #334155",borderRadius:10,color:"#64748b",cursor:"pointer",fontWeight:"bold"}}>Cancel</button>
          <button onClick={handleConfirm} disabled={!canConfirm}
            style={{padding:"12px",background:canConfirm?"#b45309":"#1e293b",border:"none",borderRadius:10,color:canConfirm?"#fff":"#475569",cursor:canConfirm?"pointer":"not-allowed",fontWeight:"900",fontSize:14,transition:"all 0.2s"}}>
            Level Up! ⬆️
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// CHARACTER BUILDER (2024 flow: Class → Background → Species → Origin Feat → Name/Review)
// ─────────────────────────────────────────────────────────
const STANDARD_ARRAY=[15,14,13,12,10,8];

function CharacterBuilder({ onClose, onCreate }) {
  const [step,setStep]=useState(0); // 0=Class 1=AbilityScores 2=Background 3=Species 4=Feat 5=Finalize
  const [cls,setCls]=useState(null);
  const [arrayAssign,setArrayAssign]=useState({}); // {str:15,dex:14,...}
  const [bg,setBg]=useState(null);
  const [statMode,setStatMode]=useState("split"); // "split" = +2/+1, "triple" = 3×+1
  const [statAssign,setStatAssign]=useState({});
  const [species,setSpecies]=useState(null);
  const [feat,setFeat]=useState(null);
  const [charName,setCharName]=useState("");

  const STEPS=["Class","Ability Scores","Background","Species","Origin Feat","Finalize"];

  const usedScores=Object.values(arrayAssign);
  const allAssigned=Object.keys(arrayAssign).length===6;
  const baseStats={str:arrayAssign.str||8,dex:arrayAssign.dex||8,con:arrayAssign.con||8,int:arrayAssign.int||8,wis:arrayAssign.wis||8,cha:arrayAssign.cha||8};

  const applyBackgroundStats=()=>{
    const s={...baseStats};
    if(!bg) return s;
    if(statMode==="split"){
      const ks=Object.keys(bg.stats);
      ks.forEach((k,i)=>{ s[k]+=i===0?2:1; });
    } else {
      Object.entries(statAssign).forEach(([k,v])=>{ s[k]+=(v||0); });
    }
    return s;
  };

  const finalStats=applyBackgroundStats();

  const handleCreate=()=>{
    if(!cls||!allAssigned||!bg||!species||!feat||!charName.trim()) return;
    const stats=finalStats;
    const prof=2;
    const hitDie=HIT_DICE[cls.name]||8;
    const conMod=Math.floor((stats.con-10)/2);
    const maxHp=hitDie+conMod;
    const dexMod=Math.floor((stats.dex-10)/2);
    const hasFeatAlert=feat.id==="alert";
    const initiative=dexMod+(hasFeatAlert?prof:0);
    const newChar={
      id:`char_${Date.now()}`, name:charName.trim(), species:species.name, speciesId:species.id,
      class:cls.name, subclass:null, background:bg.name, backgroundId:bg.id, originFeat:feat.name,
      level:1, xp:0, inspiration:false, exhaustion:0,
      currency:{pp:0,gp:10,sp:0,cp:0},
      stats, hp:{current:maxHp,max:maxHp,temp:0}, ac:10+dexMod,
      speed:species.speed, initiative, proficiency:prof,
      skills: makeSkills(stats, Object.fromEntries(bg.skills.map(s=>[s,true]))),
      attacks:[{ name:"Unarmed Strike", bonus:Math.floor((stats.str-10)/2)+prof, damage:`${Math.floor((stats.str-10)/2)+1}`, type:"Bludgeoning", mastery:"", range:"Melee", properties:"" }],
      spells:{ cantrips:[], lvl1:[], slots:{1:{max:0,used:0}} },
      features:[
        ...species.traits.map(t=>({ name:t.split("(")[0].trim(), type:"Species", desc:t })),
        { name:feat.name, type:"Origin Feat", desc:feat.desc },
      ],
      equipment:[{ name:"Backpack",weight:5,qty:1,category:"Gear",equipped:false },{ name:"Rations",weight:2,qty:5,category:"Consumable",equipped:false }],
      avatarColor:["#475569","#3730a3","#92400e","#991b1b","#065f46","#1e3a5f"][Math.floor(Math.random()*6)],
    };
    onCreate(newChar);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"#000c",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{background:"#0a0f1a",border:"2px solid #334155",borderRadius:20,width:"100%",maxWidth:680,maxHeight:"92vh",overflowY:"auto",display:"flex",flexDirection:"column"}}>
        {/* Header */}
        <div style={{padding:"20px 24px 0",borderBottom:"1px solid #1e293b"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <h2 style={{color:"#e2e8f0",fontFamily:"Georgia,serif",fontSize:20,margin:0}}>⚔️ New Character — 2024 Rules</h2>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:18}}>✕</button>
          </div>
          {/* Step bar */}
          <div style={{display:"flex",gap:4,marginBottom:0}}>
            {STEPS.map((s,i)=>(
              <button key={i} onClick={()=>{ if(i<step) setStep(i); }} style={{flex:1,padding:"8px 4px",background:"none",border:"none",borderBottom:`2px solid ${i===step?"#f59e0b":i<step?"#475569":"transparent"}`,color:i===step?"#f59e0b":i<step?"#94a3b8":"#334155",cursor:i<step?"pointer":"default",fontSize:10,fontWeight:"bold",textTransform:"uppercase",letterSpacing:0.5,transition:"all 0.2s"}}>{i+1}. {s}</button>
            ))}
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
          {/* STEP 0: CLASS */}
          {step===0&&(
            <div>
              <div style={{color:"#64748b",fontSize:12,marginBottom:16}}>Choose your class. This determines your hit die, saving throw proficiencies, and subclass path (selected at Level 3).</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {CLASSES_2024.map(c=>(
                  <button key={c.name} onClick={()=>setCls(c)} style={{padding:"12px 14px",background:cls?.name===c.name?"#1c1407":"#0f172a",border:`1px solid ${cls?.name===c.name?"#f59e0b":"#1e293b"}`,borderRadius:10,cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
                    <div style={{fontWeight:"bold",color:"#e2e8f0",fontSize:13,marginBottom:2}}>{c.name}</div>
                    <div style={{fontSize:10,color:"#475569"}}>d{c.hitDie} • Saves: {c.saves.map(s=>s.toUpperCase()).join("/")} • Armor: {c.armor}</div>
                    <div style={{fontSize:10,color:"#64748b",marginTop:2}}>{c.subclassName} at Level 3</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1: ABILITY SCORES (Standard Array) */}
          {step===1&&(
            <div>
              <div style={{color:"#64748b",fontSize:12,marginBottom:4}}>Assign the <strong style={{color:"#f59e0b"}}>Standard Array</strong> [15, 14, 13, 12, 10, 8] to your six ability scores. Each score can only be used once.</div>
              <div style={{fontSize:10,color:"#475569",marginBottom:16}}>Tip: Put your highest scores in your class's primary stat and Constitution.</div>
              {/* Unassigned scores */}
              <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:10,padding:12,marginBottom:16}}>
                <div style={{fontSize:10,color:"#94a3b8",fontWeight:"bold",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Available Scores</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {STANDARD_ARRAY.map((score,si)=>{
                    const isUsed=usedScores.includes(score)&&Object.entries(arrayAssign).some(([,v])=>v===score);
                    return (
                      <div key={si} style={{width:42,height:42,borderRadius:8,background:isUsed?"#1e293b":"#1c1407",border:`2px solid ${isUsed?"#334155":"#f59e0b"}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:16,color:isUsed?"#334155":"#f59e0b",opacity:isUsed?0.4:1,transition:"all 0.2s"}}>{score}</div>
                    );
                  })}
                </div>
              </div>
              {/* Stat assignment grid */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {["str","dex","con","int","wis","cha"].map(stat=>{
                  const assigned=arrayAssign[stat];
                  const mod=assigned?Math.floor((assigned-10)/2):null;
                  const available=STANDARD_ARRAY.filter(s=>!usedScores.includes(s)||s===assigned);
                  return (
                    <div key={stat} style={{background:"#0f172a",border:`2px solid ${assigned?"#f59e0b":"#1e293b"}`,borderRadius:12,padding:12,textAlign:"center"}}>
                      <div style={{fontSize:10,fontWeight:"bold",color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{stat}</div>
                      <div style={{fontSize:28,fontWeight:900,color:assigned?"#e2e8f0":"#334155",marginBottom:2}}>{assigned||"?"}</div>
                      <div style={{fontSize:12,color:"#f59e0b",fontWeight:"bold",marginBottom:8,minHeight:18}}>{mod!==null?(mod>=0?"+":"")+mod:""}</div>
                      <div style={{display:"flex",gap:4,justifyContent:"center",flexWrap:"wrap"}}>
                        {available.map((s,si)=>(
                          <button key={si} onClick={()=>setArrayAssign(p=>({...p,[stat]:s}))} style={{padding:"3px 7px",background:s===assigned?"#78350f":"#1e293b",border:`1px solid ${s===assigned?"#f59e0b":"#334155"}`,borderRadius:5,color:s===assigned?"#fbbf24":"#64748b",fontSize:11,fontWeight:"bold",cursor:"pointer",transition:"all 0.15s"}}>{s}</button>
                        ))}
                        {assigned&&<button onClick={()=>setArrayAssign(p=>{const n={...p};delete n[stat];return n;})} style={{padding:"3px 6px",background:"none",border:"1px solid #334155",borderRadius:5,color:"#475569",fontSize:11,cursor:"pointer"}}>✕</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{textAlign:"center",marginTop:14,fontSize:12,color:allAssigned?"#22c55e":"#f59e0b",fontWeight:"bold"}}>{Object.keys(arrayAssign).length}/6 assigned{allAssigned?" — Ready to proceed!":""}</div>
            </div>
          )}

          {/* STEP 2: BACKGROUND */}
          {step===2&&(
            <div>
              <div style={{color:"#64748b",fontSize:12,marginBottom:12}}>In 2024, your Background grants your ability score increases (+2/+1 or three +1s), skill proficiencies, and your Origin Feat.</div>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <button onClick={()=>setStatMode("split")} style={{flex:1,padding:"8px",background:statMode==="split"?"#1c1407":"#0f172a",border:`1px solid ${statMode==="split"?"#f59e0b":"#334155"}`,borderRadius:8,color:statMode==="split"?"#f59e0b":"#64748b",cursor:"pointer",fontWeight:"bold",fontSize:12}}>+2 / +1 (standard)</button>
                <button onClick={()=>setStatMode("triple")} style={{flex:1,padding:"8px",background:statMode==="triple"?"#1c1407":"#0f172a",border:`1px solid ${statMode==="triple"?"#f59e0b":"#334155"}`,borderRadius:8,color:statMode==="triple"?"#f59e0b":"#64748b",cursor:"pointer",fontWeight:"bold",fontSize:12}}>Three +1s (flexible)</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {BACKGROUNDS_2024.map(b=>(
                  <button key={b.id} onClick={()=>{setBg(b);setFeat(ORIGIN_FEATS_2024.find(f=>f.name===b.feat)||null);}} style={{padding:"12px 14px",background:bg?.id===b.id?"#1c1407":"#0f172a",border:`1px solid ${bg?.id===b.id?"#f59e0b":"#1e293b"}`,borderRadius:10,cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
                    <div style={{fontWeight:"bold",color:"#e2e8f0",fontSize:13,marginBottom:2}}>{b.name}</div>
                    <div style={{fontSize:10,color:"#f59e0b"}}>{Object.entries(b.stats).map(([k,v])=>`${k.toUpperCase()} +${v}`).join(", ")}</div>
                    <div style={{fontSize:10,color:"#64748b"}}>Skills: {b.skills.join(", ")}</div>
                    <div style={{fontSize:10,color:"#a855f7",marginTop:2}}>✨ {b.feat}</div>
                  </button>
                ))}
              </div>
              {bg&&statMode==="triple"&&(
                <div style={{marginTop:16,background:"#0f172a",border:"1px solid #1e293b",borderRadius:10,padding:14}}>
                  <div style={{fontSize:11,color:"#94a3b8",fontWeight:"bold",marginBottom:10}}>Assign three +1 bonuses (may apply to the same stat for +2, or different stats):</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>
                    {["str","dex","con","int","wis","cha"].map(k=>{
                      const v=statAssign[k]||0;
                      const total=Object.values(statAssign).reduce((a,b)=>a+b,0);
                      return (
                        <div key={k} style={{textAlign:"center"}}>
                          <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase",marginBottom:4}}>{k}</div>
                          <button onClick={()=>{ if(total<3) setStatAssign(p=>({...p,[k]:(p[k]||0)+1})); }} style={{display:"block",width:"100%",background:v>0?"#1c1407":"#1e293b",border:`1px solid ${v>0?"#f59e0b":"#334155"}`,borderRadius:6,color:"#fff",cursor:"pointer",padding:"6px 0",fontWeight:"bold",fontSize:12}}>
                            +{v}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{textAlign:"right",marginTop:8,fontSize:11,color:Object.values(statAssign).reduce((a,b)=>a+b,0)===3?"#22c55e":"#f59e0b"}}>{Object.values(statAssign).reduce((a,b)=>a+b,0)}/3 assigned</div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SPECIES */}
          {step===3&&(
            <div>
              <div style={{color:"#64748b",fontSize:12,marginBottom:16}}>Choose your Species. In 2024, Species no longer provides ability score increases — those come from your Background.</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {SPECIES_2024.map(s=>(
                  <button key={s.id} onClick={()=>setSpecies(s)} style={{padding:"12px 14px",background:species?.id===s.id?"#0d1629":"#0f172a",border:`1px solid ${species?.id===s.id?"#3b82f6":"#1e293b"}`,borderRadius:10,cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
                    <div style={{fontWeight:"bold",color:"#e2e8f0",fontSize:13,marginBottom:4}}>{s.name}</div>
                    <div style={{fontSize:10,color:"#475569",marginBottom:4}}>Speed {s.speed} ft • {s.size}{s.darkvision>0?` • Darkvision ${s.darkvision}ft`:""}</div>
                    {s.traits.slice(0,2).map((t,i)=><div key={i} style={{fontSize:10,color:"#64748b",lineHeight:1.4}}>• {t.split("(")[0].trim()}</div>)}
                    {s.traits.length>2&&<div style={{fontSize:10,color:"#334155"}}>+ {s.traits.length-2} more traits</div>}
                  </button>
                ))}
              </div>
              {species&&(
                <div style={{marginTop:14,background:"#0d1629",border:"1px solid #1e293b",borderRadius:10,padding:14}}>
                  <div style={{fontWeight:"bold",color:"#3b82f6",marginBottom:8}}>{species.name} — All Traits</div>
                  {species.traits.map((t,i)=><div key={i} style={{fontSize:12,color:"#94a3b8",marginBottom:4}}>• {t}</div>)}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: ORIGIN FEAT */}
          {step===4&&(
            <div>
              <div style={{color:"#64748b",fontSize:12,marginBottom:4}}>Your Background grants you the <strong style={{color:"#a855f7"}}>{bg?.feat}</strong> Origin Feat. You may also swap to any other Origin Feat.</div>
              {bg&&<div style={{fontSize:11,color:"#475569",marginBottom:14}}>Recommended by {bg.name} background</div>}
              <div style={{display:"grid",gridTemplateColumns:"1fr",gap:8}}>
                {ORIGIN_FEATS_2024.map(f=>(
                  <button key={f.id} onClick={()=>setFeat(f)} style={{padding:"12px 14px",background:feat?.id===f.id?"#1e0d2e":"#0f172a",border:`1px solid ${feat?.id===f.id?"#a855f7":f.name===bg?.feat?"#475569":"#1e293b"}`,borderRadius:10,cursor:"pointer",textAlign:"left",transition:"all 0.15s",display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{fontWeight:"bold",color:"#e2e8f0",fontSize:13}}>{f.name}</span>
                        {f.name===bg?.feat&&<span style={{fontSize:9,fontWeight:"bold",background:"#78350f",color:"#fcd34d",padding:"1px 6px",borderRadius:4,textTransform:"uppercase"}}>Recommended</span>}
                      </div>
                      <div style={{fontSize:11,color:"#64748b",lineHeight:1.5}}>{f.desc}</div>
                    </div>
                    {feat?.id===f.id&&<span style={{color:"#a855f7",fontSize:18,flexShrink:0}}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: FINALIZE */}
          {step===5&&(
            <div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,color:"#94a3b8",fontWeight:"bold",marginBottom:8}}>Character Name</div>
                <input value={charName} onChange={e=>setCharName(e.target.value)} placeholder="Enter your character's name…" style={{...inputSt,fontSize:16,padding:"10px 14px"}}/>
              </div>
              {/* Summary */}
              <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:16,marginBottom:16}}>
                <div style={{fontWeight:"bold",color:"#f59e0b",fontSize:14,marginBottom:12}}>Character Summary</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
                  {[["Class",cls?.name],["Background",bg?.name],["Species",species?.name],["Origin Feat",feat?.name],["Hit Die",`d${HIT_DICE[cls?.name]||8}`],["Speed",`${species?.speed||30} ft`]].map(([l,v])=>(
                    <div key={l} style={{background:"#0a0f1a",borderRadius:6,padding:"8px 10px"}}>
                      <div style={{color:"#475569",fontSize:10,textTransform:"uppercase",marginBottom:2}}>{l}</div>
                      <div style={{color:"#e2e8f0",fontWeight:"bold"}}>{v||"—"}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12}}>
                  <div style={{fontSize:11,color:"#94a3b8",fontWeight:"bold",marginBottom:8}}>Ability Scores (with Background bonus)</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:4}}>
                    {Object.entries(finalStats).map(([k,v])=>(
                      <div key={k} style={{textAlign:"center",background:"#0a0f1a",borderRadius:6,padding:"8px 4px"}}>
                        <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase"}}>{k}</div>
                        <div style={{fontSize:16,fontWeight:"900",color:"#e2e8f0"}}>{v}</div>
                        <div style={{fontSize:10,color:"#f59e0b"}}>({Math.floor((v-10)/2)>=0?"+":""}{Math.floor((v-10)/2)})</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{marginTop:12,fontSize:11,color:"#475569"}}>
                  <div>Skill Proficiencies from Background: <span style={{color:"#94a3b8"}}>{bg?.skills?.join(", ")}</span></div>
                  <div>Starting HP: <span style={{color:"#22c55e",fontWeight:"bold"}}>{(HIT_DICE[cls?.name]||8)+Math.floor((finalStats.con-10)/2)}</span></div>
                </div>
              </div>
              <div style={{color:"#475569",fontSize:11,fontStyle:"italic"}}>Note: You'll be able to add equipment, additional skill choices, and spells after creation.</div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div style={{padding:"16px 24px",borderTop:"1px solid #1e293b",display:"flex",gap:10}}>
          <button onClick={()=>step>0?setStep(s=>s-1):onClose()} style={{padding:"10px 20px",background:"#0f172a",border:"1px solid #334155",borderRadius:10,color:"#64748b",cursor:"pointer",fontWeight:"bold"}}>
            {step===0?"Cancel":"← Back"}
          </button>
          <div style={{flex:1}}/>
          {step<5?(
            <button onClick={()=>setStep(s=>s+1)}
              disabled={(step===0&&!cls)||(step===1&&!allAssigned)||(step===2&&(!bg||(statMode==="triple"&&Object.values(statAssign).reduce((a,b)=>a+b,0)!==3)))||(step===3&&!species)||(step===4&&!feat)}
              style={{padding:"10px 24px",background:"#b45309",border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontWeight:"900",fontSize:14,opacity:((step===0&&!cls)||(step===1&&!allAssigned)||(step===2&&(!bg||(statMode==="triple"&&Object.values(statAssign).reduce((a,b)=>a+b,0)!==3)))||(step===3&&!species)||(step===4&&!feat))?0.4:1}}>
              Next →
            </button>
          ):(
            <button onClick={handleCreate} disabled={!charName.trim()} style={{padding:"10px 24px",background:"#166534",border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontWeight:"900",fontSize:14,opacity:!charName.trim()?0.4:1}}>
              ✨ Create Character
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────
const SLOT_KEYS={ 1:`${STORAGE_PREFIX}1`, 2:`${STORAGE_PREFIX}2`, 3:`${STORAGE_PREFIX}3` };

export default function App() {
  const [activeSlot,setActiveSlot]=useState(null);
  const [slotsData,setSlotsData]=useState({});
  const [characters,setCharacters]=useState([]);
  const [history,setHistory]=useState([]);
  const [input,setInput]=useState("");
  const [isGenerating,setIsGenerating]=useState(false);
  const [activeTab,setActiveTab]=useState("actions");
  const [selectedCharId,setSelectedCharId]=useState(null);
  const [viewMode,setViewMode]=useState("sheet");
  const [showCombat,setShowCombat]=useState(true);
  const [showChat,setShowChat]=useState(true);
  const [rollMode,setRollMode]=useState("normal");
  const [combatState,setCombatState]=useState({isActive:false,round:1,turn:0,combatants:[],turnResources:{action:1,bonusAction:1,reaction:1,movement:30}});
  const [storyState,setStoryState]=useState({location:"Neverwinter - Port Docks",recentEvents:"The party has just arrived at the docks.",quests:[],npcs:[],journal:[],events:[],shops:VENDOR_INVENTORIES,activeShop:null,partyStash:{gold:0,items:[]}});
  const [mapState,setMapState]=useState({tokens:[]});
  const [dashTab,setDashTab]=useState("quests");
   const [qFilter,setQFilter]=useState("Active");
   const [npcFilter,setNpcFilter]=useState("All");
  const [showLevelUp,setShowLevelUp]=useState(false);
  const [showBuilder,setShowBuilder]=useState(false);
  const [autoSpeak,setAutoSpeak]=useState(false);
  const chatEndRef=useRef(null);
  const lastDMIdxRef=useRef(-1);
  const { speak,stop,isSpeaking,speakingId }=useTTS();

  const activeChar=characters.find(c=>c.id===selectedCharId)||characters[0]||null;

  // CSS injections
  useEffect(()=>{
    if(document.getElementById("dt-styles")) return;
    const s=document.createElement("style"); s.id="dt-styles";
    s.textContent=`
      @keyframes tts-pulse { 0%,100%{opacity:0.3} 50%{opacity:0.9} }
      @keyframes tts-bar { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
      ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#0a0f1a} ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
    `;
    document.head.appendChild(s);
  },[]);

  // Auto-speak
  useEffect(()=>{
    if(!autoSpeak) return;
    const dms=history.map((m,i)=>({m,i})).filter(({m})=>m.role==="assistant");
    if(!dms.length) return;
    const latest=dms[dms.length-1];
    if(latest.i>lastDMIdxRef.current){ lastDMIdxRef.current=latest.i; setTimeout(()=>speak(latest.m.content,latest.i),250); }
  },[history,autoSpeak]);

  // Bloodied auto-condition sync
  useEffect(()=>{
    if(!combatState.isActive) return;
    setCombatState(prev=>{
      let changed=false;
      const combs=prev.combatants.map(c=>{
        const isBloodied=c.hp<=c.maxHp/2;
        const hasBloodied=(c.status||[]).includes("Bloodied");
        if(isBloodied&&!hasBloodied){ changed=true; return {...c,status:[...(c.status||[]),"Bloodied"]}; }
        if(!isBloodied&&hasBloodied){ changed=true; return {...c,status:(c.status||[]).filter(s=>s!=="Bloodied")}; }
        return c;
      });
      return changed?{...prev,combatants:combs}:prev;
    });
  },[combatState.combatants.map(c=>c.hp).join(","),combatState.isActive]);

  // XP auto level-up trigger
  const levelUpShownRef=useRef(new Set());
  useEffect(()=>{
    characters.forEach(char=>{
      if(char.level<20&&(char.xp||0)>=XP_THRESHOLDS[char.level]){
        const key=`${char.id}-${char.level+1}`;
        if(!levelUpShownRef.current.has(key)){
          levelUpShownRef.current.add(key);
          setSelectedCharId(char.id);
          setTimeout(()=>{ setShowLevelUp(true); addSystem(`🎉 ${char.name} has enough XP to reach Level ${char.level+1}!`); },400);
        }
      }
    });
  },[characters.map(c=>`${c.id}:${c.xp}:${c.level}`).join("|")]);

  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:"smooth"}); },[history,isGenerating]);

  // Load slots
  useEffect(()=>{
    const slots={};
    [1,2,3].forEach(id=>{ try{ const s=localStorage.getItem(SLOT_KEYS[id]); if(s) slots[id]=JSON.parse(s); }catch(e){} });
    setSlotsData(slots);
  },[]);

  // Auto-save
  useEffect(()=>{
    if(activeSlot&&characters.length>0){
      const data={characters,history:history.slice(-50),combatState,mapState,storyState,lastSaved:new Date().toISOString()};
      localStorage.setItem(SLOT_KEYS[activeSlot],JSON.stringify(data));
      setSlotsData(p=>({...p,[activeSlot]:data}));
    }
  },[characters,history,combatState,mapState,storyState,activeSlot]);

  const updateCharacter=(id,updates)=>{
    setCharacters(prev=>prev.map(c=>c.id===id?{...c,...updates}:c));
    if(updates.hp){
      setCombatState(prev=>({...prev,combatants:prev.combatants.map(c=>c.id===id?{...c,hp:updates.hp.current,maxHp:updates.hp.max??c.maxHp}:c)}));
    }
  };

  const addSystem=(text)=>setHistory(p=>[...p,{role:"system",content:text}]);

  const performRoll=(mod,fmtFn,rollType="check")=>{
    const exPenalty=activeChar?activeChar.exhaustion*(-2):0;
    const effectiveMod=mod+exPenalty;
    const r1=rollDie(20),r2=rollDie(20);
    // Auto-disadvantage from active conditions (Poisoned, Frightened, Prone, Restrained, Blinded)
    const condDisadv = activeChar && conditionForcesDisadvantage(activeCharWithStatus, rollType);
    let roll=r1, rollText=`${r1}`, modeOverride=rollMode;
    if(condDisadv && rollMode!=="advantage") modeOverride="disadvantage";
    if(modeOverride==="advantage"){ roll=Math.max(r1,r2); rollText=`${roll}(Adv:${r1},${r2})`; }
    else if(modeOverride==="disadvantage"){ roll=Math.min(r1,r2); rollText=`${roll}(Dis:${r1},${r2})`; }
    const total=roll+effectiveMod;
    const exNote=exPenalty<0?` [Exhaustion${exPenalty}]`:"";
    // Build condition note if condition forced the roll type
    const condNames = activeCharWithStatus ? [...getActiveConditions(activeCharWithStatus)]
      .filter(id=>(STATUS_CONDITIONS_DATABASE[id]?.forcesDisadvantage||[]).includes(rollType))
      .map(id=>STATUS_CONDITIONS_DATABASE[id]?.name).join(", ") : "";
    const condNote = condDisadv&&rollMode!=="advantage" ? ` [Disadv: ${condNames}]` : "";
    const flavor=input.trim()?`${input.trim()}. `:"";
    const msg=fmtFn(roll,rollText,total,flavor,exNote+condNote);
    setInput(msg); playDice(); setRollMode("normal");
  };

  // ═══════════════════════════════════════════════════════════════════
  // handleVttAction — executes monster automation from [VTT_ACTION] blocks.
  // Actions run sequentially. Each fires synchronously before setHistory().
  // ═══════════════════════════════════════════════════════════════════
  const handleVttAction = (action) => {
    if (!action?.type) return;

    switch (action.type) {

      // ── move ────────────────────────────────────────────────────────
      // Teleports a token to (destCol, destRow) on the grid.
      // Enforces: speed gate (distance ≤ monster speed in ft),
      //           wall / door collision (same logic as manual drag).
      case "move": {
        const { tokenId, destCol, destRow } = action;
        setMapState(prev => {
          const tokens  = prev.tokens || [];
          const tok     = tokens.find(t => t.id === tokenId || t.name === tokenId);
          if (!tok) return prev;

          const G   = prev.gridCell  ?? 50;
          const gox = prev.gridOffX  ?? 0;
          const goy = prev.gridOffY  ?? 0;

          // Convert destination cell → world-space centre
          const rawCx = gox + destCol * G + G / 2;
          const rawCy = goy + destRow * G + G / 2;

          // Speed gate — look up combatant speed (default 30 ft)
          const cbt = combatState.combatants?.find(c => c.id === tokenId || c.name === tokenId);
          const speedFt = cbt?.speed ?? 30;
          const distFt  = Math.hypot(rawCx - tok.cx, rawCy - tok.cy) / G * 5;
          if (distFt > speedFt + 0.5) {         // 0.5 ft tolerance for diagonal rounding
            addSystem(`⚠ Move blocked: ${tok.name} tried to move ${Math.round(distFt)} ft (speed ${speedFt} ft).`);
            return prev;
          }

          // Collision gate — reuse segment intersection against walls
          const walls = prev.walls || [];
          const blockers = walls.filter(w => w.wtype === "wall" || w.wtype === "door-closed" || w.wtype === "window");
          const blocked  = blockers.some(w => segSegIntersect(tok.cx, tok.cy, rawCx, rawCy, w.x1, w.y1, w.x2, w.y2));
          if (blocked) {
            addSystem(`⚠ Move blocked: ${tok.name}'s path crosses a wall or closed door.`);
            return prev;
          }

          const updated = tokens.map(t => t.id === tok.id ? { ...t, cx: rawCx, cy: rawCy } : t);
          return { ...prev, tokens: updated };
        });
        break;
      }

      // ── attack ──────────────────────────────────────────────────────
      // Rolls d20 + attackBonus vs target AC.
      // On hit: rolls damageDice, calls handleCombatUpdate to apply damage.
      case "attack": {
        const { tokenId, targetId, attackBonus = 0, damageDice = "1d6", damageType = "damage" } = action;
        const attacker = (mapState.tokens || []).find(t => t.id === tokenId || t.name === tokenId);
        const target   = characters.find(c => c.id === targetId || c.name === targetId)
                      || combatState.combatants?.find(c => c.id === targetId || c.name === targetId);
        if (!attacker || !target) break;

        const targetAC = target.ac ?? target.hp?.max ?? 10;   // fallback
        const d20      = rollDie(20);
        const atkTotal = d20 + attackBonus;
        const crit     = d20 === 20;
        const hit      = crit || atkTotal >= targetAC;

        if (!hit) {
          const msg = `⚔ ${attacker.name} attacks ${target.name}: d20(${d20})+${attackBonus}=${atkTotal} vs AC ${targetAC} — MISS`;
          addSystem(msg);
          break;
        }

        // Roll damage (double dice on crit per 2024 rules)
        const diceMatch = damageDice.match(/(\d+)d(\d+)(?:([+-])(\d+))?/);
        let dmg = 0;
        if (diceMatch) {
          const cnt   = parseInt(diceMatch[1]) * (crit ? 2 : 1);
          const sides = parseInt(diceMatch[2]);
          const flat  = diceMatch[4] ? parseInt(diceMatch[4]) * (diceMatch[3] === "-" ? -1 : 1) : 0;
          for (let i = 0; i < cnt; i++) dmg += rollDie(sides);
          dmg = Math.max(0, dmg + flat);
        } else {
          dmg = 1;
        }

        const curHp  = target.hp?.current ?? (combatState.combatants?.find(c => c.id === targetId)?.hp ?? 0);
        const newHp  = Math.max(0, curHp - dmg);
        const critTxt = crit ? " — CRITICAL HIT! 🎯" : "";
        const msg = `⚔ ${attacker.name} attacks ${target.name}: d20(${d20})+${attackBonus}=${atkTotal} vs AC ${targetAC} — HIT${critTxt}! ${damageDice}=${dmg} ${damageType} → ${target.name} ${newHp}/${target.hp?.max ?? "?"} HP`;
        addSystem(msg);

        // Apply to characters (PC) or combatants (foe)
        const isPc = characters.some(c => c.id === targetId || c.name === targetId);
        if (isPc) {
          handleCombatUpdate({ action: "update_combatants", combatants: [{ id: targetId, name: target.name, hp: newHp }] });
        } else {
          handleCombatUpdate({ action: "update_combatants", combatants: [{ id: targetId, hp: newHp }] });
        }
        break;
      }

      // ── save ────────────────────────────────────────────────────────
      // Rolls d20 + target's stat modifier vs DC.
      // On fail: applies failDamageDice and optional condition.
      case "save": {
        const { targetId, stat = "dex", dc = 13, failDamageDice, damageType = "damage", condition } = action;
        const target = characters.find(c => c.id === targetId || c.name === targetId);
        if (!target) break;

        const statVal  = target.stats?.[stat] ?? 10;
        const mod      = Math.floor((statVal - 10) / 2);
        const profSaves = (CLASSES_2024.find(c => c.name === target.class?.split(" ")[0])?.saves || []);
        const isProfSave = profSaves.includes(stat) || (target.passiveEffects || []).some(pe => pe.type === "save_prof" && pe.stat === stat);
        const totalMod = mod + (isProfSave ? (target.proficiency ?? 2) : 0);
        const roll     = rollDie(20);
        const total    = roll + totalMod;
        const success  = total >= dc;
        const sign     = totalMod >= 0 ? "+" : "";

        if (success) {
          addSystem(`🛡 ${target.name} ${stat.toUpperCase()} save: d20(${roll})${sign}${totalMod}=${total} vs DC ${dc} — SUCCESS`);
          break;
        }

        // Failed: roll damage and/or apply condition
        let dmg = 0;
        let dmgTxt = "";
        if (failDamageDice) {
          const dm = failDamageDice.match(/(\d+)d(\d+)(?:([+-])(\d+))?/);
          if (dm) {
            const cnt = parseInt(dm[1]), sides = parseInt(dm[2]);
            const flat = dm[4] ? parseInt(dm[4]) * (dm[3] === "-" ? -1 : 1) : 0;
            for (let i = 0; i < cnt; i++) dmg += rollDie(sides);
            dmg = Math.max(0, dmg + flat);
          }
          const curHp = target.hp?.current ?? 0;
          const newHp = Math.max(0, curHp - dmg);
          handleCombatUpdate({ action: "update_combatants", combatants: [{ id: targetId, name: target.name, hp: newHp }] });
          dmgTxt = ` — ${failDamageDice}=${dmg} ${damageType} (${newHp}/${target.hp?.max ?? "?"} HP)`;
        }
        const condTxt = condition ? ` + ${condition}` : "";
        if (condition) handleCombatUpdate({ action: "update_status", targetId, status: condition, add: true });
        addSystem(`💥 ${target.name} ${stat.toUpperCase()} save: d20(${roll})${sign}${totalMod}=${total} vs DC ${dc} — FAIL${dmgTxt}${condTxt}`);
        break;
      }

      // ── end_turn ────────────────────────────────────────────────────
      // Advances the initiative tracker to the next combatant.
      case "end_turn": {
        handleCombatUpdate({ action: "next_turn" });
        break;
      }

      default: break;
    }
  };

  const handleCombatUpdate=(update)=>{
    if(update.action==="update_story_state"){ setStoryState(p=>({...p,location:update.location||p.location,recentEvents:update.recentEvents||p.recentEvents})); return; }
    if(update.action==="update_quest"){ setStoryState(p=>{ const qs=[...(p.quests||[])]; const idx=qs.findIndex(q=>q.id===update.questId); if(idx>=0) qs[idx]={...qs[idx],...update}; else qs.push({id:update.questId,title:update.title,description:update.description,status:update.status||"Active"}); return {...p,quests:qs}; }); return; }
    if(update.action==="update_npc"){ setStoryState(p=>{ const ns=[...(p.npcs||[])]; const idx=ns.findIndex(n=>n.id===update.npcId); if(idx>=0) ns[idx]={...ns[idx],...update}; else ns.push({id:update.npcId,name:update.name,location:update.location,status:update.status,description:update.description}); return {...p,npcs:ns}; }); return; }
    if(update.action==="log_event"){ setStoryState(p=>({...p,events:[...(p.events||[]),{id:Date.now(),timestamp:new Date().toISOString(),description:update.description}]})); return; }
    if(update.action==="add_shop_items"){ setStoryState(p=>{ const shops={...(p.shops||VENDOR_INVENTORIES)}; if(update.vendorName&&Array.isArray(update.items)){ shops[update.vendorName]=[...(shops[update.vendorName]||[]),...update.items.filter(ni=>!(shops[update.vendorName]||[]).some(ei=>ei.name===ni.name))]; } return {...p,shops}; }); return; }
    if(update.action==="add_to_inventory"){ setCharacters(prev=>prev.map(c=>{ if(c.name.toLowerCase()===(update.characterName||"").toLowerCase()){ const eq=[...(c.equipment||[])]; const idx=eq.findIndex(i=>i.name.toLowerCase()===(update.itemName||"").toLowerCase()); if(idx>=0) eq[idx]={...eq[idx],qty:(eq[idx].qty||1)+(update.quantity||1)}; else eq.push({name:update.itemName,qty:update.quantity||1,desc:update.description||"",category:update.category||"Gear",equipped:false,weight:0,magicItemId:update.magicItemId||null,isConsumable:update.isConsumable||false}); return {...c,equipment:eq}; } return c; })); return; }
    if(update.action==="award_loot"){ setStoryState(p=>({ ...p, partyStash:{ gold:(p.partyStash?.gold||0)+(update.gold||0), items:[...(p.partyStash?.items||[]),...(update.items||[]).map(it=>({name:it.name,desc:it.desc||"",qty:it.qty||it.quantity||1,category:it.category||"Gear",isConsumable:it.isConsumable||false}))] }})); return; }
    if(update.action==="update_stash_gold"){ setStoryState(p=>({...p,partyStash:{...(p.partyStash||{items:[]}),gold:Math.max(0,(p.partyStash?.gold||0)+(update.delta||0))}})); return; }
    if((update.action==="update_combatants"||update.action==="start")&&update.combatants){
      setCharacters(prev=>{ let changed=false; const next=prev.map(c=>{ const pu=update.combatants.find(u=>u.id===c.id||u.name===c.name); if(pu&&pu.hp!==undefined){ changed=true; return {...c,hp:{...c.hp,current:pu.hp,max:pu.maxHp??c.hp.max}}; } return c; }); return changed?next:prev; });
    }
    if(update.action==="grant_xp"){ setCharacters(prev=>prev.map(c=>{ const newXp=(c.xp||0)+(update.amount||0); return {...c,xp:newXp}; })); return; }
    setCombatState(prev=>{
      let s={...prev};
      switch(update.action){
        case "start":{ const seen=new Set(); const uniq=(update.combatants||[]).map(c=>{ let id=c.id; while(seen.has(id)) id=`${id}_${Math.floor(Math.random()*1000)}`; seen.add(id); return {...c,id,status:Array.isArray(c.status)?c.status:[]}; }); const first=uniq[0]; const firstSpeed=first?.speed||30; s={isActive:true,round:1,turn:0,combatants:uniq.sort((a,b)=>b.initiative-a.initiative),turnResources:{action:1,bonusAction:1,reaction:1,movement:firstSpeed}}; break; }
        case "end_combat": s={isActive:false,round:1,turn:0,combatants:[],isPlacementPhase:false,turnResources:{action:1,bonusAction:1,reaction:1,movement:30}}; break;
        case "next_turn":{ let t=s.turn+1; if(t>=s.combatants.length){t=0;s={...s,round:s.round+1};} const nextCom=s.combatants[t]; const spd=nextCom?.speed||30; const clrCombs=s.combatants.map((c,i)=>i===s.turn?{...c,toggles:{}}:c); s={...s,turn:t,turnResources:{action:1,bonusAction:1,reaction:1,movement:spd},combatants:clrCombs}; break; }
        case "prev_turn":{ let t=s.turn-1; if(t<0){t=Math.max(0,s.combatants.length-1);s={...s,round:Math.max(1,s.round-1)};} const prevCom=s.combatants[t]; const spd2=prevCom?.speed||30; const clrPrev=s.combatants.map((c,i)=>i===s.turn?{...c,toggles:{}}:c); s={...s,turn:t,turnResources:{action:1,bonusAction:1,reaction:1,movement:spd2},combatants:clrPrev}; break; }
        case "consume_resource":{ const tr={...s.turnResources}; if(update.resource==="action"&&tr.action>0) tr.action=0; else if(update.resource==="bonus"&&tr.bonusAction>0) tr.bonusAction=0; else if(update.resource==="reaction"&&tr.reaction>0) tr.reaction=0; else if(update.resource==="movement") tr.movement=Math.max(0,tr.movement-(update.amount||5)); s={...s,turnResources:tr}; break; }
        case "set_toggle":{ s={...s,combatants:s.combatants.map(c=>c.id===update.targetId?{...c,toggles:{...(c.toggles||{}),[update.toggle]:update.value}}:c)}; break; }
        case "update_combatants":{ const combs=[...s.combatants]; (update.combatants||[]).forEach(u=>{ let idx=combs.findIndex(c=>c.id===u.id); if(idx===-1) idx=combs.findIndex(c=>c.name===u.name); if(idx>=0) combs[idx]={...combs[idx],...u,status:Array.isArray(u.status)?u.status:combs[idx].status||[]}; else combs.push({...u,status:Array.isArray(u.status)?u.status:[]}); }); s={...s,combatants:combs}; break; }
        case "add_combatant":{ let id=update.combatant.id||`npc_${Date.now()}`; while(s.combatants.some(c=>c.id===id)) id=`${id}_${Math.floor(Math.random()*1000)}`; s={...s,combatants:[...s.combatants,{...update.combatant,id,status:Array.isArray(update.combatant.status)?update.combatant.status:[]}].sort((a,b)=>b.initiative-a.initiative)}; break; }
        case "remove_combatant":{ const ri=s.combatants.findIndex(c=>c.id===update.targetId); if(ri>=0){ const combs=s.combatants.filter((_,i)=>i!==ri); let turn=s.turn; if(ri<turn) turn--; else if(turn>=combs.length) turn=Math.max(0,combs.length-1); s={...s,combatants:combs,turn}; } break; }
        case "spawn_enemy":{ const entry=ENEMY_DATABASE[update.enemyId]; if(!entry) break; const count=Math.max(1,update.count||1); const newC=[]; const newToks=[]; for(let i=0;i<count;i++){ const hp=rollMonsterHp(entry); const uid=`${update.enemyId}_${Date.now()}_${i}`; const init=rollDie(20)+(entry.initiativeMod||0); newC.push({id:uid,name:count>1?`${entry.name} ${i+1}`:entry.name,type:"monster",hp,maxHp:hp,ac:entry.ac,initiative:init,status:[],color:entry.color,tacticHints:entry.tacticHints,monsterActions:entry.actions||[],monsterBonusActions:entry.bonusActions||[]}); // Build a matching map token — drop near camera centre with small spiral offset so they don't overlap
          const playerTok=(mapState.tokens||[]).find(t=>t.type==="player"); const anchorX=playerTok?playerTok.cx:0; const anchorY=playerTok?playerTok.cy:0; const G=50; const cols=[-1,1,-2,2,0]; const rows=[0,0,0,0,-2]; const cx=anchorX+(cols[i%5]||i)*G; const cy=anchorY+(rows[i%5]||i)*G; newToks.push({id:uid,name:count>1?`${entry.name} ${i+1}`:entry.name,type:"foe",cx,cy,size:entry.size==="Large"?2:entry.size==="Huge"?3:1,color:entry.color||"#ef4444"}); } s={...s,combatants:[...s.combatants,...newC].sort((a,b)=>b.initiative-a.initiative)}; if(newToks.length>0) setMapState(prev=>({...prev,tokens:[...(prev.tokens||[]),...newToks]})); break; }
        case "placement_pause": s={...s,isPlacementPhase:true}; break;
        case "update_tactics":{ s={...s,combatants:s.combatants.map(c=>c.id===update.targetId||c.name===update.targetName?{...c,tactics:update.tactics}:c)}; break; }
        case "update_status":{ const combs=s.combatants.map(c=>{ if(c.id!==update.targetId) return c; const cur=Array.isArray(c.status)?c.status:[]; return {...c,status:update.add?(cur.includes(update.status)?cur:[...cur,update.status]):cur.filter(x=>x!==update.status)}; }); s={...s,combatants:combs}; break; }
      }
      return s;
    });
  };

  // Auto-select active combatant
  useEffect(()=>{
    if(combatState.isActive&&combatState.combatants.length>0){
      const active=combatState.combatants[combatState.turn];
      if(active){ const match=characters.find(c=>c.id===active.id||c.name===active.name); if(match) setSelectedCharId(match.id); }
    }
  },[combatState.turn,combatState.isActive]);

  const handleSendMessage=async(overrideText)=>{
    const text=(overrideText!==undefined?overrideText:input).trim(); if(!text||isGenerating) return;
    if(overrideText===undefined) setInput("");
    const msgText=activeChar?`{${activeChar.name}} ${text}`:text;
    const userMsg={role:"user",content:msgText};
    setHistory(p=>[...p,userMsg]); setIsGenerating(true);
    const ctxChars=characters.map(c=>({name:c.name,species:c.species,class:c.class,level:c.level,hp:`${c.hp.current}/${c.hp.max}`,ac:c.ac,xp:c.xp||0,exhaustion:c.exhaustion||0}));
    const mapCtx=generateMapContext(
      mapState.tokens||[],
      characters,
      mapState.walls||[],
      combatState,
      mapState.gridCell??50,
      mapState.gridOffX??0,
      mapState.gridOffY??0
    );
    const sysPrompt=`You are the Dungeon Master for a D&D 5e (2024 rules) campaign "Dragons of Stormwreck Isle".

════════════════════════════════════════════════════════════════════════
CURRENT CAMPAIGN STATE (read before every response)
════════════════════════════════════════════════════════════════════════
Location      : ${storyState.location}
Recent Events : ${storyState.recentEvents}
Active Quests : ${JSON.stringify((storyState.quests||[]).filter(q=>q.status==="Active").map(q=>({id:q.id,title:q.title,objectives:(q.objectives||[]).map(o=>o.text+(o.done?" [done]":""))})))}
Known NPCs    : ${JSON.stringify((storyState.npcs||[]).map(n=>({name:n.name,id:n.id,status:n.status,location:n.location})))}
Party         : ${JSON.stringify(ctxChars)}
In Combat     : ${combatState.isActive}
${mapCtx ? `\n${mapCtx}` : ""}

Campaign Module Context:
${CAMPAIGN_TEXT}

════════════════════════════════════════════════════════════════════════
STRICT RULES OF PLAY — NO AUTOPLAY (HIGHEST PRIORITY — NEVER OVERRIDE)
════════════════════════════════════════════════════════════════════════
These rules override your narrative instincts in every situation.

RULE 1 — NEVER AUTO-RESOLVE COMBAT:
  • If the players choose to fight, you MUST immediately start combat using [COMBAT_UPDATE] {"action":"start",...}.
  • It does not matter how outnumbered, outlevelled, or tactically hopeless the party is.
  • You are FORBIDDEN from narrating the outcome of a battle, a capture, a defeat, or a retreat in a single message.
  • Every round must be played out one turn at a time. The players decide what happens to their characters.
  • WRONG: "The guards overwhelm you. You are captured and thrown in a cell."
  • RIGHT: Start combat. Run initiative. Let the dice and the players determine the outcome.

RULE 2 — NEVER CONTROL THE PLAYER CHARACTERS:
  • You control the world, the NPCs, and the monsters. You do NOT control the player characters.
  • NEVER write that a player character takes damage, moves, reacts, speaks, gasps, falls, or gets knocked out
    unless it is the direct mechanical result of a dice roll that has already been resolved this turn.
  • WRONG: "Talon gasps as a bolt of lightning slams into him, dropping him to his knees."
  • RIGHT: "The battle mage raises her staff. Her lightning bolt targets Talon — DC 14 DEX save or 4d6 damage."
    Then wait for the player's response or the dice result before describing the outcome.

RULE 3 — REJECT IMPOSSIBLE OR ILLOGICAL ACTIONS GRACEFULLY:
  • If the system log or a player message contains an action that is impossible given the current scene
    (e.g., taking a Long Rest in the middle of combat, shopping while guards surround the party),
    you MUST explicitly reject it in-character, firmly but briefly, and return to the scene.
  • WRONG: (skipping the combat scene, treating the rest as canonical)
  • RIGHT: "There is no time to rest — blades are drawn and the sergeant is already shouting orders!
    What do you do this turn?"
  • This applies to: Long Rest, Short Rest, shopping, level-up, any out-of-place system message mid-scene.

RULE 4 — OVERWHELM IS DRAMA, NOT AN EXCUSE TO SKIP:
  • A party fighting 20 guards is exciting storytelling. Play it out. Let them be creative.
  • The environment, NPC tactics, and the fiction can make things dire — but the PLAYERS must be
    the ones who choose to flee, surrender, or fight to the last. Never choose for them.

RULE 5 — NEVER ASK THE PLAYER TO ROLL INITIATIVE:
  • The VTT app automatically rolls initiative (d20 + DEX mod) for every party member the instant
    combat starts, and populates the Combat Tracker in sorted order.
  • You MUST NEVER write "Roll for initiative!", "Everyone roll initiative", or any equivalent phrase.
  • WRONG: "Swords are drawn! Roll for initiative!"
  • RIGHT: Narrate the combat starting, then immediately check the COMBAT section of VTT MAP STATE
    to see whose turn it is and act accordingly.

RULE 6 — EXECUTE MONSTER TURNS IMMEDIATELY — NEVER WAIT FOR THE PLAYER TO PROMPT YOU:
  • After combat starts, check the COMBAT line in VTT MAP STATE: “Round X · <n>\'s turn”.
  • If that name belongs to a MONSTER or NPC enemy, you MUST execute their turn in this same
    response using [VTT_ACTION]. Do NOT end your message with “What does the goblin do?” or
    “It is the goblin\'s turn” and then wait. Execute it NOW.
  • If it is a PLAYER CHARACTER\'S turn, describe the scene and ask what they do. Never auto-act for them.
  • WRONG: “The goblin snarls at you. It is its turn — what happens?”
  • RIGHT: Narrate the goblin\'s intent, then append [VTT_ACTION] with move + attack + end_turn.

  PLACEMENT PAUSE EXCEPTION — when spawning enemies AND starting combat in the same response:
  • The app drops new enemy tokens at the centre of the screen. The player needs a moment to
    drag them to their narrative positions (behind barrels, in doorways, etc.) before combat flows.
  • Therefore: if your response includes spawn_enemy AND starts combat, you MUST NOT output
    [VTT_ACTION] in that same response, even if a monster goes first on initiative.
  • Instead, add {"action":"placement_pause"} as the LAST item in your [COMBAT_UPDATE] array,
    and end your narration asking the player to place the tokens and click Ready.
  • CORRECT SPAWN+START pattern:
      [COMBAT_UPDATE] [{"action":"start","combatants":[...]},{"action":"spawn_enemy","enemyId":"goblin","count":2},{"action":"placement_pause"}] [/COMBAT_UPDATE]
      Narration end: "Two goblins burst from the shadows! Place them on the map, then click \u2705 Ready."
  • On the player\'s NEXT message (“Ready to begin!”) the placement phase is over — NOW check
    whose turn it is in VTT MAP STATE and immediately execute any monster turns with [VTT_ACTION].

════════════════════════════════════════════════════════════════════════
COMBAT RULES — MANDATORY (violations break the VTT — no exceptions)
════════════════════════════════════════════════════════════════════════
RULE A — PLAYER DAMAGE MUST BE APPLIED IMMEDIATELY:
  • Whenever a player reports a damage roll against an enemy, you MUST calculate the
    enemy’s remaining HP and output a [COMBAT_UPDATE] block with update_combatants.
  • WRONG: Narrating “Your blade bites deep!” with no [COMBAT_UPDATE].
  • RIGHT: Narrate the hit, then append:
      [COMBAT_UPDATE] [{"action":"update_combatants","combatants":[{"id":"m1","hp":4}]}] [/COMBAT_UPDATE]
  • If the damage reduces the enemy to 0 HP, also output remove_combatant and grant_xp.

RULE B — STRICT TURN ORDER — NEVER ACT FOR A MONSTER OUT OF TURN:
  • Check the COMBAT line in VTT MAP STATE every single response: “Round X · <name>’s turn”.
  • ONLY the creature named on that line may act. Do NOT narrate any other creature
    attacking, moving, or taking any action in that same response.
  • WRONG: Player is on their turn — DM narrates Bandit 2 attacking the player.
  • RIGHT: Player is on their turn — DM resolves the player’s action only, then asks
    “What else do you do, or are you done with your turn?”

RULE C — TURN ADVANCEMENT IS THE PLAYER’S RESPONSIBILITY:
  • NEVER output {"type":"end_turn"} in a [VTT_ACTION] block during a player’s turn.
  • end_turn is ONLY valid inside [VTT_ACTION] at the end of a MONSTER’S turn.
  • Players end their own turns using the “End Turn ▶” button in the VTT UI.
  • When a player’s action is resolved, simply ask what else they want to do.
    Do NOT auto-advance the initiative order.

RULE D — MONSTER NARRATION WITHOUT [VTT_ACTION] IS FORBIDDEN:
  • If you narrate a monster moving, attacking, casting a spell, or taking ANY action,
    you MUST include a [VTT_ACTION] block in that EXACT SAME response to execute it.
  • There is NO exception. “The bandit charges at David…” with no [VTT_ACTION] is a
    critical failure — the player sees narration but nothing happens on the VTT.
  • WRONG: Narrating “The bandit slashes at David for 6 damage” with no [VTT_ACTION].
  • RIGHT: Narrate the attack, then immediately append:
      [VTT_ACTION]
      [
        { "type": "move",   "tokenId": "bandit_1", "destCol": 5, "destRow": 3 },
        { "type": "attack", "tokenId": "bandit_1", "targetId": "david",
          "attackBonus": 3, "damageDice": "1d6+1", "damageType": "slashing" },
        { "type": "end_turn" }
      ]
      [/VTT_ACTION]
  • Self-check before sending: “Did I narrate a monster doing anything?”
    If YES → there MUST be a [VTT_ACTION] block. If it’s missing, add it before responding.

════════════════════════════════════════════════════════════════════════
NARRATION RULES
════════════════════════════════════════════════════════════════════════
1. Write 2–4 paragraphs of immersive prose. No bullet lists in narration.
2. Apply 2024 D&D rules: Weapon Mastery, Exhaustion (−2 per level to all d20 tests), Bloodied at 50% HP.
3. Critical Hits: double all damage dice (not modifiers).
4. Never skip HP changes — always emit a [COMBAT_UPDATE] block whenever combat is active.
5. The Merrow Encounter triggers ONLY when players explicitly charter a ship to Stormwreck Isle.

════════════════════════════════════════════════════════════════════════
SPELL MECHANICS — 2024 RULES (MANDATORY — resolve in same turn, no skipping)
════════════════════════════════════════════════════════════════════════
The app will inject a system alert when a spell trigger fires. You MUST resolve it
in your IMMEDIATE response, within the same initiative turn, before moving on.

CHROMATIC ORB (2024):
  • The player reports damage dice e.g. "[3,3,5]". You must scan the array.
  • If ANY two dice show the SAME number → the orb BOUNCES to a second target within 30 ft.
  • Bounce: make a NEW spell attack roll vs the second target; on hit, deal HALF the original rolled damage (same damage type).
  • Describe the bounce in your narration and include the second target's HP change in [COMBAT_UPDATE].
  • Example: "[3,3,5]" → bounce triggered. "[1,4,6]" → no bounce.

CHAOS BOLT (2024):
  • If BOTH d8 damage dice match → the bolt leaps to a second target within 30 ft.
  • Make a new attack roll vs the second target. The leap can chain again if that roll also matches.

SCORCHING RAY:
  • Three separate rays, each needs its own attack roll. Apply damage per hit ray.
  • If a player reports one ray result, prompt for the remaining two before resolving HP.

MAGIC MISSILE:
  • All darts auto-hit — no attack roll. Apply total damage guaranteed.
  • Player may split darts between targets freely.

TOLL THE DEAD:
  • If the target is missing ANY hit points, upgrade the damage die to d12 (from d8).
  • Always ask or confirm the target's HP status before accepting the roll.

THUNDERWAVE:
  • CON save or take full damage and be PUSHED 10 ft + DEAFENED until start of caster's next turn.
  • On a successful save: half damage, no push, no deafen.
  • Resolve push and deafen in [COMBAT_UPDATE] using update_status.

DISSONANT WHISPERS:
  • On a FAILED WIS save, target must use its REACTION to move its speed directly away.
  • This movement provokes opportunity attacks. Resolve the flee movement immediately.

GENERAL RULE: When the system posts a "⚡ BOUNCE", "🌀 LEAPS", or similar alert, treat it as a
mandatory sub-action. Narrate the effect, roll the secondary attack, and update HP in [COMBAT_UPDATE]
before advancing the initiative order.

════════════════════════════════════════════════════════════════════════
SCRIPTED EVENT — Merrow Encounter
════════════════════════════════════════════════════════════════════════
TRIGGER  : Players charter passage to Stormwreck Isle.
ACTION   : Storm strikes. A Merrow boards and demands "400 gold or your lives" for the Scaled Queen.
RESOLUTION: Negotiate (DC 15 Persuasion, −100 gp per success), fight, or creative solution.

════════════════════════════════════════════════════════════════════════
[COMBAT_UPDATE] — REQUIRED whenever combat is active
════════════════════════════════════════════════════════════════════════
Append at END of your response inside [COMBAT_UPDATE]...[/COMBAT_UPDATE].
Use a JSON array. Every line of combat MUST include HP changes.

VALID ACTIONS:
[
  {"action":"start","combatants":[{"id":"ariyah","name":"Ariyah","type":"player","hp":16,"maxHp":16,"ac":16,"initiative":12},{"id":"m1","name":"Goblin","type":"monster","hp":9,"maxHp":9,"ac":15,"initiative":14,"color":"#16a34a"}]},
  {"action":"spawn_enemy","enemyId":"goblin","count":3},
  {"action":"spawn_enemy","enemyId":"bandit_captain","count":1},
  {"action":"update_combatants","combatants":[{"id":"m1","hp":4},{"id":"ariyah","hp":14}]},
  {"action":"update_tactics","targetId":"m1","tactics":"The goblin ducks behind the barrel and uses Nimble Escape (Bonus Action: Hide). It will peek out next turn and shoot Talon who is concentrating on Hunter's Mark."},
  {"action":"next_turn"},
  {"action":"add_combatant","combatant":{"id":"m4","name":"Goblin Boss","type":"monster","hp":27,"maxHp":27,"ac":17,"initiative":10,"color":"#15803d"}},
  {"action":"remove_combatant","targetId":"m1"},
  {"action":"update_status","targetId":"m1","status":"Poisoned","add":true},
  {"action":"end_combat"},
  {"action":"grant_xp","amount":150}
]

SPAWN ENEMY RULES:
  ★ ALWAYS use spawn_enemy instead of manually writing out monster HP/AC — the engine rolls unique HP per monster.
  ★ Valid enemyIds: goblin, goblin_boss, bandit, bandit_captain, guard, merrow, zombie, skeleton, wolf, giant_spider, sea_spawn, cult_fanatic
  ★ spawn_enemy can be used mid-combat to add reinforcements
  ★ After spawning, include update_tactics to describe the monsters' opening move

TACTICS RULES — MANDATORY during monster turns:
  ★ Every time a monster takes its turn, output update_tactics with a 1–2 sentence tactical plan BEFORE narrating.
  ★ The tactics string should reference: which PC they target, which ability they use, and why.
  ★ EXAMPLE: "The Goblin Boss sees Talon is Concentrating (Hunter's Mark). It commands two goblins to flank him and uses Redirect Attack to protect itself from Ariyah's next swing."
  ★ After output_tactics, describe the monster's action, then output update_combatants with HP results.

Player IDs: ariyah, brandi, david, talon. Monster IDs: m1, m2, m3 (must be unique per encounter).

════════════════════════════════════════════════════════════════════════
[CAMPAIGN_UPDATE] — MANDATORY RULES — READ CAREFULLY
════════════════════════════════════════════════════════════════════════
You MUST append a [CAMPAIGN_UPDATE]...[/CAMPAIGN_UPDATE] block at the END of your response
in ALL of the following situations — no exceptions, no skipping:

  ★ ANY time you introduce or describe an NPC (named character) for the first time
  ★ ANY time the party accepts, advances, or completes a quest
  ★ ANY time the party moves to a new location
  ★ ANY time a significant discovery is made (new area, secret revealed, item found)
  ★ At the END of any scene that introduces story content

If NONE of those apply, you may omit the block. In all other cases it is REQUIRED.

FORMAT — always use a JSON array, even for a single action:
[CAMPAIGN_UPDATE]
[
  {"action":"update_location","location":"Neverwinter - Port Docks","recentEvents":"The party met Corvus and accepted a mission to Stormwreck Isle."},
  {"action":"update_npc","npcId":"corvus","name":"Corvus","role":"Merchant","faction":"Neverwinter Trading Guild","location":"Neverwinter - Port Docks","status":"Friendly","description":"A red-faced merchant missing one boot, desperate for help reaching Dragon's Rest.","notes":"Promised generous payment for the party's help."},
  {"action":"update_quest","questId":"q_stormwreck","title":"Voyage to Stormwreck Isle","giver":"Corvus","location":"Stormwreck Isle","description":"The Dragon's Rest monastery on Stormwreck Isle has gone silent. Travel there and find out why.","reward":"Generous gold reward from Corvus","status":"Active","objectives":[{"text":"Charter a ship from Neverwinter","done":false},{"text":"Survive the voyage","done":false},{"text":"Reach Dragon's Rest monastery","done":false},{"text":"Discover what happened to the monks","done":false}]},
  {"action":"add_journal","title":"A Desperate Plea at the Docks","type":"scene","body":"The party arrived at Neverwinter's salt-worn docks and met Corvus, a frantic merchant. He begged them to investigate why Dragon's Rest monastery on Stormwreck Isle has gone silent, promising a handsome reward.","location":"Neverwinter - Port Docks"}
]
[/CAMPAIGN_UPDATE]

AVAILABLE ACTIONS:
  update_location — {"action":"update_location","location":"EXACT location name","recentEvents":"One sentence summary."}
  update_npc      — {"action":"update_npc","npcId":"snake_case_id","name":"Full Name","role":"Their role","faction":"Their group","location":"Where met","status":"Friendly|Neutral|Hostile|Unknown","description":"Who they are.","notes":"Useful party info."}
  update_quest    — {"action":"update_quest","questId":"snake_case_id","title":"Quest Title","giver":"NPC name","description":"Full description.","reward":"What they'll earn.","status":"Active|Completed|Failed","objectives":[{"text":"Objective text","done":false}]}
  add_journal     — {"action":"add_journal","title":"Scene Title","type":"scene|quest|discovery|combat|npc","body":"2–3 sentence narrative summary.","location":"Location name"}
  log_event       — {"action":"log_event","description":"Brief one-line event log entry."}
  spawn_npc       — {"action":"spawn_npc","npcId":"snake_case_id","name":"Full Name"}

NPC TOKEN RULES:
  ★ When you physically introduce an NPC into the scene (a barkeep behind the bar, a merchant at
    their stall, a quest-giver sitting at a table), use spawn_npc to drop their token on the VTT map.
  ★ Use the SAME npcId you assign in update_npc so the token can be identified.
  ★ NPC tokens appear in neutral grey/blue — clearly distinct from player (gold) and enemy (red) tokens.
  ★ DO NOT use spawn_npc for enemies you intend to fight — use spawn_enemy in [COMBAT_UPDATE] for those.
  ★ EXAMPLE — introducing a barkeep in a tavern:
      [CAMPAIGN_UPDATE]
      [
        {"action":"update_npc","npcId":"grundig","name":"Grundig","role":"Barkeep","location":"The Beached Leviathan","status":"Neutral","description":"A stocky dwarf with a braided red beard, wiping down the bar with a rag."},
        {"action":"spawn_npc","npcId":"grundig","name":"Grundig"}
      ]
      [/CAMPAIGN_UPDATE]

IMPORTANT — quest objective completion: when a quest objective is finished, resend the full quest with that objective marked done:true.
IMPORTANT — NPC IDs: once assigned (e.g. "corvus"), always use the same ID for that NPC.
IMPORTANT — Both [COMBAT_UPDATE] and [CAMPAIGN_UPDATE] blocks may appear in the same response.

AVAILABLE ACTIONS (continued):
  update_shop — {"action":"update_shop","name":"Shop Name","keeper":"Shopkeeper Name","desc":"One sentence flavour.","location":"Location name","items":[{"name":"Item","desc":"What it does.","price":"50 gp"}]}
  clear_shop  — {"action":"clear_shop"}
  award_loot  — {"action":"award_loot","gold":150,"items":[{"name":"Goblin Scimitar","desc":"A chipped but serviceable blade.","qty":1,"category":"Weapon"},{"name":"Potion of Healing","desc":"Bonus Action: heals 2d4+2 HP.","qty":2,"category":"Consumable","isConsumable":true,"healDice":"2d4","healMod":2}]}
  add_to_inventory — {"action":"add_to_inventory","characterName":"Ariyah","itemName":"+1 Longsword","quantity":1,"description":"A magical blade.","category":"Weapon","magicItemId":"plus1_longsword"}

LOOT RULES — MANDATORY (NO EXCEPTIONS):
  ★ YOU MUST OUTPUT award_loot IN A [CAMPAIGN_UPDATE] BLOCK ANY TIME THE PARTY ACQUIRES ITEMS OR GOLD.
  ★ This applies to ALL of the following situations — there are no exceptions:
      • After combat: looting enemies, searching the battlefield, finding hidden caches.
      • Exploration: opening chests, finding treasure, searching rooms, discovering stashes.
      • Roleplay / NPC interaction: an NPC gifts an item, sells an item, hands over a reward,
        trades with the party, or gives payment for a completed quest or favour.
  ★ DO NOT narrate "the barkeep hands you a cloak" without ALSO outputting award_loot.
     The narration alone does NOT log the item. The [CAMPAIGN_UPDATE] block is REQUIRED.
  ★ Gold amounts by CR: CR1/4=2-10gp, CR1/2=5-20gp, CR1=10-50gp, CR2=50-100gp.
  ★ Items go to the Party Stash — players distribute them from the Dashboard.
  ★ Include story-hook items (keys, notes, unusual gear) to enrich the narrative.

LOOT EXAMPLES — study these before writing any item-award narration:

  WRONG (narration only — item is LOST, never tracked):
    "Elder Runara smiles and places a Cloak of Protection in Ariyah's hands."

  CORRECT (narration + mandatory [CAMPAIGN_UPDATE]):
    "Elder Runara smiles and places a Cloak of Protection in Ariyah's hands."
    [CAMPAIGN_UPDATE] {"action":"award_loot","gold":0,"items":[{"name":"Cloak of Protection","desc":"Gifted by Elder Runara. Requires attunement. +1 AC and saving throws.","qty":1,"category":"Gear","magicItemId":"cloak_of_protection"}]}

  NPC GIFT EXAMPLE (quest reward):
    [CAMPAIGN_UPDATE] {"action":"award_loot","gold":50,"items":[{"name":"Potion of Healing","desc":"Reward from the harbormaster.","qty":2,"category":"Consumable","isConsumable":true,"healDice":"2d4","healMod":2}]}

  SHOP PURCHASE EXAMPLE (player buys something):
    [CAMPAIGN_UPDATE] {"action":"award_loot","gold":0,"items":[{"name":"+1 Longsword","desc":"Purchased from the smithy.","qty":1,"category":"Weapon","magicItemId":"plus1_longsword"}]}

MAGIC ITEM IDS (use magicItemId field in add_to_inventory when awarding magic items):
  plus1_longsword, plus1_shield, cloak_of_protection (attunement), ring_of_evasion (attunement),
  boots_of_speed (attunement), wand_of_magic_missiles, amulet_of_health (attunement),
  periapt_of_wound_closure (attunement).
  ★ When granting a magic item, always use add_to_inventory with the correct magicItemId so the app can link its effects.

SHOP RULES — MANDATORY:
  ★ When the party ENTERS any shop, market, or vendor stall, you MUST output update_shop in the [CAMPAIGN_UPDATE] block.
  ★ Generate 4–8 items appropriate for that shop type. Prices in realistic D&D gold (e.g. "50 gp", "5 sp", "1,200 gp").
  ★ When the party LEAVES a shop and goes elsewhere, output clear_shop.
  ★ Invent any shop name freely — do not restrict yourself to the location list below.

LOCATION RULE — MANDATORY:
  ★ ALWAYS output update_location when the party moves anywhere new, even within the same town or dungeon.
  ★ Location field should be descriptive: e.g. "Neverwinter - Valissia's Arcane Oddities", "Stormwreck Isle - Sea Cave Entrance".

Known location names (you may freely invent new ones):
"Neverwinter - Port Docks", "Neverwinter - Protector's Enclave Market", "Neverwinter - Shining Knight Arms & Armor", "Neverwinter - The Beached Leviathan", "Dragon's Rest - Myla's Workshop"

════════════════════════════════════════════════════════════════════════
VTT_ACTION — MONSTER AUTOMATION (solo play)
════════════════════════════════════════════════════════════════════════
When combat is active and it is a MONSTER'S turn, you MUST append a [VTT_ACTION] block.
The app will execute each action automatically: moving tokens, rolling attacks, applying damage.
The player never sees the raw JSON — it is stripped before display.

TOKEN IDs — use the exact ids listed in the VTT MAP STATE FOES section above.
GRID — the map uses a 5 ft per cell grid. destCol/destRow are integer cell coordinates.

REQUIRED FORMAT — always an array, even for a single action:
[VTT_ACTION]
[
  { "type": "move",   "tokenId": "<exact foe id>", "destCol": <int>, "destRow": <int> },
  { "type": "attack", "tokenId": "<foe id>", "targetId": "<pc id>",
    "attackBonus": <int>, "damageDice": "<NdN+N>", "damageType": "<type>" },
  { "type": "end_turn" }
]
[/VTT_ACTION]

RULES:
• move    — move the token to an adjacent or nearby cell. Distance ≤ monster speed (ft).
             The app enforces collision; if the path is blocked it stops early.
             Omit if the monster doesn't move this turn.
• attack  — the app rolls d20+attackBonus vs target AC. On hit, rolls damageDice.
             Use the monster's stat block values (from ENEMY_DATABASE in the app).
             targetId is the PC's character id shown in the VTT MAP STATE PARTY section.
• save    — force a PC saving throw: { "type":"save", "targetId":"<pc id>",
             "stat":"<str|dex|con|int|wis|cha>", "dc":<int>,
             "failDamageDice":"<NdN>", "damageType":"<type>", "condition":"<optional>" }
• end_turn — ALWAYS include as the final action. Advances the initiative order.

IMPORTANT:
• Always include end_turn as the last action.
• If the monster has Multiattack, include multiple attack entries.
• If the monster is dead (HP 0), output only end_turn.
• Narrate the monster's actions in prose BEFORE the [VTT_ACTION] block.
• Only output [VTT_ACTION] on monster turns — never on player turns.`;

    const TURN_REMINDER = `\n\n[SYSTEM REMINDER: Always check whose turn it is. On MONSTER turns: narrate the action then output [VTT_ACTION] + [COMBAT_UPDATE]. On PLAYER turns: never output [VTT_ACTION]. If you introduced an NPC, gave a quest, changed locations, or gave items/gold, also output [CAMPAIGN_UPDATE].]`;
    const apiMsgs=history.filter(m=>m.role!=="system").concat(userMsg).map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.content}));
    if(apiMsgs.length>0){ const last=apiMsgs[apiMsgs.length-1]; if(last.role==="user") apiMsgs[apiMsgs.length-1]={...last,content:last.content+TURN_REMINDER}; }
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:CLAUDE_MODEL,max_tokens:2000,system:sysPrompt,messages:apiMsgs})});
      const data=await res.json();
      const fullText=data.content?.map(b=>b.type==="text"?b.text:"").join("")||"";
      // ── Extract & process [COMBAT_UPDATE] blocks ──────────────────
      const combatRx=/\[COMBAT_UPDATE\]([\s\S]*?)\[\/COMBAT_UPDATE\]/g;
      let clean=fullText, m;
      while((m=combatRx.exec(fullText))!==null){
        try{ const p=JSON.parse(m[1].trim()); if(Array.isArray(p)) p.forEach(handleCombatUpdate); else handleCombatUpdate(p); }catch(e){}
      }
      clean=clean.replace(/\[COMBAT_UPDATE\][\s\S]*?\[\/COMBAT_UPDATE\]/g,"").trim();

      // ── Extract & process [VTT_ACTION] blocks ──────────────────────
      // Each block is a JSON array of monster actions executed in order.
      // Stripped from clean before display — player never sees raw JSON.
      const vttRx=/\[VTT_ACTION\]([\s\S]*?)\[\/VTT_ACTION\]/g;
      let va;
      while((va=vttRx.exec(fullText))!==null){
        try{
          const parsed=JSON.parse(va[1].trim());
          const actions=Array.isArray(parsed)?parsed:[parsed];
          actions.forEach(handleVttAction);
        }catch(e){ addSystem(`⚠ VTT_ACTION parse error: ${e.message}`); }
      }
      clean=clean.replace(/\[VTT_ACTION\][\s\S]*?\[\/VTT_ACTION\]/g,"").trim();
      // Bulletproof parser: handles JSON arrays, single objects, and
      // newline-delimited objects (the AI sometimes outputs one JSON
      // object per line instead of a proper array).
      const campaignRx=/\[CAMPAIGN_UPDATE\]([\s\S]*?)\[\/CAMPAIGN_UPDATE\]/g;
      let cm;
      while((cm=campaignRx.exec(fullText))!==null){
        const raw=cm[1].trim();
        if(!raw) continue;
        // Attempt 1: parse as-is (valid array or single object)
        try{
          const parsed=JSON.parse(raw);
          if(Array.isArray(parsed)) parsed.forEach(handleCampaignUpdate);
          else handleCampaignUpdate(parsed);
          continue;
        }catch(_){}
        // Attempt 2: wrap in array brackets if it looks like bare objects
        try{
          const wrapped="["+raw.replace(/}\s*\n\s*{/g,"},{")+"]";
          const parsed=JSON.parse(wrapped);
          if(Array.isArray(parsed)) parsed.forEach(handleCampaignUpdate);
          continue;
        }catch(_){}
        // Attempt 3: extract individual {...} blobs line by line
        const objRx=/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
        let ob;
        while((ob=objRx.exec(raw))!==null){
          try{ handleCampaignUpdate(JSON.parse(ob[0])); }catch(_){}
        }
      }
      clean=clean.replace(/\[CAMPAIGN_UPDATE\][\s\S]*?\[\/CAMPAIGN_UPDATE\]/g,"").trim();

      if(clean) setHistory(p=>[...p,{role:"assistant",content:clean}]);
    }catch(e){ addSystem(`Error: ${e.message}`); }
    finally{ setIsGenerating(false); }
  };

  // ═══════════════════════════════════════════════════════════════════
  // handleCampaignUpdate — processes [CAMPAIGN_UPDATE] JSON blocks.
  // Fired outside combat whenever the DM narrates a story beat.
  //
  // Supported actions:
  //   update_quest   — upsert quest by questId; supports objectives[]
  //   update_npc     — upsert NPC by npcId; richer schema
  //   add_journal    — append a journal entry (title + body + type)
  //   update_location— change current location + recentEvents summary
  //   log_event      — lightweight chronological event (same as combat)
  // ═══════════════════════════════════════════════════════════════════
  const handleCampaignUpdate=(update)=>{
    const ts = new Date().toISOString();

    if(update.action==="update_quest"){
      setStoryState(p=>{
        const qs=[...(p.quests||[])];
        const idx=qs.findIndex(q=>q.id===update.questId);
        const base = idx>=0 ? qs[idx] : {};
        const merged = {
          ...base,
          id:       update.questId,
          title:    update.title    || base.title    || "Unknown Quest",
          giver:    update.giver    || base.giver    || "",
          location: update.location || base.location || p.location,
          description: update.description || base.description || "",
          reward:   update.reward   || base.reward   || "",
          status:   update.status   || base.status   || "Active",
          objectives: (() => {
            const prev = base.objectives||[];
            const incoming = update.objectives||[];
            if(!incoming.length) return prev;
            // Merge by text: update existing, append new
            const merged2 = [...prev];
            incoming.forEach(obj => {
              const ei = merged2.findIndex(o=>o.text===obj.text);
              if(ei>=0) merged2[ei]={...merged2[ei],...obj};
              else merged2.push({text:obj.text, done:obj.done||false});
            });
            return merged2;
          })(),
          updatedAt: ts,
        };
        if(idx>=0) qs[idx]=merged; else qs.push(merged);
        return {...p, quests:qs};
      });
      return;
    }

    if(update.action==="update_npc"){
      setStoryState(p=>{
        const ns=[...(p.npcs||[])];
        const idx=ns.findIndex(n=>n.id===update.npcId);
        const base = idx>=0 ? ns[idx] : {};
        const merged = {
          ...base,
          id:          update.npcId,
          name:        update.name        || base.name        || "Unknown",
          location:    update.location    || base.location    || p.location,
          status:      update.status      || base.status      || "Neutral",
          faction:     update.faction     || base.faction     || "",
          role:        update.role        || base.role        || "",
          description: update.description || base.description || "",
          notes:       update.notes       || base.notes       || "",
          firstMet:    base.firstMet      || p.location,
          updatedAt:   ts,
        };
        if(idx>=0) ns[idx]=merged; else ns.push(merged);
        return {...p, npcs:ns};
      });
      return;
    }

    if(update.action==="add_journal"){
      setStoryState(p=>({
        ...p,
        journal:[...(p.journal||[]), {
          id:        Date.now(),
          timestamp: ts,
          title:     update.title || "Scene",
          body:      update.body  || "",
          type:      update.type  || "scene", // scene | quest | discovery | combat | npc
          location:  update.location || p.location,
        }],
      }));
      return;
    }

    if(update.action==="update_location"){
      setStoryState(p=>({
        ...p,
        location:     update.location     || p.location,
        recentEvents: update.recentEvents || p.recentEvents,
      }));
      return;
    }

    if(update.action==="log_event"){
      setStoryState(p=>({
        ...p,
        events:[...(p.events||[]),{id:Date.now(),timestamp:ts,description:update.description}],
      }));
      return;
    }

    // update_shop — set the active shop for the current location
    // items: [{name, desc, price}]  (price is a display string e.g. "50 gp")
    if(update.action==="update_shop"){
      setStoryState(p=>({
        ...p,
        activeShop: update.name ? {
          name:     update.name,
          keeper:   update.keeper   || "",
          desc:     update.desc     || "",
          items:    Array.isArray(update.items) ? update.items.map(it=>({
            name:  it.name  || "Unknown Item",
            desc:  it.desc  || "",
            price: it.price || it.cost || "?",
          })) : [],
          location: update.location || p.location,
          updatedAt: ts,
        } : null,
      }));
      return;
    }

    // clear_shop — explicitly close the shop (party leaves)
    if(update.action==="clear_shop"){
      setStoryState(p=>({...p, activeShop:null}));
      return;
    }

    if(update.action==="spawn_npc"){
      const npcId=update.npcId||`npc_${Date.now()}`;
      const name=update.name||"NPC";
      setMapState(prev=>{
        // Don't double-spawn if already on map
        if((prev.tokens||[]).some(t=>t.id===npcId)) return prev;
        const playerTok=(prev.tokens||[]).find(t=>t.type==="player");
        const anchorX=playerTok?playerTok.cx:0;
        const anchorY=playerTok?playerTok.cy:0;
        const G=50;
        // Offset NPCs slightly differently from enemies (offset right + up)
        const existing=(prev.tokens||[]).filter(t=>t.type==="npc").length;
        const cx=anchorX+(existing+2)*G;
        const cy=anchorY-G;
        const newTok={id:npcId,name,type:"npc",size:1,color:"#64748b",cx,cy,hp:null,maxHp:null,ac:null};
        return {...prev,tokens:[...(prev.tokens||[]),newTok]};
      });
      return;
    }
  };

  const handleLoad=(slotId)=>{
    const data=slotsData[slotId]; if(!data) return;
    const merged=(data.characters||[]).map(lc=>{ const init=INITIAL_CHARACTERS.find(c=>c.id===lc.id); return init?{...init,...lc,attunedItems:lc.attunedItems||[]}:{...lc,attunedItems:lc.attunedItems||[]}; });
    setCharacters(merged); setHistory(data.history||[]);
    setCombatState(data.combatState||{isActive:false,round:1,turn:0,combatants:[]});
    setMapState(data.mapState||{tokens:[]}); setStoryState(data.storyState||{location:"Neverwinter - Port Docks",recentEvents:"The party has just arrived at the docks.",quests:[],npcs:[],journal:[],events:[],shops:VENDOR_INVENTORIES,activeShop:null,partyStash:{gold:0,items:[]}});
    setActiveSlot(slotId); if(merged.length>0) setSelectedCharId(merged[0].id);
  };

  const handleNew=(slotId)=>{
    const chars=JSON.parse(JSON.stringify(INITIAL_CHARACTERS));
    setCharacters(chars); setHistory([{role:"assistant",content:'You stand on the salt-worn docks of Neverwinter, the Jewel of the North. Gulls cry overhead, sailors shout in three languages, and the smell of fish mingles with tar and roasting meat from the market stalls.\n\nA frantic merchant—red-faced, missing a boot—clutches your sleeve: "Adventurers! Thank the gods! The cloister of Dragon\'s Rest on Stormwreck Isle desperately needs help. Strange things in the water. The monks haven\'t sent a ship in weeks. I\'ll pay handsomely for anyone willing to charter passage!"\n\nYou have gold in your pockets and the city before you. The Protector\'s Enclave Market is nearby, as is the famous Shining Knight armory and The Beached Leviathan tavern.\n\n*What do you do?*'}]);
    setCombatState({isActive:false,round:1,turn:0,combatants:[]}); setMapState({tokens:[]});
    setStoryState({location:"Neverwinter - Port Docks",recentEvents:"The party has just arrived at the docks.",quests:[],npcs:[],journal:[],events:[],shops:VENDOR_INVENTORIES,activeShop:null,partyStash:{gold:0,items:[]}});
    setActiveSlot(slotId); setSelectedCharId(chars[0].id);
  };

  const handleDelete=(slotId)=>{ localStorage.removeItem(SLOT_KEYS[slotId]); setSlotsData(p=>{ const n={...p}; delete n[slotId]; return n; }); };

  // ── GAME MENU ──
  if(!activeSlot) return (
    <div style={{minHeight:"100vh",background:"#020617",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"Georgia,serif"}}>
      <div style={{maxWidth:900,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:11,color:"#475569",letterSpacing:6,textTransform:"uppercase",marginBottom:12}}>D&D 2024 • Powered by Claude AI</div>
          <h1 style={{fontSize:56,fontWeight:900,color:"#fff",margin:0,lineHeight:1}}>DUNGEON <span style={{color:"#dc2626"}}>TIME</span></h1>
          <div style={{width:120,height:2,background:"linear-gradient(90deg,transparent,#f59e0b,transparent)",margin:"20px auto"}}/>
          <div style={{color:"#64748b",fontSize:11,letterSpacing:2,textTransform:"uppercase"}}>Full 5.5e Rules • Character Builder • Campaign Manager</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
          {[1,2,3].map(id=>{
            const data=slotsData[id];
            return (
              <div key={id} style={{background:data?"#0f172a":"transparent",border:`2px ${data?"solid #1e293b":"dashed #1e293b"}`,borderRadius:20,overflow:"hidden",minHeight:280,display:"flex",flexDirection:"column"}}>
                <div style={{padding:"16px 20px 0",color:"#334155",fontSize:10,fontFamily:"monospace",letterSpacing:2,textTransform:"uppercase"}}>Save Slot {id}</div>
                {data?(
                  <>
                    <div style={{flex:1,padding:20,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
                      <div style={{fontSize:32}}>📖</div>
                      <div style={{color:"#e2e8f0",fontWeight:"bold",fontSize:16}}>Campaign {id}</div>
                      <div style={{color:"#475569",fontSize:11,fontFamily:"monospace"}}>{new Date(data.lastSaved).toLocaleDateString()}</div>
                      <div style={{display:"flex"}}>
                        {(data.characters||[]).map((c,i)=>(
                          <div key={i} title={c.name} style={{width:32,height:32,borderRadius:"50%",background:c.avatarColor||"#4b5563",border:"2px solid #0f172a",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:"bold",marginLeft:i>0?-8:0}}>{c.name[0]}</div>
                        ))}
                      </div>
                      <div style={{color:"#475569",fontSize:11}}>📍 {data.storyState?.location||"Neverwinter"}</div>
                    </div>
                    <div style={{padding:16,borderTop:"1px solid #1e293b",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <button onClick={()=>handleLoad(id)} style={{gridColumn:"span 2",padding:"12px",background:"#f1f5f9",color:"#0f172a",border:"none",borderRadius:10,fontWeight:"900",cursor:"pointer",fontSize:13,letterSpacing:1,textTransform:"uppercase"}}>▶ Continue</button>
                      <button onClick={()=>handleNew(id)} style={{padding:"8px",background:"#0f172a",color:"#64748b",border:"1px solid #1e293b",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:"bold"}}>⟳ Reset</button>
                      <button onClick={()=>handleDelete(id)} style={{padding:"8px",background:"#0f172a",color:"#64748b",border:"1px solid #1e293b",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:"bold"}}>🗑 Delete</button>
                    </div>
                  </>
                ):(
                  <button onClick={()=>handleNew(id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,background:"none",border:"none",cursor:"pointer",color:"#334155",transition:"color 0.2s"}}
                    onMouseEnter={e=>e.currentTarget.style.color="#f59e0b"} onMouseLeave={e=>e.currentTarget.style.color="#334155"}>
                    <div style={{width:64,height:64,border:"2px dashed currentColor",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>+</div>
                    <span style={{fontSize:11,fontWeight:"bold",textTransform:"uppercase",letterSpacing:2}}>New Campaign</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── HELPERS inside render ──
  const hasShop=!!(storyState.activeShop);
  const tabs=["actions","spells","inventory","skills","features",...(hasShop?["shop"]:[])];
  // Merge live combat tracker status onto activeChar for condition checks
  const activeCombatant = combatState.combatants.find(c=>c.id===activeChar?.id);
  const activeCharWithStatus = activeChar ? {...activeChar, status:[...(activeChar.status||[]),...(activeCombatant?.status||[])]} : null;
  const getSpellMod=(char)=>{ if(!char) return 0; const sc=char.class.split(" ")[0]; if(["Cleric","Druid","Ranger"].includes(sc)) return Math.floor((char.stats.wis-10)/2); if(["Bard","Paladin","Sorcerer","Warlock"].includes(sc)) return Math.floor((char.stats.cha-10)/2); return Math.floor((char.stats.int-10)/2); };
  const exhaustionPenalty=activeChar?(activeChar.exhaustion||0)*(-2):0;

  // ── MAIN GAME RENDER ──
  return (
    <div style={{display:"flex",height:"100vh",background:"#020617",color:"#e2e8f0",fontFamily:"'Segoe UI',system-ui,sans-serif",overflow:"hidden"}}>

      {/* ── LEFT: Party Sidebar ── */}
      <div style={{width:220,borderRight:"1px solid #1e293b",background:"#0a0f1a",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"14px 12px 10px",borderBottom:"1px solid #1e293b",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontWeight:"900",color:"#f59e0b",fontSize:14,letterSpacing:1}}>🛡 Party</span>
          <div style={{display:"flex",gap:6}}>
            <button title="Build New Character" onClick={()=>setShowBuilder(true)} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14}}>➕</button>
            <button title="Short Rest" onClick={()=>{
              // Short Rest (2024): refill short-rest class resources only.
              // Hit Dice are SPENT during Short Rests (use the 🎲 button), not restored.
              characters.forEach(char=>{
                const defs=(char.passiveEffects||[]).filter(pe=>pe.type==="class_resource"&&pe.resetOn==="short");
                if(defs.length===0) return;
                const res={...(char.classResources||{})};
                defs.forEach(d=>{ res[d.id]={current:d.max}; });
                updateCharacter(char.id,{classResources:res});
              });
              addSystem("The party takes a Short Rest. Short-rest resources refilled. Spend Hit Dice (🎲) to heal.");
            }} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14}}>☕</button>
            <button title="Long Rest" onClick={()=>{
              // Long Rest: refill HP, all spell slots, all class resources, all hit dice, reset death saves, reduce exhaustion
              characters.forEach(char=>{
                const defs=(char.passiveEffects||[]).filter(pe=>pe.type==="class_resource");
                const res={...(char.classResources||{})};
                defs.forEach(d=>{ res[d.id]={current:d.max}; });
                const newSpellSlots=Object.fromEntries(Object.entries(char.spells?.slots||{}).map(([k,v])=>[k,{...v,used:0}]));
                updateCharacter(char.id,{
                  hp:{...char.hp,current:char.hp.max},
                  exhaustion:Math.max(0,(char.exhaustion||0)-1),
                  spells:{...char.spells,slots:newSpellSlots},
                  classResources:res,
                  hitDiceUsed:0,
                  deathSaves:{successes:0,failures:0},
                });
              });
              addSystem("The party takes a Long Rest. HP, spell slots, Hit Dice, and all class resources restored.");
            }} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14}}>🌙</button>
            <button title="Back to Menu" onClick={()=>setActiveSlot(null)} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14}}>⬅</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:8}}>
          {characters.map(char=>{
            const xpPct=char.level<20?Math.min(100,((char.xp||0)-XP_THRESHOLDS[char.level-1])/(XP_THRESHOLDS[char.level]-XP_THRESHOLDS[char.level-1])*100):100;
            return (
              <div key={char.id} onClick={()=>setSelectedCharId(char.id)} style={{padding:"10px 10px",borderRadius:10,marginBottom:8,cursor:"pointer",border:`1px solid ${selectedCharId===char.id?"#22c55e":"#1e293b"}`,background:selectedCharId===char.id?"#0a1f0d":"#0f172a",transition:"all 0.2s"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:char.avatarColor,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:"900",fontSize:14,border:"2px solid #0a0f1a",flexShrink:0}}>{char.name[0]}</div>
                  <div>
                    <div style={{fontWeight:"bold",fontSize:13,color:"#e2e8f0"}}>{char.name}</div>
                    <div style={{fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:0.5}}>Lv{char.level} {char.class.split(" ")[0]}</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,marginBottom:6}}>
                  {[["HP",`${char.hp.current}/${char.hp.max}`,char.hp.current<char.hp.max/2?"#ef4444":"#22c55e"],["AC",char.ac,"#60a5fa"],["Init",`${char.initiative>=0?"+":""}${char.initiative}`,"#f59e0b"]].map(([l,v,c])=>(
                    <div key={l} style={{background:"#0a0f1a",borderRadius:6,padding:"4px 0",textAlign:"center"}}>
                      <div style={{fontSize:8,color:"#475569",textTransform:"uppercase",fontWeight:"bold"}}>{l}</div>
                      <div style={{fontSize:12,fontWeight:"bold",color:c}}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* XP Bar */}
                <div style={{height:3,background:"#1e293b",borderRadius:2,marginBottom:3}}>
                  <div style={{height:"100%",width:`${xpPct}%`,background:"#7c3aed",borderRadius:2,transition:"width 0.4s"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#334155"}}>
                  <span>{char.xp||0} XP</span>
                  <span>Lv{Math.min(char.level+1,20)}: {XP_THRESHOLDS[char.level]||"MAX"} XP</span>
                </div>
                {(char.exhaustion||0)>0&&<div style={{marginTop:4,fontSize:10,color:"#a78bfa",fontWeight:"bold"}}>💜 Exhaustion {char.exhaustion} ({-char.exhaustion*2} to d20)</div>}
                {char.hp.current<=char.hp.max/2&&<div style={{fontSize:9,color:"#ef4444",fontWeight:"bold",marginTop:2}}>🩸 Bloodied</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CENTER ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden"}}>
        {/* Header */}
        <div style={{height:52,background:"#0a0f1a",borderBottom:"1px solid #1e293b",display:"flex",alignItems:"center",padding:"0 16px",gap:10,flexShrink:0}}>
          {activeChar&&(
            <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
              <span style={{fontWeight:"900",fontSize:16,color:"#fff",fontFamily:"Georgia,serif",whiteSpace:"nowrap"}}>{activeChar.name}</span>
              <span style={{fontSize:10,color:"#475569",whiteSpace:"nowrap"}}>Lv{activeChar.level} {activeChar.species} {activeChar.class}</span>
              <span style={{fontSize:9,color:"#64748b",background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:"2px 8px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>📍 {storyState.location}</span>
            </div>
          )}
          <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
            {/* Roll mode */}
            <div style={{display:"flex",background:"#0f172a",border:"1px solid #1e293b",borderRadius:6,overflow:"hidden"}}>
              {[["ADV","advantage","#166534"],["NRM","normal","#1e293b"],["DIS","disadvantage","#7f1d1d"]].map(([label,mode,bg])=>(
                <button key={mode} onClick={()=>setRollMode(mode)} style={{padding:"4px 7px",background:rollMode===mode?bg:"transparent",color:rollMode===mode?"#fff":"#64748b",border:"none",cursor:"pointer",fontSize:10,fontWeight:"bold",transition:"all 0.15s"}}>{label}</button>
              ))}
            </div>
            {activeChar&&<button onClick={()=>updateCharacter(activeChar.id,{inspiration:!activeChar.inspiration})} style={{padding:"4px 8px",background:activeChar.inspiration?"#78350f":"#0f172a",border:`1px solid ${activeChar.inspiration?"#f59e0b":"#1e293b"}`,borderRadius:6,color:activeChar.inspiration?"#f59e0b":"#475569",fontSize:10,fontWeight:"bold",cursor:"pointer",transition:"all 0.2s"}}>✨ {activeChar.inspiration?"Inspired":"Inspire"}</button>}
            {activeChar&&<button onClick={()=>setShowLevelUp(true)} style={{padding:"4px 8px",background:"#1e293b",border:"1px solid #334155",borderRadius:6,color:"#f59e0b",fontSize:10,fontWeight:"bold",cursor:"pointer"}}>⬆ Lv Up</button>}
            {/* View toggles */}
            {[["📋","sheet"],["🗺","map"],["📖","dashboard"],["⚒","builder"]].map(([icon,mode])=>(
              <button key={mode} onClick={()=>setViewMode(mode)} style={{padding:"5px 8px",background:viewMode===mode?"#1e293b":"transparent",border:`1px solid ${viewMode===mode?"#475569":"#1e293b"}`,borderRadius:6,color:viewMode===mode?"#fff":"#475569",fontSize:14,cursor:"pointer",transition:"all 0.15s"}}>{icon}</button>
            ))}
            <button onClick={()=>setShowCombat(p=>!p)} style={{padding:"5px 8px",background:showCombat?"#1e293b":"transparent",border:`1px solid ${showCombat?"#475569":"#1e293b"}`,borderRadius:6,color:showCombat?"#fff":"#475569",fontSize:14,cursor:"pointer"}}>⚔️</button>
            <button onClick={()=>setShowChat(p=>!p)} style={{padding:"5px 8px",background:showChat?"#1e293b":"transparent",border:`1px solid ${showChat?"#475569":"#1e293b"}`,borderRadius:6,color:showChat?"#fff":"#475569",fontSize:14,cursor:"pointer"}}>💬</button>
            {/* TTS */}
            <button onClick={()=>{setAutoSpeak(p=>{if(p)stop();return!p;});}} style={{padding:"5px 9px",borderRadius:6,fontSize:10,fontWeight:"bold",cursor:"pointer",transition:"all 0.2s",background:autoSpeak?"#78350f":"transparent",border:`1px solid ${autoSpeak?"#f59e0b":"#1e293b"}`,color:autoSpeak?"#fbbf24":"#475569",display:"flex",alignItems:"center",gap:4}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
              {autoSpeak?"AUTO":"TTS"}
            </button>
          </div>
        </div>

        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          {/* ── Center Panel ── */}
          <div style={{flex:1,overflowY:"auto",minWidth:0}}>
            {viewMode==="map"?(
              <BattleMap characters={characters} combatState={combatState} mapState={mapState} onUpdateMapState={u=>setMapState(p=>({...p,...u}))} onCombatUpdate={handleCombatUpdate} onSystemMessage={addSystem} onAppendInput={text=>setInput(prev=>prev?prev+" "+text:text)}/>
            ):viewMode==="builder"?(
              <div style={{padding:24,maxWidth:900,margin:"0 auto"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,borderBottom:"1px solid #1e293b",paddingBottom:12}}>
                  <h2 style={{color:"#f59e0b",fontFamily:"Georgia,serif",fontSize:22,margin:0}}>⚒ Character Builder — 2024 Edition</h2>
                  <button onClick={()=>setShowBuilder(true)} style={{padding:"10px 20px",background:"#b45309",border:"none",borderRadius:10,color:"#fff",fontWeight:"900",cursor:"pointer",fontSize:13}}>➕ New Character</button>
                </div>
                {/* Party overview in 2024 layout */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16,marginBottom:24}}>
                  {characters.map(char=>{
                    const bg2024=BACKGROUNDS_2024.find(b=>b.id===char.backgroundId);
                    const species2024=SPECIES_2024.find(s=>s.id===char.speciesId);
                    const classDat=CLASSES_2024.find(c=>c.name===char.class.split(" ")[0]);
                    const nextLvlXP=XP_THRESHOLDS[char.level]||0;
                    const curLvlXP=XP_THRESHOLDS[char.level-1]||0;
                    const xpPct=nextLvlXP>0?Math.min(100,((char.xp||0)-curLvlXP)/(nextLvlXP-curLvlXP)*100):100;
                    const isBloodied=char.hp.current<=char.hp.max/2;
                    return (
                      <div key={char.id} onClick={()=>{setSelectedCharId(char.id);setViewMode("sheet");}} style={{background:"#0f172a",border:`2px solid ${selectedCharId===char.id?"#f59e0b":"#1e293b"}`,borderRadius:16,overflow:"hidden",cursor:"pointer",transition:"all 0.2s"}}
                        onMouseEnter={e=>e.currentTarget.style.borderColor="#f59e0b55"} onMouseLeave={e=>e.currentTarget.style.borderColor=selectedCharId===char.id?"#f59e0b":"#1e293b"}>
                        {/* Header bar */}
                        <div style={{height:6,background:char.avatarColor||"#4b5563"}}/>
                        <div style={{padding:"14px 16px"}}>
                          <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
                            <div style={{width:48,height:48,borderRadius:12,background:char.avatarColor||"#4b5563",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:22,flexShrink:0,border:"3px solid #0a0f1a"}}>{char.name[0]}</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontWeight:900,fontSize:15,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{char.name}</div>
                              <div style={{fontSize:11,color:"#64748b"}}>Level {char.level} {char.species} {char.class.split(" ")[0]}</div>
                              {char.subclass&&<div style={{fontSize:10,color:"#a855f7",fontWeight:"bold"}}>{char.subclass}</div>}
                            </div>
                          </div>
                          {/* Origin tags */}
                          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                            {char.background&&<span style={{fontSize:9,color:"#f59e0b",background:"#78350f20",border:"1px solid #78350f40",borderRadius:4,padding:"2px 7px",fontWeight:"bold",textTransform:"uppercase"}}>{char.background}</span>}
                            {char.originFeat&&<span style={{fontSize:9,color:"#a855f7",background:"#4c1d9520",border:"1px solid #4c1d9540",borderRadius:4,padding:"2px 7px",fontWeight:"bold",textTransform:"uppercase"}}>✨ {char.originFeat}</span>}
                          </div>
                          {/* Stat row */}
                          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:4,marginBottom:12}}>
                            {Object.entries(char.stats).map(([k,v])=>{
                              const m=Math.floor((v-10)/2);
                              return (
                                <div key={k} style={{textAlign:"center",background:"#0a0f1a",borderRadius:6,padding:"5px 2px"}}>
                                  <div style={{fontSize:8,color:"#475569",fontWeight:"bold",textTransform:"uppercase"}}>{k}</div>
                                  <div style={{fontSize:13,fontWeight:900,color:"#e2e8f0"}}>{v}</div>
                                  <div style={{fontSize:9,color:"#f59e0b"}}>{m>=0?"+":""}{m}</div>
                                </div>
                              );
                            })}
                          </div>
                          {/* HP/AC/Initiative */}
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}}>
                            {[["HP",`${char.hp.current}/${char.hp.max}`,isBloodied?"#ef4444":"#22c55e"],["AC",char.ac,"#60a5fa"],["Init",`${char.initiative>=0?"+":""}${char.initiative}`,"#f59e0b"]].map(([l,v,c])=>(
                              <div key={l} style={{background:"#0a0f1a",borderRadius:6,padding:"5px",textAlign:"center"}}>
                                <div style={{fontSize:8,color:"#475569",textTransform:"uppercase",fontWeight:"bold"}}>{l}{l==="HP"&&isBloodied?" 🩸":""}</div>
                                <div style={{fontSize:13,fontWeight:"bold",color:c}}>{v}</div>
                              </div>
                            ))}
                          </div>
                          {/* Weapon masteries */}
                          {char.attacks?.some(a=>a.mastery)&&(
                            <div style={{marginBottom:8}}>
                              <div style={{fontSize:9,color:"#f59e0b",fontWeight:"bold",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>⚔️ Weapon Masteries</div>
                              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                                {char.attacks.filter(a=>a.mastery).map((a,i)=>(
                                  <span key={i} style={{fontSize:10,background:"#1c1407",border:"1px solid #78350f40",borderRadius:4,padding:"2px 6px",color:"#fbbf24"}}>{a.name}: {a.mastery}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Exhaustion warning */}
                          {(char.exhaustion||0)>0&&<div style={{fontSize:10,color:"#a78bfa",fontWeight:"bold",marginBottom:6}}>💜 Exhaustion {char.exhaustion} (−{char.exhaustion*2} to all d20 Tests)</div>}
                          {/* XP bar */}
                          <div style={{marginBottom:4}}>
                            <div style={{height:4,background:"#1e293b",borderRadius:2,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${xpPct}%`,background:"#7c3aed",borderRadius:2,transition:"width 0.5s"}}/>
                            </div>
                            <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                              <span style={{fontSize:9,color:"#475569"}}>{char.xp||0} XP</span>
                              <span style={{fontSize:9,color:"#334155"}}>Lv{Math.min(char.level+1,20)}: {XP_THRESHOLDS[char.level]||"MAX"}</span>
                            </div>
                          </div>
                          {/* Species traits summary */}
                          {species2024&&(
                            <div style={{marginTop:8,background:"#0a0f1a",borderRadius:6,padding:"6px 8px"}}>
                              <div style={{fontSize:9,color:"#3b82f6",fontWeight:"bold",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>🧬 {species2024.name} Traits</div>
                              {species2024.traits.slice(0,2).map((t,ti)=>(
                                <div key={ti} style={{fontSize:9,color:"#475569"}}>• {t.split("(")[0].trim()}</div>
                              ))}
                              {species2024.traits.length>2&&<div style={{fontSize:9,color:"#334155"}}>+{species2024.traits.length-2} more</div>}
                            </div>
                          )}
                        </div>
                        <div style={{padding:"8px 16px",borderTop:"1px solid #1e293b",display:"flex",gap:6}}>
                          <button onClick={e=>{e.stopPropagation();setSelectedCharId(char.id);setViewMode("sheet");}} style={{flex:1,padding:"6px",background:"#1e293b",border:"none",borderRadius:6,color:"#94a3b8",fontSize:11,cursor:"pointer",fontWeight:"bold"}}>📋 Sheet</button>
                          <button onClick={e=>{e.stopPropagation();setSelectedCharId(char.id);setShowLevelUp(true);}} style={{flex:1,padding:"6px",background:"#1e293b",border:"none",borderRadius:6,color:"#f59e0b",fontSize:11,cursor:"pointer",fontWeight:"bold"}}>⬆ Level Up</button>
                        </div>
                      </div>
                    );
                  })}
                  {/* Add character card */}
                  <button onClick={()=>setShowBuilder(true)} style={{background:"transparent",border:"2px dashed #1e293b",borderRadius:16,minHeight:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,cursor:"pointer",color:"#334155",transition:"all 0.2s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.style.color="#f59e0b";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e293b";e.currentTarget.style.color="#334155";}}>
                    <div style={{width:56,height:56,border:"2px dashed currentColor",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>+</div>
                    <span style={{fontSize:11,fontWeight:"bold",textTransform:"uppercase",letterSpacing:2}}>New Character</span>
                    <span style={{fontSize:10,opacity:0.6}}>2024 Rules Builder</span>
                  </button>
                </div>
                {/* 2024 class reference table */}
                <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:16,padding:20}}>
                  <div style={{fontWeight:"bold",color:"#f59e0b",fontSize:14,marginBottom:14}}>📚 2024 Class Reference</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
                    {CLASSES_2024.map(c=>(
                      <div key={c.name} style={{background:"#0a0f1a",borderRadius:8,padding:"10px 12px",border:"1px solid #1e293b"}}>
                        <div style={{fontWeight:"bold",color:"#e2e8f0",fontSize:12,marginBottom:4}}>{c.name}</div>
                        <div style={{fontSize:10,color:"#64748b"}}>d{c.hitDie} • {c.saves.map(s=>s.toUpperCase()).join("/")} saves</div>
                        <div style={{fontSize:10,color:"#475569",marginTop:2}}>Armor: {c.armor}</div>
                        <div style={{fontSize:10,color:"#a855f7",marginTop:2}}>{c.subclassName} @ Lv3</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ):viewMode==="dashboard"?(
              <div style={{padding:24,maxWidth:800,margin:"0 auto"}}>
                {/* ── Header with live location + quest/npc counts ── */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,borderBottom:"1px solid #1e293b",paddingBottom:14}}>
                  <div>
                    <h2 style={{color:"#f59e0b",fontFamily:"Georgia,serif",fontSize:22,margin:0,marginBottom:4}}>📖 Campaign Dashboard</h2>
                    <div style={{fontSize:11,color:"#475569"}}>📍 {storyState.location}</div>
                    {storyState.recentEvents&&<div style={{fontSize:11,color:"#64748b",marginTop:3,fontStyle:"italic",maxWidth:500}}>{storyState.recentEvents}</div>}
                  </div>
                  <div style={{display:"flex",gap:8,flexShrink:0}}>
                    {[["⚔️",(storyState.quests||[]).filter(q=>q.status==="Active").length,"Active"],["👥",(storyState.npcs||[]).length,"NPCs"],["📜",(storyState.journal||[]).length,"Entries"]].map(([icon,count,label])=>(
                      <div key={label} style={{textAlign:"center",background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,padding:"6px 10px",minWidth:50}}>
                        <div style={{fontSize:14}}>{icon}</div>
                        <div style={{fontWeight:"bold",color:"#e2e8f0",fontSize:14}}>{count}</div>
                        <div style={{fontSize:9,color:"#475569",textTransform:"uppercase"}}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Tabs ── */}
                <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"1px solid #1e293b"}}>
                  {[["quests","⚔️ Quests"],["npcs","👥 NPCs"],["journal","📜 Journal"],["stash","🎒 Stash"],["2024rules","📋 Rules"]].map(([t,label])=>(
                    <button key={t} onClick={()=>setDashTab(t)} style={{padding:"8px 16px",background:"none",border:"none",borderBottom:`2px solid ${dashTab===t?"#f59e0b":"transparent"}`,color:dashTab===t?"#f59e0b":"#64748b",cursor:"pointer",fontWeight:"bold",fontSize:11,textTransform:"uppercase",letterSpacing:0.8,marginBottom:-1}}>{label}</button>
                  ))}
                </div>

                {/* ══ QUESTS TAB ══════════════════════════════════════════════════ */}
                {dashTab==="quests"&&(()=>{
                  const shownQuests=(storyState.quests||[]).filter(q=>qFilter==="All"||q.status===qFilter);
                  return (
                  <div style={{display:"flex",flexDirection:"column",gap:14}}>
                    {(storyState.quests||[]).length===0?(
                      <div style={{color:"#334155",textAlign:"center",padding:40,fontSize:13,fontStyle:"italic"}}>No quests yet. Talk to NPCs and explore!</div>
                    ):(
                      <div>
                        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                          {["Active","Completed","Failed","All"].map(f=>(
                            <button key={f} onClick={()=>setQFilter(f)} style={{padding:"4px 12px",background:qFilter===f?"#78350f":"transparent",border:`1px solid ${qFilter===f?"#f59e0b":"#1e293b"}`,borderRadius:20,color:qFilter===f?"#fcd34d":"#475569",fontSize:11,cursor:"pointer",fontWeight:qFilter===f?"bold":"normal"}}>{f}</button>
                          ))}
                        </div>
                        {shownQuests.length===0&&<div style={{color:"#334155",textAlign:"center",padding:30,fontSize:13,fontStyle:"italic"}}>No {qFilter.toLowerCase()} quests.</div>}
                        {shownQuests.map((q,qi)=>{
                          const sc=q.status==="Completed"?"#22c55e":q.status==="Failed"?"#ef4444":"#f59e0b";
                          const sb=q.status==="Completed"?"#14532d":q.status==="Failed"?"#7f1d1d":"#78350f";
                          const done=(q.objectives||[]).filter(o=>o.done).length;
                          const total=(q.objectives||[]).length;
                          return (
                            <div key={q.id||qi} style={{background:"#0a0f1a",border:`1px solid ${sc}30`,borderLeft:`3px solid ${sc}`,borderRadius:"0 12px 12px 0",padding:16,marginBottom:12}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                                <div style={{fontWeight:"bold",color:"#e2e8f0",fontSize:15,flex:1,paddingRight:8}}>{q.title}</div>
                                <span style={{fontSize:10,fontWeight:"bold",textTransform:"uppercase",padding:"2px 8px",borderRadius:12,background:sb,color:sc,flexShrink:0}}>{q.status}</span>
                              </div>
                              <div style={{display:"flex",gap:12,fontSize:11,color:"#475569",marginBottom:8,flexWrap:"wrap"}}>
                                {q.giver&&<span>📜 From: <span style={{color:"#94a3b8"}}>{q.giver}</span></span>}
                                {q.location&&<span>📍 <span style={{color:"#94a3b8"}}>{q.location}</span></span>}
                                {q.reward&&<span>💰 <span style={{color:"#fcd34d"}}>{q.reward}</span></span>}
                              </div>
                              {q.description&&<div style={{color:"#94a3b8",fontSize:13,marginBottom:total>0?10:0,lineHeight:1.5}}>{q.description}</div>}
                              {total>0&&(
                                <div style={{borderTop:"1px solid #1e293b",paddingTop:8}}>
                                  <div style={{fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:0.8,marginBottom:6}}>Objectives — {done}/{total}</div>
                                  {total>1&&<div style={{background:"#1e293b",borderRadius:4,height:4,marginBottom:8,overflow:"hidden"}}><div style={{height:"100%",background:sc,width:`${(done/total)*100}%`,borderRadius:4,transition:"width 0.3s"}}/></div>}
                                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                                    {(q.objectives||[]).map((obj,oi)=>(
                                      <div key={oi} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                                        <span style={{color:obj.done?"#22c55e":"#334155",fontSize:13,flexShrink:0}}>{obj.done?"✓":"○"}</span>
                                        <span style={{color:obj.done?"#475569":"#94a3b8",fontSize:12,textDecoration:obj.done?"line-through":"none",lineHeight:1.4}}>{obj.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  );
                })()}

                {/* ══ NPCS TAB ════════════════════════════════════════════════════ */}
                {dashTab==="npcs"&&(()=>{
                  const npcStatuses=["All","Friendly","Neutral","Hostile","Unknown"];
                  const shownNpcs=(storyState.npcs||[]).filter(n=>npcFilter==="All"||n.status===npcFilter);
                  return (
                  <div>
                    {(storyState.npcs||[]).length===0?(
                      <div style={{color:"#334155",textAlign:"center",padding:40,fontSize:13,fontStyle:"italic"}}>No known NPCs yet. Meet people in the world!</div>
                    ):(
                      <div>
                        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                          {npcStatuses.map(s=>{
                            const col=s==="Friendly"?"#22c55e":s==="Hostile"?"#ef4444":s==="Neutral"?"#f59e0b":"#64748b";
                            return <button key={s} onClick={()=>setNpcFilter(s)} style={{padding:"4px 12px",background:npcFilter===s?col+"20":"transparent",border:`1px solid ${npcFilter===s?col:"#1e293b"}`,borderRadius:20,color:npcFilter===s?col:"#475569",fontSize:11,cursor:"pointer",fontWeight:npcFilter===s?"bold":"normal"}}>{s}</button>;
                          })}
                        </div>
                        {shownNpcs.length===0&&<div style={{color:"#334155",textAlign:"center",padding:30,fontSize:13,fontStyle:"italic"}}>No {npcFilter.toLowerCase()} NPCs yet.</div>}
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                          {shownNpcs.map((n,ni)=>{
                            const sc=n.status==="Friendly"?"#22c55e":n.status==="Hostile"?"#ef4444":n.status==="Neutral"?"#f59e0b":"#64748b";
                            const sb=n.status==="Friendly"?"#14532d":n.status==="Hostile"?"#7f1d1d":n.status==="Neutral"?"#78350f":"#1e293b";
                            return (
                              <div key={n.id||ni} style={{background:"#0a0f1a",border:`1px solid ${sc}30`,borderRadius:12,padding:14}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                                  <div style={{flex:1,paddingRight:8}}>
                                    <div style={{fontWeight:"bold",color:"#e2e8f0",fontSize:14}}>{n.name}</div>
                                    {n.role&&<div style={{fontSize:11,color:"#64748b",marginTop:1}}>{n.role}</div>}
                                  </div>
                                  <span style={{fontSize:9,fontWeight:"bold",textTransform:"uppercase",padding:"2px 6px",borderRadius:8,background:sb,color:sc,flexShrink:0}}>{n.status||"Unknown"}</span>
                                </div>
                                {n.faction&&<div style={{fontSize:11,color:"#7c3aed",marginBottom:4}}>🏛 {n.faction}</div>}
                                {n.location&&<div style={{fontSize:11,color:"#475569",marginBottom:6}}>📍 {n.location}</div>}
                                {n.description&&<div style={{color:"#94a3b8",fontSize:12,marginBottom:n.notes?8:0,lineHeight:1.5}}>{n.description}</div>}
                                {n.notes&&<div style={{fontSize:11,color:"#64748b",fontStyle:"italic",borderTop:"1px solid #1e293b",paddingTop:6,marginTop:4}}>📝 {n.notes}</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })()}

                {/* ══ JOURNAL TAB ═════════════════════════════════════════════════ */}
                {dashTab==="journal"&&(
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {(storyState.journal||[]).length===0?(
                      <div style={{color:"#334155",textAlign:"center",padding:40,fontSize:13,fontStyle:"italic"}}>
                        <div style={{fontSize:32,marginBottom:12}}>📜</div>
                        The journal is empty. Your story hasn't begun yet…
                      </div>
                    ):[...(storyState.journal||[])].reverse().map((entry,i)=>{
                      const typeIcons={scene:"🎭",quest:"⚔️",discovery:"🔍",combat:"⚔️",npc:"👤"};
                      const typeColors={scene:"#3b82f6",quest:"#f59e0b",discovery:"#22c55e",combat:"#ef4444",npc:"#c084fc"};
                      const icon=typeIcons[entry.type]||"📜";
                      const color=typeColors[entry.type]||"#64748b";
                      return (
                        <div key={entry.id||i} style={{background:"#0a0f1a",border:`1px solid ${color}25`,borderLeft:`3px solid ${color}`,borderRadius:"0 12px 12px 0",padding:"14px 16px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                            <div style={{display:"flex",gap:8,alignItems:"center"}}>
                              <span style={{fontSize:16}}>{icon}</span>
                              <span style={{fontWeight:"bold",color:"#e2e8f0",fontSize:14}}>{entry.title}</span>
                            </div>
                            <span style={{fontSize:10,color:color,fontWeight:"bold",textTransform:"uppercase",padding:"2px 7px",background:color+"18",borderRadius:10}}>{entry.type}</span>
                          </div>
                          <div style={{display:"flex",gap:10,fontSize:10,color:"#334155",marginBottom:8}}>
                            {entry.location&&<span>📍 {entry.location}</span>}
                            <span>{new Date(entry.timestamp).toLocaleDateString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                          </div>
                          <div style={{color:"#94a3b8",fontSize:13,lineHeight:1.6}}>{entry.body}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {dashTab==="stash"&&(()=>{
                  const stash=storyState.partyStash||{gold:0,items:[]};
                  const distributeGold=(charId,amount)=>{
                    if(amount<=0||stash.gold<amount) return;
                    setStoryState(p=>({...p,partyStash:{...p.partyStash,gold:Math.max(0,(p.partyStash?.gold||0)-amount)}}));
                    setCharacters(prev=>prev.map(c=>c.id===charId?{...c,currency:{...c.currency,gp:(c.currency?.gp||0)+amount}}:c));
                  };
                  const distributeItem=(idx,charId)=>{
                    const item=stash.items[idx]; if(!item) return;
                    setStoryState(p=>({...p,partyStash:{...p.partyStash,items:p.partyStash.items.filter((_,i)=>i!==idx)}}));
                    setCharacters(prev=>prev.map(c=>{ if(c.id!==charId) return c; const eq=[...(c.equipment||[])]; const ei=eq.findIndex(e=>e.name.toLowerCase()===item.name.toLowerCase()); if(ei>=0) eq[ei]={...eq[ei],qty:(eq[ei].qty||1)+(item.qty||1)}; else eq.push({...item,equipped:false,weight:0}); return {...c,equipment:eq}; }));
                  };
                  return (
                  <div style={{display:"flex",flexDirection:"column",gap:16}}>
                    {/* Gold */}
                    <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:10,padding:14}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                        <span style={{fontSize:16}}>💰</span>
                        <span style={{color:"#f59e0b",fontWeight:"bold",fontSize:13}}>Party Stash</span>
                        <span style={{marginLeft:"auto",color:"#fcd34d",fontWeight:"bold",fontSize:16,fontFamily:"monospace"}}>{stash.gold} gp</span>
                      </div>
                      {stash.gold>0&&(
                        <div>
                          <div style={{fontSize:10,color:"#475569",marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>Distribute Gold</div>
                          <div style={{display:"flex",flexDirection:"column",gap:4}}>
                            {characters.map(c=>(
                              <div key={c.id} style={{display:"flex",alignItems:"center",gap:6}}>
                                <div style={{width:8,height:8,borderRadius:"50%",background:c.avatarColor||"#475569",flexShrink:0}}/>
                                <span style={{flex:1,fontSize:11,color:"#94a3b8"}}>{c.name}</span>
                                <span style={{fontSize:10,color:"#475569",marginRight:4}}>{c.currency?.gp||0} gp</span>
                                {[1,5,10,50].filter(a=>a<=stash.gold).map(a=>(
                                  <button key={a} onClick={()=>distributeGold(c.id,a)} style={{padding:"2px 7px",background:"#78350f20",border:"1px solid #78350f",borderRadius:4,color:"#f59e0b",fontSize:10,cursor:"pointer",fontWeight:"bold"}}>+{a}</button>
                                ))}
                                <button onClick={()=>distributeGold(c.id,stash.gold)} style={{padding:"2px 7px",background:"#78350f",border:"none",borderRadius:4,color:"#fff",fontSize:10,cursor:"pointer",fontWeight:"bold"}}>All</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {stash.gold===0&&stash.items.length===0&&<div style={{color:"#334155",textAlign:"center",padding:20,fontSize:12,fontStyle:"italic"}}>The stash is empty. Loot enemies and find treasure!</div>}
                    </div>
                    {/* Items */}
                    {stash.items.length>0&&(
                      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:10,padding:14}}>
                        <div style={{fontSize:10,color:"#475569",fontWeight:"bold",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>📦 Items ({stash.items.length})</div>
                        <div style={{display:"flex",flexDirection:"column",gap:8}}>
                          {stash.items.map((item,idx)=>(
                            <div key={idx} style={{padding:"10px 12px",background:"#050d18",border:"1px solid #1e293b",borderRadius:8}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:item.desc?6:0}}>
                                <span style={{fontSize:14}}>{item.category==="Weapon"?"⚔️":item.category==="Armor"?"🛡":item.isConsumable?"🧪":"🎒"}</span>
                                <span style={{flex:1,fontWeight:"bold",fontSize:12,color:"#e2e8f0"}}>{item.name}{(item.qty||1)>1?` ×${item.qty}`:""}</span>
                              </div>
                              {item.desc&&<div style={{fontSize:10,color:"#475569",marginBottom:6}}>{item.desc}</div>}
                              <div style={{fontSize:10,color:"#334155",marginBottom:6,textTransform:"uppercase"}}>{item.category}</div>
                              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                {characters.map(c=>(
                                  <button key={c.id} onClick={()=>distributeItem(idx,c.id)} style={{padding:"3px 8px",background:"#1e293b",border:"1px solid #334155",borderRadius:5,color:"#94a3b8",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                                    <div style={{width:6,height:6,borderRadius:"50%",background:c.avatarColor||"#475569"}}/>{c.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })()}

                                {dashTab==="2024rules"&&(
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {[
                      {icon:"⚔️",title:"Weapon Mastery",color:"#f59e0b",body:"Each class can apply Mastery properties to specific weapons. Mastery effects: Cleave (attack nearby on hit), Graze (min damage on miss), Nick (extra light weapon attack), Push (push 10ft), Sap (disadvantage on next attack), Slow (speed −10ft), Topple (knock prone DC save), Vex (advantage on next attack vs same target)."},
                      {icon:"🩸",title:"Bloodied Condition",color:"#ef4444",body:"A creature is Bloodied when its HP drops to 50% or below. This is visible to all creatures within sight. Some monsters have special reactions when they become Bloodied. Tracked automatically in the Combat Tracker."},
                      {icon:"💜",title:"Exhaustion (2024)",color:"#a78bfa",body:"Each Exhaustion level imposes -2 to all d20 Tests (attack rolls, ability checks, saving throws). At 10 levels, the creature dies. A Long Rest reduces Exhaustion by 1. The old speed/disadvantage system is gone — this is purely additive penalties."},
                      {icon:"🎲",title:"Critical Hits",color:"#22c55e",body:"On a natural 20, double ALL damage dice rolled for that attack — including Sneak Attack dice, Divine Smite dice, and any other extra damage. Modifiers are not doubled. This applies to all weapon and spell attacks."},
                      {icon:"🎭",title:"Background Stats (2024)",color:"#3b82f6",body:"Ability Score Increases come from your Background, not your Species. Each Background grants +2 to one ability and +1 to another, or +1 to three different abilities. Species now only grant traits — no stat increases."},
                      {icon:"✨",title:"Origin Feats",color:"#c084fc",body:"Every character gets an Origin Feat at Level 1, granted by their Background. These include Alert, Lucky, Tough, Skilled, Musician, Healer, Savage Attacker, Tavern Brawler, Crafter, and Magic Initiate variants. These are separate from the feat you gain at Level 4/8/12 (ASI levels)."},
                    ].map((rule,i)=>(
                      <div key={i} style={{background:"#0f172a",border:`1px solid ${rule.color}33`,borderLeft:`3px solid ${rule.color}`,borderRadius:"0 12px 12px 0",padding:16}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <span style={{fontSize:18}}>{rule.icon}</span>
                          <span style={{fontWeight:"bold",color:rule.color,fontSize:14}}>{rule.title}</span>
                        </div>
                        <div style={{color:"#94a3b8",fontSize:12,lineHeight:1.6}}>{rule.body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ):activeChar?(
              <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
                {/* Stats row */}
                <div style={{background:"#0a0f1a",borderBottom:"1px solid #1e293b",padding:"12px 16px"}}>
                  <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:10,flexWrap:"wrap"}}>
                    {Object.entries(activeChar.stats).map(([key,val])=>(
                      <StatBlock key={key} label={key.toUpperCase()} value={val} onClick={(l,mod)=>{
                        performRoll(mod,(roll,rollText,total,flavor,exNote)=>`${flavor}${activeChar.name} ${l} check: ${rollText}+${mod}${exNote}=${total}`, "check");
                      }}/>
                    ))}
                  </div>
                  {/* ── Saving Throws row ─────────────────────────── */}
                  {(()=>{
                    const classDef = CLASSES_2024.find(c=>c.name===activeChar.class.split(" ")[0]);
                    const classSaves = classDef?.saves||[];
                    // Collect extra save profs from passiveEffects
                    const extraSaveProfs = (activeChar.passiveEffects||[])
                      .filter(pe=>pe.type==="save_prof").map(pe=>pe.stat);
                    // Flat save bonuses: {stat→bonus} ("all" key = every stat)
                    const saveBonuses={};
                    (activeChar.passiveEffects||[]).filter(pe=>pe.type==="save_bonus").forEach(pe=>{
                      const k=pe.stat||"all";
                      saveBonuses[k]=(saveBonuses[k]||0)+pe.value;
                    });
                    const allSaveBonus=saveBonuses["all"]||0;
                    return (
                      <div style={{display:"flex",gap:4,justifyContent:"center",marginBottom:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:8,color:"#475569",textTransform:"uppercase",alignSelf:"center",marginRight:2,letterSpacing:0.5}}>Saves</span>
                        {["str","dex","con","int","wis","cha"].map(stat=>{
                          const raw=activeChar.stats[stat]||10;
                          const base=Math.floor((raw-10)/2);
                          const isProficient=classSaves.includes(stat)||extraSaveProfs.includes(stat);
                          const flatBonus=(saveBonuses[stat]||0)+allSaveBonus;
                          const total=base+(isProficient?activeChar.proficiency:0)+flatBonus;
                          const sign=total>=0?"+":"";
                          return (
                            <button key={stat} onClick={()=>{
                              const mod=total;
                              performRoll(mod,(roll,rollText,tot,flavor,exNote)=>
                                `${flavor}${activeChar.name} ${stat.toUpperCase()} save: ${rollText}+${mod}${exNote}=${tot}`,
                              "save");
                            }}
                            title={`${stat.toUpperCase()} save${isProficient?" (proficient)":""}${flatBonus?` (+${flatBonus} bonus)`:""}`}
                            style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"3px 6px",background:"#0f172a",border:`1px solid ${isProficient?"#f59e0b44":"#1e293b"}`,borderRadius:6,cursor:"pointer",minWidth:36,transition:"all 0.15s"}}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.style.background="#1e293b";}}
                            onMouseLeave={e=>{e.currentTarget.style.borderColor=isProficient?"#f59e0b44":"#1e293b";e.currentTarget.style.background="#0f172a";}}>
                              <span style={{fontSize:7,color:isProficient?"#f59e0b":"#475569",fontWeight:"900",textTransform:"uppercase",letterSpacing:0.5}}>{stat}{isProficient?"●":""}</span>
                              <span style={{fontSize:11,fontWeight:"bold",color:isProficient?"#fbbf24":"#94a3b8"}}>{sign}{total}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                  <div style={{display:"flex",gap:14,justifyContent:"center",fontSize:11,flexWrap:"wrap"}}>
                    {[["Prof",`+${activeChar.proficiency}`,"#94a3b8"],["Speed",`${activeChar.speed}ft`,"#94a3b8"],["PP",10+(activeChar.skills?.find(s=>s.name==="Perception")?.mod||0),"#94a3b8"],...(["Cleric","Wizard","Sorcerer","Bard","Druid","Warlock"].includes(activeChar.class.split(" ")[0])?[["Sp.DC",8+activeChar.proficiency+getSpellMod(activeChar),"#c084fc"],["Sp.Atk",`+${activeChar.proficiency+getSpellMod(activeChar)}`,"#c084fc"]]:[] )].map(([l,v,c])=>(
                      <div key={l} style={{textAlign:"center"}}>
                        <div style={{color:"#475569",fontSize:9,textTransform:"uppercase"}}>{l}</div>
                        <div style={{fontWeight:"bold",color:c}}>{v}</div>
                      </div>
                    ))}
                    {/* HP / Death Saves (swaps when downed) */}
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      {activeChar.hp.current > 0 ? (
                        <div style={{textAlign:"center"}}>
                          <div style={{color:"#475569",fontSize:9,textTransform:"uppercase"}}>HP{activeChar.hp.current<=activeChar.hp.max/2?" 🩸":""}</div>
                          <div style={{display:"flex",alignItems:"center",gap:3}}>
                            <button onClick={()=>updateCharacter(activeChar.id,{hp:{...activeChar.hp,current:Math.max(0,activeChar.hp.current-1)}})} style={{color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:14}}>−</button>
                            <span style={{fontWeight:"bold",color:activeChar.hp.current<activeChar.hp.max/2?"#ef4444":"#22c55e",fontSize:13,fontFamily:"monospace"}}>{activeChar.hp.current}/{activeChar.hp.max}</span>
                            <button onClick={()=>updateCharacter(activeChar.id,{hp:{...activeChar.hp,current:Math.min(activeChar.hp.max,activeChar.hp.current+1)}})} style={{color:"#22c55e",background:"none",border:"none",cursor:"pointer",fontSize:14}}>+</button>
                          </div>
                        </div>
                      ) : (
                        /* ── Death Save tracker ── */
                        <div style={{background:"#1c0a0a",border:"1px solid #7f1d1d",borderRadius:8,padding:"4px 8px",textAlign:"center",minWidth:140}}>
                          <div style={{fontSize:9,color:"#ef4444",fontWeight:"900",textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>
                            ☠ Death Saves
                            {/* Let them manually increment HP back up too */}
                            <button onClick={()=>updateCharacter(activeChar.id,{hp:{...activeChar.hp,current:1},deathSaves:{successes:0,failures:0}})} style={{marginLeft:6,fontSize:9,color:"#22c55e",background:"none",border:"none",cursor:"pointer"}} title="Stabilize / set to 1 HP">+1</button>
                          </div>
                          <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:4}}>
                            <div style={{textAlign:"center"}}>
                              <div style={{fontSize:8,color:"#22c55e",marginBottom:2}}>✓ Successes</div>
                              <div style={{display:"flex",gap:3,justifyContent:"center"}}>
                                {[0,1,2].map(i=>(
                                  <div key={i} style={{width:10,height:10,borderRadius:"50%",background:i<(activeChar.deathSaves?.successes||0)?"#22c55e":"#1e293b",border:"1px solid #22c55e44"}}/>
                                ))}
                              </div>
                            </div>
                            <div style={{textAlign:"center"}}>
                              <div style={{fontSize:8,color:"#ef4444",marginBottom:2}}>✗ Failures</div>
                              <div style={{display:"flex",gap:3,justifyContent:"center"}}>
                                {[0,1,2].map(i=>(
                                  <div key={i} style={{width:10,height:10,borderRadius:"50%",background:i<(activeChar.deathSaves?.failures||0)?"#ef4444":"#1e293b",border:"1px solid #ef444444"}}/>
                                ))}
                              </div>
                            </div>
                          </div>
                          {(activeChar.deathSaves?.successes||0)>=3 ? (
                            <div style={{fontSize:9,color:"#22c55e",fontWeight:"bold"}}>Stable ✓</div>
                          ) : (activeChar.deathSaves?.failures||0)>=3 ? (
                            <div style={{fontSize:9,color:"#ef4444",fontWeight:"bold"}}>Dead ✗</div>
                          ) : (
                            <button onClick={()=>{
                              const r=rollDie(20);
                              playDice();
                              const cur=activeChar.deathSaves||{successes:0,failures:0};
                              let {successes,failures}=cur;
                              let msg="";
                              if(r===20){
                                updateCharacter(activeChar.id,{hp:{...activeChar.hp,current:1},deathSaves:{successes:0,failures:0}});
                                msg=`${activeChar.name} Death Save: d20(${r}) — NATURAL 20! Regains 1 HP!`;
                              } else if(r===1){
                                failures=Math.min(3,failures+2);
                                updateCharacter(activeChar.id,{deathSaves:{successes,failures}});
                                msg=`${activeChar.name} Death Save: d20(${r}) — NATURAL 1! Two failures (${failures}/3)`;
                              } else if(r>=10){
                                successes=Math.min(3,successes+1);
                                updateCharacter(activeChar.id,{deathSaves:{successes,failures}});
                                msg=`${activeChar.name} Death Save: d20(${r}) — SUCCESS (${successes}/3)${successes>=3?" — STABLE!":""}`;
                              } else {
                                failures=Math.min(3,failures+1);
                                updateCharacter(activeChar.id,{deathSaves:{successes,failures}});
                                msg=`${activeChar.name} Death Save: d20(${r}) — FAILURE (${failures}/3)${failures>=3?" — DEAD!":""}`;
                              }
                              setInput(p=>p?`${p} ${msg}`:msg);
                            }} style={{fontSize:9,padding:"2px 10px",background:"#7f1d1d",border:"1px solid #ef4444",borderRadius:4,color:"#fca5a5",cursor:"pointer",fontWeight:"bold"}}>
                              🎲 Roll Death Save
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Exhaustion */}
                    <div style={{textAlign:"center"}}>
                      <div style={{color:"#475569",fontSize:9,textTransform:"uppercase"}}>Exhaustion</div>
                      <div style={{display:"flex",alignItems:"center",gap:3}}>
                        <button onClick={()=>updateCharacter(activeChar.id,{exhaustion:Math.max(0,(activeChar.exhaustion||0)-1)})} style={{color:"#94a3b8",background:"none",border:"none",cursor:"pointer",fontSize:12}}>−</button>
                        <span style={{fontWeight:"bold",color:(activeChar.exhaustion||0)>0?"#a78bfa":"#334155",fontSize:12}}>{activeChar.exhaustion||0}{(activeChar.exhaustion||0)>0?` (${exhaustionPenalty})`:""}</span>
                        <button onClick={()=>updateCharacter(activeChar.id,{exhaustion:Math.min(10,(activeChar.exhaustion||0)+1)})} style={{color:"#94a3b8",background:"none",border:"none",cursor:"pointer",fontSize:12}}>+</button>
                      </div>
                    </div>
                    {/* XP */}
                    <div style={{textAlign:"center"}}>
                      <div style={{color:"#475569",fontSize:9,textTransform:"uppercase"}}>XP</div>
                      <div style={{display:"flex",alignItems:"center",gap:3}}>
                        <span style={{fontWeight:"bold",color:"#7c3aed",fontSize:12}}>{activeChar.xp||0}</span>
                        <button onClick={()=>{ const newXp=(activeChar.xp||0)+100; updateCharacter(activeChar.id,{xp:newXp}); addSystem(`${activeChar.name} gains 100 XP (Total: ${newXp})`); }} style={{color:"#7c3aed",background:"none",border:"none",cursor:"pointer",fontSize:10,fontWeight:"bold"}}>+100</button>
                      </div>
                    </div>
                    {/* ── Hit Dice ──────────────────────────── */}
                    {(()=>{
                      const classDef=CLASSES_2024.find(c=>c.name===activeChar.class.split(" ")[0]);
                      const hitDie=classDef?.hitDie||8;
                      const total=activeChar.level;
                      const used=activeChar.hitDiceUsed||0;
                      const remaining=Math.max(0,total-used);
                      const conMod=Math.floor(((activeChar.stats?.con||10)-10)/2);
                      const canSpend=remaining>0&&activeChar.hp.current>0&&activeChar.hp.current<activeChar.hp.max;
                      return (
                        <div style={{textAlign:"center"}}>
                          <div style={{color:"#475569",fontSize:9,textTransform:"uppercase"}}>Hit Dice</div>
                          <div style={{display:"flex",alignItems:"center",gap:3}}>
                            <span style={{fontWeight:"bold",color:remaining===0?"#475569":remaining<=total/2?"#f59e0b":"#22c55e",fontSize:11,fontFamily:"monospace"}}>{remaining}/{total} d{hitDie}</span>
                            <button
                              disabled={!canSpend}
                              title={canSpend?`Spend 1d${hitDie}+${conMod>=0?"+":""}${conMod} to heal`:"No dice left or HP is full"}
                              onClick={()=>{
                                const roll=rollDie(hitDie);
                                const heal=Math.max(1,roll+conMod);
                                const newHp=Math.min(activeChar.hp.max,activeChar.hp.current+heal);
                                updateCharacter(activeChar.id,{
                                  hp:{...activeChar.hp,current:newHp},
                                  hitDiceUsed:(activeChar.hitDiceUsed||0)+1,
                                });
                                playDice();
                                const msg=`${activeChar.name} spends a Hit Die: d${hitDie}(${roll})${conMod>=0?"+":""}${conMod}=${heal} HP healed → ${newHp}/${activeChar.hp.max} HP`;
                                setInput(p=>p?`${p} ${msg}`:msg);
                              }}
                              style={{fontSize:9,padding:"1px 6px",background:canSpend?"#14532d":"#1e293b",border:`1px solid ${canSpend?"#22c55e44":"#1e293b"}`,borderRadius:4,color:canSpend?"#86efac":"#334155",cursor:canSpend?"pointer":"not-allowed",fontWeight:"bold",transition:"all 0.15s"}}
                            >🎲</button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  {/* Origin + Background tags */}
                  <div style={{display:"flex",gap:6,justifyContent:"center",marginTop:8,flexWrap:"wrap"}}>
                    {activeChar.background&&<span style={{fontSize:9,color:"#f59e0b",background:"#78350f20",border:"1px solid #78350f40",borderRadius:4,padding:"2px 7px",fontWeight:"bold",textTransform:"uppercase"}}>{activeChar.background}</span>}
                    {activeChar.originFeat&&<span style={{fontSize:9,color:"#a855f7",background:"#4c1d9520",border:"1px solid #4c1d9540",borderRadius:4,padding:"2px 7px",fontWeight:"bold",textTransform:"uppercase"}}>✨ {activeChar.originFeat}</span>}
                    {activeChar.subclass&&<span style={{fontSize:9,color:"#22c55e",background:"#14532d20",border:"1px solid #14532d40",borderRadius:4,padding:"2px 7px",fontWeight:"bold",textTransform:"uppercase"}}>{activeChar.subclass}</span>}
                  </div>
                </div>

                {/* Tabs */}
                <div style={{display:"flex",background:"#0a0f1a",borderBottom:"1px solid #1e293b",flexShrink:0}}>
                  {tabs.map(tab=>{
                    const isLocked = activeChar && conditionLocksActions(activeCharWithStatus) &&
                      ["actions","spells"].includes(tab);
                    return (
                    <button key={tab} onClick={()=>setActiveTab(tab)}
                      title={isLocked ? `${activeChar.name} is incapacitated and cannot take actions.` : undefined}
                      style={{flex:1,padding:"10px 4px",background:"none",border:"none",borderBottom:`2px solid ${activeTab===tab?"#f59e0b":"transparent"}`,color:isLocked?"#4b1b1b":activeTab===tab?"#f59e0b":"#475569",cursor:"pointer",fontSize:10,fontWeight:"bold",textTransform:"uppercase",letterSpacing:0.5,transition:"all 0.15s",position:"relative"}}>
                      {tab}
                      {isLocked&&<span style={{position:"absolute",top:2,right:2,fontSize:7,color:"#ef4444"}}>🚫</span>}
                    </button>
                    );
                  })}
                </div>

                {/* Tab Content */}
                <div style={{flex:1,overflowY:"auto",padding:16}}>
                  {/* ACTIONS */}
                  {activeTab==="actions"&&(()=>{
                    // ── Action Economy state for THIS turn ──────────────
                    const isMyTurn = combatState.isActive &&
                      combatState.combatants[combatState.turn]?.id === activeChar.id;
                    const tr = combatState.turnResources || {action:1,bonusAction:1,reaction:1,movement:activeChar.speed||30};
                    const consumed = (res) => {
                      if (!combatState.isActive) return false;
                      if (res==="action")   return tr.action===0;
                      if (res==="bonus")    return tr.bonusAction===0;
                      if (res==="reaction") return tr.reaction===0;
                      return false;
                    };
                    const useResource = (res, amount) => {
                      if (!combatState.isActive) return;
                      handleCombatUpdate({action:"consume_resource", resource:res, amount});
                    };

                    // ── Resource pip row ─────────────────────────────────
                    const ResourcePip = ({label, color, avail, icon}) => (
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,opacity:avail?1:0.35,transition:"opacity 0.2s"}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:avail?color+"30":"#1e293b",border:`2px solid ${avail?color:"#334155"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,transition:"all 0.2s"}}>{avail?icon:"✕"}</div>
                        <span style={{fontSize:9,color:avail?color:"#334155",fontWeight:"bold",textTransform:"uppercase",letterSpacing:0.5}}>{label}</span>
                      </div>
                    );

                    // ── Section header ────────────────────────────────────
                    const SectionHdr = ({label, color, bg, border, icon, spent}) => (
                      <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:spent?"#0a0f1a":bg,borderRadius:7,border:`1px solid ${spent?"#1e293b":border}`,marginBottom:8,marginTop:4,opacity:spent?0.5:1,transition:"all 0.2s"}}>
                        <span style={{fontSize:13}}>{icon}</span>
                        <span style={{flex:1,fontSize:10,fontWeight:"bold",textTransform:"uppercase",letterSpacing:1,color:spent?"#334155":color}}>{label}</span>
                        {spent&&<span style={{fontSize:9,color:"#475569",fontStyle:"italic"}}>SPENT</span>}
                      </div>
                    );

                    // ── Single action button ──────────────────────────────
                    // ── Active combatant's toggle map (auto-cleared on next turn) ──
                    const activeCombatant = combatState.isActive
                      ? combatState.combatants.find(c=>c.id===activeChar.id)
                      : null;
                    const toggles = activeCombatant?.toggles || {};
                    const fireToggle = (toggleKey) => {
                      if(!combatState.isActive||!activeCombatant) return;
                      handleCombatUpdate({action:"set_toggle",targetId:activeChar.id,toggle:toggleKey,value:!toggles[toggleKey]});
                    };

                    const ActionBtn = ({label, icon, desc, res, onClick, damage, range, subLabel, isToggle, toggleKey, isActive:toggleActive}) => {
                      const m = ACTION_TYPE_META[res]||ACTION_TYPE_META.free;
                      const isSpent = consumed(res);
                      // Toggles are never "spent" in the normal sense — they just switch on/off
                      const disabled = !isToggle && combatState.isActive && isSpent;
                      const on = isToggle && toggleActive;
                      const bg   = on ? "#1a0f02" : disabled ? "#0a0f1a" : "#0f172a";
                      const bord = on ? "#f59e0b" : disabled ? "#1e293b" : "#1e293b";
                      const lbord= on ? "#f59e0b" : disabled ? "#1e293b" : m.border;
                      return (
                        <button disabled={disabled} onClick={()=>{
                          if(disabled) return;
                          if(isToggle){ fireToggle(toggleKey); return; }
                          onClick(); useResource(res);
                        }}
                          style={{display:"flex",gap:8,alignItems:"flex-start",padding:"9px 11px",
                            background:bg, border:`1px solid ${bord}`, borderLeft:`3px solid ${lbord}`,
                            borderRadius:8, cursor:disabled?"not-allowed":"pointer", textAlign:"left",
                            opacity:disabled?0.38:1, transition:"all 0.15s", width:"100%",
                            boxShadow:on?"0 0 8px #f59e0b44":undefined}}
                          onMouseEnter={e=>{if(!disabled){e.currentTarget.style.background=on?"#241500":"#1c1407";e.currentTarget.style.borderColor=on?"#f59e0b":m.color+"44";}}}
                          onMouseLeave={e=>{if(!disabled){e.currentTarget.style.background=bg;e.currentTarget.style.borderColor=bord;}}}>
                          <span style={{fontSize:14,flexShrink:0,marginTop:1}}>{icon}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:"bold",color:disabled?"#334155":on?"#f59e0b":"#e2e8f0",fontSize:12}}>
                              {label}{on&&<span style={{marginLeft:6,fontSize:9,color:"#f59e0b",fontWeight:"normal",background:"#78350f40",borderRadius:3,padding:"1px 5px",border:"1px solid #78350f80"}}>ON</span>}
                            </div>
                            {subLabel&&<div style={{fontSize:9,color:on?"#f59e0b":m.color,fontWeight:"bold",marginBottom:1}}>{subLabel}</div>}
                            {desc&&<div style={{fontSize:10,color:on?"#b45309":"#475569",lineHeight:1.4,marginTop:1}}>{desc}</div>}
                          </div>
                          {damage&&<div style={{textAlign:"right",flexShrink:0}}>
                            <div style={{fontWeight:"bold",color:m.color,fontFamily:"monospace",fontSize:11}}>{damage}</div>
                            {range&&<div style={{fontSize:9,color:"#475569"}}>{range}</div>}
                          </div>}
                          {isToggle&&<div style={{flexShrink:0,display:"flex",alignItems:"center"}}>
                            <div style={{width:28,height:16,borderRadius:8,background:on?"#f59e0b":"#1e293b",border:`1px solid ${on?"#b45309":"#334155"}`,position:"relative",transition:"all 0.2s"}}>
                              <div style={{width:12,height:12,borderRadius:"50%",background:"#fff",position:"absolute",top:1,left:on?13:1,transition:"left 0.2s"}}/>
                            </div>
                          </div>}
                        </button>
                      );
                    };

                    // ── Group attacks by action type ──────────────────────
                    const atkByType = {action:[], bonus:[], reaction:[]};
                    (activeChar.attacks||[]).forEach(atk => {
                      const t = getAttackActionType(atk);
                      (atkByType[t]||atkByType.action).push(atk);
                    });

                    // Check if a ranged attack needs ammo
                    const getAmmoForAtk = (atk) => {
                      if(!/ranged/i.test(atk.range||"") && !/bow|crossbow|sling/i.test(atk.name||"")) return null;
                      const ammoItem = (activeChar.equipment||[]).find(it => it.isAmmo && (it.ammoFor||[]).some(w => (atk.name||"").toLowerCase().includes(w.toLowerCase())));
                      return ammoItem || null;
                    };
                    const consumeAmmo = (atk) => {
                      const ammoItem = getAmmoForAtk(atk);
                      if(!ammoItem) return;
                      const eq = (activeChar.equipment||[]).map(it => it.isAmmo && it.name===ammoItem.name ? {...it, qty:Math.max(0,(it.qty||1)-1)} : it);
                      updateCharacter(activeChar.id, {equipment:eq});
                    };
                    const rollAtk = (atk, res) => {
                      const ammo = getAmmoForAtk(atk);
                      if(ammo && (ammo.qty||0) <= 0) {
                        addSystem(`⚠️ No ${ammo.name} — ${activeChar.name} cannot make a ranged attack!`); return;
                      }
                      useResource(res);
                      if(ammo) consumeAmmo(atk);
                      performRoll(atk.bonus,(roll,rollText,total,flavor,exNote)=>{
                        const isCrit=roll===20;
                        const dmg=rollDamageString(atk.damage,isCrit);
                        const ammoNote = ammo ? ` [${ammo.name}: ${Math.max(0,(ammo.qty||1)-1)} left]` : "";
                        return `${flavor}${activeChar.name} attacks with ${atk.name}: ${rollText}+${atk.bonus}${exNote}=${total}${isCrit?" ⚡CRIT!":""} → Dmg ${dmg.text} ${atk.type}.${atk.mastery?` [Mastery: ${atk.mastery}]`:""}${ammoNote}`;
                      }, "attack");
                    };

                    return (
                      <div>
                        {/* ── TURN RESOURCE TRACKER ─────────────────────── */}
                        <div style={{background:"#050d18",border:"1px solid #1e3a5f",borderRadius:10,padding:"10px 14px",marginBottom:14}}>
                          <div style={{fontSize:10,color:"#3b82f6",fontWeight:"bold",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>
                            {combatState.isActive ? (isMyTurn ? "⚔️ Your Turn" : `Turn: ${combatState.combatants[combatState.turn]?.name||"?"}`) : "📋 Action Reference"}
                          </div>
                          <div style={{display:"flex",gap:14,alignItems:"flex-start",justifyContent:"space-around",flexWrap:"wrap"}}>
                            <ResourcePip label="Action"   color="#f59e0b" avail={!consumed("action")}   icon="⚔️"/>
                            <ResourcePip label="Bonus"    color="#22c55e" avail={!consumed("bonus")}    icon="⚡"/>
                            <ResourcePip label="Reaction" color="#a855f7" avail={!consumed("reaction")} icon="↩️"/>
                            {/* Movement tracker */}
                            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                              <div style={{display:"flex",alignItems:"center",gap:3}}>
                                <button onClick={()=>useResource("movement",10)} disabled={!combatState.isActive||tr.movement<=0}
                                  style={{width:20,height:20,background:"#1e293b",border:"1px solid #334155",borderRadius:3,color:"#ef4444",fontSize:12,cursor:combatState.isActive&&tr.movement>0?"pointer":"not-allowed",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",opacity:combatState.isActive&&tr.movement>0?1:0.4}}>−</button>
                                <div style={{minWidth:36,height:20,background:tr.movement>0?"#0a2010":"#0a0f1a",border:`1px solid ${tr.movement>0?"#15803d":"#334155"}`,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center"}}>
                                  <span style={{fontSize:10,fontWeight:"bold",color:tr.movement>0?"#22c55e":"#334155",fontFamily:"monospace"}}>{combatState.isActive?tr.movement:activeChar.speed||30}</span>
                                </div>
                                <button onClick={()=>handleCombatUpdate({action:"consume_resource",resource:"movement",amount:-10})} disabled={!combatState.isActive}
                                  style={{width:20,height:20,background:"#1e293b",border:"1px solid #334155",borderRadius:3,color:"#22c55e",fontSize:12,cursor:combatState.isActive?"pointer":"not-allowed",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",opacity:combatState.isActive?1:0.4}}>+</button>
                              </div>
                              <span style={{fontSize:9,color:"#22c55e",fontWeight:"bold",textTransform:"uppercase",letterSpacing:0.5}}>Move ft</span>
                            </div>
                          </div>
                          {combatState.isActive&&isMyTurn&&<div style={{marginTop:8,borderTop:"1px solid #0f2235",paddingTop:6,display:"flex",gap:6,justifyContent:"center"}}>
                            <button onClick={()=>handleCombatUpdate({action:"next_turn"})} style={{padding:"4px 12px",background:"#f59e0b",border:"none",borderRadius:5,color:"#000",fontWeight:"bold",fontSize:10,cursor:"pointer"}}>End Turn ▶</button>
                          </div>}
                        </div>

                        {/* ── Class Resource Tracker (Superiority Dice, etc.) ─ */}
                        {(()=>{
                          const resDefs=(activeChar.passiveEffects||[]).filter(pe=>pe.type==="class_resource");
                          if(resDefs.length===0) return null;
                          return (
                            <ClassResourceTracker
                              char={activeChar}
                              onSpend={(id)=>{
                                const res={...(activeChar.classResources||{})};
                                if(!res[id]) return;
                                res[id]={...res[id], current:Math.max(0,res[id].current-1)};
                                updateCharacter(activeChar.id,{classResources:res});
                              }}
                              onRefill={(id)=>{
                                const defs=(activeChar.passiveEffects||[]).filter(pe=>pe.type==="class_resource");
                                const res={...(activeChar.classResources||{})};
                                if(id && typeof id==="string") {
                                  // Refill specific resource
                                  const def=defs.find(d=>d.id===id);
                                  if(def) res[id]={current:def.max};
                                } else {
                                  // Short Rest: refill all short-rest resources
                                  defs.filter(d=>d.resetOn==="short").forEach(d=>{ res[d.id]={current:d.max}; });
                                }
                                updateCharacter(activeChar.id,{classResources:res});
                              }}
                            />
                          );
                        })()}

                        {/* ── Dynamic class abilities from Rules Engine ────── */}
                        {(()=>{
                          const charAbilities = getCharacterActions(activeChar);
                          // Merge magic item actions into class abilities by actionType
                          const magicEffects = getMagicItemEffects(activeChar);
                          const magicActionsByType = {action:[], bonus:[], reaction:[], free:[]};
                          magicEffects.actions.forEach(a => {
                            const t = a.actionType||"action";
                            (magicActionsByType[t]||magicActionsByType.action).push(a);
                          });
                          const sections = [
                            {key:"action",   label:"Actions",      color:"#f59e0b", bg:"#1c140730", border:"#b45309", icon:"⚔️",  res:"action",   classAbils:[...charAbilities.action,   ...(magicActionsByType.action||[])],  weapons:atkByType.action},
                            {key:"bonus",    label:"Bonus Actions", color:"#22c55e", bg:"#14532d20", border:"#15803d", icon:"⚡",  res:"bonus",    classAbils:[...charAbilities.bonus,    ...(magicActionsByType.bonus||[])],   weapons:atkByType.bonus},
                            {key:"reaction", label:"Reactions",     color:"#a855f7", bg:"#2d1b6920", border:"#7c3aed", icon:"↩️", res:"reaction", classAbils:[...charAbilities.reaction, ...(magicActionsByType.reaction||[])],weapons:atkByType.reaction},
                            {key:"free",     label:"Free / Passive",color:"#64748b", bg:"#1e293b20", border:"#334155", icon:"○",  res:"free",     classAbils:[...charAbilities.free,     ...(magicActionsByType.free||[])],    weapons:[]},
                          ];
                          const genericNarrate = (a, res) => {
                            setInput(p=>`${p} ${activeChar.name} uses ${a.label}.`.trim());
                            useResource(res);
                          };
                          const isLockedOut = conditionLocksActions(activeCharWithStatus);
                          return (<div>
                          {isLockedOut&&(()=>{
                            const lockingConds = [...getActiveConditions(activeCharWithStatus)]
                              .filter(id=>STATUS_CONDITIONS_DATABASE[id]?.locksActions)
                              .map(id=>STATUS_CONDITIONS_DATABASE[id]);
                            return (
                              <div style={{background:"#1c0505",border:"1px solid #7f1d1d",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                                <span style={{fontSize:20,flexShrink:0}}>🚫</span>
                                <div>
                                  <div style={{fontSize:11,fontWeight:"bold",color:"#f87171",marginBottom:2}}>Actions Locked</div>
                                  <div style={{fontSize:10,color:"#fca5a5"}}>{activeChar.name} is <strong>{lockingConds.map(c=>c.name).join(" / ")}</strong> — cannot take Actions, Bonus Actions, or Reactions.</div>
                                </div>
                              </div>
                            );
                          })()}
                          <div style={{opacity:isLockedOut?0.35:1,pointerEvents:isLockedOut?"none":"auto",transition:"opacity 0.2s"}}>
                          {sections.map(({key, label, color, bg, border, icon, res, classAbils, weapons})=>{
                            if(key==="free"&&classAbils.length===0) return null;
                            const universals = COMMON_ACTIONS[key]||[];
                            // For the "action" key, only Attack stays visible; the rest fold into the accordion
                            const attackUniversal = key==="action" ? universals.filter(a=>a.id==="attack") : universals;
                            const collapsibleUniversals = key==="action" ? universals.filter(a=>a.id!=="attack") : [];
                            return (
                              <div key={key} style={{marginBottom:key==="free"?0:14}}>
                                <SectionHdr label={label} color={color} bg={bg} border={border} icon={icon} spent={consumed(res)}/>
                                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                                  {/* 1. Weapon attacks — always visible, always first */}
                                  {weapons.map((atk,i)=>(
                                    <ActionBtn key={"w"+key+i} label={atk.name} icon={key==="bonus"?"⚡":key==="reaction"?"↩️":"🗡️"} res={res}
                                      damage={`${atk.bonus>=0?"+":""}${atk.bonus} / ${atk.damage}`}
                                      range={atk.range} subLabel={`${atk.type}${atk.mastery?" • "+atk.mastery:""}`}
                                      desc={atk.properties||undefined}
                                      onClick={()=>rollAtk(atk, res)}/>
                                  ))}
                                  {/* 2. Consumable items (Potions etc.) appear in Bonus Actions */}
                                  {key==="bonus"&&(activeChar.equipment||[]).filter(it=>it.isConsumable&&(it.qty||0)>0&&it.healDice).map((item,ci)=>{
                                    return (
                                      <ActionBtn key={"consumable_"+ci}
                                        label={item.name}
                                        icon="🧪"
                                        res="bonus"
                                        damage={`${item.healDice}+${item.healMod||0}`}
                                        range={`×${item.qty} left`}
                                        desc={item.desc||""}
                                        onClick={()=>{
                                          const eq=(activeChar.equipment||[]).map(it2=>it2.name===item.name?{...it2,qty:Math.max(0,(it2.qty||1)-1)}:it2);
                                          updateCharacter(activeChar.id,{equipment:eq});
                                          const rollHeal=()=>{ const dice=(item.healDice||"2d4").split("d"); const num=parseInt(dice[0])||2; const sides=parseInt(dice[1])||4; const rolls=Array.from({length:num},()=>rollDie(sides)); const total=rolls.reduce((a,b)=>a+b,0)+(item.healMod||0); return {total,text:`[${rolls.join(",")}]+${item.healMod||0}=${total}`}; };
                                          const h=rollHeal();
                                          const newHp=Math.min((activeChar.hp?.max||99),(activeChar.hp?.current||0)+h.total);
                                          updateCharacter(activeChar.id,{hp:{...activeChar.hp,current:newHp}});
                                          if(combatState.isActive) handleCombatUpdate({action:"update_combatants",combatants:[{id:activeChar.id,hp:newHp}]});
                                          addSystem(`🧪 ${activeChar.name} drinks ${item.name}: heals ${h.text} HP → now ${newHp}/${activeChar.hp?.max||"?"} HP. (${Math.max(0,(item.qty||1)-1)} remaining)`);
                                        }}
                                      />
                                    );
                                  })}
                                  {/* 3. Class/feat abilities — always visible */}
                                  {classAbils.map(a=>(
                                    <ActionBtn key={a.id} label={a.label} icon={a.icon} res={res}
                                      isToggle={!!a.isToggle} toggleKey={a.toggleKey}
                                      isActive={!!(a.isToggle&&toggles[a.toggleKey])}
                                      desc={a.isToggle?(toggles[a.toggleKey]?a.descOn:a.descOff):a.desc}
                                      onClick={()=>genericNarrate(a, res)}/>
                                  ))}
                                  {/* 3. Attack universal (always show inline) */}
                                  {attackUniversal.map(a=>(
                                    <ActionBtn key={a.id} label={a.label} icon={a.icon} desc={a.desc} res={res}
                                      onClick={()=>genericNarrate(a, res)}/>
                                  ))}
                                  {/* 4. Remaining universal actions — collapsed by default */}
                                  {collapsibleUniversals.length>0&&(
                                    <details style={{marginTop:2}}>
                                      <summary style={{
                                        listStyle:"none",cursor:"pointer",userSelect:"none",
                                        display:"flex",alignItems:"center",gap:6,
                                        padding:"7px 11px",background:"#0a0f1a",
                                        border:"1px solid #1e293b",borderRadius:8,
                                        color:"#475569",fontSize:11,fontWeight:"bold",
                                        transition:"all 0.15s",
                                      }}
                                      onMouseEnter={e=>e.currentTarget.style.color="#94a3b8"}
                                      onMouseLeave={e=>e.currentTarget.style.color="#475569"}>
                                        <span style={{fontSize:12,opacity:0.6}}>▶</span>
                                        <span>Common Actions</span>
                                        <span style={{marginLeft:"auto",fontSize:9,color:"#334155",fontWeight:"normal"}}>{collapsibleUniversals.length} available</span>
                                      </summary>
                                      <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:5,paddingLeft:4}}>
                                        {collapsibleUniversals.map(a=>(
                                          <ActionBtn key={a.id} label={a.label} icon={a.icon} desc={a.desc} res={res}
                                            onClick={()=>genericNarrate(a, res)}/>
                                        ))}
                                      </div>
                                    </details>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          </div></div>
                        );
                        })()}
                      </div>
                    );
                  })()}

                  {/* SPELLS */}
                  {activeTab==="spells"&&(()=>{
                    const isMyTurn = combatState.isActive &&
                      combatState.combatants[combatState.turn]?.id === activeChar.id;
                    const tr = combatState.turnResources || {action:1,bonusAction:1,reaction:1,movement:activeChar.speed||30};
                    const consumed = (res) => {
                      if (!combatState.isActive) return false;
                      if (res==="action")   return tr.action===0;
                      if (res==="bonus")    return tr.bonusAction===0;
                      if (res==="reaction") return tr.reaction===0;
                      return false;
                    };
                    const useResource = (res) => {
                      if (!combatState.isActive) return;
                      handleCombatUpdate({action:"consume_resource", resource:res});
                    };

                    const SectionHdr = ({label, color, bg, border, icon, spent}) => (
                      <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:spent?"#0a0f1a":bg,borderRadius:7,border:`1px solid ${spent?"#1e293b":border}`,marginBottom:8,marginTop:8,opacity:spent?0.5:1,transition:"all 0.2s"}}>
                        <span style={{fontSize:13}}>{icon}</span>
                        <span style={{flex:1,fontSize:10,fontWeight:"bold",textTransform:"uppercase",letterSpacing:1,color:spent?"#334155":color}}>{label}</span>
                        {spent&&<span style={{fontSize:9,color:"#475569",fontStyle:"italic"}}>SPENT</span>}
                      </div>
                    );

                    // Categorize all spells
                    const allCantrips = (activeChar.spells.cantrips||[]).map(s=>({...normalizeSpell(s),lvl:0}));
                    const allLeveled = [];
                    for(let l=1;l<=9;l++){
                      const key="lvl"+l;
                      (activeChar.spells[key]||[]).filter(Boolean).forEach(s=>{
                        allLeveled.push({...normalizeSpell(s), lvl:l});
                      });
                    }

                    const spellsByType = {action:[], bonus:[], reaction:[], ritual:[]};
                    allCantrips.forEach(sp => { const t=getSpellActionType(sp); (spellsByType[t]||spellsByType.action).push(sp); });
                    allLeveled.forEach(sp  => { const t=getSpellActionType(sp); (spellsByType[t]||spellsByType.action).push(sp); });

                    const castSpell = (sp, res) => {
                      const slotNum = sp.lvl;
                      // Consume spell slot if leveled
                      if(slotNum>0){
                        const slotData=activeChar.spells.slots?.[slotNum]||{max:0,used:0};
                        if(slotData.max>0){
                          if(slotData.used>=slotData.max){addSystem("No Lv"+slotNum+" spell slots remaining!");return;}
                          const ns={...activeChar.spells.slots};
                          ns[slotNum]={...slotData,used:Math.min(slotData.max,slotData.used+1)};
                          updateCharacter(activeChar.id,{spells:{...activeChar.spells,slots:ns}});
                        }
                      }
                      // Consume action resource
                      useResource(res);
                      // Roll or narrate
                      const mod=getSpellMod(activeChar)+activeChar.proficiency;
                      if(sp.damage){
                        if(sp.type?.includes("Attack")){
                          performRoll(mod,(roll,rollText,total,flavor,exNote)=>{
                            const isCrit=roll===20; const dmg=rollDamageString(sp.damage,isCrit);
                            // Evaluate spell-specific dice triggers (e.g. Chromatic Orb bounce)
                            evaluateSpellTriggers(sp.name, dmg.rolls, dmg.total, activeChar.name, addSystem);
                            return `${flavor}${activeChar.name} casts ${sp.name}${slotNum>0?` (Lv${slotNum})`:""}: ${rollText}+${mod}${exNote}=${total}${isCrit?" ⚡CRIT!":""} → ${dmg.text} dmg.`;
                          });
                        } else {
                          const dc=8+mod; const dmg=rollDamageString(sp.damage);
                          // Evaluate spell-specific dice triggers for save-based spells too
                          evaluateSpellTriggers(sp.name, dmg.rolls, dmg.total, activeChar.name, addSystem);
                          setInput(p=>`${p} ${activeChar.name} casts ${sp.name}${slotNum>0?` (Lv${slotNum})`:""} DC${dc}. → ${dmg.text} dmg.`.trim());
                        }
                      } else setInput(p=>`${p} ${activeChar.name} casts ${sp.name}${slotNum>0?` (Lv${slotNum})`:""}.`.trim());
                    };

                    const SpellBtn = ({sp, res}) => {
                      const m = ACTION_TYPE_META[res]||ACTION_TYPE_META.action;
                      const isSpent = consumed(res);
                      const slotData = sp.lvl>0 ? (activeChar.spells.slots?.[sp.lvl]||{max:0,used:0}) : null;
                      const noSlots = slotData && slotData.max>0 && slotData.used>=slotData.max;
                      const disabled = (combatState.isActive && isSpent) || noSlots;
                      const remaining = slotData ? Math.max(0,slotData.max-slotData.used) : null;
                      return (
                        <button disabled={disabled} onClick={()=>{ if(!disabled) castSpell(sp, res); }}
                          style={{display:"flex",gap:8,alignItems:"flex-start",padding:"9px 11px",background:disabled?"#0a0f1a":"#0f172a",
                            border:`1px solid ${disabled?"#1a2435":"#1e293b"}`,borderLeft:`3px solid ${disabled?"#1e293b":m.border}`,
                            borderRadius:8,cursor:disabled?"not-allowed":"pointer",textAlign:"left",opacity:disabled?0.38:1,transition:"all 0.15s",width:"100%"}}
                          onMouseEnter={e=>{if(!disabled){e.currentTarget.style.background="#140e2a";e.currentTarget.style.borderColor=m.color+"44";}}}
                          onMouseLeave={e=>{if(!disabled){e.currentTarget.style.background="#0f172a";e.currentTarget.style.borderColor="#1e293b";}}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                              <span style={{fontWeight:"bold",color:disabled?"#334155":"#e2e8f0",fontSize:12}}>{sp.name}</span>
                              {sp.lvl===0&&<span style={{fontSize:9,background:"#1e293b",borderRadius:3,padding:"1px 5px",color:"#64748b",fontWeight:"bold"}}>CANTRIP</span>}
                              {sp.lvl>0&&<span style={{fontSize:9,background:m.bg||"#1e293b",borderRadius:3,padding:"1px 5px",color:m.color,fontWeight:"bold",border:`1px solid ${m.border}`}}>Lv{sp.lvl}</span>}
                              {(()=>{const aoe=getSpellAoE(sp);return aoe?<span style={{fontSize:9,background:"#3b1a6b",border:"1px solid #a855f760",borderRadius:3,padding:"1px 6px",color:"#d8b4fe",fontWeight:"bold",whiteSpace:"nowrap"}}>💥 {aoe}</span>:null;})()}
                            </div>
                            {(sp.type&&sp.type!=="Spell")||sp.damage?<div style={{fontSize:10,color:"#7c3aed",marginTop:1}}>{sp.type}{sp.damage?` • ${sp.damage}`:""}</div>:null}
                            {sp.desc&&<div style={{fontSize:10,color:"#475569",lineHeight:1.4,marginTop:1}}>{sp.desc}</div>}
                          </div>
                          {slotData&&slotData.max>0&&(
                            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0}}>
                              <div style={{display:"flex",gap:2,flexWrap:"wrap",justifyContent:"flex-end",maxWidth:48}}>
                                {Array.from({length:slotData.max}).map((_,si)=>(
                                  <div key={si} style={{width:7,height:7,borderRadius:"50%",background:si<remaining?"#a855f7":"#1e293b",border:"1px solid #334155"}}/>
                                ))}
                              </div>
                              <span style={{fontSize:9,color:"#64748b"}}>{remaining}/{slotData.max}</span>
                              <div style={{display:"flex",gap:2}}>
                                <button onClick={e=>{e.stopPropagation();const ns={...activeChar.spells.slots};const sl=ns[sp.lvl]||{max:0,used:0};if(sl.used<sl.max){ns[sp.lvl]={...sl,used:sl.used+1};updateCharacter(activeChar.id,{spells:{...activeChar.spells,slots:ns}});}}} style={{color:"#ef4444",background:"none",border:"none",cursor:"pointer",fontSize:9,padding:0}}>−</button>
                                <button onClick={e=>{e.stopPropagation();const ns={...activeChar.spells.slots};const sl=ns[sp.lvl]||{max:0,used:0};if(sl.used>0){ns[sp.lvl]={...sl,used:sl.used-1};updateCharacter(activeChar.id,{spells:{...activeChar.spells,slots:ns}});}}} style={{color:"#22c55e",background:"none",border:"none",cursor:"pointer",fontSize:9,padding:0}}>+</button>
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    };

                    const typeOrder = [
                      {key:"action",   label:"Action Spells",       color:"#f59e0b", bg:"#1c140730", border:"#b45309", icon:"⚔️"},
                      {key:"bonus",    label:"Bonus Action Spells",  color:"#22c55e", bg:"#14532d20", border:"#15803d", icon:"⚡"},
                      {key:"reaction", label:"Reaction Spells",      color:"#a855f7", bg:"#2d1b6920", border:"#7c3aed", icon:"↩️"},
                      {key:"ritual",   label:"Rituals",              color:"#60a5fa", bg:"#0a152020", border:"#3b82f6", icon:"📖"},
                    ];

                    // Slot management controls for a level (shown once per level in a summary row)
                    const renderedLevels = new Set();
                    const SlotRow = ({lvl}) => {
                      if(renderedLevels.has(lvl)||lvl===0) return null;
                      renderedLevels.add(lvl);
                      const sd=activeChar.spells.slots?.[lvl]||{max:0,used:0};
                      if(sd.max===0) return null;
                      const rem=Math.max(0,sd.max-sd.used);
                      return null; // slots shown inline on each SpellBtn
                    };

                    const hasAny = typeOrder.some(t=>spellsByType[t.key]?.length>0);
                    if(!hasAny) return (
                      <div style={{textAlign:"center",padding:"32px 16px",color:"#475569",fontSize:12}}>
                        <div style={{fontSize:32,marginBottom:8}}>📖</div>
                        No spells known yet. Use Level Up to learn spells or take a Magic Initiate feat.
                      </div>
                    );

                    return (
                      <div>
                        {typeOrder.map(({key,label,color,bg,border,icon})=>{
                          const list = spellsByType[key]||[];
                          if(list.length===0) return null;
                          const isSpent = consumed(key==="ritual"?"action":key);
                          return (
                            <div key={key} style={{marginBottom:4}}>
                              <SectionHdr label={label} color={color} bg={bg} border={border} icon={icon}
                                spent={key!=="ritual"&&isSpent}/>
                              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                                {list.map((sp,i)=><SpellBtn key={i} sp={sp} res={key==="ritual"?"action":key}/>)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* INVENTORY */}
                  {activeTab==="inventory"&&(
                    <div>
                      {/* ── ATTUNEMENT PANEL ── */}
                      {(()=>{
                        const attuned = activeChar.attunedItems||[];
                        const attuneSlots = [0,1,2];
                        const toggleAttune = (itemId) => {
                          const cur = [...(activeChar.attunedItems||[])];
                          if(cur.includes(itemId)){
                            updateCharacter(activeChar.id,{attunedItems:cur.filter(x=>x!==itemId)});
                          } else {
                            if(cur.length>=3){ addSystem(`⚠️ ${activeChar.name} can only attune to 3 magic items at once. Remove an attunement first.`); return; }
                            updateCharacter(activeChar.id,{attunedItems:[...cur,itemId]});
                          }
                        };
                        const attuneEntries = attuned.map(id=>MAGIC_ITEM_DATABASE[id]).filter(Boolean);
                        if(attuneEntries.length===0 && !(activeChar.equipment||[]).some(it=>it.magicItemId&&MAGIC_ITEM_DATABASE[it.magicItemId]?.requiresAttunement)) return null;
                        return (
                          <div style={{background:"#0a1628",border:"1px solid #1e40af",borderRadius:10,padding:14,marginBottom:12}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                              <span style={{fontSize:13}}>✨</span>
                              <span style={{color:"#93c5fd",fontWeight:"bold",fontSize:11,textTransform:"uppercase",letterSpacing:1,flex:1}}>Attunement</span>
                              <span style={{fontSize:10,color:attuned.length>=3?"#ef4444":"#475569",fontWeight:"bold"}}>{attuned.length}/3</span>
                            </div>
                            <div style={{display:"flex",gap:6}}>
                              {attuneSlots.map(si=>{
                                const item = attuneEntries[si];
                                return (
                                  <div key={si} style={{flex:1,padding:"8px 10px",background:item?"#1e1b4b":"#0f172a",border:`1px solid ${item?"#6366f1":"#1e293b"}`,borderRadius:7,minHeight:44,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3}}>
                                    {item?(
                                      <>
                                        <span style={{fontSize:14}}>{item.icon||"✨"}</span>
                                        <span style={{fontSize:9,color:"#a5b4fc",textAlign:"center",fontWeight:"bold",lineHeight:1.2}}>{item.name}</span>
                                        <button onClick={()=>toggleAttune(item.id)} style={{fontSize:8,color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:"1px 4px"}}>✕ Remove</button>
                                      </>
                                    ):(
                                      <span style={{fontSize:10,color:"#1e293b",fontStyle:"italic"}}>Empty</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                      {/* ── WEALTH ── */}
                      <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:10,padding:14,marginBottom:16}}>
                        <div style={{color:"#475569",fontSize:10,fontWeight:"bold",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>💰 Wealth</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                          {Object.entries(activeChar.currency).map(([type,amount])=>(
                            <div key={type} style={{textAlign:"center"}}>
                              <div style={{color:"#475569",fontSize:9,textTransform:"uppercase",marginBottom:4}}>{type}</div>
                              <input type="number" value={amount} onChange={e=>updateCharacter(activeChar.id,{currency:{...activeChar.currency,[type]:Math.max(0,parseInt(e.target.value)||0)}})} style={{...inputSt,textAlign:"center",fontWeight:"bold",color:"#f59e0b"}}/>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Add item row */}
                      <div style={{display:"flex",gap:6,marginBottom:8}}>
                        <input id={`add-item-${activeChar.id}`} placeholder="Item name..." style={{...inputSt,flex:1}} onKeyDown={e=>{if(e.key==="Enter"){const v=e.target.value.trim();if(v){updateCharacter(activeChar.id,{equipment:[...(activeChar.equipment||[]),{name:v,qty:1,category:"Gear",equipped:false,weight:0}]});e.target.value="";}}}}/>
                        <button onClick={()=>{const el=document.getElementById(`add-item-${activeChar.id}`);const v=el?.value?.trim();if(v){updateCharacter(activeChar.id,{equipment:[...(activeChar.equipment||[]),{name:v,qty:1,category:"Gear",equipped:false,weight:0}]});if(el)el.value="";}}} style={{padding:"4px 10px",background:"#1e3a5f",border:"1px solid #3b82f6",borderRadius:6,color:"#93c5fd",fontSize:11,cursor:"pointer",fontWeight:"bold",whiteSpace:"nowrap"}}>+ Add</button>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {(activeChar.equipment||[]).map((item,i)=>{
                          const isLowAmmo=item.isAmmo&&(item.qty||0)<=5;
                          const isOutOfAmmo=item.isAmmo&&(item.qty||0)<=0;
                          const catIcon={Weapon:"⚔️",Armor:"🛡",Consumable:"🧪",Ammo:"🏹",Gear:"🎒"}[item.category]||"🎒";
                          return (
                          <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:"#0f172a",border:`1px solid ${item.equipped?"#78350f":isLowAmmo?"#78350f60":isOutOfAmmo?"#7f1d1d":"#1e293b"}`,borderRadius:10,gap:10,opacity:isOutOfAmmo?0.5:1}}>
                            <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
                              <div style={{width:32,height:32,borderRadius:8,background:item.equipped?"#78350f":isOutOfAmmo?"#1a0505":"#1e293b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{catIcon}</div>
                              <div style={{minWidth:0,flex:1}}>
                                <div style={{fontSize:12,fontWeight:"bold",color:isOutOfAmmo?"#475569":"#e2e8f0"}}>{item.name}</div>
                                {item.desc&&<div style={{fontSize:10,color:"#475569"}}>{item.desc}</div>}
                                <div style={{fontSize:9,color:"#334155",textTransform:"uppercase"}}>{item.category}{item.weight?` • ${item.weight}lb`:""}{item.isAmmo&&<span style={{color:isLowAmmo?"#f59e0b":"#22c55e"}}> • {item.qty} left</span>}</div>
                              </div>
                            </div>
                            <div style={{display:"flex",gap:4,alignItems:"center"}}>
                              {/* Qty controls for consumables and ammo */}
                              {(item.isConsumable||item.isAmmo)&&(
                                <div style={{display:"flex",alignItems:"center",gap:2}}>
                                  <button onClick={()=>{const eq=[...(activeChar.equipment||[])];eq[i]={...eq[i],qty:Math.max(0,(eq[i].qty||1)-1)};updateCharacter(activeChar.id,{equipment:eq});}} style={{width:18,height:18,background:"#1e293b",border:"1px solid #334155",borderRadius:3,color:"#ef4444",cursor:"pointer",fontSize:11,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                                  <span style={{fontSize:11,fontWeight:"bold",color:"#f59e0b",minWidth:20,textAlign:"center",fontFamily:"monospace"}}>{item.qty||0}</span>
                                  <button onClick={()=>{const eq=[...(activeChar.equipment||[])];eq[i]={...eq[i],qty:(eq[i].qty||0)+1};updateCharacter(activeChar.id,{equipment:eq});}} style={{width:18,height:18,background:"#1e293b",border:"1px solid #334155",borderRadius:3,color:"#22c55e",cursor:"pointer",fontSize:11,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                                </div>
                              )}
                              {!item.isConsumable&&!item.isAmmo&&item.qty>1&&<span style={{fontSize:10,color:"#f59e0b",fontFamily:"monospace",fontWeight:"bold"}}>×{item.qty}</span>}
                              {/* Attune button for magic items */}
                              {item.magicItemId&&MAGIC_ITEM_DATABASE[item.magicItemId]?.requiresAttunement&&(()=>{
                                const isAttuned=(activeChar.attunedItems||[]).includes(item.magicItemId);
                                const canAttune=!isAttuned&&(activeChar.attunedItems||[]).length<3;
                                return (
                                  <button onClick={()=>{
                                    const cur=[...(activeChar.attunedItems||[])];
                                    if(isAttuned){ updateCharacter(activeChar.id,{attunedItems:cur.filter(x=>x!==item.magicItemId)}); }
                                    else if(canAttune){ updateCharacter(activeChar.id,{attunedItems:[...cur,item.magicItemId]}); }
                                    else{ addSystem(`⚠️ ${activeChar.name} already has 3 attuned items. Remove one first.`); }
                                  }} style={{padding:"4px 8px",background:isAttuned?"#1e1b4b":"transparent",border:`1px solid ${isAttuned?"#6366f1":canAttune?"#6366f160":"#1e293b"}`,borderRadius:6,color:isAttuned?"#a5b4fc":canAttune?"#6366f1":"#334155",fontSize:10,cursor:canAttune||isAttuned?"pointer":"not-allowed",fontWeight:"bold",whiteSpace:"nowrap"}}>
                                    {isAttuned?"✨ Attuned":"Attune"}
                                  </button>
                                );
                              })()}
                              {["Weapon","Armor","Gear"].includes(item.category)&&<button onClick={()=>{const eq=[...(activeChar.equipment||[])];eq[i]={...eq[i],equipped:!eq[i].equipped};updateCharacter(activeChar.id,{equipment:eq});}} style={{padding:"4px 8px",background:item.equipped?"#1e293b":"#78350f20",border:`1px solid ${item.equipped?"#1e293b":"#78350f"}`,borderRadius:6,color:item.equipped?"#475569":"#f59e0b",fontSize:10,cursor:"pointer",fontWeight:"bold"}}>{item.equipped?"Unequip":"Equip"}</button>}
                              <button onClick={()=>updateCharacter(activeChar.id,{equipment:(activeChar.equipment||[]).filter((_,n)=>n!==i)})} style={{padding:"4px 6px",background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:13,transition:"color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.color="#ef4444"} onMouseLeave={e=>e.currentTarget.style.color="#334155"}>🗑</button>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SKILLS */}
                  {activeTab==="skills"&&(
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                      {activeChar.skills.map(sk=>(
                        <button key={sk.name} onClick={()=>performRoll(sk.mod,(roll,rollText,total,flavor,exNote)=>`${flavor}${activeChar.name} ${sk.name} check: ${rollText}+${sk.mod}${exNote}=${total}`, "check")} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"none",border:"none",borderRadius:6,cursor:"pointer",textAlign:"left",transition:"background 0.15s"}}
                          onMouseEnter={e=>e.currentTarget.style.background="#0f172a"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{width:6,height:6,borderRadius:"50%",background:sk.expert?"#f59e0b":sk.prof?"#64748b":"transparent",border:sk.expert||sk.prof?"none":"1px solid #334155"}}/>
                            <span style={{fontSize:12,color:"#94a3b8"}}>{sk.name}</span>
                          </div>
                          <span style={{fontSize:12,fontWeight:"bold",fontFamily:"monospace",color:"#f59e0b"}}>{sk.mod>=0?"+":""}{sk.mod}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* FEATURES */}
                  {activeTab==="features"&&(
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {/* ── PASSIVE EFFECTS PANEL (Rules Engine + Magic Items) ── */}
                      {(()=>{
                        const magicPEs = getMagicItemEffects(activeChar).passiveEffects;
                        const allPEs = [...(activeChar.passiveEffects||[]), ...magicPEs];
                        if(allPEs.length===0) return null;
                        return (
                        <div style={{background:"#050d18",border:"1px solid #1e3a5f",borderRadius:10,padding:"10px 14px",marginBottom:2}}>
                          <div style={{fontSize:10,color:"#3b82f6",fontWeight:"bold",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>⚙️ Active Passive Effects</div>
                          <div style={{display:"flex",flexDirection:"column",gap:4}}>
                            {allPEs.map((pe,i)=>{
                              const isMagic = pe.source==="magic_item";
                              const peIcon={resistance:"🛡",immunity_condition:"🔒",advantage_save:"🎯",ac_bonus:"🛡",hp_per_level:"❤️",speed:"💨",initiative:"⚡",no_surprise:"👁",advantage_concentration:"🔮",save_prof:"🎯",skill_expertise:"🌟",damage_reduction:"⚔️",power_attack:"⚔️",luck_points:"🍀",reroll_damage:"🎲",tool_prof:"🔧",armor_prof:"🛡",weapon_prof:"⚔️",movement:"🏃",reaction_ac:"🛡",on_hit:"💥",passive_bonus:"👁",halfcover_self:"🛡",save_bonus:"🛡",attack_bonus:"⚔️",damage_bonus:"⚔️"}[pe.type]||(isMagic?"✨":"✦");
                              return (
                                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:6,fontSize:11,color:isMagic?"#fde68a":"#93c5fd",padding:"3px 0",borderBottom:i<allPEs.length-1?"1px solid #0f2235":"none"}}>
                                  <span style={{flexShrink:0,width:16,textAlign:"center"}}>{peIcon}</span>
                                  <span style={{flex:1,lineHeight:1.4}}>{pe.desc}</span>
                                  {isMagic&&<span style={{fontSize:8,color:"#f59e0b",background:"#78350f30",border:"1px solid #78350f",borderRadius:3,padding:"1px 4px",flexShrink:0,whiteSpace:"nowrap"}}>✨ {pe.itemName}</span>}
                                  {pe.value&&typeof pe.value==="number"&&<span style={{marginLeft:8,fontWeight:"bold",color:isMagic?"#fbbf24":"#60a5fa",flexShrink:0}}>{pe.value>0?"+":""}{pe.value}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        );
                      })()}
                      {/* ── FEATURE ENTRIES ── */}
                      {activeChar.features.map((feat,i)=>{
                        const TC={
                          "Origin Feat":  ["#2d1b4e","#a855f760","#4c1d9540","#a855f7","#d8b4fe"],
                          "Feat":         ["#1a1a3e","#4338ca60","#1e1b4b40","#6366f1","#a5b4fc"],
                          "Species":      ["#0f2a1a","#15803d60","#14532d40","#22c55e","#86efac"],
                          "Subclass":     ["#1e1033","#7c3aed60","#2d1b6940","#a855f7","#c4b5fd"],
                          "Class":        ["#2a1a08","#b4530960","#78350f40","#f59e0b","#fcd34d"],
                          "Fighting Style":["#2a0a0a","#b91c1c60","#7f1d1d40","#ef4444","#fca5a5"],
                          "Passive":      ["#050d18","#1e3a5f60","#0a152040","#3b82f6","#93c5fd"],
                        }[feat.type]||["#0f1a2e","#33415560","#1e293b40","#64748b","#94a3b8"];
                        return (
                          <div key={i} style={{padding:"12px 14px",background:"#0f172a",border:`1px solid ${TC[1]}`,borderRadius:10,borderLeft:`3px solid ${TC[3]}`}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4,gap:8}}>
                              <div style={{fontWeight:"bold",color:"#e2e8f0",fontSize:13}}>{feat.name}</div>
                              <span style={{fontSize:9,padding:"2px 6px",background:TC[2],border:`1px solid ${TC[3]}`,borderRadius:4,color:TC[4],textTransform:"uppercase",fontWeight:"bold",whiteSpace:"nowrap",flexShrink:0}}>{feat.type}</span>
                            </div>
                            <div style={{fontSize:12,color:"#64748b",lineHeight:1.5}}>{feat.desc}</div>
                            {feat.action&&<button onClick={()=>{
                              const {roll}=feat.action;
                              if(roll){ const m2=roll.replace(/\s/g,"").match(/(\d+)d(\d+)(?:([+-])(\d+))?/); if(m2){ let tot=0; const cnt=parseInt(m2[1]),sd=parseInt(m2[2]); for(let j=0;j<cnt;j++) tot+=rollDie(sd); tot+=feat.name.includes("Second Wind")?activeChar.level:(m2[4]?parseInt(m2[4])*(m2[3]==="-"?-1:1):0); if(feat.action.type==="SelfHeal"||feat.action.type==="Heal"){ updateCharacter(activeChar.id,{hp:{...activeChar.hp,current:Math.min(activeChar.hp.max,activeChar.hp.current+tot)}}); setInput(p=>`${p} ${activeChar.name} uses ${feat.name}: heals ${tot} HP.`.trim()); } else setInput(p=>`${p} ${activeChar.name} uses ${feat.name}: ${tot} extra damage.`.trim()); playDice(); } }
                            }} style={{marginTop:8,width:"100%",padding:"6px",background:"#1e293b",border:"none",borderRadius:6,color:"#94a3b8",fontSize:11,cursor:"pointer",fontWeight:"bold",transition:"all 0.15s"}}
                            onMouseEnter={e=>{e.currentTarget.style.background="#78350f20";e.currentTarget.style.color="#f59e0b";}} onMouseLeave={e=>{e.currentTarget.style.background="#1e293b";e.currentTarget.style.color="#94a3b8";}}>🎲 {feat.action.label}</button>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SHOP */}
                  {activeTab==="shop"&&(
                    <div>
                      {!hasShop?(
                        <div style={{textAlign:"center",padding:"40px 20px",color:"#334155"}}>
                          <div style={{fontSize:32,marginBottom:12}}>🏪</div>
                          <div style={{fontSize:13,fontStyle:"italic"}}>No shops nearby.</div>
                          <div style={{fontSize:11,color:"#1e293b",marginTop:6}}>Visit a town and enter a shop to browse wares.</div>
                        </div>
                      ):(()=>{
                        const shop=storyState.activeShop;
                        return (
                          <div>
                            {/* Shop header */}
                            <div style={{marginBottom:14}}>
                              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                                <div style={{fontWeight:"bold",color:"#f59e0b",fontSize:15}}>🏪 {shop.name}</div>
                                <div style={{fontSize:12,color:"#94a3b8"}}>💰 {activeChar.currency.gp} gp</div>
                              </div>
                              {shop.keeper&&<div style={{fontSize:11,color:"#64748b",marginBottom:2}}>👤 {shop.keeper}</div>}
                              {shop.desc&&<div style={{fontSize:11,color:"#475569",fontStyle:"italic",marginBottom:4}}>{shop.desc}</div>}
                              <div style={{fontSize:10,color:"#1e293b",fontFamily:"monospace"}}>📍 {shop.location||storyState.location}</div>
                            </div>
                            {/* Item list */}
                            {(shop.items||[]).length===0?(
                              <div style={{color:"#334155",textAlign:"center",padding:20,fontSize:12,fontStyle:"italic"}}>The shelves are bare.</div>
                            ):(
                              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                                {(shop.items||[]).map((item,i)=>(
                                  <div key={i} style={{padding:"12px 14px",background:"#0f172a",border:"1px solid #1e293b",borderRadius:10}}>
                                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                                      <div style={{flex:1,paddingRight:8}}>
                                        <div style={{fontWeight:"bold",color:"#e2e8f0",fontSize:13}}>{item.name}</div>
                                        {item.desc&&<div style={{fontSize:11,color:"#475569",marginTop:2}}>{item.desc}</div>}
                                      </div>
                                      <span style={{color:"#fbbf24",fontWeight:"bold",fontSize:12,background:"#78350f20",padding:"2px 8px",borderRadius:6,border:"1px solid #78350f40",whiteSpace:"nowrap",flexShrink:0}}>{item.price}</span>
                                    </div>
                                    <button onClick={()=>{
                                      const match=String(item.price).match(/(\d+(?:\.\d+)?)\s*(gp|sp|cp|pp)/i);
                                      if(!match) return;
                                      const val=parseFloat(match[1]),type=match[2].toLowerCase();
                                      const costGp=type==="pp"?val*10:type==="gp"?val:type==="sp"?val/10:val/100;
                                      if(activeChar.currency.gp<costGp){alert("Not enough gold!");return;}
                                      const newEq=[...activeChar.equipment];
                                      const ei=newEq.findIndex(e=>e.name.toLowerCase()===item.name.toLowerCase());
                                      if(ei>=0) newEq[ei]={...newEq[ei],qty:(newEq[ei].qty||1)+1};
                                      else newEq.push({name:item.name,qty:1,desc:item.desc||"",equipped:false,weight:0,category:"Gear"});
                                      updateCharacter(activeChar.id,{currency:{...activeChar.currency,gp:parseFloat((activeChar.currency.gp-costGp).toFixed(2))},equipment:newEq});
                                      setInput(p=>`${p} ${activeChar.name} purchases ${item.name} for ${item.price}.`.trim());
                                    }} style={{width:"100%",padding:"6px",background:"#1e293b",border:"none",borderRadius:6,color:"#94a3b8",fontSize:11,cursor:"pointer",fontWeight:"bold",transition:"all 0.15s"}}
                                    onMouseEnter={e=>{e.currentTarget.style.background="#78350f20";e.currentTarget.style.color="#f59e0b";}} onMouseLeave={e=>{e.currentTarget.style.background="#1e293b";e.currentTarget.style.color="#94a3b8";}}>🛒 Buy</button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ):null}
          </div>

          {/* ── COMBAT TRACKER ── */}
          {showCombat&&(
            <div style={{width:260,borderLeft:"1px solid #1e293b",background:"#0a0f1a",flexShrink:0,overflow:"hidden",display:"flex",flexDirection:"column"}}>
              <CombatTracker combatState={combatState} onUpdate={handleCombatUpdate} characters={characters}/>
            </div>
          )}

          {/* ── CHAT ── */}
          {showChat&&(
            <div style={{width:360,borderLeft:"1px solid #1e293b",background:"#020617",display:"flex",flexDirection:"column",flexShrink:0}}>
              {isSpeaking&&(
                <div style={{padding:"6px 14px",background:"#1c1407",borderBottom:"1px solid #78350f",display:"flex",alignItems:"center",gap:8}}>
                  <div style={{display:"flex",gap:2,alignItems:"center"}}>
                    {[0,1,2,3].map(k=><div key={k} style={{width:3,height:14,background:"#f59e0b",borderRadius:2,transformOrigin:"bottom",animation:`tts-bar 0.8s ease-in-out infinite`,animationDelay:`${k*0.15}s`}}/>)}
                  </div>
                  <span style={{fontSize:10,color:"#f59e0b",fontWeight:"bold",letterSpacing:1,textTransform:"uppercase",flex:1}}>DM is speaking…</span>
                  <button onClick={stop} style={{background:"none",border:"1px solid #78350f",borderRadius:4,color:"#f59e0b",fontSize:10,padding:"2px 8px",cursor:"pointer",fontWeight:"bold"}}>■ Stop</button>
                </div>
              )}
              <div style={{flex:1,overflowY:"auto",padding:"16px 16px 0"}}>
                {history.map((msg,i)=><ChatMessage key={i} msg={msg} msgId={i} onSpeak={speak} speakingId={speakingId}/>)}
                {isGenerating&&(
                  <div style={{display:"flex",justifyContent:"flex-start",marginBottom:16}}>
                    <div style={{padding:"12px 16px",background:"#1e293b",border:"1px solid #334155",borderRadius:"4px 16px 16px 16px",color:"#94a3b8",fontSize:13}}>🎲 The DM is thinking…</div>
                  </div>
                )}
                <div ref={chatEndRef}/>
              </div>
              <div style={{padding:"12px 16px",borderTop:"1px solid #1e293b",background:"#0a0f1a"}}>
                {/* ── Your Turn banner ───────────────────────────────── */}
                {(()=>{
                  if(!combatState.isActive||combatState.isPlacementPhase) return null;
                  const activeCombatant=combatState.combatants?.[combatState.turn];
                  if(!activeCombatant||activeCombatant.type!=="player") return null;
                  const tr=combatState.turnResources||{action:1,bonusAction:1,reaction:1,movement:30};
                  const pip=(avail,label)=>(
                    <span style={{fontSize:10,fontWeight:"bold",color:avail?"#22c55e":"#475569",
                      background:avail?"#14532d20":"transparent",
                      border:`1px solid ${avail?"#22c55e40":"#1e293b"}`,
                      borderRadius:4,padding:"1px 6px",whiteSpace:"nowrap"}}>
                      {label}: {avail?"✅":"❌"}
                    </span>
                  );
                  return (
                    <div style={{marginBottom:10,padding:"10px 14px",background:"#0a1628",border:"1px solid #3b82f6",borderRadius:10,display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:18}}>⚔️</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:"900",color:"#60a5fa",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>
                          {activeCombatant.name}'s Turn
                        </div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {pip(tr.action>0,"Action")}
                          {pip(tr.bonusAction>0,"Bonus")}
                          {pip(tr.reaction>0,"Reaction")}
                          <span style={{fontSize:10,fontWeight:"bold",
                            color:tr.movement>0?"#f59e0b":"#475569",
                            background:tr.movement>0?"#78350f20":"transparent",
                            border:`1px solid ${tr.movement>0?"#78350f60":"#1e293b"}`,
                            borderRadius:4,padding:"1px 6px",whiteSpace:"nowrap"}}>
                            Move: {tr.movement}ft
                          </span>
                        </div>
                      </div>
                      <button
                        disabled={isGenerating}
                        onClick={()=>{
                          const combinedMsg=input.trim()?input.trim()+" I end my turn.":"I end my turn.";
                          setInput("");
                          handleCombatUpdate({action:"next_turn"});
                          setTimeout(()=>handleSendMessage(combinedMsg),150);
                        }}
                        style={{padding:"6px 12px",background:"#1e3a5f",border:"1px solid #3b82f6",
                          borderRadius:8,color:"#93c5fd",fontWeight:"900",fontSize:11,
                          cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                        ▶ End Turn
                      </button>
                    </div>
                  );
                })()}
                {/* ── Placement Pause banner ─────────────────────────── */}
                {combatState.isPlacementPhase&&(
                  <div style={{marginBottom:10,padding:"10px 14px",background:"#1c1408",border:"1px solid #f59e0b",borderRadius:10,display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:18}}>🗺</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:11,fontWeight:"900",color:"#f59e0b",textTransform:"uppercase",letterSpacing:0.5}}>Token Placement Phase</div>
                      <div style={{fontSize:10,color:"#94a3b8",marginTop:1}}>Drag enemy tokens to their starting positions on the map.</div>
                    </div>
                    <button
                      disabled={isGenerating}
                      onClick={()=>{
                        setCombatState(p=>({...p,isPlacementPhase:false}));
                        handleSendMessage("I have placed the enemy tokens on the map. Ready to begin!");
                      }}
                      style={{padding:"6px 14px",background:"#166534",border:"1px solid #22c55e",borderRadius:8,color:"#86efac",fontWeight:"900",fontSize:11,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                      ✅ Tokens Placed — Ready!
                    </button>
                  </div>
                )}
                <div style={{position:"relative"}}>
                  <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSendMessage();}}} placeholder="What do you do? (Enter to send)" disabled={isGenerating} rows={2}
                    style={{width:"100%",background:"#0f172a",border:"1px solid #1e293b",borderRadius:10,color:"#e2e8f0",padding:"10px 50px 10px 14px",fontSize:12,resize:"none",outline:"none",boxSizing:"border-box",fontFamily:"inherit",lineHeight:1.5}}
                    onFocus={e=>e.target.style.borderColor="#f59e0b55"} onBlur={e=>e.target.style.borderColor="#1e293b"}/>
                  <button onClick={()=>handleSendMessage()} disabled={isGenerating||!input.trim()} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",width:34,height:34,background:input.trim()?"#b45309":"#1e293b",border:"none",borderRadius:8,color:"#fff",cursor:input.trim()?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,transition:"all 0.15s"}}>→</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      {showLevelUp&&activeChar&&(
        <LevelUpModal character={activeChar} onClose={()=>setShowLevelUp(false)} onConfirm={updates=>{
          updateCharacter(activeChar.id,updates);
          addSystem(`${activeChar.name} advances to Level ${activeChar.level+1}! ${updates.subclass?`Subclass: ${updates.subclass}.`:""}`);
          setShowLevelUp(false);
        }}/>
      )}
      {showBuilder&&(
        <CharacterBuilder onClose={()=>setShowBuilder(false)} onCreate={newChar=>{
          setCharacters(prev=>[...prev,newChar]);
          setSelectedCharId(newChar.id);
          setShowBuilder(false);
          addSystem(`${newChar.name} the ${newChar.species} ${newChar.class} joins the party! (Background: ${newChar.background} • Origin Feat: ${newChar.originFeat})`);
        }}/>
      )}
    </div>
  );
}
