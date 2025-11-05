import React, { useMemo } from 'react';
import { BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const COLORS = {
  S1: '#3B82F6', S2: '#F97316', S3: '#A855F7', S4: '#22C55E',
  ref: '#6B7280', primary: '#83AF9A', gray: '#6b7280', dark: '#20423C'
};

export default function ScenarioOverzicht({ pblData, selectedBuurten, baselineKolom, onSelectStrategie }) {
  
  const strategieData = useMemo(() => {
    const buurten = selectedBuurten.map(c => pblData.buurten[c]).filter(b => b && b.strategieMatrix);
    if (buurten.length === 0) return null;

    const strategieen = ['Strategie_1', 'Strategie_2', 'Strategie_3', 'Strategie_4'];
    
    return strategieen.map((kolom, idx) => {
      // Haal variant code op
      const variantCodeRaw = buurten[0].strategieMatrix['V01_Strategievariant']?.[kolom] || `s${idx+1}a`;
      const variantCode = String(variantCodeRaw).toLowerCase();
      
      // Parse: s1a → S1, variant a, schillabel B+
      const strategieNr = variantCode.match(/s(\d)/)?.[1] || (idx + 1);
      const variant = variantCode.match(/s\d([a-z])/)?.[1] || 'a';
      
      // Bepaal schillabel uit variant code (a-e = B+, f-h = D+)
      const schillabel = ['a', 'b', 'c', 'd', 'e'].includes(variant) ? 'B+' : 'D+';
      
      // Aggregeer indicatoren
      const avg = (indicator) => {
        const sum = buurten.reduce((acc, b) => {
          const val = b.strategieMatrix[indicator]?.[kolom];
          return acc + (typeof val === 'number' ? val : 0);
        }, 0);
        return sum / buurten.length;
      };

      const sum = (indicator) => {
        return buurten.reduce((acc, b) => {
          const val = b.strategieMatrix[indicator]?.[kolom];
          return acc + (typeof val === 'number' ? val : 0);
        }, 0);
      };

      // Baseline voor CO2 reductie
      const baselineCO2 = buurten.reduce((acc, b) => {
        const val = b.strategieMatrix['H15_CO2_uitstoot']?.[baselineKolom];
        return acc + (typeof val === 'number' ? val : 0);
      }, 0);

      const strategieCO2 = sum('H15_CO2_uitstoot');
      const co2Reductie = baselineCO2 - strategieCO2;

      return {
        code: `S${strategieNr}`,
        naam: getNaam(strategieNr),
        variant: variant.toUpperCase(),
        variantCode: variantCode,
        schillabel: schillabel,
        color: COLORS[`S${strategieNr}`],
        kosten: avg('H17_Nat_meerkost_CO2'),
        totaleKosten: sum('H16_Nat_meerkost'),
        co2Reductie: co2Reductie,
        co2Uitstoot: strategieCO2,
        energie: avg('H01_Vraag_totaal'),
        aansluitingen: {
          totaal: sum('A01_Aansl_aardgas') + sum('A02_Aansl_eWP') + sum('A03_Aansl_MT') + sum('A04_Aansl_LT'),
          aardgas: sum('A01_Aansl_aardgas'),
          ewp: sum('A02_Aansl_eWP'),
          mt: sum('A03_Aansl_MT'),
          lt: sum('A04_Aansl_LT'),
          hwp: sum('A05_Aansl_hWP_HG'),
          hr: sum('A06_Aansl_HR_HG')
        }
      };
    });
  }, [pblData, selectedBuurten, baselineKolom]);

  if (!strategieData) {
    return <div className="p-6"><p style={{ color: COLORS.gray }}>Geen data</p></div>;
  }

  // Bereken totaal aansluitingen voor percentages
  const totaalAansluitingen = strategieData[0].aansluitingen.totaal;

  // Chart data
  const kostenChartData = strategieData.map(s => ({
    name: s.code,
    kosten: Math.round(s.kosten),
    fill: s.color
  })).sort((a, b) => a.kosten - b.kosten);

  // Stacked Bar Chart data - Aansluitingen verdeling
  const aansluitingenChartData = strategieData.map(s => ({
    name: s.code,
    'Elektrische WP': (s.aansluitingen.ewp / totaalAansluitingen) * 100,
    'MT Warmtenet': (s.aansluitingen.mt / totaalAansluitingen) * 100,
    'LT Warmtenet': (s.aansluitingen.lt / totaalAansluitingen) * 100,
    'Hybride WP': (s.aansluitingen.hwp / totaalAansluitingen) * 100,
    'Aardgas': (s.aansluitingen.aardgas / totaalAansluitingen) * 100
  }));

  // Scatter plot data - Kosten vs Energie
  const scatterData = strategieData.map(s => ({
    name: s.code,
    x: s.kosten,
    y: s.energie,
    fill: s.color
  }));

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: COLORS.dark }}>
        Overzicht Strategieën
      </h2>

      {/* Comparison Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ background: COLORS.primary }}>
            <tr>
              <th className="px-4 py-3 text-left text-white font-semibold">Strategie</th>
              <th className="px-4 py-3 text-left text-white font-semibold">Variant</th>
              <th className="px-4 py-3 text-right text-white font-semibold">Kosten (€/ton CO₂)</th>
              <th className="px-4 py-3 text-right text-white font-semibold">CO₂ Reductie (ton)</th>
              <th className="px-4 py-3 text-right text-white font-semibold">Energie (GJ/weq)</th>
              <th className="px-4 py-3 text-right text-white font-semibold">% eWP</th>
            </tr>
          </thead>
          <tbody>
            {strategieData.map((s, idx) => {
              const pctEwp = totaalAansluitingen > 0 ? (s.aansluitingen.ewp / totaalAansluitingen * 100) : 0;
              return (
                <tr
                  key={idx}
                  className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onSelectStrategie(s.code)}
                  style={{ borderColor: COLORS.primary + '20' }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded" style={{ background: s.color }} />
                      <span className="font-semibold">{s.code}: {s.naam}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 rounded text-xs font-semibold" 
                            style={{ background: COLORS.primary + '20', color: COLORS.dark }}>
                        {s.code}{s.variant}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold`}
                            style={{ 
                              background: s.schillabel === 'B+' ? '#22C55E20' : '#F9731620',
                              color: s.schillabel === 'B+' ? '#15803D' : '#C2410C'
                            }}>
                        {s.schillabel}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    € {s.kosten.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.co2Reductie.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.energie.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {pctEwp.toFixed(0)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bar Chart - Kosten */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          Extra Nationale Kosten per Strategie
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={kostenChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: '€/ton CO₂', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => `€ ${value.toLocaleString('nl-NL')}`} />
            <Bar dataKey="kosten">
              {kostenChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stacked Bar Chart - Aansluitingen verdeling */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          Aansluitingen Verdeling per Strategie (%)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={aansluitingenChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
            <Legend />
            <Bar dataKey="Elektrische WP" stackId="a" fill="#3B82F6" />
            <Bar dataKey="MT Warmtenet" stackId="a" fill="#F97316" />
            <Bar dataKey="LT Warmtenet" stackId="a" fill="#A855F7" />
            <Bar dataKey="Hybride WP" stackId="a" fill="#22C55E" />
            <Bar dataKey="Aardgas" stackId="a" fill="#6B7280" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scatter Plot - Kosten vs Energievraag */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          Kosten vs Energievraag
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Kosten" 
              unit=" €/ton CO₂"
              label={{ value: 'Extra nationale kosten (€/ton CO₂)', position: 'bottom' }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Energie" 
              unit=" GJ/weq"
              label={{ value: 'Energievraag (GJ/weq/jaar)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            {scatterData.map((s, idx) => (
              <Scatter 
                key={idx}
                name={s.name}
                data={[s]} 
                fill={s.fill}
                shape="circle"
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Info */}
      <div className="p-4 rounded-lg" style={{ background: COLORS.primary + '15' }}>
        <p className="text-sm" style={{ color: COLORS.dark }}>
          💡 <strong>Tip:</strong> Klik op een rij in de tabel om naar de detailpagina van die strategie te gaan.
        </p>
      </div>
    </div>
  );
}

function getNaam(nr) {
  const namen = {
    '1': 'All-Electric',
    '2': 'MT Warmtenet',
    '3': 'LT Warmtenet',
    '4': 'Klimaatneutraal Gas'
  };
  return namen[String(nr)] || `Strategie ${nr}`;
}