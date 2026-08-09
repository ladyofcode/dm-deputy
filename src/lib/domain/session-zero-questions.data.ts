import type {
	SessionZeroCategory,
	SessionZeroQuestion,
	SessionZeroSubcategory
} from './session-zero-types';

export const SESSION_ZERO_GAMEPLAY: SessionZeroQuestion[] = [
	{
		id: 'experience',
		prompt: 'Experience',
		description:
			'How do players earn XP? Slaying creatures? Or just overcome monsters? Non-violent defeat awards XP?'
	},
	{
		id: 'milestones',
		prompt: 'Milestones',
		description: 'DMG p 261. Do you use them?'
	},
	{
		id: 'level_up',
		prompt: 'Level-up',
		description:
			"When do PCs level up? Long rest? Short rest? Once they're back in town? Only between game sessions? Or the moment they gain enough exp?"
	},
	{
		id: 'unannounced_dice_rolls',
		prompt: 'Unannounced dice rolls',
		description: 'What happens when a player make a dice-rolls without saying anything?'
	},
	{
		id: 'dice_rolls_against_one_another',
		prompt: 'Dice rolls against one another',
		description:
			'Are dice rolls allowed to settle in-character arguments? Can the Bard PC roll to persuade the Fighter PC that his course of action is right? Allowed sparingly, only under the DMs guidance, or only when prompted by the DM? Perhaps everyone at the table has to agree to allow such rolls first?'
	},
	{
		id: 'player_vs_player',
		prompt: 'Player Vs Player',
		description:
			'Is tension between characters allowed? What about arguments? Is combat between two or more PCs allowed? What happens when character tension finally breaks out into violence between those two characters? Is allowed only if the DM approves? Does the whole table have to approve the PvP? What is your stance on PvP as a DM?'
	},
	{
		id: 'pc_secrets',
		prompt: 'PC Secrets',
		description:
			'Are players allowed to keep in-game secrets from other players? Are characters allowed to keep in-game secrets from other characters? If so, who decides what secrets are allowed? Is this sort of thing left up to the players? Is it only the privilege of the DM?'
	},
	{
		id: 'meta_knowledge',
		prompt: 'Meta-knowledge',
		description:
			"Is it ok for players to know that swinging their weapon as a ghost will not harm it? Are characters allowed to know that trolls don't regenerate health when harmed with acid or fire?  Just because the Wizard player knows the Rogue rolled low for his check for traps, would it make sense for the Wizard character to insist that he check as well? If some meta-knowledge is ok, and others are not, discuss."
	},
	{
		id: 'murder_hobos',
		prompt: 'Murder Hobos',
		description:
			'Is it allowed? Is it allowed, but there will be in-game consequences? Does it make sense for the campaign (evil?).'
	},
	{
		id: 'mounts',
		prompt: 'Mounts',
		description:
			"As a DM, do you allow mounts? How do you handle mounts? Do you employ the 'unstated mount rule'? Can PCs eventually obtain exotic mounts? flying mounts? Keep in mind, that this ruling can devalue or raise the value of some feats & class features of the game. For those of you wondering what the 'Unstated mount rule' is; It is an house-rule by some DMs that; If you do not make the DM go out of his way to search the book for mounted combat rules, then the DM will not go out of his/her way to help your mount find an unfortunate death. Know that despite my unfavorable wording of this rule, it is a fair rule & has been around D&D for quite a long time."
	}
];

export const SESSION_ZERO_CONDUCT: SessionZeroQuestion[] = [
	{
		id: 'alcohol_and_narcotics',
		prompt: 'Alcohol and narcotics',
		description: 'Consumption rules? Are people allowed to be drunk etc?'
	},
	{
		id: 'devices',
		prompt: 'Devices',
		description: 'Phones, headphones, calls? Etiquette?'
	},
	{
		id: 'player_attention',
		prompt: 'Player Attention',
		description:
			'What happens if a player is constantly distracted? And delaying the game? Are there consequences?'
	},
	{
		id: 'disruptive_topics',
		prompt: 'Disruptive topics',
		description:
			'Are real-life topics like religion, politics, porn, or sex ok at your table? Sports? Others? Talk about it before or during session? Things can get heated. Should players arrive early to socialise?'
	},
	{
		id: 'player_expectations',
		prompt: 'Player expectations',
		description:
			"What happens when one players expectations ruins the fun of another player? Is it ok for that Tim is only here for the sweet loots & EXP, while Mary-Sue is here to role-play her snow-flake? Ann is just here to 'kill shit', while Steve has brought a completely min/maxed PC to the table, & poor Billy, he is here just to hang out with is friends & have pizza. DMs you may want to discuss with each player at the table, why they are here & what they hope to get out of the game & how you as a DM can meet those hopes & expections."
	},
	{
		id: 'player_discomfort',
		prompt: 'Player discomfort',
		description:
			'Occasionally things may happen in-game that makes a player unconfortable, even if not discussed in session 0. How are such things handled? Is there a time-out system? Does the DM call a break and this become a table discussion? Is the player allowed to step out on the scene & come back after it has passed? Does the DM use a RetCon to the story?'
	},
	{
		id: 'spotlight_sharing',
		prompt: 'Spotlight sharing',
		description:
			"Are players allowed to have spot-light focus? or will the spot-light only be focused on the party as a whole? Are players or characters allowed to steal another PCs spotlight? What happens if a player or his/her character tramples over another characters scene/spotlight? This kind of thing can ruin another players fun, but it is also the kind of that that the player won't immediately voice their discomfort about. DMs you may want to try to be watchful of this."
	},
	{
		id: 'player_absences',
		prompt: 'Player absences',
		description:
			"You may want to discuss with your players, how many players get to be absent for the session before the game is canceled that night? What is the min amount of people you will DM for in a session? What happens when too few players show up? Maybe the players that do show up get in some 'down-time' play that can provide minor benefits or perhaps progresses some down-time activities that had going on? Maybe you can do a one-shot you been planning for? What is your backup plan; play board-games, video-games? watch movies?"
	},
	{
		id: 'other_behavior_rules',
		prompt: 'Other behavior rules',
		description:
			'Perhaps this is where you tell your players to be respectful to one another, or be communicative, etc.'
	}
];

export const SESSION_ZERO_DM_STYLE: SessionZeroQuestion[] = [
	{
		id: 'dm_style_preferences',
		prompt: 'DM style',
		description:
			'As a DM, what is your style? Are you a RAW or RAI type DM? Do you prefer to improvise or prepare? Do you like making rulings on the spot & looking them up later, or would you rather pause the game & look up the rules? Do you like home-brewing & having home-brew content, or do you prefer to minimize home-brew? Do you prefer story over mechnics? Do you want ROLL-play or roleplay? How do you prep for a game-session? Share with your players your preferences as a DM.'
	},
	{
		id: 'player_narrative_authority',
		prompt: 'Player narrative authority',
		description:
			'Do you allow your players to have some narrative authority in your game? How much say do you allow in your game/campaign, for each player? For example; Can the Cleric player create the deity she follows & you as a DM allow her to decide what her deity personality, attitudes, domain, & etc? Or does she have to select a deity from the book? Does the Goliath have a tribe/herd? Who is the leader of his Herd? Does the Paladin follow a specific sect or order? Maybe the Fighter is the son of a Farmer? So now there is a whole farm in your game that, when the party arrives at, the Fighter player now becomes an assistant DM. This can go a LONG way to allowing your players feel ATTACHED to the game setting.'
	},
	{
		id: 'pet_peeves',
		prompt: 'Pet peeves',
		description: 'Helps to be kind and avoid things for the future.'
	},
	{
		id: 'player_agency',
		prompt: 'Player agency',
		description:
			'As a DM, how do you feel about player agency? What is your stance on it? Is it a possibility that the Warlock actually becomes possessed by his Patron? What about when a PC becomes a Werewolf? When does that PC become a DM controlled character? What are the ways PCs can use to un-petrify their fellow PCs from the effects of a Basilisk?, a Medusa? Historically, D&D has not cared much about player agency, what the DM said, is what happened but it has gotten signifcantly better about it as the editions have passed, save-or-die effects kind-of linger but are gone for the most part. Players (veteran or not) coming to play D&D though, may actually welcome & want this kind of thing, while other players may not.'
	},
	{
		id: 'game_balance_and_fairness',
		prompt: 'Game balance',
		description:
			'As a DM, what are your feelings about the balance of the game you are playing? How will you as a DM handle encounter balance? Will you constantly be throwing only Deadly encounters at the PCs? Perhaps you feel that in this kind of sandbox campaign, players can stumble into the Ancient Red Dragons lair at level 1? OR perhaps you feel that the game is broken, or the balance it presents is a farce, so you will employ other means of being fair to your players?'
	},
	{
		id: 'rules_debates',
		prompt: 'Rules debates',
		description:
			'As a DM, how do you handle rules debates? Does the game pause to look up rules? Does the DM make a quick ruling to keep game flow & then the rule is looked up later? Perhaps as a DM you use some combination of both?'
	},
	{
		id: 'minmaxing',
		prompt: 'MinMaxing',
		description:
			"What is your stance on this as a DM? Do you welcome optimized characters, even if the character concept/theme is ridiculous? Perhaps you simply tolerate it, as long as it doesn't become an issue? Or perhaps you & your players decided to play a campaign that is more about ROLL-play than Role-play? Are veterans allowed to help newer players optimize their PCs? If optimized PCs are allowed or encouraged, you may want to let your players know that it is also fine to play unoptimized characters as well."
	}
];

export const SESSION_ZERO_SENSITIVE_TOPICS: SessionZeroQuestion[] = [
	{
		id: 'gender',
		prompt: 'Gender',
		description:
			"DMs consider discussing the gender roles, if any, in your setting and the possibilities of encountering patriarchal or matriarchal cultures & how prevalent each are in this setting. What can characters find as the most common 'norms' for gender roles. Bring up any race/culture in your setting that has off-set or extremest views from the general gender norms you described earlier. Consider discussing the topics of creatures, deities & magic items that can change gender, if any, & how common those are. (Succubus/Incubus come to mind.)"
	},
	{
		id: 'attraction_and_sexual_orientation',
		prompt: 'Attraction',
		description:
			'DMs consider discussing the possibilities of attraction or sexual orientation of both the PCs & the NPCs & the populous, in general, in your setting/campaign. Are there cultural stigmas on select sexual orientations that span across multiple races? or does each race/culture have different views that vary? or does each individual make this decision for themselves? Does religion, does government have an effect here? Are some cultures, religions or governments that are more accepting than others? You may want to ask if it is alright for their character to experience attraction from others that may not match their personal views as a player. You may want to ask if they will be unconformable as a player with seeing interactions in character that may not align to their personal views.'
	},
	{
		id: 'rape_sexual_assault',
		prompt: 'Sexual assault',
		description:
			"DMs what is your stance on this topic? Are characters allowed to have had this happen in their background/past? Maybe you do just limit it to the past, but never the present. Can it happen to NPCs but not PCs? Are characters allowed to perform these acts? If so, is it done only 'off-camera'?"
	},
	{
		id: 'racism_prejudice',
		prompt: 'Racism and prejudice',
		description:
			'Is this a fantasy setting where people are judged by their deeds & merit, on a person by person basis? Or do Elves hate Dwarves?, if so why? Perhaps all the demi-human races view the goblinoid races with disdain? Is it a race by race thing? Perhaps its all faction based? Which cultures or races are more open-minded, which ones are hugely xenophobic, which ones feel that their culture/race is superior?'
	},
	{
		id: 'slavery',
		prompt: 'Slavery',
		description:
			'DMs consider discussing with your table, the stance you have on this topic. Can PC expect to encounter enslaved NPCs? Can PC become enslaved, or does it only happen to NPCs? Can this be a part of the PCs background? If a PC does become enslaved, does the PC somehow become an NPC? How is slavery viewed in your setting by the various cultures in your game? Do only certain races seek to enslave others, or does every race have the potential to take slaves? Perhaps a certain race, is a slave race, similar to house-elves in Harry Potter?'
	},
	{
		id: 'ethic_conclusion',
		prompt: 'Conclusion',
		description:
			'After you have discussed this topics, it maybe best to conclude with a reassuring follow-up. Remind there players that these are being discussed now to avoid player discomfort later on, so that everyone can have a fun game. Remind players that at any time, even if it goes against what you agreed upon, or what was discussed during a Session-0 that they feel uncomfortable, to please say something.'
	}
];

export const SESSION_ZERO_CHARACTER_CREATION: SessionZeroQuestion[] = [
	{
		id: 'creation_questions',
		prompt: 'Creation questions',
		description:
			'DMs if you have some questions you want your players to answer about their characters durring creation, this is the place to list them. You may want to consider things like; Why is your character an adventurer?, How is your character connected to at least one other character in the group?, who are your characters parents, siblings, mentors, etc?.'
	},
	{
		id: 'creation_stats',
		prompt: 'Creation stats',
		description:
			'Do you allow or restrict; the standard array, point buy, or rolling for stats?. If PCs are allowed to roll, do you follow a house-rule set or use the one from the PHB? Are PCs allowed to roll hit-dice for HP or do they take the average?'
	},
	{
		id: 'alignment',
		prompt: 'Alignment',
		description:
			'How heavily is alignment featured in your game? Is alignment perceptive or descriptive? What kind of things can cause a character to change alignment? What happens when a character changes alignment? Is there the potential for class features to because unusable or even lost due to alignment change? Perhaps you do not allow PCs to have alignment, but npcs and monster do, just for those few game mechnics that rely on it?'
	},
	{
		id: 'stat_rulings',
		prompt: 'Stat rulings',
		description:
			'DMs if you have additional rules concerning stats, you may discuss them here. Keep these rules only to stats that may affect character creation, there will be another section for listing other mechanics that may affect game-play and/or characters. Maybe you have an optional Age-trade rule where the elderly gets a +2Wis but suffers a -1Dex & -1Con. Perhaps you have a house rule where characters with 8 or less Int, can not read or write. Discuss these house-rules which have an effect on attribute score discisions.'
	},
	{
		id: 'other_creation_rules',
		prompt: 'Other Creation Rules',
		description:
			'Are you perhaps using the Renown optional rules from the DMG here? Perhaps you allow every player to get a feat at first level? If you restrict certain races or classes or sub-classes, that is the for the next topic.'
	},
	{
		id: 'races_allowed_disallowed',
		prompt: 'Races Allowed/Disallowed',
		description:
			"Are there any races you disallow? Do you allow Flying Races? Do you allow home-brew races? What if the home-brew race was a home-brew of Kinder? would you allow that? Do you allow Unearthed Arcana Races? Elemental Evil Races? Sword Coast Adventure Guide? Volo's Guide? What about the Magic The Gathering Unearthed Arcana Races? Maybe you will some races with a minor tweak to them?"
	},
	{
		id: 'tweaking_reflavor_races',
		prompt: 'Tweaking/Reflavor Races',
		description:
			'Can PCs make minor tweaks to a race? Can PCs reflavor a race to be a different race? Do you allow PCs to play races they home-brewed themselves?'
	},
	{
		id: 'classes_allowed',
		prompt: 'Classes Allowed',
		description:
			'Are there any classes you disallow? Do you allow home-brew classes or only home-brew classes from Mat Mercer & Sterling Vermin? Do you allow Unearthed Arcana classes/sub-classes, the Unearthed Arcana Mystic? Sword Coast Adventure Guide sub-classes?'
	},
	{
		id: 'tweaking_reflavor_classes',
		prompt: 'Tweaking/Reflavor Classes',
		description:
			'Can PCs make minor tweaks to a class or subclass, if it fits a certain theme that you as the DM can agree with? Can PCs reflavor a class to be a different theme, such as a Bard reflavored as Pro Wrestler? Do you allow PCs to play home-brewed classes or sub-classes?'
	},
	{
		id: 'character_party_fit',
		prompt: 'Character party fit',
		description:
			"That 'loner' character? Are they allowed? If so, at what limits? Is it ok if a PC just tags along ONLY to do combat & avoid anything social? D&D is a social based game, you may wish to encourage your players to create characters that play well with others and that will fit with the party. On the other hand, you may want to be mindful about players potentially bullying other players into playing races & classes they do not want to play. Party fit should not limit class & race choice."
	},
	{
		id: 'start_standing',
		prompt: 'Start/standing',
		description:
			'Are characters starting at 1st level, or perhaps at a higher level? If they are starting off as a higher level, are these characters members of a town? a guild? a religion? How long have they been members? How did the character get their higher levels? During this time, have these character somehow earned some minor notoriety?'
	},
	{
		id: 'character_context',
		prompt: 'Character context',
		description:
			'Consider covering the kinds of things that character may know vs what the player may know & the distinction in-between. The character has potentially lived 15+ years in this setting & may know things that a player would not. DMs, if meta-gaming is a concern for you, this is another place where you can break it down, & how you handle it. How can a player have access to something the character may know, should know, will know? Do they roll for this? Do they automatically become told this knowledge by the DM when circumstances trigger it? Can players freely ask? Perhaps you use a mix of all of the above.'
	},
	{
		id: 'backgrounds',
		prompt: 'Backgrounds',
		description:
			'How do backgrounds effect the characters lifestyle? Do you as a DM limited any backgrounds? Do you use backgrounds as all? If you do, do you want final approval of each background selection? Do you allow players to tweak or home-brew their own backgrounds? Have you home-brewed any background for you to use in you campaign?'
	},
	{
		id: 'feats',
		prompt: 'Feats',
		description:
			'Do feats, like the Actor feat, effect backgrounds and the characters lifestyle? Do you as a DM limit any feats? If you allow feats, do you want final approval of each feat selection? Do you allow for the Unearthed Arcana Feats? Have you home-brewed any Feats for use in your campaign? Have you tweaked some of the stock feats? Do you restrict or allow the Lucky feat?'
	}
];

export const SESSION_ZERO_WORLD: SessionZeroQuestion[] = [
	{
		id: 'type_of_game',
		prompt: 'Type of game',
		description:
			'Is this a sandbox game? or more of a rail-road? perhaps its a rail-road that leads to a sandbox game? perhaps a sandbox game where players can jump on & off the railroad only at certain points, or perhaps whenever they like? Will the campaign be following a campaign book, & how closely will that be? Does the setting revolve around the players? or are the players just a tiny cog in a much much larger world? What kind of narrative with the game be? Is it something like LotR or will it involve more mystery and conspiracy, or will it feature heavy political themes, like Game of Thrones? (Expanded this topic thanks to contributions by u/AeoSC)'
	},
	{
		id: 'campaign_length',
		prompt: 'Campaign length',
		description:
			'Discuss how long you think this campaign will run for, will characters be able to reach level 9? level 14? How many sessions you expect the campaign go? (Contributed by u/AeoSC)'
	},
	{
		id: 'in_game_adventurers',
		prompt: 'In-game adventurers',
		description:
			"What can PCs expect from being an adventurer? Are adventurers all heroes? or are they perhaps members of an adventuring guild? or are they all pirates on a pirate ship? perhaps they are all members of a faction? Do Adventurers have 'normal lives' during downtime? How do NPCs generally view adventurers? Is it favorable? or are they looked down upon because they cause more trouble than good? Or perhaps because only the desperate take up the adventuring life?"
	},
	{
		id: 'in_game_politics_factions',
		prompt: 'In-game politics & factions',
		description:
			"What are the various factions at play? can PCs join or already start as members of a faction? What kind of government do the PCs live under? Is it a feudal system? A magocracy? A republic? A tribe? Will the PCs be able to choose to change factions or move to live under a different form of government? What impact does the 'standard adventurer' have on the political landscape? Can the PCs go beyond what the 'standard adventurer' can do? Can the PCs effect change on the political landscape? Can PCs become part of the government? Can PCs even overthrow the government?"
	}
];

export const SESSION_ZERO_GENERAL_MECHANICS: SessionZeroQuestion[] = [
	{
		id: 'ready_an_action',
		prompt: 'Ready an Action',
		description:
			'DMs, this is confusing. It might be a good idea to cover & discuss this mechanic with your table. Consider perhaps going as far as to break it down step-by-step the requirements for using this feature, the cost, & risk involved.'
	},
	{
		id: 'bonus_actions',
		prompt: 'Bonus Actions',
		description:
			'You may want to clarify what a bonus action is, & when it can be taken and that wording is important. How do bonus actions work in relation to the Ready an Action. If you use any house-rules for being able to use a Bonus action as an Action, then list & define that here, or any other rules you have for bonus actions.'
	},
	{
		id: 'repeated_party_rolls',
		prompt: 'Repeated Party Rolls',
		description:
			'DMs considering discussing how you handle these. Does the entire party get to roll perception-checks to spot the hidden door & you take the highest? Perhaps you rule as a DM that only the person that ask, gets to roll & any additional PCs can provide the Help action & that is it? Perhaps you have a different system?'
	},
	{
		id: 'downtime_crafting',
		prompt: 'Downtime/Crafting',
		description:
			'Is there down-time for your PCs? Do you use the downtime RAW? About how much time passes between sessions/adventures? Do you have an alternate down-time system? What do characters do during down-time, what CAN they do during down time? What can PCs craft? Do you use crafting RAW? or did you tweak it?'
	},
	{
		id: 'additional_mechanic_rules',
		prompt: 'Additional mechanic rules',
		description:
			"If you have additional rules that focus on general game play that isn't covered by another topic in this article, list them here. You may want to consider additionally discussing; what is involved in Taming creatures; how much damage you get from Lava/Magma; the breakdown of how Dark-vision, Darkness, & Dim light work, in addition to your other house-rules."
	},
	{
		id: 'advantage_stacking',
		prompt: 'ADV/DISADV Stacking',
		description:
			'As a DM, do you allow multiple sources of disadvantage/advantage stack? Does this stacking only apply when one is used to cancel the other? Even if they stack, do you still only roll with 1 additional advantage/disadvantage dice?'
	},
	{
		id: 'giving_aid',
		prompt: 'ADV/DISADV Giving aid',
		description:
			'Does providing aid, provide straight advantage; or perhaps does the PC giving aid need proficiency in the skill they are using in making the check? Are those perception checks or the Search actions, exempt from this ruling? Is there a time limit on the kind of task that PC an provide aid for?'
	},
	{
		id: 'multiple_attempts',
		prompt: 'ADV/DISADV Multiple attempts',
		description:
			'Can a rogue make that lock picking attempt over & over & over again? As a DM, at what point do you draw the line on multiple attempts? Perhaps as a DM, you would raise the DC in such a case? If so, state what it is. What if the Bard gives the Rogue his bardic inspiration, does this perhaps reset the DC to what it was? What if the rogue took a short rest before trying again? What if the rogue instead spends his inspiration?'
	}
];

export const SESSION_ZERO_INSPIRATION: SessionZeroQuestion[] = [
	{
		id: 'inspiration_snacks',
		prompt: 'Snacks',
		description:
			'Do you allow the players that bring snacks for everyone to gain free inspiration? If not, maybe you can use this as an aside for discussing session snaking and food, if any.'
	},
	{
		id: 'gaining_inspiration',
		prompt: 'Gaining inspiration',
		description:
			"How do players gain inspiration? Does the DM award it? Do players award each other? If players award each other, does the DM have 'veto' power? Can players have multiple sources of inspiration? Can players have more than one inspiration at a time? Perhaps you scrap the inspiration system because its tedious & everyone seems to forget about it?"
	},
	{
		id: 'tracking_inspiration',
		prompt: 'Tracking inspiration',
		description:
			'Does the player with inspiration get a special dice? a special token? Can you keep inspiration from the end of one gaming session to the next gaming session? Can players SHARE inspiration freely with one another?'
	},
	{
		id: 'spending_inspiration',
		prompt: 'Spending inspiration',
		description:
			'How does a player spend inspiration? Does inspiration & bardic inspiration provide some sort of super inspiration? If a player somehow has a pool of inspiration tokens, can a player use spend more than one of those on a single roll? Can a player use Inspiration after seeing the result of the dice, or does it have to be declared before?'
	}
];

export const SESSION_ZERO_CRITS: SessionZeroQuestion[] = [
	{
		id: 'critical_hits',
		prompt: 'Critical hits',
		description:
			'RAW? or do you roll & add maximized damage & then add modifiers? Maybe you will allow your players to choose for each campaign? Maybe you have an alternate method; if so, what is it?'
	},
	{
		id: 'critical_fumbles',
		prompt: 'Critical fumbles',
		description:
			'Is this a rule in your game? Do you have a table, if so, what is on your fumble table? The fumble-table is something every player should be able to readily access. If you do not have a fumble table, do you instead improvise what happens ona crit-fumble?'
	},
	{
		id: 'critical_success',
		prompt: 'Critical success',
		description:
			'Nat-20 on an ability check/save means what? What does it mean to the narrative? Do rolling a Nat-20 allow a player to get what they are after, no matter the circumstances or the ridiculousness of the roll? Would such a roll be immediately apparent in the narrative, or would it go perhaps unnoticed?'
	},
	{
		id: 'critical_fail',
		prompt: 'Critical Fail',
		description:
			'Nat-1 on an ability check/save means what? What does it mean to the narrative? Would such a roll be immediately apparent in the narrative, or would it go perhaps unnoticed?'
	}
];

export const SESSION_ZERO_STEALTH: SessionZeroQuestion[] = [
	{
		id: 'stealth_movement',
		prompt: 'Stealth',
		description:
			'Do you allow stealth movement in your game? How is accomplished? Do you require that the movement be immediately from one hiding spot to the next? Can stealth be accomplished in combat, or is it only out of combat? Consider taking the time to emphasize how Stealth/hiding in D&D is greatly different from what players may have experienced in video-games.'
	},
	{
		id: 'unseen_attacker',
		prompt: 'Unseen Attacker',
		description:
			"What does it mean to be an unseen attacker? How does cover play into effect here? How actions/things causes an unseen attack to become revealed? How does such an attack go back to being an Unseen Attacker? Can enemies even 'target' an unseen attacker?"
	},
	{
		id: 'hidden_hide_action',
		prompt: 'Hidden/Hide Action',
		description:
			"What does it mean to be hidden? Can a hidden creature be a 'valid target'? If they can, what penalties does the attacker have against the hidden creature? What actions/things causes an hidden creature to become un-hidden? How does such a creature go back to being Hidden? Can a hidden creature clearly attack an un-hidden creature without penalty?"
	},
	{
		id: 'invisibility',
		prompt: 'Invisibility',
		description:
			"What does it mean to be invisible? Can an invisible creature be a 'valid target'? If they can, what penalties do they have? What actions/things causes an invisible creature to become revealed or a target? How does an invisible creature go back to being un-revealed?"
	},
	{
		id: 'traps',
		prompt: 'Traps',
		description:
			'Do you as a DM use the new Unearthed Arcana rule-set for traps? Are traps a heavy feature in your game? How often can adventurers be expected to encounter a trap? Do overcoming/defeating traps provide EXP? If so, how much EXP can players expect?'
	}
];

export const SESSION_ZERO_NPCS_CREATURES: SessionZeroQuestion[] = [
	{
		id: 'group_inits',
		prompt: 'Group Inits',
		description:
			'As a DM, do you use them? If so, how? Do you break up large groups into smaller ones? If you do not use Group Inits, what do you use instead?'
	},
	{
		id: 'vendors',
		prompt: 'Vendors',
		description:
			'Most NPCs vendors will sell items for what cost? for base-price? base-price+10%, +20%? will most vendors haggle or only some of them? or will vendors not haggle at all?'
	},
	{
		id: 'other_creature_rules',
		prompt: 'Other Creature rules',
		description:
			"List any other creature rules you may have. Creatures in particular you may want to consider discuss are; Lycanthropes, Vampires, Intellect Devourers, Basilisk, & Medusa. These are the creatures that potentially have the likelihood of taking away player agency. (If there are other creatures that are 'agency thieves' that I failed to think of, post below & I will update this list.)"
	}
];

export const SESSION_ZERO_MAGIC_ITEMS: SessionZeroQuestion[] = [
	{
		id: 'attunement_identify',
		prompt: 'Attunement/Identify',
		description:
			'Does attunement reveal everything about an item, or do PCs need to identify them to get the full list of everything an item can do? Do PCs need to identify an item before being able to attune to it?'
	},
	{
		id: 'magic_resize',
		prompt: 'Magic Resize',
		description:
			'Do wearable items auto-magically resize to fit their wearer? If not, is there a way to resize such items? Perhaps only Rare & above items resize while uncommon does not? Perhaps only if you attune to the item, will it resize? Maybe all magical items auto-resize? Maybe its a case by case basis?'
	},
	{
		id: 'other_magic_item_rules',
		prompt: 'Other magic item rules',
		description: 'List any other magical items rules you may have.'
	}
];

export const SESSION_ZERO_SPELLS: SessionZeroQuestion[] = [
	{
		id: 'additional_customized_spells',
		prompt: 'Additional/customized spells',
		description:
			'Elemental evil spells, do you allow them? Do you allow spells from the Unearthed Arcana: That Old Black Magic? Do you allow for homebrewed spells? Do you allow any class to make tweaks to spells, or do you limit that kind of thing to only the Sorcerer? If spells can be tweaked, what kind of tweaks can be made? Damage-type? Range? Duration? etc.'
	},
	{
		id: 'spells_vs_environments',
		prompt: 'Spells Vs environments',
		description:
			'Do spells work differently in different environments? Do fire spells work underwater? what about lightning spells underwater? Do ice spells work on the Plane of Fire? Do you have guidelines or do you make judgement calls when such circumstances happen?'
	},
	{
		id: 'spell_abuse',
		prompt: 'Spell abuse',
		description:
			'As a DM how do you handle things if a caster starts using spells abusively? What do you consider to be spell abuse?'
	},
	{
		id: 'spell_casting_juggling',
		prompt: 'Spell casting & juggling',
		description:
			"Do players need to keep track of which hand carries their components, which hand they use for somatic gestures, which hand they use for foci, which hands holds their spell-book, & which hand they use for weapons? Or perhaps as DM, you don't care as long as it isn't breaking the action economy? Do you strictly enforce spell-casting rules via RAW, or do you allow some leniency?"
	},
	{
		id: 'material_components',
		prompt: 'Material components',
		description:
			'Do spell casters need to keep track of what components they have? or can they just simply deduct 50gp for that diamond they need for Chromatic Orb? Perhaps you decided to wave all the material cost of spell components for spells below 6th level? Consider discussing what you as a DM expect from your caster players.'
	},
	{
		id: 'spell_tweaks',
		prompt: 'Spell Tweaks',
		description:
			'DMs list your spell tweaks here. Perhaps the Grease spell is flammable? Maybe you found on reddit a better version of True Strike cantrip that you would like to use. Maybe you renamed Chill Touch so that its name is less confusing? Maybe you tweaked/expanded on how Charm & Illusion spells work? Perhaps if the Bard can make his/her Vicious Mockery funny enough to make you laugh, it auto-crits?'
	}
];

export const SESSION_ZERO_DEATH_RESTING: SessionZeroQuestion[] = [
	{
		id: 'death',
		prompt: 'Death',
		description:
			'What happens when a PC dies? What happens when there is a TPK? Does the game end? Does it mean that time passes & events progress a certain number of years before the players can create new PCs? Should every player have a backup character ready to go? Make sure your players know what it means when these events happens; this is something often forgotten about that brand new players need to know.'
	},
	{
		id: 'resurrection',
		prompt: 'Resurrection',
		description:
			'What options, in the setting or in the game, do players have for resurrecting fallen PCs? Is this the privy of high-level PCs & Gods, or can anyone bring the corpse of a fallen ally to the resurrection temple & pay a huge sum of money to resurrect a character? Do you have an alternate set of Resurrection rules. Did you pick up the rule-set that Mat Mercer recently refined for his PC resurrections? Even if you follow resurrection RAW, what impact does resurrection have in-game? Is this a common occurrence in this setting? or is it something special & unique? Will characters be expected to go get a special Mcguffin (like unicorn blood, angel tears, phoenix down) otherwise resurrection spells will automatically fail?'
	},
	{
		id: 'death_rules',
		prompt: 'Death Rules',
		description:
			'DMs if you have game mechanic rules for when PCs die, discuss them here. What about Massive Damage rules; does it outright kill you? A common rule seems to be Death Exhaustion: When a character regains 1hp from after being dropped to 0hp, that character gains one level of exhaustion.'
	},
	{
		id: 'resting_rules',
		prompt: 'Resting Rules',
		description:
			'DMs if you have rules for rest mechanics discuss them here. A common rule seems to be only 2 short rest before a long rest. Another common is that a Long Rest always starts with a Short rest.'
	}
];

export const SESSION_ZERO_GAMEPLAY_SUBCATEGORIES: SessionZeroSubcategory[] = [
	{ id: 'gameplay_basics', label: 'Basics', questions: SESSION_ZERO_GAMEPLAY },
	{
		id: 'general_mechanics',
		label: 'General mechanic rules',
		questions: SESSION_ZERO_GENERAL_MECHANICS
	},
	{ id: 'crits', label: 'Crits', questions: SESSION_ZERO_CRITS },
	{ id: 'stealth', label: 'Sneaky', questions: SESSION_ZERO_STEALTH },
	{ id: 'npcs_creatures', label: 'NPCs/Creatures', questions: SESSION_ZERO_NPCS_CREATURES },
	{ id: 'magic_items', label: 'Magic Items', questions: SESSION_ZERO_MAGIC_ITEMS },
	{ id: 'spells', label: 'Spells & Spell Effects', questions: SESSION_ZERO_SPELLS },
	{
		id: 'death_resting',
		label: 'Death, Resurrection, Resting',
		questions: SESSION_ZERO_DEATH_RESTING
	}
];

export const SESSION_ZERO_CATEGORIES: SessionZeroCategory[] = [
	{ id: 'world', label: 'World', questions: SESSION_ZERO_WORLD },
	{ id: 'dm_style', label: 'DM style', questions: SESSION_ZERO_DM_STYLE },
	{ id: 'conduct', label: 'Conduct', questions: SESSION_ZERO_CONDUCT },
	{
		id: 'sensitive_topics',
		label: 'Sensitive topics',
		questions: SESSION_ZERO_SENSITIVE_TOPICS
	},
	{
		id: 'character_creation',
		label: 'Character creation',
		questions: SESSION_ZERO_CHARACTER_CREATION
	},
	{
		id: 'gameplay',
		label: 'Gameplay',
		subcategories: SESSION_ZERO_GAMEPLAY_SUBCATEGORIES
	},
	{ id: 'inspiration', label: 'Inspiration', questions: SESSION_ZERO_INSPIRATION }
];

function getCategoryQuestions(category: SessionZeroCategory): SessionZeroQuestion[] {
	if (category.questions) {
		return category.questions;
	}

	return category.subcategories?.flatMap((subcategory) => subcategory.questions) ?? [];
}

export const SESSION_ZERO_QUESTIONS = SESSION_ZERO_CATEGORIES.flatMap(getCategoryQuestions);

export const SESSION_ZERO_QUESTION_IDS = SESSION_ZERO_QUESTIONS.map((question) => question.id);
