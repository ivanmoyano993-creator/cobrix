import { formatCents } from '../cobrix/domain/money.ts'
import { DATE_TIME_FORMAT, DOCUMENT_TYPE_PATTERN, EMPTY_VALUE, MS_PER_DAY, SHORT_MONTHS } from './constants/ui.constants.ts'

export function usd(cents: number): string {
	return formatCents(cents)
}

export function date(value: string | null): string {
	if (value === null || value === '') return EMPTY_VALUE
	const [year, month, day] = value.slice(0, 10).split('-')
	const monthName = SHORT_MONTHS[Number(month) - 1] ?? month
	return day ? `${Number(day)} ${monthName} ${year}` : `${monthName} ${year}`
}

export function dateTime(value: string | null): string {
	if (value === null || value === '') return EMPTY_VALUE
	return DATE_TIME_FORMAT.format(new Date(value))
}

export function duration(startedAt: string, finishedAt: string | null): string {
	if (finishedAt === null) return EMPTY_VALUE
	const seconds = (Date.parse(finishedAt) - Date.parse(startedAt)) / 1000
	return `${seconds.toFixed(1).replace('.', ',')} s`
}

export function daysBetween(from: string, to: string): number {
	return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY)
}

export function formatDocument(documentId: string): string {
	return DOCUMENT_TYPE_PATTERN.test(documentId) ? `${documentId.slice(0, 1)}-${documentId.slice(1)}` : documentId
}

export function plural(count: number, singular: string, many: string): string {
	return `${count} ${count === 1 ? singular : many}`
}
