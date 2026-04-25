import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QuizComponent } from '@/components/QuizComponent'

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }) } },
  createQuizAttempt: () => Promise.resolve({ data: { id: 'qa1' } }),
  createWeakArea: () => Promise.resolve({ data: null, error: null }),
}))

vi.mock('@/lib/agents/hermes', () => ({
  transition: () => Promise.resolve(),
}))

const MOCK_QUESTIONS = [
  { id: 'q1', question: 'Which article guarantees equality before law?', options: ['Article 14', 'Article 21', 'Article 19', 'Article 32'], correct_option: 'Article 14' },
  { id: 'q2', question: 'Right to Life is under?', options: ['Article 14', 'Article 19', 'Article 21', 'Article 25'], correct_option: 'Article 21' },
]

describe('QuizComponent', () => {
  it('renders questions and options', () => {
    render(<QuizComponent quizId="qz1" questions={MOCK_QUESTIONS} />)
    expect(screen.getByText('Which article guarantees equality before law?')).toBeInTheDocument()
    expect(screen.getAllByText('Article 14')[0]).toBeInTheDocument()
  })

  it('selects an option and shows submit button', () => {
    render(<QuizComponent quizId="qz1" questions={MOCK_QUESTIONS} />)
    fireEvent.click(screen.getAllByText('Article 14')[0])
    expect(screen.getByText('Submit Quiz')).toBeInTheDocument()
  })

  it('submits and displays score', async () => {
    render(<QuizComponent quizId="qz1" questions={MOCK_QUESTIONS} />)
    fireEvent.click(screen.getAllByText('Article 14')[0])
    fireEvent.click(screen.getAllByText('Article 21')[1])
    fireEvent.click(screen.getByText('Submit Quiz'))
    await waitFor(() => expect(screen.getByText('2 / 2')).toBeInTheDocument())
  })
})
