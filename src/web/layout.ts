import { CONFIRM_SCRIPT } from './constants/scripts.constants.ts'
import { APP_NAME, APP_TAGLINE, NAV } from './constants/ui.constants.ts'
import { esc, html, type Raw } from './html.ts'
import type { LayoutInput } from './interfaces/web.interface.ts'
import type { Tone } from './types/web.types.ts'

export function layout(input: LayoutInput): string {
	return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(input.title)} · ${APP_NAME}</title>
<link rel="stylesheet" href="/app.css">
</head>
<body>
<div class="shell">
	<aside class="side">
		<div class="brand"><span class="mark">C</span><div><strong>${APP_NAME}</strong><small>${APP_TAGLINE}</small></div></div>
		<nav>${NAV.map(([href, label]) => `<a href="${href}"${input.active === href ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
		<div class="side-foot">${esc(input.company)}</div>
	</aside>
	<main class="main">
		${input.flash ? `<div class="flash ${input.flash.tone}" role="status">${esc(input.flash.text)}</div>` : ''}
		${input.body.html}
	</main>
</div>
<dialog id="confirm-dialog">
	<form method="dialog">
		<h2>Confirmar acción</h2>
		<p data-confirm-text></p>
		<div class="actions"><button class="btn" value="cancel">Cancelar</button><button class="btn primary" value="ok">Confirmar</button></div>
	</form>
</dialog>
<script>${CONFIRM_SCRIPT}</script>
</body>
</html>`
}

export function pill(label: string, tone: Tone): Raw {
	return html`<span class="pill ${tone}">${label}</span>`
}
