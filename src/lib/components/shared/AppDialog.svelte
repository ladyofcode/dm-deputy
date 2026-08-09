<script lang="ts">
	import { Dialog } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		open?: boolean;
		title?: string;
		description?: string;
		wide?: boolean;
		stacked?: boolean;
		variant?: 'default' | 'viewer';
		contentClass?: string;
		overlayClass?: string;
		ariaLabel?: string;
		triggerVariant?: 'icon';
		triggerAriaLabel?: string;
		onOpenChange?: (open: boolean) => void;
		trigger?: Snippet<[{ props?: Record<string, unknown> }]>;
		titleContent?: Snippet;
		descriptionContent?: Snippet;
		children?: Snippet;
		footer?: Snippet;
	};

	let {
		open = $bindable(false),
		title,
		description,
		wide = false,
		stacked = false,
		variant = 'default',
		contentClass = '',
		overlayClass = '',
		ariaLabel,
		triggerVariant,
		triggerAriaLabel,
		onOpenChange,
		trigger,
		titleContent,
		descriptionContent,
		children,
		footer
	}: Props = $props();

	const overlayClasses = $derived(
		[stacked ? 'dialog-stacked-overlay' : '', overlayClass].filter(Boolean).join(' ')
	);

	const contentClasses = $derived(
		[
			wide ? 'dialog-wide' : '',
			stacked ? 'dialog-stacked' : '',
			variant === 'viewer' ? 'dialog-viewer' : '',
			contentClass
		]
			.filter(Boolean)
			.join(' ')
	);

	const isViewer = $derived(variant === 'viewer');
</script>

<Dialog.Root bind:open {onOpenChange}>
	{#if trigger}
		<Dialog.Trigger
			data-variant={triggerVariant === 'icon' ? 'icon' : undefined}
			aria-label={triggerAriaLabel}
		>
			{@render trigger({})}
		</Dialog.Trigger>
	{/if}

	<Dialog.Portal>
		<Dialog.Overlay class={overlayClasses || undefined} />
		<Dialog.Content class={contentClasses || undefined} aria-label={ariaLabel}>
			{#if !isViewer && (titleContent || title)}
				{#if titleContent}
					{@render titleContent()}
				{:else}
					<Dialog.Title>{title}</Dialog.Title>
				{/if}
			{/if}

			{#if !isViewer && (descriptionContent || description)}
				<Dialog.Description>
					{#if descriptionContent}
						{@render descriptionContent()}
					{:else}
						{description}
					{/if}
				</Dialog.Description>
			{/if}

			{#if children}
				{@render children()}
			{/if}

			{#if footer}
				{@render footer()}
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
