import { describe, it, expect } from 'vitest'
import { getTenantFromHost } from '@/lib/tenant'

describe('tenant', () => {
  it('returns default for null host', () => {
    const t = getTenantFromHost(null)
    expect(t.isDefault).toBe(true)
    expect(t.slug).toBeNull()
  })

  it('returns default for empty host', () => {
    const t = getTenantFromHost('')
    expect(t.isDefault).toBe(true)
    expect(t.slug).toBeNull()
  })

  it('extracts slug from sub-subdomain host', () => {
    const t = getTenantFromHost('drishti.prepx.ai')
    expect(t.isDefault).toBe(false)
    expect(t.slug).toBe('drishti')
  })

  it('skips www and api as slugs', () => {
    const www = getTenantFromHost('www.prepx.ai')
    expect(www.isDefault).toBe(true)
    const api = getTenantFromHost('api.prepx.ai')
    expect(api.isDefault).toBe(true)
  })

  it('returns default for apex domain with 2 parts', () => {
    const t = getTenantFromHost('prepx.ai')
    expect(t.isDefault).toBe(true)
    expect(t.slug).toBeNull()
  })

  it('handles deep subdomains', () => {
    const t = getTenantFromHost('vikram.drishti.prepx.ai')
    expect(t.isDefault).toBe(false)
    expect(t.slug).toBe('vikram')
  })
})
