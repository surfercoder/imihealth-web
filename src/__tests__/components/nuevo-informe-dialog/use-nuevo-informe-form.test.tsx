import '@testing-library/jest-dom'
import { renderHook, act, waitFor } from '@testing-library/react'

const mockPush = jest.fn()
const mockSearchParams = new URLSearchParams()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}))

const mockCreatePatient = jest.fn()
const mockCreateInforme = jest.fn()
jest.mock('@/actions/informes', () => ({
  createPatient: (...args: unknown[]) => mockCreatePatient(...args),
  createInforme: (...args: unknown[]) => mockCreateInforme(...args),
}))

import { useNuevoInformeForm } from '@/components/nuevo-informe-dialog/use-nuevo-informe-form'

describe('useNuevoInformeForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams.delete('tab')
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useNuevoInformeForm())
    expect(result.current.open).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.defaultCountry).toBeDefined()
  })

  it('handleOpenChange resets form when closing', async () => {
    const { result } = renderHook(() => useNuevoInformeForm())
    act(() => {
      result.current.handleOpenChange(true)
    })
    await waitFor(() => expect(result.current.open).toBe(true))
    act(() => {
      result.current.handleOpenChange(false)
    })
    await waitFor(() => expect(result.current.open).toBe(false))
    expect(result.current.error).toBeNull()
  })

  it('setOpen updates open state', async () => {
    const { result } = renderHook(() => useNuevoInformeForm())
    act(() => {
      result.current.setOpen(true)
    })
    await waitFor(() => expect(result.current.open).toBe(true))
  })
})
