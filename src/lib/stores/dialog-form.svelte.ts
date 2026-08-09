type DialogFormResetOptions = {
	whenKeyMissing?: 'clear' | 'keep';
};

export function useDialogFormReset(
	getOpen: () => boolean,
	getKey: () => string | null | undefined,
	onReset: () => void,
	options: DialogFormResetOptions = {}
): void {
	const { whenKeyMissing = 'clear' } = options;
	let formKey = $state('');

	$effect(() => {
		if (!getOpen()) {
			formKey = '';
			return;
		}

		const nextKey = getKey();
		if (nextKey == null || nextKey === '') {
			if (whenKeyMissing === 'keep') {
				return;
			}
			formKey = '';
			return;
		}

		if (formKey === nextKey) return;

		formKey = nextKey;
		onReset();
	});
}
