import type { DocumentType, PersonKind } from '../types/document.types.ts'

export interface HolderDocument {
	readonly id: string
	readonly type: DocumentType | null
	readonly personKind: PersonKind
}
