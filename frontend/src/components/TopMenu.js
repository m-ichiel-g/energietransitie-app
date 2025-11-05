import React from 'react';
import { Map, BarChart3, TrendingUp } from 'lucide-react';

export default function TopMenu({ activeTab, onTabChange, hasData }) {
  const tabs = [
    { id: 'kaart', label: 'Kaart', icon: Map },
    { id: 'data', label: 'Data', icon: BarChart3, needsData: true },
    { id: 'scenarios', label: "Scenario's", icon: TrendingUp, needsData: true }
  ];

  return (
    <div 
      className="flex items-center space-x-2 px-6 py-3 border-b"
      style={{ background: 'white', borderColor: '#F3F3E2' }}
    >
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isDisabled = tab.needsData && !hasData;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => !isDisabled && onTabChange(tab.id)}
            disabled={isDisabled}
            className="px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center space-x-2"
            style={{
              background: isActive ? '#83AF9A' : isDisabled ? '#F9FAFB' : 'white',
              color: isActive ? 'white' : isDisabled ? '#9CA3AF' : '#20423C',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.5 : 1,
              boxShadow: isActive ? '0 2px 4px rgba(131,175,154,0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (!isDisabled && !isActive) {
                e.target.style.background = '#83AF9A20';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.target.style.background = isDisabled ? '#F9FAFB' : 'white';
              }
            }}
          >
            <Icon size={18} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}