import type { INVOICE_STATUS } from '../constants/invoice.constants.ts'
import type { ValueOf } from './utility.types.ts'

export type InvoiceStatus = ValueOf<typeof INVOICE_STATUS>
