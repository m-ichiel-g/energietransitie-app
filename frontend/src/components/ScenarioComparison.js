import React, { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, Zap, BarChart3, ChevronRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, Cell
} from 'recharts';
import {
  getStrategieData,
  berekenCO2Reductie,
  getStrategieCodeFromKolom,
  getStrategieLabelFromKolom,
  getStrategieColor,
  getStrategieIcon,
  formatEuro,
  formatNumber
} from './utils/scenarioCalculations';

/**
 * ScenarioComparison Component
 * Uitgebreide vergelijking van scenario's met filters, charts en drill-down
 */
export default function ScenarioComparison({ 
  parsedData, 
  selectedBuurten,
  baselineKolom = 'Referentie_2030',
  selectedStrategies: externalSelectedStrategies
}) {
  // Gebruik externe selectie of fallback
  const selectedStrategies = externalSelectedStrategies || ['Strategie_1', 'Strategie_2', 'Strategie_3', 'Strategie_4'];
  
  const [selectedStrategie, setSelectedStrategie] = useState(null);
  const [chartType, setChartType] = useState('kosten');

  // Bereid buurt data voor
  const buurten = useMemo(() => {
    if (!parsedData || !selectedBuurten || selectedBuurten.length === 0) return [];
    
    return selectedBuurten
      .map(code => parsedData.buurten[code])
      .filter(b => b && b.strategieMatrix);
  }, [parsedData, selectedBuurten]);

  // Bereken baseline data
  const baselineData = useMemo(() => {
    if (!buurten.length) return null;
    return getStrategieData(buurten, baselineKolom);
  }, [buurten, baselineKolom]);

  // Bereken data voor geselecteerde strategieën
  const strategieComparisons = useMemo(() => {
    if (!buurten.length || !baselineData) return [];
    
    return selectedStrategies.map(kolom => {
      const data = getStrategieData(buurten, kolom);
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
          co2: data.gemiddeldes?.H15_CO2_uitstoot || 0,
          kostenPerTon: data.gemiddeldes?.H17_Nat_meerkost_CO2 || 0,
          totaleKosten: data.gemiddeldes?.H16_Nat_meerkost || 0,
          kapitaalslasten: data.gemiddeldes?.K10_Totaal_Kapitaalslasten || 0,
          variabeleKosten: data.gemiddeldes?.K17_Totaal_Variabele_kosten || 0,
          energieVerbruik: data.gemiddeldes?.H09_Input_aardgas || 0,
          elektriciteitInput: data.gemiddeldes?.H08_Input_elektriciteit || 0
        }
      };
    });
  }, [buurten, baselineData, selectedStrategies]);

  // Data voor chart
  const chartData = useMemo(() => {
    return strategieComparisons.map(s => ({
      name: s.label.length > 30 ? s.label.substring(0, 27) + '...' : s.label,
      fullName: s.label,
      kostenPerTon: Math.round(s.metrics.kostenPerTon),
      co2: parseFloat(s.metrics.co2.toFixed(1)),
      totaleKosten: Math.round(s.metrics.totaleKosten / 1000), // in k€
      kapitaal: Math.round(s.metrics.kapitaalslasten / 1000),
      variabel: Math.round(s.metrics.variabeleKosten / 1000),
      energie: parseFloat(s.metrics.energieVerbruik.toFixed(1)),
      elektriciteit: parseFloat(s.metrics.elektriciteitInput.toFixed(1)),
      color: s.color,
        co2Reductie: s.co2Reductie
      }));
  }, [strategieComparisons, selectedStrategies]);

  // Custom tooltip voor charts
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    
    return (
      <div className="p-3 rounded-lg shadow-lg" style={{ background: 'white', border: '2px solid #F3F3E2' }}>
        <p className="font-bold mb-2" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
          {data.fullName}
        </p>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between space-x-3 text-sm">
            <span style={{ color: entry.color, fontFamily: 'Raleway, sans-serif' }}>
              {entry.name}:
            </span>
            <span className="font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              {entry.value.toLocaleString('nl-NL')}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Render sidebar met filters
  // Render main content area
  const renderMainContent = () => {
    if (selectedStrategies.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <BarChart3 size={64} className="mx-auto mb-4" style={{ color: '#CBD5E1' }} />
            <p className="text-lg font-semibold mb-2" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Geen scenario's geselecteerd
            </p>
            <p style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
              Selecteer scenario's in de sidebar om ze te vergelijken
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6 overflow-y-auto h-full">
        {/* Chart type selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
            Scenario Vergelijking
          </h2>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setChartType('kosten')}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-2"
              style={{
                background: chartType === 'kosten' ? '#83AF9A' : '#F3F3E2',
                color: chartType === 'kosten' ? 'white' : '#20423C',
                fontFamily: 'Raleway, sans-serif'
              }}
            >
              <DollarSign size={16} />
              <span>Kosten</span>
            </button>
            <button
              onClick={() => setChartType('co2')}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-2"
              style={{
                background: chartType === 'co2' ? '#83AF9A' : '#F3F3E2',
                color: chartType === 'co2' ? 'white' : '#20423C',
                fontFamily: 'Raleway, sans-serif'
              }}
            >
              <TrendingUp size={16} />
              <span>CO₂</span>
            </button>
            <button
              onClick={() => setChartType('energie')}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-2"
              style={{
                background: chartType === 'energie' ? '#83AF9A' : '#F3F3E2',
                color: chartType === 'energie' ? 'white' : '#20423C',
                fontFamily: 'Raleway, sans-serif'
              }}
            >
              <Zap size={16} />
              <span>Energie</span>
            </button>
          </div>
        </div>

        {/* Chart */}
        {chartType === 'kosten' && (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="font-bold text-lg mb-4" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Kosten per Ton CO₂ Besparing
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F3E2" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  style={{ fontSize: '12px', fontFamily: 'Raleway, sans-serif', fill: '#6b7280' }}
                />
                <YAxis 
                  label={{ value: '€ per ton CO₂', angle: -90, position: 'insideLeft', style: { fontFamily: 'Raleway, sans-serif' } }}
                  style={{ fontSize: '12px', fontFamily: 'Raleway, sans-serif', fill: '#6b7280' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="kostenPerTon" name="Kosten per ton CO₂" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartType === 'co2' && (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="font-bold text-lg mb-4" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              CO₂ Uitstoot per Scenario
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F3E2" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  style={{ fontSize: '12px', fontFamily: 'Raleway, sans-serif', fill: '#6b7280' }}
                />
                <YAxis 
                  label={{ value: 'CO₂ uitstoot (Mg/jaar)', angle: -90, position: 'insideLeft', style: { fontFamily: 'Raleway, sans-serif' } }}
                  style={{ fontSize: '12px', fontFamily: 'Raleway, sans-serif', fill: '#6b7280' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="co2" name="CO₂ uitstoot" fill="#10B981" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartType === 'energie' && (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="font-bold text-lg mb-4" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Energieverbruik per Scenario
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F3E2" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  style={{ fontSize: '12px', fontFamily: 'Raleway, sans-serif', fill: '#6b7280' }}
                />
                <YAxis 
                  label={{ value: 'Energieverbruik (GJ/WEQ)', angle: -90, position: 'insideLeft', style: { fontFamily: 'Raleway, sans-serif' } }}
                  style={{ fontSize: '12px', fontFamily: 'Raleway, sans-serif', fill: '#6b7280' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="energie" name="Aardgas" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                <Bar dataKey="elektriciteit" name="Elektriciteit" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Comparison table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b" style={{ background: '#F3F3E2', borderColor: '#E5E7EB' }}>
            <h3 className="font-bold text-lg" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
              Gedetailleerde Vergelijking
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: '#F9FAFB' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                    Scenario
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                    CO₂ Reductie
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                    € per ton CO₂
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                    Totale kosten
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                    Kapitaalslasten
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                    Variabele kosten
                  </th>
                </tr>
              </thead>
              <tbody>
                {strategieComparisons
                  .filter(s => selectedStrategies.includes(s.kolom))
                  .map((strat, idx) => (
                    <tr key={idx} className="border-t" style={{ borderColor: '#F3F3E2' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{strat.icon}</span>
                          <span className="text-sm font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                            {strat.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold" style={{ color: strat.co2Reductie > 0 ? '#10B981' : '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                          {strat.co2Reductie.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                          {formatEuro(strat.metrics.kostenPerTon, false)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
                          {formatEuro(strat.metrics.totaleKosten, true)}/jr
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                          {formatEuro(strat.metrics.kapitaalslasten, true)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
                          {formatEuro(strat.metrics.variabeleKosten, true)}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Main render
  if (!parsedData || !buurten.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2" style={{ color: '#20423C', fontFamily: 'Raleway, sans-serif' }}>
            Geen data beschikbaar
          </p>
          <p style={{ color: '#6b7280', fontFamily: 'Raleway, sans-serif' }}>
            Upload eerst PBL scenario data en selecteer buurten
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full" style={{ background: '#FAFAFA' }}>
      {/* Main content zonder filters - filters zitten in sidebar */}
      <div className="h-full overflow-y-auto">
        {renderMainContent()}
      </div>
    </div>
  );
}