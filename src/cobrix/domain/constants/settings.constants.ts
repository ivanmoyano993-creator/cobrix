import type { Settings } from '../interfaces/settings.interface.ts'
import { DEFAULT_IMPORT_RULES } from './import.constants.ts'

export const DEFAULT_SETTINGS: Settings = {
	company: { name: '', rif: '', collectionEmail: '' },
	provider: { baseUrl: '', username: '', password: '' },
	importRules: DEFAULT_IMPORT_RULES,
	caps: { maxNewInvoices: null, maxNewAmountCents: null },
	autoRun: { enabled: false, time: '06:00' },
}

export const CUSTOMER_ORIGIN = 'Administrador de facturas'

export const WINDOW_MONTH_OPTIONS: readonly number[] = [3, 6, 9, 12]

export const MAX_RECENT_RANGE = { min: 1, max: 60 } as const

export const GRACE_DAYS_RANGE = { min: 0, max: 60 } as const

export const MIN_NEW_INVOICES = 1
