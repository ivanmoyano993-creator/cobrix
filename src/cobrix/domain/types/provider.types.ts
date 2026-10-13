import type { PROVIDER_ERROR_KIND } from '../constants/provider.constants.ts'
import type { ValueOf } from './utility.types.ts'

export type ProviderErrorKind = ValueOf<typeof PROVIDER_ERROR_KIND>
