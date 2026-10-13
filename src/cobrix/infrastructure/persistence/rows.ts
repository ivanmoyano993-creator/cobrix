import { isOneOf } from '../../domain/guards.ts'
import { LIST_SEPARATOR, SQL_TRUE } from '../constants/sqlite.constants.ts'
import type { SqlRow } from '../types/sqlite.types.ts'

export function text(row: SqlRow, column: string): string {
	const value = row[column]
	if (typeof value !== 'string') throw invalidColumn(column)
	return value
}

export function nullableText(row: SqlRow, column: string): string | null {
	return row[column] === null ? null : text(row, column)
}

export function integer(row: SqlRow, column: string): number {
	const value = row[column]
	if (typeof value !== 'number' || !Number.isInteger(value)) throw invalidColumn(column)
	return value
}

export function nullableInteger(row: SqlRow, column: string): number | null {
	return row[column] === null ? null : integer(row, column)
}

export function flag(row: SqlRow, column: string): boolean {
	return integer(row, column) === SQL_TRUE
}

export function oneOf<T extends string>(row: SqlRow, column: string, values: readonly T[]): T {
	const value = text(row, column)
	if (!isOneOf(values, value)) throw invalidColumn(column)
	return value
}

export function listOf<T extends string>(row: SqlRow, column: string, values: readonly T[]): T[] {
	return text(row, column)
		.split(LIST_SEPARATOR)
		.filter(item => item !== '')
		.map(item => {
			if (!isOneOf(values, item)) throw invalidColumn(column)
			return item
		})
}

function invalidColumn(column: string): Error {
	return new Error(`La base de Cobrix tiene un valor inválido en la columna «${column}».`)
}
