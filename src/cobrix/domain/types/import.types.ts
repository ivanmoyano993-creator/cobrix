import type {
	CONTRACT_FIELDS,
	CONTRACT_KIND,
	CONTRACT_REJECTION,
	CONTRACT_STATUS,
	INSTALLMENT_OUTCOME,
} from '../constants/import.constants.ts'
import type {
	AcceptedContract,
	NoDebtContract,
	ReadLinesFailure,
	ReadLinesSuccess,
	RejectedContract,
} from '../interfaces/import.interface.ts'
import type { ValueOf } from './utility.types.ts'

export type ContractStatus = ValueOf<typeof CONTRACT_STATUS>

export type ContractKind = ValueOf<typeof CONTRACT_KIND>

export type ContractRejection = ValueOf<typeof CONTRACT_REJECTION>

export type InstallmentOutcome = ValueOf<typeof INSTALLMENT_OUTCOME>

export type ContractField = (typeof CONTRACT_FIELDS)[number]

export type ContractClassification = AcceptedContract | NoDebtContract | RejectedContract

export type ReadLinesResult = ReadLinesFailure | ReadLinesSuccess
