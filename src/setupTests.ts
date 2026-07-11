// ABOUTME: Vitest setup — registers jest-dom matchers, and stubs pdfmake so any test that renders
// ABOUTME: the report screen with the real generator doesn't trigger a real (jsdom-incompatible) load.
import '@testing-library/jest-dom'

vi.mock('pdfmake/build/pdfmake', () => ({
  default: {
    vfs: undefined,
    createPdf: () => ({ getBlob: async () => new Blob(['%PDF-'], { type: 'application/pdf' }) }),
  },
}))
vi.mock('pdfmake/build/vfs_fonts', () => ({ default: {} }))
