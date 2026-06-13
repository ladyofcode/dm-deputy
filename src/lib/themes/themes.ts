import type { CampaignTheme, ThemePreset } from './types';

export type ThemeOption = {
	value: ThemePreset;
	label: string;
	description: string;
};

export const accountThemeOptions: ThemeOption[] = [
	{
		value: 'default',
		label: 'Default',
		description: 'Clean, neutral styling for everyday use.'
	},
	{
		value: 'medieval',
		label: 'Medieval',
		description: 'Royal scriptorium — parchment tones, Cinzel headings, subtle grain.'
	}
];

export const campaignThemeOptions: { value: CampaignTheme; label: string; description: string }[] =
	[
		{
			value: 'default',
			label: 'Inherit from account',
			description: 'Use your account theme unless you pick a campaign override.'
		},
		...accountThemeOptions.filter((option) => option.value !== 'default')
	];
