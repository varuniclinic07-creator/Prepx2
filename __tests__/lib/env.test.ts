import { describe, it, expect, afterEach } from 'vitest'
import { requireEnv, optionalEnv } from '@/lib/env'

describe('requireEnv', () => {
  afterEach(() => {
    delete process.env.TEST_REQUIRE_ENV_KEY
  })

  it('returns the value when env var is set', () => {
    process.env.TEST_REQUIRE_ENV_KEY = 'hello'
    expect(requireEnv('TEST_REQUIRE_ENV_KEY')).toBe('hello')
  })

  it('throws when env var is missing', () => {
    expect(() => requireEnv('TEST_REQUIRE_ENV_KEY')).toThrow(
      'Missing required environment variable: TEST_REQUIRE_ENV_KEY'
    )
  })

  it('throws when env var is empty string', () => {
    process.env.TEST_REQUIRE_ENV_KEY = ''
    expect(() => requireEnv('TEST_REQUIRE_ENV_KEY')).toThrow(
      'Missing required environment variable: TEST_REQUIRE_ENV_KEY'
    )
  })
})

describe('optionalEnv', () => {
  afterEach(() => {
    delete process.env.TEST_OPTIONAL_ENV_KEY
  })

  it('returns the value when env var is set', () => {
    process.env.TEST_OPTIONAL_ENV_KEY = 'world'
    expect(optionalEnv('TEST_OPTIONAL_ENV_KEY', 'default')).toBe('world')
  })

  it('returns fallback when env var is missing', () => {
    expect(optionalEnv('TEST_OPTIONAL_ENV_KEY', 'fallback')).toBe('fallback')
  })

  it('returns fallback when env var is empty string', () => {
    process.env.TEST_OPTIONAL_ENV_KEY = ''
    expect(optionalEnv('TEST_OPTIONAL_ENV_KEY', 'fallback')).toBe('fallback')
  })
})
