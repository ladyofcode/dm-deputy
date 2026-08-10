<script lang="ts">
	import { Button } from 'bits-ui';
	import BinIcon from '$lib/components/icons/BinIcon.svelte';

	type Props = {
		ariaLabel: string;
		disabled?: boolean;
		busy?: boolean;
		variant?: 'icon' | 'ghost';
		class?: string;
		onclick: () => void;
	};

	let {
		ariaLabel,
		disabled = false,
		busy = false,
		variant = 'icon',
		class: className,
		onclick
	}: Props = $props();
</script>

<Button.Root
	type="button"
	data-variant={variant}
	class={className}
	disabled={disabled || busy}
	aria-label={ariaLabel}
	aria-busy={busy || undefined}
	{onclick}
>
	<BinIcon size={variant === 'ghost' ? 18 : 20} />
</Button.Root>
