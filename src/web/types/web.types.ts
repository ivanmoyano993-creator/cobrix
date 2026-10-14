import type { ValueOf } from '../../cobrix/domain/types/utility.types.ts'
import type { TONE } from '../constants/ui.constants.ts'
import type { Raw } from '../html.ts'

export type Tone = ValueOf<typeof TONE>

export type HtmlValue = Raw | string | number | boolean | null | undefined | readonly HtmlValue[]
