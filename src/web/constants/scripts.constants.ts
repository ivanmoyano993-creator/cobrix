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
	for (const button of form.querySelectorAll('button[type=submit]')) {
		button.disabled = true
		button.dataset.label = button.textContent
		button.textContent = 'Corriendo…'
	}
})
`
