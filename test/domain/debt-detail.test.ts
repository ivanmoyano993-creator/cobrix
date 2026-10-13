import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { cutoffDate, parseDebtDetail } from '../../src/cobrix/domain/debt-detail.ts'
import { toCents } from '../../src/cobrix/domain/money.ts'

describe('parseDebtDetail', () => {
	it('saca periodo y vencimiento del detalle', () => {
		assert.deepEqual(parseDebtDetail(['PLAN15MB25 - 2026 Agosto']), { period: '2026-08', dueDate: '2026-08-01' })
		assert.deepEqual(parseDebtDetail(['EMPRESA50MB - 2025 diciembre']), { period: '2025-12', dueDate: '2025-12-01' })
	})

	it('no adivina: exige exactamente un detalle con mes conocido', () => {
		const invalid: readonly (readonly string[])[] = [[], ['PLAN - 2026 Agosto', 'PLAN - 2026 Septiembre'], ['PLAN - 2026 Agost'], ['PLAN 2026 Agosto'], ['PLAN - 26 Agosto'], ['']]
		for (const value of invalid) {
			assert.equal(parseDebtDetail(value), null, JSON.stringify(value))
		}
	})
})

describe('cutoffDate', () => {
	it('suma los días de gracia al vencimiento', () => {
		assert.equal(cutoffDate('2026-08-01', 0), '2026-08-01')
		assert.equal(cutoffDate('2026-08-01', 5), '2026-08-06')
		assert.equal(cutoffDate('2026-12-01', 60), '2027-01-30')
	})
})

describe('toCents', () => {
	it('convierte a centavos enteros sin errores de coma flotante', () => {
		assert.equal(toCents(20), 2000)
		assert.equal(toCents(0.1 + 0.2), 30)
		assert.equal(toCents(0.001317), 0)
		assert.equal(toCents(1235), 123500)
	})

	it('rechaza lo que no es un número finito', () => {
		for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
			assert.equal(toCents(value), null, String(value))
		}
	})
})
