import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ScenarioCalculator from './ScenarioCalculator';

export default function Dashboard({ 
  cbsData, 
  selectedGemeenten, 
  selectedWijken, 
  selectedBuurten,
  gemeenteData,
  getGebiedNaam,
  loadingData,
  onClose 
}) {
  const [activeTab, setActiveTab] = useState('overzicht');
  const [detailData, setDetailData] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedStats, setExpandedStats] = useState({});
  const [mainView, setMainView] = useState('dashboard'); // 'dashboard' of 'scenarios'

  // CBS Measure IDs
  const CBS_MEASURES = {
    AANTAL_WONINGEN: 'M000297',
    AARDGAS_VERBRUIK: 'M000219_2',
    STADSVERWARMING_PCT: 'M000369',
    ZONNESTROOM_PCT: 'M008297',
    CORPORATIE_BEZIT: 'A047047',
    AARDGAS_WONINGEN_PCT: 'M008296',
    ELEKTRISCH_VERWARMD_PCT: 'M008298',
    EENGEZINSWONING_PCT: 'ZW10290',
    MEERGEZINSWONING_PCT: 'ZW10340',
    HUURWONINGEN_PCT: '1014850_2',
    KOOPWONINGEN_PCT: '1014800'
  };

  const dashboardTabs = [
    { id: 'overzicht', label: '📊 Overzicht', icon: '📊' },
    { id: 'woningen', label: '🏘️ Woningen', icon: '🏘️' },
    { id: 'energie', label: '⚡ Energie', icon: '⚡' },
    { id: 'gas', label: '🔥 Gas', icon: '🔥' },
    { id: 'eigendom', label: '🏠 Eigendom', icon: '🏠' },
  ];

  useEffect(() => {
    const allCodes = [...selectedGemeenten, ...selectedWijken, ...selectedBuurten];
    if (allCodes.length === 0) {
      setDetailData({});
      return;
    }

    const timer = setTimeout(() => {
      fetchAllCBSDetails(allCodes);
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedGemeenten, selectedWijken, selectedBuurten]);

  const fetchAllCBSDetails = async (codes) => {
    setLoadingDetails(true);
    const tableId = '85984NED';
    
    const measuresToFetch = [
      CBS_MEASURES.AARDGAS_VERBRUIK,
      CBS_MEASURES.STADSVERWARMING_PCT,
      CBS_MEASURES.ZONNESTROOM_PCT,
      CBS_MEASURES.CORPORATIE_BEZIT,
      CBS_MEASURES.AARDGAS_WONINGEN_PCT,
      CBS_MEASURES.ELEKTRISCH_VERWARMD_PCT,
      CBS_MEASURES.EENGEZINSWONING_PCT,
      CBS_MEASURES.MEERGEZINSWONING_PCT,
      CBS_MEASURES.HUURWONINGEN_PCT,
      CBS_MEASURES.KOOPWONINGEN_PCT
    ];

    try {
      const allData = {};

      for (const code of codes) {
        allData[code] = {};
        
        for (const measureId of measuresToFetch) {
          try {
            const url = `https://datasets.cbs.nl/odata/v1/CBS/${tableId}/Observations?$filter=WijkenEnBuurten eq '${code}' and Measure eq '${measureId}'&$select=WijkenEnBuurten,Measure,Value`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.value && data.value.length > 0) {
              allData[code][measureId] = parseFloat(data.value[0]?.Value || 0);
            }
          } catch (err) {
            console.error(`Fout bij ophalen ${measureId} voor ${code}:`, err);
          }
        }
      }

      setDetailData(allData);
      setLoadingDetails(false);
    } catch (error) {
      console.error('Fout bij laden CBS details:', error);
      setLoadingDetails(false);
    }
  };

  const getAverageForBuurten = (measureId) => {
    const buurtValues = selectedBuurten
      .map(code => detailData[code]?.[measureId])
      .filter(val => val !== undefined && val !== null && !isNaN(val));
    
    if (buurtValues.length === 0) return null;
    return buurtValues.reduce((a, b) => a + b, 0) / buurtValues.length;
  };

  const getTotalForBuurten = (measureId) => {
    const buurtValues = selectedBuurten
      .map(code => detailData[code]?.[measureId])
      .filter(val => val !== undefined && val !== null && !isNaN(val));
    
    if (buurtValues.length === 0) return null;
    return buurtValues.reduce((a, b) => a + b, 0);
  };

  const toggleStatExpand = (statKey) => {
    setExpandedStats(prev => ({
      ...prev,
      [statKey]: !prev[statKey]
    }));
  };

  const totaalBuurten = Object.values(cbsData)
    .filter(d => d.type === 'buurt')
    .reduce((sum, d) => sum + d.aantalWoningen, 0);

  const aantalBuurten = selectedBuurten.length;

  const renderOverzicht = () => (
    <div className="space-y-4">
      {selectedGemeenten.map(gemCode => {
        const gemeente = gemeenteData[gemCode];
        const gemeenteInfo = cbsData[gemCode];
        
        return (
          <div key={gemCode} className="border-2 rounded-xl overflow-hidden shadow-lg transition-all duration-300" style={{ 
            borderColor: '#83AF9A',
            background: '#F3F3E2'
          }}>
            <div className="p-3" style={{ background: 'rgba(131, 175, 154, 0.2)' }}>
              <h3 className="font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                📍 {gemeente?.naam}
              </h3>
              {gemeenteInfo && (
                <p className="text-sm mt-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                  🏘️ {gemeenteInfo.aantalWoningen.toLocaleString('nl-NL')} woningen
                </p>
              )}
            </div>
            
            <div className="p-3 space-y-3" style={{ background: 'white' }}>
              {selectedWijken
                .filter(wc => wc.startsWith('WK' + gemCode.replace('GM', '')))
                .map(wijkCode => {
                  const wijkInfo = cbsData[wijkCode];
                  const wijkNaam = getGebiedNaam(wijkCode);
                  
                  return (
                    <div key={wijkCode} className="border-l-4 pl-3" style={{ borderColor: '#83AF9A' }}>
                      <h4 className="font-semibold text-sm" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                        {wijkNaam}
                      </h4>
                      {wijkInfo && (
                        <p className="text-sm" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                          🏘️ {wijkInfo.aantalWoningen.toLocaleString('nl-NL')} woningen
                        </p>
                      )}
                      
                      <div className="mt-2 space-y-2">
                        {selectedBuurten
                          .filter(bc => bc.startsWith('BU' + wijkCode.replace('WK', '')))
                          .map(buurtCode => {
                            const buurtInfo = cbsData[buurtCode];
                            const buurtNaam = getGebiedNaam(buurtCode);
                            
                            return (
                              <div key={buurtCode} className="border-l-4 pl-3 ml-3" style={{ borderColor: '#6f9884' }}>
                                <h5 className="font-medium text-xs" style={{ color: '#374151', fontFamily: 'Raleway, sans-serif' }}>
                                  {buurtNaam}
                                </h5>
                                {buurtInfo && (
                                  <p className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                                    🏘️ {buurtInfo.aantalWoningen.toLocaleString('nl-NL')} woningen
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}

      <div className="p-4 rounded-xl border-2 shadow-lg" style={{ 
        background: '#F3F3E2',
        borderColor: '#83AF9A'
      }}>
        <p className="text-sm font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          Totaal geselecteerde buurten
        </p>
        <p className="text-3xl font-bold my-2" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          {totaalBuurten.toLocaleString('nl-NL')}
        </p>
        <p className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
          woningen in {aantalBuurten} buurten
        </p>
      </div>
    </div>
  );

  const StatCard = ({ label, value, measureId, unit = '%', showBar = true }) => {
    const statKey = measureId;
    const isExpanded = expandedStats[statKey];

    return (
      <div className="rounded-xl shadow-sm border-2 overflow-hidden transition-all duration-300" style={{ 
        background: 'white',
        borderColor: '#F3F3E2'
      }}>
        <button
          onClick={() => toggleStatExpand(statKey)}
          className="w-full p-4 flex items-center justify-between transition-all duration-200"
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(131, 175, 154, 0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
        >
          <div className="flex-1 text-left">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                {label}
              </span>
              <span className="text-lg font-bold" style={{ color: '#83AF9A', fontFamily: 'Raleway, sans-serif' }}>
                {value !== null ? `${typeof value === 'number' ? value.toFixed(1) : value}${unit}` : 'N/A'}
              </span>
            </div>
            {showBar && value !== null && (
              <div className="w-full rounded-full h-2" style={{ background: '#F3F3E2' }}>
                <div 
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(value, 100)}%`, background: '#83AF9A' }}
                />
              </div>
            )}
          </div>
          {isExpanded ? <ChevronUp size={20} color="#83AF9A" /> : <ChevronDown size={20} color="#83AF9A" />}
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 space-y-2 border-t-2" style={{ borderColor: '#F3F3E2', background: 'rgba(131, 175, 154, 0.03)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
              Per buurt:
            </p>
            {selectedBuurten.map(buurtCode => {
              const buurtNaam = getGebiedNaam(buurtCode);
              const buurtValue = detailData[buurtCode]?.[measureId];
              
              return (
                <div key={buurtCode} className="flex justify-between items-center py-1 px-2 rounded" style={{ background: 'white' }}>
                  <span className="text-xs" style={{ color: '#374151', fontFamily: 'Raleway, sans-serif' }}>
                    {buurtNaam}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                    {buurtValue !== undefined && buurtValue !== null ? `${buurtValue.toFixed(1)}${unit}` : 'N/A'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderWoningen = () => {
    const eengezinsAvg = getAverageForBuurten(CBS_MEASURES.EENGEZINSWONING_PCT);
    const meergezinsAvg = getAverageForBuurten(CBS_MEASURES.MEERGEZINSWONING_PCT);

    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl border-2" style={{ 
          background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.1) 0%, rgba(243, 243, 226, 0.5) 100%)',
          borderColor: '#83AF9A'
        }}>
          <h3 className="font-semibold mb-3 flex items-center" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
            <span className="text-2xl mr-2">🏘️</span>
            Woningtypen (gemiddeld)
          </h3>
          
          <div className="space-y-3">
            <StatCard 
              label="Eengezinswoningen" 
              value={eengezinsAvg} 
              measureId={CBS_MEASURES.EENGEZINSWONING_PCT}
            />
            <StatCard 
              label="Meergezinswoningen" 
              value={meergezinsAvg} 
              measureId={CBS_MEASURES.MEERGEZINSWONING_PCT}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderEnergie = () => {
    const zonnestromAvg = getAverageForBuurten(CBS_MEASURES.ZONNESTROOM_PCT);

    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl border-2" style={{ 
          background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.1) 0%, rgba(243, 243, 226, 0.5) 100%)',
          borderColor: '#83AF9A'
        }}>
          <h3 className="font-semibold mb-3 flex items-center" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
            <span className="text-2xl mr-2">⚡</span>
            Zonnestroom (gemiddeld)
          </h3>
          
          <div className="space-y-3">
            <StatCard 
              label="Woningen met zonnestroom" 
              value={zonnestromAvg} 
              measureId={CBS_MEASURES.ZONNESTROOM_PCT}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderGas = () => {
    const aardgasVerbruik = getAverageForBuurten(CBS_MEASURES.AARDGAS_VERBRUIK);
    const aardgasWoningen = getAverageForBuurten(CBS_MEASURES.AARDGAS_WONINGEN_PCT);
    const elektrischVerwarmd = getAverageForBuurten(CBS_MEASURES.ELEKTRISCH_VERWARMD_PCT);
    const stadsverwarming = getAverageForBuurten(CBS_MEASURES.STADSVERWARMING_PCT);

    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl border-2" style={{ 
          background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.1) 0%, rgba(243, 243, 226, 0.5) 100%)',
          borderColor: '#83AF9A'
        }}>
          <h3 className="font-semibold mb-3 flex items-center" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
            <span className="text-2xl mr-2">🔥</span>
            Verwarming & Gas (gemiddeld)
          </h3>
          
          <div className="space-y-3">
            <StatCard 
              label="Gem. aardgasverbruik" 
              value={aardgasVerbruik ? Math.round(aardgasVerbruik) : null} 
              measureId={CBS_MEASURES.AARDGAS_VERBRUIK}
              unit=" m³"
              showBar={false}
            />
            <StatCard 
              label="Aardgaswoningen" 
              value={aardgasWoningen} 
              measureId={CBS_MEASURES.AARDGAS_WONINGEN_PCT}
            />
            <StatCard 
              label="Elektrisch verwarmd" 
              value={elektrischVerwarmd} 
              measureId={CBS_MEASURES.ELEKTRISCH_VERWARMD_PCT}
            />
            <StatCard 
              label="Stadsverwarming" 
              value={stadsverwarming} 
              measureId={CBS_MEASURES.STADSVERWARMING_PCT}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderEigendom = () => {
    const koopwoningen = getAverageForBuurten(CBS_MEASURES.KOOPWONINGEN_PCT);
    const huurwoningen = getAverageForBuurten(CBS_MEASURES.HUURWONINGEN_PCT);
    const corporatieBezit = getTotalForBuurten(CBS_MEASURES.CORPORATIE_BEZIT);

    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl border-2" style={{ 
          background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.1) 0%, rgba(243, 243, 226, 0.5) 100%)',
          borderColor: '#83AF9A'
        }}>
          <h3 className="font-semibold mb-3 flex items-center" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
            <span className="text-2xl mr-2">🏠</span>
            Eigendom (gemiddeld)
          </h3>
          
          <div className="space-y-3">
            <StatCard 
              label="Koopwoningen" 
              value={koopwoningen} 
              measureId={CBS_MEASURES.KOOPWONINGEN_PCT}
            />
            <StatCard 
              label="Huurwoningen totaal" 
              value={huurwoningen} 
              measureId={CBS_MEASURES.HUURWONINGEN_PCT}
            />
            <StatCard 
              label="Corporatiebezit (totaal)" 
              value={corporatieBezit ? Math.round(corporatieBezit) : null} 
              measureId={CBS_MEASURES.CORPORATIE_BEZIT}
              unit=""
              showBar={false}
            />
          </div>
        </div>
      </div>
    );
  };

  // RENDER - Altijd tonen, ongeacht cbsData
  return (
    <div className="w-[600px] shadow-xl border-l-2 flex flex-col h-full transition-all duration-300 ease-in-out" style={{ 
      background: 'rgba(255, 255, 244, 0.98)',
      borderColor: '#83AF9A'
    }}>
      {/* Header met HOOFDKNOPPEN: Dashboard en Scenario's */}
      <div className="p-4 border-b-2 flex items-center justify-between" style={{ 
        background: 'linear-gradient(135deg, #20423C 0%, #2d5e54 100%)',
        borderColor: '#83AF9A'
      }}>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMainView('dashboard')}
            className="px-4 py-2 rounded-lg font-bold transition-all duration-200 hover:scale-105"
            style={{
              background: mainView === 'dashboard' ? '#83AF9A' : 'rgba(255,255,255,0.1)',
              color: mainView === 'dashboard' ? '#20423C' : 'white',
              fontFamily: 'Raleway, sans-serif'
            }}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setMainView('scenarios')}
            className="px-4 py-2 rounded-lg font-bold transition-all duration-200 hover:scale-105"
            style={{
              background: mainView === 'scenarios' ? '#83AF9A' : 'rgba(255,255,255,0.1)',
              color: mainView === 'scenarios' ? '#20423C' : 'white',
              fontFamily: 'Raleway, sans-serif'
            }}
          >
            🔥 Scenario's
          </button>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
            style={{ background: 'rgba(131, 175, 154, 0.3)', color: 'white' }}
            title="Sluit"
          >
            ×
          </button>
        )}
      </div>

      {/* SUBTABS - alleen voor Dashboard view */}
      {mainView === 'dashboard' && (
        <div className="border-b-2 overflow-x-auto" style={{ 
          background: 'white',
          borderColor: '#F3F3E2'
        }}>
          <div className="flex space-x-1 p-2">
            {dashboardTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap"
                style={{ 
                  background: activeTab === tab.id ? '#83AF9A' : '#F3F3E2',
                  color: '#20423C',
                  fontFamily: 'Raleway, sans-serif'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.background = 'rgba(131, 175, 154, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.background = '#F3F3E2';
                  }
                }}
              >
                {tab.icon} {tab.label.split(' ')[1]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Loading state - alleen voor dashboard */}
        {mainView === 'dashboard' && (loadingData || loadingDetails) && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{ borderColor: '#83AF9A' }}></div>
              <p className="text-sm" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Laden...</p>
            </div>
          </div>
        )}
        
        {/* Dashboard tabs content */}
        {mainView === 'dashboard' && !loadingData && !loadingDetails && Object.keys(cbsData).length > 0 && (
          <>
            {activeTab === 'overzicht' && renderOverzicht()}
            {activeTab === 'woningen' && renderWoningen()}
            {activeTab === 'energie' && renderEnergie()}
            {activeTab === 'gas' && renderGas()}
            {activeTab === 'eigendom' && renderEigendom()}
          </>
        )}

        {/* Dashboard - geen data */}
        {mainView === 'dashboard' && Object.keys(cbsData).length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-center" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
              Selecteer eerst buurten op de kaart om data te zien
            </p>
          </div>
        )}
        
        {/* Scenario's view */}
        {mainView === 'scenarios' && (
          <ScenarioCalculator 
            selectedBuurten={selectedBuurten}
            cbsData={cbsData}
            getGebiedNaam={getGebiedNaam}
            detailData={detailData}
          />
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t-2" style={{ 
        background: '#F3F3E2',
        borderColor: '#83AF9A'
      }}>
        <p className="text-xs text-center" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
          CBS Data • Tabel 85984NED • {selectedBuurten.length} buurten geselecteerd
        </p>
      </div>
    </div>
  );
}