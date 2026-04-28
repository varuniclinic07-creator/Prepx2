import { describe, it, expect, beforeEach } from 'vitest'
import { getBalance, getTransactions, awardCoins, spendCoins } from '@/lib/coins'

let mockBalanceRow: { coins: number; lifetime_earned: number } | null = { coins: 0, lifetime_earned: 0 }
let rpcResult: { data: number | null; error: any } = { data: 0, error: null }

function createMockSupabase() {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, _val: any) => ({
          single: () => Promise.resolve({ data: mockBalanceRow, error: null }),
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
      insert: () => Promise.resolve({ error: null }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
    rpc: (_fn: string, _params: any) => Promise.resolve(rpcResult),
  } as any
}

beforeEach(() => {
  mockBalanceRow = { coins: 0, lifetime_earned: 0 }
  rpcResult = { data: 0, error: null }
})

describe('coins', () => {
  it('getBalance returns zero for new user', async () => {
    mockBalanceRow = { coins: 0, lifetime_earned: 0 }
    const bal = await getBalance(createMockSupabase(), 'u1')
    expect(bal).toBe(0)
  })

  it('getTransactions returns an array', async () => {
    const txs = await getTransactions(createMockSupabase(), 'u1')
    expect(Array.isArray(txs)).toBe(true)
  })

  it('awardCoins returns false for non-positive amount', async () => {
    const ok = await awardCoins(createMockSupabase(), 'u3', 0, 'quiz', 'key-b')
    expect(ok).toBe(false)
    const ok2 = await awardCoins(createMockSupabase(), 'u3', -5, 'quiz', 'key-c')
    expect(ok2).toBe(false)
  })

  it('spendCoins returns error for non-positive amount', async () => {
    const res = await spendCoins(createMockSupabase(), 'u5', -10, 'shop')
    expect(res).toBe('error')
    const res2 = await spendCoins(createMockSupabase(), 'u5', 0, 'shop')
    expect(res2).toBe('error')
  })

  it('spendCoins returns insufficient when rpc returns negative', async () => {
    rpcResult = { data: -1, error: null }
    const res = await spendCoins(createMockSupabase(), 'u4', 100, 'shop')
    expect(res).toBe('insufficient')
  })

  it('spendCoins returns ok when rpc returns non-negative', async () => {
    rpcResult = { data: 50, error: null }
    const res = await spendCoins(createMockSupabase(), 'u4', 10, 'shop')
    expect(res).toBe('ok')
  })

  it('spendCoins returns error when rpc fails', async () => {
    rpcResult = { data: null, error: { message: 'fail' } }
    const res = await spendCoins(createMockSupabase(), 'u4', 10, 'shop')
    expect(res).toBe('error')
  })
})
