import type { InvoiceStatus } from '../types/invoice.types.ts'

export interface NewInvoice {
	readonly externalId: string
	readonly customerId: string
	readonly contractId: number
	readonly period: string
	readonly dueDate: string
	readonly cutoffDate: string
	readonly totalCents: number
	readonly importedRunId: number
	readonly createdAt: string
}

export interface Invoice extends NewInvoice {
	readonly id: number
	readonly number: string
	readonly customerName: string
	readonly balanceCents: number
	readonly status: InvoiceStatus
	readonly paidAt: string | null
	readonly paidByInvoiceId: number | null
	readonly paidByInvoiceNumber: string | null
}
