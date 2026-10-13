import { CENTS_PER_UNIT, CURRENCY, MONEY_FORMAT } from './constants/money.constants.ts'

export function toCents(value: number): number | null {
	if (!Number.isFinite(value)) return null
	return Math.round(value * CENTS_PER_UNIT)
}

export function formatCents(cents: number): string {
	return `${CURRENCY} ${MONEY_FORMAT.format(cents / CENTS_PER_UNIT)}`
}
