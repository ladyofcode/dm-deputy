export type NamePool = {
	id: string;
	label: string;
	names: readonly string[];
};

export type HumanEthnicity = {
	id: string;
	label: string;
	pools: readonly NamePool[];
	surnameFirst?: boolean;
	note?: string;
};

export type RaceNameGenerator = {
	id: string;
	label: string;
	speciesNames: readonly string[];
	pools: readonly NamePool[];
	/** When true, surname is shown before given name (e.g. Shou). */
	surnameFirst?: boolean;
	/** Optional sub-groups (e.g. human ethnicities). */
	groups?: readonly HumanEthnicity[];
};

export const DWARF_NAME_POOLS: readonly NamePool[] = [
	{
		id: 'male',
		label: 'Male',
		names: [
			'Adrik',
			'Alberich',
			'Baern',
			'Barendd',
			'Brottor',
			'Bruenor',
			'Dain',
			'Darrak',
			'Delg',
			'Eberk',
			'Einkil',
			'Fargrim',
			'Flint',
			'Gardain',
			'Harbek',
			'Kildrak',
			'Morgran',
			'Orsik',
			'Oskar',
			'Rangrim',
			'Rurik',
			'Taklinn',
			'Thoradin',
			'Thorin',
			'Tordek',
			'Traubon',
			'Travok',
			'Ulfgar',
			'Veit',
			'Vondal'
		]
	},
	{
		id: 'female',
		label: 'Female',
		names: [
			'Amber',
			'Artin',
			'Audhild',
			'Bardryn',
			'Dagnal',
			'Diesa',
			'Eldeth',
			'Falkrunn',
			'Finellen',
			'Gunnloda',
			'Gurdis',
			'Helja',
			'Hlin',
			'Kathra',
			'Kristryd',
			'Ilde',
			'Liftrasa',
			'Mardred',
			'Riswynn',
			'Sannl',
			'Torbera',
			'Torgga',
			'Vistra'
		]
	},
	{
		id: 'clan',
		label: 'Clan',
		names: [
			'Balderk',
			'Battlehammer',
			'Brawnanvil',
			'Dankil',
			'Fireforge',
			'Frostbeard',
			'Gorunn',
			'Holderhek',
			'Ironfist',
			'Loderr',
			'Lutgehr',
			'Rumnaheim',
			'Strakeln',
			'Torunn',
			'Ungart'
		]
	}
];

export const ELF_NAME_POOLS: readonly NamePool[] = [
	{
		id: 'child',
		label: 'Child',
		names: [
			'Ara',
			'Bryn',
			'Del',
			'Eryn',
			'Faen',
			'Innil',
			'Lael',
			'Mella',
			'Naill',
			'Naeris',
			'Phann',
			'Rael',
			'Rinn',
			'Sai',
			'Syllin',
			'Thia',
			'Vall'
		]
	},
	{
		id: 'male',
		label: 'Male adult',
		names: [
			'Adran',
			'Aelar',
			'Aramil',
			'Arannis',
			'Aust',
			'Beiro',
			'Berrian',
			'Carric',
			'Enialis',
			'Erdan',
			'Erevan',
			'Galinndan',
			'Hadarai',
			'Heian',
			'Himo',
			'Immeral',
			'Ivellios',
			'Laucian',
			'Mindartis',
			'Paelias',
			'Peren',
			'Quarion',
			'Riardon',
			'Rolen',
			'Soveliss',
			'Thamior',
			'Tharivol',
			'Theren',
			'Varis'
		]
	},
	{
		id: 'female',
		label: 'Female adult',
		names: [
			'Adrie',
			'Althaea',
			'Anastrianna',
			'Andraste',
			'Antinua',
			'Bethrynna',
			'Birel',
			'Caelynn',
			'Drusilia',
			'Enna',
			'Felosial',
			'Ielenia',
			'Jelenneth',
			'Keyleth',
			'Leshanna',
			'Lia',
			'Meriele',
			'Mialee',
			'Naivara',
			'Quelenna',
			'Quillathe',
			'Sariel',
			'Shanairra',
			'Shava',
			'Silaqui',
			'Theirastra',
			'Thia',
			'Vadania',
			'Valanthe',
			'Xanaphia'
		]
	},
	{
		id: 'family',
		label: 'Family',
		names: [
			'Amakiir (Gemflower)',
			'Amastacia (Starflower)',
			'Galanodel (Moonwhisper)',
			'Holimion (Diamonddew)',
			'Ilphelkiir (Gemblossom)',
			'Liadon (Silverfrond)',
			'Meliamne (Oakenheel)',
			'Naïlo (Nightbreeze)',
			'Siannodel (Moonbrook)',
			'Xiloscient (Goldpetal)'
		]
	}
];

export const GOBLIN_NAME_POOLS: readonly NamePool[] = [
	{
		id: 'name',
		label: 'Name',
		names: [
			'Borkle',
			'Marrow',
			'Tododon',
			'Sparkmack',
			'Svish',
			'Mogglewog',
			'Bendigo',
			'Jare',
			'Peacho',
			'Lock',
			'Shock',
			'Barrel',
			'Snik',
			'Snak',
			'Gordo',
			'Nipmonger',
			'Riddle',
			'Spip',
			'Kaa',
			'Bonegrundle',
			'Yaxmax',
			'Tamborine',
			'Riggity',
			'Fishspleen',
			'Bladder Dan',
			'Mumblemorg',
			'Piss Jar',
			'Kettle',
			'Gnogin',
			'Eee',
			'Rattrap',
			'Bigsmalls',
			'Pork',
			'Fwip',
			'Gong',
			'Zaza',
			'Meeg',
			'Meeg Two',
			'Meeg Three',
			'Spud',
			'Uvano',
			'Pingpang',
			'Bowel',
			'Ham',
			'Gritgrash',
			'Countbean',
			'Sap Sam',
			'Leek Leek',
			'Bwob',
			'Parsnip Jr.',
			'Parsnip Sr.',
			'Fat Cat',
			'Eyemasher',
			'Quiss',
			'Wawa',
			'Spork',
			'Turnaround',
			'Barfknees',
			'KnifeyMcFingers',
			'Cowshout',
			'Spank',
			'Stumpy',
			'Backwater',
			'Crowlaw',
			'Clockwind',
			'Burtlan',
			'Smee',
			'Macintosh',
			'Sexpants',
			"Ol' Crabapple",
			'Muckman',
			'Dirtwallow',
			'Crooknose',
			'Beetlepocket',
			'Sticky',
			'Vraaz',
			'Vick',
			'Brackish',
			'Pondjohn',
			'Waxmuncher',
			'Wicklicker',
			'Candleear',
			'Grimm',
			'Portho',
			'Odo',
			'Fleshgutter',
			'Slugsnatcher',
			'Milksalt',
			'Stewslosh',
			'Cast Iron',
			'Dutch',
			'Squirrelskinner',
			'Froggrope',
			'Topsyturvy',
			'Lardmouth',
			'Thighflayer',
			'Sinew',
			'Hypotenoose',
			'Gallow',
			'Boblin'
		]
	}
];

export const HUMAN_ETHNICITIES: readonly HumanEthnicity[] = [
	{
		id: 'calishite',
		label: 'Calishite',
		pools: [
			{
				id: 'male',
				label: 'Male',
				names: ['Aseir', 'Bardeid', 'Haseid', 'Khemed', 'Mehmen', 'Sudeiman', 'Zasheir']
			},
			{
				id: 'female',
				label: 'Female',
				names: ['Atala', 'Ceidil', 'Hama', 'Jasmal', 'Meilil', 'Seipora', 'Yasheira', 'Zasheida']
			},
			{
				id: 'surname',
				label: 'Surname',
				names: ['Basha', 'Dumein', 'Jassan', 'Khalid', 'Mostana', 'Pashar', 'Rein']
			}
		]
	},
	{
		id: 'chondathan',
		label: 'Chondathan',
		pools: [
			{
				id: 'male',
				label: 'Male',
				names: ['Darvin', 'Dorn', 'Evendur', 'Gorstag', 'Grim', 'Helm', 'Malark', 'Morn', 'Randal', 'Stedd']
			},
			{
				id: 'female',
				label: 'Female',
				names: ['Arveene', 'Esvele', 'Jhessail', 'Kerri', 'Lureene', 'Miri', 'Rowan', 'Shandri', 'Tessele']
			},
			{
				id: 'surname',
				label: 'Surname',
				names: ['Amblecrown', 'Buckman', 'Dundragon', 'Evenwood', 'Greycastle', 'Tallstag']
			}
		]
	},
	{
		id: 'damaran',
		label: 'Damaran',
		pools: [
			{
				id: 'male',
				label: 'Male',
				names: ['Bor', 'Fodel', 'Glar', 'Grigor', 'Igan', 'Ivor', 'Kosef', 'Mival', 'Orel', 'Pavel', 'Sergor']
			},
			{
				id: 'female',
				label: 'Female',
				names: ['Alethra', 'Kara', 'Katernin', 'Mara', 'Natali', 'Olma', 'Tana', 'Zora']
			},
			{
				id: 'surname',
				label: 'Surname',
				names: ['Bersk', 'Chernin', 'Dotsk', 'Kulenov', 'Marsk', 'Nemetsk', 'Shemov', 'Starag']
			}
		]
	},
	{
		id: 'illuskan',
		label: 'Illuskan',
		pools: [
			{
				id: 'male',
				label: 'Male',
				names: ['Ander', 'Blath', 'Bran', 'Frath', 'Geth', 'Lander', 'Luth', 'Malcer', 'Stor', 'Taman', 'Urth']
			},
			{
				id: 'female',
				label: 'Female',
				names: ['Amafrey', 'Betha', 'Cefrey', 'Kethra', 'Mara', 'Olga', 'Silifrey', 'Westra']
			},
			{
				id: 'surname',
				label: 'Surname',
				names: ['Brightwood', 'Helder', 'Hornraven', 'Lackman', 'Stormwind', 'Windrivver']
			}
		]
	},
	{
		id: 'mulan',
		label: 'Mulan',
		pools: [
			{
				id: 'male',
				label: 'Male',
				names: ['Aoth', 'Bareris', 'Ehput-Ki', 'Kethoth', 'Mumed', 'Ramas', 'So-Kehur', 'Thazar-De', 'Urhur']
			},
			{
				id: 'female',
				label: 'Female',
				names: ['Arizima', 'Chathi', 'Nephis', 'Nulara', 'Murithi', 'Sefris', 'Thola', 'Umara', 'Zolis']
			},
			{
				id: 'surname',
				label: 'Surname',
				names: ['Ankhalab', 'Anskuld', 'Fezim', 'Hahpet', 'Nathandem', 'Sepret', 'Uuthrakt']
			}
		]
	},
	{
		id: 'rashemi',
		label: 'Rashemi',
		pools: [
			{
				id: 'male',
				label: 'Male',
				names: ['Borivik', 'Faurgar', 'Jandar', 'Kanithar', 'Madislak', 'Ralmevik', 'Shaumar', 'Vladislak']
			},
			{
				id: 'female',
				label: 'Female',
				names: ['Fyevarra', 'Hulmarra', 'Immith', 'Imzel', 'Navarra', 'Shevarra', 'Tammith', 'Yuldra']
			},
			{
				id: 'surname',
				label: 'Surname',
				names: ['Chergoba', 'Dyernina', 'Iltazyara', 'Murnyethara', 'Stayanoga', 'Ulmokina']
			}
		]
	},
	{
		id: 'shou',
		label: 'Shou',
		surnameFirst: true,
		pools: [
			{
				id: 'male',
				label: 'Male',
				names: ['An', 'Chen', 'Chi', 'Fai', 'Jiang', 'Jun', 'Lian', 'Long', 'Meng', 'On', 'Shan', 'Shui', 'Wen']
			},
			{
				id: 'female',
				label: 'Female',
				names: ['Bai', 'Chao', 'Jia', 'Lei', 'Mei', 'Qiao', 'Shui', 'Tai']
			},
			{
				id: 'surname',
				label: 'Surname',
				names: ['Chien', 'Huang', 'Kao', 'Kung', 'Lao', 'Ling', 'Mei', 'Pin', 'Shin', 'Sum', 'Tan', 'Wan']
			}
		]
	},
	{
		id: 'tethyrian',
		label: 'Tethyrian',
		note: 'Tethyrians primarily use Chondathan names.',
		pools: [
			{
				id: 'male',
				label: 'Male',
				names: ['Darvin', 'Dorn', 'Evendur', 'Gorstag', 'Grim', 'Helm', 'Malark', 'Morn', 'Randal', 'Stedd']
			},
			{
				id: 'female',
				label: 'Female',
				names: ['Arveene', 'Esvele', 'Jhessail', 'Kerri', 'Lureene', 'Miri', 'Rowan', 'Shandri', 'Tessele']
			},
			{
				id: 'surname',
				label: 'Surname',
				names: ['Amblecrown', 'Buckman', 'Dundragon', 'Evenwood', 'Greycastle', 'Tallstag']
			}
		]
	},
	{
		id: 'turami',
		label: 'Turami',
		pools: [
			{
				id: 'male',
				label: 'Male',
				names: ['Anton', 'Diero', 'Marcon', 'Pieron', 'Rimardo', 'Romero', 'Salazar', 'Umbero']
			},
			{
				id: 'female',
				label: 'Female',
				names: ['Balama', 'Dona', 'Faila', 'Jalana', 'Luisa', 'Marta', 'Quara', 'Selise', 'Vonda']
			},
			{
				id: 'surname',
				label: 'Surname',
				names: ['Agosto', 'Astorio', 'Calabra', 'Domine', 'Falone', 'Marivaldi', 'Pisacar', 'Ramondo']
			}
		]
	}
];

export const RACE_NAME_GENERATORS: readonly RaceNameGenerator[] = [
	{
		id: 'dwarf',
		label: 'Dwarf',
		speciesNames: ['Dwarf'],
		pools: DWARF_NAME_POOLS
	},
	{
		id: 'elf',
		label: 'Elf',
		speciesNames: ['Elf', 'Elves'],
		pools: ELF_NAME_POOLS
	},
	{
		id: 'human',
		label: 'Human',
		speciesNames: ['Human'],
		pools: [],
		groups: HUMAN_ETHNICITIES
	},
	{
		id: 'goblin',
		label: 'Goblin',
		speciesNames: ['Goblin'],
		pools: GOBLIN_NAME_POOLS
	}
];

export function getRaceNameGenerator(id: string): RaceNameGenerator | undefined {
	return RACE_NAME_GENERATORS.find((generator) => generator.id === id);
}

export function getRaceNameGeneratorForSpecies(speciesName: string): RaceNameGenerator | undefined {
	const normalized = speciesName.trim().toLowerCase();
	return RACE_NAME_GENERATORS.find((generator) =>
		generator.speciesNames.some((name) => name.toLowerCase() === normalized)
	);
}

export function buildFullName(
	parts: readonly string[],
	surnameFirst = false
): string {
	const filtered = parts.map((part) => part.trim()).filter(Boolean);
	if (filtered.length === 0) return '';

	if (surnameFirst && filtered.length >= 2) {
		const surname = filtered[filtered.length - 1];
		const given = filtered.slice(0, -1).join(' ');
		return `${surname} ${given}`.trim();
	}

	return filtered.join(' ');
}
