export const API_PATH = {
	Login: '/usuario/login',
	ContractIds: '/isp/lista_ids_contratos',
	ContractDebt: '/isp/contrato/individual',
	Ledger: '/isp/pago_informacion',
} as const

export const HTTP_UNAUTHORIZED = 401

export const LEDGER_SEARCH_TYPE = 'CUOTA'

export const TOKEN_RENEWAL_MARGIN_MS = 60_000

export const REQUEST_TIMEOUT_MS = 15_000

export const PLAN_PRICE_PATTERN = /^\d+(\.\d+)?$/

export const NAIVE_UTC_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/

export const TRAILING_SLASHES = /\/+$/
