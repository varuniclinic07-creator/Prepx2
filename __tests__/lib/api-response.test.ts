import { describe, it, expect } from 'vitest'
import { apiError, apiSuccess } from '@/lib/api-response'

describe('apiError', () => {
  it('returns JSON response with error message and status', async () => {
    const res = apiError('Not found', 404)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: 'Not found' })
  })

  it('includes error code when provided', async () => {
    const res = apiError('Rate limited', 429, 'RATE_LIMIT')
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body).toEqual({ error: 'Rate limited', code: 'RATE_LIMIT' })
  })

  it('omits code field when not provided', async () => {
    const res = apiError('Server error', 500)
    const body = await res.json()
    expect(body).not.toHaveProperty('code')
  })
})

describe('apiSuccess', () => {
  it('returns JSON response with data and default 200 status', async () => {
    const res = apiSuccess({ items: [1, 2, 3] })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ items: [1, 2, 3] })
  })

  it('accepts custom status code', async () => {
    const res = apiSuccess({ created: true }, 201)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toEqual({ created: true })
  })
})
