import type { DebtLine, ImportRules } from '../interfaces/import.interface.ts'

export const CONTRACT_STATUS = {
	Active: 'ACTIVO',
	Cut: 'CORTADO',
	Courtesy: 'CORTESIA',
	Withdrawn: 'RETIRADO',
	Rejected: 'RECHAZADO',
	Annulled: 'ANULADO',
} as const

export const CONTRACT_KIND = {
	Accepted: 'accepted',
	NoDebt: 'no_debt',
	Rejected: 'rejected',
} as const

export const CONTRACT_REJECTION = {
	InconsistentResponse: 'inconsistent_response',
	UnknownStatus: 'unknown_status',
	ExcludedStatus: 'excluded_status',
	InvalidDocument: 'invalid_document',
	ExcludedDocumentType: 'excluded_document_type',
	CurrencyNotUsd: 'currency_not_usd',
	IncoherentCurrency: 'incoherent_currency',
} as const

export const INSTALLMENT_EXCLUSION = {
	ResidualBalance: 'residual_balance',
	FutureInstallment: 'future_installment',
	OutsideWindow: 'outside_window',
	BeyondRecentLimit: 'beyond_recent_limit',
} as const

export const INSTALLMENT_OUTCOME = {
	Importable: 'importable',
	...CONTRACT_REJECTION,
	...INSTALLMENT_EXCLUSION,
} as const

export const CONTRACT_STATUS_VALUES: ReadonlySet<string> = new Set<string>(Object.values(CONTRACT_STATUS))

export const DEFAULT_IMPORT_RULES: ImportRules = {
	importableStatuses: [CONTRACT_STATUS.Active, CONTRACT_STATUS.Cut],
	windowMonths: null,
	maxRecentPerContract: null,
	graceDays: 0,
	excludedDocumentTypes: [],
}

export const CONTRACT_FIELDS = [
	'contractCode',
	'holderDocument',
	'holderName',
	'status',
	'currency',
	'planName',
	'planPrice',
	'branchName',
] as const satisfies readonly (keyof DebtLine)[]

export const NO_DEBT_ID = '0'

export const MIN_INSTALLMENT_RATIO = 0.01
