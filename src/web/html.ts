import { HTML_ESCAPES, HTML_SPECIAL_CHARACTERS } from './constants/ui.constants.ts'
import type { HtmlValue } from './types/web.types.ts'

export class Raw {
	readonly html: string

	constructor(markup: string) {
		this.html = markup
	}
}

export function raw(markup: string): Raw {
	return new Raw(markup)
}

export function esc(value: string | number): string {
	return String(value).replaceAll(HTML_SPECIAL_CHARACTERS, character => HTML_ESCAPES[character] ?? character)
}

export function html(strings: TemplateStringsArray, ...values: readonly HtmlValue[]): Raw {
	let out = strings[0] ?? ''
	values.forEach((value, index) => {
		out += render(value) + (strings[index + 1] ?? '')
	})
	return new Raw(out)
}

function render(value: HtmlValue): string {
	if (value instanceof Raw) return value.html
	if (isList(value)) return value.map(render).join('')
	if (value === undefined || value === null || value === false || value === true) return ''
	return esc(value)
}

function isList(value: HtmlValue): value is readonly HtmlValue[] {
	return Array.isArray(value)
}
