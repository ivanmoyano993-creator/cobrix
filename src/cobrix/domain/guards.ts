export function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
	for (const item of values) {
		if (item === value) return true
	}
	return false
}
