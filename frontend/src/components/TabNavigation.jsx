export default function TabNavigation({ activeTab, onTabChange }) {
  const tabs = [
    { key: 'analysis', label: 'ANALYSIS' },
    { key: 'portfolios', label: 'PORTFOLIOS' },
  ]

  return (
    <div className="flex gap-1" role="tablist">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          role="tab"
          aria-selected={activeTab === key}
          onClick={() => onTabChange(key)}
          className={`px-4 py-1.5 text-[11px] font-medium tracking-wider transition-colors ${
            activeTab === key
              ? 'bg-[#2d4a6f] text-white'
              : 'text-[#4a7ab0] hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
