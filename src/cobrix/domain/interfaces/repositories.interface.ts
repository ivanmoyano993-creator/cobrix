import type { TransactionMode } from '../types/run.types.ts'
import type { HistoryEvent, NewHistoryEvent } from './history.interface.ts'
import type { ContractInfo, Holder } from './import.interface.ts'
import type { Invoice, NewInvoice } from './invoice.interface.ts'
import type { PayingInvoice } from './payment.interface.ts'
import type { PanelQueries } from './queries.interface.ts'
import type { NewRun, Run, RunItem, RunResult } from './run.interface.ts'
import type { Settings } from './settings.interface.ts'

export interface SettingsRepository {
	get(): Settings
	save(settings: Settings): void
}

export interface CustomerRepository {
	upsert(holder: Holder, at: string): boolean
}

export interface ContractRepository {
	upsert(contract: ContractInfo, customerId: string, at: string): void
}

export interface InvoiceRepository {
	findByExternalId(externalId: string): Invoice | null
	insert(invoice: NewInvoice): Invoice
	listOpen(): Invoice[]
	markPaid(invoiceId: number, paidBy: PayingInvoice): void
}

export interface RunRepository {
	start(run: NewRun): number
	addItems(runId: number, items: readonly RunItem[]): void
	finish(runId: number, result: RunResult): void
	get(runId: number): Run | null
}

export interface HistoryRepository {
	add(event: NewHistoryEvent): void
	listByCustomer(customerId: string): HistoryEvent[]
}

export interface ScheduleRepository {
	lastRunDate(): string | null
	markRun(date: string): void
}

export interface TransactionManager {
	run<T>(mode: TransactionMode, work: () => T): T
}

export interface Persistence {
	readonly settings: SettingsRepository
	readonly customers: CustomerRepository
	readonly contracts: ContractRepository
	readonly invoices: InvoiceRepository
	readonly runs: RunRepository
	readonly history: HistoryRepository
	readonly schedule: ScheduleRepository
	readonly queries: PanelQueries
	readonly transactions: TransactionManager
	close(): void
}
