import { CONTRACT_STATUS } from '../../cobrix/domain/constants/import.constants.ts'
import type { ContractStatus } from '../../cobrix/domain/types/import.types.ts'
import type { Tone } from '../types/web.types.ts'

export const TONE = {
	Ok: 'ok',
	Warn: 'warn',
	Bad: 'bad',
	Info: 'info',
	Mute: 'mute',
} as const

export const TONES = Object.values(TONE)

export const NAV: ReadonlyArray<readonly [string, string]> = [
	['/', 'Resumen'],
	['/clientes', 'Clientes'],
	['/sincronizacion', 'Sincronización'],
	['/configuracion', 'Configuración'],
]

export const CONTRACT_STATUS_TONE: Readonly<Record<ContractStatus, Tone>> = {
	[CONTRACT_STATUS.Active]: TONE.Ok,
	[CONTRACT_STATUS.Cut]: TONE.Bad,
	[CONTRACT_STATUS.Courtesy]: TONE.Info,
	[CONTRACT_STATUS.Withdrawn]: TONE.Mute,
	[CONTRACT_STATUS.Rejected]: TONE.Mute,
	[CONTRACT_STATUS.Annulled]: TONE.Mute,
}

export const SHORT_MONTHS: readonly string[] = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export const DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-VE', { timeZone: 'America/Caracas', dateStyle: 'medium', timeStyle: 'short' })

export const EMPTY_VALUE = '—'

export const MS_PER_DAY = 86_400_000

export const DOCUMENT_TYPE_PATTERN = /^[VEJGP]\d/

export const HTML_SPECIAL_CHARACTERS = /[&<>"']/g

export const HTML_ESCAPES: Readonly<Record<string, string>> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
}

export const APP_NAME = 'Cobrix'

export const APP_TAGLINE = 'Integración con el administrador de facturas'

export const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%233b4cca'/%3E%3Ctext x='16' y='22' text-anchor='middle' font-family='system-ui,sans-serif' font-size='18' font-weight='700' fill='white'%3EC%3C/text%3E%3C/svg%3E"
