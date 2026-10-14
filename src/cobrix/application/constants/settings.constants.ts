import { GRACE_DAYS_RANGE, MAX_RECENT_RANGE } from '../../domain/constants/settings.constants.ts'

export const INTEGER_PATTERN = /^\d+$/

export const AMOUNT_PATTERN = /^\d+([.,]\d{1,2})?$/

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export const EMAIL_SEPARATOR = '@'

export const DOMAIN_SEPARATOR = '.'

export const WHITESPACE = /\s/

export const ALLOWED_URL_PROTOCOLS: readonly string[] = ['http:', 'https:']

export const SETTINGS_ERROR = {
	ProviderUrlRequired: 'Escribe la URL de la API del administrador de facturas.',
	ProviderUrlInvalid: 'La URL de la API debe empezar con http:// o https://.',
	UsernameRequired: 'Escribe el usuario de la API.',
	PasswordRequired: 'Escribe la contraseña de la API: todavía no hay una guardada.',
	StatusesRequired: 'Elige al menos un estado de contrato para importar.',
	StatusUnknown: 'Hay un estado de contrato que no existe.',
	WindowInvalid: 'La ventana debe ser de 3, 6, 9 o 12 meses, o sin ventana.',
	MaxRecentInvalid: `El máximo de cuotas recientes debe estar entre ${MAX_RECENT_RANGE.min} y ${MAX_RECENT_RANGE.max}, o vacío para todas.`,
	GraceDaysInvalid: `Los días de gracia deben estar entre ${GRACE_DAYS_RANGE.min} y ${GRACE_DAYS_RANGE.max}.`,
	MaxInvoicesInvalid: 'El tope de facturas debe ser un número entero mayor que 0, o vacío para no limitar.',
	MaxAmountInvalid: 'El tope de monto debe ser un monto en USD mayor que 0 (por ejemplo 1500 o 1500,50), o vacío para no limitar.',
	DocumentTypeUnknown: 'Hay un tipo de documento que no existe.',
	EmailInvalid: 'El correo de cobranza no parece válido.',
	RifInvalid: 'El RIF no es válido: usa una letra (J, G, V, E o P) y de 6 a 12 dígitos.',
	TimeInvalid: 'La hora debe tener el formato HH:MM (por ejemplo 06:00).',
} as const
