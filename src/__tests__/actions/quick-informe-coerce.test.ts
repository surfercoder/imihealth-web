/**
 * Tests the defensive non-string coercion in processQuickInforme by mocking
 * the helpers module to return a non-string informeDoctor value.
 */

const mockGetUser = jest.fn()
const mockFrom = jest.fn()

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

jest.mock('@/lib/prompts', () => ({
  getSpecialtyPrompt: jest.fn(() => 'default prompt'),
  PATIENT_REPORT_PROMPT: 'patient prompt',
}))

jest.mock('@/app/api/process-informe/helpers', () => ({
  generateDoctorReport: jest.fn().mockResolvedValue({
    content: [{ type: 'text', text: '{}' }],
  }),
  extractTextFromContent: jest.fn(() => '{}'),
  parseDoctorResponse: jest.fn(() => ({
    informeDoctor: { unexpected: 'object' },
    validMedicalContent: true,
  })),
  resolveTranscript: jest.fn(async (_audio: unknown, browserTranscript: string) => ({
    transcript: browserTranscript,
    assemblyAISucceeded: false,
  })),
}))

import { processQuickInforme } from '@/actions/quick-informe'

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

function makeChain() {
  const chain: Record<string, jest.Mock> = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.single.mockResolvedValue({ data: null, error: null })
  return chain
}

describe('processQuickInforme defensive coercion', () => {
  beforeEach(() => jest.clearAllMocks())

  it('coerces non-string informeDoctor to empty and returns no-content error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain())

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await processQuickInforme(
      'transcript con suficiente contenido para procesar correctamente',
    )
    expect(result.error).toMatch(/contenido médico relevante/i)
    warnSpy.mockRestore()
  })
})
