import type { ImportRules, RunCaps } from './import.interface.ts'
import type { ProviderConfig } from './provider.interface.ts'

export interface CompanySettings {
	readonly name: string
	readonly rif: string
	readonly collectionEmail: string
}

export interface AutoRunSettings {
	readonly enabled: boolean
	readonly time: string
}

export interface Settings {
	readonly company: CompanySettings
	readonly provider: ProviderConfig
	readonly importRules: ImportRules
	readonly caps: RunCaps
	readonly autoRun: AutoRunSettings
}
