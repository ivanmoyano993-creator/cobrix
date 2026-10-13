export interface LedgerPayment {
	readonly contractId: number
	readonly installmentId: number
	readonly period: string
	readonly fee: number
	readonly paid: number
	readonly discount: number
	readonly balance: number
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

export interface LedgerState {
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
