import type { DebtLine } from '../../domain/interfaces/import.interface.ts'
import type { LedgerEntry } from '../../domain/interfaces/payment.interface.ts'
import { NAIVE_UTC_DATETIME_PATTERN, PLAN_PRICE_PATTERN } from '../constants/http.constants.ts'
import type { Session } from '../interfaces/http.interface.ts'
import {
	asArray,
	asObject,
	isJsonObject,
	malformed,
	readInteger,
	readNumber,
	readObject,
	readOptionalNumber,
	readString,
	readStringList,
} from './json.ts'
import type { JsonValue } from '../types/json.types.ts'

export function parseSession(json: JsonValue): Session {
	const body = asObject(json, 'respuesta')
	const token = readString(body, 'access_token', 'access_token')
	const expiresIn = readString(body, 'access_token_expires_in', 'access_token_expires_in')
	const expiresAt = NAIVE_UTC_DATETIME_PATTERN.test(expiresIn) ? Date.parse(`${expiresIn}Z`) : Number.NaN
	if (Number.isNaN(expiresAt)) throw malformed('access_token_expires_in', 'una fecha UTC sin zona')
	return { token, expiresAt }
}

export function parseContractIds(json: JsonValue): number[] {
	const data = asArray(isJsonObject(json) ? json.data : undefined, 'data')
	const ids = data.map((item, index) => {
		if (typeof item !== 'number' || !Number.isInteger(item)) throw malformed(`data[${index}]`, 'un ID entero')
		return item
	})
	const repeated = ids.find((id, index) => ids.indexOf(id) !== index)
	if (repeated !== undefined) throw malformed('data', `una lista sin repetidos (ID de contrato repetido: ${repeated})`)
	return ids
}

export function parseDebtLines(json: JsonValue): DebtLine[] {
	return asArray(json, 'respuesta').map((item, index) => {
		const path = `[${index}]`
		const row = asObject(item, path)
		const price = readString(row, 'precio_servicio', `${path}.precio_servicio`)
		if (!PLAN_PRICE_PATTERN.test(price)) throw malformed(`${path}.precio_servicio`, 'un precio numérico')
		return {
			contractId: readInteger(row, 'contrato_id', `${path}.contrato_id`),
			contractCode: readString(row, 'codigo', `${path}.codigo`),
			holderDocument: readString(row, 'identificacion_contrato', `${path}.identificacion_contrato`),
			holderName: readString(row, 'nombre_contrato', `${path}.nombre_contrato`),
			phone: readString(row, 'telefono', `${path}.telefono`),
			email: readString(row, 'email', `${path}.email`),
			status: readString(row, 'estado', `${path}.estado`),
			debt: readNumber(row, 'deuda', `${path}.deuda`),
			debtId: readString(row, 'deuda_id', `${path}.deuda_id`),
			debtDetail: readStringList(row, 'detalle_deuda', `${path}.detalle_deuda`),
			planName: readString(row, 'nombre_plan', `${path}.nombre_plan`),
			planPrice: Number(price),
			branchName: readString(row, 'nombre_sucursal', `${path}.nombre_sucursal`),
			currency: readString(row, 'moneda_sigla', `${path}.moneda_sigla`),
		}
	})
}

export function parseLedger(json: JsonValue): LedgerEntry[] {
	const data = asArray(isJsonObject(json) ? json.data : undefined, 'data')
	return data.map((item, index) => {
		const path = `data[${index}]`
		const row = asObject(item, path)
		const detail = readObject(row, 'detalle_pago', `${path}.detalle_pago`)
		const detailPath = `${path}.detalle_pago`
		return {
			invoiceId: readInteger(row, 'id_factura', `${path}.id_factura`),
			invoiceNumber: readString(row, 'num_factura', `${path}.num_factura`),
			issuedOn: readString(row, 'fecha_emision', `${path}.fecha_emision`),
			contractId: readInteger(row, 'id_contrato', `${path}.id_contrato`),
			payment: {
				contractId: readInteger(detail, 'id_contrato', `${detailPath}.id_contrato`),
				installmentId: readInteger(detail, 'id_cuota', `${detailPath}.id_cuota`),
				period: readString(detail, 'periodo_cuota', `${detailPath}.periodo_cuota`),
				fee: readNumber(detail, 'tarifa', `${detailPath}.tarifa`),
				paid: readNumber(detail, 'valor_pago', `${detailPath}.valor_pago`),
				discount: readNumber(detail, 'descuento', `${detailPath}.descuento`),
				balance: readNumber(detail, 'saldo_cuota', `${detailPath}.saldo_cuota`),
				creditNote: readOptionalNumber(detail, 'valor_nota_credito', `${detailPath}.valor_nota_credito`),
				additional: readOptionalNumber(detail, 'total_adicional', `${detailPath}.total_adicional`),
				usage: readOptionalNumber(detail, 'valor_uso', `${detailPath}.valor_uso`),
				nonUsage: readOptionalNumber(detail, 'valor_no_uso', `${detailPath}.valor_no_uso`),
			},
		}
	})
}

export function parseApiErrorMessage(json: JsonValue): string | null {
	if (Array.isArray(json)) {
		const messages = json.filter(isJsonObject).map(item => [item.field, item.message].filter(part => typeof part === 'string').join(': '))
		return messages.length > 0 ? messages.join('; ') : null
	}
	if (!isJsonObject(json)) return null
	const { detail } = json
	if (typeof detail === 'string') return detail
	if (isJsonObject(detail) && typeof detail.mensaje === 'string') return detail.mensaje
	return null
}
