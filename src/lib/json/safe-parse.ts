export function safeJsonParse<T>(text: string | null | undefined, fallback: T): T {
	if (!text) return fallback;

	try {
		return JSON.parse(text) as T;
	} catch {
		return fallback;
	}
}

export function safeJsonParseArray(text: string | null | undefined): string[] {
	const parsed = safeJsonParse<unknown>(text, []);
	return Array.isArray(parsed)
		? parsed.filter((entry): entry is string => typeof entry === 'string')
		: [];
}

export function safeJsonParseObject<T extends Record<string, unknown>>(
	text: string | null | undefined,
	fallback: T
): T {
	const parsed = safeJsonParse<unknown>(text, fallback);
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		return fallback;
	}

	return parsed as T;
}
