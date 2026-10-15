export const PROGRESS_SCRIPT = `
const progressCard = document.querySelector('[data-progress-url]')
if (progressCard instanceof HTMLElement && 'EventSource' in window) {
	const source = new EventSource(progressCard.dataset.progressUrl)
	const bar = progressCard.querySelector('progress')
	const count = progressCard.querySelector('[data-progress-count]')
	const label = progressCard.querySelector('[data-progress-label]')
	source.addEventListener('progress', event => {
		const progress = JSON.parse(event.data)
		if (progress.total) {
			bar.max = progress.total
			bar.value = progress.done
			count.textContent = progress.done + ' de ' + progress.total + ' contratos'
		}
		if (progress.label) label.textContent = progress.label
	})
	source.addEventListener('finished', () => {
		source.close()
		location.reload()
	})
	source.addEventListener('error', () => {
		source.close()
		setTimeout(() => location.reload(), 2000)
	})
}
`

export const CONFIRM_SCRIPT = `
document.addEventListener('submit', event => {
	const form = event.target
	if (!(form instanceof HTMLFormElement)) return
	const dialog = document.getElementById('confirm-dialog')
	if (form.dataset.confirm && form.dataset.confirmed !== '1' && dialog instanceof HTMLDialogElement) {
		event.preventDefault()
		dialog.querySelector('[data-confirm-text]').textContent = form.dataset.confirm
		dialog.returnValue = ''
		dialog.addEventListener('close', () => {
			if (dialog.returnValue !== 'ok') return
			form.dataset.confirmed = '1'
			form.requestSubmit()
		}, { once: true })
		dialog.showModal()
		return
	}
	if (form.method !== 'post') return
	for (const button of form.querySelectorAll('button[type=submit]')) {
		button.disabled = true
		button.dataset.label = button.textContent
		button.textContent = 'Corriendo…'
	}
})
`

export const SEARCH_SCRIPT = `
document.addEventListener('input', event => {
	const input = event.target
	if (!(input instanceof HTMLInputElement) || input.type !== 'search' || input.value !== '' || !input.form) return
	if (new URLSearchParams(location.search).get(input.name)) input.form.requestSubmit()
})
`

export const SETTINGS_SCRIPT = `
const settingsForm = document.querySelector('form[data-dirty]')
if (settingsForm instanceof HTMLFormElement) {
	const snapshot = () => new URLSearchParams(new FormData(settingsForm)).toString()
	const initial = snapshot()
	const save = settingsForm.querySelector('[data-save]')
	const discard = settingsForm.querySelector('[data-discard]')
	const note = settingsForm.querySelector('[data-dirty-note]')
	const sync = () => {
		const dirty = settingsForm.dataset.dirty === 'true' || snapshot() !== initial
		save.disabled = !dirty
		dirty ? discard.removeAttribute('aria-disabled') : discard.setAttribute('aria-disabled', 'true')
		note.hidden = !dirty
	}
	settingsForm.addEventListener('input', sync)
	settingsForm.addEventListener('change', sync)
	sync()
}
`
