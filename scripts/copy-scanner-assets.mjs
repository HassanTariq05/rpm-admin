import { cp, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const destination = path.join(root, 'public/scanner')
await mkdir(path.join(destination, 'core'), { recursive: true })
await cp(
  path.join(root, 'node_modules/zxing-wasm/dist/reader/zxing_reader.wasm'),
  path.join(destination, 'zxing_reader.wasm'),
)
await cp(
  path.join(root, 'node_modules/tesseract.js/dist/worker.min.js'),
  path.join(destination, 'worker.min.js'),
)
const core = path.join(root, 'node_modules/tesseract.js-core')
for (const name of await readdir(core)) {
  if (name.includes('lstm') && (name.endsWith('.wasm.js') || name.endsWith('.wasm')))
    await cp(path.join(core, name), path.join(destination, 'core', name))
}
await cp(
  path.join(root, 'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'),
  path.join(destination, 'eng.traineddata.gz'),
)
