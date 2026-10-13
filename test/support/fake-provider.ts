import type { DebtLine } from '../../src/cobrix/domain/interfaces/import.interface.ts'
import type { LedgerEntry } from '../../src/cobrix/domain/interfaces/payment.interface.ts'
import type { BillingProvider, DateRange } from '../../src/cobrix/domain/interfaces/provider.interface.ts'
import type { ProviderError } from '../../src/cobrix/domain/provider-error.ts'

export interface FakeProviderData {
	readonly debts: Map<number, readonly DebtLine[]>
	readonly ledgers?: Map<number, readonly LedgerEntry[]>
	readonly failures?: Map<number, ProviderError>
	readonly listFailure?: ProviderError
}

export interface FakeProvider extends BillingProvider {
	readonly calls: string[]
}

export function createFakeProvider(data: FakeProviderData): FakeProvider {
	const calls: string[] = []
	return {
		calls,
		listContractIds() {
			calls.push('listContractIds')
			if (data.listFailure) return Promise.reject(data.listFailure)
			return Promise.resolve([...data.debts.keys()])
		},
		getContractDebt(contractId: number) {
			calls.push(`getContractDebt:${contractId}`)
			const failure = data.failures?.get(contractId)
			if (failure) return Promise.reject(failure)
			return Promise.resolve([...(data.debts.get(contractId) ?? [])])
		},
		getLedger(contractId: number, range: DateRange) {
			calls.push(`getLedger:${contractId}:${range.from}:${range.to}`)
			const failure = data.failures?.get(contractId)
			if (failure) return Promise.reject(failure)
			return Promise.resolve([...(data.ledgers?.get(contractId) ?? [])])
		},
	}
}

const MONTHS: Record<string, string> = { '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre' }

export function debtLine(contractId: number, period: string, debt: number, debtId: string, overrides: Partial<DebtLine> = {}): DebtLine {
	return {
		contractId,
		contractCode: `0${contractId}`,
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

export interface LedgerFixture {
	readonly installmentId: number
	readonly period: string
	readonly invoiceId: number
	readonly issuedOn: string
	readonly balance: number
	readonly paid: number
}

export function ledgerEntry(contractId: number, fixture: LedgerFixture): LedgerEntry {
	return {
		invoiceId: fixture.invoiceId,
		invoiceNumber: fixture.invoiceId ? String(fixture.invoiceId).padStart(9, '0') : '',
		issuedOn: fixture.issuedOn,
		contractId,
		payment: {
			contractId,
			installmentId: fixture.installmentId,
			period: fixture.period,
			fee: 25,
			paid: fixture.paid,
			discount: 0,
			balance: fixture.balance,
		},
	}
}
