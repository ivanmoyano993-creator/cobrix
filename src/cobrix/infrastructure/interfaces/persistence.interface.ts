export interface SecretBox {
	encrypt(plain: string): string
	decrypt(sealed: string): string
}

export interface LoadSecretKeyInput {
	readonly envValue: string | undefined
	readonly keyPath: string
}

export interface SqlitePersistenceOptions {
	readonly path: string
	readonly secretKey: Buffer
}
