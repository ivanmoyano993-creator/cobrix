import type { RunSummary } from '../../cobrix/domain/interfaces/run.interface.ts'
import { DRY_RUN_FIELD, DRY_RUN_VALUE, ROUTE } from '../constants/routes.constants.ts'
import { DRY_RUN_BADGE, RUN_KIND_LABEL, RUN_STATUS_BADGE, RUN_TRIGGER_LABEL } from '../constants/labels.constants.ts'
import { EMPTY_VALUE } from '../constants/ui.constants.ts'
import { dateTime } from '../format.ts'
import { html, type Raw } from '../html.ts'
import type { ActionButton, Badge, EmptyState, Tile } from '../interfaces/web.interface.ts'
import { pill } from '../layout.ts'

export function badge(value: Badge): Raw {
	return pill(value.label, value.tone)
}

export function tiles(items: readonly Tile[]): Raw {
	return html`<div class="tiles">${items.map(item => html`
		<div class="tile"><span>${item.label}</span><strong>${item.value}</strong>${item.hint ? html`<small>${item.hint}</small>` : ''}</div>`)}
	</div>`
}

export function facts(rows: ReadonlyArray<readonly [string, Raw | string]>): Raw {
	return html`<dl class="facts">${rows.map(([label, value]) => html`<dt>${label}</dt><dd>${value}</dd>`)}</dl>`
}

export function emptyState(state: EmptyState): Raw {
	return html`<div class="empty"><strong>${state.title}</strong><p>${state.text}</p>${state.action ?? ''}</div>`
}

export function actionButton(button: ActionButton): Raw {
	return html`<form class="inline" method="post" action="${button.action}"${button.confirm ? html` data-confirm="${button.confirm}"` : ''}>
		${button.dryRun ? html`<input type="hidden" name="${DRY_RUN_FIELD}" value="${DRY_RUN_VALUE}">` : ''}
		<button class="btn${button.primary ? ' primary' : ''}" type="submit"${button.disabled ? ' disabled' : ''}>${button.label}</button>
	</form>`
}

export function runLabel(run: RunSummary): Raw {
	return html`<a href="${ROUTE.Runs}/${run.id}">${RUN_KIND_LABEL[run.kind]}</a>${run.dryRun ? html` ${badge(DRY_RUN_BADGE)}` : ''}`
}

export function runsTable(runs: readonly RunSummary[]): Raw {
	return html`<div class="table-wrap"><table>
		<thead><tr><th>#</th><th>Tipo</th><th>Inicio</th><th>Origen</th><th>Estado</th><th>Resultado</th></tr></thead>
		<tbody>${runs.map(run => html`<tr>
			<td class="mono">${run.id}</td>
			<td>${runLabel(run)}</td>
			<td class="nowrap">${dateTime(run.startedAt)}</td>
			<td>${RUN_TRIGGER_LABEL[run.trigger]}</td>
			<td>${badge(RUN_STATUS_BADGE[run.status])}</td>
			<td class="muted">${run.error ?? run.summary ?? EMPTY_VALUE}</td>
		</tr>`)}</tbody>
	</table></div>`
}
