import { describe, it, expect, vi } from 'vitest'

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
})

import { getTopic, getQuizByTopic, createWeakArea, getWeakAreas } from '@/lib/supabase'

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { id: 't1', title: 'Fundamental Rights', content: { definitions: [] }, syllabus_tag: 'GS2-P1-L1', topic_id: 't1', questions: ['q1'] }, error: null }),
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  }),
}))

describe('supabase helpers', () => {
  it('getTopic returns parsed topic', async () => {
    const topic = await getTopic('t1')
    expect(topic?.title).toBe('Fundamental Rights')
    expect(topic?.subject).toBe('polity')
  })

  it('getQuizByTopic returns quiz with questions', async () => {
    const quiz = await getQuizByTopic('t1')
    expect(quiz).not.toBeNull()
    expect(quiz?.topic_id).toBe('t1')
    expect(quiz?.questions).toEqual(['q1'])
  })

  it('createWeakArea does not throw', async () => {
    const res = await createWeakArea('u1', 't1', 'concept', 3)
    expect(res.error).toBeNull()
  })

  it('getWeakAreas returns array', async () => {
    const areas = await getWeakAreas('u1')
    expect(Array.isArray(areas)).toBe(true)
  })
})
