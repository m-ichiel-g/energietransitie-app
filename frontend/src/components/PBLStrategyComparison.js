import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp } from 'lucide-react';

export default function PBLStrategyComparison({ 
  pblData, 
  selectedBuurten, 
  getGebiedNaam,
  onSelectStrategy 
}) {
  const [expandedBuurten, setExpandedBuurten] = useState({});
  const [isolatieNiveau, setIsolatieNiveau] = useState('B'); // B of D

  // Bereken gemiddelden over geselecteerde buurten
  const gemiddelden = useMemo(() => {
    if (!pblData || selectedBuurten.length === 0) return null;

    const suffix = `_label_${isolatieNiveau}_nationale_kosten`;
    
    const totalen = {
      S1: 0, S2: 0, S3: 0, S4: 0,
      S1_energie: 0, S2_energie: 0, S3_energie: 0, S4_energie: 0,
      count: 0
    };

    selectedBuurten.forEach(buurtCode => {
      const strategie = pblData.strategieen[buurtCode];
      if (!strategie) return;

      totalen.S1 += strategie[`S1${suffix}`] || 0;
      totalen.S2 += strategie[`S2${suffix}`] || 0;
      totalen.S3 += strategie[`S3${suffix}`] || 0;
      totalen.S4 += strategie[`S4${suffix}`] || 0;

      totalen.S1_energie += strategie.S1_energievraag || 0;
      totalen.S2_energie += strategie.S2_energievraag || 0;
      totalen.S3_energie += strategie.S3_energievraag || 0;
      totalen.S4_energie += strategie.S4_energievraag || 0;

      totalen.count++;
    });

    if (totalen.count === 0) return null;

    return {
      S1: Math.round(totalen.S1 / totalen.count),
      S2: Math.round(totalen.S2 / totalen.count),
      S3: Math.round(totalen.S3 / totalen.count),
      S4: Math.round(totalen.S4 / totalen.count),
      S1_energie: Math.round(totalen.S1_energie / totalen.count),
      S2_energie: Math.round(totalen.S2_energie / totalen.count),
      S3_energie: Math.round(totalen.S3_energie / totalen.count),
      S4_energie: Math.round(totalen.S4_energie / totalen.count),
    };
  }, [pblData, selectedBuurten, isolatieNiveau]);

  const strategieen = [
    {
      id: 'S1',
      naam: 'All-Electric',
      icon: '⚡',
      beschrijving: 'Individuele elektrische warmtepomp',
      kleur: '#83AF9A',
      co2_reductie: 100
    },
    {
      id: 'S2',
      naam: 'Warmtenet MT/HT',
      icon: '🏭',
      beschrijving: 'Warmtenet met midden/hogetemperatuurbron',
      kleur: '#6f9884',
      co2_reductie: 95
    },
    {
      id: 'S3',
      naam: 'Warmtenet LT',
      icon: '💧',
      beschrijving: 'Warmtenet met lagetemperatuurbron',
      kleur: '#20423C',
      co2_reductie: 95
    },
    {
      id: 'S4',
      naam: 'Klimaatneutraal gas',
      icon: '🔄',
      beschrijving: 'Hybride warmtepomp + groengas/waterstof',
      kleur: '#5a7c6e',
      co2_reductie: 70
    }
  ];

  const laagsteKosten = gemiddelden ? Math.min(gemiddelden.S1, gemiddelden.S2, gemiddelden.S3, gemiddelden.S4) : 0;

  const toggleBuurt = (buurtCode) => {
    setExpandedBuurten(prev => ({
      ...prev,
      [buurtCode]: !prev[buurtCode]
    }));
  };

  if (!pblData || selectedBuurten.length === 0) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
          Selecteer eerst buurten op de kaart om PBL strategieën te vergelijken
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header met isolatie toggle */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.2) 0%, rgba(243, 243, 226, 0.5) 100%)',
        borderColor: '#83AF9A'
      }}>
        <h3 className="font-bold text-lg mb-3" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          📊 PBL Strategievergelijking
        </h3>
        
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
            Gemiddelde nationale kosten voor <span className="font-bold" style={{ color: '#20423C' }}>{selectedBuurten.length}</span> geselecteerde buurten
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={() => setIsolatieNiveau('B')}
              className="px-3 py-1 rounded-lg text-sm font-semibold transition-all duration-200"
              style={{ 
                background: isolatieNiveau === 'B' ? '#83AF9A' : '#F3F3E2',
                color: '#20423C',
                fontFamily: 'Raleway, sans-serif'
              }}
            >
              Label B
            </button>
            <button
              onClick={() => setIsolatieNiveau('D')}
              className="px-3 py-1 rounded-lg text-sm font-semibold transition-all duration-200"
              style={{ 
                background: isolatieNiveau === 'D' ? '#83AF9A' : '#F3F3E2',
                color: '#20423C',
                fontFamily: 'Raleway, sans-serif'
              }}
            >
              Label D
            </button>
          </div>
        </div>

        <p className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
          💡 Schillabel {isolatieNiveau} geeft het isolatieniveau aan. Label B = goed geïsoleerd, Label D = basisisolatie.
        </p>
      </div>

      {/* Strategie cards */}
      <div className="grid grid-cols-2 gap-4">
        {strategieen.map(strategie => {
          const kosten = gemiddelden[strategie.id];
          const isLaagste = kosten === laagsteKosten;
          const energie = gemiddelden[`${strategie.id}_energie`];

          return (
            <div 
              key={strategie.id}
              className="p-4 rounded-xl border-2 shadow-lg transition-all duration-300 hover:scale-102 cursor-pointer"
              style={{ 
                background: 'white',
                borderColor: isLaagste ? strategie.kleur : '#F3F3E2',
                borderWidth: isLaagste ? '3px' : '2px'
              }}
              onClick={() => onSelectStrategy && onSelectStrategy(strategie.id, kosten)}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold flex items-center" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                  <span className="text-2xl mr-2">{strategie.icon}</span>
                  {strategie.naam}
                </h4>
                {isLaagste && (
                  <div className="px-2 py-1 rounded-full text-xs font-semibold" style={{ 
                    background: `${strategie.kleur}30`,
                    color: strategie.kleur,
                    fontFamily: 'Raleway, sans-serif'
                  }}>
                    Laagste kosten
                  </div>
                )}
              </div>

              <p className="text-xs mb-3" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                {strategie.beschrijving}
              </p>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                    Kosten/woning
                  </span>
                  <span className="text-xl font-bold" style={{ color: strategie.kleur, fontFamily: 'Raleway, sans-serif' }}>
                    €{kosten.toLocaleString('nl-NL')}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                    Energievraag
                  </span>
                  <span className="text-sm font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                    {energie} GJ/jr
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                    CO₂ reductie
                  </span>
                  <span className="text-sm font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                    {strategie.co2_reductie}%
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t-2" style={{ borderColor: '#F3F3E2' }}>
                <div className="text-xs text-center" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                  Klik om scenario calculator te openen →
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail per buurt (expandable) */}
      <div className="mt-6">
        <h4 className="font-bold mb-3" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          📍 Detail per buurt
        </h4>

        {selectedBuurten.map(buurtCode => {
          const strategie = pblData.strategieen[buurtCode];
          if (!strategie) return null;

          const isExpanded = expandedBuurten[buurtCode];
          const suffix = `_label_${isolatieNiveau}_nationale_kosten`;

          const buurtKosten = {
            S1: strategie[`S1${suffix}`],
            S2: strategie[`S2${suffix}`],
            S3: strategie[`S3${suffix}`],
            S4: strategie[`S4${suffix}`]
          };

          const laagsteBuurt = Math.min(...Object.values(buurtKosten));

          return (
            <div key={buurtCode} className="mb-2 border-2 rounded-xl overflow-hidden" style={{ 
              borderColor: '#83AF9A',
              background: '#F3F3E2'
            }}>
              <button
                onClick={() => toggleBuurt(buurtCode)}
                className="w-full p-3 flex items-center justify-between transition-all duration-200"
                style={{ background: 'rgba(131, 175, 154, 0.1)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(131, 175, 154, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(131, 175, 154, 0.1)'}
              >
                <span className="font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                  {getGebiedNaam(buurtCode)}
                </span>
                {isExpanded ? <ChevronUp size={20} color="#83AF9A" /> : <ChevronDown size={20} color="#83AF9A" />}
              </button>

              {isExpanded && (
                <div className="p-4 space-y-2" style={{ background: 'white' }}>
                  {strategieen.map(strat => {
                    const kosten = buurtKosten[strat.id];
                    const isLaagste = kosten === laagsteBuurt;

                    return (
                      <div key={strat.id} className="flex items-center justify-between p-2 rounded-lg" style={{ 
                        background: isLaagste ? 'rgba(131, 175, 154, 0.15)' : '#F3F3E2'
                      }}>
                        <span className="text-sm flex items-center" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                          <span className="mr-2">{strat.icon}</span>
                          {strat.naam}
                          {isLaagste && <TrendingDown size={16} color="#83AF9A" className="ml-2" />}
                        </span>
                        <span className="text-sm font-bold" style={{ 
                          color: isLaagste ? '#83AF9A' : '#20423C',
                          fontFamily: 'Raleway, sans-serif'
                        }}>
                          €{kosten?.toLocaleString('nl-NL') || 'N/A'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }