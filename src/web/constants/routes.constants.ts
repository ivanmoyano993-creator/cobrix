export const ROUTE = {
	Home: '/',
	Customers: '/clientes',
	Sync: '/sincronizacion',
	Settings: '/configuracion',
	Assignment: '/enunciado',
	Stylesheet: '/app.css',
	Import: '/sincronizacion/importar',
	UpdatePaid: '/sincronizacion/actualizar-pagadas',
	Runs: '/sincronizacion/corridas',
} as const

export const RUN_DETAIL_PATTERN = /^\/sincronizacion\/corridas\/(\d+)$/

export const CUSTOMER_FILE_PATTERN = /^\/clientes\/([^/]+)$/

export const SEARCH_PARAM = 'q'

export const URL_PARSE_BASE = 'http://panel.local'

export const DRY_RUN_FIELD = 'simular'

export const DRY_RUN_VALUE = '1'

export const OUTCOME_FILTER_PARAM = 'resultado'

export const FLASH_TEXT_PARAM = 'msg'

export const FLASH_TONE_PARAM = 'tone'

export const SUMMARY_RUNS_LIMIT = 5

export const HISTORY_RUNS_LIMIT = 50

export const MAX_FORM_BYTES = 64 * 1024

export const HTTP_STATUS = {
	Ok: 200,
	SeeOther: 303,
	NotFound: 404,
	PayloadTooLarge: 413,
	ServerError: 500,
} as const
