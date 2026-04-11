/**
 * @jest-environment node
 */

let mockAnthropicCreate: jest.Mock

jest.mock('@anthropic-ai/sdk', () => {
  const fn = jest.fn()
  ;(global as Record<string, unknown>).__mockAnthropicCreate = fn
  function MockAnthropic(this: { messages: { create: typeof fn } }) {
    this.messages = { create: fn }
  }
  return { __esModule: true, default: MockAnthropic }
})

jest.mock('@/lib/transcribe', () => ({
  transcribeAudio: jest.fn(),
}))

jest.mock('@/lib/prompts', () => ({
  getSpecialtyPrompt: jest.fn(() => 'prompt'),
  PATIENT_REPORT_PROMPT: 'patient prompt',
}))

import { extractDialogInBackground } from '@/app/api/process-informe/dialog'

type SupabaseLike = Parameters<typeof extractDialogInBackground>[3]

describe('extractDialogInBackground', () => {
  beforeAll(() => {
    mockAnthropicCreate = (global as Record<string, unknown>).__mockAnthropicCreate as jest.Mock
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockAnthropicCreate.mockReset()
  })

  it('updates informe with dialog data on success', async () => {
    const mockEq2 = jest.fn().mockResolvedValue({})
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 })
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq1 })
    const mockSupabase: SupabaseLike = {
      from: jest.fn().mockReturnValue({ update: mockUpdate }),
    }

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        transcript_type: 'dialog',
        dialog: [{ speaker: 'doctor', text: 'How are you?' }],
      }) }],
    })

    extractDialogInBackground('test transcript', 'inf-1', 'doc-1', mockSupabase)

    // Flush microtasks
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        transcript_type: 'dialog',
        transcript_dialog: [{ speaker: 'doctor', text: 'How are you?' }],
      })
    )
  })

  it('sets transcript_type to monologue when response is monologue', async () => {
    const mockEq2 = jest.fn().mockResolvedValue({})
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 })
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq1 })
    const mockSupabase: SupabaseLike = {
      from: jest.fn().mockReturnValue({ update: mockUpdate }),
    }

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        transcript_type: 'monologue',
        dialog: [],
      }) }],
    })

    extractDialogInBackground('transcript', 'inf-1', 'doc-1', mockSupabase)

    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        transcript_type: 'monologue',
        transcript_dialog: null,
      })
    )
  })

  it('catches inner error when response has invalid JSON', async () => {
    const mockSupabase: SupabaseLike = {
      from: jest.fn().mockReturnValue({ update: jest.fn() }),
    }

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not valid json' }],
    })

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation()

    extractDialogInBackground('transcript', 'inf-1', 'doc-1', mockSupabase)

    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))

    expect(warnSpy).toHaveBeenCalledWith(
      '[process-informe] Background dialog extraction failed:',
      expect.any(Error)
    )
    warnSpy.mockRestore()
  })

  it('catches outer error when Anthropic call rejects', async () => {
    const mockSupabase: SupabaseLike = {
      from: jest.fn().mockReturnValue({ update: jest.fn() }),
    }

    mockAnthropicCreate.mockRejectedValue(new Error('API failed'))

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation()

    extractDialogInBackground('transcript', 'inf-1', 'doc-1', mockSupabase)

    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))

    expect(warnSpy).toHaveBeenCalledWith(
      '[process-informe] Background dialog extraction failed:',
      expect.any(Error)
    )
    warnSpy.mockRestore()
  })

  it('handles non-text content type (falls back to "{}")', async () => {
    const mockEq2 = jest.fn().mockResolvedValue({})
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 })
    const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq1 })
    const mockSupabase: SupabaseLike = {
      from: jest.fn().mockReturnValue({ update: mockUpdate }),
    }

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'tool_use' }],
    })

    extractDialogInBackground('transcript', 'inf-1', 'doc-1', mockSupabase)

    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        transcript_type: 'dialog',
        transcript_dialog: null,
      })
    )
  })
})
