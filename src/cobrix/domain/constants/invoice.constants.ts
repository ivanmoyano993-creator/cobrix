export const INVOICE_STATUS = {
	Open: 'open',
	Paid: 'paid',
} as const

export const INVOICE_STATUSES = Object.values(INVOICE_STATUS)

export const INVOICE_NUMBER_PREFIX = 'COB-'

export const INVOICE_NUMBER_DIGITS = 6
