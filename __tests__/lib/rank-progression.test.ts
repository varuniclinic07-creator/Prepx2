import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase-server', () => ({
  createClient: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/coins', () => ({
  awardCoins: vi.fn().mockResolvedValue(undefined),
}))

import { getRankProgress, getRankRequirements } from '@/lib/rank-progression'

describe('getRankProgress', () => {
  it('returns 100 for Cabinet Secretary (max rank)', () => {
    expect(getRankProgress('Cabinet Secretary', {})).toBe(100)
  })

  it('computes ASO progress from streak and correct answers', () => {
    // 50% streak (3.5/7) + 50% answers (25/50) => (0.5*0.5 + 0.5*0.5)*100 = 50
    expect(getRankProgress('ASO', { streak_count: 4, correct_answers: 25 })).toBe(54)
  })

  it('caps ASO progress at 100', () => {
    expect(getRankProgress('ASO', { streak_count: 100, correct_answers: 200 })).toBe(100)
  })

  it('returns 0 for ASO with no data', () => {
    expect(getRankProgress('ASO', {})).toBe(0)
  })

  it('computes Deputy Collector progress from streak and essays', () => {
    // streak 15/30 = 0.5, essays 3/5 = 0.6 => (0.5*0.5 + 0.6*0.5)*100 = 55
    expect(getRankProgress('Deputy Collector', { streak_count: 15, high_scoring_essays: 3 })).toBe(55)
  })

  it('computes Collector progress from streak and mock tests', () => {
    // streak 50/100 = 0.5, tests 1/1 = 1.0 => (0.5*0.5 + 1.0*0.5)*100 = 75
    expect(getRankProgress('Collector', { streak_count: 50, mock_tests: 1 })).toBe(75)
  })

  it('computes Secretary progress from streak, rank, and referrals', () => {
    // streak 200/200 = 1.0, rank 400 <= 500 => 0.3, referrals 3/3 = 1.0
    // (1.0*0.4 + 0.3 + 1.0*0.3)*100 = 100
    expect(getRankProgress('Secretary', { streak_count: 200, predicted_rank: 400, referrals: 3 })).toBe(100)
  })

  it('Secretary gets 0 for rank component when rank > 500', () => {
    // streak 100/200 = 0.5, rank 600 > 500 => 0, referrals 1/3 = 0.33
    // (0.5*0.4 + 0 + 0.33*0.3)*100 = (0.2 + 0.1)*100 = 30
    expect(getRankProgress('Secretary', { streak_count: 100, predicted_rank: 600, referrals: 1 })).toBe(30)
  })
})

describe('getRankRequirements', () => {
  it('returns join requirement for ASO', () => {
    expect(getRankRequirements('ASO')).toEqual(['Join PrepX'])
  })

  it('returns streak + answers for Deputy Collector', () => {
    expect(getRankRequirements('Deputy Collector')).toEqual(['7-day streak', '50 correct answers'])
  })

  it('returns streak + essays for Collector', () => {
    expect(getRankRequirements('Collector')).toEqual(['30-day streak', '5 essays scored >70%'])
  })

  it('returns streak + mock test for Secretary', () => {
    expect(getRankRequirements('Secretary')).toEqual(['100-day streak', '1 mock test completed'])
  })

  it('returns streak + rank + referrals for Cabinet Secretary', () => {
    expect(getRankRequirements('Cabinet Secretary')).toEqual([
      '200-day streak', 'Predicted rank top 500', '3 referrals'
    ])
  })

  it('returns empty array for unknown rank', () => {
    expect(getRankRequirements('Unknown' as any)).toEqual([])
  })
})
