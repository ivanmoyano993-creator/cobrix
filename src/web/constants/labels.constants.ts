import { REJECTED_CONTRACT_COUNTER_PREFIX, RUN_COUNTER } from '../../cobrix/application/constants/run.constants.ts'
import { CONTRACT_REJECTION, INSTALLMENT_EXCLUSION } from '../../cobrix/domain/constants/import.constants.ts'
import { PAYMENT_OUTCOME } from '../../cobrix/domain/constants/payment.constants.ts'
import { RUN_ITEM_OUTCOME, RUN_KIND, RUN_STATUS, RUN_TRIGGER } from '../../cobrix/domain/constants/run.constants.ts'
import type { ContractRejection } from '../../cobrix/domain/types/import.types.ts'
import type { RunItemOutcome, RunKind, RunStatus, RunTrigger } from '../../cobrix/domain/types/run.types.ts'
import type { Badge } from '../interfaces/web.interface.ts'

export const OUTCOME_BADGE: Readonly<Record<RunItemOutcome, Badge>> = {
	[RUN_ITEM_OUTCOME.Imported]: { label: 'Importada', tone: 'ok' },
	[RUN_ITEM_OUTCOME.AlreadyImported]: { label: 'Ya importada', tone: 'mute' },
	[RUN_ITEM_OUTCOME.HeldByCap]: { label: 'Frenada por tope', tone: 'warn' },
	[RUN_ITEM_OUTCOME.ProviderError]: { label: 'Error del ISP', tone: 'bad' },
	[CONTRACT_REJECTION.InconsistentResponse]: { label: 'Respuesta inconsistente', tone: 'bad' },
	[CONTRACT_REJECTION.UnknownStatus]: { label: 'Estado desconocido', tone: 'bad' },
	[CONTRACT_REJECTION.ExcludedStatus]: { label: 'Excluida por estado', tone: 'mute' },
	[CONTRACT_REJECTION.InvalidDocument]: { label: 'Documento inválido', tone: 'bad' },
	[CONTRACT_REJECTION.ExcludedDocumentType]: { label: 'Excluida por documento', tone: 'mute' },
	[CONTRACT_REJECTION.CurrencyNotUsd]: { label: 'No está en USD', tone: 'mute' },
	[CONTRACT_REJECTION.IncoherentCurrency]: { label: 'Moneda incoherente', tone: 'warn' },
	[INSTALLMENT_EXCLUSION.ResidualBalance]: { label: 'Saldo residual', tone: 'mute' },
	[INSTALLMENT_EXCLUSION.FutureInstallment]: { label: 'Cuota futura', tone: 'mute' },
	[INSTALLMENT_EXCLUSION.OutsideWindow]: { label: 'Fuera de la ventana', tone: 'mute' },
	[INSTALLMENT_EXCLUSION.BeyondRecentLimit]: { label: 'Fuera de recientes', tone: 'mute' },
	[PAYMENT_OUTCOME.Paid]: { label: 'Marcada pagada', tone: 'ok' },
	[PAYMENT_OUTCOME.PartialPayment]: { label: 'Abono parcial', tone: 'warn' },
	[PAYMENT_OUTCOME.Unchanged]: { label: 'Sin cambios', tone: 'info' },
	[PAYMENT_OUTCOME.Exempt]: { label: 'Exonerada', tone: 'mute' },
	[PAYMENT_OUTCOME.NoEvidence]: { label: 'Sin evidencia', tone: 'warn' },
	[PAYMENT_OUTCOME.Inconsistent]: { label: 'Inconsistente', tone: 'bad' },
}

export const DRY_RUN_OUTCOME_LABEL: Readonly<Partial<Record<RunItemOutcome, string>>> = {
	[RUN_ITEM_OUTCOME.Imported]: 'Se importaría',
	[PAYMENT_OUTCOME.Paid]: 'Se marcaría pagada',
}

export const RUN_KIND_LABEL: Readonly<Record<RunKind, string>> = {
	[RUN_KIND.Import]: 'Importación',
	[RUN_KIND.UpdatePaid]: 'Actualización de pagadas',
}

export const RUN_STATUS_BADGE: Readonly<Record<RunStatus, Badge>> = {
	[RUN_STATUS.Running]: { label: 'En curso', tone: 'info' },
	[RUN_STATUS.Completed]: { label: 'Completada', tone: 'ok' },
	[RUN_STATUS.Failed]: { label: 'Falló', tone: 'bad' },
}

export const RUN_TRIGGER_LABEL: Readonly<Record<RunTrigger, string>> = {
	[RUN_TRIGGER.Manual]: 'Manual',
	[RUN_TRIGGER.Scheduled]: 'Automática',
}

export const DRY_RUN_BADGE: Badge = { label: 'Simulación', tone: 'info' }

export const COUNTER_LABEL: Readonly<Record<string, string>> = {
	[RUN_COUNTER.ContractsTotal]: 'Contratos leídos',
	[RUN_COUNTER.ContractsNoDebt]: 'Contratos sin deuda',
	[RUN_COUNTER.CustomersCreated]: 'Clientes creados',
	[RUN_COUNTER.ImportedAmountCents]: 'Monto importado',
	[RUN_COUNTER.InvoicesChecked]: 'Facturas consultadas',
	[RUN_COUNTER.PaidAmountCents]: 'Monto marcado pagado',
}

export const MONEY_COUNTERS: ReadonlySet<string> = new Set([RUN_COUNTER.ImportedAmountCents, RUN_COUNTER.PaidAmountCents])

export const HIGHLIGHT_COUNTERS: Readonly<Record<RunKind, readonly string[]>> = {
	[RUN_KIND.Import]: [
		RUN_COUNTER.ContractsTotal,
		RUN_ITEM_OUTCOME.Imported,
		RUN_COUNTER.ImportedAmountCents,
		RUN_COUNTER.CustomersCreated,
		RUN_ITEM_OUTCOME.AlreadyImported,
		CONTRACT_REJECTION.ExcludedStatus,
	],
	[RUN_KIND.UpdatePaid]: [
		RUN_COUNTER.InvoicesChecked,
		PAYMENT_OUTCOME.Paid,
		RUN_COUNTER.PaidAmountCents,
		PAYMENT_OUTCOME.PartialPayment,
		PAYMENT_OUTCOME.Unchanged,
		PAYMENT_OUTCOME.NoEvidence,
	],
}

export const OUTCOME_COUNTER_LABEL: Readonly<Record<RunItemOutcome, string>> = {
	[RUN_ITEM_OUTCOME.Imported]: 'Importadas',
	[RUN_ITEM_OUTCOME.AlreadyImported]: 'Ya importadas',
	[RUN_ITEM_OUTCOME.HeldByCap]: 'Frenadas por tope',
	[RUN_ITEM_OUTCOME.ProviderError]: 'Con error del ISP',
	[CONTRACT_REJECTION.InconsistentResponse]: 'Con respuesta inconsistente',
	[CONTRACT_REJECTION.UnknownStatus]: 'Con estado desconocido',
	[CONTRACT_REJECTION.ExcludedStatus]: 'Excluidas por estado',
	[CONTRACT_REJECTION.InvalidDocument]: 'Con documento inválido',
	[CONTRACT_REJECTION.ExcludedDocumentType]: 'Excluidas por documento',
	[CONTRACT_REJECTION.CurrencyNotUsd]: 'Fuera de USD',
	[CONTRACT_REJECTION.IncoherentCurrency]: 'Con moneda incoherente',
	[INSTALLMENT_EXCLUSION.ResidualBalance]: 'Saldo residual',
	[INSTALLMENT_EXCLUSION.FutureInstallment]: 'Cuotas futuras',
	[INSTALLMENT_EXCLUSION.OutsideWindow]: 'Fuera de la ventana',
	[INSTALLMENT_EXCLUSION.BeyondRecentLimit]: 'Fuera de recientes',
	[PAYMENT_OUTCOME.Paid]: 'Marcadas pagadas',
	[PAYMENT_OUTCOME.PartialPayment]: 'Abonos parciales',
	[PAYMENT_OUTCOME.Unchanged]: 'Sin cambios',
	[PAYMENT_OUTCOME.Exempt]: 'Exoneradas',
	[PAYMENT_OUTCOME.NoEvidence]: 'Sin evidencia',
	[PAYMENT_OUTCOME.Inconsistent]: 'Inconsistentes',
}

export const DRY_RUN_COUNTER_LABEL: Readonly<Partial<Record<RunItemOutcome, string>>> = {
	[RUN_ITEM_OUTCOME.Imported]: 'Se importarían',
	[PAYMENT_OUTCOME.Paid]: 'Se marcarían pagadas',
}

export const REJECTED_CONTRACTS_COUNTER_LABEL: Readonly<Record<ContractRejection, string>> = {
	[CONTRACT_REJECTION.InconsistentResponse]: 'Contratos con respuesta inconsistente',
	[CONTRACT_REJECTION.UnknownStatus]: 'Contratos con estado desconocido',
	[CONTRACT_REJECTION.ExcludedStatus]: 'Contratos excluidos por estado',
	[CONTRACT_REJECTION.InvalidDocument]: 'Contratos con documento inválido',
	[CONTRACT_REJECTION.ExcludedDocumentType]: 'Contratos excluidos por documento',
	[CONTRACT_REJECTION.CurrencyNotUsd]: 'Contratos fuera de USD',
	[CONTRACT_REJECTION.IncoherentCurrency]: 'Contratos con moneda incoherente',
}

export const COUNTER_ORDER: readonly string[] = [
	RUN_COUNTER.ContractsTotal,
	RUN_COUNTER.ContractsNoDebt,
	...Object.values(CONTRACT_REJECTION).map(reason => `${REJECTED_CONTRACT_COUNTER_PREFIX}${reason}`),
	RUN_COUNTER.InvoicesChecked,
	RUN_COUNTER.CustomersCreated,
	RUN_ITEM_OUTCOME.Imported,
	PAYMENT_OUTCOME.Paid,
	PAYMENT_OUTCOME.PartialPayment,
	PAYMENT_OUTCOME.Unchanged,
	RUN_ITEM_OUTCOME.AlreadyImported,
	RUN_ITEM_OUTCOME.HeldByCap,
	...Object.values(CONTRACT_REJECTION),
	...Object.values(INSTALLMENT_EXCLUSION),
	PAYMENT_OUTCOME.Exempt,
	PAYMENT_OUTCOME.NoEvidence,
	PAYMENT_OUTCOME.Inconsistent,
	RUN_ITEM_OUTCOME.ProviderError,
	RUN_COUNTER.ImportedAmountCents,
	RUN_COUNTER.PaidAmountCents,
]

export const COUNTERS_TITLE = 'Contadores'

export const NOT_CONFIGURED = 'Sin configurar'

export const COMPANY_FALLBACK = 'Empresa sin configurar'
