import { INSTALLMENT_EXCLUSION } from '../../domain/constants/import.constants.ts'
import { RUN_KIND } from '../../domain/constants/run.constants.ts'
import type { InstallmentExclusion } from '../../domain/types/import.types.ts'
import type { RunKind } from '../../domain/types/run.types.ts'

export const EXCLUSION_DETAIL: Readonly<Record<InstallmentExclusion, string>> = {
	[INSTALLMENT_EXCLUSION.ResidualBalance]: 'Saldo residual menor a un centavo: no es una deuda real.',
	[INSTALLMENT_EXCLUSION.FutureInstallment]: 'Cuota futura: todavía no vence.',
	[INSTALLMENT_EXCLUSION.OutsideWindow]: 'Fuera de la ventana de importación configurada.',
	[INSTALLMENT_EXCLUSION.BeyondRecentLimit]: 'Supera el máximo de cuotas recientes por contrato.',
}

export const HELD_BY_CAP_DETAIL = 'Frenada por el tope de facturas o de monto por corrida: no se importó.'

export const UNCHANGED_DETAIL = 'Sin pagos nuevos en el ISP: sigue abierta.'

export const EXEMPT_DETAIL = 'Cuota exonerada en el ISP (saldo 0 sin nada pagado): no es un pago, sigue abierta.'

export const NO_EVIDENCE_DETAIL = 'No aparece en el libro de cuotas ni como pendiente: sin evidencia, sigue abierta.'

export const FAILED_SUMMARY: Readonly<Record<RunKind, string>> = {
	[RUN_KIND.Import]: 'La importación falló: no se importó nada.',
	[RUN_KIND.UpdatePaid]: 'La actualización de pagadas falló: no se marcó nada.',
}
