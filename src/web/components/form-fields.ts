import { html, type Raw } from '../html.ts'
import type { Choice, FieldOptions } from '../interfaces/web.interface.ts'

export function field(name: string, label: string, value: string, error: string | undefined, options: FieldOptions = {}): Raw {
	return html`<label class="field${error ? ' invalid' : ''}">${label}
		<input type="${options.type ?? 'text'}" name="${name}" value="${value}"${attributes(options)}${error ? html` aria-invalid="true"` : ''}>
		${fieldNote(options.hint, error)}
	</label>`
}

export function checkboxGroup(name: string, legend: string, choices: readonly Choice[], selected: readonly string[], error: string | undefined, hint: string): Raw {
	return html`<fieldset${error ? html` class="invalid"` : ''}>
		<legend>${legend}</legend>
		${choices.map(choice => html`<label><input type="checkbox" name="${name}" value="${choice.value}"${selected.includes(choice.value) ? html` checked` : ''}> ${choice.label}</label>`)}
		<div class="fieldset-note">${fieldNote(hint, error)}</div>
	</fieldset>`
}

export function selectField(name: string, label: string, choices: readonly Choice[], selected: string, error: string | undefined, hint: string): Raw {
	return html`<label class="field${error ? ' invalid' : ''}">${label}
		<select name="${name}"${error ? html` aria-invalid="true"` : ''}>${choices.map(choice => html`<option value="${choice.value}"${choice.value === selected ? html` selected` : ''}>${choice.label}</option>`)}</select>
		${fieldNote(hint, error)}
	</label>`
}

export function toggle(name: string, label: string, checked: boolean, hint: string): Raw {
	return html`<label class="toggle"><input type="checkbox" name="${name}"${checked ? html` checked` : ''}> <span><strong>${label}</strong><small>${hint}</small></span></label>`
}

function fieldNote(hint: string | undefined, error: string | undefined): Raw | string {
	if (error) return html`<small class="error" role="alert">${error}</small>`
	return hint ? html`<small>${hint}</small>` : ''
}

function attributes(options: FieldOptions): Raw {
	return html`${options.placeholder ? html` placeholder="${options.placeholder}"` : ''}${options.inputMode ? html` inputmode="${options.inputMode}"` : ''}${options.autocomplete ? html` autocomplete="${options.autocomplete}"` : ''}${options.min === undefined ? '' : html` min="${options.min}"`}${options.max === undefined ? '' : html` max="${options.max}"`}`
}
