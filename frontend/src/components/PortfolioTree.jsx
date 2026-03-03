import { useState } from 'react'

export function buildTree(portfolios) {
  const map = {}
  const roots = []
  portfolios.forEach((p) => {
    map[p.id] = { ...p, children: [] }
  })
  portfolios.forEach((p) => {
    if (p.parent_id && map[p.parent_id]) {
      map[p.parent_id].children.push(map[p.id])
    } else {
      roots.push(map[p.id])
    }
  })
  return roots
}

function TreeNode({ node, depth, selectedId, onSelect, onDelete, expandedIds, toggleExpand }) {
  const isGroup = node.portfolio_type === 'group'
  const isExpanded = expandedIds.has(node.id)
  const isSelected = node.id === selectedId

  return (
    <>
      <button
        onClick={() => onSelect(node)}
        className={`w-full flex items-center gap-1.5 px-3 py-2 text-left text-[12px] transition-colors ${
          isSelected
            ? 'bg-[#1a1a1a] text-white border-l-2 border-[#3b82f6]'
            : 'text-[#737373] hover:bg-[#111] hover:text-[#a3a3a3] border-l-2 border-transparent'
        }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {isGroup && (
          <span
            role="button"
            aria-label={isExpanded ? 'collapse' : 'expand'}
            onClick={(e) => {
              e.stopPropagation()
              toggleExpand(node.id)
            }}
            className="text-[10px] text-[#525252] hover:text-white w-3 cursor-pointer"
          >
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!isGroup && <span className="w-3 text-[10px] text-[#404040]">•</span>}
        <span className="flex-1 truncate tracking-wide">{node.name}</span>
        <span
          role="button"
          aria-label={`delete ${node.name}`}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(node.id)
          }}
          className="text-[10px] text-[#404040] hover:text-[#ef4444] opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          ✕
        </span>
      </button>
      {isGroup && isExpanded && node.children.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          onDelete={onDelete}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
        />
      ))}
    </>
  )
}

export default function PortfolioTree({ portfolios, selectedId, onSelect, onDelete }) {
  const [expandedIds, setExpandedIds] = useState(new Set())
  const tree = buildTree(portfolios)

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (portfolios.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[11px] text-[#404040]">No portfolios yet</p>
      </div>
    )
  }

  return (
    <div className="py-1">
      {tree.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
          onDelete={onDelete}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
        />
      ))}
    </div>
  )
}
