import { reducer, initialState, parseItems } from '@/components/pedidos-button/state'

describe('reducer', () => {
  it('handles OPEN action', () => {
    const result = reducer(initialState, { type: 'OPEN', items: '- item1' })
    expect(result).toEqual({ open: true, items: '- item1', pedidoUrls: null, mergedUrl: null })
  })

  it('handles CLOSE action', () => {
    const openState = { open: true, items: '- test', pedidoUrls: ['url1'], mergedUrl: '/merged' }
    const result = reducer(openState, { type: 'CLOSE' })
    expect(result).toEqual(initialState)
  })

  it('handles SET_ITEMS action', () => {
    const state = { open: true, items: '', pedidoUrls: null, mergedUrl: null }
    const result = reducer(state, { type: 'SET_ITEMS', value: '- new item' })
    expect(result).toEqual({ open: true, items: '- new item', pedidoUrls: null, mergedUrl: null })
  })

  it('handles SET_PEDIDO_URLS action', () => {
    const state = { open: true, items: '- item', pedidoUrls: null, mergedUrl: null }
    const result = reducer(state, { type: 'SET_PEDIDO_URLS', urls: ['url1', 'url2'], mergedUrl: '/merged' })
    expect(result).toEqual({ open: true, items: '- item', pedidoUrls: ['url1', 'url2'], mergedUrl: '/merged' })
  })

  it('handles RESET_FORM action', () => {
    const state = { open: true, items: '- old', pedidoUrls: ['url1'], mergedUrl: '/merged' }
    const result = reducer(state, { type: 'RESET_FORM', items: '- new' })
    expect(result).toEqual({ open: true, items: '- new', pedidoUrls: null, mergedUrl: null })
  })

  it('returns current state for unknown action', () => {
    const state = { open: true, items: '', pedidoUrls: null, mergedUrl: null }
     
    const result = reducer(state, { type: 'UNKNOWN' } as any)
    expect(result).toEqual(state)
  })
})

describe('parseItems', () => {
  it('parses bullet items from text', () => {
    const result = parseItems('- Item 1\n- Item 2\n- Item 3')
    expect(result).toEqual(['Item 1', 'Item 2', 'Item 3'])
  })

  it('ignores non-bullet lines', () => {
    const result = parseItems('Header\n- Item 1\nSome text\n- Item 2')
    expect(result).toEqual(['Item 1', 'Item 2'])
  })

  it('returns empty array for empty text', () => {
    expect(parseItems('')).toEqual([])
  })

  it('trims whitespace from items', () => {
    const result = parseItems('  - Spaced item  \n- Normal')
    expect(result).toEqual(['Spaced item', 'Normal'])
  })

  it('filters out empty bullet items', () => {
    const result = parseItems('- \n- Valid item\n-  ')
    expect(result).toEqual(['Valid item'])
  })

  it('parses items without space after hyphen', () => {
    const result = parseItems('- resonancia magnetica\n-analisis de sangre')
    expect(result).toEqual(['resonancia magnetica', 'analisis de sangre'])
  })
})
