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

jest.mock('@/actions/subscriptions', () => ({
  getPlanInfo: jest.fn().mockResolvedValue({
    plan: 'free',
    status: 'active',
    isPro: false,
    isReadOnly: false,
    periodEnd: null,
    maxInformes: 10,
    currentInformes: 0,
    canCreateInforme: true,
    maxDoctors: 20,
    currentDoctors: 1,
    canSignUp: true,
  }),
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

import { processQuickInforme } from '@/actions/informes-rapidos/process-quick-informe'

const mockUser = { id: 'doctor-1', email: 'doctor@hospital.com' }

function setupTableMocks() {
  const insertSingle = jest
    .fn()
    .mockResolvedValue({ data: { id: 'rapido-1' }, error: null })
  const updateEq = jest.fn().mockResolvedValue({ error: null })
  const doctorSingle = jest.fn().mockResolvedValue({ data: null, error: null })

  mockFrom.mockImplementation((table: string) => {
    if (table === 'informes_rapidos') {
      return {
        insert: jest.fn(() => ({
          select: jest.fn(() => ({ single: insertSingle })),
        })),
        update: jest.fn(() => ({ eq: updateEq })),
      }
    }
    if (table === 'doctors') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({ single: doctorSingle })),
        })),
      }
    }
    return {}
  })
}

describe('processQuickInforme defensive coercion', () => {
  beforeEach(() => jest.clearAllMocks())

  it('coerces non-string informeDoctor to empty and returns no-content error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    setupTableMocks()

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await processQuickInforme(
      'transcript con suficiente contenido para procesar correctamente',
    )
    expect(result.error).toMatch(/contenido médico relevante/i)
    warnSpy.mockRestore()
  })
})
