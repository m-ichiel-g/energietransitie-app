import React, { useState, useMemo } from 'react';
import ScenarioOverzicht from './scenarios/ScenarioOverzicht';
import ScenarioDetail from './scenarios/ScenarioDetail';

/**
 * SCENARIO MODULE - Volgens PRD
 * Tab 1: Overzicht Strategieën (S1-S4 vergelijking)
 * Tab 2-5: Detail per strategie
 */
export default function ScenariosDashboard({ pblData, selectedBuurten, baselineJaar, selectedStrategies }) {
  const [activeTab, setActiveTab] = useState('overzicht');
  const [selectedStrategie, setSelectedStrategie] = useState(null);

  const tabs = [
    { id: 'overzicht', label: 'Overzicht Strategieën' },
    { id: 's1', label: 'S1: All-Electric', color: '#3B82F6' },
    { id: 's2', label: 'S2: MT Warmtenet', color: '#F97316' },
    { id: 's3', label: 'S3: LT Warmtenet', color: '#A855F7' },
    { id: 's4', label: 'S4: Klimaatneutraal Gas', color: '#22C55E' }
  ];

  if (!pblData || !selectedBuurten || selectedBuurten.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-lg font-semibold mb-2" style={{ color: '#20423C' }}>
          Geen buurten geselecteerd
        </p>
        <p style={{ color: '#6b7280' }}>
          Selecteer één of meerdere buurten in de sidebar
        </p>
      </div>
    );
  }

  // Bereken baseline kolom
  const baselineKolom = baselineJaar === '2023' ? 'Referentie_2023' : 'Referentie_2030';

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b overflow-x-auto" style={{ borderColor: '#F3F3E2', background: 'white' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-6 py-3 font-semibold text-sm transition-all whitespace-nowrap"
            style={{
              background: activeTab === tab.id ? (tab.color || '#83AF9A') : 'white',
              color: activeTab === tab.id ? 'white' : '#20423C',
              borderBottom: activeTab === tab.id ? 'none' : `2px solid #F3F3E2`
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overzicht' && (
          <ScenarioOverzicht
            pblData={pblData}
            selectedBuurten={selectedBuurten}
            baselineKolom={baselineKolom}
            onSelectStrategie={(s) => {
              setSelectedStrategie(s);
              setActiveTab(s.toLowerCase());
            }}
          />
        )}
        
        {['s1', 's2', 's3', 's4'].includes(activeTab) && (
          <ScenarioDetail
            strategieCode={activeTab.toUpperCase()}
            pblData={pblData}
            selectedBuurten={selectedBuurten}
            baselineKolom={baselineKolom}
          />
        )}
      </div>
    </div>
  );
}