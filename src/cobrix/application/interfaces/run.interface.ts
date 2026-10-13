import type { ContractInfo, Holder, InstallmentVerdict } from '../../domain/interfaces/import.interface.ts'
import type { Invoice } from '../../domain/interfaces/invoice.interface.ts'
import type { BillingProvider, ProviderConfig } from '../../domain/interfaces/provider.interface.ts'
import type {
	ContractRepository,
	CustomerRepository,
	HistoryRepository,
	InvoiceRepository,
	RunRepository,
	SettingsRepository,
	TransactionManager,
} from '../../domain/interfaces/repositories.interface.ts'
import type { RunItem } from '../../domain/interfaces/run.interface.ts'
import type { Settings } from '../../domain/interfaces/settings.interface.ts'
import type { ProviderError } from '../../domain/provider-error.ts'
import type { PaymentVerdict } from '../../domain/types/payment.types.ts'
import type { RunCounters, RunTrigger } from '../../domain/types/run.types.ts'
import type { CHECKED, FETCH_FAILED } from '../constants/run.constants.ts'

export interface Clock {
	now(): string
	currentPeriod(): string
}

export interface RunRequest {
	readonly dryRun: boolean
	readonly trigger: RunTrigger
}

export interface RunDeps {
	readonly settings: SettingsRepository
	readonly runs: RunRepository
	readonly providerFor: (config: ProviderConfig) => BillingProvider
	readonly clock: Clock
}

export interface ImportRunDeps extends RunDeps {
	readonly customers: CustomerRepository
	readonly contracts: ContractRepository
	readonly invoices: InvoiceRepository
	readonly history: HistoryRepository
	readonly transactions: TransactionManager
}

export interface UpdatePaidRunDeps extends RunDeps {
	readonly invoices: InvoiceRepository
	readonly history: HistoryRepository
	readonly transactions: TransactionManager
}

export interface RunContext {
	readonly runId: number
	readonly settings: Settings
	readonly provider: BillingProvider
	readonly request: RunRequest
}

export interface RunOutcome {
	readonly items: readonly RunItem[]
	readonly counters: RunCounters
	readonly summary: string
}

export interface ContractFetchFailure {
	readonly kind: typeof FETCH_FAILED
	readonly contractId: number
	readonly error: ProviderError
}

export interface ImportCandidate {
	readonly holder: Holder
	readonly contract: ContractInfo
	readonly installment: InstallmentVerdict
}

export interface CheckedInvoice {
	readonly kind: typeof CHECKED
	readonly invoice: Invoice
	readonly verdict: PaymentVerdict
}

export interface UncheckedInvoice {
	readonly kind: typeof FETCH_FAILED
	readonly invoice: Invoice
	readonly error: ProviderError
}
