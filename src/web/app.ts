import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'

import { RunInProgressError } from '../cobrix/application/run-in-progress-error.ts'
import { RUN_KIND, RUN_TRIGGER } from '../cobrix/domain/constants/run.constants.ts'
import type { Settings } from '../cobrix/domain/interfaces/settings.interface.ts'
import type { RunKind } from '../cobrix/domain/types/run.types.ts'
import { COMPANY_FALLBACK } from './constants/labels.constants.ts'
import {
	CUSTOMER_FILE_PATTERN,
	DRY_RUN_FIELD,
	DRY_RUN_VALUE,
	HTTP_STATUS,
	OUTCOME_FILTER_PARAM,
	ROUTE,
	RUN_DETAIL_PATTERN,
} from './constants/routes.constants.ts'
import { CUSTOMER_FILE_SCREEN, PENDING_SCREENS } from './constants/screens.constants.ts'
import { CSS } from './constants/styles.constants.ts'
import { TONE } from './constants/ui.constants.ts'
import { html } from './html.ts'
import { normalizePath, readFlash, readForm, redirect, send, sendHtml, withFlash } from './http.ts'
import type { AppDeps, Flash, Page } from './interfaces/web.interface.ts'
import { isRunItemOutcome } from './labels.ts'
import { layout } from './layout.ts'
import { assignmentPage, notFoundPage, placeholderPage } from './pages/placeholder.page.ts'
import { runDetailPage } from './pages/run-detail.page.ts'
import { summaryPage } from './pages/summary.page.ts'
import { syncPage } from './pages/sync.page.ts'

export function createApp(deps: AppDeps): Server {
	return createServer((req, res) => {
		route(deps, req, res).catch((error: Error) => {
			console.error('[panel]', error)
			if (!res.headersSent) render(deps, res, errorPage(error), undefined)
		})
	})
}

async function route(deps: AppDeps, req: IncomingMessage, res: ServerResponse): Promise<void> {
	const url = new URL(req.url ?? ROUTE.Home, 'http://panel.local')
	const path = normalizePath(url.pathname)
	if (req.method === 'POST') return handlePost(deps, req, res, path)
	if (path === ROUTE.Stylesheet) return send(res, HTTP_STATUS.Ok, CSS, 'text/css; charset=utf-8')
	render(deps, res, getPage(deps, path, url), readFlash(url))
}

function getPage(deps: AppDeps, path: string, url: URL): Page {
	if (path === ROUTE.Home) return summaryPage(deps, deps.cobrix.persistence.settings.get())
	if (path === ROUTE.Sync) return syncPage(deps)
	if (path === ROUTE.Assignment) return assignmentPage(deps.assignmentPath)
	const runId = RUN_DETAIL_PATTERN.exec(path)?.[1]
	if (runId !== undefined) return runPage(deps, Number(runId), url)
	if (CUSTOMER_FILE_PATTERN.test(path)) return pendingPage(CUSTOMER_FILE_SCREEN, ROUTE.Customers)
	if (PENDING_SCREENS[path]) return pendingPage(path, path)
	return notFoundPage('No encontrado', ROUTE.Home, 'Resumen')
}

function runPage(deps: AppDeps, runId: number, url: URL): Page {
	const run = deps.cobrix.persistence.runs.get(runId)
	if (run === null) return notFoundPage(`La corrida #${runId} no existe`, ROUTE.Sync, 'Sincronización')
	const filter = url.searchParams.get(OUTCOME_FILTER_PARAM) ?? ''
	return runDetailPage(run, isRunItemOutcome(filter) ? filter : null)
}

function pendingPage(screen: string, active: string): Page {
	const placeholder = PENDING_SCREENS[screen]
	return placeholder ? placeholderPage(placeholder, active) : notFoundPage('No encontrado', ROUTE.Home, 'Resumen')
}

async function handlePost(deps: AppDeps, req: IncomingMessage, res: ServerResponse, path: string): Promise<void> {
	if (path === ROUTE.Import) return startRun(deps, req, res, RUN_KIND.Import)
	if (path === ROUTE.UpdatePaid) return startRun(deps, req, res, RUN_KIND.UpdatePaid)
	render(deps, res, notFoundPage('No encontrado', ROUTE.Home, 'Resumen'), undefined)
}

async function startRun(deps: AppDeps, req: IncomingMessage, res: ServerResponse, kind: RunKind): Promise<void> {
	const form = await readForm(req)
	const request = { dryRun: form.get(DRY_RUN_FIELD) === DRY_RUN_VALUE, trigger: RUN_TRIGGER.Manual }
	try {
		const run = kind === RUN_KIND.Import ? await deps.cobrix.runImport(request) : await deps.cobrix.runUpdatePaid(request)
		redirect(res, `${ROUTE.Runs}/${run.id}`)
	} catch (error) {
		if (!(error instanceof RunInProgressError)) throw error
		redirect(res, withFlash(ROUTE.Sync, { tone: TONE.Warn, text: error.message }))
	}
}

function render(deps: AppDeps, res: ServerResponse, page: Page, flash: Flash | undefined): void {
	sendHtml(res, page.status, layout({ title: page.title, active: page.active, body: page.body, flash, company: companyName(deps) }))
}

function companyName(deps: AppDeps): string {
	try {
		const settings: Settings = deps.cobrix.persistence.settings.get()
		return settings.company.name || COMPANY_FALLBACK
	} catch {
		return COMPANY_FALLBACK
	}
}

function errorPage(error: Error): Page {
	return {
		status: HTTP_STATUS.ServerError,
		title: 'Algo falló',
		active: '',
		body: html`<div class="head"><div><h1>Algo falló</h1><p>No se pudo mostrar esta pantalla. Vuelve a intentarlo; si sigue fallando, revisa la configuración.</p></div></div>
			<div class="alert" role="alert"><strong>${error.message}</strong></div>
			<p><a href="${ROUTE.Home}">← Volver al Resumen</a></p>`,
	}
}
