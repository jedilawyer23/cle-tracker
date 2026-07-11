// ABOUTME: Bundles functions/src/index.ts into a single self-contained lib/index.js.
// ABOUTME: Inlines local imports (including the @domain/* alias into the app's src/domain)
// ABOUTME: so the deployed functions/ package — which does NOT include ../src — is runnable.
// Keeps real runtime npm dependencies (declared in functions/package.json) external so they
// are installed normally by Cloud Functions from functions/package.json.
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf8'))

// Only real runtime deps stay external — everything else (reminders helpers, @domain code)
// gets inlined into the bundle since the deployed functions/ dir has no access to ../src.
const externalDeps = Object.keys(pkg.dependencies ?? {})

await build({
  entryPoints: [path.join(__dirname, 'src/index.ts')],
  outfile: path.join(__dirname, 'lib/index.js'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: pkg.type === 'module' ? 'esm' : 'cjs',
  external: externalDeps,
  sourcemap: true,
  logLevel: 'info',
  alias: {
    '@domain': path.join(__dirname, '../src/domain'),
  },
})
