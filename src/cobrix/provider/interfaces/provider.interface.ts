import type { DebtLine } from '../../domain/interfaces/import.interface.ts'
import type { LedgerEntry } from '../../domain/interfaces/payment.interface.ts'

export interface ProviderConfig {
	readonly baseUrl: string
	readonly username: string
	readonly password: string
}

export interface ProviderDeps {
	readonly fetch?: typeof fetch
	readonly now?: () => number
}

export interface Session {
	readonly token: string
	readonly expiresAt: number
}

export interface DateRange {
	readonly from: string
	readonly to: string
}

export interface BillingProvider {
	listContractIds(): Promise<number[]>
	getContractDebt(contractId: number): Promise<DebtLine[]>
	getLedger(contractId: number, range: DateRange): Promise<LedgerEntry[]>
}
