import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

Object.assign(global, { TextEncoder, TextDecoder })

// Node 18+ exposes the WHATWG fetch primitives on globalThis. jsdom's Jest
// environment hides them; expose them explicitly so Next's request/response
// helpers (used by API route handlers) can be imported in tests.
for (const name of ['Request', 'Response', 'Headers', 'fetch'] as const) {
  if (typeof (global as Record<string, unknown>)[name] === 'undefined') {
    const fromNode = (globalThis as Record<string, unknown>)[name]
    if (fromNode) (global as Record<string, unknown>)[name] = fromNode
  }
}

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
}

if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = function () {}
}
