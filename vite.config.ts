/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    // functions/ is a separate npm package with its own Vitest config and
    // test runner (`cd functions && npm test`) — exclude it here so the root
    // suite only ever runs the frontend tests. *.emulator.test.ts files need
    // the Firebase Local Emulator Suite — run those via `npm run test:emulator`.
    exclude: ['**/node_modules/**', '**/functions/**', '**/*.emulator.test.ts'],
  },
})
