import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'

import { RunInProgressError } from '../cobrix/application/run-in-progress-error.ts'
import { settingsToInput } from '../cobrix/application/settings-form.ts'
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
	RUN_PROGRESS_PATTERN,
	SEARCH_PARAM,
	URL_PARSE_BASE,
} from './constants/routes.constants.ts'
import { SETTINGS_SAVED } from './constants/settings-form.constants.ts'
import { CSS } from './constants/styles.constants.ts'
import { TONE } from './constants/ui.constants.ts'
import { html } from './html.ts'
import { streamProgress } from './events.ts'
import { readSettingsForm } from './forms.ts'
import { normalizePath, readFlash, readForm, redirect, send, sendHtml, withFlash } from './http.ts'
import type { AppDeps, Flash, Page } from './interfaces/web.interface.ts'
import { isRunItemOutcome } from './labels.ts'
import { layout } from './layout.ts'
import { customerFilePage } from './pages/customer-file.page.ts'
import { requestedPage } from './components/pagination.ts'
import { customersPage } from './pages/customers.page.ts'
import { assignmentPage, notFoundPage } from './pages/static.page.ts'
import { runDetailPage } from './pages/run-detail.page.ts'
import { connectionNotice, settingsPage } from './pages/settings.page.ts'
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
	const url = new URL(req.url ?? ROUTE.Home, URL_PARSE_BASE)
	const path = normalizePath(url.pathname)
	if (req.method === 'POST') return handlePost(deps, req, res, path)
	if (path === ROUTE.Stylesheet) return send(res, HTTP_STATUS.Ok, CSS, 'text/css; charset=utf-8')
	const progressRunId = RUN_PROGRESS_PATTERN.exec(path)?.[1]
	if (progressRunId !== undefined) return streamProgress(deps.cobrix.progress, req, res, Number(progressRunId))
	render(deps, res, getPage(deps, path, url), readFlash(url))
}

function getPage(deps: AppDeps, path: string, url: URL): Page {
	if (path === ROUTE.Home) return summaryPage(deps, deps.cobrix.persistence.settings.get())
	if (path === ROUTE.Sync) return syncPage(deps, requestedPage(url))
	if (path === ROUTE.Assignment) return assignmentPage(deps.assignmentPath)
	if (path === ROUTE.Customers) return customersPage(deps, url.searchParams.get(SEARCH_PARAM) ?? '', requestedPage(url))
	const runId = RUN_DETAIL_PATTERN.exec(path)?.[1]
	if (runId !== undefined) return runPage(deps, Number(runId), url)
	const customerId = CUSTOMER_FILE_PATTERN.exec(path)?.[1]
	if (customerId !== undefined) return customerPage(deps, decodeURIComponent(customerId))
	if (path === ROUTE.Settings) return currentSettingsPage(deps)
	return notFoundPage('No encontrado', ROUTE.Home, 'Resumen')
}

function currentSettingsPage(deps: AppDeps): Page {
	const settings = deps.cobrix.currentSettings()
	return settingsPage({ values: settingsToInput(settings), errors: {}, notice: null, status: HTTP_STATUS.Ok, hasPassword: settings.provider.password !== '', dirty: false })
}

async function saveSettings(deps: AppDeps, req: IncomingMessage, res: ServerResponse): Promise<void> {
	const input = readSettingsForm(await readForm(req))
	const result = deps.cobrix.updateSettings(input)
	if (result.ok) return redirect(res, withFlash(ROUTE.Settings, { tone: TONE.Ok, text: SETTINGS_SAVED }))
	const hasPassword = deps.cobrix.currentSettings().provider.password !== ''
	render(deps, res, settingsPage({ values: input, errors: result.errors, notice: null, status: HTTP_STATUS.Unprocessable, hasPassword, dirty: true }), undefined)
}

async function checkConnection(deps: AppDeps, req: IncomingMessage, res: ServerResponse): Promise<void> {
	const input = readSettingsForm(await readForm(req))
	const check = await deps.cobrix.testConnection(input)
	const hasPassword = deps.cobrix.currentSettings().provider.password !== ''
	const errors = 'errors' in check ? check.errors : {}
	render(deps, res, settingsPage({ values: input, errors, notice: connectionNotice(check), status: HTTP_STATUS.Ok, hasPassword, dirty: true }), undefined)
}

function customerPage(deps: AppDeps, customerId: string): Page {
	const file = deps.cobrix.persistence.queries.getCustomerFile(customerId)
	if (file === null) return notFoundPage('Ese cliente no existe', ROUTE.Customers, 'Clientes')
	return customerFilePage(file)
}

function runPage(deps: AppDeps, runId: number, url: URL): Page {
	const run = deps.cobrix.persistence.runs.get(runId)
	if (run === null) return notFoundPage(`La corrida #${runId} no existe`, ROUTE.Sync, 'Sincronización')
	const filter = url.searchParams.get(OUTCOME_FILTER_PARAM) ?? ''
	return runDetailPage(run, isRunItemOutcome(filter) ? filter : null, requestedPage(url), deps.cobrix.progress.snapshot(runId))
}

async function handlePost(deps: AppDeps, req: IncomingMessage, res: ServerResponse, path: string): Promise<void> {
	if (path === ROUTE.Import) return startRun(deps, req, res, RUN_KIND.Import)
	if (path === ROUTE.UpdatePaid) return startRun(deps, req, res, RUN_KIND.UpdatePaid)
	if (path === ROUTE.Settings) return saveSettings(deps, req, res)
	if (path === ROUTE.TestConnection) return checkConnection(deps, req, res)
	render(deps, res, notFoundPage('No encontrado', ROUTE.Home, 'Resumen'), undefined)
}

async function startRun(deps: AppDeps, req: IncomingMessage, res: ServerResponse, kind: RunKind): Promise<void> {
	const form = await readForm(req)
	const request = { dryRun: form.get(DRY_RUN_FIELD) === DRY_RUN_VALUE, trigger: RUN_TRIGGER.Manual }
	try {
		const runId = kind === RUN_KIND.Import ? await deps.cobrix.startImport(request) : await deps.cobrix.startUpdatePaid(request)
		redirect(res, `${ROUTE.Runs}/${runId}`)
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
