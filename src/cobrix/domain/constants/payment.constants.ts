export const PAYMENT_OUTCOME = {
	Paid: 'paid',
	PartialPayment: 'partial_payment',
	Unchanged: 'unchanged',
	Exempt: 'exempt',
	NoEvidence: 'no_evidence',
	Inconsistent: 'inconsistent',
} as const

export const NO_COLLECTION_INVOICE_ID = 0
