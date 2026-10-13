import {
	DOCUMENT_PATTERN,
	DOCUMENT_SEPARATORS,
	DOCUMENT_TYPE_VALUES,
	LEADING_ZEROS,
	LEGAL_DOCUMENT_TYPES,
	MAX_DOCUMENT_DIGITS,
	MIN_DOCUMENT_DIGITS,
	PERSON_KIND,
} from './constants/document.constants.ts'
import type { HolderDocument } from './interfaces/document.interface.ts'
import type { DocumentType } from './types/document.types.ts'

export function normalizeDocument(raw: string): HolderDocument | null {
	const match = DOCUMENT_PATTERN.exec(raw.trim().toUpperCase().replaceAll(DOCUMENT_SEPARATORS, ''))
	if (!match) return null
	const digits = (match[2] ?? '').replace(LEADING_ZEROS, '')
	if (digits.length < MIN_DOCUMENT_DIGITS || digits.length > MAX_DOCUMENT_DIGITS) return null
	const letter = match[1]
	const type = letter !== undefined && isDocumentType(letter) ? letter : null
	return {
		id: `${type ?? ''}${digits}`,
		type,
		personKind: type !== null && LEGAL_DOCUMENT_TYPES.includes(type) ? PERSON_KIND.Legal : PERSON_KIND.Natural,
	}
}

export function isDocumentType(value: string): value is DocumentType {
	return DOCUMENT_TYPE_VALUES.has(value)
}
