import { RUN_STATUS } from '../../cobrix/domain/constants/run.constants.ts'
import type { Run, RunItem } from '../../cobrix/domain/interfaces/run.interface.ts'
import type { RunItemOutcome } from '../../cobrix/domain/types/run.types.ts'
import { badge, emptyState, tiles } from '../components/ui.ts'
import { FAILED_RUN_HINT, NO_ITEMS } from '../constants/copy.constants.ts'
import { COUNTERS_TITLE, DRY_RUN_BADGE, HIGHLIGHT_COUNTERS, RUN_KIND_LABEL, RUN_STATUS_BADGE, RUN_TRIGGER_LABEL } from '../constants/labels.constants.ts'
import { HTTP_STATUS, OUTCOME_FILTER_PARAM, ROUTE } from '../constants/routes.constants.ts'
import { EMPTY_VALUE } from '../constants/ui.constants.ts'
import { date, dateTime, duration, usd } from '../format.ts'
import { html, type Raw } from '../html.ts'
import type { Page } from '../interfaces/web.interface.ts'
import { counterLabel, counterValue, orderedCounters, outcomeBadge } from '../labels.ts'

export function runDetailPage(run: Run, filter: RunItemOutcome | null): Page {
	const title = `${RUN_KIND_LABEL[run.kind]} #${run.id}`
	return {
		status: HTTP_STATUS.Ok,
		title,
		active: ROUTE.Sync,
		body: html`
			<a class="back" href="${ROUTE.Sync}">← Sincronización</a>
			<div class="head"><div>
				<h1>${title} ${badge(RUN_STATUS_BADGE[run.status])} ${run.dryRun ? badge(DRY_RUN_BADGE) : ''}</h1>
				<p>${dateTime(run.startedAt)} · ${RUN_TRIGGER_LABEL[run.trigger]} · ${duration(run.startedAt, run.finishedAt)}</p>
				${run.summary ? html`<p><strong>${run.summary}</strong></p>` : ''}
			</div></div>
			${run.status === RUN_STATUS.Failed ? failure(run) : ''}
			${highlights(run)}
			${countersCard(run)}
			${itemsCard(run, filter)}`,
	}
}

function failure(run: Run): Raw {
	return html`<div class="alert" role="alert"><strong>${run.error ?? 'La corrida falló.'}</strong><span>${FAILED_RUN_HINT} <a href="${ROUTE.Settings}">Ir a Configuración</a></span></div>`
}

function highlights(run: Run): Raw | string {
	if (Object.keys(run.counters).length === 0) return ''
	return tiles(HIGHLIGHT_COUNTERS[run.kind].map(name => ({
		label: counterLabel(name, run.dryRun),
		value: counterValue(name, run.counters[name] ?? 0),
	})))
}

function countersCard(run: Run): Raw | string {
	const entries = orderedCounters(run.counters)
	if (entries.length === 0) return ''
	return html`<section class="card">
		<header><h2>${COUNTERS_TITLE}</h2></header>
		<div class="table-wrap"><table><tbody>${entries.map(([name, value]) => counterRow(name, value, run.dryRun))}</tbody></table></div>
	</section>`
}

function counterRow(name: string, value: number, dryRun: boolean): Raw {
	return html`<tr><td>${counterLabel(name, dryRun)}<br><small class="mono muted">${name}</small></td><td class="num">${counterValue(name, value)}</td></tr>`
}

function itemsCard(run: Run, filter: RunItemOutcome | null): Raw | string {
	if (run.status === RUN_STATUS.Failed) return ''
	const items = filter === null ? run.items : run.items.filter(item => item.outcome === filter)
	return html`<section class="card">
		<header><div><h2>Detalle</h2><p>Una fila por cuota con su resultado y el motivo.</p></div>${outcomeChips(run, filter)}</header>
		${run.items.length === 0 ? emptyState({ title: 'Sin filas', text: NO_ITEMS, action: null }) : itemsTable(items, run.dryRun)}
	</section>`
}

function outcomeChips(run: Run, filter: RunItemOutcome | null): Raw {
	const counts = new Map<RunItemOutcome, number>()
	for (const item of run.items) counts.set(item.outcome, (counts.get(item.outcome) ?? 0) + 1)
	const base = `${ROUTE.Runs}/${run.id}`
	return html`<nav class="chips" aria-label="Filtrar por resultado">
		<a href="${base}"${filter === null ? html` aria-current="true"` : ''}>Todas (${run.items.length})</a>
		${[...counts].map(([outcome, count]) => chip(base, outcome, count, filter === outcome, run.dryRun))}
	</nav>`
}

function chip(base: string, outcome: RunItemOutcome, count: number, current: boolean, dryRun: boolean): Raw {
	return html`<a href="${base}?${OUTCOME_FILTER_PARAM}=${outcome}"${current ? html` aria-current="true"` : ''}>${outcomeBadge(outcome, dryRun).label} (${count})</a>`
}

function itemsTable(items: readonly RunItem[], dryRun: boolean): Raw {
	return html`<div class="table-wrap"><table>
		<thead><tr><th>Contrato</th><th>Cuota</th><th>Cliente</th><th>Periodo</th><th>Resultado</th><th>Motivo</th><th class="num">Monto</th></tr></thead>
		<tbody>${items.map(item => itemRow(item, dryRun))}</tbody>
	</table></div>`
}

function itemRow(item: RunItem, dryRun: boolean): Raw {
	return html`<tr>
		<td class="mono">${item.contractId ?? EMPTY_VALUE}</td>
		<td class="mono">${item.externalId ?? EMPTY_VALUE}</td>
		<td>${item.customerName ?? EMPTY_VALUE}</td>
		<td class="nowrap">${date(item.period)}</td>
		<td>${badge(outcomeBadge(item.outcome, dryRun))}</td>
		<td class="muted">${item.detail}</td>
		<td class="num">${item.amountCents === null ? EMPTY_VALUE : usd(item.amountCents)}</td>
	</tr>`
}
