import { setTimeout as sleep } from 'node:timers/promises'

import type { BillingProvider } from '../../domain/interfaces/provider.interface.ts'

export function withLatency(provider: BillingProvider, latencyMs: number): BillingProvider {
	if (latencyMs <= 0) return provider
	return {
		async listContractIds() {
			await sleep(latencyMs)
			return provider.listContractIds()
		},
		async getContractDebt(contractId) {
			await sleep(latencyMs)
			return provider.getContractDebt(contractId)
		},
		async getLedger(contractId, range) {
			await sleep(latencyMs)
			return provider.getLedger(contractId, range)
		},
	}
}
