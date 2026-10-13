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
