import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { RunInProgressError } from '../src/cobrix/application/run-in-progress-error.ts'
import { createCobrix } from '../src/cobrix/bootstrap.ts'
import { RUN_STATUS, RUN_TRIGGER } from '../src/cobrix/domain/constants/run.constants.ts'

const SANDBOX = { baseUrl: 'http://127.0.0.1:1/api/v1', username: 'cobrix', password: 'cobrix-sandbox' }
const MANUAL = { dryRun: true, trigger: RUN_TRIGGER.Manual }

describe('createCobrix', () => {
	let dir: string

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'cobrix-bootstrap-'))
	})

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true })
	})

	it('crea la base y la clave en la carpeta de datos y precarga el proveedor si no hay configuración', () => {
		const cobrix = createCobrix({ dataDir: dir, secretKeyEnv: undefined, defaultProvider: SANDBOX })
		assert.ok(existsSync(join(dir, 'cobrix.sqlite')))
		assert.ok(existsSync(join(dir, 'cobrix.key')))
		assert.deepEqual(cobrix.persistence.settings.get().provider, SANDBOX)
		cobrix.close()
	})

	it('nunca pisa una configuración guardada y la lee de nuevo al reiniciar', () => {
		const first = createCobrix({ dataDir: dir, secretKeyEnv: undefined, defaultProvider: SANDBOX })
		const saved = { ...first.persistence.settings.get(), provider: { ...SANDBOX, password: 'otra-clave' } }
		first.persistence.settings.save(saved)
		first.close()
		const second = createCobrix({ dataDir: dir, secretKeyEnv: undefined, defaultProvider: SANDBOX })
		assert.equal(second.persistence.settings.get().provider.password, 'otra-clave')
		second.close()
	})

	it('usa la clave de COBRIX_SECRET_KEY si está definida', () => {
		const cobrix = createCobrix({ dataDir: dir, secretKeyEnv: randomBytes(32).toString('base64'), defaultProvider: SANDBOX })
		assert.equal(existsSync(join(dir, 'cobrix.key')), false)
		cobrix.close()
	})

	it('las corridas manuales quedan registradas y no se pisan entre sí', async () => {
		const cobrix = createCobrix({ dataDir: dir, secretKeyEnv: undefined, defaultProvider: SANDBOX })
		const [first, second] = await Promise.allSettled([cobrix.runImport(MANUAL), cobrix.runImport(MANUAL)])
		assert.equal(first.status, 'fulfilled')
		if (first.status === 'fulfilled') assert.equal(first.value.status, RUN_STATUS.Failed)
		assert.equal(second.status, 'rejected')
		if (second.status === 'rejected') assert.ok(second.reason instanceof RunInProgressError)
		cobrix.close()
	})
})
