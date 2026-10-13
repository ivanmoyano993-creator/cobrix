import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname } from 'node:path'

import {
	AUTH_TAG_BYTES,
	CIPHER_ALGORITHM,
	IV_BYTES,
	KEY_ENCODING,
	KEY_FILE_MODE,
	SEALED_ENCODING,
	SEALED_PARTS,
	SEALED_SEPARATOR,
	SEALED_VERSION,
	SECRET_KEY_BYTES,
	SECRET_KEY_ENV,
} from '../constants/crypto.constants.ts'
import type { LoadSecretKeyInput, SecretBox } from '../interfaces/persistence.interface.ts'

export function createSecretBox(key: Buffer): SecretBox {
	if (key.length !== SECRET_KEY_BYTES) throw new Error(`La clave de cifrado debe tener ${SECRET_KEY_BYTES} bytes.`)
	return {
		encrypt: plain => encrypt(key, plain),
		decrypt: sealed => decrypt(key, sealed),
	}
}

export function loadSecretKey(input: LoadSecretKeyInput): Buffer {
	if (input.envValue !== undefined && input.envValue !== '') {
		return decodeKey(input.envValue, `La variable ${SECRET_KEY_ENV} debe ser una clave de ${SECRET_KEY_BYTES} bytes en base64.`)
	}
	if (existsSync(input.keyPath)) {
		return decodeKey(readFileSync(input.keyPath, 'utf8').trim(), `El archivo ${basename(input.keyPath)} no contiene una clave válida de ${SECRET_KEY_BYTES} bytes.`)
	}
	const key = randomBytes(SECRET_KEY_BYTES)
	mkdirSync(dirname(input.keyPath), { recursive: true })
	writeFileSync(input.keyPath, key.toString(KEY_ENCODING), { mode: KEY_FILE_MODE, flag: 'wx' })
	return key
}

function encrypt(key: Buffer, plain: string): string {
	const iv = randomBytes(IV_BYTES)
	const cipher = createCipheriv(CIPHER_ALGORITHM, key, iv, { authTagLength: AUTH_TAG_BYTES })
	const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
	return [
		SEALED_VERSION,
		iv.toString(SEALED_ENCODING),
		cipher.getAuthTag().toString(SEALED_ENCODING),
		encrypted.toString(SEALED_ENCODING),
	].join(SEALED_SEPARATOR)
}

function decrypt(key: Buffer, sealed: string): string {
	const parts = sealed.split(SEALED_SEPARATOR)
	const [version, iv, tag, data] = parts
	if (parts.length !== SEALED_PARTS || version !== SEALED_VERSION || iv === undefined || tag === undefined || data === undefined) {
		throw new Error('El secreto guardado tiene un formato desconocido.')
	}
	const decipher = createDecipheriv(CIPHER_ALGORITHM, key, Buffer.from(iv, SEALED_ENCODING), { authTagLength: AUTH_TAG_BYTES })
	decipher.setAuthTag(Buffer.from(tag, SEALED_ENCODING))
	return Buffer.concat([decipher.update(Buffer.from(data, SEALED_ENCODING)), decipher.final()]).toString('utf8')
}

function decodeKey(encoded: string, message: string): Buffer {
	const key = Buffer.from(encoded, KEY_ENCODING)
	if (key.length !== SECRET_KEY_BYTES) throw new Error(message)
	return key
}
