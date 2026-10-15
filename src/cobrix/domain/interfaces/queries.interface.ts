import type { DocumentType, PersonKind } from '../types/document.types.ts'
import type { HistoryEvent } from './history.interface.ts'
import type { ContractInfo } from './import.interface.ts'
import type { Invoice } from './invoice.interface.ts'
import type { RunSummary } from './run.interface.ts'

export interface Overview {
	readonly customers: number
	readonly contracts: number
	readonly openInvoices: number
	readonly paidInvoices: number
	readonly receivableCents: number
	readonly providerContracts: number | null
}

export interface CustomerRow {
	readonly id: string
	readonly name: string
	readonly documentType: DocumentType | null
	readonly personKind: PersonKind
	readonly contracts: number
	readonly openInvoices: number
	readonly paidInvoices: number
	readonly debtCents: number
	readonly oldestDueDate: string | null
}

export interface CustomerProfile {
	readonly id: string
	readonly name: string
	readonly documentType: DocumentType | null
	readonly personKind: PersonKind
	readonly email: string
	readonly phone: string
	readonly origin: string
	readonly createdAt: string
}

export interface CustomerFile {
	readonly customer: CustomerProfile
	readonly contracts: readonly ContractInfo[]
	readonly invoices: readonly Invoice[]
	readonly history: readonly HistoryEvent[]
}

export interface PageRequest {
	readonly page: number
	readonly size: number
}

export interface Paged<T> {
	readonly items: readonly T[]
	readonly total: number
}

export interface PanelQueries {
	overview(): Overview
	listCustomers(search: string, request: PageRequest): Paged<CustomerRow>
	getCustomerFile(customerId: string): CustomerFile | null
	listRuns(request: PageRequest): Paged<RunSummary>
}
