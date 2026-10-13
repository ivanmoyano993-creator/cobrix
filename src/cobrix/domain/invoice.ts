import { INVOICE_NUMBER_DIGITS, INVOICE_NUMBER_PREFIX } from './constants/invoice.constants.ts'

export function invoiceNumber(id: number): string {
	return `${INVOICE_NUMBER_PREFIX}${String(id).padStart(INVOICE_NUMBER_DIGITS, '0')}`
}
