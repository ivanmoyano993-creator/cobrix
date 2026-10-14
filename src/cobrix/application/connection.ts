import type { BillingProvider } from '../domain/interfaces/provider.interface.ts'
import type { ConnectionResult } from './types/settings.types.ts'

export async function testConnection(provider: BillingProvider): Promise<ConnectionResult> {
	try {
		const ids = await provider.listContractIds()
		return { ok: true, contracts: ids.length }
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) }
	}
}
