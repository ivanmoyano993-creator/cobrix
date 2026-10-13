import type { ProviderErrorKind } from './types/provider.types.ts'

export class ProviderError extends Error {
	readonly kind: ProviderErrorKind
	readonly status: number | null

	constructor(kind: ProviderErrorKind, message: string, status: number | null = null) {
		super(message)
		this.name = 'ProviderError'
		this.kind = kind
		this.status = status
	}
}
