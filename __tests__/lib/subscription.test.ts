import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hasFeature, getUserPlan, canUseFeature, type Plan } from '@/lib/subscription'

let mockUserPlan: Plan = 'free'
let mockFeatures: Array<{ flag_name: string; enabled_for: Plan }> = []

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { subscription_status: mockUserPlan }, error: null }),
            }),
          }),
        }
      }
      if (table === 'feature_flags') {
        return {
          select: () => Promise.resolve({ data: mockFeatures, error: null }),
        }
      }
      return { select: () => ({}) }
    },
  },
}))

beforeEach(() => {
  mockUserPlan = 'free'
  mockFeatures = []
})

describe('hasFeature', () => {
  it('returns true when user plan rank >= required plan rank', () => {
    expect(hasFeature('premium', 'free')).toBe(true)
    expect(hasFeature('premium_plus', 'premium')).toBe(true)
    expect(hasFeature('free', 'free')).toBe(true)
  })

  it('returns false when user plan rank < required plan rank', () => {
    expect(hasFeature('free', 'premium')).toBe(false)
    expect(hasFeature('premium', 'premium_plus')).toBe(false)
  })
})

describe('getUserPlan', () => {
  it('falls back to free when subscription_status is missing', async () => {
    mockUserPlan = 'free'
    const plan = await getUserPlan('u1')
    expect(plan).toBe('free')
  })

  it('returns the stored subscription_status as Plan', async () => {
    mockUserPlan = 'premium'
    const plan = await getUserPlan('u1')
    expect(plan).toBe('premium')
  })
})

describe('canUseFeature', () => {
  it('blocks free users from premium features', async () => {
    mockUserPlan = 'free'
    mockFeatures = [{ flag_name: 'advanced_quizzes', enabled_for: 'premium' }]
    const allowed = await canUseFeature('u1', 'advanced_quizzes')
    expect(allowed).toBe(false)
  })

  it('allows premium users to use premium feature', async () => {
    mockUserPlan = 'premium'
    mockFeatures = [{ flag_name: 'advanced_quizzes', enabled_for: 'premium' }]
    const allowed = await canUseFeature('u1', 'advanced_quizzes')
    expect(allowed).toBe(true)
  })

  it('allows any user when feature gate is free', async () => {
    mockUserPlan = 'free'
    mockFeatures = [{ flag_name: 'basic_read', enabled_for: 'free' }]
    const allowed = await canUseFeature('u1', 'basic_read')
    expect(allowed).toBe(true)
  })
})
