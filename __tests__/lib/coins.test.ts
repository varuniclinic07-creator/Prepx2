import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getBalance, getTransactions, awardCoins, spendCoins } from '@/lib/coins'

let mockBalanceRow = { coins: 0, lifetime_earned: 0 }
const transactions: any[] = []

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: mockBalanceRow, error: null }),
            order: () => ({
              limit: (n: number) => Promise.resolve({ data: [], error: null }),
            }),
          }),
          limit: (n: number) => Promise.resolve({ data: [], error: null }),
        }),
        insert: (vals: any) => {
          transactions.push(vals)
          return Promise.resolve({ error: null })
        },
        update: (vals: any) => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }),
    } as any,
  }
})

beforeEach(() => {
  transactions.length = 0
  mockBalanceRow = { coins: 0, lifetime_earned: 0 }
})

describe('coins', () => {
  it('getBalance returns zero for new user', async () => {
    mockBalanceRow = { coins: 0, lifetime_earned: 0 }
    const bal = await getBalance('u1')
    expect(bal).toBe(0)
  })

  it('getTransactions returns an array', async () => {
    const txs = await getTransactions('u1')
    expect(Array.isArray(txs)).toBe(true)
  })

  it('awardCoins returns false for non-positive amount', async () => {
    const ok = await awardCoins('u3', 0, 'quiz', 'key-b')
    expect(ok).toBe(false)
    const ok2 = await awardCoins('u3', -5, 'quiz', 'key-c')
    expect(ok2).toBe(false)
  })

  it('spendCoins returns error for non-positive amount', async () => {
    const res = await spendCoins('u5', -10, 'shop')
    expect(res).toBe('error')
    const res2 = await spendCoins('u5', 0, 'shop')
    expect(res2).toBe('error')
  })

  it('spendCoins returns insufficient when balance < amount', async () => {
    mockBalanceRow = { coins: 10, lifetime_earned: 10 }
    const res = await spendCoins('u4', 100, 'shop')
    expect(res).toBe('insufficient')
  })
})
