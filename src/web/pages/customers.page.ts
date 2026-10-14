import { today } from '../../shared/dates.ts'
import type { CustomerRow } from '../../cobrix/domain/interfaces/queries.interface.ts'
import { emptyState } from '../components/ui.ts'
import { NO_CUSTOMERS, NO_MATCH_TEXT, OVERDUE_ALERT_DAYS } from '../constants/copy.constants.ts'
import { PERSON_KIND_LABEL } from '../constants/labels.constants.ts'
import { HTTP_STATUS, ROUTE, SEARCH_PARAM } from '../constants/routes.constants.ts'
import { date, daysBetween, formatDocument, plural, usd } from '../format.ts'
import { html, type Raw } from '../html.ts'
import type { AppDeps, Page } from '../interfaces/web.interface.ts'

export function customersPage(deps: AppDeps, search: string): Page {
	const term = search.trim()
	const rows = deps.cobrix.persistence.queries.listCustomers(term)
	return {
		status: HTTP_STATUS.Ok,
		title: 'Clientes',
		active: ROUTE.Customers,
		body: html`
			<div class="head">
				<div><h1>Clientes</h1><p>Un cliente por cédula o RIF del titular: los contratos del mismo titular quedan juntos. Ordenados por deuda.</p></div>
				${searchForm(term)}
			</div>
			<section class="card">
				<header><h2>${term === '' ? plural(rows.length, 'cliente', 'clientes') : plural(rows.length, 'resultado', 'resultados')}</h2>${term === '' ? '' : html`<a href="${ROUTE.Customers}">Ver todos</a>`}</header>
				${rows.length > 0 ? customersTable(rows) : emptyResult(term)}
			</section>`,
	}
}

function searchForm(term: string): Raw {
	return html`<form class="search" method="get" action="${ROUTE.Customers}" role="search">
		<input type="search" name="${SEARCH_PARAM}" value="${term}" placeholder="Nombre, cédula o RIF" aria-label="Buscar por nombre, cédula o RIF">
		<button class="btn" type="submit">Buscar</button>
	</form>`
}

function emptyResult(term: string): Raw {
	if (term === '') {
		return emptyState({ title: NO_CUSTOMERS.title, text: NO_CUSTOMERS.text, action: html`<a class="btn primary" href="${ROUTE.Sync}">Ir a Sincronización</a>` })
	}
	return emptyState({ title: `Ningún cliente coincide con «${term}»`, text: NO_MATCH_TEXT, action: null })
}

function customersTable(rows: readonly CustomerRow[]): Raw {
	const now = today()
	return html`<div class="table-wrap"><table>
		<thead><tr><th>Nombre</th><th class="wide-only">Documento</th><th class="wide-only">Tipo</th><th class="num wide-only">Contratos</th><th class="num wide-only">Abiertas</th><th class="num wide-only">Pagadas</th><th class="num">Deuda</th><th>Vencimiento más antiguo</th></tr></thead>
		<tbody>${rows.map(row => customerRow(row, now))}</tbody>
	</table></div>`
}

function customerRow(row: CustomerRow, now: string): Raw {
	return html`<tr>
		<td><a href="${ROUTE.Customers}/${encodeURIComponent(row.id)}">${row.name}</a></td>
		<td class="mono wide-only">${formatDocument(row.id)}</td>
		<td class="wide-only">${PERSON_KIND_LABEL[row.personKind]}</td>
		<td class="num wide-only">${row.contracts}</td>
		<td class="num wide-only">${row.openInvoices}</td>
		<td class="num wide-only">${row.paidInvoices}</td>
		<td class="num">${usd(row.debtCents)}</td>
		<td class="nowrap">${oldestDue(row.oldestDueDate, now)}</td>
	</tr>`
}

function oldestDue(dueDate: string | null, now: string): Raw | string {
	if (dueDate === null) return 'Al día'
	const days = daysBetween(dueDate, now)
	if (days <= 0) return html`${date(dueDate)}<span class="overdue">Vence hoy o después</span>`
	return html`${date(dueDate)}<span class="overdue${days > OVERDUE_ALERT_DAYS ? ' late' : ''}">${plural(days, 'día de atraso', 'días de atraso')}</span>`
}
