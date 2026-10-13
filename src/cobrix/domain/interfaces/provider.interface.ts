import type { DebtLine } from './import.interface.ts'
import type { LedgerEntry } from './payment.interface.ts'

export interface ProviderConfig {
	readonly baseUrl: string
	readonly username: string
	readonly password: string
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
