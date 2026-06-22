import fs from 'node:fs';
import path from 'node:path';

const handlerPath = path.join(process.cwd(), 'build/handler.js');
if (!fs.existsSync(handlerPath)) {
	process.exit(0);
}

let contents = fs.readFileSync(handlerPath, 'utf8');
if (contents.includes("'Cross-Origin-Embedder-Policy', 'require-corp'")) {
	process.exit(0);
}

const patched = contents.replace(
	/setHeaders: client\s*\?\s*\(res, pathname\) => \{\s*\/\/ only apply to build directory, not e\.g\. version\.json/,
	`setHeaders: client
					? (res, pathname) => {
							if (res.statusCode === 200) {
								res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
								res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
								res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
							}
							// only apply to build directory, not e.g. version.json`
);

if (patched === contents) {
	console.warn(
		'[patch-adapter-node-headers] Could not patch build/handler.js — adapter-node layout may have changed'
	);
	process.exit(0);
}

fs.writeFileSync(handlerPath, patched);
