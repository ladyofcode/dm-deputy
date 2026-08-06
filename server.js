import { handler } from './build/handler.js';
import http from 'node:http';
import process from 'node:process';
import { crossOriginIsolationHeaders } from './cross-origin-isolation-headers.ts';

const port = Number(process.env.PORT ?? 3000);

const server = http.createServer((request, response) => {
	for (const [name, value] of Object.entries(crossOriginIsolationHeaders)) {
		response.setHeader(name, value);
	}

	handler(request, response, () => {
		if (!response.writableEnded) {
			response.statusCode = 404;
			response.end('Not Found');
		}
	});
});

server.listen(port, () => {
	console.log(`Listening on ${port} with cross-origin isolation headers`);
});
