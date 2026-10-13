export const HISTORY_EVENT = {
	CustomerCreated: 'customer_created',
	InvoiceImported: 'invoice_imported',
	InvoicePaid: 'invoice_paid',
} as const

export const HISTORY_EVENTS = Object.values(HISTORY_EVENT)
