// ABOUTME: Vitest setup — registers jest-dom matchers for all tests.
// ABOUTME: Loaded via vite.config.ts test.setupFiles.
import '@testing-library/jest-dom'

// pdfmake's canvas/font measurement doesn't run under jsdom (no real font metrics), and
// ExportButton now pre-generates its PDF as soon as it mounts with credits — so any test that
// renders the (populated) Dashboard/ExportButton without its own onExport/pdfmake mock would
// otherwise trigger a real, failing dynamic import. Stub it harmlessly here; tests that care
// about the render itself (renderReportPdf.test.ts, ExportButton.test.tsx) register their own
// more specific vi.mock for these same specifiers, which takes precedence in that file.
vi.mock('pdfmake/build/pdfmake', () => ({
  default: {
    createPdf: () => ({
      getBlob: async () => new Blob(['stub-pdf'], { type: 'application/pdf' }),
    }),
    vfs: undefined,
  },
}))
vi.mock('pdfmake/build/vfs_fonts', () => ({ default: {} }))
