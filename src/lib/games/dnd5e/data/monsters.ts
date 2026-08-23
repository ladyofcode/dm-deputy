import type { AbilityScores, NpcCharacterKind } from '$lib/types/schema';
import type { CharacterIdentityDraft, CharacterExtrasDraft } from '$lib/domain/npc-draft';
import {
	createDefaultCharacterCombat,
	createDefaultCharacterIdentity,
	createDefaultCharacterExtras
} from '$lib/domain/npc-draft';
import { createEmptyCharacterSpellDraft } from '$lib/domain/spellcasting';

export type MonsterTemplate = {
	id: string;
	name: string;
	kind: NpcCharacterKind;
	creature_type: string;
	alignment: string;
	armor_class: number;
	armor_class_notes: string;
	hp_max: number;
	hp_dice: string;
	speed: string;
	abilities: AbilityScores;
	skills: string;
	senses: string;
	languages: string;
	challenge_rating: string;
	experience: number;
	traits: string;
	actions: string;
	presentation?: string;
	notes?: string;
	weapon_names?: string[];
	armor_name?: string;
	image_url?: string;
	media_id?: string;
	image_source?: string;
};

export const MONSTER_TEMPLATES: MonsterTemplate[] = [
	{
		id: 'bugbear',
		name: 'Bugbear',
		kind: 'npc_foe',
		creature_type: 'Medium humanoid (goblinoid)',
		alignment: 'Chaotic evil',
		armor_class: 16,
		armor_class_notes: 'hide armor, shield',
		hp_max: 27,
		hp_dice: '5d8 + 5',
		speed: '30 ft.',
		abilities: { str: 15, dex: 14, con: 13, int: 8, wis: 11, cha: 9 },
		skills: 'Stealth +6, Survival +2',
		senses: 'darkvision 60 ft., passive Perception 10',
		languages: 'Common, Goblin',
		challenge_rating: '1',
		experience: 200,
		traits: `Brute. When the bugbear hits with a melee weapon attack, the attack deals one extra die of the weapon's damage to the target (included below).

Surprise Attack. If the bugbear surprises a creature and hits it with an attack during the first round of combat, the target takes an extra 7 (2d6) damage from the attack.`,
		actions: `Morningstar. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 11 (2d8 + 2) piercing damage.

Javelin. Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 5 (1d6 + 2) piercing damage, or 9 (2d6 + 2) piercing damage in melee.`,
		presentation:
			'Bugbears are cruel and unruly humanoids that live to bully the weak and dislike being bossed around. Despite their intimidating builds, bugbears move with surprising stealth and are fond of setting ambushes.',
		weapon_names: ['Morningstar', 'Javelin'],
		armor_name: 'Hide',
		image_url: '/monsters/bugbear.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'goblin',
		name: 'Goblin',
		kind: 'npc_foe',
		creature_type: 'Small humanoid (goblinoid)',
		alignment: 'Neutral Evil',
		armor_class: 15,
		armor_class_notes: 'leather armor, shield',
		hp_max: 7,
		hp_dice: '2d6',
		speed: '30 ft.',
		abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
		skills: 'Stealth +6',
		senses: 'darkvision 60 ft., passive Perception 9',
		languages: 'Common, Goblin',
		challenge_rating: '1/4',
		experience: 50,
		traits: `Nimble Escape. The goblin can take the Disengage or Hide action as a bonus action on each of its turns.`,
		actions: `Scimitar. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.

Shortbow. Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.`,
		presentation:
			'Goblins are black-hearted scavengers that gather in overwhelming numbers and crave power, which they abuse.',
		weapon_names: ['Scimitar', 'Shortbow'],
		armor_name: 'Leather',
		image_url: '/monsters/goblin.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'wolf',
		name: 'Wolf',
		kind: 'npc_foe',
		creature_type: 'Medium beast',
		alignment: 'Unaligned',
		armor_class: 13,
		armor_class_notes: 'natural armor',
		hp_max: 11,
		hp_dice: '2d8 + 2',
		speed: '40 ft.',
		abilities: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
		skills: 'Perception +3, Stealth +4',
		senses: 'passive Perception 13',
		languages: '—',
		challenge_rating: '1/4',
		experience: 50,
		traits: `Keen Hearing and Smell. The wolf has advantage on Wisdom (Perception) checks that rely on hearing or smell.

Pack Tactics. The wolf has advantage on an attack roll against a creature if at least one of the wolf's allies is within 5 ft. of the creature and the ally isn't incapacitated.`,
		actions: `Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) piercing damage. If the target is a creature, it must succeed on a DC 11 Strength saving throw or be knocked prone.`,
		presentation:
			'Wolves are found in subarctic and temperate regions of the world, running in packs through hills and forests.',
		image_url: '/monsters/wolf.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'skeleton',
		name: 'Skeleton',
		kind: 'npc_foe',
		creature_type: 'Medium undead',
		alignment: 'Lawful Evil',
		armor_class: 13,
		armor_class_notes: 'armor scraps',
		hp_max: 13,
		hp_dice: '2d8 + 4',
		speed: '30 ft.',
		abilities: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 },
		skills: '',
		senses: 'darkvision 60 ft., passive Perception 9',
		languages: "understands languages it knew in life but can't speak",
		challenge_rating: '1/4',
		experience: 50,
		traits:
			'Damage Vulnerabilities bludgeoning. Damage Immunities poison. Condition Immunities poisoned.',
		actions: `Shortsword. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.

Shortbow. Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.`,
		presentation:
			'Assemblages of bones animated by dark magic, skeletons heed the summons of those who create them or rise of their own accord in places saturated with deathly magic.',
		weapon_names: ['Shortsword', 'Shortbow'],
		image_url: '/monsters/skeleton.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'zombie',
		name: 'Zombie',
		kind: 'npc_foe',
		creature_type: 'Medium undead',
		alignment: 'Neutral evil',
		armor_class: 8,
		armor_class_notes: '',
		hp_max: 22,
		hp_dice: '3d8 + 9',
		speed: '20 ft.',
		abilities: { str: 13, dex: 6, con: 16, int: 3, wis: 6, cha: 5 },
		skills: '',
		senses: 'darkvision 60 ft., passive Perception 8',
		languages: "understands the languages it knew in life but can't speak",
		challenge_rating: '1/4',
		experience: 50,
		traits: `Saving Throws Wis +0. Damage Immunities poison. Condition Immunities poisoned.

Undead Fortitude. If damage reduces the zombie to 0 hit points, it can make a Constitution saving throw with a DC of 5 + the damage taken, unless the damage is radiant or from a critical hit. On a success, the zombie drops to 1 hit point instead.`,
		actions: `Slam. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) bludgeoning damage.`,
		presentation:
			'Zombies are corpses imbued with a semblance of life, retaining no vestige of their former selves.',
		image_url: '/monsters/zombie.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'owlbear',
		name: 'Owlbear',
		kind: 'npc_foe',
		creature_type: 'Large monstrosity',
		alignment: 'Unaligned',
		armor_class: 13,
		armor_class_notes: 'natural armor',
		hp_max: 59,
		hp_dice: '7d10 + 21',
		speed: '40 ft.',
		abilities: { str: 20, dex: 12, con: 17, int: 3, wis: 12, cha: 7 },
		skills: 'Perception +3',
		senses: 'darkvision 60 ft., passive Perception 13',
		languages: '—',
		challenge_rating: '3',
		experience: 700,
		traits: `Keen Sight and Smell. The owlbear has advantage on Wisdom (Perception) checks that rely on sight or smell.`,
		actions: `Multiattack. The owlbear makes two attacks, one with its beak and one with its claws.

Beak. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 10 (1d10 + 5) piercing damage.

Claws. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5) slashing damage.`,
		presentation:
			"The owlbear's reputation for ferocity, stubbornness, and sheer ill temper makes it one of the most feared predators of the wild. There is little, if anything, that a hungry owlbear fears.",
		image_url: '/monsters/owlbear.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'commoner',
		name: 'Commoner',
		kind: 'npc_general',
		creature_type: 'Medium humanoid (any race)',
		alignment: '',
		armor_class: 10,
		armor_class_notes: '',
		hp_max: 4,
		hp_dice: '1d8',
		speed: '30 ft.',
		abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
		skills: '',
		senses: 'passive Perception 10',
		languages: 'any one (usually Common)',
		challenge_rating: '0',
		experience: 10,
		traits: '',
		actions:
			'Club. Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 2 (1d4) bludgeoning damage.',
		presentation:
			'Commoners include peasants and serfs, slaves and servants, pilgrims, merchants, artisans, and hermits.',
		weapon_names: ['Club'],
		image_url: '/monsters/commoner.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'cultist',
		name: 'Cultist',
		kind: 'npc_foe',
		creature_type: 'Medium humanoid (any race)',
		alignment: '',
		armor_class: 12,
		armor_class_notes: 'leather armor',
		hp_max: 9,
		hp_dice: '2d8',
		speed: '30 ft.',
		abilities: { str: 11, dex: 12, con: 10, int: 10, wis: 11, cha: 10 },
		skills: 'Deception +2, Religion +2',
		senses: 'passive Perception 10',
		languages: 'any one (usually Common)',
		challenge_rating: '1/8',
		experience: 25,
		traits:
			'Devotion. The cultist has advantage on saving throws against being charmed or frightened.',
		actions:
			'Scimitar. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) slashing damage.',
		presentation:
			'Cultists swear allegiance to dark powers. They conceal their activities to avoid being ostracized, imprisoned, or executed for their beliefs.',
		weapon_names: ['Scimitar'],
		armor_name: 'Leather',
		image_url: '/monsters/cultist.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'doppelganger',
		name: 'Doppelganger',
		kind: 'npc_foe',
		creature_type: 'Medium monstrosity (shapechanger)',
		alignment: 'True Neutral',
		armor_class: 14,
		armor_class_notes: '',
		hp_max: 52,
		hp_dice: '8d8 + 16',
		speed: '30 ft.',
		abilities: { str: 11, dex: 18, con: 14, int: 11, wis: 12, cha: 14 },
		skills: 'Deception +6, Insight +3',
		senses: 'darkvision 60 ft., passive Perception 11',
		languages: 'Common',
		challenge_rating: '3',
		experience: 700,
		traits: `Condition Immunities charmed.

Shapechanger. The doppelganger can use its action to polymorph into a Small or Medium humanoid it has seen, or back into its natural form. Its statistics, other than its size, are the same in each form. Its equipment is not transformed. If slain, the doppelganger reverts to its natural form.

Ambusher. The doppelganger has advantage on attack rolls against any creature it has surprised.

Surprise Attack. If the doppelganger surprises a creature and hits it with an attack during the first round of combat, the target takes an extra 10 (3d6) damage from the attack.`,
		actions: `Multiattack. The doppelganger makes two melee attacks.

Slam. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 7 (1d6 + 4) bludgeoning damage.

Read Thoughts. The doppelganger magically reads the surface thoughts of one creature within 60 feet of it. The effect can penetrate barriers, but 3 feet of wood or dirt, 2 feet of stone, 2 inches of metal, or a thin sheet of lead blocks it. While the target is within range, the doppelganger can continue reading its thoughts as long as the doppelganger's concentration isn't broken. While reading the target's mind, the doppelganger has advantage on Wisdom (Insight) and Charisma (Deception, Intimidation, and Persuasion) checks against the target.`,
		presentation:
			'Doppelgangers take on the appearance of other humanoids, throwing off pursuit or luring victims to their doom with misdirection and disguise.',
		image_url: '/monsters/doppelganger.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'evil-mage',
		name: 'Evil Mage',
		kind: 'npc_foe',
		creature_type: 'Medium humanoid (human)',
		alignment: 'Lawful Evil',
		armor_class: 12,
		armor_class_notes: '',
		hp_max: 22,
		hp_dice: '5d8',
		speed: '30 ft.',
		abilities: { str: 9, dex: 14, con: 11, int: 17, wis: 12, cha: 11 },
		skills: 'Arcana +5, History +5',
		senses: 'passive Perception 11',
		languages: 'Common, Draconic, Dwarvish, Elvish',
		challenge_rating: '1',
		experience: 200,
		traits: `Saving Throws Int +5, Wis +3.

Spellcasting. The mage is a 4th-level spellcaster that uses Intelligence as its spellcasting ability (spell save DC 13; +5 to hit with spell attacks). The mage knows the following spells from the wizard's spell list:

Cantrips (at will): light, mage hand, shocking grasp

1st Level (4 slots): charm person, magic missile

2nd Level (3 slots): hold person, misty step`,
		actions:
			'Quarterstaff. Melee Weapon Attack: +1 to hit, reach 5 ft., one target. Hit: 3 (1d8 − 1) bludgeoning damage.',
		presentation:
			'Evil mages hunger for arcane power and dwell in isolated places, where they can perform terrible magical experiments without interference.',
		weapon_names: ['Quarterstaff'],
		image_url: '/monsters/evil-mage.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'flameskull',
		name: 'Flameskull',
		kind: 'npc_foe',
		creature_type: 'Tiny undead',
		alignment: 'Neutral Evil',
		armor_class: 13,
		armor_class_notes: '',
		hp_max: 40,
		hp_dice: '9d4 + 18',
		speed: '0 ft., fly 40 ft.',
		abilities: { str: 1, dex: 17, con: 14, int: 16, wis: 10, cha: 11 },
		skills: 'Arcana +5, Perception +2',
		senses: 'darkvision 60 ft., passive Perception 12',
		languages: 'Common',
		challenge_rating: '4',
		experience: 1100,
		traits: `Damage Resistances lightning, necrotic, piercing. Damage Immunities cold, fire, poison. Condition Immunities charmed, frightened, paralyzed, poisoned.

Illumination. The flameskull sheds either dim light in a 15-foot radius, or bright light in a 15-foot radius and dim light for an additional 15 feet. It can switch between the options as an action.

Magic Resistance. The flameskull has advantage on saving throws against spells and other magical effects.

Rejuvenation. If the flameskull is destroyed, it regains all its hit points in 1 hour unless holy water is sprinkled on its remains or a dispel magic or remove curse spell is cast on them.

Spellcasting. The flameskull is a 5th-level spellcaster that uses Intelligence as its spellcasting ability (spell save DC 13, +5 to hit with spell attacks). It needs only verbal components to cast its spells. The flameskull knows the following spells from the wizard's spell list:

Cantrip (at will): mage hand

1st level (3 slots): magic missile, shield

2nd level (2 slots): blur, flaming sphere

3rd level (1 slot): fireball`,
		actions: `Multiattack. The flameskull makes two attacks with its Fire Ray.

Fire Ray. Ranged Spell Attack: +5 to hit, range 30 ft., one target. Hit: 10 (3d6) fire damage.`,
		presentation:
			'Spellcasters fashion flameskulls from the remains of dead wizards. When the ritual is complete, green flames erupt from the skull to complete its ghastly transformation.',
		image_url: '/monsters/flameskull.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'ghoul',
		name: 'Ghoul',
		kind: 'npc_foe',
		creature_type: 'Medium undead',
		alignment: 'Chaotic Evil',
		armor_class: 12,
		armor_class_notes: '',
		hp_max: 22,
		hp_dice: '5d8',
		speed: '30 ft.',
		abilities: { str: 13, dex: 15, con: 10, int: 7, wis: 10, cha: 6 },
		skills: '',
		senses: 'darkvision 60 ft., passive Perception 10',
		languages: 'Common',
		challenge_rating: '1',
		experience: 200,
		traits: 'Damage Immunities poison. Condition Immunities charmed, poisoned.',
		actions: `Bite. Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 9 (2d6 + 2) piercing damage.

Claws. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) slashing damage. If the target is a creature other than an elf or undead, it must succeed on a DC 10 Constitution saving throw or be paralyzed for 1 minute. The creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.`,
		presentation:
			'Ghouls roam the night in packs, driven by an insatiable hunger for humanoid flesh. Like maggots or carrion beetles, they thrive in places rank with decay and death.',
		image_url: '/monsters/ghoul.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'giant-spider',
		name: 'Giant Spider',
		kind: 'npc_foe',
		creature_type: 'Large beast',
		alignment: 'Unaligned',
		armor_class: 14,
		armor_class_notes: 'natural armor',
		hp_max: 26,
		hp_dice: '4d10 + 4',
		speed: '30 ft., climb 30 ft.',
		abilities: { str: 14, dex: 16, con: 12, int: 2, wis: 11, cha: 4 },
		skills: 'Stealth +7',
		senses: 'blindsight 10 ft., darkvision 60 ft., passive Perception 10',
		languages: '—',
		challenge_rating: '1',
		experience: 200,
		traits: `Spider Climb. The spider can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.

Web Sense. While in contact with a web, the spider knows the exact location of any other creature in contact with the same web.

Web Walker. The spider ignores movement restrictions caused by webbing of any sort.`,
		actions: `Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 7 (1d8 + 3) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 9 (2d8) poison damage on a failed save, or half as much damage on a successful one. If the poison damage reduces the target to 0 hit points, the target is stable but poisoned for 1 hour, even after regaining hit points, and is paralyzed while poisoned in this way.

Web (Recharge 5–6). Ranged Weapon Attack: +5 to hit, range 30/60 ft., one creature. Hit: The target is restrained by webbing. As an action, the restrained target can make a DC 12 Strength check, escaping from the webbing on a success. The webbing can also be attacked and destroyed (AC 10; hp 5; vulnerability to fire damage; immunity to bludgeoning, poison, and psychic damage).`,
		presentation:
			'Usually found underground, the lair of a giant spider is often festooned with webs holding helpless victims.',
		image_url: '/monsters/giant-spider.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'grick',
		name: 'Grick',
		kind: 'npc_foe',
		creature_type: 'Medium monstrosity',
		alignment: 'True Neutral',
		armor_class: 14,
		armor_class_notes: 'natural armor',
		hp_max: 27,
		hp_dice: '6d8',
		speed: '30 ft., climb 30 ft.',
		abilities: { str: 14, dex: 14, con: 11, int: 3, wis: 14, cha: 5 },
		skills: '',
		senses: 'darkvision 60 ft., passive Perception 12',
		languages: '—',
		challenge_rating: '2',
		experience: 450,
		traits: `Damage Resistances bludgeoning, piercing, and slashing from nonmagical weapons.

Stone Camouflage. The grick has advantage on Dexterity (Stealth) checks made to hide in rocky terrain.`,
		actions: `Multiattack. The grick makes one attack with its tentacles. If that attack hits, the grick can make one beak attack against the same target.

Tentacles. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 9 (2d6 + 2) slashing damage.

Beak. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.`,
		presentation:
			'The wormlike grick blends in with the stonework of its lair. Only when prey comes near does it rear up, its four tentacles unfurling to reveal a hungry, snapping beak.',
		image_url: '/monsters/grick.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'hobgoblin',
		name: 'Hobgoblin',
		kind: 'npc_foe',
		creature_type: 'Medium humanoid (goblinoid)',
		alignment: 'Lawful Evil',
		armor_class: 18,
		armor_class_notes: 'chain mail, shield',
		hp_max: 11,
		hp_dice: '2d8 + 2',
		speed: '30 ft.',
		abilities: { str: 13, dex: 12, con: 12, int: 10, wis: 10, cha: 9 },
		skills: '',
		senses: 'darkvision 60 ft., passive Perception 10',
		languages: 'Common, Goblin',
		challenge_rating: '1/2',
		experience: 100,
		traits:
			"Martial Advantage. Once per turn, the hobgoblin can deal an extra 7 (2d6) damage to a creature it hits with a weapon attack if that creature is within 5 feet of an ally of the hobgoblin that isn't incapacitated.",
		actions: `Longsword. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 5 (1d8 + 1) slashing damage.

Longbow. Ranged Weapon Attack: +3 to hit, range 150/600 ft., one target. Hit: 5 (1d8 + 1) piercing damage.`,
		presentation:
			'Hobgoblins are cunning, disciplined warriors who crave conquest. They impose a strict military hierarchy and are often found in the company of goblins and bugbears.',
		weapon_names: ['Longsword', 'Longbow'],
		armor_name: 'Chain mail',
		image_url: '/monsters/hobgoblin.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'mormesk-the-wraith',
		name: 'Mormesk the Wraith',
		kind: 'npc_foe',
		creature_type: 'Medium undead',
		alignment: 'Neutral Evil',
		armor_class: 13,
		armor_class_notes: '',
		hp_max: 45,
		hp_dice: '6d8 + 18',
		speed: '0 ft., fly 60 ft.',
		abilities: { str: 6, dex: 16, con: 16, int: 12, wis: 14, cha: 15 },
		skills: '',
		senses: 'darkvision 60 ft., passive Perception 12',
		languages: 'Common, Infernal',
		challenge_rating: '3',
		experience: 700,
		traits: `Damage Resistances acid, cold, fire, lightning, thunder; bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered. Damage Immunities necrotic, poison. Condition Immunities charmed, grappled, paralyzed, petrified, poisoned, prone, restrained.

Incorporeal Movement. The wraith can move through other creatures and objects as if they were difficult terrain. It takes 5 (1d10) force damage if it ends its turn inside an object.

Sunlight Sensitivity. While in sunlight, the wraith has disadvantage on attack rolls, as well as on Wisdom (Perception) checks that rely on sight.`,
		actions: `Life Drain. Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 16 (3d8 + 3) necrotic damage. The target must succeed on a DC 13 Constitution saving throw or its hit point maximum is reduced by an amount equal to the damage taken. This reduction lasts until the target finishes a long rest. The target dies if this effect reduces its hit point maximum to 0.`,
		presentation:
			'A wraith is the incorporeal remnant of a particularly hateful being. Most wraiths can transform those they have slain into spectral undead servitors. Mormesk chooses not to, preferring to let the dead stay dead.',
		image_url: '/monsters/mormesk-the-wraith.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'nezznar-the-black-spider',
		name: 'Nezznar the Black Spider',
		kind: 'npc_foe',
		creature_type: 'Medium humanoid (elf)',
		alignment: 'Neutral Evil',
		armor_class: 11,
		armor_class_notes: '14 with mage armor',
		hp_max: 27,
		hp_dice: '6d8',
		speed: '30 ft.',
		abilities: { str: 9, dex: 13, con: 10, int: 16, wis: 14, cha: 13 },
		skills: 'Arcana +5, Perception +4, Stealth +3',
		senses: 'darkvision 120 ft., passive Perception 14',
		languages: 'Elvish, Undercommon',
		challenge_rating: '2',
		experience: 450,
		traits: `Saving Throws Int +5, Wis +4.

Special Equipment. Nezznar has a spider staff.

Fey Ancestry. Nezznar has advantage on saving throws against being charmed, and magic can't put him to sleep.

Sunlight Sensitivity. Nezznar has disadvantage on attack rolls when he or his target is in sunlight.

Innate Spellcasting. Nezznar can innately cast the following spells, requiring no material components:

At will: dancing lights

1/day each: darkness, faerie fire (spell save DC 12)

Spellcasting. Nezznar is a 4th-level spellcaster that uses Intelligence as his spellcasting ability (spell save DC 13; +5 to hit with spell attacks). Nezznar has the following spells prepared from the wizard's spell list:

Cantrips (at will): mage hand, ray of frost, shocking grasp

1st Level (4 slots): mage armor, magic missile, shield

2nd Level (3 slots): invisibility, suggestion`,
		actions:
			'Spider Staff. Melee Weapon Attack: +1 to hit, reach 5 ft., one target. Hit: 2 (1d6 − 1) bludgeoning damage plus 3 (1d6) poison damage.',
		presentation:
			'Drow are a devious, subterranean race that worships Lolth, the Demon Queen of Spiders. Drow society is strictly matriarchal, with males relegated to servitors—but some, like Nezznar, become skilled wizards.',
		image_url: '/monsters/nezznar-the-black-spider.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'nothic',
		name: 'Nothic',
		kind: 'npc_foe',
		creature_type: 'Medium aberration',
		alignment: 'Neutral Evil',
		armor_class: 15,
		armor_class_notes: 'natural armor',
		hp_max: 45,
		hp_dice: '6d8 + 18',
		speed: '30 ft.',
		abilities: { str: 14, dex: 16, con: 16, int: 13, wis: 10, cha: 8 },
		skills: 'Arcana +3, Insight +4, Perception +2, Stealth +5',
		senses: 'truesight 120 ft., passive Perception 12',
		languages: 'Undercommon',
		challenge_rating: '2',
		experience: 450,
		traits:
			'Keen Sight. The nothic has advantage on Wisdom (Perception) checks that rely on sight.',
		actions: `Multiattack. The nothic makes two claw attacks.

Claws. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.

Rotting Gaze. The nothic targets one creature it can see within 30 feet of it. The target must succeed on a DC 12 Constitution saving throw against this magic or take 10 (3d6) necrotic damage.

Weird Insight. The nothic targets one creature it can see within 30 feet of it. The target must contest its Charisma (Deception) check against the nothic's Wisdom (Insight) check. If the nothic wins, it magically learns one fact or secret about the target.`,
		presentation:
			"Nothics were once wizards who dared to unlock magical secrets they couldn't fathom. Though gifted with strange cosmic insight that allows them to extract knowledge from other creatures, nothics are no longer the wizards they once were and have no memories of their previous lives.",
		image_url: '/monsters/nothic.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'ochre-jelly',
		name: 'Ochre Jelly',
		kind: 'npc_foe',
		creature_type: 'Large ooze',
		alignment: 'Unaligned',
		armor_class: 8,
		armor_class_notes: '',
		hp_max: 45,
		hp_dice: '6d10 + 12',
		speed: '10 ft., climb 10 ft.',
		abilities: { str: 15, dex: 6, con: 14, int: 2, wis: 6, cha: 1 },
		skills: '',
		senses: 'blindsight 60 ft. (blind beyond this radius), passive Perception 8',
		languages: '—',
		challenge_rating: '2',
		experience: 450,
		traits: `Damage Resistances acid. Damage Immunities lightning, slashing. Condition Immunities blinded, charmed, deafened, frightened, prone.

Amorphous. The jelly can move through a space as narrow as 1 inch wide without squeezing.

Spider Climb. The jelly can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.`,
		actions: `Pseudopod. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 9 (2d6 + 2) bludgeoning damage plus 3 (1d6) acid damage.

Reactions

Split. When a jelly that is Medium or larger is subjected to lightning or slashing damage, it splits into two new jellies if it has at least 10 hit points. Each new jelly has hit points equal to half the original jelly's, rounded down. New jellies are one size smaller than the original jelly.`,
		presentation:
			'Ochre jellies stalk and consume organic creatures, and they have enough bestial cunning to avoid large groups.',
		image_url: '/monsters/ochre-jelly.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'ogre',
		name: 'Ogre',
		kind: 'npc_foe',
		creature_type: 'Large giant',
		alignment: 'Chaotic Evil',
		armor_class: 11,
		armor_class_notes: 'hide armor',
		hp_max: 59,
		hp_dice: '7d10 + 21',
		speed: '40 ft.',
		abilities: { str: 19, dex: 8, con: 16, int: 5, wis: 7, cha: 7 },
		skills: '',
		senses: 'darkvision 60 ft., passive Perception 8',
		languages: 'Common, Giant',
		challenge_rating: '2',
		experience: 450,
		traits: '',
		actions: `Greatclub. Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage.

Javelin. Melee or Ranged Weapon Attack: +6 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 11 (2d6 + 4) piercing damage.`,
		presentation:
			'Ogres are lazy, angry, ten-foot-tall giants that live by raiding and scavenging.',
		weapon_names: ['Greatclub', 'Javelin'],
		armor_name: 'Hide',
		image_url: '/monsters/ogre.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'orc',
		name: 'Orc',
		kind: 'npc_foe',
		creature_type: 'Medium humanoid (orc)',
		alignment: 'Chaotic Evil',
		armor_class: 13,
		armor_class_notes: 'hide armor',
		hp_max: 15,
		hp_dice: '2d8 + 6',
		speed: '30 ft.',
		abilities: { str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10 },
		skills: 'Intimidation +2',
		senses: 'darkvision 60 ft., passive Perception 10',
		languages: 'Common, Orc',
		challenge_rating: '1/2',
		experience: 100,
		traits:
			'Aggressive. As a bonus action, the orc can move up to its speed toward a hostile creature that it can see.',
		actions: `Greataxe. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 9 (1d12 + 3) slashing damage.

Javelin. Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 6 (1d6 + 3) piercing damage.`,
		presentation:
			"Orcs are renowned for their barbarism. They have stooped postures, low foreheads, and piglike faces with prominent lower canines that resemble a boar's tusks.",
		weapon_names: ['Greataxe', 'Javelin'],
		armor_name: 'Hide',
		image_url: '/monsters/orc.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'redbrand-ruffian',
		name: 'Redbrand Ruffian',
		kind: 'npc_foe',
		creature_type: 'Medium humanoid (human)',
		alignment: 'Neutral Evil',
		armor_class: 14,
		armor_class_notes: 'studded leather armor',
		hp_max: 16,
		hp_dice: '3d8 + 3',
		speed: '30 ft.',
		abilities: { str: 11, dex: 14, con: 12, int: 9, wis: 9, cha: 11 },
		skills: 'Intimidation +2',
		senses: 'passive Perception 9',
		languages: 'Common',
		challenge_rating: '1/2',
		experience: 100,
		traits: '',
		actions: `Multiattack. The ruffian makes two melee attacks.

Shortsword. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.`,
		presentation:
			'Redbrand ruffians are petty thugs and ruthless enforcers skilled at intimidation and violence. They work for money and have no scruples.',
		weapon_names: ['Shortsword'],
		armor_name: 'Studded Leather',
		image_url: '/monsters/redbrand-ruffian.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'sildar-hallwinter',
		name: 'Sildar Hallwinter',
		kind: 'npc_general',
		creature_type: 'Medium humanoid (human)',
		alignment: 'Neutral Good',
		armor_class: 16,
		armor_class_notes: 'chain mail',
		hp_max: 27,
		hp_dice: '5d8 + 5',
		speed: '30 ft.',
		abilities: { str: 13, dex: 10, con: 12, int: 10, wis: 11, cha: 10 },
		skills: 'Perception +2',
		senses: 'passive Perception 12',
		languages: 'Common',
		challenge_rating: '1',
		experience: 200,
		traits: 'Saving Throws Str +3, Con +3.',
		actions: `Multiattack. Sildar makes two melee attacks.

Longsword. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 5 (1d8 + 1) slashing damage.

Heavy Crossbow. Ranged Weapon Attack: +2 to hit, range 100/400 ft., one target. Hit: 5 (1d10) piercing damage.

Reactions

Parry. When an attacker hits Sildar with a melee attack and Sildar can see the attacker, he can roll 1d6 and add the number rolled to his AC against the triggering attack, provided that he's wielding a melee weapon.`,
		presentation:
			"Sildar Hallwinter is a retired soldier and sellsword who hails from the city of Neverwinter. He is a loyal member of the Lords' Alliance, a political organization that unites the various free cities and towns of the North.",
		weapon_names: ['Longsword', 'Heavy Crossbow'],
		armor_name: 'Chain mail',
		image_url: '/monsters/sildar-hallwinter.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'spectator',
		name: 'Spectator',
		kind: 'npc_foe',
		creature_type: 'Medium aberration',
		alignment: 'Lawful Neutral',
		armor_class: 14,
		armor_class_notes: 'natural armor',
		hp_max: 39,
		hp_dice: '6d8 + 12',
		speed: '0 ft., fly 30 ft. (hover)',
		abilities: { str: 8, dex: 14, con: 14, int: 13, wis: 14, cha: 11 },
		skills: 'Perception +6',
		senses: 'darkvision 120 ft., passive Perception 16',
		languages: 'Deep Speech, Undercommon',
		challenge_rating: '3',
		experience: 700,
		traits: `Condition Immunities prone.

Hover. The spectator can hover, and it flies while it is alive.

Telepathy. The spectator can communicate telepathically with any creature within 100 feet of it that can understand a language.`,
		actions: `Bite. Melee Weapon Attack: +1 to hit, reach 5 ft., one target. Hit: 2 (1d4 − 1) piercing damage.

Eye Rays. The spectator uses two of the following eye rays. It can use each ray only once per turn. Each ray targets a creature the spectator can see within 90 feet of it.

1. Confusion Ray. The target must succeed on a DC 13 Wisdom saving throw, or it can't take reactions until the end of its next turn. On its turn, the target can't move, and it uses its action to make a melee or ranged attack against a randomly determined creature within range. If the target can't attack, it does nothing on its turn.

2. Paralyzing Ray. The target must succeed on a DC 13 Constitution saving throw or be paralyzed for 1 minute. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.

3. Fear Ray. The target must succeed on a DC 13 Wisdom saving throw or be frightened for 1 minute. The target can repeat the saving throw at the end of each of its turns, with disadvantage if the spectator is visible to the target, ending the effect on itself on a success.

4. Wounding Ray. The target must make a DC 13 Constitution saving throw, taking 16 (3d10) necrotic damage on a failed save, or half as much damage on a successful one.

Create Food and Water. The spectator creates enough food and water to sustain itself for 24 hours.

Reactions

Spell Reflection. If the spectator makes a successful saving throw against a spell, or a spell attack misses it, the spectator can choose another creature within 30 feet of it that it can see. The spell affects the chosen creature instead of the spectator.`,
		presentation:
			"A spectator is a spherical monster that can be tasked with guarding a treasure for a period not exceeding 101 years. If the treasure is stolen or destroyed before the spectator's period of service has ended, the creature returns to its home dimension. Otherwise, it never abandons its post.",
		image_url: '/monsters/spectator.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'stirge',
		name: 'Stirge',
		kind: 'npc_foe',
		creature_type: 'Tiny beast',
		alignment: 'Unaligned',
		armor_class: 14,
		armor_class_notes: 'natural armor',
		hp_max: 2,
		hp_dice: '1d4',
		speed: '10 ft., fly 40 ft.',
		abilities: { str: 4, dex: 16, con: 11, int: 2, wis: 8, cha: 6 },
		skills: '',
		senses: 'darkvision 60 ft., passive Perception 9',
		languages: '—',
		challenge_rating: '1/8',
		experience: 25,
		traits: '',
		actions: `Blood Drain. Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 5 (1d4 + 3) piercing damage, and the stirge attaches to the target. While attached, the stirge doesn't attack. Instead, at the start of each of the stirge's turns, the target loses 5 (1d4 + 3) hit points due to blood loss.

The stirge can detach itself by spending 5 feet of its movement. It does so after it drains 10 hit points of blood from the target or the target dies. A creature, including the target, can use its action to detach the stirge.`,
		presentation:
			"A stirge is a winged pest that feeds on the blood of living creatures, drawing sustenance through its proboscis, which it uses to pierce a victim's flesh while clutching onto its prey with hooked claws.",
		image_url: '/monsters/stirge.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'twig-blight',
		name: 'Twig Blight',
		kind: 'npc_foe',
		creature_type: 'Small plant',
		alignment: 'Neutral evil',
		armor_class: 13,
		armor_class_notes: 'natural armor',
		hp_max: 4,
		hp_dice: '1d6 + 1',
		speed: '20 ft.',
		abilities: { str: 6, dex: 13, con: 12, int: 4, wis: 8, cha: 3 },
		skills: 'Stealth +3',
		senses: 'blindsight 60 ft. (blind beyond this radius), passive Perception 9',
		languages: "understands Common but doesn't speak",
		challenge_rating: '1/8',
		experience: 25,
		traits: `Damage Vulnerabilities fire. Condition Immunities blinded, deafened.

False Appearance. The blight resembles a dead shrub. While it remains motionless among vegetation, it can hide without being out of sight.`,
		actions: `Claws. Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 1) piercing damage.`,
		presentation:
			'This skittering creature resembles a small, leafless, walking plant. Twig blights hide by rooting themselves among ordinary plants.',
		image_url: '/monsters/twig-blight.png',
		image_source: 'Wizards of the Coast'
	},
	{
		id: 'young-green-dragon',
		name: 'Young Green Dragon',
		kind: 'npc_foe',
		creature_type: 'Large dragon',
		alignment: 'Lawful evil',
		armor_class: 18,
		armor_class_notes: 'natural armor',
		hp_max: 136,
		hp_dice: '16d10 + 48',
		speed: '40 ft., fly 60 ft., swim 40 ft.',
		abilities: { str: 19, dex: 12, con: 17, int: 16, wis: 13, cha: 15 },
		skills: 'Deception +5, Perception +7, Stealth +4',
		senses: 'blindsight 30 ft., darkvision 120 ft., passive Perception 17',
		languages: 'Common, Draconic',
		challenge_rating: '8',
		experience: 3900,
		traits: `Saving Throws Dex +4, Con +6, Wis +4, Cha +5. Damage Immunities poison. Condition Immunities poisoned.

Amphibious. The dragon can breathe air and water.`,
		actions: `Multiattack. The dragon makes three attacks: one with its bite and two with its claws.

Bite. Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 15 (2d10 + 4) piercing damage plus 7 (2d6) poison damage.

Claw. Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.

Poison Breath (Recharge 5–6). The dragon exhales poisonous gas in a 30-foot cone. Each creature in that area must make a DC 16 Constitution saving throw, taking 42 (12d6) poison damage on a failed save, or half as much damage on a successful one.`,
		presentation:
			'Thoroughly evil, green dragons delight in subverting and corrupting the good-hearted. They prefer to dwell in ancient forests.',
		image_url: '/monsters/young-green-dragon.png',
		image_source: 'Wizards of the Coast'
	}
];

export function getMonsterTemplateById(id: string): MonsterTemplate | undefined {
	return MONSTER_TEMPLATES.find((template) => template.id === id);
}

export type ApplyMonsterTemplateResult = {
	kind: NpcCharacterKind;
	name: string;
	description: string;
	identity: CharacterIdentityDraft;
	extras: CharacterExtrasDraft;
	portraitFile: File | null;
	portraitImageSource: string | null;
};

function findCatalogIdByName<
	T extends { weapon_id?: string; armor_id?: string; weapon_name?: string; armor_name?: string }
>(
	catalog: T[],
	name: string,
	nameKey: 'weapon_name' | 'armor_name',
	idKey: 'weapon_id' | 'armor_id'
): string {
	const normalized = name.trim().toLowerCase();
	const match = catalog.find((entry) => {
		const label = entry[nameKey];
		return typeof label === 'string' && label.trim().toLowerCase() === normalized;
	});

	return match?.[idKey] ?? '';
}

export function resolveMonsterLoadout(
	template: MonsterTemplate,
	weapons: { weapon_id: string; weapon_name: string }[],
	armor: { armor_id: string; armor_name: string }[]
): { weapons: string[]; armor: string } {
	const weaponIds = (template.weapon_names ?? [])
		.map((name) => findCatalogIdByName(weapons, name, 'weapon_name', 'weapon_id'))
		.filter(Boolean);

	const armorId = template.armor_name
		? findCatalogIdByName(armor, template.armor_name, 'armor_name', 'armor_id')
		: '';

	return {
		weapons: weaponIds.length ? weaponIds : [''],
		armor: armorId
	};
}

export function applyMonsterTemplateToDraft(
	template: MonsterTemplate,
	weapons: { weapon_id: string; weapon_name: string }[] = [],
	armor: { armor_id: string; armor_name: string }[] = []
): Omit<ApplyMonsterTemplateResult, 'portraitFile' | 'portraitImageSource'> {
	const loadout = resolveMonsterLoadout(template, weapons, armor);

	return {
		kind: template.kind,
		name: template.name,
		description: template.notes ?? '',
		identity: {
			...createDefaultCharacterIdentity(),
			creature_type: template.creature_type,
			alignment: template.alignment,
			race: template.name,
			presentation: template.presentation ?? ''
		},
		extras: {
			...createDefaultCharacterExtras(),
			level: 1,
			experience: template.experience,
			hp_max: template.hp_max,
			hp_current: template.hp_max,
			abilities: { ...template.abilities },
			combat: {
				...createDefaultCharacterCombat(),
				armor_class: template.armor_class,
				armor_class_notes: template.armor_class_notes,
				speed: template.speed,
				hp_dice: template.hp_dice,
				skills: template.skills,
				senses: template.senses,
				languages: template.languages,
				challenge_rating: template.challenge_rating,
				traits: template.traits,
				actions: template.actions
			},
			loadout: {
				...loadout,
				items: [''],
				spells: [createEmptyCharacterSpellDraft()]
			}
		}
	};
}

export async function fetchMonsterTemplatePortrait(
	template: MonsterTemplate
): Promise<File | null> {
	if (template.media_id?.trim()) {
		const { loadMediaLibraryBlobInDb, loadMediaAssetByIdInDb } = await import('$lib/db/client');
		const asset = await loadMediaAssetByIdInDb(template.media_id);
		const buffer = await loadMediaLibraryBlobInDb(template.media_id, 'full');
		if (!buffer) return null;

		return new File([buffer], `${template.id}.jpg`, {
			type: asset?.mime_type ?? 'image/jpeg'
		});
	}

	const imageUrl = template.image_url?.trim();
	if (!imageUrl) return null;

	try {
		const response = await fetch(imageUrl);
		if (!response.ok) return null;

		const blob = await response.blob();
		if (!blob.type.startsWith('image/')) return null;

		const filename = imageUrl.startsWith('data:')
			? `${template.id}.png`
			: (imageUrl.split('/').pop() ?? `${template.id}.png`);
		return new File([blob], filename, { type: blob.type });
	} catch {
		return null;
	}
}

export function getMonsterTemplatePortraitUrl(template: MonsterTemplate): string | null {
	if (template.media_id?.trim()) {
		return null;
	}

	return template.image_url?.trim() || null;
}

export async function loadMonsterTemplateIntoDraft(
	template: MonsterTemplate,
	weapons: { weapon_id: string; weapon_name: string }[] = [],
	armor: { armor_id: string; armor_name: string }[] = []
): Promise<ApplyMonsterTemplateResult> {
	const applied = applyMonsterTemplateToDraft(template, weapons, armor);
	const portraitFile = await fetchMonsterTemplatePortrait(template);

	return {
		...applied,
		portraitFile,
		portraitImageSource: template.image_source ?? null
	};
}

export function monsterTemplateFromDraft(
	base: Pick<MonsterTemplate, 'id'>,
	kind: NpcCharacterKind,
	name: string,
	identity: CharacterIdentityDraft,
	extras: CharacterExtrasDraft,
	options?: {
		image_url?: string;
		image_source?: string;
		weapon_names?: string[];
		armor_name?: string;
		notes?: string;
	}
): MonsterTemplate {
	const trimmedName = name.trim() || 'New template';

	return {
		id: base.id,
		name: trimmedName,
		kind,
		creature_type: identity.creature_type,
		alignment: identity.alignment,
		armor_class: extras.combat.armor_class,
		armor_class_notes: extras.combat.armor_class_notes,
		hp_max: extras.hp_max,
		hp_dice: extras.combat.hp_dice,
		speed: extras.combat.speed,
		abilities: { ...extras.abilities },
		skills: extras.combat.skills,
		senses: extras.combat.senses,
		languages: extras.combat.languages,
		challenge_rating: extras.combat.challenge_rating,
		experience: extras.experience,
		traits: extras.combat.traits,
		actions: extras.combat.actions,
		presentation: identity.presentation.trim() || undefined,
		notes: options?.notes?.trim() || undefined,
		weapon_names: options?.weapon_names?.filter(Boolean),
		armor_name: options?.armor_name?.trim() || undefined,
		image_url: options?.image_url?.trim() || undefined,
		image_source: options?.image_source?.trim() || undefined
	};
}
