import type {
	ConnectionFailure,
	ConnectionSuccess,
	InvalidSettings,
	SettingsInput,
	ValidProvider,
	ValidSettings,
} from '../interfaces/settings.interface.ts'

export type SettingsField = keyof SettingsInput

export type SettingsErrors = Partial<Record<SettingsField, string>>

export type SettingsValidation = ValidSettings | InvalidSettings

export type ProviderValidation = ValidProvider | InvalidSettings

export type ConnectionResult = ConnectionSuccess | ConnectionFailure

export type ConnectionCheck = ConnectionResult | InvalidSettings
