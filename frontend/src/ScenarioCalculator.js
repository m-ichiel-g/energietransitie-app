import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ScenarioUpload from './components/ScenarioUpload';
import ScenarioComparison from './components/ScenarioComparison';
import {
  getStrategieData,
  berekenCO2Reductie,
  getStrategieCodeFromKolom,
  getStrategieLabelFromKolom,
  getStrategieColor,
  getStrategieIcon,
  filterStrategies,
  sortStrategiesForDisplay,
  formatEuro
} from './components/utils/scenarioCalculations';

/**
 * ScenarioCalculator v4 - Correcte layout
 * - Sidebar vanaf absolute links (over selectie sidebar)
 * - Volledige scenario selectie in sidebar
 * - Verticale tabs rechts zonder emoji's
 */
export default function ScenarioCalculator({ 
  selectedBuurten, 
  cbsData,
  getGebiedNaam,
  detailData, 
  onPBLDataParsed,
  pblData
}) {
  const [activeSubTab, setActiveSubTab] = useState('pbl');
  const [baselineJaar, setBaselineJaar] = useState('2030');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStrategies, setSelectedStrategies] = useState([
    'Strategie_1', 'Strategie_2', 'Strategie_3', 'Strategie_4'
  ]);
  const [scenarioFilters, setScenarioFilters] = useState({
    schillabel: null,
    toonVarianten: false
  });

  const baselineKolom = baselineJaar === '2023' ? 'Referentie_2023' : 'Referentie_2030';

  // Tab configuratie zonder emoji's
  const subTabs = [
    { id: 'pbl', label: 'PBL data', color: '#83AF9A' },
    { id: 'vergelijking', label: 'Vergelijken', color: '#7BA68C' },
    { id: 'varianten', label: 'Varianten', color: '#6D9380' },
    { id: 'kosten', label: 'Kosten', color: '#5F8074' },
    { id: 'energie', label: 'Energie', color: '#516D68' },
    { id: 'aansluitingen', label: 'Aansluitingen', color: '#43595C' }
  ];

  // Bereid scenario data voor (voor sidebar selectie)
  const { buurten, strategieComparisons } = useMemo(() => {
    if (!pblData || !selectedBuurten || selectedBuurten.length === 0) {
      return { buurten: [], strategieComparisons: [] };
    }

    const buurtenList = selectedBuurten
      .map(code => pblData.buurten[code])
      .filter(b => b && b.strategieMatrix);

    if (buurtenList.length === 0) {
      return { buurten: [], strategieComparisons: [] };
    }

    const baselineData = getStrategieData(buurtenList, baselineKolom);

    // Filter beschikbare strategieën
    let kolommen = pblData.strategieKolommen || [];
    if (scenarioFilters.schillabel) {
      kolommen = filterStrategies(kolommen, { schillabel: scenarioFilters.schillabel });
    }
    if (!scenarioFilters.toonVarianten) {
      kolommen = kolommen.filter(k => 
        k.startsWith('Strategie_') || 
        k.includes('Referentie') || 
        k.includes('Laagste_Nationale_Kosten')
      );
    }
    kolommen = sortStrategiesForDisplay(kolommen);

    const comparisons = kolommen.map(kolom => {
      const data = getStrategieData(buurtenList, kolom);
      const code = getStrategieCodeFromKolom(kolom);
      const co2Reductie = berekenCO2Reductie(data, baselineData);
      
      return {
        kolom,
        code,
        label: getStrategieLabelFromKolom(kolom),
        color: getStrategieColor(code),
        icon: getStrategieIcon(code),
        data,
        co2Reductie,
        metrics: {
          kostenPerTon: data.gemiddeldes?.H17_Nat_meerkost_CO2 || 0,
          totaleKosten: data.gemiddeldes?.H16_Nat_meerkost || 0
        }
      };
    });

    return { buurten: buurtenList, strategieComparisons: comparisons };
  }, [pblData, selectedBuurten, baselineKolom, scenarioFilters]);

  // Toggle scenario selectie
  const toggleScenario = (kolom) => {
    setSelectedStrategies(prev => 
      prev.includes(kolom) 
        ? prev.filter(k => k !== kolom)
        : [...prev, kolom]
    );
  };

  // Render functies voor tabs
  const renderPBLStartanalyse = () => (
    <div className="space-y-6 p-6">
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold mb-4" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          📊 PBL Scenario Data Upload
        </h2>
        <p className="mb-4" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
          Upload de ZIP file met PBL scenario data voor dit gebied. De ZIP moet 3 CSV bestanden bevatten:
        </p>
        <ul className="list-disc list-inside mb-6 space-y-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
          <li><strong>strategie*.csv</strong> - Scenario vergelijkingen</li>
          <li><strong>bebouwing*.csv</strong> - Bebouwingsdetails</li>
          <li><strong>totaalbebouwing*.csv</strong> - Totaaloverzicht</li>
        </ul>

        <ScenarioUpload 
          onDataParsed={onPBLDataParsed}
          existingData={pblData}
        />
      </div>

      {pblData && (
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-bold mb-4" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
            📋 Data Overzicht
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg" style={{ background: '#F3F3E2' }}>
              <p className="text-sm mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                Aantal buurten
              </p>
              <p className="text-2xl font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                {pblData.metadata?.aantalBuurten || 0}
              </p>
            </div>

            <div className="p-4 rounded-lg" style={{ background: '#F3F3E2' }}>
              <p className="text-sm mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                Scenario kolommen
              </p>
              <p className="text-2xl font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                {pblData.metadata?.aantalStrategieKolommen || 0}
              </p>
            </div>

            <div className="p-4 rounded-lg" style={{ background: '#F3F3E2' }}>
              <p className="text-sm mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                Geselecteerde buurten
              </p>
              <p className="text-2xl font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                {selectedBuurten?.length || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {!pblData && (
        <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-200">
          <h3 className="text-lg font-bold mb-2" style={{ color: '#1E40AF', fontFamily: 'Raleway, sans-serif' }}>
            💡 Hoe te gebruiken
          </h3>
          <ol className="list-decimal list-inside space-y-2" style={{ color: '#1E3A8A', fontFamily: 'Raleway, sans-serif' }}>
            <li>Upload de ZIP file met PBL data voor dit gebied</li>
            <li>De data wordt automatisch verwerkt en gevalideerd</li>
            <li>Ga naar "Vergelijken" om scenario's te analyseren</li>
            <li>Gebruik filters om specifieke varianten te bekijken</li>
          </ol>
        </div>
      )}
    </div>
  );

  const renderScenarioVergelijking = () => {
    if (!pblData) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8">
            <p className="text-lg font-semibold mb-2" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Geen PBL data beschikbaar
            </p>
            <p className="mb-4" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
              Upload eerst PBL scenario data in het "PBL data" tabblad
            </p>
            <button
              onClick={() => setActiveSubTab('pbl')}
              className="px-6 py-3 rounded-lg font-semibold"
              style={{
                background: '#83AF9A',
                color: 'white',
                fontFamily: 'Raleway, sans-serif'
              }}
            >
              Ga naar PBL Data Upload
            </button>
          </div>
        </div>
      );
    }

    return (
      <ScenarioComparison
        parsedData={pblData}
        selectedBuurten={selectedBuurten}
        baselineKolom={baselineKolom}
        selectedStrategies={selectedStrategies}
      />
    );
  };

  const renderPlaceholder = (title, icon) => (
    <div className="p-8 text-center">
      <p className="text-lg font-semibold mb-2" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
        {icon} {title}
      </p>
      <p style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
        Komt binnenkort
      </p>
    </div>
  );

  // MAIN RETURN
  return (
    <div className="h-full flex relative" style={{ background: '#FAFAFA' }}>
      
      {/* UITSCHUIFBARE SIDEBAR - VANAF ABSOLUTE LINKS (over selectie sidebar) */}
      <div 
        className="fixed left-0 top-0 h-full transition-all duration-300 shadow-2xl"
        style={{
          width: '400px',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-400px)',
          zIndex: 9999
        }}
      >
        <div className="h-full flex flex-col" style={{ background: 'white', width: '400px' }}>
          {/* Sidebar header */}
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#F3F3E2' }}>
            <h3 className="font-bold text-lg" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Filters & Selectie
            </h3>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={20} style={{ color: '#6b7280' }} />
            </button>
          </div>

          {/* Sidebar content - SCROLLABLE */}
          <div className="flex-1 overflow-y-auto">
            {/* Baseline selector */}
            <div className="p-4 border-b" style={{ borderColor: '#F3F3E2' }}>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                Baseline referentie:
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setBaselineJaar('2023')}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: baselineJaar === '2023' ? '#83AF9A' : '#F3F3E2',
                    color: baselineJaar === '2023' ? 'white' : '#20423C',
                    fontFamily: 'Raleway, sans-serif'
                  }}
                >
                  2023
                </button>
                <button
                  onClick={() => setBaselineJaar('2030')}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: baselineJaar === '2030' ? '#83AF9A' : '#F3F3E2',
                    color: baselineJaar === '2030' ? 'white' : '#20423C',
                    fontFamily: 'Raleway, sans-serif'
                  }}
                >
                  2030
                </button>
              </div>
            </div>

            {/* Filters - alleen bij scenario vergelijking EN als data beschikbaar */}
            {activeSubTab === 'vergelijking' && pblData && (
              <>
                {/* Schillabel filter */}
                <div className="p-4 border-b" style={{ borderColor: '#F3F3E2' }}>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                    Schillabel:
                  </label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setScenarioFilters(f => ({ ...f, schillabel: null }))}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{
                        background: scenarioFilters.schillabel === null ? '#83AF9A' : '#F3F3E2',
                        color: scenarioFilters.schillabel === null ? 'white' : '#20423C',
                        fontFamily: 'Raleway, sans-serif'
                      }}
                    >
                      Alle
                    </button>
                    <button
                      onClick={() => setScenarioFilters(f => ({ ...f, schillabel: 'B+' }))}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{
                        background: scenarioFilters.schillabel === 'B+' ? '#83AF9A' : '#F3F3E2',
                        color: scenarioFilters.schillabel === 'B+' ? 'white' : '#20423C',
                        fontFamily: 'Raleway, sans-serif'
                      }}
                    >
                      B+
                    </button>
                    <button
                      onClick={() => setScenarioFilters(f => ({ ...f, schillabel: 'D+' }))}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{
                        background: scenarioFilters.schillabel === 'D+' ? '#83AF9A' : '#F3F3E2',
                        color: scenarioFilters.schillabel === 'D+' ? 'white' : '#20423C',
                        fontFamily: 'Raleway, sans-serif'
                      }}
                    >
                      D+
                    </button>
                  </div>
                </div>

                {/* Varianten toggle */}
                <div className="p-4 border-b" style={{ borderColor: '#F3F3E2' }}>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scenarioFilters.toonVarianten}
                      onChange={(e) => setScenarioFilters(f => ({ ...f, toonVarianten: e.target.checked }))}
                      className="rounded"
                      style={{ accentColor: '#83AF9A' }}
                    />
                    <span className="text-sm font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                      Toon alle varianten
                    </span>
                  </label>
                  <p className="text-xs mt-1 ml-6" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                    Inclusief s1a, s1b, s2a-f, s3a-h, s4a-b
                  </p>
                </div>

                {/* Scenario selectie */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                      Selecteer scenario's:
                    </p>
                    <span className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                      {selectedStrategies.length} van {strategieComparisons.length}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {strategieComparisons.map((strat, idx) => (
                      <label
                        key={idx}
                        className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all hover:shadow-md"
                        style={{ 
                          background: selectedStrategies.includes(strat.kolom) ? `${strat.color}15` : '#F9FAFB',
                          border: `2px solid ${selectedStrategies.includes(strat.kolom) ? strat.color : '#F3F3E2'}`
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStrategies.includes(strat.kolom)}
                          onChange={() => toggleScenario(strat.kolom)}
                          className="rounded flex-shrink-0"
                          style={{ accentColor: strat.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg flex-shrink-0">{strat.icon}</span>
                            <p className="text-sm font-semibold truncate" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                              {strat.label}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                              {formatEuro(strat.metrics.kostenPerTon, true)}/ton
                            </span>
                            <span className="text-xs font-semibold" style={{ 
                              color: strat.co2Reductie > 0 ? '#10B981' : '#6b7280', 
                              fontFamily: 'Raleway, sans-serif' 
                            }}>
                              {strat.co2Reductie.toFixed(0)}% CO₂↓
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Quick actions */}
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => setSelectedStrategies(strategieComparisons.map(s => s.kolom))}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{
                        background: '#F3F3E2',
                        color: '#20423C',
                        fontFamily: 'Raleway, sans-serif'
                      }}
                    >
                      Selecteer alle
                    </button>
                    <button
                      onClick={() => setSelectedStrategies([])}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{
                        background: '#F3F3E2',
                        color: '#20423C',
                        fontFamily: 'Raleway, sans-serif'
                      }}
                    >
                      Deselecteer alle
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Stats - altijd tonen */}
            <div className="p-4 space-y-3 border-t" style={{ borderColor: '#F3F3E2' }}>
              <div className="p-3 rounded-lg" style={{ background: '#F3F3E2' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                  Geselecteerde buurten
                </p>
                <p className="text-lg font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                  {selectedBuurten?.length || 0}
                </p>
              </div>

              {pblData && (
                <div className="p-3 rounded-lg" style={{ background: '#DCFCE7' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#166534', fontFamily: 'Raleway, sans-serif' }}>
                    PBL Data geladen
                  </p>
                  <p className="text-sm" style={{ color: '#166534', fontFamily: 'Raleway, sans-serif' }}>
                    {pblData.metadata?.aantalBuurten} buurten<br />
                    {pblData.metadata?.aantalStrategieKolommen} scenario's
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toggle button voor sidebar (altijd zichtbaar, aan absolute linkerkant) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-0 top-1/2 transform -translate-y-1/2 p-3 rounded-r-lg shadow-lg transition-all hover:pl-4"
          style={{ background: '#83AF9A', zIndex: 9998 }}
        >
          <ChevronRight size={24} style={{ color: 'white' }} />
        </button>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {activeSubTab === 'pbl' && (
            <div className="h-full overflow-y-auto">{renderPBLStartanalyse()}</div>
          )}
          {activeSubTab === 'vergelijking' && (
            <div className="h-full overflow-hidden">{renderScenarioVergelijking()}</div>
          )}
          {activeSubTab === 'varianten' && (
            <div className="h-full overflow-y-auto">{renderPlaceholder('Variant Analyse', '🔍')}</div>
          )}
          {activeSubTab === 'kosten' && (
            <div className="h-full overflow-y-auto">{renderPlaceholder('Kosten Details', '💰')}</div>
          )}
          {activeSubTab === 'energie' && (
            <div className="h-full overflow-y-auto">{renderPlaceholder('Energie Details', '⚡')}</div>
          )}
          {activeSubTab === 'aansluitingen' && (
            <div className="h-full overflow-y-auto">{renderPlaceholder('Aansluitingen', '🔌')}</div>
          )}
        </div>
      </div>

      {/* VERTICALE TABS - RECHTS (zonder emoji's, tekst 90° gedraaid) */}
      <div className="flex flex-col justify-center py-4 pr-2 space-y-2">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className="relative group transition-all duration-200"
            style={{
              width: activeSubTab === tab.id ? '50px' : '44px',
              height: '140px',
            }}
          >
            <div
              className="absolute inset-0 rounded-l-xl shadow-lg transition-all duration-200 flex items-center justify-center"
              style={{
                background: activeSubTab === tab.id ? tab.color : `${tab.color}40`,
                borderRight: activeSubTab === tab.id ? `4px solid ${tab.color}` : 'none',
              }}
            >
              <div 
                style={{ 
                  transform: 'rotate(-90deg)',
                  whiteSpace: 'nowrap',
                  transformOrigin: 'center center'
                }}
              >
                <span 
                  className="text-sm font-bold"
                  style={{ 
                    color: activeSubTab === tab.id ? 'white' : '#20423C',
                    fontFamily: 'Raleway, sans-serif',
                  }}
                >
                  {tab.label}
                </span>
              </div>
            </div>

            {activeSubTab !== tab.id && (
              <div
                className="absolute inset-0 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ background: `${tab.color}20` }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}