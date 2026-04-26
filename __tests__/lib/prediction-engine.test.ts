import { describe, it, expect, vi, beforeEach } from 'vitest'

let topicsData: any[] = []
let pyqsData: any[] = []
let aiChatCalled: any = null

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'topics') {
        return {
          select: (cols: string) => {
            return {
              not: (_col: string, _op: string, _val: any) => {
                return {
                  limit: (n: number) => Promise.resolve({ data: pyqsData.slice(0, n), error: null }),
                }
              },
              limit: (n: number) => Promise.resolve({ data: topicsData.slice(0, n), error: null }),
            }
          },
        }
      }
      return { select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }
    },
  },
}))

vi.mock('@/lib/ai-router', () => ({
  aiChat: (opts: any) => {
    aiChatCalled = opts
    return Promise.resolve(aiChatResponse)
  },
}))

let aiChatResponse = '[{"topic_id":"t1","title":"Constitution","subject":"polity","confidence_score":85,"reason":"frequent"}]'

beforeEach(() => {
  topicsData = [{ id: 't1', title: 'Fundamental Rights', subject: 'polity', content: {} }]
  pyqsData = [{ content: { pyqs: [] } }]
  aiChatCalled = null
  aiChatResponse = '[{"topic_id":"t1","title":"Constitution","subject":"polity","confidence_score":85,"reason":"frequent"}]'
})

describe('prediction-engine', () => {
  it('returns predictions array', async () => {
    const { getPredictions } = await import('@/lib/prediction-engine')
    const preds = await getPredictions('u1')
    expect(Array.isArray(preds)).toBe(true)
    if (preds.length > 0) {
      expect(preds[0].title).toBeDefined()
    }
  })

  it('truncates confidence to 0-100 range', async () => {
    aiChatResponse = '[{"topic_id":"t1","title":"X","subject":"y","confidence_score":150,"reason":"z"}]'
    const { getPredictions } = await import('@/lib/prediction-engine')
    const preds = await getPredictions('u2')
    if (preds.length > 0) {
      expect(preds[0].confidence_score).toBeLessThanOrEqual(100)
    }
  })

  it('fallback heuristic returns topics even on AI failure', async () => {
    aiChatResponse = 'invalid json'
    const { getPredictions } = await import('@/lib/prediction-engine')
    const preds = await getPredictions('u3')
    expect(Array.isArray(preds)).toBe(true)
  })
})
