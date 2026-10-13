import type { HISTORY_EVENT } from '../constants/history.constants.ts'
import type { ValueOf } from './utility.types.ts'

export type HistoryEventKind = ValueOf<typeof HISTORY_EVENT>
