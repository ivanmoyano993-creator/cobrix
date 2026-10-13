import { CENTS_PER_UNIT, CURRENCY } from './constants/money.constants.ts'

export function toCents(value: number): number | null {
	if (!Number.isFinite(value)) return null
	return Math.round(value * CENTS_PER_UNIT)
}

export function formatCents(cents: number): string {
	return `${CURRENCY} ${(cents / CENTS_PER_UNIT).toFixed(2)}`
}
