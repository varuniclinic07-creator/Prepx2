import { describe, it, expect, vi, beforeEach } from 'vitest'

// Set env vars BEFORE dynamic import of ai-router so module-level GROQ_KEYS is populated
process.env.NINEROUTER_BASE_URL = 'http://t1'
process.env.NINEROUTER_API_KEY = 'k1'
process.env.NINEROUTER_MODEL = 'm1'
process.env.NINEROUTER_EMBEDDING_KEY = 'ek'
process.env.NINEROUTER_EMBEDDING_MODEL = 'emb1'
process.env.NINEROUTER_TTS_KEY = 'tk'
process.env.NINEROUTER_TTS_MODEL = 'tts1'
process.env.GROQ_API_KEY_1 = 'g1'
process.env.GROQ_API_KEY_2 = 'g2'
process.env.GROQ_API_KEY_3 = 'g3'
process.env.GROQ_API_KEY_4 = 'g4'
process.env.GROQ_API_KEY_5 = 'g5'
process.env.GROQ_API_KEY_6 = 'g6'
process.env.GROQ_API_KEY_7 = 'g7'
process.env.GROQ_BASE_URL = 'http://gr'
process.env.GROQ_MODEL = 'gm'
process.env.OLLAMA_BASE_URL = 'http://ol'
process.env.OLLAMA_MODEL = 'om'
process.env.KILO_API_KEY_1 = 'k1'
process.env.KILO_API_KEY_2 = 'k2'
process.env.KILO_API_KEY_3 = 'k3'
process.env.KILO_API_KEY_4 = 'k4'
process.env.KILO_BASE_URL = 'http://kl'
process.env.KILO_MODEL_1 = 'km1'
process.env.KILO_MODEL_2 = 'km2'
process.env.KILO_MODEL_3 = 'km3'
process.env.KILO_MODEL_4 = 'km4'
process.env.KILO_MODEL_5 = 'km5'
process.env.NVIDIA_BASE_URL = 'http://nv'
process.env.NVIDIA_API_KEY = 'nk'
process.env.NVIDIA_MODEL_1 = 'nm1'
process.env.NVIDIA_MODEL_2 = 'nm2'
process.env.NVIDIA_MODEL_3 = 'nm3'
process.env.NVIDIA_MODEL_4 = 'nm4'
process.env.NVIDIA_MODEL_5 = 'nm5'

const mockCreate = vi.fn()
const mockEmbedCreate = vi.fn()
const mockFetch = vi.fn()

vi.mock('openai', () => ({
  default: class OpenAI {
    constructor(public opts: any) {}
    chat = {
      completions: {
        create: (...args: any[]) => mockCreate(...args),
      },
    }
    embeddings = {
      create: (...args: any[]) => mockEmbedCreate(...args),
    }
  },
}))

global.fetch = mockFetch as any

describe('ai-router', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockEmbedCreate.mockReset()
    mockFetch.mockReset()
  })

  it('aiChat returns text on provider success', async () => {
    const { aiChat } = await import('@/lib/ai-router')
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] })
    const text = await aiChat({ messages: [{ role: 'user', content: 'hi' }] })
    expect(text).toBe('ok')
  })

  it('aiChat falls through and throws when all providers fail', async () => {
    const { aiChat } = await import('@/lib/ai-router')
    mockCreate.mockRejectedValue(new Error('fail'))
    await expect(aiChat({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(/All AI providers failed/)
  })

  it('embedText returns embeddings', async () => {
    const { embedText } = await import('@/lib/ai-router')
    mockEmbedCreate.mockResolvedValue({ data: [{ embedding: [0.1, 0.2] }] })
    const res = await embedText(['hello'])
    expect(res).toEqual([[0.1, 0.2]])
  })

  it('textToSpeech returns Buffer on success', async () => {
    const { textToSpeech } = await import('@/lib/ai-router')
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer),
      text: () => '',
    })
    const buf = await textToSpeech('hello')
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBe(3)
  })

  it('textToSpeech throws on failure', async () => {
    const { textToSpeech } = await import('@/lib/ai-router')
    mockFetch.mockResolvedValue({ ok: false, text: () => 'bad' })
    await expect(textToSpeech('hello')).rejects.toThrow(/TTS failed/)
  })

  it('generateQuiz returns parsed questions', async () => {
    const { generateQuiz } = await import('@/lib/ai-router')
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: '[{"question":"Q1","options":["A","B","C","D"],"correct_option":"A","explanation":"E1"}]',
        },
      }],
    })
    const qs = await generateQuiz('Polity', 'content')
    expect(Array.isArray(qs)).toBe(true)
    expect(qs.length).toBe(1)
    expect(qs[0].question).toBe('Q1')
  })

  it('classifyError parses JSON', async () => {
    const { classifyError } = await import('@/lib/ai-router')
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '{"silly":1,"concept":2,"time":3}' } }] })
    const r = await classifyError(10, 2, 1)
    expect(r.silly).toBe(1)
    expect(r.concept).toBe(2)
    expect(r.time).toBe(3)
  })

  it('generateDiagnosis returns text for weak areas', async () => {
    const { generateDiagnosis } = await import('@/lib/ai-router')
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'Diagnosis text' } }] })
    const d = await generateDiagnosis(['Polity', 'History'])
    expect(typeof d).toBe('string')
    expect(d.includes('Diagnosis')).toBe(true)
  })

  it('generateDiagnosis returns fallback when no weak areas', async () => {
    const { generateDiagnosis } = await import('@/lib/ai-router')
    const d = await generateDiagnosis([])
    expect(d).toBe('No weak areas detected.')
  })

  it('generateContentSummary returns text', async () => {
    const { generateContentSummary } = await import('@/lib/ai-router')
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'Summary text' } }] })
    const s = await generateContentSummary('Topic', 'Body body')
    expect(typeof s).toBe('string')
  })
})
