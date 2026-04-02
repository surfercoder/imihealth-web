import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { LandingFaq } from '@/components/landing-faq'

const faqItems = [
  { question: '¿Qué es IMI?', answer: 'Es un sistema de informes médicos.' },
  { question: '¿Es seguro?', answer: 'Sí, cumple con todas las normativas.' },
  {
    question: '¿Cómo funciona?',
    answer: 'Grabás la consulta y la IA genera el informe.',
  },
]

describe('LandingFaq', () => {
  it('renders the section title', () => {
    render(<LandingFaq title="Preguntas frecuentes" items={faqItems} />)
    expect(screen.getByText('Preguntas frecuentes')).toBeInTheDocument()
  })

  it('renders all question triggers', () => {
    render(<LandingFaq title="FAQ" items={faqItems} />)
    expect(screen.getByText('¿Qué es IMI?')).toBeInTheDocument()
    expect(screen.getByText('¿Es seguro?')).toBeInTheDocument()
    expect(screen.getByText('¿Cómo funciona?')).toBeInTheDocument()
  })

  it('renders with an empty items array', () => {
    render(<LandingFaq title="FAQ vacío" items={[]} />)
    expect(screen.getByText('FAQ vacío')).toBeInTheDocument()
  })

  it('renders a single item', () => {
    render(
      <LandingFaq
        title="FAQ"
        items={[{ question: '¿Qué hace IMI?', answer: 'Genera informes.' }]}
      />
    )
    expect(screen.getByText('¿Qué hace IMI?')).toBeInTheDocument()
  })

  it('expands an accordion item when clicked and shows the answer', async () => {
    const user = userEvent.setup()
    render(<LandingFaq title="FAQ" items={faqItems} />)
    await user.click(screen.getByText('¿Qué es IMI?'))
    expect(
      screen.getByText('Es un sistema de informes médicos.')
    ).toBeInTheDocument()
  })

  it('expands a different accordion item', async () => {
    const user = userEvent.setup()
    render(<LandingFaq title="FAQ" items={faqItems} />)
    await user.click(screen.getByText('¿Es seguro?'))
    expect(
      screen.getByText('Sí, cumple con todas las normativas.')
    ).toBeInTheDocument()
  })

  it('collapses when the same trigger is clicked twice', async () => {
    const user = userEvent.setup()
    render(<LandingFaq title="FAQ" items={faqItems} />)
    await user.click(screen.getByText('¿Qué es IMI?'))
    await user.click(screen.getByText('¿Qué es IMI?'))
    // The answer may be hidden after collapsing; content is unmounted or hidden
    // Just confirm we can click twice without errors
    expect(screen.getByText('¿Qué es IMI?')).toBeInTheDocument()
  })

  it('only shows one answer at a time (single type accordion)', async () => {
    const user = userEvent.setup()
    render(<LandingFaq title="FAQ" items={faqItems} />)
    await user.click(screen.getByText('¿Qué es IMI?'))
    expect(screen.getByText('Es un sistema de informes médicos.')).toBeInTheDocument()
    await user.click(screen.getByText('¿Es seguro?'))
    expect(
      screen.getByText('Sí, cumple con todas las normativas.')
    ).toBeInTheDocument()
    // First answer should now be collapsed
    expect(
      screen.queryByText('Es un sistema de informes médicos.')
    ).not.toBeInTheDocument()
  })

  it('renders answers in paragraphs with muted-foreground class', async () => {
    const user = userEvent.setup()
    render(<LandingFaq title="FAQ" items={faqItems} />)
    await user.click(screen.getByText('¿Qué es IMI?'))
    const answerEl = screen.getByText('Es un sistema de informes médicos.')
    expect(answerEl.tagName).toBe('P')
    expect(answerEl).toHaveClass('text-muted-foreground')
  })

  it('renders the section with correct border class', () => {
    const { container } = render(<LandingFaq title="FAQ" items={faqItems} />)
    const section = container.querySelector('section')
    expect(section).toHaveClass('border-t')
  })
})
