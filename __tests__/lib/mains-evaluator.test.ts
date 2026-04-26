import { describe, it, expect } from 'vitest'
import { evaluateMainsAnswer } from '@/lib/mains-evaluator'

describe('mains-evaluator', () => {
  it('basic answer returns all dimensions with >0 structure score', () => {
    const answer = 'Introduction\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Proin ac erat consequat, efficitur nunc in, malesuada quam.'
    const scores = evaluateMainsAnswer(answer)
    expect(scores.structure).toBeGreaterThan(0)
    expect(scores.content).toBeGreaterThan(0)
    expect(scores.analysis).toBeGreaterThan(0)
    expect(scores.presentation).toBeGreaterThan(0)
    expect(scores.overall).toBeGreaterThan(0)
  })

  it('answer with examples and analysis yields higher scores', () => {
    const answer = 'Introduction\n\nThe government should act. However, there are counter-arguments. ARC report suggests reform. For example, the 73rd Amendment.\n\nConclusion'
    const scores = evaluateMainsAnswer(answer)
    // Intro + conclusion + examples + analysis = 10 structure max
    expect(scores.content).toBeGreaterThanOrEqual(3)
    expect(scores.overall).toBeGreaterThanOrEqual(3)
  })

  it('short answer gives lower scores', () => {
    const scores = evaluateMainsAnswer('hello')
    expect(scores.structure).toBeLessThanOrEqual(10)
    expect(scores.structure).toBeGreaterThanOrEqual(4)
    expect(scores.overall).toBeLessThanOrEqual(10)
  })

  it('overall is the rounded average of the four dimensions', () => {
    const scores = evaluateMainsAnswer('Introduction\n\nBody body.\n\nConclusion')
    const avg = Math.round((scores.structure + scores.content + scores.analysis + scores.presentation) / 4 * 10) / 10
    expect(scores.overall).toBe(avg)
  })
})
