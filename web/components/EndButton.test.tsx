import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import EndButton from './EndButton'

describe('EndButton', () => {
  it('renders nothing when visible is false', () => {
    const { container } = render(<EndButton onClick={() => {}} visible={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders End label when visible', () => {
    render(<EndButton onClick={() => {}} visible />)
    expect(screen.getByRole('button', { name: /end/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<EndButton onClick={onClick} visible />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
