import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

jest.mock('@/components/feedback-dialog', () => ({
  FeedbackDialog: ({
    doctorName,
    doctorEmail,
  }: {
    doctorName?: string | null
    doctorEmail?: string | null
  }) => (
    <div
      data-testid="feedback-dialog"
      data-doctor-name={doctorName ?? ''}
      data-doctor-email={doctorEmail ?? ''}
    />
  ),
}))

import { AppFooter } from '@/components/app-footer'

describe('AppFooter', () => {
  it('renders the copyright text with the current year', async () => {
    const year = new Date().getFullYear()
    render(await AppFooter({}))
    expect(
      screen.getByText(`© ${year} IMI. Todos los derechos reservados.`)
    ).toBeInTheDocument()
  })

  it('renders the FeedbackDialog component', async () => {
    render(await AppFooter({}))
    expect(screen.getByTestId('feedback-dialog')).toBeInTheDocument()
  })

  it('passes doctorName to FeedbackDialog', async () => {
    render(await AppFooter({ doctorName: 'Dr. García' }))
    expect(screen.getByTestId('feedback-dialog')).toHaveAttribute(
      'data-doctor-name',
      'Dr. García'
    )
  })

  it('passes doctorEmail to FeedbackDialog', async () => {
    render(await AppFooter({ doctorEmail: 'garcia@hospital.com' }))
    expect(screen.getByTestId('feedback-dialog')).toHaveAttribute(
      'data-doctor-email',
      'garcia@hospital.com'
    )
  })

  it('passes null doctorName as empty string attribute', async () => {
    render(await AppFooter({ doctorName: null }))
    expect(screen.getByTestId('feedback-dialog')).toHaveAttribute(
      'data-doctor-name',
      ''
    )
  })

  it('renders a footer element', async () => {
    const { container } = render(await AppFooter({}))
    expect(container.querySelector('footer')).toBeInTheDocument()
  })
})
