export interface LedgerPayment {
	readonly contractId: number
	readonly installmentId: number
	readonly period: string
	readonly fee: number
	readonly paid: number
	readonly discount: number
	readonly balance: number
	readonly creditNote: number | null
	readonly additional: number | null
	readonly usage: number | null
	readonly nonUsage: number | null
}

export interface LedgerEntry {
	readonly invoiceId: number
	readonly invoiceNumber: string
	readonly issuedOn: string
	readonly contractId: number
	readonly payment: LedgerPayment
}

export interface ClassifyPaymentInput {
	readonly debtId: string
	readonly contractId: number
	readonly openBalanceCents: number
	readonly ledger: readonly LedgerEntry[]
	readonly pendingDebtCents: number | null
}

export interface LedgerOptionalCents {
	readonly creditNoteCents: number | null
	readonly additionalCents: number | null
	readonly usageCents: number | null
	readonly nonUsageCents: number | null
}

export interface LedgerState extends LedgerOptionalCents {
	readonly period: string
	readonly feeCents: number
	readonly paidCents: number
	readonly discountCents: number
	readonly balanceCents: number
}

export interface PayingInvoice {
	readonly invoiceId: number
	readonly invoiceNumber: string
	readonly date: string
}
