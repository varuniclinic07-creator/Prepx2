import { describe, it, expect } from 'vitest'

function calculateRetryDelay(attempt: number): number {
  return 1000 * Math.pow(2, attempt);
}

function isCaptchaPage(html: string): boolean {
  return html.includes('cf-browser-verification') || html.includes('challenge-platform') || html.includes('Checking your browser');
}

describe('scraper hardening', () => {
  it('exponential backoff delays are 1s → 2s → 4s → 8s', () => {
    expect(calculateRetryDelay(0)).toBe(1000)
    expect(calculateRetryDelay(1)).toBe(2000)
    expect(calculateRetryDelay(2)).toBe(4000)
    expect(calculateRetryDelay(3)).toBe(8000)
  })

  it('detects Cloudflare CAPTCHA page', () => {
    expect(isCaptchaPage('<div>cf-browser-verification</div>')).toBe(true)
    expect(isCaptchaPage('<div>challenge-platform</div>')).toBe(true)
    expect(isCaptchaPage('<div>Checking your browser</div>')).toBe(true)
    expect(isCaptchaPage('<div>normal article content</div>')).toBe(false)
  })
})
