export function createRevisionSignal() {
	let revision = $state(0);

	return {
		track(): number {
			return revision;
		},
		bump(): void {
			revision += 1;
		}
	};
}
