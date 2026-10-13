import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PROVIDER_ERROR_KIND } from '../../../src/cobrix/domain/constants/provider.constants.ts'
import { ProviderError } from '../../../src/cobrix/domain/provider-error.ts'
import { parseApiErrorMessage, parseContractIds, parseDebtLines, parseLedger, parseSession } from '../../../src/cobrix/infrastructure/http/parsers.ts'
import type { JsonObject, JsonValue } from '../../../src/cobrix/infrastructure/http/types/json.types.ts'

function debtRow(overrides: JsonObject = {}): JsonObject {
	return {
		contrato_id: 900101,
		codigo: '0900101',
		identificacion_contrato: 'V-12345678',
		nombre_contrato: 'ANA PEREZ',
		telefono: '04121000000',
		email: 'ANA.PEREZ@EXAMPLE.COM',
		estado: 'ACTIVO',
		deuda: 20,
		deuda_id: '7000008',
		detalle_deuda: ['PLAN15MB25 - 2026 Agosto'],
		nombre_plan: 'PLAN15MB25',
		precio_servicio: '25.000000',
		nombre_sucursal: 'VALENCIA',
		moneda_sigla: 'USD',
		tipo_factura: 'FACTURA DIGITAL',
		...overrides,
	}
}

function ledgerRow(overrides: JsonObject = {}): JsonObject {
	return {
		id_factura: 8800007,
		num_factura: '008800007',
		fecha_emision: '2026-08-06',
		id_contrato: 900101,
		detalle_pago: { id_contrato: 900101, id_cuota: 7000008, periodo_cuota: '2026-08', tarifa: 25, valor_pago: 5, descuento: 0, saldo_cuota: 20 },
		...overrides,
	}
}

function assertMalformed(action: () => void, field: RegExp): void {
	assert.throws(action, (error: Error) => {
		assert.ok(error instanceof ProviderError)
		assert.equal(error.kind, PROVIDER_ERROR_KIND.Malformed)
		assert.match(error.message, field)
		return true
	})
}

describe('parseSession', () => {
	it('lee el token y toma el vencimiento sin zona como UTC', () => {
		const session = parseSession({ usuario: 'cobrix', access_token: 'abc', access_token_expires_in: '2026-10-13T10:00:00' })
		assert.deepEqual(session, { token: 'abc', expiresAt: Date.parse('2026-10-13T10:00:00Z') })
	})

	it('rechaza un login sin token o con vencimiento ilegible', () => {
		assertMalformed(() => parseSession({ access_token_expires_in: '2026-10-13T10:00:00' }), /access_token/)
		assertMalformed(() => parseSession({ access_token: 'abc', access_token_expires_in: 'mañana' }), /access_token_expires_in/)
	})
})

describe('parseContractIds', () => {
	it('lee los IDs del envoltorio aunque success venga en false', () => {
		assert.deepEqual(parseContractIds({ success: false, data: [900101, 900102] }), [900101, 900102])
	})

	it('rechaza IDs que no son enteros o vienen repetidos', () => {
		assertMalformed(() => parseContractIds({ data: [900101, '900102'] }), /data\[1\]/)
		assertMalformed(() => parseContractIds({ data: [900101, 1.5] }), /data\[1\]/)
		assertMalformed(() => parseContractIds({ data: [900101, 900101] }), /repetido/)
		assertMalformed(() => parseContractIds([900101]), /data/)
	})
})

describe('parseDebtLines', () => {
	it('traduce las filas al modelo del dominio', () => {
		assert.deepEqual(parseDebtLines([debtRow()]), [{
			contractId: 900101,
			contractCode: '0900101',
			holderDocument: 'V-12345678',
			holderName: 'ANA PEREZ',
			phone: '04121000000',
			email: 'ANA.PEREZ@EXAMPLE.COM',
			status: 'ACTIVO',
			debt: 20,
			debtId: '7000008',
			debtDetail: ['PLAN15MB25 - 2026 Agosto'],
			planName: 'PLAN15MB25',
			planPrice: 25,
			branchName: 'VALENCIA',
			currency: 'USD',
		}])
	})

	it('acepta la lista vacía', () => {
		assert.deepEqual(parseDebtLines([]), [])
	})

	it('nunca adivina tipos: un campo con otro tipo es una respuesta inválida', () => {
		assertMalformed(() => parseDebtLines({ data: [] }), /lista/)
		assertMalformed(() => parseDebtLines([debtRow({ deuda: '20' })]), /\[0\]\.deuda/)
		assertMalformed(() => parseDebtLines([debtRow({ deuda_id: 7000008 })]), /\[0\]\.deuda_id/)
		assertMalformed(() => parseDebtLines([debtRow({ detalle_deuda: 'PLAN15MB25 - 2026 Agosto' })]), /\[0\]\.detalle_deuda/)
		assertMalformed(() => parseDebtLines([debtRow({ detalle_deuda: ['ok', 3] })]), /\[0\]\.detalle_deuda\[1\]/)
		assertMalformed(() => parseDebtLines([debtRow({ precio_servicio: 'veinticinco' })]), /\[0\]\.precio_servicio/)
		assertMalformed(() => parseDebtLines([debtRow(), 'fila']), /\[1\]/)
		const missing = debtRow()
		delete missing.estado
		assertMalformed(() => parseDebtLines([missing]), /\[0\]\.estado/)
	})
})

describe('parseLedger', () => {
	it('traduce el libro de cuotas e ignora success: false', () => {
		assert.deepEqual(parseLedger({ success: false, data: [ledgerRow()] }), [{
			invoiceId: 8800007,
			invoiceNumber: '008800007',
			issuedOn: '2026-08-06',
			contractId: 900101,
			payment: { contractId: 900101, installmentId: 7000008, period: '2026-08', fee: 25, paid: 5, discount: 0, balance: 20 },
		}])
	})

	it('rechaza filas con detalle_pago incompleto', () => {
		assertMalformed(() => parseLedger({ data: [ledgerRow({ detalle_pago: { id_cuota: 7000008 } })] }), /data\[0\]\.detalle_pago\.id_contrato/)
		assertMalformed(() => parseLedger({ data: [ledgerRow({ id_factura: '8800007' })] }), /data\[0\]\.id_factura/)
		assertMalformed(() => parseLedger({ data: null }), /data/)
	})
})

describe('parseApiErrorMessage', () => {
	it('saca el mensaje de los formatos de error de la API', () => {
		const cases: Array<[JsonValue, string | null]> = [
			[{ detail: { type: 'password', mensaje: 'Contraseña Incorrecta' } }, 'Contraseña Incorrecta'],
			[[{ source: 'query', field: 'id_contrato', message: 'value is not a valid integer' }], 'id_contrato: value is not a valid integer'],
			[{ title: 'Internal Server Error', detail: 'Se produjo un error interno' }, 'Se produjo un error interno'],
			['texto', null],
		]
		for (const [body, expected] of cases) assert.equal(parseApiErrorMessage(body), expected)
	})
})
