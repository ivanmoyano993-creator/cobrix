import type { CONTRACT_KIND } from '../constants/import.constants.ts'
import type { DocumentType, PersonKind } from '../types/document.types.ts'
import type { ContractRejection, ContractStatus, InstallmentOutcome } from '../types/import.types.ts'

export interface DebtLine {
	readonly contractId: number
	readonly contractCode: string
	readonly holderDocument: string
	readonly holderName: string
	readonly phone: string
	readonly email: string
	readonly status: string
	readonly debt: number
	readonly debtId: string
	readonly debtDetail: readonly string[]
	readonly planName: string
	readonly planPrice: number
	readonly branchName: string
	readonly currency: string
}

export interface ImportRules {
	readonly importableStatuses: readonly ContractStatus[]
	readonly windowMonths: number | null
	readonly maxRecentPerContract: number | null
	readonly graceDays: number
	readonly excludedDocumentTypes: readonly DocumentType[]
}

export interface ClassifyContractInput {
	readonly contractId: number
	readonly lines: readonly DebtLine[]
	readonly rules: ImportRules
	readonly currentPeriod: string
}

export interface InstallmentVerdict {
	readonly debtId: string
	readonly period: string | null
	readonly dueDate: string | null
	readonly cutoffDate: string | null
	readonly amountCents: number | null
	readonly outcome: InstallmentOutcome
}

export interface Holder {
	readonly documentId: string
	readonly documentType: DocumentType | null
	readonly personKind: PersonKind
	readonly name: string
	readonly email: string
	readonly phone: string
}

export interface ContractInfo {
	readonly id: number
	readonly code: string
	readonly status: ContractStatus
	readonly plan: string
	readonly priceCents: number
	readonly branch: string
}

export interface AcceptedContract {
	readonly kind: typeof CONTRACT_KIND.Accepted
	readonly contractId: number
	readonly holder: Holder
	readonly contract: ContractInfo
	readonly installments: readonly InstallmentVerdict[]
}

export interface NoDebtContract {
	readonly kind: typeof CONTRACT_KIND.NoDebt
	readonly contractId: number
}

export interface RejectedContract {
	readonly kind: typeof CONTRACT_KIND.Rejected
	readonly contractId: number
	readonly reason: ContractRejection
	readonly detail: string
	readonly installments: readonly InstallmentVerdict[]
}

export interface ParsedInstallment {
	readonly debtId: string
	readonly period: string
	readonly amountCents: number
}

export interface ReadLinesFailure {
	readonly ok: false
	readonly error: string
}

export interface ReadLinesSuccess {
	readonly ok: true
	readonly first: DebtLine
	readonly installments: readonly ParsedInstallment[]
	readonly priceCents: number
}

export interface RunCaps {
	readonly maxNewInvoices: number | null
	readonly maxNewAmountCents: number | null
}

export interface CapCandidate {
	readonly amountCents: number
}
