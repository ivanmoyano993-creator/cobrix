import { PAYMENT_OUTCOME } from '../domain/constants/payment.constants.ts'
import type { Invoice } from '../domain/interfaces/invoice.interface.ts'
import { formatCents } from '../domain/money.ts'
import type { InstallmentExclusion } from '../domain/types/import.types.ts'
import type { PaymentVerdict } from '../domain/types/payment.types.ts'
import { EXCLUSION_DETAIL, EXEMPT_DETAIL, NO_EVIDENCE_DETAIL, UNCHANGED_DETAIL } from './constants/messages.constants.ts'
import type { ImportSummaryInput, PaidSummaryInput } from './interfaces/messages.interface.ts'

export function exclusionDetail(outcome: InstallmentExclusion): string {
	return EXCLUSION_DETAIL[outcome]
}

export function importedDetail(invoice: Invoice): string {
	return `Importada como ${invoice.number} por ${formatCents(invoice.totalCents)}.`
}

export function alreadyImportedDetail(invoice: Invoice): string {
	return `Ya importada antes como ${invoice.number}.`
}

export function customerCreatedDetail(contractId: number): string {
	return `Cliente creado desde el contrato ${contractId} del administrador de facturas.`
}

export function invoiceImportedDetail(invoice: Invoice): string {
	return `Factura ${invoice.number} importada: cuota ${invoice.externalId} del periodo ${invoice.period} por ${formatCents(invoice.totalCents)}.`
}

export function invoicePaidDetail(invoice: Invoice, verdict: PaymentVerdict): string {
	return `Factura ${invoice.number} pagada en el ISP. ${paymentDetail(verdict)}`
}

export function paymentDetail(verdict: PaymentVerdict): string {
	switch (verdict.outcome) {
		case PAYMENT_OUTCOME.Paid:
			return `Pagada con la factura ${verdict.paidBy.invoiceNumber} del administrador (${verdict.paidBy.date}).`
		case PAYMENT_OUTCOME.PartialPayment:
			return `Abono parcial: en el ISP quedan ${formatCents(verdict.remainingCents)} por pagar. Sigue abierta.`
		case PAYMENT_OUTCOME.Unchanged:
			return UNCHANGED_DETAIL
		case PAYMENT_OUTCOME.Exempt:
			return EXEMPT_DETAIL
		case PAYMENT_OUTCOME.NoEvidence:
			return NO_EVIDENCE_DETAIL
		case PAYMENT_OUTCOME.Inconsistent:
			return `Respuesta inconsistente del ISP: ${verdict.detail} Sigue abierta.`
	}
}

export function importSummary(input: ImportSummaryInput): string {
	const verb = input.dryRun ? plural(input.imported, 'factura se importaría', 'facturas se importarían') : plural(input.imported, 'factura importada', 'facturas importadas')
	const parts = [`${input.imported} ${verb} por ${formatCents(input.amountCents)}`]
	if (input.customersCreated > 0) parts.push(`${input.customersCreated} ${plural(input.customersCreated, 'cliente nuevo', 'clientes nuevos')}`)
	if (input.alreadyImported > 0) parts.push(`${input.alreadyImported} ya ${plural(input.alreadyImported, 'importada', 'importadas')}`)
	if (input.held > 0) parts.push(`${input.held} ${plural(input.held, 'frenada', 'frenadas')} por tope`)
	return parts.join(' · ')
}

export function paidSummary(input: PaidSummaryInput): string {
	const verb = input.dryRun ? plural(input.paid, 'factura se marcaría pagada', 'facturas se marcarían pagadas') : plural(input.paid, 'factura marcada pagada', 'facturas marcadas pagadas')
	const parts = [`${input.paid} ${verb}`]
	if (input.partial > 0) parts.push(`${input.partial} ${plural(input.partial, 'abono parcial', 'abonos parciales')}`)
	parts.push(`${input.stillOpen} ${plural(input.stillOpen, 'sigue abierta', 'siguen abiertas')}`)
	return parts.join(' · ')
}

function plural(count: number, singular: string, many: string): string {
	return count === 1 ? singular : many
}
