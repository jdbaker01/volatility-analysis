import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PortfolioForm from '../components/PortfolioForm'

describe('PortfolioForm', () => {
  const defaultProps = {
    portfolios: [],
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  }

  it('renders form title', () => {
    render(<PortfolioForm {...defaultProps} />)
    expect(screen.getByText('NEW PORTFOLIO')).toBeInTheDocument()
  })

  it('renders name input with placeholder', () => {
    render(<PortfolioForm {...defaultProps} />)
    expect(screen.getByPlaceholderText('Portfolio name')).toBeInTheDocument()
  })

  it('renders name label', () => {
    render(<PortfolioForm {...defaultProps} />)
    expect(screen.getByText('NAME')).toBeInTheDocument()
  })

  it('renders type label and select', () => {
    render(<PortfolioForm {...defaultProps} />)
    expect(screen.getByText('TYPE')).toBeInTheDocument()
    expect(screen.getByText('Leaf (holds securities)')).toBeInTheDocument()
    expect(screen.getByText('Group (holds portfolios)')).toBeInTheDocument()
  })

  it('renders CREATE and CANCEL buttons', () => {
    render(<PortfolioForm {...defaultProps} />)
    expect(screen.getByText('CREATE')).toBeInTheDocument()
    expect(screen.getByText('CANCEL')).toBeInTheDocument()
  })

  it('calls onCancel when CANCEL is clicked', () => {
    const onCancel = vi.fn()
    render(<PortfolioForm {...defaultProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('CANCEL'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('does not call onSubmit when name is empty', () => {
    const onSubmit = vi.fn()
    render(<PortfolioForm {...defaultProps} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByText('CREATE'))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not call onSubmit when name is only whitespace', () => {
    const onSubmit = vi.fn()
    render(<PortfolioForm {...defaultProps} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByPlaceholderText('Portfolio name'), { target: { value: '   ' } })
    fireEvent.click(screen.getByText('CREATE'))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with correct data on submit', () => {
    const onSubmit = vi.fn()
    render(<PortfolioForm {...defaultProps} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByPlaceholderText('Portfolio name'), { target: { value: 'My Portfolio' } })
    fireEvent.click(screen.getByText('CREATE'))
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'My Portfolio',
      portfolio_type: 'leaf',
      parent_id: null,
    })
  })

  it('trims name on submit', () => {
    const onSubmit = vi.fn()
    render(<PortfolioForm {...defaultProps} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByPlaceholderText('Portfolio name'), { target: { value: '  Trimmed Name  ' } })
    fireEvent.click(screen.getByText('CREATE'))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Trimmed Name' }))
  })

  it('submits with group type when selected', () => {
    const onSubmit = vi.fn()
    render(<PortfolioForm {...defaultProps} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByPlaceholderText('Portfolio name'), { target: { value: 'Groups' } })
    fireEvent.change(screen.getByDisplayValue('Leaf (holds securities)'), { target: { value: 'group' } })
    fireEvent.click(screen.getByText('CREATE'))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ portfolio_type: 'group' }))
  })

  it('resets form fields after successful submit', () => {
    const onSubmit = vi.fn()
    render(<PortfolioForm {...defaultProps} onSubmit={onSubmit} />)
    const nameInput = screen.getByPlaceholderText('Portfolio name')
    fireEvent.change(nameInput, { target: { value: 'Test' } })
    fireEvent.click(screen.getByText('CREATE'))
    expect(nameInput.value).toBe('')
  })

  it('does not show parent select when no group portfolios exist', () => {
    render(<PortfolioForm {...defaultProps} portfolios={[{ id: '1', name: 'Leaf', portfolio_type: 'leaf' }]} />)
    expect(screen.queryByText('PARENT')).not.toBeInTheDocument()
  })

  it('shows parent select when group portfolios exist', () => {
    const portfolios = [
      { id: '1', name: 'Group A', portfolio_type: 'group' },
      { id: '2', name: 'Leaf B', portfolio_type: 'leaf' },
    ]
    render(<PortfolioForm {...defaultProps} portfolios={portfolios} />)
    expect(screen.getByText('PARENT')).toBeInTheDocument()
    expect(screen.getByText('None (top-level)')).toBeInTheDocument()
    expect(screen.getByText('Group A')).toBeInTheDocument()
  })

  it('submits with parent_id when parent is selected', () => {
    const onSubmit = vi.fn()
    const portfolios = [{ id: 'g1', name: 'Parent Group', portfolio_type: 'group' }]
    render(<PortfolioForm {...defaultProps} portfolios={portfolios} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByPlaceholderText('Portfolio name'), { target: { value: 'Child' } })
    // Select the parent
    const parentSelect = screen.getByDisplayValue('None (top-level)')
    fireEvent.change(parentSelect, { target: { value: 'g1' } })
    fireEvent.click(screen.getByText('CREATE'))
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Child',
      portfolio_type: 'leaf',
      parent_id: 'g1',
    })
  })

  it('submits with null parent_id when None is selected', () => {
    const onSubmit = vi.fn()
    const portfolios = [{ id: 'g1', name: 'Parent Group', portfolio_type: 'group' }]
    render(<PortfolioForm {...defaultProps} portfolios={portfolios} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByPlaceholderText('Portfolio name'), { target: { value: 'Top Level' } })
    fireEvent.click(screen.getByText('CREATE'))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ parent_id: null }))
  })

  it('resets parent_id after submit', () => {
    const onSubmit = vi.fn()
    const portfolios = [{ id: 'g1', name: 'Parent Group', portfolio_type: 'group' }]
    render(<PortfolioForm {...defaultProps} portfolios={portfolios} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByPlaceholderText('Portfolio name'), { target: { value: 'Child' } })
    const parentSelect = screen.getByDisplayValue('None (top-level)')
    fireEvent.change(parentSelect, { target: { value: 'g1' } })
    fireEvent.click(screen.getByText('CREATE'))
    // After submit, parent select should reset to empty string (None)
    expect(parentSelect.value).toBe('')
  })

  it('resets type to leaf after submit', () => {
    const onSubmit = vi.fn()
    render(<PortfolioForm {...defaultProps} onSubmit={onSubmit} />)
    const typeSelect = screen.getByDisplayValue('Leaf (holds securities)')
    fireEvent.change(typeSelect, { target: { value: 'group' } })
    fireEvent.change(screen.getByPlaceholderText('Portfolio name'), { target: { value: 'Test' } })
    fireEvent.click(screen.getByText('CREATE'))
    expect(typeSelect.value).toBe('leaf')
  })
})
