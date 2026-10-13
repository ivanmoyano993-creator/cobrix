import type { ContractClassification } from '../../domain/types/import.types.ts'
import type { CheckedInvoice, ContractFetchFailure, UncheckedInvoice } from '../interfaces/run.interface.ts'

export type ContractFetch = ContractClassification | ContractFetchFailure

export type PaymentCheck = CheckedInvoice | UncheckedInvoice
