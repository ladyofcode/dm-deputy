import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = path.join(rootDir, 'static/tesseract');

const tesseractPkgDir = path.dirname(require.resolve('tesseract.js/package.json'));
const corePkgDir = path.dirname(
	require.resolve('tesseract.js-core/package.json', { paths: [tesseractPkgDir] })
);

const copies = [
	[path.join(tesseractPkgDir, 'dist/worker.min.js'), path.join(staticDir, 'worker.min.js')],
	[path.join(corePkgDir, 'tesseract-core.wasm.js'), path.join(staticDir, 'tesseract-core.wasm.js')],
	[path.join(corePkgDir, 'tesseract-core.wasm'), path.join(staticDir, 'tesseract-core.wasm')]
];

fs.mkdirSync(path.join(staticDir, 'lang'), { recursive: true });

for (const [source, target] of copies) {
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.copyFileSync(source, target);
}

const langTarget = path.join(staticDir, 'lang/eng.traineddata.gz');
if (!fs.existsSync(langTarget)) {
	const response = await fetch(
		'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz'
	);
	if (!response.ok) {
		throw new Error(`Failed to download eng.traineddata.gz (${response.status})`);
	}

	fs.writeFileSync(langTarget, Buffer.from(await response.arrayBuffer()));
}

console.log('[copy-tesseract-assets] Copied OCR assets to static/tesseract');
