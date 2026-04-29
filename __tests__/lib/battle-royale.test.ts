import { describe, it, expect, vi } from 'vitest'
import { createEvent, joinEvent, submitAnswer, getLeaderboard, getActiveEvents } from '@/lib/battle-royale'

function mockSupabase(overrides: Record<string, any> = {}) {
  const defaults = {
    insertReturn: { data: { id: 'evt-1', status: 'scheduled' }, error: null },
    selectSingle: { data: null, error: null },
    selectMany: { data: [], error: null },
    updateReturn: { data: null, error: null },
  }
  const cfg = { ...defaults, ...overrides }

  return {
    from: (_table: string) => ({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve(cfg.insertReturn),
        }),
      }),
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve(cfg.selectSingle),
          }),
          single: () => Promise.resolve(cfg.selectSingle),
          order: () => ({
            order: () => Promise.resolve(cfg.selectMany),
            limit: () => ({
              single: () => Promise.resolve(cfg.selectSingle),
            }),
          }),
          is: () => ({
            order: () => ({
              limit: () => ({
                single: () => Promise.resolve(cfg.selectSingle),
              }),
            }),
          }),
        }),
        in: () => ({
          order: () => ({
            ascending: true,
          }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve(cfg.updateReturn),
      }),
    }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  } as any
}

describe('createEvent', () => {
  it('inserts a scheduled event and returns it', async () => {
    const sb = mockSupabase({
      insertReturn: { data: { id: 'evt-1', status: 'scheduled', prize_pool: 1000 }, error: null },
    })
    const result = await createEvent(sb, '2026-05-01T10:00:00Z', 20, 1000)
    expect(result).toEqual({ id: 'evt-1', status: 'scheduled', prize_pool: 1000 })
  })

  it('throws on insert error', async () => {
    const sb = mockSupabase({
      insertReturn: { data: null, error: { message: 'DB error' } },
    })
    await expect(createEvent(sb, '2026-05-01T10:00:00Z')).rejects.toEqual({ message: 'DB error' })
  })
})

describe('joinEvent', () => {
  it('returns existing participant if already joined', async () => {
    const sb = mockSupabase({
      selectSingle: { data: { id: 'part-1' }, error: null },
    })
    const result = await joinEvent(sb, 'evt-1', 'user-1')
    expect(result).toEqual({ id: 'part-1' })
  })
})

describe('submitAnswer', () => {
  it('throws if user is not a participant', async () => {
    const sb = mockSupabase({
      selectSingle: { data: null, error: null },
    })
    await expect(submitAnswer(sb, 'evt-1', 'user-1', 'q-1', 'A', 'A')).rejects.toThrow('Not a participant')
  })

  it('returns eliminated if already eliminated', async () => {
    const sb = mockSupabase({
      selectSingle: { data: { id: 'p-1', eliminated_at: '2026-01-01', score: 3 }, error: null },
    })
    const result = await submitAnswer(sb, 'evt-1', 'user-1', 'q-1', 'A', 'A')
    expect(result).toEqual({ eliminated: true, correct: false })
  })

  it('eliminates on wrong answer', async () => {
    const sb = mockSupabase({
      selectSingle: { data: { id: 'p-1', eliminated_at: null, score: 2 }, error: null },
    })
    const result = await submitAnswer(sb, 'evt-1', 'user-1', 'q-1', 'B', 'A')
    expect(result).toEqual({ eliminated: true, correct: false })
  })

  it('increments score on correct answer', async () => {
    const sb = mockSupabase({
      selectSingle: { data: { id: 'p-1', eliminated_at: null, score: 5 }, error: null },
    })
    const result = await submitAnswer(sb, 'evt-1', 'user-1', 'q-1', 'A', 'A')
    expect(result).toEqual({ eliminated: false, correct: true, score: 6 })
  })
})

describe('getLeaderboard', () => {
  it('returns empty array when no participants', async () => {
    const sb = mockSupabase({ selectMany: { data: [], error: null } })
    const result = await getLeaderboard(sb, 'evt-1')
    expect(result).toEqual([])
  })
})
