import type { Settings } from '../../cobrix/domain/interfaces/settings.interface.ts'
import { providerFacts } from '../components/provider-facts.ts'
import { actionsCard } from '../components/run-actions.ts'
import { emptyState, runsTable, tiles } from '../components/ui.ts'
import { NO_RUNS, RUN_IN_PROGRESS_NOTE } from '../constants/copy.constants.ts'
import { HTTP_STATUS, ROUTE, SUMMARY_RUNS_LIMIT } from '../constants/routes.constants.ts'
import { usd } from '../format.ts'
import { html } from '../html.ts'
import type { AppDeps, Page } from '../interfaces/web.interface.ts'

export function summaryPage(deps: AppDeps, settings: Settings): Page {
	const { queries } = deps.cobrix.persistence
	const overview = queries.overview()
	const runs = queries.listRuns(SUMMARY_RUNS_LIMIT)
	const running = deps.cobrix.isRunning()
	return {
		status: HTTP_STATUS.Ok,
		title: 'Resumen',
		active: ROUTE.Home,
		body: html`
			<div class="head"><div><h1>Resumen</h1><p>Clientes y facturas que Cobrix trae del administrador de facturas del ISP, y los pagos que el ISP ya cobró.</p></div></div>
			${running ? html`<div class="flash info" role="status">${RUN_IN_PROGRESS_NOTE}</div>` : ''}
			${tiles([
				{ label: 'Clientes importados', value: String(overview.customers) },
				{ label: 'Contratos', value: String(overview.contracts) },
				{ label: 'Facturas abiertas', value: String(overview.openInvoices) },
				{ label: 'Facturas pagadas', value: String(overview.paidInvoices) },
				{ label: 'Por cobrar', value: usd(overview.receivableCents) },
			])}
			<div class="cards">
				<section class="card">
					<header><div><h2>Proveedor</h2><p>Administrador de facturas del ISP</p></div><a href="${ROUTE.Settings}">Editar configuración</a></header>
					<div class="body">${providerFacts(settings, deps.simulatorUrl)}</div>
				</section>
				${actionsCard(running)}
			</div>
			<section class="card">
				<header><h2>Últimas corridas</h2><a href="${ROUTE.Sync}">Ver todas</a></header>
				${runs.length > 0 ? runsTable(runs) : emptyState({ title: NO_RUNS.title, text: NO_RUNS.text, action: null })}
			</section>`,
	}
}
