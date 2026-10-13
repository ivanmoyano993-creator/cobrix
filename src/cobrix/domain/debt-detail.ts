import { addCivilDays } from '../../shared/dates.ts'
import { DEBT_DETAIL_PATTERN, SPANISH_MONTHS } from './constants/debt-detail.constants.ts'
import type { DebtPeriod } from './interfaces/debt-detail.interface.ts'

export function parseDebtDetail(detail: readonly string[]): DebtPeriod | null {
	const [label] = detail
	if (detail.length !== 1 || label === undefined) return null
	const match = DEBT_DETAIL_PATTERN.exec(label.trim())
	if (!match) return null
	const month = SPANISH_MONTHS.indexOf((match[2] ?? '').toLowerCase()) + 1
	if (month === 0) return null
	const period = `${match[1]}-${String(month).padStart(2, '0')}`
	return { period, dueDate: `${period}-01` }
}

export function cutoffDate(dueDate: string, graceDays: number): string {
	return addCivilDays(dueDate, graceDays)
}
