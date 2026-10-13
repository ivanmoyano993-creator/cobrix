import type { SQLOutputValue } from 'node:sqlite'

export type SqlRow = Record<string, SQLOutputValue>
