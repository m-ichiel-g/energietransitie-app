import React, { useState, useEffect } from 'react';

export default function ScenarioCalculator({ 
  selectedBuurten, 
  cbsData,
  getGebiedNaam,
  detailData 
}) {
  const [activeSubTab, setActiveSubTab] = useState('scenarios');
  const [kengetallen, setKengetallen] = useState({
    // Isolatie
    isolatieKostenBasis: 15000,
    isolatieKostenGoed: 35000,
    isolatieKostenZeerGoed: 55000,
    
    // All-Electric
    warmtepompKosten: 18000,
    warmtepompOnderhoud: 350,
    elektriciteitTarief: 0.40,
    elektriciteitsverzwaringPerWoning: 2500,
    
    // Hybride
    hybridePompKosten: 12000,
    hybridePompOnderhoud: 300,
    groenGasTarief: 1.50,
    
    // Collectief Warmtenet
    warmtenetAansluiting: 8000,
    warmtenetLevering: 0.75,
    warmtenetOnderhoud: 200,
    infrastructuurKostenPerWoning: 5000,
    
    // Subsidies
    isdeSubsidieWP: 2100,
    isdeSubsidieHybride: 1500,
    
    // Doorlooptijd (jaren)
    doorlooptijdAllElectric: 8,
    doorlooptijdHybride: 6,
    doorlooptijdCollectief: 12
  });

  // CBS Measure IDs
  const CBS_MEASURES = {
    AARDGAS_VERBRUIK: 'M000219_2',
    AARDGAS_WONINGEN_PCT: 'M008296',
    EENGEZINSWONING_PCT: 'ZW10290',
    MEERGEZINSWONING_PCT: 'ZW10340'
  };

  // Haal gemiddelde CBS data op voor geselecteerde buurten
  const getGemiddeldeCBSData = () => {
    if (!detailData || selectedBuurten.length === 0) {
      return {
        gemiddeldGasverbruik: 1200,
        percentageGaswoningen: 90,
        percentageEengezins: 50,
        percentageMeergezins: 50
      };
    }

    const gasVerbruiken = selectedBuurten
      .map(code => detailData[code]?.[CBS_MEASURES.AARDGAS_VERBRUIK])
      .filter(val => val !== undefined && val !== null);
    
    const gasWoningen = selectedBuurten
      .map(code => detailData[code]?.[CBS_MEASURES.AARDGAS_WONINGEN_PCT])
      .filter(val => val !== undefined && val !== null);
    
    const eengezins = selectedBuurten
      .map(code => detailData[code]?.[CBS_MEASURES.EENGEZINSWONING_PCT])
      .filter(val => val !== undefined && val !== null);
    
    const meergezins = selectedBuurten
      .map(code => detailData[code]?.[CBS_MEASURES.MEERGEZINSWONING_PCT])
      .filter(val => val !== undefined && val !== null);

    return {
      gemiddeldGasverbruik: gasVerbruiken.length > 0 
        ? gasVerbruiken.reduce((a, b) => a + b, 0) / gasVerbruiken.length 
        : 1200,
      percentageGaswoningen: gasWoningen.length > 0
        ? gasWoningen.reduce((a, b) => a + b, 0) / gasWoningen.length
        : 90,
      percentageEengezins: eengezins.length > 0
        ? eengezins.reduce((a, b) => a + b, 0) / eengezins.length
        : 50,
      percentageMeergezins: meergezins.length > 0
        ? meergezins.reduce((a, b) => a + b, 0) / meergezins.length
        : 50
    };
  };

  // Bereken totalen per scenario
  const berekenScenarios = () => {
    const totaalWoningen = selectedBuurten.reduce((sum, code) => {
      return sum + (cbsData[code]?.aantalWoningen || 0);
    }, 0);

    if (totaalWoningen === 0) return null;

    const cbsInfo = getGemiddeldeCBSData();
    const gasEquivalentInKWh = cbsInfo.gemiddeldGasverbruik * 9.77;

    // Bepaal isolatiekosten op basis van woningtype
    const gemiddeldIsolatieKosten = 
      (cbsInfo.percentageEengezins / 100 * kengetallen.isolatieKostenGoed) +
      (cbsInfo.percentageMeergezins / 100 * kengetallen.isolatieKostenBasis);

    // All-Electric Scenario
    const allElectric = {
      naam: 'All-Electric',
      icon: '⚡',
      kleur: '#83AF9A',
      investeringPerWoning: 
        gemiddeldIsolatieKosten + 
        kengetallen.warmtepompKosten + 
        kengetallen.elektriciteitsverzwaringPerWoning -
        kengetallen.isdeSubsidieWP,
      jaarlijkseKostenPerWoning: 
        (gasEquivalentInKWh * 0.3 * kengetallen.elektriciteitTarief) + 
        kengetallen.warmtepompOnderhoud,
      co2ReductiePercentage: 100,
      doorlooptijd: kengetallen.doorlooptijdAllElectric,
      voordelen: ['Volledig aardgasvrij', 'Geen gasnet onderhoud', 'Hoge CO2 reductie'],
      nadelen: ['Hoge initiële kosten', 'Netbelasting', 'Goede isolatie vereist'],
      gebaseerdOp: `${cbsInfo.percentageGaswoningen.toFixed(0)}% gaswoningen, gem. ${Math.round(cbsInfo.gemiddeldGasverbruik)} m³/jaar`
    };

    // Hybride Scenario
    const hybride = {
      naam: 'Hybride',
      icon: '🔄',
      kleur: '#6f9884',
      investeringPerWoning: 
        kengetallen.isolatieKostenBasis + 
        kengetallen.hybridePompKosten -
        kengetallen.isdeSubsidieHybride,
      jaarlijkseKostenPerWoning: 
        (gasEquivalentInKWh * 0.5 * kengetallen.elektriciteitTarief) + 
        (cbsInfo.gemiddeldGasverbruik * 0.3 * kengetallen.groenGasTarief) + 
        kengetallen.hybridePompOnderhoud,
      co2ReductiePercentage: 70,
      doorlooptijd: kengetallen.doorlooptijdHybride,
      voordelen: ['Lagere initiële kosten', 'Gasnet blijft beschikbaar', 'Snelle implementatie'],
      nadelen: ['Nog deels afhankelijk van gas', 'Beperkte CO2 reductie', 'Transitie scenario'],
      gebaseerdOp: `Hybride geschikt voor ${cbsInfo.percentageGaswoningen.toFixed(0)}% van woningen`
    };

    // Collectief Warmtenet - schaalvoordeel bij meer woningen
    const schaalkorting = Math.min(totaalWoningen / 500, 1.5); // Max 50% korting bij grote aantallen
    const collectief = {
      naam: 'Collectief Warmtenet',
      icon: '🏘️',
      kleur: '#20423C',
      investeringPerWoning: 
        kengetallen.isolatieKostenBasis + 
        kengetallen.warmtenetAansluiting +
        (kengetallen.infrastructuurKostenPerWoning / schaalkorting),
      jaarlijkseKostenPerWoning: 
        (gasEquivalentInKWh * kengetallen.warmtenetLevering / 9.77) + 
        kengetallen.warmtenetOnderhoud,
      co2ReductiePercentage: 95,
      doorlooptijd: kengetallen.doorlooptijdCollectief,
      voordelen: ['Schaalvoordeel', 'Zeer lage CO2', 'Geen individuele installatie'],
      nadelen: ['Lange doorlooptijd', 'Afhankelijk van warmtebron', 'Hoge infrastructuurkosten'],
      gebaseerdOp: `${totaalWoningen} woningen → schaalkorting ${((1 - 1/schaalkorting) * 100).toFixed(0)}%`
    };

    return {
      totaalWoningen,
      cbsInfo,
      scenarios: [allElectric, hybride, collectief]
    };
  };

  const resultaten = berekenScenarios();

  const updateKengetal = (key, value) => {
    setKengetallen(prev => ({
      ...prev,
      [key]: parseFloat(value) || 0
    }));
  };

  const renderKengetallen = () => (
    <div className="space-y-4">
      {/* Info box */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'rgba(131, 175, 154, 0.1)',
        borderColor: '#83AF9A'
      }}>
        <p className="text-sm" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          💡 <strong>Tip:</strong> Pas de kengetallen hieronder aan om te zien hoe dit de scenario's beïnvloedt. 
          De berekeningen worden automatisch bijgewerkt.
        </p>
      </div>

      {/* Isolatie */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'white',
        borderColor: '#F3F3E2'
      }}>
        <h3 className="font-bold mb-3 flex items-center" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          🏠 Isolatiekosten (per woning)
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Basisisolatie (label C/D)
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg">€</span>
              <input
                type="number"
                value={kengetallen.isolatieKostenBasis}
                onChange={(e) => updateKengetal('isolatieKostenBasis', e.target.value)}
                className="flex-1 px-3 py-2 border-2 rounded-lg"
                style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Goede isolatie (label B)
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg">€</span>
              <input
                type="number"
                value={kengetallen.isolatieKostenGoed}
                onChange={(e) => updateKengetal('isolatieKostenGoed', e.target.value)}
                className="flex-1 px-3 py-2 border-2 rounded-lg"
                style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Zeer goede isolatie (label A+)
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg">€</span>
              <input
                type="number"
                value={kengetallen.isolatieKostenZeerGoed}
                onChange={(e) => updateKengetal('isolatieKostenZeerGoed', e.target.value)}
                className="flex-1 px-3 py-2 border-2 rounded-lg"
                style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* All-Electric */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'white',
        borderColor: '#F3F3E2'
      }}>
        <h3 className="font-bold mb-3 flex items-center" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          ⚡ All-Electric Kengetallen
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Warmtepomp installatie
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg">€</span>
              <input
                type="number"
                value={kengetallen.warmtepompKosten}
                onChange={(e) => updateKengetal('warmtepompKosten', e.target.value)}
                className="flex-1 px-3 py-2 border-2 rounded-lg"
                style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Jaarlijks onderhoud
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg">€</span>
              <input
                type="number"
                value={kengetallen.warmtepompOnderhoud}
                onChange={(e) => updateKengetal('warmtepompOnderhoud', e.target.value)}
                className="flex-1 px-3 py-2 border-2 rounded-lg"
                style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Elektriciteitstarief (per kWh)
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg">€</span>
              <input
                type="number"
                step="0.01"
                value={kengetallen.elektriciteitTarief}
                onChange={(e) => updateKengetal('elektriciteitTarief', e.target.value)}
                className="flex-1 px-3 py-2 border-2 rounded-lg"
                style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Netverzwaring per woning
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg">€</span>
              <input
                type="number"
                value={kengetallen.elektriciteitsverzwaringPerWoning}
                onChange={(e) => updateKengetal('elektriciteitsverzwaringPerWoning', e.target.value)}
                className="flex-1 px-3 py-2 border-2 rounded-lg"
                style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              ISDE subsidie
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg">€</span>
              <input
                type="number"
                value={kengetallen.isdeSubsidieWP}
                onChange={(e) => updateKengetal('isdeSubsidieWP', e.target.value)}
                className="flex-1 px-3 py-2 border-2 rounded-lg"
                style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Doorlooptijd (jaren)
            </label>
            <input
              type="number"
              value={kengetallen.doorlooptijdAllElectric}
              onChange={(e) => updateKengetal('doorlooptijdAllElectric', e.target.value)}
              className="w-full px-3 py-2 border-2 rounded-lg"
              style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
            />
          </div>
        </div>
      </div>

      {/* Hybride */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'white',
        borderColor: '#F3F3E2'
      }}>
        <h3 className="font-bold mb-3 flex items-center" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          🔄 Hybride Kengetallen
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Hybride warmtepomp installatie
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg">€</span>
              <input
                type="number"
                value={kengetallen.hybridePompKosten}
                onChange={(e) => updateKengetal('hybridePompKosten', e.target.value)}
                className="flex-1 px-3 py-2 border-2 rounded-lg"
                style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Jaarlijks onderhoud
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg">€</span>
              <input
                type="number"
                value={kengetallen.hybridePompOnderhoud}
                onChange={(e) => updateKengetal('hybridePompOnderhoud', e.target.value)}
                className="flex-1 px-3 py-2 border-2 rounded-lg"
                style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Groen gas tarief (per m³)
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg">€</span>
              <input
                type="number"
                step="0.01"
                value={kengetallen.groenGasTarief}
                onChange={(e) => updateKengetal('groenGasTarief', e.target.value)}
                className="flex-1 px-3 py-2 border-2 rounded-lg"
                style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              ISDE subsidie
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg">€</span>
              <input
                type="number"
                value={kengetallen.isdeSubsidieHybride}
                onChange={(e) => updateKengetal('isdeSubsidieHybride', e.target.value)}
                className="flex-1 px-3 py-2 border-2 rounded-lg"
                style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Doorlooptijd (jaren)
            </label>
            <input
              type="number"
              value={kengetallen.doorlooptijdHybride}
              onChange={(e) => updateKengetal('doorlooptijdHybride', e.target.value)}
              className="w-full px-3 py-2 border-2 rounded-lg"
              style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
            />
          </div>
        </div>
      </div>

      {/* Collectief */}
      <div className="p-4 rounded-xl border-2" style={{ 
        background: 'white',
        borderColor: '#F3F3E2'
      }}>
        <h3 className="font-bold mb-3 flex items-center" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          🏘️ Collectief Warmtenet Kengetallen
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Aansluiting per woning
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg">€</span>
              <input
                type="number"
                value={kengetallen.warmtenetAansluiting}
                onChange={(e) => updateKengetal('warmtenetAansluiting', e.target.value)}
                className="flex-1 px-3 py-2 border-2 rounded-lg"
                style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Warmtelevering (per GJ)
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg">€</span>
              <input
                type="number"
                step="0.01"
                value={kengetallen.warmtenetLevering}
                onChange={(e) => updateKengetal('warmtenetLevering', e.target.value)}
                className="flex-1 px-3 py-2 border-2 rounded-lg"
                style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Jaarlijks onderhoud
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg">€</span>
              <input
                type="number"
                value={kengetallen.warmtenetOnderhoud}
                onChange={(e) => updateKengetal('warmtenetOnderhoud', e.target.value)}
                className="flex-1 px-3 py-2 border-2 rounded-lg"
                style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Infrastructuur per woning
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-lg">€</span>
              <input
                type="number"
                value={kengetallen.infrastructuurKostenPerWoning}
                onChange={(e) => updateKengetal('infrastructuurKostenPerWoning', e.target.value)}
                className="flex-1 px-3 py-2 border-2 rounded-lg"
                style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Doorlooptijd (jaren)
            </label>
            <input
              type="number"
              value={kengetallen.doorlooptijdCollectief}
              onChange={(e) => updateKengetal('doorlooptijdCollectief', e.target.value)}
              className="w-full px-3 py-2 border-2 rounded-lg"
              style={{ borderColor: '#F3F3E2', fontFamily: 'Raleway, sans-serif' }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderScenarios = () => {
    if (!resultaten) {
      return (
        <div className="p-8 text-center">
          <p style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
            Selecteer eerst buurten om scenario's te berekenen
          </p>
        </div>
      );
    }

    const { totaalWoningen, cbsInfo, scenarios } = resultaten;

    return (
      <div className="space-y-4">
        {/* Overzicht Header */}
        <div className="p-4 rounded-xl border-2" style={{ 
          background: 'linear-gradient(135deg, rgba(131, 175, 154, 0.2) 0%, rgba(243, 243, 226, 0.5) 100%)',
          borderColor: '#83AF9A'
        }}>
          <h3 className="font-bold text-lg mb-2" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
            Scenario Analyse Warmtetransitie
          </h3>
          <p className="text-sm" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
            Berekend voor <span className="font-bold" style={{ color: '#20423C' }}>{totaalWoningen.toLocaleString('nl-NL')}</span> woningen 
            in {selectedBuurten.length} buurten
          </p>
          <div className="mt-2 text-xs space-y-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
            <p>📊 {cbsInfo.percentageEengezins.toFixed(0)}% eengezinswoningen, {cbsInfo.percentageMeergezins.toFixed(0)}% meergezinswoningen</p>
            <p>🔥 {cbsInfo.percentageGaswoningen.toFixed(0)}% gaswoningen (gem. {Math.round(cbsInfo.gemiddeldGasverbruik)} m³/jaar)</p>
          </div>
        </div>

        {/* Scenario Cards */}
        {scenarios.map((scenario, idx) => (
          <div key={idx} className="p-4 rounded-xl border-2 shadow-lg transition-all duration-300 hover:scale-102" style={{ 
            background: 'white',
            borderColor: scenario.kleur
          }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg flex items-center" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                <span className="text-2xl mr-2">{scenario.icon}</span>
                {scenario.naam}
              </h3>
              <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ 
                background: `${scenario.kleur}20`,
                color: scenario.kleur,
                fontFamily: 'Raleway, sans-serif'
              }}>
                {scenario.co2ReductiePercentage}% CO₂ reductie
              </div>
            </div>

            {/* Gebaseerd op CBS data */}
            <p className="text-xs mb-3 italic" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
              💡 {scenario.gebaseerdOp}
            </p>

            {/* Kosten Grid */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-lg" style={{ background: '#F3F3E2' }}>
                <p className="text-xs mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                  Investering per woning
                </p>
                <p className="text-xl font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                  €{Math.round(scenario.investeringPerWoning).toLocaleString('nl-NL')}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: '#F3F3E2' }}>
                <p className="text-xs mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                  Totale investering
                </p>
                <p className="text-xl font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                  €{(scenario.investeringPerWoning * totaalWoningen / 1000000).toFixed(1)}M
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: '#F3F3E2' }}>
                <p className="text-xs mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                  Jaarlijks per woning
                </p>
                <p className="text-xl font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                  €{Math.round(scenario.jaarlijkseKostenPerWoning).toLocaleString('nl-NL')}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: '#F3F3E2' }}>
                <p className="text-xs mb-1" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                  Doorlooptijd
                </p>
                <p className="text-xl font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                  {scenario.doorlooptijd} jaar
                </p>
              </div>
            </div>

            {/* Voordelen & Nadelen */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                  ✓ Voordelen
                </p>
                <ul className="space-y-1">
                  {scenario.voordelen.map((v, i) => (
                    <li key={i} className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                      • {v}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                  ⚠ Aandachtspunten
                </p>
                <ul className="space-y-1">
                  {scenario.nadelen.map((n, i) => (
                    <li key={i} className="text-xs" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                      • {n}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}

        {/* Vergelijkingstabel */}
        <div className="p-4 rounded-xl border-2" style={{ 
          background: 'white',
          borderColor: '#83AF9A'
        }}>
          <h3 className="font-bold mb-3" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
            📊 Vergelijking
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid #F3F3E2' }}>
                  <th className="text-left p-2" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>Criterium</th>
                  {scenarios.map((s, i) => (
                    <th key={i} className="text-center p-2" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                      {s.icon} {s.naam}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #F3F3E2' }}>
                  <td className="p-2" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Investering/woning</td>
                  {scenarios.map((s, i) => (
                    <td key={i} className="text-center p-2 font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                      €{Math.round(s.investeringPerWoning).toLocaleString('nl-NL')}
                    </td>
                  ))}
                </tr>
                <tr style={{ borderBottom: '1px solid #F3F3E2' }}>
                  <td className="p-2" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Jaarlijks/woning</td>
                  {scenarios.map((s, i) => (
                    <td key={i} className="text-center p-2 font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                      €{Math.round(s.jaarlijkseKostenPerWoning).toLocaleString('nl-NL')}
                    </td>
                  ))}
                </tr>
                <tr style={{ borderBottom: '1px solid #F3F3E2' }}>
                  <td className="p-2" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>CO₂ reductie</td>
                  {scenarios.map((s, i) => (
                    <td key={i} className="text-center p-2 font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                      {s.co2ReductiePercentage}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>Doorlooptijd</td>
                  {scenarios.map((s, i) => (
                    <td key={i} className="text-center p-2 font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                      {s.doorlooptijd} jaar
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const subTabs = [
    { id: 'scenarios', label: '📊 Scenario\'s', icon: '📊' },
    { id: 'kengetallen', label: '⚙️ Kengetallen', icon: '⚙️' }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tab navigatie */}
      <div className="border-b-2 p-2" style={{ 
        background: 'white',
        borderColor: '#F3F3E2'
      }}>
        <div className="flex space-x-1">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap"
              style={{ 
                background: activeSubTab === tab.id ? '#83AF9A' : '#F3F3E2',
                color: '#20423C',
                fontFamily: 'Raleway, sans-serif'
              }}
              onMouseEnter={(e) => {
                if (activeSubTab !== tab.id) {
                  e.target.style.background = 'rgba(131, 175, 154, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeSubTab !== tab.id) {
                  e.target.style.background = '#F3F3E2';
                }
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeSubTab === 'kengetallen' && renderKengetallen()}
        {activeSubTab === 'scenarios' && renderScenarios()}
      </div>
    </div>
  );
}