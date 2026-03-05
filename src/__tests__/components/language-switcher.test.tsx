import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockSetLocale = jest.fn().mockResolvedValue(undefined)
jest.mock('@/actions/locale', () => ({
  setLocale: (...args: unknown[]) => mockSetLocale(...args),
}))

// Mock the dropdown-menu to avoid Radix portal issues in JSDOM
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div role="menuitem" onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter') onClick?.() }} tabIndex={0}>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { LanguageSwitcher } from '@/components/language-switcher'

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the toggle button', () => {
    render(<LanguageSwitcher />)
    expect(screen.getByRole('button', { name: /Cambiar idioma/i })).toBeInTheDocument()
  })

  it('renders language options', () => {
    render(<LanguageSwitcher />)
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('calls setLocale and router.refresh when a language is selected', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher />)

    // Click "English" menu item
    const menuItems = screen.getAllByRole('menuitem')
    const englishItem = menuItems.find((item) => item.textContent?.includes('English'))!
    await user.click(englishItem)

    // startTransition runs the async callback
    await act(async () => {})

    expect(mockSetLocale).toHaveBeenCalledWith('en')
    expect(mockRefresh).toHaveBeenCalled()
  })
})
