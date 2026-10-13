import { addMonths } from '../../shared/dates.ts'
import {
	CONTRACT_FIELDS,
	CONTRACT_KIND,
	CONTRACT_REJECTION,
	CONTRACT_STATUS_VALUES,
	INSTALLMENT_OUTCOME,
	MIN_INSTALLMENT_RATIO,
	NO_DEBT_ID,
} from './constants/import.constants.ts'
import { CURRENCY } from './constants/money.constants.ts'
import { cutoffDate, parseDebtDetail } from './debt-detail.ts'
import { normalizeDocument } from './document.ts'
import type {
	CapCandidate,
	ClassifyContractInput,
	DebtLine,
	ImportRules,
	InstallmentVerdict,
	ParsedInstallment,
	ReadLinesFailure,
	RunCaps,
} from './interfaces/import.interface.ts'
import type {
	ContractClassification,
	ContractRejection,
	ContractStatus,
	InstallmentOutcome,
	ReadLinesResult,
} from './types/import.types.ts'
import { toCents } from './money.ts'

export function classifyContract(input: ClassifyContractInput): ContractClassification {
	const { contractId, lines, rules, currentPeriod } = input
	const reject = (reason: ContractRejection, detail: string): ContractClassification => ({
		kind: CONTRACT_KIND.Rejected,
		contractId,
		reason,
		detail,
		installments: lines.filter(line => line.debtId !== NO_DEBT_ID).map(line => describeRejected(line, rules.graceDays, reason)),
	})

	const read = readLines(contractId, lines)
	if (!read.ok) return reject(CONTRACT_REJECTION.InconsistentResponse, read.error)
	if (read.installments.length === 0) return { kind: CONTRACT_KIND.NoDebt, contractId }

	const { first } = read
	const { status } = first
	if (!isContractStatus(status)) return reject(CONTRACT_REJECTION.UnknownStatus, `Estado de contrato desconocido: «${status}».`)
	if (!rules.importableStatuses.includes(status)) return reject(CONTRACT_REJECTION.ExcludedStatus, `El contrato está ${status}, que no se importa.`)

	const document = normalizeDocument(first.holderDocument)
	if (!document) return reject(CONTRACT_REJECTION.InvalidDocument, `Identificación del titular inválida: «${first.holderDocument}».`)
	if (document.type !== null && rules.excludedDocumentTypes.includes(document.type)) {
		return reject(CONTRACT_REJECTION.ExcludedDocumentType, `Titular con documento tipo ${document.type}, excluido por configuración.`)
	}

	if (first.currency !== CURRENCY) return reject(CONTRACT_REJECTION.CurrencyNotUsd, `El contrato está en ${first.currency}, no en ${CURRENCY}.`)
	if (read.installments.some(item => item.amountCents > 0 && item.amountCents < read.priceCents * MIN_INSTALLMENT_RATIO)) {
		return reject(CONTRACT_REJECTION.IncoherentCurrency, `Cuotas menores al 1 % del precio del plan (${first.planPrice}): la moneda reportada no es creíble.`)
	}

	return {
		kind: CONTRACT_KIND.Accepted,
		contractId,
		holder: {
			documentId: document.id,
			documentType: document.type,
			personKind: document.personKind,
			name: first.holderName,
			email: first.email,
			phone: first.phone,
		},
		contract: {
			id: contractId,
			code: first.contractCode,
			status,
			plan: first.planName,
			priceCents: read.priceCents,
			branch: first.branchName,
		},
		installments: installmentOutcomes(read.installments, rules, currentPeriod),
	}
}

export function applyRunCaps(candidates: readonly CapCandidate[], caps: RunCaps): boolean[] {
	let count = 0
	let total = 0
	let held = false
	return candidates.map(candidate => {
		if (!held) {
			const exceedsCount = caps.maxNewInvoices !== null && count + 1 > caps.maxNewInvoices
			const exceedsAmount = caps.maxNewAmountCents !== null && total + candidate.amountCents > caps.maxNewAmountCents
			if (exceedsCount || exceedsAmount) {
				held = true
			} else {
				count++
				total += candidate.amountCents
			}
		}
		return held
	})
}

export function isContractStatus(value: string): value is ContractStatus {
	return CONTRACT_STATUS_VALUES.has(value)
}

function readLines(contractId: number, lines: readonly DebtLine[]): ReadLinesResult {
	const first = lines[0]
	if (first === undefined) return failure('La API no devolvió filas para el contrato.')

	const inconsistency = findInconsistency(contractId, lines, first)
	if (inconsistency !== null) return failure(inconsistency)

	if (lines.some(line => line.debtId === NO_DEBT_ID)) return readNoDebt(lines, first)

	const priceCents = toCents(first.planPrice)
	if (priceCents === null || priceCents <= 0) return failure(`Precio del plan inválido: ${first.planPrice}.`)

	return readInstallments(lines, first, priceCents)
}

function findInconsistency(contractId: number, lines: readonly DebtLine[], first: DebtLine): string | null {
	const foreign = lines.find(line => line.contractId !== contractId)
	if (foreign) return `La respuesta trae filas del contrato ${foreign.contractId}.`
	const field = CONTRACT_FIELDS.find(name => lines.some(line => !Object.is(line[name], first[name])))
	if (field) return `El campo ${field} cambia entre filas del mismo contrato.`
	return null
}

function readNoDebt(lines: readonly DebtLine[], first: DebtLine): ReadLinesResult {
	if (lines.length > 1) return failure('La respuesta mezcla la fila «sin deuda» con cuotas.')
	if (toCents(first.debt) !== 0) return failure('La fila «sin deuda» trae un monto.')
	return { ok: true, first, installments: [], priceCents: 0 }
}

function readInstallments(lines: readonly DebtLine[], first: DebtLine, priceCents: number): ReadLinesResult {
	const installments: ParsedInstallment[] = []
	for (const line of lines) {
		const detail = parseDebtDetail(line.debtDetail)
		if (!detail) return failure(`Detalle ilegible en la cuota ${line.debtId}: ${JSON.stringify(line.debtDetail)}.`)
		const amountCents = toCents(line.debt)
		if (amountCents === null || amountCents < 0) return failure(`Monto inválido en la cuota ${line.debtId}: ${line.debt}.`)
		if (installments.some(item => item.debtId === line.debtId)) return failure(`La cuota ${line.debtId} viene repetida.`)
		if (installments.some(item => item.period === detail.period)) return failure(`Dos cuotas para el periodo ${detail.period}.`)
		installments.push({ debtId: line.debtId, period: detail.period, amountCents })
	}
	return { ok: true, first, installments: installments.toSorted((a, b) => a.period.localeCompare(b.period)), priceCents }
}

function failure(error: string): ReadLinesFailure {
	return { ok: false, error }
}

function installmentOutcomes(installments: readonly ParsedInstallment[], rules: ImportRules, currentPeriod: string): InstallmentVerdict[] {
	const windowStart = rules.windowMonths === null ? null : addMonths(currentPeriod, -rules.windowMonths)
	const outcomes = installments.map(item => baseOutcome(item, currentPeriod, windowStart))
	const limited = rules.maxRecentPerContract === null ? outcomes : limitRecent(outcomes, rules.maxRecentPerContract)
	return installments.map((item, index) => {
		const dueDate = `${item.period}-01`
		return {
			debtId: item.debtId,
			period: item.period,
			dueDate,
			cutoffDate: cutoffDate(dueDate, rules.graceDays),
			amountCents: item.amountCents,
			outcome: limited[index] ?? INSTALLMENT_OUTCOME.Importable,
		}
	})
}

function baseOutcome(item: ParsedInstallment, currentPeriod: string, windowStart: string | null): InstallmentOutcome {
	if (item.amountCents === 0) return INSTALLMENT_OUTCOME.ResidualBalance
	if (item.period > currentPeriod) return INSTALLMENT_OUTCOME.FutureInstallment
	if (windowStart !== null && item.period < windowStart) return INSTALLMENT_OUTCOME.OutsideWindow
	return INSTALLMENT_OUTCOME.Importable
}

function limitRecent(outcomes: readonly InstallmentOutcome[], limit: number): InstallmentOutcome[] {
	let kept = 0
	return outcomes
		.toReversed()
		.map(outcome => {
			if (outcome !== INSTALLMENT_OUTCOME.Importable) return outcome
			kept++
			return kept > limit ? INSTALLMENT_OUTCOME.BeyondRecentLimit : outcome
		})
		.toReversed()
}

function describeRejected(line: DebtLine, graceDays: number, outcome: InstallmentOutcome): InstallmentVerdict {
	const detail = parseDebtDetail(line.debtDetail)
	return {
		debtId: line.debtId,
		period: detail?.period ?? null,
		dueDate: detail?.dueDate ?? null,
		cutoffDate: detail ? cutoffDate(detail.dueDate, graceDays) : null,
		amountCents: toCents(line.debt),
		outcome,
	}
}
