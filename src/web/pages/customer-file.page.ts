import { INVOICE_STATUS } from '../../cobrix/domain/constants/invoice.constants.ts'
import type { HistoryEvent } from '../../cobrix/domain/interfaces/history.interface.ts'
import type { ContractInfo } from '../../cobrix/domain/interfaces/import.interface.ts'
import type { Invoice } from '../../cobrix/domain/interfaces/invoice.interface.ts'
import type { CustomerFile } from '../../cobrix/domain/interfaces/queries.interface.ts'
import { badge, emptyState, facts, tiles } from '../components/ui.ts'
import { INVOICE_DATES_NOTE } from '../constants/copy.constants.ts'
import { HISTORY_EVENT_LABEL, INVOICE_STATUS_BADGE, PERSON_KIND_LONG_LABEL } from '../constants/labels.constants.ts'
import { HTTP_STATUS, ROUTE } from '../constants/routes.constants.ts'
import { CONTRACT_STATUS_TONE } from '../constants/ui.constants.ts'
import { date, dateTime, formatDocument, usd } from '../format.ts'
import { html, type Raw } from '../html.ts'
import type { Page } from '../interfaces/web.interface.ts'
import { pill } from '../layout.ts'

export function customerFilePage(file: CustomerFile): Page {
	const { customer, contracts, invoices, history } = file
	const open = invoices.filter(invoice => invoice.status === INVOICE_STATUS.Open)
	return {
		status: HTTP_STATUS.Ok,
		title: customer.name,
		active: ROUTE.Customers,
		body: html`
			<a class="back" href="${ROUTE.Customers}">← Clientes</a>
			<div class="head"><div>
				<h1>${customer.name}</h1>
				<p>${PERSON_KIND_LONG_LABEL[customer.personKind]} · <span class="mono">${formatDocument(customer.id)}</span></p>
			</div></div>
			${tiles([
				{ label: 'Deuda abierta', value: usd(open.reduce((sum, invoice) => sum + invoice.balanceCents, 0)) },
				{ label: 'Facturas abiertas', value: String(open.length) },
				{ label: 'Facturas pagadas', value: String(invoices.length - open.length) },
				{ label: 'Contratos', value: String(contracts.length) },
			])}
			<div class="cards">
				<section class="card">
					<header><h2>Datos del cliente</h2></header>
					<div class="body">${facts([
						['ID en Cobrix', html`<span class="mono">${customer.id}</span>`],
						['Documento', html`<span class="mono">${formatDocument(customer.id)}</span>`],
						['Correo', customer.email.toLowerCase()],
						['Teléfono', customer.phone],
						['Origen', customer.origin],
						['Creado', dateTime(customer.createdAt)],
					])}</div>
				</section>
				<section class="card">
					<header><h2>Contratos en el administrador</h2></header>
					${contractsTable(contracts)}
				</section>
			</div>
			<section class="card">
				<header><div><h2>Facturas</h2><p>Una factura de Cobrix por cada cuota del administrador.</p></div></header>
				${invoices.length > 0 ? invoicesTable(invoices) : emptyState({ title: 'Sin facturas', text: 'Este cliente todavía no tiene facturas importadas.', action: null })}
				<div class="body"><p class="note">${INVOICE_DATES_NOTE}</p></div>
			</section>
			<section class="card">
				<header><h2>Historial</h2></header>
				<div class="body">${historyTimeline(history)}</div>
			</section>`,
	}
}

function contractsTable(contracts: readonly ContractInfo[]): Raw {
	return html`<div class="table-wrap"><table>
		<thead><tr><th>Contrato</th><th>Estado</th><th>Plan</th><th class="num">Precio</th><th>Sucursal</th></tr></thead>
		<tbody>${contracts.map(contract => html`<tr>
			<td class="mono">${contract.id}</td>
			<td>${pill(contract.status, CONTRACT_STATUS_TONE[contract.status])}</td>
			<td>${contract.plan}</td>
			<td class="num">${usd(contract.priceCents)}/mes</td>
			<td>${contract.branch}</td>
		</tr>`)}</tbody>
	</table></div>`
}

function invoicesTable(invoices: readonly Invoice[]): Raw {
	return html`<div class="table-wrap"><table>
		<thead><tr><th>Factura</th><th>Cuota en el administrador</th><th>Periodo</th><th>Vence</th><th>Corte</th><th class="num">Total</th><th class="num">Saldo</th><th>Estado</th></tr></thead>
		<tbody>${invoices.map(invoiceRow)}</tbody>
	</table></div>`
}

function invoiceRow(invoice: Invoice): Raw {
	return html`<tr>
		<td class="mono">${invoice.number}</td>
		<td><span class="mono">${invoice.externalId}</span><span class="sub">contrato ${invoice.contractId}</span></td>
		<td class="nowrap">${date(invoice.period)}</td>
		<td class="nowrap">${date(invoice.dueDate)}</td>
		<td class="nowrap">${date(invoice.cutoffDate)}</td>
		<td class="num">${usd(invoice.totalCents)}</td>
		<td class="num">${usd(invoice.balanceCents)}</td>
		<td>${badge(INVOICE_STATUS_BADGE[invoice.status])}${paidNote(invoice)}</td>
	</tr>`
}

function paidNote(invoice: Invoice): Raw | string {
	if (invoice.status !== INVOICE_STATUS.Paid) return ''
	return html`<span class="sub">${date(invoice.paidAt)} · factura ${invoice.paidByInvoiceNumber ?? ''}</span>`
}

function historyTimeline(history: readonly HistoryEvent[]): Raw {
	if (history.length === 0) return html`<p class="muted">Sin movimientos todavía.</p>`
	return html`<ol class="timeline">${history.toReversed().map(event => html`<li>
		<time datetime="${event.occurredAt}">${dateTime(event.occurredAt)}</time>
		<div><strong>${HISTORY_EVENT_LABEL[event.kind]}</strong><p>${event.detail}</p></div>
	</li>`)}</ol>`
}
