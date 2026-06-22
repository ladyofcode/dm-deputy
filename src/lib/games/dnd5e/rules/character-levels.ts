import type { CharacterLevel } from '$lib/games/types';

export const characterLevels: CharacterLevel[] = [
	{ level: 1, experience_points: 0 },
	{ level: 2, experience_points: 300 },
	{ level: 3, experience_points: 900 },
	{ level: 4, experience_points: 2700 },
	{ level: 5, experience_points: 6500 },
	{ level: 6, experience_points: 14000 },
	{ level: 7, experience_points: 23000 },
	{ level: 8, experience_points: 34000 },
	{ level: 9, experience_points: 48000 },
	{ level: 10, experience_points: 64000 },
	{ level: 11, experience_points: 85000 },
	{ level: 12, experience_points: 100000 },
	{ level: 13, experience_points: 120000 },
	{ level: 14, experience_points: 140000 },
	{ level: 15, experience_points: 165000 },
	{ level: 16, experience_points: 195000 },
	{ level: 17, experience_points: 225000 },
	{ level: 18, experience_points: 265000 },
	{ level: 19, experience_points: 305000 },
	{ level: 20, experience_points: 355000 }
];

export function getLevelForExperience(experiencePoints: number): number {
	let level = 1;

	for (const entry of characterLevels) {
		if (experiencePoints >= entry.experience_points) {
			level = entry.level;
		} else {
			break;
		}
	}

	return level;
}
