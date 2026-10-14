import type { IncomingMessage, ServerResponse } from 'node:http'

import type { RunProgress, RunProgressReader } from '../cobrix/application/interfaces/progress.interface.ts'
import { HTTP_STATUS, PROGRESS_EVENT } from './constants/routes.constants.ts'

export function streamProgress(progress: RunProgressReader, req: IncomingMessage, res: ServerResponse, runId: number): void {
	res.writeHead(HTTP_STATUS.Ok, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache', connection: 'keep-alive' })
	const snapshot = progress.snapshot(runId)
	if (snapshot === null) {
		writeEvent(res, PROGRESS_EVENT.Finished, { runId })
		res.end()
		return
	}
	writeEvent(res, PROGRESS_EVENT.Progress, snapshot)
	const stop = progress.subscribe(runId, update => {
		if (!update.finished) return writeEvent(res, PROGRESS_EVENT.Progress, update)
		writeEvent(res, PROGRESS_EVENT.Finished, update)
		stop()
		res.end()
	})
	req.on('close', stop)
}

function writeEvent(res: ServerResponse, event: string, data: RunProgress | { readonly runId: number }): void {
	res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}
