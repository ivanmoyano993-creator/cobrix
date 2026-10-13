import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { createSecretBox, loadSecretKey } from '../../../src/cobrix/infrastructure/persistence/secret-box.ts'

describe('createSecretBox', () => {
	const box = createSecretBox(randomBytes(32))

	it('cifra y descifra', () => {
		assert.equal(box.decrypt(box.encrypt('cobrix-sandbox')), 'cobrix-sandbox')
		assert.equal(box.decrypt(box.encrypt('')), '')
	})

	it('la misma contraseña nunca produce el mismo texto cifrado', () => {
		assert.notEqual(box.encrypt('cobrix-sandbox'), box.encrypt('cobrix-sandbox'))
	})

	it('detecta un valor alterado', () => {
		const sealed = box.encrypt('cobrix-sandbox')
		const tampered = `${sealed.slice(0, -2)}${sealed.endsWith('AA') ? 'BB' : 'AA'}`
		assert.throws(() => box.decrypt(tampered))
	})

	it('con otra clave no descifra', () => {
		assert.throws(() => createSecretBox(randomBytes(32)).decrypt(box.encrypt('cobrix-sandbox')))
	})

	it('rechaza un formato desconocido', () => {
		assert.throws(() => box.decrypt('cobrix-sandbox'))
		assert.throws(() => box.decrypt('v9:a:b:c'))
	})

	it('rechaza una clave que no es de 32 bytes', () => {
		assert.throws(() => createSecretBox(randomBytes(16)), /32 bytes/)
	})
})

describe('loadSecretKey', () => {
	let dir: string
	let keyPath: string

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'cobrix-key-'))
		keyPath = join(dir, 'cobrix.key')
	})

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true })
	})

	it('usa la variable de entorno si está definida y no crea archivo', () => {
		const key = randomBytes(32)
		assert.deepEqual(loadSecretKey({ envValue: key.toString('base64'), keyPath }), key)
		assert.equal(existsSync(keyPath), false)
	})

	it('rechaza una variable de entorno que no es una clave de 32 bytes en base64', () => {
		assert.throws(() => loadSecretKey({ envValue: 'corta', keyPath }), /COBRIX_SECRET_KEY/)
	})

	it('sin variable de entorno genera el archivo una vez y lo reutiliza', () => {
		const first = loadSecretKey({ envValue: undefined, keyPath })
		assert.equal(first.length, 32)
		assert.ok(existsSync(keyPath))
		assert.deepEqual(loadSecretKey({ envValue: undefined, keyPath }), first)
		assert.equal(readFileSync(keyPath, 'utf8').trim(), first.toString('base64'))
	})

	it('rechaza un archivo de clave corrupto en lugar de pisarlo', () => {
		writeFileSync(keyPath, 'no-es-una-clave')
		assert.throws(() => loadSecretKey({ envValue: undefined, keyPath }), /cobrix\.key/)
		assert.equal(readFileSync(keyPath, 'utf8'), 'no-es-una-clave')
	})
})
