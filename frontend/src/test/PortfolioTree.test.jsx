import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PortfolioTree, { buildTree } from '../components/PortfolioTree'

describe('buildTree', () => {
  it('returns empty array for empty input', () => {
    expect(buildTree([])).toEqual([])
  })

  it('returns all as roots when no parent_id', () => {
    const portfolios = [
      { id: '1', name: 'A', parent_id: null },
      { id: '2', name: 'B', parent_id: null },
    ]
    const roots = buildTree(portfolios)
    expect(roots).toHaveLength(2)
    expect(roots[0].name).toBe('A')
    expect(roots[1].name).toBe('B')
  })

  it('nests children under parent', () => {
    const portfolios = [
      { id: '1', name: 'Parent', portfolio_type: 'group', parent_id: null },
      { id: '2', name: 'Child', portfolio_type: 'leaf', parent_id: '1' },
    ]
    const roots = buildTree(portfolios)
    expect(roots).toHaveLength(1)
    expect(roots[0].children).toHaveLength(1)
    expect(roots[0].children[0].name).toBe('Child')
  })

  it('handles orphans with invalid parent_id as roots', () => {
    const portfolios = [
      { id: '1', name: 'Orphan', parent_id: 'nonexistent' },
    ]
    const roots = buildTree(portfolios)
    expect(roots).toHaveLength(1)
    expect(roots[0].name).toBe('Orphan')
  })

  it('builds deep nesting correctly', () => {
    const portfolios = [
      { id: '1', name: 'Root', portfolio_type: 'group', parent_id: null },
      { id: '2', name: 'Mid', portfolio_type: 'group', parent_id: '1' },
      { id: '3', name: 'Leaf', portfolio_type: 'leaf', parent_id: '2' },
    ]
    const roots = buildTree(portfolios)
    expect(roots).toHaveLength(1)
    expect(roots[0].children[0].children[0].name).toBe('Leaf')
  })

  it('initializes children array for all nodes', () => {
    const portfolios = [
      { id: '1', name: 'Leaf', portfolio_type: 'leaf', parent_id: null },
    ]
    const roots = buildTree(portfolios)
    expect(roots[0].children).toEqual([])
  })
})

describe('PortfolioTree', () => {
  const defaultProps = {
    portfolios: [],
    selectedId: null,
    onSelect: vi.fn(),
    onDelete: vi.fn(),
  }

  it('shows empty state when portfolios is empty', () => {
    render(<PortfolioTree {...defaultProps} />)
    expect(screen.getByText('No portfolios yet')).toBeInTheDocument()
  })

  it('renders leaf portfolio with bullet marker', () => {
    const portfolios = [{ id: '1', name: 'My Stocks', portfolio_type: 'leaf', parent_id: null }]
    render(<PortfolioTree {...defaultProps} portfolios={portfolios} />)
    expect(screen.getByText('My Stocks')).toBeInTheDocument()
    expect(screen.getByText('•')).toBeInTheDocument()
  })

  it('renders group portfolio with expand arrow', () => {
    const portfolios = [{ id: '1', name: 'Group A', portfolio_type: 'group', parent_id: null }]
    render(<PortfolioTree {...defaultProps} portfolios={portfolios} />)
    expect(screen.getByText('Group A')).toBeInTheDocument()
    expect(screen.getByLabelText('expand')).toBeInTheDocument()
  })

  it('calls onSelect when node is clicked', () => {
    const onSelect = vi.fn()
    const portfolios = [{ id: '1', name: 'Stocks', portfolio_type: 'leaf', parent_id: null }]
    render(<PortfolioTree {...defaultProps} portfolios={portfolios} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Stocks'))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '1', name: 'Stocks' }))
  })

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    const portfolios = [{ id: '1', name: 'Stocks', portfolio_type: 'leaf', parent_id: null }]
    render(<PortfolioTree {...defaultProps} portfolios={portfolios} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText('delete Stocks'))
    expect(onDelete).toHaveBeenCalledWith('1')
  })

  it('does not call onSelect when delete button is clicked (stopPropagation)', () => {
    const onSelect = vi.fn()
    const onDelete = vi.fn()
    const portfolios = [{ id: '1', name: 'Stocks', portfolio_type: 'leaf', parent_id: null }]
    render(<PortfolioTree {...defaultProps} portfolios={portfolios} onSelect={onSelect} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText('delete Stocks'))
    expect(onDelete).toHaveBeenCalledWith('1')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('applies selected styles when node is selected', () => {
    const portfolios = [{ id: '1', name: 'Stocks', portfolio_type: 'leaf', parent_id: null }]
    render(<PortfolioTree {...defaultProps} portfolios={portfolios} selectedId="1" />)
    const button = screen.getByText('Stocks').closest('button')
    expect(button).toHaveClass('bg-[#1a1a1a]')
    expect(button).toHaveClass('border-[#3b82f6]')
  })

  it('applies unselected styles when node is not selected', () => {
    const portfolios = [{ id: '1', name: 'Stocks', portfolio_type: 'leaf', parent_id: null }]
    render(<PortfolioTree {...defaultProps} portfolios={portfolios} selectedId="other" />)
    const button = screen.getByText('Stocks').closest('button')
    expect(button).toHaveClass('text-[#737373]')
    expect(button).toHaveClass('border-transparent')
  })

  it('expands group when expand arrow is clicked', () => {
    const portfolios = [
      { id: '1', name: 'Group', portfolio_type: 'group', parent_id: null },
      { id: '2', name: 'Child', portfolio_type: 'leaf', parent_id: '1' },
    ]
    render(<PortfolioTree {...defaultProps} portfolios={portfolios} />)
    expect(screen.queryByText('Child')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('expand'))
    expect(screen.getByText('Child')).toBeInTheDocument()
    expect(screen.getByLabelText('collapse')).toBeInTheDocument()
  })

  it('collapses group when collapse arrow is clicked', () => {
    const portfolios = [
      { id: '1', name: 'Group', portfolio_type: 'group', parent_id: null },
      { id: '2', name: 'Child', portfolio_type: 'leaf', parent_id: '1' },
    ]
    render(<PortfolioTree {...defaultProps} portfolios={portfolios} />)
    fireEvent.click(screen.getByLabelText('expand'))
    expect(screen.getByText('Child')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('collapse'))
    expect(screen.queryByText('Child')).not.toBeInTheDocument()
  })

  it('does not call onSelect when expand is clicked (stopPropagation)', () => {
    const onSelect = vi.fn()
    const portfolios = [
      { id: '1', name: 'Group', portfolio_type: 'group', parent_id: null },
      { id: '2', name: 'Child', portfolio_type: 'leaf', parent_id: '1' },
    ]
    render(<PortfolioTree {...defaultProps} portfolios={portfolios} onSelect={onSelect} />)
    fireEvent.click(screen.getByLabelText('expand'))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('renders nested children with correct depth indentation', () => {
    const portfolios = [
      { id: '1', name: 'Group', portfolio_type: 'group', parent_id: null },
      { id: '2', name: 'Child', portfolio_type: 'leaf', parent_id: '1' },
    ]
    render(<PortfolioTree {...defaultProps} portfolios={portfolios} />)

    // Root node (depth=0): paddingLeft = 0*16+12 = 12px
    const rootButton = screen.getByText('Group').closest('button')
    expect(rootButton).toHaveStyle({ paddingLeft: '12px' })

    // Expand to show child
    fireEvent.click(screen.getByLabelText('expand'))

    // Child node (depth=1): paddingLeft = 1*16+12 = 28px
    const childButton = screen.getByText('Child').closest('button')
    expect(childButton).toHaveStyle({ paddingLeft: '28px' })
  })

  it('renders multiple root nodes', () => {
    const portfolios = [
      { id: '1', name: 'Portfolio A', portfolio_type: 'leaf', parent_id: null },
      { id: '2', name: 'Portfolio B', portfolio_type: 'leaf', parent_id: null },
      { id: '3', name: 'Portfolio C', portfolio_type: 'group', parent_id: null },
    ]
    render(<PortfolioTree {...defaultProps} portfolios={portfolios} />)
    expect(screen.getByText('Portfolio A')).toBeInTheDocument()
    expect(screen.getByText('Portfolio B')).toBeInTheDocument()
    expect(screen.getByText('Portfolio C')).toBeInTheDocument()
  })

  it('shows expand arrow for collapsed group and collapse arrow for expanded group', () => {
    const portfolios = [
      { id: '1', name: 'Group', portfolio_type: 'group', parent_id: null },
      { id: '2', name: 'Child', portfolio_type: 'leaf', parent_id: '1' },
    ]
    render(<PortfolioTree {...defaultProps} portfolios={portfolios} />)

    // Initially collapsed - shows right arrow
    expect(screen.getByText('▶')).toBeInTheDocument()

    // Expand
    fireEvent.click(screen.getByLabelText('expand'))

    // Now expanded - shows down arrow
    expect(screen.getByText('▼')).toBeInTheDocument()
  })
})
