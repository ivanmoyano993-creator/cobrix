import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { LedgerEntry, LedgerPayment } from '../../src/cobrix/domain/interfaces/payment.interface.ts'
import { classifyPayment } from '../../src/cobrix/domain/payment-rules.ts'

interface LedgerFixtureState {
	readonly balance: number
	readonly paid: number
	readonly discount?: number
	readonly fee?: number
}

function entry(installmentId: number, invoiceId: number, issuedOn: string, state: LedgerFixtureState, overrides: Partial<LedgerPayment> = {}, outerContractId = 900101): LedgerEntry {
	return {
		invoiceId,
		invoiceNumber: invoiceId ? String(invoiceId).padStart(9, '0') : '',
		issuedOn,
		contractId: outerContractId,
		payment: {
			contractId: 900101,
			installmentId,
			period: '2026-08',
			fee: state.fee ?? 25,
			paid: state.paid,
			discount: state.discount ?? 0,
			balance: state.balance,
			creditNote: 0,
			additional: 0,
			usage: 0,
			nonUsage: 0,
			...overrides,
		},
	}
}

const future = entry(7000020, 0, '2026-12-31', { balance: 25, paid: 0 })

function classify(ledger: LedgerEntry[], openBalanceCents = 2000, pendingDebtCents: number | null = null) {
	return classifyPayment({ debtId: '7000008', contractId: 900101, openBalanceCents, ledger, pendingDebtCents })
}

describe('classifyPayment', () => {
	it('marca pagada si todas las filas coinciden, el saldo es 0 y hay algo pagado', () => {
		const result = classify([
			entry(7000008, 8800007, '2026-08-06', { balance: 0, paid: 25 }),
			future,
			entry(7000008, 8800120, '2026-10-13', { balance: 0, paid: 25 }),
		])
		assert.deepEqual(result, { outcome: 'paid', paidBy: { invoiceId: 8800120, invoiceNumber: '008800120', date: '2026-10-13' } })
	})

	it('abono parcial: tiene saldo pero menor al de Cobrix, sigue abierta', () => {
		assert.deepEqual(classify([entry(7000008, 8800121, '2026-10-13', { balance: 15, paid: 10 })]), { outcome: 'partial_payment', remainingCents: 1500 })
	})

	it('sin cambios: el saldo es el mismo que en Cobrix', () => {
		assert.deepEqual(classify([entry(7000008, 0, '2026-08-31', { balance: 20, paid: 5 })]), { outcome: 'unchanged' })
	})

	it('un cobro anulado vuelve la cuota a deber: no es un pago', () => {
		assert.deepEqual(classify([entry(7000008, 8800118, '2026-10-13', { balance: 25, paid: 0 })], 2500), { outcome: 'unchanged' })
	})

	it('una cuota exonerada (saldo 0 sin nada pagado) no es un pago', () => {
		assert.deepEqual(classify([entry(7000008, 0, '2026-08-31', { balance: 0, paid: 0, discount: -25 })]), { outcome: 'exempt' })
	})

	it('nunca marca pagada si la respuesta se contradice', () => {
		const cases: Array<[string, LedgerEntry[]]> = [
			['filas que no coinciden', [entry(7000008, 8800007, '2026-08-06', { balance: 0, paid: 25 }), entry(7000008, 8800120, '2026-10-13', { balance: 5, paid: 20 })]],
			['fila de otro contrato', [entry(7000008, 8800120, '2026-10-13', { balance: 0, paid: 25 }, { contractId: 900102 })]],
			['saldo mayor al de Cobrix', [entry(7000008, 0, '2026-08-31', { balance: 30, paid: 0 })]],
			['pagada sin factura de cobro', [entry(7000008, 0, '2026-08-31', { balance: 0, paid: 25 })]],
			['saldo negativo', [entry(7000008, 8800120, '2026-10-13', { balance: -1, paid: 26 })]],
			['monto no numérico', [entry(7000008, 8800120, '2026-10-13', { balance: Number.NaN, paid: 25 })]],
		]
		for (const [name, ledger] of cases) {
			const result = classify(ledger)
			assert.equal(result.outcome, 'inconsistent', name)
			if (result.outcome === 'inconsistent') assert.ok(result.detail.length > 0, name)
		}
	})

	it('el contrato externo de la fila también debe coincidir con el pedido', () => {
		const result = classify([entry(7000008, 8800120, '2026-10-13', { balance: 0, paid: 25 }, {}, 900102)])
		assert.equal(result.outcome, 'inconsistent')
	})

	it('el contrato interno distinto sigue siendo inconsistente aunque el externo coincida', () => {
		const result = classify([entry(7000008, 8800120, '2026-10-13', { balance: 0, paid: 25 }, { contractId: 900102 })])
		assert.equal(result.outcome, 'inconsistent')
	})

	it('filas que difieren en un monto opcional (en centavos) son inconsistentes', () => {
		const paid = { balance: 0, paid: 25 }
		const cases: Array<[string, Partial<LedgerPayment>, Partial<LedgerPayment>]> = [
			['nota de crédito 10 vs 12', { creditNote: 10 }, { creditNote: 12 }],
			['adicional 10 vs 12', { additional: 10 }, { additional: 12 }],
			['null vs 0', { usage: null }, { usage: 0 }],
			['null vs número', { nonUsage: null }, { nonUsage: 10 }],
		]
		for (const [name, first, second] of cases) {
			const result = classify([entry(7000008, 8800007, '2026-08-06', paid, first), entry(7000008, 8800120, '2026-10-13', paid, second)])
			assert.equal(result.outcome, 'inconsistent', name)
		}
	})

	it('montos opcionales ausentes en todas las filas son coherentes', () => {
		const absent = { creditNote: null, additional: null, usage: null, nonUsage: null }
		const paid = { balance: 0, paid: 25 }
		const result = classify([entry(7000008, 8800007, '2026-08-06', paid, absent), entry(7000008, 8800120, '2026-10-13', paid, absent)])
		assert.equal(result.outcome, 'paid')
	})

	it('un monto opcional negativo es inconsistente', () => {
		const result = classify([entry(7000008, 8800120, '2026-10-13', { balance: 0, paid: 25 }, { usage: -1 })])
		assert.equal(result.outcome, 'inconsistent')
	})

	it('una nota de crédito nunca implica pago: saldo 0 sin pagos sigue exonerada', () => {
		assert.deepEqual(classify([entry(7000008, 0, '2026-08-31', { balance: 0, paid: 0 }, { creditNote: 25 })]), { outcome: 'exempt' })
	})

	it('si no aparece en el libro, consulta el contrato (cuota del mes en curso)', () => {
		assert.deepEqual(classify([future], 2500, 2500), { outcome: 'unchanged' })
		assert.deepEqual(classify([future], 2500, 1000), { outcome: 'partial_payment', remainingCents: 1000 })
	})

	it('si no aparece ni en el libro ni como pendiente, queda sin evidencia: nunca pagada', () => {
		assert.deepEqual(classify([future], 2500, null), { outcome: 'no_evidence' })
		assert.deepEqual(classify([], 2500, null), { outcome: 'no_evidence' })
	})
})
