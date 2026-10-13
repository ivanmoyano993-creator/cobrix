import type { DOCUMENT_TYPE, PERSON_KIND } from '../constants/document.constants.ts'
import type { ValueOf } from './utility.types.ts'

export type DocumentType = ValueOf<typeof DOCUMENT_TYPE>

export type PersonKind = ValueOf<typeof PERSON_KIND>
