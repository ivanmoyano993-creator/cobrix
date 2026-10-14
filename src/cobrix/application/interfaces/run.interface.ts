import type { ContractInfo, Holder, InstallmentVerdict } from '../../domain/interfaces/import.interface.ts'
import type { Invoice } from '../../domain/interfaces/invoice.interface.ts'
import type { BillingProvider, ProviderConfig } from '../../domain/interfaces/provider.interface.ts'
import type {
	ContractRepository,
	CustomerRepository,
	HistoryRepository,
	InvoiceRepository,
	RunRepository,
	ScheduleRepository,
	SettingsRepository,
	TransactionManager,
} from '../../domain/interfaces/repositories.interface.ts'
import type { RunItem } from '../../domain/interfaces/run.interface.ts'
import type { AutoRunSettings, Settings } from '../../domain/interfaces/settings.interface.ts'
import type { ProviderError } from '../../domain/provider-error.ts'
import type { PaymentVerdict } from '../../domain/types/payment.types.ts'
import type { RunCounters, RunTrigger } from '../../domain/types/run.types.ts'
import type { CHECKED, FETCH_FAILED } from '../constants/run.constants.ts'
import type { StepReporter } from '../types/progress.types.ts'
import type { RunObserver } from './progress.interface.ts'

export interface Clock {
	now(): string
	currentPeriod(): string
	today(): string
	localTime(): string
}

export interface RunGuard {
	exclusive<T>(work: () => Promise<T>): Promise<T>
	isBusy(): boolean
}

export interface IsDueInput {
	readonly autoRun: AutoRunSettings
	readonly today: string
	readonly localTime: string
	readonly lastRunDate: string | null
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
	readonly observer?: RunObserver
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

export interface ScheduledRunDeps extends ImportRunDeps {
	readonly schedule: ScheduleRepository
	readonly guard: RunGuard
}

export interface RunContext {
	readonly runId: number
	readonly settings: Settings
	readonly provider: BillingProvider
	readonly request: RunRequest
	readonly step: StepReporter
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
