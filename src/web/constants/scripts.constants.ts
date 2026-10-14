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
