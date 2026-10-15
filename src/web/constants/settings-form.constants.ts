import { DOCUMENT_TYPE } from '../../cobrix/domain/constants/document.constants.ts'
import type { DocumentType } from '../../cobrix/domain/types/document.types.ts'

export const CHECKBOX_ON = 'on'

export const DOCUMENT_TYPE_LABEL: Readonly<Record<DocumentType, string>> = {
	[DOCUMENT_TYPE.Venezuelan]: 'V · Venezolano',
	[DOCUMENT_TYPE.Foreign]: 'E · Extranjero',
	[DOCUMENT_TYPE.Company]: 'J · Jurídico',
	[DOCUMENT_TYPE.Government]: 'G · Gobierno',
	[DOCUMENT_TYPE.Passport]: 'P · Pasaporte',
}

export const SETTINGS_SAVED = 'Configuración guardada. Se aplica desde la próxima corrida.'

export const SETTINGS_INVALID = 'Revisa los campos marcados: no se guardó nada.'

export const PASSWORD_PLACEHOLDER = 'Guardada. Déjala vacía para conservarla'

export const PASSWORD_MISSING_PLACEHOLDER = 'Todavía no hay contraseña guardada'

export const STATUS_HINT = 'Por defecto ACTIVO y CORTADO. Un estado que no está acá deja el contrato fuera.'

export const WINDOW_HINT = 'Solo cuotas desde el mes actual menos N meses.'

export const RECENT_HINT = 'De 1 a 60. Vacío = todas. Se conservan las más recientes.'

export const GRACE_HINT = 'De 0 a 60. El corte es el vencimiento más estos días. Las facturas ya importadas conservan su corte.'

export const CAPS_HINT = 'Lo que exceda queda frenado y no se importa. Vacío = sin tope.'

export const AUTO_RUN_HINT = 'Importa y después actualiza pagadas, una vez por día, en hora de Caracas.'

export const UNSAVED_CHANGES = 'Tienes cambios sin guardar.'
