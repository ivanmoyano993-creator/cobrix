import { readFileSync } from 'node:fs'

import { HTTP_STATUS, ROUTE } from '../constants/routes.constants.ts'
import { html } from '../html.ts'
import type { Page, ScreenPlaceholder } from '../interfaces/web.interface.ts'
import { pill } from '../layout.ts'

export function placeholderPage(screen: ScreenPlaceholder, active: string): Page {
	return {
		status: HTTP_STATUS.Ok,
		title: screen.title,
		active,
		body: html`
			<div class="head"><div><h1>${screen.title} ${pill('Por implementar', 'warn')}</h1><p>${screen.purpose}</p></div></div>
			<section class="card"><header><h2>Qué debe hacer esta pantalla</h2><a href="${ROUTE.Assignment}">Enunciado §${screen.section}</a></header>
				<div class="body"><ul class="todo">${screen.todo.map(item => html`<li>${item}</li>`)}</ul></div></section>`,
	}
}

export function assignmentPage(path: string): Page {
	return {
		status: HTTP_STATUS.Ok,
		title: 'Enunciado',
		active: '',
		body: html`<div class="head"><div><h1>Enunciado</h1><p>También en <span class="mono">docs/ENUNCIADO.md</span>.</p></div></div>
			<section class="card"><div class="body"><pre class="doc">${readAssignment(path)}</pre></div></section>`,
	}
}

export function notFoundPage(title: string, back: string, backLabel: string): Page {
	return {
		status: HTTP_STATUS.NotFound,
		title,
		active: '',
		body: html`<div class="head"><div><h1>${title}</h1><p>Puede que el enlace sea viejo o que el registro ya no exista.</p></div></div>
			<p><a href="${back}">← Volver a ${backLabel}</a></p>`,
	}
}

function readAssignment(path: string): string {
	try {
		return readFileSync(path, 'utf8')
	} catch {
		return 'No se encontró docs/ENUNCIADO.md.'
	}
}
