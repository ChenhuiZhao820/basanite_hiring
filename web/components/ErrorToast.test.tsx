import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import ErrorToast from './ErrorToast'

describe('ErrorToast', () => {
  it('renders nothing when message is empty', () => {
    const { container } = render(<ErrorToast message="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the message', () => {
    render(<ErrorToast message="Something went wrong" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i)
  })

  it('triggers reload when the Reload button is clicked', async () => {
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    })
    render(<ErrorToast message="oh no" />)
    await userEvent.click(screen.getByRole('button', { name: /reload/i }))
    expect(reloadMock).toHaveBeenCalledTimes(1)
  })
})
