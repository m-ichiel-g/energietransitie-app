import React, { useState, useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

const COLORS = {
  primary: '#83AF9A',
  secondary: '#F3F3E2',
  dark: '#20423C',
  gray: '#6b7280',
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#22C55E',
  orange: '#F97316',
  purple: '#A855F7',
  cyan: '#22D3EE',
  pink: '#EC4899',
  yellow: '#EAB308'
};

/**
 * DATA MODULE - Volgens PRD
 * 5 Tabs: Gebiedsinformatie, Woningvoorraad, Utiliteitsgebouwen, Energieverbruik, Aansluitingen
 */
export default function DataDashboard({ pblData, selectedBuurten }) {
  const [activeTab, setActiveTab] = useState('gebied');

  const tabs = [
    { id: 'gebied', label: 'Gebiedsinformatie' },
    { id: 'woningen', label: 'Woningvoorraad' },
    { id: 'utiliteit', label: 'Utiliteitsgebouwen' },
    { id: 'energie', label: 'Energieverbruik' },
    { id: 'aansluitingen', label: 'Aansluitingen' }
  ];

  // Aggregeer data van geselecteerde buurten
  const aggregatedData = useMemo(() => {
    if (!pblData || !selectedBuurten || selectedBuurten.length === 0) return null;
    
    const buurten = selectedBuurten
      .map(code => pblData.buurten[code])
      .filter(b => b);

    if (buurten.length === 0) return null;

    // TAB 1: Gebiedsinformatie - uit totaalbebouwing
    const totals = buurten.reduce((acc, b) => {
      const t = b.totaal || {};
      return {
        woningen: (acc.woningen || 0) + (t.I09_aantal_woningen || 0),
        utiliteit: (acc.utiliteit || 0) + (t.I10_aantal_utiliteit || 0),
        weq: (acc.weq || 0) + (t.I11_woningequivalenten || 0),
        co2: (acc.co2 || 0) + (t.I12_CO2_startjaar || 0)
      };
    }, {});

    return {
      gebied: totals,
      buurten: buurten,
      aantalBuurten: buurten.length
    };
  }, [pblData, selectedBuurten]);

  if (!pblData || !selectedBuurten || selectedBuurten.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-lg font-semibold mb-2" style={{ color: COLORS.dark }}>
          Geen buurten geselecteerd
        </p>
        <p style={{ color: COLORS.gray }}>
          Selecteer één of meerdere buurten in de sidebar
        </p>
      </div>
    );
  }

  if (!aggregatedData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p style={{ color: COLORS.gray }}>Geen data beschikbaar</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b overflow-x-auto" style={{ borderColor: COLORS.secondary, background: 'white' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-6 py-3 font-semibold text-sm transition-all whitespace-nowrap"
            style={{
              background: activeTab === tab.id ? COLORS.primary : 'white',
              color: activeTab === tab.id ? 'white' : COLORS.dark,
              borderBottom: activeTab === tab.id ? 'none' : `2px solid ${COLORS.secondary}`
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'gebied' && <TabGebiedsinformatie data={aggregatedData} />}
        {activeTab === 'woningen' && <TabWoningvoorraad data={aggregatedData} />}
        {activeTab === 'utiliteit' && <TabUtiliteit data={aggregatedData} />}
        {activeTab === 'energie' && <TabEnergieverbruik data={aggregatedData} pblData={pblData} selectedBuurten={selectedBuurten} />}
        {activeTab === 'aansluitingen' && <TabAansluitingen data={aggregatedData} pblData={pblData} selectedBuurten={selectedBuurten} />}
      </div>
    </div>
  );
}

/**
 * TAB 1: GEBIEDSINFORMATIE - COMPLEET
 */
function TabGebiedsinformatie({ data }) {
  const { gebied, aantalBuurten, buurten } = data;

  const kpis = [
    { label: 'Woningen', value: gebied.woningen || 0, unit: 'adressen', color: COLORS.blue },
    { label: 'Utiliteit', value: gebied.utiliteit || 0, unit: 'adressen', color: COLORS.orange },
    { label: 'Woningequivalenten', value: Math.round(gebied.weq || 0), unit: 'WEQ', color: COLORS.purple },
    { label: 'CO₂ uitstoot', value: Math.round(gebied.co2 || 0), unit: 'ton/jaar', color: COLORS.red }
  ];

  // Metadata van eerste buurt (of aggregaat indien meerdere)
  const metadata = buurten.length === 1 ? {
    buurtcode: buurten[0].totaal?.I01_buurtcode || '-',
    buurtnaam: buurten[0].totaal?.I02_buurtnaam || '-',
    wijkcode: buurten[0].totaal?.I03_wijkcode || '-',
    wijknaam: buurten[0].totaal?.I04_wijknaam || '-',
    gemeentecode: buurten[0].totaal?.I05_gemeentecode || '-',
    gemeentenaam: buurten[0].totaal?.I06_gemeentenaam || '-',
    energieregio: buurten[0].totaal?.I07_energieregio || '-',
    provincie: buurten[0].totaal?.I08_provincie || '-'
  } : {
    gemeentecode: buurten[0]?.totaal?.I05_gemeentecode || '-',
    gemeentenaam: buurten[0]?.totaal?.I06_gemeentenaam || 'Diverse gemeenten',
    provincie: buurten[0]?.totaal?.I08_provincie || '-',
    energieregio: buurten[0]?.totaal?.I07_energieregio || '-'
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.dark }}>
          Gebiedsinformatie
        </h2>
        <p style={{ color: COLORS.gray }}>
          Overzicht van {aantalBuurten} {aantalBuurten === 1 ? 'buurt' : 'buurten'}
        </p>
      </div>

      {/* Metadata */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          📍 Locatie & Context
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {buurten.length === 1 && (
            <>
              <MetadataItem label="Buurtcode" value={metadata.buurtcode} />
              <MetadataItem label="Buurtnaam" value={metadata.buurtnaam} />
              <MetadataItem label="Wijkcode" value={metadata.wijkcode} />
              <MetadataItem label="Wijknaam" value={metadata.wijknaam} />
            </>
          )}
          <MetadataItem label="Gemeentecode" value={metadata.gemeentecode} />
          <MetadataItem label="Gemeentenaam" value={metadata.gemeentenaam} />
          <MetadataItem label="Energieregio" value={metadata.energieregio} />
          <MetadataItem label="Provincie" value={metadata.provincie} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="p-6 rounded-lg shadow-md"
            style={{ background: 'white', borderLeft: `4px solid ${kpi.color}` }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gray }}>
              {kpi.label}
            </p>
            <p className="text-3xl font-bold mb-1" style={{ color: kpi.color }}>
              {kpi.value.toLocaleString('nl-NL')}
            </p>
            <p className="text-xs" style={{ color: COLORS.gray }}>
              {kpi.unit}
            </p>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg" style={{ background: COLORS.secondary }}>
        <h3 className="font-semibold mb-2" style={{ color: COLORS.dark }}>
          ℹ️ Toelichting
        </h3>
        <p className="text-sm" style={{ color: COLORS.gray }}>
          Deze cijfers geven de startbasissituatie weer van het geselecteerde gebied. 
          Woningequivalenten (WEQ) is een genormaliseerde maat voor energieverbruik.
          {buurten.length > 1 && ` De cijfers zijn geaggregeerd over ${aantalBuurten} buurten.`}
        </p>
      </div>
    </div>
  );
}

function MetadataItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1" style={{ color: COLORS.gray }}>
        {label}
      </p>
      <p className="text-sm font-semibold" style={{ color: COLORS.dark }}>
        {value}
      </p>
    </div>
  );
}

/**
 * TAB 2: WONINGVOORRAAD - COMPLEET
 */
function TabWoningvoorraad({ data }) {
  const bouwperiodes = [
    'Voor_1930', '1930_1945', '1946_1965', '1966_1975', '1976_1992',
    '1993_1996', '1997_2000', '2001_2006', '2007_2011', '2012_2014', '2015_2020'
  ];

  const woningTypes = [
    'Vrijstaande_woning',
    '2_onder_1_kap',
    'Rijwoning_hoek',
    'Rijwoning_tussen',
    'Meergezinswoning_laagbouw_en_middenhoog',
    'Meergezinswoning_hoogbouw'
  ];

  const energieLabels = [
    'Label_A_en_beter', 'Label_B', 'Label_C', 'Label_D', 
    'Label_E', 'Label_F', 'Label_G', 'Geen_label'
  ];

  // Aggregeer woningen per bouwperiode
  const bouwperiodeData = bouwperiodes.map(periode => {
    const total = data.buurten.reduce((sum, b) => {
      return sum + (b.totaal?.[periode] || 0);
    }, 0);
    return {
      name: periode.replace(/_/g, '-'),
      aantal: total
    };
  }).filter(d => d.aantal > 0);

  // Aggregeer woningen per type
  const typeData = woningTypes.map(type => {
    const total = data.buurten.reduce((sum, b) => {
      return sum + (b.totaal?.[type] || 0);
    }, 0);
    return {
      name: type.replace(/_/g, ' '),
      aantal: total
    };
  }).filter(d => d.aantal > 0);

  // Aggregeer energielabels
  const labelData = energieLabels.map(label => {
    const total = data.buurten.reduce((sum, b) => {
      return sum + (b.totaal?.[label] || 0);
    }, 0);
    return {
      name: label.replace('Label_', '').replace(/_/g, ' '),
      aantal: total,
      fill: getLabelColor(label)
    };
  }).filter(d => d.aantal > 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: COLORS.dark }}>
        Woningvoorraad
      </h2>

      {/* Bar Chart - Bouwperiode */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          Woningen per Bouwperiode
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={bouwperiodeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} />
            <YAxis label={{ value: 'Aantal woningen', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Bar dataKey="aantal" fill={COLORS.primary} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Horizontal Bar Chart - Woningen per Type */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          Woningen per Type
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={typeData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={200} />
            <Tooltip />
            <Bar dataKey="aantal" fill={COLORS.blue} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Donut Chart - Energielabels */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          Verdeling Energielabels
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={labelData}
              dataKey="aantal"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              label={(entry) => `${entry.name}: ${entry.aantal}`}
            >
              {labelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Data Table - Cross-tabel */}
      <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          Detailoverzicht: Type × Energielabel
        </h3>
        <table className="w-full text-sm">
          <thead style={{ background: COLORS.primary }}>
            <tr>
              <th className="px-3 py-2 text-left text-white font-semibold">Type</th>
              <th className="px-3 py-2 text-right text-white font-semibold">Totaal</th>
              {energieLabels.slice(0, 4).map(label => (
                <th key={label} className="px-3 py-2 text-right text-white font-semibold">
                  {label.replace('Label_', '').replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {typeData.map((type, idx) => {
              const typeName = woningTypes[idx];
              const labelCounts = energieLabels.slice(0, 4).map(label => 
                data.buurten.reduce((sum, b) => sum + (b.totaal?.[`${typeName}_${label}`] || 0), 0)
              );
              return (
                <tr key={idx} className="border-b" style={{ borderColor: COLORS.secondary }}>
                  <td className="px-3 py-2">{type.name}</td>
                  <td className="px-3 py-2 text-right font-semibold">{type.aantal}</td>
                  {labelCounts.map((count, i) => (
                    <td key={i} className="px-3 py-2 text-right">{count || '-'}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getLabelColor(label) {
  const colors = {
    'Label_A_en_beter': COLORS.green,
    'Label_B': '#84CC16',
    'Label_C': COLORS.yellow,
    'Label_D': COLORS.orange,
    'Label_E': '#FB923C',
    'Label_F': COLORS.red,
    'Label_G': '#991B1B',
    'Geen_label': COLORS.gray
  };
  return colors[label] || COLORS.gray;
}

/**
 * TAB 3: UTILITEITSGEBOUWEN - COMPLEET
 */
/**
 * TAB 3: UTILITEITSGEBOUWEN - GEFIXTE VERSIE
 * 
 * Leest CORRECTE kolommen uit totaalbebouwing.csv (kolom AR t/m BS)
 * 
 * Kolom mapping (van totaalbebouwing.csv):
 * AR-AW: Utiliteit per bouwperiode (m² BVO)
 * AX-BG: Utiliteit per type (aantal gebouwen) 
 * BH-BO: Utiliteit per energielabel (aantal gebouwen)
 */

function TabUtiliteit({ data }) {
  // CORRECTE kolomnamen uit totaalbebouwing.csv
  
  // Bouwperiodes - m² BVO (kolom AR-AW ongeveer)
  const bouwperiodeKolommen = [
    'Voor_1920_m2_bvo',
    '1920_1945_m2_bvo', 
    '1946_1964_m2_bvo',
    '1965_1974_m2_bvo',
    '1975_1991_m2_bvo',
    '1992_2005_m2_bvo',
    '2006_2014_m2_bvo',
    '2015_2022_m2_bvo',
    'Onbekend_bouwjaar_m2_bvo'
  ];
  
  const bouwperiodeLabels = [
    'Voor 1920',
    '1920-1945',
    '1946-1964', 
    '1965-1974',
    '1975-1991',
    '1992-2005',
    '2006-2014',
    '2015-2022',
    'Onbekend'
  ];

  // Types - aantal gebouwen (kolom AX-BG ongeveer)
  const typeKolommen = [
    'Kantoor',
    'Winkel',
    'Horeca',
    'Bijeenkomst',
    'Cel',
    'Gezondheidszorg',
    'Industrie',
    'Logies',
    'Onderwijs',
    'Sport',
    'Overige_gebruiksfuncties'
  ];

  // Energielabels - aantal gebouwen (kolom BH-BO ongeveer)
  const labelKolommen = [
    'Label_A',
    'Label_B', 
    'Label_C',
    'Label_D',
    'Label_E',
    'Label_F',
    'Label_G',
    'Geen_label'
  ];

  // Aggregeer per bouwperiode (m² BVO)
  const bouwperiodeData = bouwperiodeKolommen.map((kolom, idx) => {
    const total = data.buurten.reduce((sum, b) => {
      // Probeer verschillende prefix varianten
      const value = b.totaal?.[kolom] || 
                   b.totaal?.[`Utiliteit_${kolom}`] ||
                   b.totaal?.[`util_${kolom}`] || 0;
      return sum + value;
    }, 0);
    
    return {
      name: bouwperiodeLabels[idx],
      m2: total
    };
  }).filter(d => d.m2 > 0);

  // Aggregeer per type (aantal gebouwen)
  const typeData = typeKolommen.map(type => {
    const total = data.buurten.reduce((sum, b) => {
      // Probeer verschillende naamgevingen
      const value = b.totaal?.[type] || 
                   b.totaal?.[`Utiliteit_${type}`] ||
                   b.totaal?.[`util_${type}`] ||
                   b.totaal?.[`Aantal_${type}`] || 0;
      return sum + value;
    }, 0);
    
    return {
      name: type.replace(/_/g, ' '),
      type: type, // Bewaar originele naam voor labels
      aantal: total
    };
  }).filter(d => d.aantal > 0).sort((a, b) => b.aantal - a.aantal);

  // Aggregeer energielabels (aantal gebouwen)
  const labelData = labelKolommen.map(label => {
    const total = data.buurten.reduce((sum, b) => {
      const value = b.totaal?.[label] ||
                   b.totaal?.[`Utiliteit_${label}`] ||
                   b.totaal?.[`util_${label}`] || 0;
      return sum + value;
    }, 0);
    
    return {
      name: label.replace('Label_', '').replace(/_/g, ' '),
      aantal: total,
      fill: getLabelColor(label)
    };
  }).filter(d => d.aantal > 0);

  // Bereken totalen
  const totalM2 = bouwperiodeData.reduce((sum, d) => sum + d.m2, 0);
  const totalGebouwen = typeData.reduce((sum, d) => sum + d.aantal, 0);
  const totalLabeled = labelData.reduce((sum, d) => sum + d.aantal, 0);

  // Top 5 types voor Pie Chart
  const top5 = typeData.slice(0, 5);
  const overig = typeData.slice(5).reduce((sum, d) => sum + d.aantal, 0);
  const pieData = [...top5];
  if (overig > 0) pieData.push({ name: 'Overig', aantal: overig });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: COLORS.dark }}>
        Utiliteitsgebouwen
      </h2>

      {/* Debug Info - Toon alleen in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-4 rounded" style={{ background: '#FEF3C7' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#92400E' }}>
            🔍 Debug Info (alleen in development)
          </p>
          <p className="text-xs" style={{ color: '#78350F' }}>
            Bouwperiodes met data: {bouwperiodeData.length} | 
            Types met data: {typeData.length} | 
            Labels met data: {labelData.length}
          </p>
          {bouwperiodeData.length === 0 && typeData.length === 0 && (
            <p className="text-xs mt-2" style={{ color: '#DC2626' }}>
              ⚠️ GEEN utiliteit data gevonden! Check kolomnamen in CSV.
            </p>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow" style={{ borderLeft: `4px solid ${COLORS.orange}` }}>
          <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gray }}>Totaal Oppervlak</p>
          <p className="text-3xl font-bold" style={{ color: COLORS.orange }}>
            {totalGebouwen > 0 ? totalGebouwen.toLocaleString('nl-NL') : '-'}
          </p>
          <p className="text-xs" style={{ color: COLORS.gray }}>m² BVO</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow" style={{ borderLeft: `4px solid ${COLORS.blue}` }}>
          <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gray }}>Aantal Gebouwen</p>
          <p className="text-3xl font-bold" style={{ color: COLORS.blue }}>
            {totalGebouwen > 0 ? totalGebouwen.toLocaleString('nl-NL') : '-'}
          </p>
          <p className="text-xs" style={{ color: COLORS.gray }}>gebouwen</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow" style={{ borderLeft: `4px solid ${COLORS.purple}` }}>
          <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gray }}>Gem. Oppervlak</p>
          <p className="text-3xl font-bold" style={{ color: COLORS.purple }}>
            {(totalGebouwen > 0 && totalM2 > 0) ? Math.round(totalM2 / totalGebouwen).toLocaleString('nl-NL') : '-'}
          </p>
          <p className="text-xs" style={{ color: COLORS.gray }}>m² per gebouw</p>
        </div>
      </div>

      {/* Gestapelde Bar Chart - Oppervlakte per bouwperiode */}
      {bouwperiodeData.length > 0 ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
            Oppervlakte per Bouwperiode
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bouwperiodeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
              <YAxis label={{ value: 'm² BVO', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value) => `${Math.round(value).toLocaleString('nl-NL')} m²`} />
              <Bar dataKey="m2" fill={COLORS.orange} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm" style={{ color: COLORS.gray }}>
            Geen bouwperiode data beschikbaar voor geselecteerde buurten
          </p>
        </div>
      )}

      {/* Pie Chart - Verdeling naar type */}
      {typeData.length > 0 ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
            Verdeling naar Type {pieData.length > 5 && '(Top 5 + Overig)'}
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="aantal"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.name}: ${entry.aantal}`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index + 3]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm" style={{ color: COLORS.gray }}>
            Geen type data beschikbaar voor geselecteerde buurten
          </p>
        </div>
      )}

      {/* Bar Chart - Alle types horizontaal */}
      {typeData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
            Aantal Gebouwen per Type
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(250, typeData.length * 35)}>
            <BarChart data={typeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip formatter={(value) => `${value.toLocaleString('nl-NL')} gebouwen`} />
              <Bar dataKey="aantal" fill={COLORS.blue} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Energielabels - Donut Chart */}
      {labelData.length > 0 ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
            Verdeling Energielabels
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={labelData}
                dataKey="aantal"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                label={(entry) => `${entry.name}: ${entry.aantal}`}
              >
                {labelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm" style={{ color: COLORS.gray }}>
            Geen energielabel data beschikbaar voor geselecteerde buurten
          </p>
        </div>
      )}

      {/* Heat Map Table - Type × Energielabel (alleen als beide datasets beschikbaar) */}
      {typeData.length > 0 && labelData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
          <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
            Energielabels per Type (Heat Map)
          </h3>
          <table className="w-full text-sm">
            <thead style={{ background: COLORS.primary }}>
              <tr>
                <th className="px-3 py-2 text-left text-white font-semibold sticky left-0" style={{ background: COLORS.primary }}>
                  Type
                </th>
                <th className="px-3 py-2 text-right text-white font-semibold">Totaal</th>
                {labelKolommen.slice(0, 5).map(label => (
                  <th key={label} className="px-3 py-2 text-right text-white font-semibold">
                    {label.replace('Label_', '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {typeData.slice(0, 10).map((typeRow, idx) => {
                const total = typeRow.aantal;
                
                return (
                  <tr key={idx} className="border-b hover:bg-gray-50" style={{ borderColor: COLORS.secondary }}>
                    <td className="px-3 py-2 font-semibold sticky left-0 bg-white">{typeRow.name}</td>
                    <td className="px-3 py-2 text-right font-semibold">{total.toLocaleString('nl-NL')}</td>
                    {labelKolommen.slice(0, 5).map((label, labelIdx) => {
                      // Probeer cross-tabel data te vinden
                      const crossValue = data.buurten.reduce((sum, b) => {
                        // Probeer verschillende naamgevingen voor cross-tabellen
                        const val = b.totaal?.[`${typeRow.type}_${label}`] ||
                                   b.totaal?.[`Utiliteit_${typeRow.type}_${label}`] ||
                                   0;
                        return sum + val;
                      }, 0);
                      
                      return (
                        <td key={labelIdx} className="px-3 py-2 text-right">
                          {crossValue > 0 ? crossValue.toLocaleString('nl-NL') : '-'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs mt-2" style={{ color: COLORS.gray }}>
            💡 Cross-tabel data is mogelijk niet beschikbaar in alle datasets
          </p>
        </div>
      )}

      {/* Info bericht als er helemaal geen data is */}
      {bouwperiodeData.length === 0 && typeData.length === 0 && labelData.length === 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-center py-8">
            <p className="text-lg font-semibold mb-2" style={{ color: COLORS.dark }}>
              Geen utiliteitsgebouw data beschikbaar
            </p>
            <p className="text-sm" style={{ color: COLORS.gray }}>
              Voor de geselecteerde buurten is geen utiliteit data gevonden in de totaalbebouwing.csv
            </p>
            <p className="text-xs mt-4" style={{ color: COLORS.gray }}>
              Mogelijke oorzaken:
            </p>
            <ul className="text-xs mt-2 space-y-1" style={{ color: COLORS.gray }}>
              <li>• Geen utiliteitsgebouwen in deze buurten</li>
              <li>• Kolomnamen in CSV komen niet overeen</li>
              <li>• Data niet correct ingeladen</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

  
function TabEnergieverbruik({ data, pblData, selectedBuurten }) {
  const energieData = useMemo(() => {
    const buurten = selectedBuurten
      .map(code => pblData.buurten[code])
      .filter(b => b && b.strategieMatrix);

    if (buurten.length === 0) return null;

    const baselineKolom = 'Referentie_2023';
    
    const avg = (indicator) => {
      const sum = buurten.reduce((acc, b) => {
        const val = b.strategieMatrix[indicator]?.[baselineKolom];
        return acc + (typeof val === 'number' ? val : 0);
      }, 0);
      return sum / buurten.length;
    };

    const sum = (indicator) => {
      return buurten.reduce((acc, b) => {
        const val = b.strategieMatrix[indicator]?.[baselineKolom];
        return acc + (typeof val === 'number' ? val : 0);
      }, 0);
    };

    return {
      // H01-H07: Totale vraag
      totaal: avg('H01_Vraag_totaal'),
      rv: avg('H02_Vraag_RV'),
      tw: avg('H03_Vraag_TW'),
      vent: avg('H04_Vraag_Vent'),
      koeling: avg('H05_Vraag_K'),
      app: avg('H06_Vraag_App'),
      vraagPerHa: avg('H07_vraag_tot_ha'),
      // H08-H11: Input
      inputTotaal: avg('H08_Input_totaal'),
      inputGas: avg('H09_Input_aardgas'),
      inputElektra: avg('H11_Input_elektriciteit'),
      // H22-H27: Vraag woningen
      woningen: {
        rv: avg('H22_Vraag_RV_woningen'),
        tw: avg('H23_Vraag_TW_woningen'),
        vent: avg('H24_Vraag_Vent_woningen'),
        koeling: avg('H25_Vraag_K_woningen'),
        app: avg('H26_Vraag_App_woningen')
      },
      // H28-H33: Vraag utiliteit
      utiliteit: {
        rv: avg('H28_Vraag_RV_utiliteit'),
        tw: avg('H29_Vraag_TW_utiliteit'),
        vent: avg('H30_Vraag_Vent_utiliteit'),
        koeling: avg('H31_Vraag_K_utiliteit'),
        app: avg('H32_Vraag_App_utiliteit')
      },
      // H34-H41: Input woningen/utiliteit
      inputWoningen: {
        totaal: avg('H34_Input_totaal_woningen'),
        gas: avg('H35_Input_aardgas_woningen'),
        elektra: avg('H37_Input_elektriciteit_woningen')
      },
      inputUtiliteit: {
        totaal: avg('H38_Input_totaal_utiliteit'),
        gas: avg('H39_Input_aardgas_utiliteit'),
        elektra: avg('H41_Input_elektriciteit_utiliteit')
      },
      co2: sum('H15_CO2_uitstoot')
    };
  }, [pblData, selectedBuurten]);

  if (!energieData) {
    return <p style={{ color: COLORS.gray }}>Geen energie data beschikbaar</p>;
  }

  const vraagChartData = [
    { name: 'Ruimteverwarming', value: energieData.rv, fill: COLORS.red },
    { name: 'Tapwater', value: energieData.tw, fill: COLORS.blue },
    { name: 'Ventilatie', value: energieData.vent, fill: COLORS.green },
    { name: 'Koeling', value: energieData.koeling, fill: COLORS.purple },
    { name: 'Apparaten', value: energieData.app, fill: COLORS.orange }
  ].filter(d => d.value > 0);

  const inputChartData = [
    { name: 'Aardgas', value: energieData.inputGas, fill: COLORS.gray },
    { name: 'Elektriciteit', value: energieData.inputElektra, fill: COLORS.blue }
  ].filter(d => d.value > 0);

  const woningenVraagData = [
    { name: 'RV', value: energieData.woningen.rv },
    { name: 'TW', value: energieData.woningen.tw },
    { name: 'Vent', value: energieData.woningen.vent },
    { name: 'Koeling', value: energieData.woningen.koeling },
    { name: 'App', value: energieData.woningen.app }
  ].filter(d => d.value > 0);

  const utiliteitVraagData = [
    { name: 'RV', value: energieData.utiliteit.rv },
    { name: 'TW', value: energieData.utiliteit.tw },
    { name: 'Vent', value: energieData.utiliteit.vent },
    { name: 'Koeling', value: energieData.utiliteit.koeling },
    { name: 'App', value: energieData.utiliteit.app }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.dark }}>
          Energieverbruik
        </h2>
        <p style={{ color: COLORS.gray }}>
          Referentie 2023 - Gemiddeld per woningequivalent
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow" style={{ borderLeft: `4px solid ${COLORS.blue}` }}>
          <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gray }}>Totale Energievraag</p>
          <p className="text-4xl font-bold" style={{ color: COLORS.blue }}>
            {energieData.totaal.toFixed(1)}
          </p>
          <p className="text-sm" style={{ color: COLORS.gray }}>GJ/weq/jaar</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow" style={{ borderLeft: `4px solid ${COLORS.orange}` }}>
          <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gray }}>Energie-Input</p>
          <p className="text-4xl font-bold" style={{ color: COLORS.orange }}>
            {energieData.inputTotaal.toFixed(1)}
          </p>
          <p className="text-sm" style={{ color: COLORS.gray }}>GJ/weq/jaar</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow" style={{ borderLeft: `4px solid ${COLORS.red}` }}>
          <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gray }}>CO₂ Uitstoot</p>
          <p className="text-4xl font-bold" style={{ color: COLORS.red }}>
            {Math.round(energieData.co2).toLocaleString('nl-NL')}
          </p>
          <p className="text-sm" style={{ color: COLORS.gray }}>ton/jaar</p>
        </div>
      </div>

      {/* Gestapelde Bar Chart - Energievraag per toepassing */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          Energievraag per Toepassing
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={vraagChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'GJ/weq/jaar', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => value.toFixed(2)} />
            <Bar dataKey="value">
              {vraagChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Donut Chart - Energie-input per drager */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          Energie-Input per Drager
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={inputChartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              label={(entry) => `${entry.name}: ${entry.value.toFixed(1)} GJ`}
            >
              {inputChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Comparison Chart - Woningen vs Utiliteit */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          Vergelijking Woningen vs Utiliteit
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.gray }}>Woningen</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={woningenVraagData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.blue} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.gray }}>Utiliteit</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={utiliteitVraagData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.orange} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Input Woningen vs Utiliteit */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          Energie-Input: Woningen vs Utiliteit
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded" style={{ background: COLORS.secondary }}>
            <p className="text-xs font-semibold mb-2" style={{ color: COLORS.gray }}>Woningen</p>
            <p className="text-2xl font-bold mb-1" style={{ color: COLORS.blue }}>
              {energieData.inputWoningen.totaal.toFixed(1)} GJ/weq/jaar
            </p>
            <p className="text-sm" style={{ color: COLORS.gray }}>
              Gas: {energieData.inputWoningen.gas.toFixed(1)} | Elektra: {energieData.inputWoningen.elektra.toFixed(1)}
            </p>
          </div>
          <div className="p-4 rounded" style={{ background: COLORS.secondary }}>
            <p className="text-xs font-semibold mb-2" style={{ color: COLORS.gray }}>Utiliteit</p>
            <p className="text-2xl font-bold mb-1" style={{ color: COLORS.orange }}>
              {energieData.inputUtiliteit.totaal.toFixed(1)} GJ/weq/jaar
            </p>
            <p className="text-sm" style={{ color: COLORS.gray }}>
              Gas: {energieData.inputUtiliteit.gas.toFixed(1)} | Elektra: {energieData.inputUtiliteit.elektra.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Vraag per hectare */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          📊 Energie-intensiteit
        </h3>
        <div className="p-4 rounded" style={{ background: COLORS.secondary }}>
          <p className="text-sm font-semibold mb-2" style={{ color: COLORS.gray }}>
            Energievraag per hectare
          </p>
          <p className="text-3xl font-bold" style={{ color: COLORS.primary }}>
            {energieData.vraagPerHa.toFixed(1)} GJ/ha/jaar
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * TAB 5: AANSLUITINGEN - COMPLEET
 */
function TabAansluitingen({ data, pblData, selectedBuurten }) {
  const aansluitingenData = useMemo(() => {
    const buurten = selectedBuurten
      .map(code => pblData.buurten[code])
      .filter(b => b && b.strategieMatrix);

    if (buurten.length === 0) return null;

    const baselineKolom = 'Referentie_2023';
    
    const sum = (indicator) => {
      return buurten.reduce((acc, b) => {
        const val = b.strategieMatrix[indicator]?.[baselineKolom];
        return acc + (typeof val === 'number' ? val : 0);
      }, 0);
    };

    const avg = (indicator) => {
      const total = sum(indicator);
      return total / buurten.length;
    };

    // WEQ details ophalen (I13-I25 uit strategieMatrix)
    const weqDetails = {};
    const weqIndicators = [
      'I13_uitgesloten_woningen', 'I14_WEQ_utiliteit',
      'I15_woningen_met_afgemeld_label', 'I16_woningen_zonder_afgemeld_label',
      'I17_WEQ_woningen_met_afgemeld_label', 'I18_WEQ_utiliteit_label_A',
      'I19_WEQ_utiliteit_label_B', 'I20_WEQ_utiliteit_label_C',
      'I21_WEQ_utiliteit_label_D', 'I22_WEQ_utiliteit_label_E',
      'I23_WEQ_utiliteit_label_F', 'I24_WEQ_utiliteit_label_G',
      'I25_nieuwbouw_na_2019'
    ];
    weqIndicators.forEach(ind => {
      weqDetails[ind] = sum(ind);
    });

    return {
      aardgas: sum('A01_Aansl_aardgas'),
      ewp: sum('A02_Aansl_eWP'),
      mt: sum('A03_Aansl_MT'),
      lt: sum('A04_Aansl_LT'),
      hwp: sum('A05_Aansl_hWP_HG'),
      hr: sum('A06_Aansl_HR_HG'),
      aandeelEwpWeq: avg('A07_Aandeel_eWP_WEQ'),
      aandeelEwpGj: avg('A08_Aandeel_eWP_GJ'),
      weqDetails: weqDetails
    };
  }, [pblData, selectedBuurten]);

  if (!aansluitingenData) {
    return <p style={{ color: COLORS.gray }}>Geen aansluitingen data</p>;
  }

  const chartData = [
    { name: 'Aardgas', value: aansluitingenData.aardgas, fill: COLORS.gray },
    { name: 'Elektrische WP', value: aansluitingenData.ewp, fill: COLORS.blue },
    { name: 'MT Warmtenet', value: aansluitingenData.mt, fill: COLORS.orange },
    { name: 'LT Warmtenet', value: aansluitingenData.lt, fill: COLORS.purple },
    { name: 'Hybride WP', value: aansluitingenData.hwp, fill: COLORS.green },
    { name: 'HR Ketel (groen)', value: aansluitingenData.hr, fill: COLORS.green }
  ].filter(d => d.value > 0);

  const totaal = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold" style={{ color: COLORS.dark }}>
        Aansluitingen (Baseline 2023)
      </h2>

      {/* Total & Aandeel eWP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow" style={{ borderLeft: `4px solid ${COLORS.primary}` }}>
          <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gray }}>Totaal Aansluitingen</p>
          <p className="text-4xl font-bold" style={{ color: COLORS.primary }}>
            {totaal.toLocaleString('nl-NL')}
          </p>
          <p className="text-sm" style={{ color: COLORS.gray }}>adressen</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow" style={{ borderLeft: `4px solid ${COLORS.blue}` }}>
          <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gray }}>Aandeel eWP (WEQ)</p>
          <p className="text-4xl font-bold" style={{ color: COLORS.blue }}>
            {aansluitingenData.aandeelEwpWeq.toFixed(1)}%
          </p>
          <p className="text-sm" style={{ color: COLORS.gray }}>van woningequivalenten</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow" style={{ borderLeft: `4px solid ${COLORS.blue}` }}>
          <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gray }}>Aandeel eWP (GJ)</p>
          <p className="text-4xl font-bold" style={{ color: COLORS.blue }}>
            {aansluitingenData.aandeelEwpGj.toFixed(1)}%
          </p>
          <p className="text-sm" style={{ color: COLORS.gray }}>van energievraag</p>
        </div>
      </div>

      {/* Horizontal Bar Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          Aantal Aansluitingen per Type
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip />
            <Bar dataKey="value">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Progress Bar - Aandeel eWP */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          Aandeel Elektrische Warmtepompen
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: COLORS.gray }}>Op basis van WEQ</span>
              <span className="text-sm font-bold" style={{ color: COLORS.blue }}>
                {aansluitingenData.aandeelEwpWeq.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="h-4 rounded-full transition-all"
                style={{ 
                  width: `${Math.min(aansluitingenData.aandeelEwpWeq, 100)}%`,
                  background: COLORS.blue
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: COLORS.gray }}>Op basis van GJ</span>
              <span className="text-sm font-bold" style={{ color: COLORS.blue }}>
                {aansluitingenData.aandeelEwpGj.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="h-4 rounded-full transition-all"
                style={{ 
                  width: `${Math.min(aansluitingenData.aandeelEwpGj, 100)}%`,
                  background: COLORS.blue
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table - Overzicht met percentages */}
      <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          Detailoverzicht Aansluitingen
        </h3>
        <table className="w-full text-sm">
          <thead style={{ background: COLORS.primary }}>
            <tr>
              <th className="px-4 py-3 text-left text-white font-semibold">Type</th>
              <th className="px-4 py-3 text-right text-white font-semibold">Aantal</th>
              <th className="px-4 py-3 text-right text-white font-semibold">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((item, idx) => (
              <tr key={idx} className="border-b" style={{ borderColor: COLORS.secondary }}>
                <td className="px-4 py-3 flex items-center space-x-2">
                  <div className="w-3 h-3 rounded" style={{ background: item.fill }} />
                  <span>{item.name}</span>
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {item.value.toLocaleString('nl-NL')}
                </td>
                <td className="px-4 py-3 text-right">
                  {((item.value / totaal) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* WEQ Details Info Cards */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          📊 WEQ Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded" style={{ background: COLORS.secondary }}>
            <p className="text-xs font-semibold mb-1" style={{ color: COLORS.gray }}>Uitgesloten Woningen</p>
            <p className="text-2xl font-bold" style={{ color: COLORS.red }}>
              {Math.round(aansluitingenData.weqDetails.I13_uitgesloten_woningen || 0).toLocaleString('nl-NL')}
            </p>
          </div>
          <div className="p-4 rounded" style={{ background: COLORS.secondary }}>
            <p className="text-xs font-semibold mb-1" style={{ color: COLORS.gray }}>WEQ Utiliteit</p>
            <p className="text-2xl font-bold" style={{ color: COLORS.orange }}>
              {Math.round(aansluitingenData.weqDetails.I14_WEQ_utiliteit || 0).toLocaleString('nl-NL')}
            </p>
          </div>
          <div className="p-4 rounded" style={{ background: COLORS.secondary }}>
            <p className="text-xs font-semibold mb-1" style={{ color: COLORS.gray }}>Nieuwbouw na 2019</p>
            <p className="text-2xl font-bold" style={{ color: COLORS.green }}>
              {Math.round(aansluitingenData.weqDetails.I25_nieuwbouw_na_2019 || 0).toLocaleString('nl-NL')}
            </p>
          </div>
          <div className="p-4 rounded" style={{ background: COLORS.secondary }}>
            <p className="text-xs font-semibold mb-1" style={{ color: COLORS.gray }}>Woningen met afgemeld label</p>
            <p className="text-2xl font-bold" style={{ color: COLORS.purple }}>
              {Math.round(aansluitingenData.weqDetails.I15_woningen_met_afgemeld_label || 0).toLocaleString('nl-NL')}
            </p>
          </div>
        </div>
      </div>

      {/* WEQ Utiliteit per Label */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4" style={{ color: COLORS.dark }}>
          WEQ Utiliteit per Energielabel
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(label => {
            const value = aansluitingenData.weqDetails[`I${18 + ['A', 'B', 'C', 'D', 'E', 'F', 'G'].indexOf(label)}_WEQ_utiliteit_label_${label}`] || 0;
            return (
              <div key={label} className="p-3 rounded text-center" style={{ background: COLORS.secondary }}>
                <p className="text-xs font-semibold mb-1" style={{ color: COLORS.gray }}>Label {label}</p>
                <p className="text-lg font-bold" style={{ color: getLabelColor(`Label_${label}`) }}>
                  {Math.round(value).toLocaleString('nl-NL')}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}