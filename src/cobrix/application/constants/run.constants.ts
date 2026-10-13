import { PROVIDER_ERROR_KIND } from '../../domain/constants/provider.constants.ts'
import { RUN_TRIGGER } from '../../domain/constants/run.constants.ts'
import type { ProviderErrorKind } from '../../domain/types/provider.types.ts'
import type { RunRequest } from '../interfaces/run.interface.ts'

export const SCHEDULED_RUN_REQUEST: RunRequest = { dryRun: false, trigger: RUN_TRIGGER.Scheduled }

export const RUN_COUNTER = {
	ContractsTotal: 'contracts_total',
	ContractsNoDebt: 'contracts_no_debt',
	CustomersCreated: 'customers_created',
	ImportedAmountCents: 'imported_amount_cents',
	InvoicesChecked: 'invoices_checked',
	PaidAmountCents: 'paid_amount_cents',
} as const

export const REJECTED_CONTRACT_COUNTER_PREFIX = 'contracts_'

export const FATAL_PROVIDER_ERRORS: readonly ProviderErrorKind[] = [PROVIDER_ERROR_KIND.Auth, PROVIDER_ERROR_KIND.Network]

export const FETCH_FAILED = 'fetch_failed'

export const CHECKED = 'checked'

export const RUN_IN_PROGRESS = 'Ya hay una corrida en curso. Espera a que termine y vuelve a intentarlo.'

export const PROVIDER_NOT_CONFIGURED = 'Falta configurar el proveedor: carga la URL de la API, el usuario y la contraseña en Configuración.'
