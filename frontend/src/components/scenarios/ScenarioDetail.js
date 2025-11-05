import React, { useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
  S1: '#3B82F6', S2: '#F97316', S3: '#A855F7', S4: '#22C55E',
  primary: '#83AF9A', gray: '#6b7280', dark: '#20423C',
  red: '#EF4444', blue: '#3B82F6', green: '#22C55E', orange: '#F97316', 
  purple: '#A855F7', cyan: '#22D3EE', pink: '#EC4899', yellow: '#EAB308'
};

export default function ScenarioDetail({ strategieCode, pblData, selectedBuurten, baselineKolom }) {
  
  const strategieData = useMemo(() => {
    const buurten = selectedBuurten.map(c => pblData.buurten[c]).filter(b => b && b.strategieMatrix);
    if (buurten.length === 0) return null;

    const strategieNr = strategieCode[1]; // "1", "2", "3", "4"
    const kolom = `Strategie_${strategieNr}`;
    const color = COLORS[strategieCode];

    // Helper functies
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

    // Haal variant info
    const variantCode = String(buurten[0].strategieMatrix['V01_Strategievariant']?.[kolom] || `s${strategieNr}a`).toLowerCase();
    const variant = variantCode.match(/s\d([a-z])/)?.[1] || 'a';
    const schillabel = ['a', 'b', 'c', 'd', 'e'].includes(variant) ? 'B+' : 'D+';

    return {
      code: strategieCode,
      naam: getNaam(strategieNr),
      variant: variant.toUpperCase(),
      schillabel: schillabel,
      color: color,
      // KPIs (Sectie 2)
      kpis: {
        kostenPerTon: avg('H17_Nat_meerkost_CO2'),
        co2Uitstoot: sum('H15_CO2_uitstoot'),
        energieVraag: avg('H01_Vraag_totaal'),
        totaleKosten: sum('H16_Nat_meerkost')
      },
      // Aansluitingen (Sectie 3)
      aansluitingen: {
        aardgas: sum('A01_Aansl_aardgas'),
        ewp: sum('A02_Aansl_eWP'),
        mt: sum('A03_Aansl_MT'),
        lt: sum('A04_Aansl_LT'),
        hwp: sum('A05_Aansl_hWP_HG'),
        hr: sum('A06_Aansl_HR_HG'),
        aandeelEwpWeq: avg('A07_Aandeel_eWP_WEQ'),
        aandeelEwpGj: avg('A08_Aandeel_eWP_GJ')
      },
      // Gevoeligheidsanalyse (Sectie 4)
      gevoeligheid: {
        basis: avg('H17_Nat_meerkost_CO2'),
        klimaatGas1_5BCM: avg('G01_KN_gas_1_5_BCM') === 1 ? 'Beschikbaar' : 'Niet beschikbaar',
        klimaatGas1_0BCM: avg('G02_KN_gas_1_0_BCM') === 1 ? 'Beschikbaar' : 'Niet beschikbaar',
        lagereEnergiekosten: avg('G03_Lagere_energiekosten'),
        hogereEnergiekosten: avg('G04_Hogere_energiekosten'),
        optimistischeBesparing: avg('G05_Optimistische_besparing'),
        lagereProceskosten: avg('G06_Lagere_proceskosten'),
        hogereProceskosten: avg('G07_Hogere_proceskosten')
      },
      // Energievraag (Sectie 5)
      energieVraag: {
        totaal: avg('H01_Vraag_totaal'),
        rv: avg('H02_Vraag_RV'),
        tw: avg('H03_Vraag_TW'),
        vent: avg('H04_Vraag_Vent'),
        koeling: avg('H05_Vraag_K'),
        app: avg('H06_Vraag_App'),
        vraagPerHa: avg('H07_vraag_tot_ha'),
        woningen: {
          rv: avg('H22_Vraag_RV_woningen'),
          tw: avg('H23_Vraag_TW_woningen'),
          vent: avg('H24_Vraag_Vent_woningen'),
          koeling: avg('H25_Vraag_K_woningen'),
          app: avg('H26_Vraag_App_woningen')
        },
        utiliteit: {
          rv: avg('H28_Vraag_RV_utiliteit'),
          tw: avg('H29_Vraag_TW_utiliteit'),
          vent: avg('H30_Vraag_Vent_utiliteit'),
          koeling: avg('H31_Vraag_K_utiliteit'),
          app: avg('H32_Vraag_App_utiliteit')
        }
      },
      // Energie-input (Sectie 6)
      energieInput: {
        totaal: avg('H08_Input_totaal'),
        aardgas: avg('H09_Input_aardgas'),
        klimaatGas: avg('H10_Input_klimaatneutraal_gas'),
        elektra: avg('H11_Input_elektriciteit'),
        mt: avg('H12_Input_MT'),
        lt: avg('H13_Input_LT'),
        omgeving: avg('H14_Input_omgevingswarmte'),
        extraElektra: avg('H21_Input_elektriciteit_extra'),
        waardeGas: avg('H19_Waarde_klimaatneutraal_gas'),
        toekenningGas: avg('H20_Toekenning_klimaatneutraal_gas'),
        woningen: {
          totaal: avg('H34_Input_totaal_woningen'),
          gas: avg('H35_Input_aardgas_woningen'),
          elektra: avg('H37_Input_elektriciteit_woningen')
        },
        utiliteit: {
          totaal: avg('H38_Input_totaal_utiliteit'),
          gas: avg('H39_Input_aardgas_utiliteit'),
          elektra: avg('H41_Input_elektriciteit_utiliteit')
        }
      },
      // Kapitaalslasten (Sectie 7)
      kapitaal: {
        elektraNet: sum('K01_KSL_elektriciteitsnet_verzwaren'),
        gasVerwijderen: sum('K02_KSL_gasnet_verwijderen'),
        gasAanpassen: sum('K03_KSL_gasnet_aanpassen'),
        warmteBuurt: sum('K04_KSL_warmtenet_buurt'),
        warmtePand: sum('K05_KSL_warmtenet_pand'),
        warmteTransport: sum('K06_KSL_warmtenet_transport'),
        warmteOpwekking: sum('K07_KSL_warmtenet_opwekking'),
        gebouwSchil: sum('K08_KSL_gebouwschil'),
        installaties: sum('K09_KSL_installaties'),
        totaal: sum('K10_KSL_totaal'),
        woningen: {
          schil: sum('K19_KSL_gebouwschil_woningen'),
          installaties: sum('K20_KSL_installaties_woningen')
        },
        utiliteit: {
          schil: sum('K21_KSL_gebouwschil_utiliteit'),
          installaties: sum('K22_KSL_installaties_utiliteit')
        }
      },
      // Variabele kosten (Sectie 8)
      variabel: {
        inkoopWarmte: sum('K11_VK_inkoop_warmte'),
        inkoopGas: sum('K12_VK_inkoop_gas'),
        inkoopElektra: sum('K13_VK_inkoop_elektriciteit'),
        gebouwOM: sum('K14_VK_gebouw_OM'),
        warmteOM: sum('K15_VK_warmtenet_OM'),
        elektraGasOM: sum('K16_VK_elektra_gas_net_OM'),
        totaal: sum('K17_VK_totaal'),
        extra: sum('K18_VK_extra'),
        winstWarmte: sum('K23_VK_winst_warmtebedrijven')
      }
    };
  }, [pblData, selectedBuurten, strategieCode, baselineKolom]);

  if (!strategieData) {
    return <div className="p-6"><p style={{ color: COLORS.gray }}>Geen data</p></div>;
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* SECTIE 1: Header */}
      <HeaderSection data={strategieData} />

      {/* SECTIE 2: KPI Cards */}
      <KPISection data={strategieData} />

      {/* SECTIE 3: Aansluitingen */}
      <Section title="Aansluitingen">
        <AansluitingenSection data={strategieData.aansluitingen} />
      </Section>

      {/* SECTIE 4: Gevoeligheidsanalyse */}
      <Section title="Gevoeligheidsanalyse">
        <GevoeligheidSection data={strategieData.gevoeligheid} />
      </Section>

      {/* SECTIE 5: Energievraag */}
      <Section title="Energievraag per Toepassing">
        <EnergieVraagSection data={strategieData.energieVraag} />
      </Section>

      {/* SECTIE 6: Energie-Input */}
      <Section title="Energie-Input per Drager">
        <EnergieInputSection data={strategieData.energieInput} />
      </Section>

      {/* SECTIE 7: Kapitaalslasten */}
      <Section title="Kapitaalslasten">
        <KapitaalSection data={strategieData.kapitaal} />
      </Section>

      {/* SECTIE 8: Variabele Kosten */}
      <Section title="Variabele Kosten">
        <VariabelSection data={strategieData.variabel} />
      </Section>
    </div>
  );
}

// Helper Components
function HeaderSection({ data }) {
  return (
    <div>
      <div className="flex items-center space-x-3 mb-2">
        <div className="w-4 h-4 rounded" style={{ background: data.color }} />
        <h1 className="text-3xl font-bold" style={{ color: COLORS.dark }}>
          {data.code}: {data.naam}
        </h1>
      </div>
      <div className="flex items-center space-x-3">
        <span className="px-3 py-1 rounded font-semibold" style={{ background: COLORS.primary + '30', color: COLORS.dark }}>
          Variant: {data.code}{data.variant}
        </span>
        <span className="px-3 py-1 rounded font-semibold" style={{ 
          background: data.schillabel === 'B+' ? '#22C55E30' : '#F9731630',
          color: data.schillabel === 'B+' ? '#15803D' : '#C2410C'
        }}>
          Schil {data.schillabel}
        </span>
      </div>
    </div>
  );
}

function KPISection({ data }) {
  const kpis = [
    { label: 'Extra Nationale Kosten', value: `€ ${Math.round(data.kpis.kostenPerTon).toLocaleString('nl-NL')}`, unit: 'per ton CO₂', color: COLORS.red },
    { label: 'CO₂ Uitstoot', value: Math.round(data.kpis.co2Uitstoot).toLocaleString('nl-NL'), unit: 'ton/jaar', color: COLORS.green },
    { label: 'Energievraag', value: data.kpis.energieVraag.toFixed(1), unit: 'GJ/weq/jaar', color: COLORS.blue },
    { label: 'Totale Kosten', value: `€ ${Math.round(data.kpis.totaleKosten / 1000).toLocaleString('nl-NL')}k`, unit: 'per jaar', color: COLORS.orange }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => (
        <KPICard key={idx} label={kpi.label} value={kpi.value} unit={kpi.unit} color={kpi.color} />
      ))}
    </div>
  );
}

function KPICard({ label, value, unit, color }) {
  return (
    <div className="p-6 rounded-lg shadow-md bg-white" style={{ borderLeft: `4px solid ${color}` }}>
      <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gray }}>{label}</p>
      <p className="text-3xl font-bold mb-1" style={{ color }}>{value}</p>
      <p className="text-xs" style={{ color: COLORS.gray }}>{unit}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-xl font-semibold mb-4" style={{ color: COLORS.dark }}>{title}</h3>
      {children}
    </div>
  );
}

// Sectie Componenten

function AansluitingenSection({ data }) {
  const chartData = [
    { name: 'Aardgas', value: data.aardgas, fill: COLORS.gray },
    { name: 'Elektrische WP', value: data.ewp, fill: COLORS.blue },
    { name: 'MT Warmtenet', value: data.mt, fill: COLORS.orange },
    { name: 'LT Warmtenet', value: data.lt, fill: COLORS.purple },
    { name: 'Hybride WP', value: data.hwp, fill: COLORS.green },
    { name: 'HR Ketel', value: data.hr, fill: COLORS.green }
  ].filter(d => d.value > 0);

  const totaal = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded" style={{ background: COLORS.primary + '15' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: COLORS.gray }}>Totaal</p>
          <p className="text-2xl font-bold" style={{ color: COLORS.dark }}>{totaal.toLocaleString('nl-NL')}</p>
        </div>
        <div className="p-4 rounded" style={{ background: COLORS.blue + '15' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: COLORS.gray }}>Aandeel eWP (WEQ)</p>
          <p className="text-2xl font-bold" style={{ color: COLORS.blue }}>{data.aandeelEwpWeq.toFixed(1)}%</p>
        </div>
        <div className="p-4 rounded" style={{ background: COLORS.blue + '15' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: COLORS.gray }}>Aandeel eWP (GJ)</p>
          <p className="text-2xl font-bold" style={{ color: COLORS.blue }}>{data.aandeelEwpGj.toFixed(1)}%</p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={150} />
          <Tooltip />
          <Bar dataKey="value">
            {chartData.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Table */}
      <table className="w-full text-sm">
        <thead style={{ background: COLORS.primary + '20' }}>
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Type</th>
            <th className="px-3 py-2 text-right font-semibold">Aantal</th>
            <th className="px-3 py-2 text-right font-semibold">%</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((item, idx) => (
            <tr key={idx} className="border-b">
              <td className="px-3 py-2">{item.name}</td>
              <td className="px-3 py-2 text-right">{item.value.toLocaleString('nl-NL')}</td>
              <td className="px-3 py-2 text-right">{((item.value / totaal) * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GevoeligheidSection({ data }) {
  const scenarios = [
    { label: 'Basis (hoofdberekening)', value: data.basis, color: COLORS.primary },
    { label: 'Lagere energiekosten (-20%)', value: data.lagereEnergiekosten, color: COLORS.green },
    { label: 'Hogere energiekosten (+20%)', value: data.hogereEnergiekosten, color: COLORS.red },
    { label: 'Optimistische besparing', value: data.optimistischeBesparing, color: COLORS.blue },
    { label: 'Lagere proceskosten', value: data.lagereProceskosten, color: COLORS.cyan },
    { label: 'Hogere proceskosten', value: data.hogereProceskosten, color: COLORS.orange }
  ];

  const min = Math.min(...scenarios.map(s => s.value));
  const max = Math.max(...scenarios.map(s => s.value));

  return (
    <div className="space-y-6">
      {/* Line Chart met bandbreedte */}
      <div>
        <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.gray }}>
          Kosten per ton CO₂ onder verschillende scenario's
        </h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={scenarios}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" angle={-15} textAnchor="end" height={100} fontSize={11} />
            <YAxis label={{ value: '€/ton CO₂', angle: -90, position: 'insideLeft' }} 
                   domain={[Math.floor(min * 0.9), Math.ceil(max * 1.1)]} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={COLORS.primary} strokeWidth={2} 
                  dot={{ fill: COLORS.primary, r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bandbreedte info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded" style={{ background: COLORS.green + '15' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: COLORS.gray }}>Minimum</p>
          <p className="text-2xl font-bold" style={{ color: COLORS.green }}>
            € {Math.round(min).toLocaleString('nl-NL')}
          </p>
        </div>
        <div className="p-4 rounded" style={{ background: COLORS.primary + '15' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: COLORS.gray }}>Basis</p>
          <p className="text-2xl font-bold" style={{ color: COLORS.dark }}>
            € {Math.round(data.basis).toLocaleString('nl-NL')}
          </p>
        </div>
        <div className="p-4 rounded" style={{ background: COLORS.red + '15' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: COLORS.gray }}>Maximum</p>
          <p className="text-2xl font-bold" style={{ color: COLORS.red }}>
            € {Math.round(max).toLocaleString('nl-NL')}
          </p>
        </div>
      </div>

      {/* Klimaatneutraal gas beschikbaarheid */}
      <div>
        <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.gray }}>
          Klimaatneutraal Gas Beschikbaarheid
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded flex items-center justify-between" style={{ background: COLORS.primary + '10' }}>
            <span className="text-sm font-semibold">1,5 BCM scenario</span>
            <span className={`px-3 py-1 rounded text-xs font-semibold ${
              data.klimaatGas1_5BCM === 'Beschikbaar' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {data.klimaatGas1_5BCM}
            </span>
          </div>
          <div className="p-3 rounded flex items-center justify-between" style={{ background: COLORS.primary + '10' }}>
            <span className="text-sm font-semibold">1,0 BCM scenario</span>
            <span className={`px-3 py-1 rounded text-xs font-semibold ${
              data.klimaatGas1_0BCM === 'Beschikbaar' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {data.klimaatGas1_0BCM}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EnergieVraagSection({ data }) {
  const vraagData = [
    { name: 'Ruimteverwarming', value: data.rv, fill: COLORS.red },
    { name: 'Tapwater', value: data.tw, fill: COLORS.blue },
    { name: 'Ventilatie', value: data.vent, fill: COLORS.green },
    { name: 'Koeling', value: data.koeling, fill: COLORS.purple },
    { name: 'Apparaten', value: data.app, fill: COLORS.orange }
  ].filter(d => d.value > 0);

  const woningenData = [
    { name: 'RV', value: data.woningen.rv },
    { name: 'TW', value: data.woningen.tw },
    { name: 'Vent', value: data.woningen.vent },
    { name: 'Koeling', value: data.woningen.koeling },
    { name: 'App', value: data.woningen.app }
  ].filter(d => d.value > 0);

  const utiliteitData = [
    { name: 'RV', value: data.utiliteit.rv },
    { name: 'TW', value: data.utiliteit.tw },
    { name: 'Vent', value: data.utiliteit.vent },
    { name: 'Koeling', value: data.utiliteit.koeling },
    { name: 'App', value: data.utiliteit.app }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Totaal */}
      <div className="p-4 rounded" style={{ background: COLORS.blue + '15' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gray }}>Totale Energievraag</p>
        <p className="text-4xl font-bold" style={{ color: COLORS.blue }}>
          {data.totaal.toFixed(1)} GJ/weq/jaar
        </p>
      </div>

      {/* Bar Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={vraagData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
          <YAxis label={{ value: 'GJ/weq/jaar', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value) => value.toFixed(2)} />
          <Bar dataKey="value">
            {vraagData.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Woningen vs Utiliteit */}
      <div>
        <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.gray }}>
          Uitsplitsing Woningen vs Utiliteit
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: COLORS.gray }}>Woningen</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={woningenData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.blue} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: COLORS.gray }}>Utiliteit</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={utiliteitData}>
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
    </div>
  );
}

function EnergieInputSection({ data }) {
  const inputData = [
    { name: 'Aardgas', value: data.aardgas, fill: COLORS.gray },
    { name: 'Klimaatneutraal Gas', value: data.klimaatGas, fill: COLORS.green },
    { name: 'Elektriciteit', value: data.elektra, fill: COLORS.blue },
    { name: 'MT Warmte', value: data.mt, fill: COLORS.orange },
    { name: 'LT Warmte', value: data.lt, fill: COLORS.purple },
    { name: 'Omgevingswarmte', value: data.omgeving, fill: COLORS.cyan }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Totaal */}
      <div className="p-4 rounded" style={{ background: COLORS.orange + '15' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gray }}>Totale Energie-Input</p>
        <p className="text-4xl font-bold" style={{ color: COLORS.orange }}>
          {data.totaal.toFixed(1)} GJ/weq/jaar
        </p>
      </div>

      {/* Pie Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={inputData} dataKey="value" nameKey="name" cx="50%" cy="50%" 
               outerRadius={100} label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}`}>
            {inputData.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Woningen vs Utiliteit */}
      <div>
        <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.gray }}>
          Input per Sector
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded" style={{ background: COLORS.blue + '10' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: COLORS.gray }}>Woningen</p>
            <p className="text-2xl font-bold mb-1" style={{ color: COLORS.blue }}>
              {data.woningen.totaal.toFixed(1)} GJ/weq
            </p>
            <p className="text-xs" style={{ color: COLORS.gray }}>
              Gas: {data.woningen.gas.toFixed(1)} | Elektra: {data.woningen.elektra.toFixed(1)}
            </p>
          </div>
          <div className="p-4 rounded" style={{ background: COLORS.orange + '10' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: COLORS.gray }}>Utiliteit</p>
            <p className="text-2xl font-bold mb-1" style={{ color: COLORS.orange }}>
              {data.utiliteit.totaal.toFixed(1)} GJ/weq
            </p>
            <p className="text-xs" style={{ color: COLORS.gray }}>
              Gas: {data.utiliteit.gas.toFixed(1)} | Elektra: {data.utiliteit.elektra.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Klimaatneutraal gas waarde */}
      {data.klimaatGas > 0 && (
        <div className="p-4 rounded" style={{ background: COLORS.green + '10' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: COLORS.gray }}>
            Klimaatneutraal Gas
          </p>
          <p className="text-sm" style={{ color: COLORS.dark }}>
            Waarde: € {data.waardeGas.toFixed(2)}/m³/jaar
          </p>
          <p className="text-sm" style={{ color: COLORS.dark }}>
            Toekenning: {data.toekenningGas === 1 ? 'Ja' : data.toekenningGas === 0 ? 'Nee' : 'Onbekend'}
          </p>
        </div>
      )}
    </div>
  );
}

function KapitaalSection({ data }) {
  const netwerkData = [
    { name: 'Elektriciteitsnet', value: data.elektraNet },
    { name: 'Gasnet verwijderen', value: data.gasVerwijderen },
    { name: 'Gasnet aanpassen', value: data.gasAanpassen },
    { name: 'Warmtenet buurt', value: data.warmteBuurt },
    { name: 'Warmtenet pand', value: data.warmtePand },
    { name: 'Warmtenet transport', value: data.warmteTransport },
    { name: 'Warmtenet opwekking', value: data.warmteOpwekking }
  ].filter(d => d.value > 0);

  const gebouwData = [
    { name: 'Gebouwschil', value: data.gebouwSchil },
    { name: 'Installaties', value: data.installaties }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Totaal */}
      <div className="p-4 rounded" style={{ background: COLORS.primary + '15' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gray }}>Totale Kapitaalslasten</p>
        <p className="text-4xl font-bold" style={{ color: COLORS.dark }}>
          € {Math.round(data.totaal / 1000).toLocaleString('nl-NL')}k /jaar
        </p>
      </div>

      {/* Netwerken */}
      <div>
        <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.gray }}>Netwerken</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={netwerkData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip formatter={(v) => `€ ${Math.round(v).toLocaleString('nl-NL')}`} />
            <Bar dataKey="value" fill={COLORS.orange} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gebouwen */}
      <div>
        <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.gray }}>Gebouwen</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={gebouwData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(v) => `€ ${Math.round(v).toLocaleString('nl-NL')}`} />
            <Bar dataKey="value" fill={COLORS.blue} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Uitsplitsing Woningen/Utiliteit */}
      <div>
        <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.gray }}>
          Gebouwkosten per Sector
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded" style={{ background: COLORS.blue + '10' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: COLORS.gray }}>Woningen</p>
            <p className="text-sm mb-1">Schil: € {Math.round(data.woningen.schil).toLocaleString('nl-NL')}</p>
            <p className="text-sm">Installaties: € {Math.round(data.woningen.installaties).toLocaleString('nl-NL')}</p>
          </div>
          <div className="p-4 rounded" style={{ background: COLORS.orange + '10' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: COLORS.gray }}>Utiliteit</p>
            <p className="text-sm mb-1">Schil: € {Math.round(data.utiliteit.schil).toLocaleString('nl-NL')}</p>
            <p className="text-sm">Installaties: € {Math.round(data.utiliteit.installaties).toLocaleString('nl-NL')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VariabelSection({ data }) {
  const energieData = [
    { name: 'Inkoop Warmte', value: data.inkoopWarmte, fill: COLORS.orange },
    { name: 'Inkoop Gas', value: data.inkoopGas, fill: COLORS.gray },
    { name: 'Inkoop Elektriciteit', value: data.inkoopElektra, fill: COLORS.blue }
  ].filter(d => d.value > 0);

  const omData = [
    { name: 'Gebouw O&M', value: data.gebouwOM, fill: COLORS.purple },
    { name: 'Warmtenet O&M', value: data.warmteOM, fill: COLORS.red },
    { name: 'Elektra/Gas net O&M', value: data.elektraGasOM, fill: COLORS.green }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Totalen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded" style={{ background: COLORS.red + '15' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gray }}>Totale Variabele Kosten</p>
          <p className="text-3xl font-bold" style={{ color: COLORS.red }}>
            € {Math.round(data.totaal / 1000).toLocaleString('nl-NL')}k /jaar
          </p>
        </div>
        <div className="p-4 rounded" style={{ background: COLORS.orange + '15' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gray }}>Extra t.o.v. Referentie</p>
          <p className="text-3xl font-bold" style={{ color: COLORS.orange }}>
            € {Math.round(data.extra / 1000).toLocaleString('nl-NL')}k /jaar
          </p>
        </div>
      </div>

      {/* Energiekosten */}
      <div>
        <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.gray }}>Energiekosten</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={energieData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip formatter={(v) => `€ ${Math.round(v).toLocaleString('nl-NL')}`} />
            <Bar dataKey="value">
              {energieData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Onderhoud & Beheer */}
      <div>
        <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.gray }}>Onderhoud & Beheer</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={omData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip formatter={(v) => `€ ${Math.round(v).toLocaleString('nl-NL')}`} />
            <Bar dataKey="value">
              {omData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Winst warmtebedrijven */}
      {data.winstWarmte > 0 && (
        <div className="p-4 rounded" style={{ background: COLORS.green + '10' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: COLORS.gray }}>
            Winst Warmtebedrijven
          </p>
          <p className="text-2xl font-bold" style={{ color: COLORS.green }}>
            € {Math.round(data.winstWarmte).toLocaleString('nl-NL')}/jaar
          </p>
        </div>
      )}
    </div>
  );
}

function getNaam(nr) {
  const namen = { '1': 'All-Electric', '2': 'MT Warmtenet', '3': 'LT Warmtenet', '4': 'Klimaatneutraal Gas' };
  return namen[String(nr)] || `Strategie ${nr}`;
}