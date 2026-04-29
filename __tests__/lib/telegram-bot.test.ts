import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}))

vi.mock('@/lib/env', () => ({
  optionalEnv: (_key: string, fallback: string) => fallback,
}))

const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'))

import { handleCommand, broadcastMessage } from '@/lib/telegram-bot'

beforeEach(() => {
  vi.clearAllMocks()
  fetchSpy.mockResolvedValue(new Response('ok'))
})

describe('handleCommand', () => {
  it('/start sends welcome message', async () => {
    await handleCommand('123', '/start', [])
    expect(fetchSpy).toHaveBeenCalledOnce()
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
    expect(body.chat_id).toBe('123')
    expect(body.text).toContain('Welcome to')
  })

  it('/link without email sends usage hint', async () => {
    await handleCommand('123', '/link', [])
    expect(fetchSpy).toHaveBeenCalledOnce()
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
    expect(body.text).toContain('Usage')
  })

  it('/link with email links user when found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        ilike: () => ({
          limit: () => ({
            single: () => Promise.resolve({ data: { id: 'u-1', email: 'test@example.com' }, error: null }),
          }),
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
    })
    await handleCommand('123', '/link', ['test@example.com'])
    expect(fetchSpy).toHaveBeenCalledOnce()
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
    expect(body.text).toContain('Linked to')
  })

  it('/link sends not found when user missing', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        ilike: () => ({
          limit: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    })
    await handleCommand('123', '/link', ['unknown@example.com'])
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
    expect(body.text).toContain('Account not found')
  })

  it('unknown command sends help message', async () => {
    await handleCommand('123', '/unknown', [])
    expect(fetchSpy).toHaveBeenCalledOnce()
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
    expect(body.text).toContain('Unknown command')
  })
})

describe('broadcastMessage', () => {
  it('returns sent: 0 when no bot token', async () => {
    const result = await broadcastMessage('Hello')
    expect(result).toEqual({ sent: 0 })
  })
})
