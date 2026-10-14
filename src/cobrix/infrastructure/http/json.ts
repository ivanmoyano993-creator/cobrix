import { PROVIDER_ERROR_KIND } from '../../domain/constants/provider.constants.ts'
import { ProviderError } from '../../domain/provider-error.ts'
import type { JsonObject, JsonValue } from '../types/json.types.ts'

export function isJsonObject(value: JsonValue | undefined): value is JsonObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function malformed(path: string, expected: string): ProviderError {
	return new ProviderError(PROVIDER_ERROR_KIND.Malformed, `Respuesta inesperada de la API: «${path}» debía ser ${expected}.`)
}

export function asObject(value: JsonValue | undefined, path: string): JsonObject {
	if (!isJsonObject(value)) throw malformed(path, 'un objeto')
	return value
}

export function asArray(value: JsonValue | undefined, path: string): JsonValue[] {
	if (!Array.isArray(value)) throw malformed(path, 'una lista')
	return value
}

export function readString(source: JsonObject, key: string, path: string): string {
	const value = source[key]
	if (typeof value !== 'string') throw malformed(path, 'un texto')
	return value
}

export function readNumber(source: JsonObject, key: string, path: string): number {
	const value = source[key]
	if (typeof value !== 'number' || !Number.isFinite(value)) throw malformed(path, 'un número')
	return value
}

export function readOptionalNumber(source: JsonObject, key: string, path: string): number | null {
	if (!Object.hasOwn(source, key) || source[key] === null) return null
	return readNumber(source, key, path)
}

export function readInteger(source: JsonObject, key: string, path: string): number {
	const value = readNumber(source, key, path)
	if (!Number.isInteger(value)) throw malformed(path, 'un entero')
	return value
}

export function readObject(source: JsonObject, key: string, path: string): JsonObject {
	return asObject(source[key], path)
}

export function readStringList(source: JsonObject, key: string, path: string): string[] {
	return asArray(source[key], path).map((item, index) => {
		if (typeof item !== 'string') throw malformed(`${path}[${index}]`, 'un texto')
		return item
	})
}

export function parseJson(text: string): JsonValue | null {
	try {
		const value: JsonValue = JSON.parse(text)
		return value
	} catch {
		return null
	}
}
