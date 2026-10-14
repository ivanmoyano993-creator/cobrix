import type { ProviderConfig } from '../../domain/interfaces/provider.interface.ts'
import type { Settings } from '../../domain/interfaces/settings.interface.ts'
import type { SettingsErrors } from '../types/settings.types.ts'

export interface SettingsInput {
	readonly companyName: string
	readonly companyRif: string
	readonly companyEmail: string
	readonly providerUrl: string
	readonly providerUsername: string
	readonly providerPassword: string
	readonly importableStatuses: readonly string[]
	readonly windowMonths: string
	readonly maxRecentPerContract: string
	readonly graceDays: string
	readonly maxNewInvoices: string
	readonly maxNewAmount: string
	readonly excludedDocumentTypes: readonly string[]
	readonly autoRunEnabled: boolean
	readonly autoRunTime: string
}

export interface ValidSettings {
	readonly ok: true
	readonly settings: Settings
}

export interface InvalidSettings {
	readonly ok: false
	readonly errors: SettingsErrors
}

export interface ValidProvider {
	readonly ok: true
	readonly provider: ProviderConfig
}

export interface ConnectionSuccess {
	readonly ok: true
	readonly contracts: number
}

export interface ConnectionFailure {
	readonly ok: false
	readonly error: string
}
