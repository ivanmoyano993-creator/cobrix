export interface ProviderDeps {
	readonly fetch?: typeof fetch
	readonly now?: () => number
}

export interface Session {
	readonly token: string
	readonly expiresAt: number
}
