import type { ValueOf } from '../../domain/types/utility.types.ts'
import type { PROVIDER_ERROR_KIND } from '../constants/provider.constants.ts'

export type ProviderErrorKind = ValueOf<typeof PROVIDER_ERROR_KIND>

export type QueryParams = Readonly<Record<string, string>>
