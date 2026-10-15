import type { PageRequest, Paged } from '../../cobrix/domain/interfaces/queries.interface.ts'
import { FIRST_PAGE, PAGE_PARAM } from '../constants/routes.constants.ts'
import { html, type Raw } from '../html.ts'
import type { PagerLink, PageView } from '../interfaces/web.interface.ts'

export function requestedPage(url: URL): number {
	const page = Number(url.searchParams.get(PAGE_PARAM))
	return Number.isInteger(page) && page > FIRST_PAGE ? page : FIRST_PAGE
}

export function loadPage<T>(requested: number, size: number, load: (request: PageRequest) => Paged<T>): PageView<T> {
	const paged = load({ page: requested, size })
	const last = lastPage(paged.total, size)
	if (requested <= last) return { ...paged, page: requested, size }
	return { ...load({ page: last, size }), page: last, size }
}

export function sliceItems<T>(items: readonly T[]): (request: PageRequest) => Paged<T> {
	return request => {
		const start = (request.page - FIRST_PAGE) * request.size
		return { items: items.slice(start, start + request.size), total: items.length }
	}
}

export function pager<T>(view: PageView<T>, link: PagerLink): Raw | string {
	const last = lastPage(view.total, view.size)
	if (last === FIRST_PAGE) return ''
	const from = (view.page - FIRST_PAGE) * view.size + 1
	const to = from + view.items.length - 1
	return html`<nav class="pager" aria-label="Paginación">
		<span class="muted">${from}–${to} de ${view.total}</span>
		<span class="actions">
			${pageLink(link, view.page - 1, view.page > FIRST_PAGE, '← Anterior')}
			<span class="muted">Página ${view.page} de ${last}</span>
			${pageLink(link, view.page + 1, view.page < last, 'Siguiente →')}
		</span>
	</nav>`
}

function pageLink(link: PagerLink, page: number, enabled: boolean, label: string): Raw {
	if (!enabled) return html`<span class="btn small" aria-disabled="true">${label}</span>`
	return html`<a class="btn small" href="${pageHref(link, page)}">${label}</a>`
}

function pageHref(link: PagerLink, page: number): string {
	const params = new URLSearchParams(Object.entries(link.params).filter(([, value]) => value !== ''))
	if (page > FIRST_PAGE) params.set(PAGE_PARAM, String(page))
	const query = params.toString()
	return query === '' ? link.path : `${link.path}?${query}`
}

function lastPage(total: number, size: number): number {
	return Math.max(FIRST_PAGE, Math.ceil(total / size))
}
