import type { DocumentType } from '../types/document.types.ts'

export const DOCUMENT_TYPE = {
	Venezuelan: 'V',
	Foreign: 'E',
	Company: 'J',
	Government: 'G',
	Passport: 'P',
} as const

export const PERSON_KIND = {
	Natural: 'natural',
	Legal: 'legal',
} as const

export const DOCUMENT_TYPES = Object.values(DOCUMENT_TYPE)

export const DOCUMENT_TYPE_VALUES: ReadonlySet<string> = new Set<string>(DOCUMENT_TYPES)

export const LEGAL_DOCUMENT_TYPES: readonly DocumentType[] = [DOCUMENT_TYPE.Company, DOCUMENT_TYPE.Government]

export const DOCUMENT_PATTERN = /^([VEJGP])?(\d+)$/

export const DOCUMENT_SEPARATORS = /[\s.-]/g

export const LEADING_ZEROS = /^0+/

export const MIN_DOCUMENT_DIGITS = 6

export const MAX_DOCUMENT_DIGITS = 12
