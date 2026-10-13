import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { normalizeDocument } from '../../src/cobrix/domain/document.ts'

describe('normalizeDocument', () => {
	it('quita separadores y conserva la letra de tipo', () => {
		assert.deepEqual(normalizeDocument('V-12345678'), { id: 'V12345678', type: 'V', personKind: 'natural' })
		assert.deepEqual(normalizeDocument('J-40123456-7'), { id: 'J401234567', type: 'J', personKind: 'legal' })
		assert.deepEqual(normalizeDocument(' e.81.234.567 '), { id: 'E81234567', type: 'E', personKind: 'natural' })
	})

	it('quita los ceros a la izquierda y acepta la letra opcional', () => {
		assert.deepEqual(normalizeDocument('09000123'), { id: '9000123', type: null, personKind: 'natural' })
		assert.deepEqual(normalizeDocument('V-0012345678'), { id: 'V12345678', type: 'V', personKind: 'natural' })
	})

	it('J y G son jurídicas; V, E y P naturales', () => {
		assert.equal(normalizeDocument('G-20000001')?.personKind, 'legal')
		assert.equal(normalizeDocument('P-123456')?.personKind, 'natural')
	})

	it('rechaza lo que no es una identificación válida', () => {
		for (const value of ['', '   ', 'V-12345', '0000012345', 'X-12345678', 'V-1234567890123', '12A45678', 'VV12345678', 'V-12345678-J']) {
			assert.equal(normalizeDocument(value), null, value)
		}
	})
})
