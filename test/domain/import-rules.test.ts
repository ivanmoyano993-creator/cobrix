import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { DEFAULT_IMPORT_RULES } from '../../src/cobrix/domain/constants/import.constants.ts'
import { applyRunCaps, classifyContract } from '../../src/cobrix/domain/import-rules.ts'
import type { DebtLine, ImportRules } from '../../src/cobrix/domain/interfaces/import.interface.ts'

const CURRENT = '2026-10'
const MONTHS: Record<string, string> = { '06': 'Junio', '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre' }

function line(period: string, debt: number, debtId: string, overrides: Partial<DebtLine> = {}): DebtLine {
	return {
		contractId: 900101,
		contractCode: '0900101',
		holderDocument: 'V-12345678',
		holderName: 'ANA PEREZ',
		phone: '04121000000',
		email: 'ANA.PEREZ@EXAMPLE.COM',
		status: 'ACTIVO',
		debt,
		debtId,
		debtDetail: [`PLAN15MB25 - ${period.slice(0, 4)} ${MONTHS[period.slice(5)]}`],
		planName: 'PLAN15MB25',
		planPrice: 25,
		branchName: 'VALENCIA',
		currency: 'USD',
		...overrides,
	}
}

function noDebtLine(overrides: Partial<DebtLine> = {}): DebtLine {
	return line('2026-10', 0, '0', { debtDetail: [], ...overrides })
}

function classify(lines: DebtLine[], rules: Partial<ImportRules> = {}) {
	return classifyContract({ contractId: 900101, lines, rules: { ...DEFAULT_IMPORT_RULES, ...rules }, currentPeriod: CURRENT })
}

function outcomes(result: ReturnType<typeof classify>) {
	return result.kind === 'no_debt' ? [] : result.installments.map(item => [item.debtId, item.outcome])
}

describe('classifyContract', () => {
	it('acepta un contrato activo en USD y ordena sus cuotas aunque lleguen desordenadas', () => {
		const result = classify([line('2026-09', 25, '7000009'), line('2026-08', 20, '7000008'), line('2026-10', 25, '7000010')], { graceDays: 5 })
		assert.equal(result.kind, 'accepted')
		if (result.kind !== 'accepted') return
		assert.deepEqual(result.holder, { documentId: 'V12345678', documentType: 'V', personKind: 'natural', name: 'ANA PEREZ', email: 'ANA.PEREZ@EXAMPLE.COM', phone: '04121000000' })
		assert.deepEqual(result.contract, { id: 900101, code: '0900101', status: 'ACTIVO', plan: 'PLAN15MB25', priceCents: 2500, branch: 'VALENCIA' })
		assert.deepEqual(result.installments[0], { debtId: '7000008', period: '2026-08', dueDate: '2026-08-01', cutoffDate: '2026-08-06', amountCents: 2000, outcome: 'importable' })
		assert.deepEqual(outcomes(result), [['7000008', 'importable'], ['7000009', 'importable'], ['7000010', 'importable']])
	})

	it('la fila con deuda_id "0" significa sin deuda: no es una cuota', () => {
		assert.deepEqual(classify([noDebtLine()]), { kind: 'no_debt', contractId: 900101 })
	})

	it('excluye cada cuota de un contrato con estado no importable', () => {
		const result = classify([line('2026-09', 20, '1'), line('2026-10', 20, '2')].map(item => ({ ...item, status: 'CORTESIA' })))
		assert.equal(result.kind, 'rejected')
		assert.deepEqual(outcomes(result), [['1', 'excluded_status'], ['2', 'excluded_status']])
	})

	it('importa CORTADO por defecto y respeta la configuración de estados', () => {
		const cut = [line('2026-10', 20, '1', { status: 'CORTADO' })]
		assert.equal(classify(cut).kind, 'accepted')
		assert.equal(classify(cut, { importableStatuses: ['ACTIVO'] }).kind, 'rejected')
	})

	it('un estado desconocido deja el contrato fuera, aunque sea importable por configuración', () => {
		const result = classify([line('2026-10', 20, '1', { status: 'SUSPENDIDO' })], { importableStatuses: ['ACTIVO', 'CORTADO'] })
		assert.deepEqual(outcomes(result), [['1', 'unknown_status']])
	})

	it('un contrato sin identificación válida no se importa', () => {
		assert.deepEqual(outcomes(classify([line('2026-10', 25, '1', { holderDocument: 'SIN-CEDULA' })])), [['1', 'invalid_document']])
	})

	it('excluye por tipo de documento del titular', () => {
		const lines = [line('2026-10', 60, '1', { holderDocument: 'J-40123456-7' })]
		assert.equal(classify(lines).kind, 'accepted')
		assert.deepEqual(outcomes(classify(lines, { excludedDocumentTypes: ['J'] })), [['1', 'excluded_document_type']])
	})

	it('descarta lo que no está en USD y el USD incoherente (cuotas < 1 % del plan)', () => {
		assert.deepEqual(outcomes(classify([line('2026-10', 25, '1', { currency: 'VES' })])), [['1', 'currency_not_usd']])
		const ves = classify([line('2026-09', 0.05, '1', { planPrice: 20 }), line('2026-10', 0.05, '2', { planPrice: 20 })])
		assert.deepEqual(outcomes(ves), [['1', 'incoherent_currency'], ['2', 'incoherent_currency']])
	})

	it('una cuota con saldo residual (deuda 0) no se importa; el resto sí', () => {
		const result = classify([line('2026-09', 0, '1'), line('2026-10', 25, '2')])
		assert.equal(result.kind, 'accepted')
		assert.deepEqual(outcomes(result), [['1', 'residual_balance'], ['2', 'importable']])
	})

	it('nunca adivina: cualquier contradicción deja el contrato fuera', () => {
		const cases: Array<[string, DebtLine[]]> = [
			['respuesta vacía', []],
			['fila de otro contrato', [line('2026-09', 25, '1'), line('2026-10', 25, '2', { contractId: 900102 })]],
			['cuota duplicada', [line('2026-09', 25, '1'), line('2026-10', 25, '1')]],
			['"sin deuda" mezclado con cuotas', [line('2026-10', 25, '1'), noDebtLine()]],
			['titular distinto entre filas', [line('2026-09', 25, '1'), line('2026-10', 25, '2', { holderDocument: 'V-99999999' })]],
			['estado distinto entre filas', [line('2026-09', 25, '1'), line('2026-10', 25, '2', { status: 'CORTADO' })]],
			['detalle ilegible', [line('2026-10', 25, '1', { debtDetail: ['PLAN15MB25'] })]],
			['monto no numérico', [line('2026-10', Number.NaN, '1')]],
			['dos periodos iguales', [line('2026-10', 25, '1'), line('2026-10', 25, '2')]],
			['precio del plan inválido', [line('2026-10', 25, '1', { planPrice: Number.NaN })]],
		]
		for (const [name, lines] of cases) {
			const result = classify(lines)
			assert.equal(result.kind, 'rejected', name)
			if (result.kind === 'rejected') {
				assert.equal(result.reason, 'inconsistent_response', name)
				assert.ok(result.detail.length > 0, name)
			}
		}
	})

	it('excluye cuotas futuras aunque la API las devuelva', () => {
		assert.deepEqual(outcomes(classify([line('2026-10', 25, '1'), line('2026-11', 25, '2')])), [['1', 'importable'], ['2', 'future_installment']])
	})

	it('aplica la ventana de importación desde el mes actual menos N meses', () => {
		const lines = [line('2026-06', 25, '1'), line('2026-07', 25, '2'), line('2026-10', 25, '3')]
		assert.deepEqual(outcomes(classify(lines, { windowMonths: 3 })), [['1', 'outside_window'], ['2', 'importable'], ['3', 'importable']])
		assert.deepEqual(outcomes(classify(lines, { windowMonths: null })), [['1', 'importable'], ['2', 'importable'], ['3', 'importable']])
	})

	it('conserva solo las N cuotas más recientes por contrato', () => {
		const lines = [line('2026-07', 25, '1'), line('2026-08', 25, '2'), line('2026-09', 25, '3'), line('2026-10', 25, '4')]
		assert.deepEqual(outcomes(classify(lines, { maxRecentPerContract: 2 })), [['1', 'beyond_recent_limit'], ['2', 'beyond_recent_limit'], ['3', 'importable'], ['4', 'importable']])
	})
})

describe('applyRunCaps', () => {
	const candidates = [{ amountCents: 2000 }, { amountCents: 2500 }, { amountCents: 2500 }, { amountCents: 100 }]

	it('sin topes no frena nada', () => {
		assert.deepEqual(applyRunCaps(candidates, { maxNewInvoices: null, maxNewAmountCents: null }), [false, false, false, false])
	})

	it('frena todo lo que viene después del primer exceso', () => {
		assert.deepEqual(applyRunCaps(candidates, { maxNewInvoices: 2, maxNewAmountCents: null }), [false, false, true, true])
		assert.deepEqual(applyRunCaps(candidates, { maxNewInvoices: null, maxNewAmountCents: 4600 }), [false, false, true, true])
		assert.deepEqual(applyRunCaps(candidates, { maxNewInvoices: null, maxNewAmountCents: 4500 }), [false, false, true, true])
	})
})
