/// <reference types="vitest/config" />
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// This project pairs a lowercase pure-helper module with a same-named PascalCase
// component (e.g. src/ui/creditForm.ts + src/ui/CreditForm.tsx). On a case-insensitive
// filesystem (default macOS), an extensionless import of either name is ambiguous —
// Vite's default extension-guessing picks whichever extension it tries first,
// regardless of which file the specifier's case actually names. This plugin resolves
// extensionless relative imports by checking the real (case-sensitive) directory
// listing for an exact-case match before handing off to Vite's default resolver.
function exactCaseResolve(): Plugin {
  return {
    name: 'exact-case-resolve',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.') || /\.[jt]sx?$/.test(source)) return null
      const dir = dirname(importer)
      const base = basename(source)
      const candidateDir = join(dir, dirname(source))
      if (!existsSync(candidateDir)) return null
      const entries = readdirSync(candidateDir)
      for (const ext of ['.tsx', '.ts', '.jsx', '.js']) {
        if (entries.includes(base + ext)) return join(candidateDir, base + ext)
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [exactCaseResolve(), react(), tailwindcss()],
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.ts' },
})
