import { PROVIDER_ERROR_KIND } from '../../domain/constants/provider.constants.ts'
import type { BillingProvider, ProviderConfig } from '../../domain/interfaces/provider.interface.ts'
import { ProviderError } from '../../domain/provider-error.ts'
import {
	API_PATH,
	HTTP_UNAUTHORIZED,
	LEDGER_SEARCH_TYPE,
	REQUEST_TIMEOUT_MS,
	TOKEN_RENEWAL_MARGIN_MS,
	URL_SEPARATOR,
} from '../constants/http.constants.ts'
import type { ProviderDeps, Session } from '../interfaces/http.interface.ts'
import { parseJson } from './json.ts'
import { parseApiErrorMessage, parseContractIds, parseDebtLines, parseLedger, parseSession } from './parsers.ts'
import type { JsonValue } from '../types/json.types.ts'
import type { QueryParams } from '../types/http.types.ts'

export function createHttpBillingProvider(config: ProviderConfig, deps: ProviderDeps = {}): BillingProvider {
	const fetchApi = deps.fetch ?? fetch
	const now = deps.now ?? Date.now
	const baseUrl = withoutTrailingSlashes(config.baseUrl)
	let session: Session | null = null

	async function send(path: string, init: RequestInit): Promise<Response> {
		try {
			return await fetchApi(`${baseUrl}${path}`, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error)
			throw new ProviderError(PROVIDER_ERROR_KIND.Network, `No se pudo conectar con el administrador de facturas en ${baseUrl}: ${reason}.`)
		}
	}

	async function login(): Promise<Session> {
		const response = await send(API_PATH.Login, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ user_name: config.username, password: config.password }),
		})
		const body = await readBody(response)
		if (!response.ok) {
			const reason = parseApiErrorMessage(body) ?? `HTTP ${response.status}`
			throw new ProviderError(PROVIDER_ERROR_KIND.Auth, `El administrador rechazó el inicio de sesión: ${reason}.`, response.status)
		}
		session = parseSession(body)
		return session
	}

	async function currentSession(): Promise<Session> {
		if (session !== null && now() < session.expiresAt - TOKEN_RENEWAL_MARGIN_MS) return session
		return login()
	}

	function authorizedGet(path: string, query: QueryParams, active: Session): Promise<Response> {
		const search = new URLSearchParams(query).toString()
		return send(search ? `${path}?${search}` : path, { headers: { authorization: `Bearer ${active.token}` } })
	}

	async function get(path: string, query: QueryParams): Promise<JsonValue> {
		let response = await authorizedGet(path, query, await currentSession())
		if (response.status === HTTP_UNAUTHORIZED) response = await authorizedGet(path, query, await login())
		const body = await readBody(response)
		if (response.status === HTTP_UNAUTHORIZED) {
			throw new ProviderError(PROVIDER_ERROR_KIND.Auth, `El administrador rechazó el token: ${parseApiErrorMessage(body) ?? 'sin detalle'}.`, response.status)
		}
		if (!response.ok) {
			throw new ProviderError(PROVIDER_ERROR_KIND.Http, `El administrador respondió HTTP ${response.status} en ${path}: ${parseApiErrorMessage(body) ?? 'sin detalle'}.`, response.status)
		}
		return body
	}

	return {
		async listContractIds() {
			return parseContractIds(await get(API_PATH.ContractIds, {}))
		},
		async getContractDebt(contractId) {
			return parseDebtLines(await get(API_PATH.ContractDebt, { id_contrato: String(contractId) }))
		},
		async getLedger(contractId, range) {
			return parseLedger(await get(API_PATH.Ledger, {
				id_contrato: String(contractId),
				tipo_busqueda: LEDGER_SEARCH_TYPE,
				fecha_inicio: range.from,
				fecha_fin: range.to,
			}))
		},
	}
}

async function readBody(response: Response): Promise<JsonValue> {
	const body = parseJson(await response.text())
	if (body === null) {
		throw new ProviderError(PROVIDER_ERROR_KIND.Malformed, `La API respondió algo que no es JSON (HTTP ${response.status}).`, response.status)
	}
	return body
}

function withoutTrailingSlashes(url: string): string {
	let end = url.length
	while (end > 0 && url[end - 1] === URL_SEPARATOR) end--
	return url.slice(0, end)
}
