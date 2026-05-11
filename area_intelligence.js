// ==========================================================================
// area_intelligence.js — Area Intelligence · Section A: Clean Energy Spending
// Layout: 1/4 Distribution | 1/4 YoY Growth | 1/4 Equity Quadrant | 1/4 KPI Cards (2x2)
// Responds to year-select dropdown + distMode toggle
// ==========================================================================

(function () {
  const PAYLOAD = JSON.parse(document.getElementById('payload').textContent);

  // ── Section payload cache (fetched dynamically) ──
  var SECTION_CACHE = {};

  // TODO: replace fetch('section_X.html') with Dataverse API call per section
  // Endpoint pattern: GET /dataverse/sections/{letter}?year={year}
  function getSectionPayload(letter) {
    return new Promise(function(resolve) {
      if (SECTION_CACHE[letter]) { resolve(SECTION_CACHE[letter]); return; }
      fetch('section_' + letter + '.html')
        .then(function(r) { return r.text(); })
        .then(function(html) {
          var match = html.match(/<script[^>]+id="payload"[^>]*>([\s\S]*?)<\/script>/);
          if (match) {
            try {
              var p = JSON.parse(match[1]);
              SECTION_CACHE[letter] = p;
              resolve(p);
            } catch(e) { resolve(null); }
          } else { resolve(null); }
        })
        .catch(function() { resolve(null); });
    });
  }

  // TODO: replace A_DATA with Dataverse endpoint
  // Fields to fetch per year: dac, nondac, total, dacPct, savings_dac, savings_total,
  // inst_pct (from tables A5/A8), topProgram (derive from A1 table max dac_pct),
  // yoy percentages (calculate from consecutive year totals),
  // prevDac, prevTotal, prevSavings_dac, prevSavings_total
  const A_DATA = {
    '2024': {
      dac: 204785586, nondac: 175480128, total: 380265714,
      dacPct: 53.9,
      savings_dac: 2486965, savings_total: 4360879,
      inst_pct: 50, // TODO: derive from tables A5/A8 (DAC installs / total installs)
      topProgram: { name: 'Affordable Multifamily', total: 77558050, pct: 92 }, // TODO: derive dynamically from A1 table (max dac_pct program)
      // TODO: calculate yoy from consecutive PAYLOAD kpis years (dac delta / prev dac)
      yoy: [
        { label: 'Total<br>Incentives',   overall: 45, dac: 58 },
        { label: 'Energy<br>Savings',     overall: 8,  dac: 50 },
        { label: 'Avg per<br>Particip.',  overall: 62, dac: 68 },
        { label: 'DAC<br>Savings/Part.',  overall: 22, dac: 60 }
      ],
      prevDac: 129680235, prevTotal: 262524921,
      prevSavings_dac: 1659904, prevSavings_total: 4019790,
      quadPrograms: 'A1_programs_2024',
      prevYear: '2023'
    },
    '2023': {
      dac: 129680235, nondac: 132844686, total: 262524921,
      dacPct: 49.4,
      savings_dac: 1659904, savings_total: 4019790,
      inst_pct: 38, // TODO: derive from tables A5/A8 (DAC installs / total installs)
      topProgram: { name: 'Clean Heat – Multifamily ASHP', total: 28288902, pct: 74 }, // TODO: derive dynamically from A1 table (max dac_pct program)
      yoy: null,
      prevDac: null, prevTotal: null,
      prevSavings_dac: null, prevSavings_total: null,
      quadPrograms: 'A1_programs_2023',
      prevYear: '2022'
    }
  };

  let state    = { year: '2024' };
  let distMode = 'incentives';
  let quadMode = 'incentives';

  function fmtM(v) {
    if (v >= 1e9) return '$' + (v/1e9).toFixed(2) + 'B';
    if (v >= 1e6) return '$' + (v/1e6).toFixed(1) + 'M';
    return '$' + Math.round(v/1e3) + 'K';
  }
  function fmtMMBtu(v) {
    if (v >= 1e6) return (v/1e6).toFixed(2) + 'M';
    return Math.round(v/1e3) + 'K';
  }

  // ── 1. Distribution ──
  function renderDistribution() {
    const yr  = A_DATA[state.year];
    const isSavings = distMode === 'savings';

    const dacVal    = isSavings ? yr.savings_dac                      : yr.dac;
    const nondacVal = isSavings ? (yr.savings_total - yr.savings_dac) : yr.nondac;
    const totalVal  = isSavings ? yr.savings_total                    : yr.total;
    const dacPct    = isSavings ? +(yr.savings_dac / yr.savings_total * 100).toFixed(1) : yr.dacPct;
    const nonPct    = (100 - dacPct).toFixed(1);
    const fmtVal    = isSavings ? v => fmtMMBtu(v) + ' MMBtu' : fmtM;

    const prevDacVal   = isSavings ? yr.prevSavings_dac   : yr.prevDac;
    const prevTotalVal = isSavings ? yr.prevSavings_total : yr.prevTotal;

    const compareHtml = prevDacVal ? `
      <div class="ai-dist-compare">
        <div class="ai-dist-cmp-row">
          <span class="ai-dist-cmp-label">DAC vs ${yr.prevYear}</span>
          <span class="ai-dist-cmp-from">${fmtVal(prevDacVal)} → ${fmtVal(dacVal)}</span>
          <span class="ai-dist-cmp-delta" style="color:var(--green)">+${Math.round((dacVal - prevDacVal) / prevDacVal * 100)}%</span>
        </div>
        <div class="ai-dist-cmp-row">
          <span class="ai-dist-cmp-label">Total vs ${yr.prevYear}</span>
          <span class="ai-dist-cmp-from">${fmtVal(prevTotalVal)} → ${fmtVal(totalVal)}</span>
          <span class="ai-dist-cmp-delta" style="color:var(--green)">+${Math.round((totalVal - prevTotalVal) / prevTotalVal * 100)}%</span>
        </div>
      </div>` : `
      <div class="ai-dist-compare">
        <div class="ai-dist-cmp-row">
          <span class="ai-dist-cmp-label" style="color:var(--text-4)">No ${yr.prevYear} baseline available</span>
        </div>
      </div>`;

    const cardTitle = isSavings ? 'Energy Savings Distribution' : 'Incentive Spend Distribution';
    const cardSub   = isSavings ? 'MMBtu · DAC vs Other Communities · ' + state.year
                                : 'Incentives · DAC vs Other Communities · ' + state.year;

    return `
      <div class="ai-card">
        <div class="ai-card-head">
          <div>
            <span class="ai-card-title">${cardTitle}</span>
            <p class="ai-card-sub">${cardSub}</p>
          </div>
          <div class="ai-dist-toggle">
            <button class="ai-dist-btn ${!isSavings ? 'active' : ''}" data-dist="incentives">Incentives</button>
            <button class="ai-dist-btn ${isSavings ? 'active' : ''}" data-dist="savings">Savings</button>
          </div>
        </div>
        <div class="ai-dist-row">
          <div class="ai-dist-row-head">
            <span class="ai-dist-label">Disadvantaged Communities</span>
            <span class="ai-dist-amount">${fmtVal(dacVal)}</span>
          </div>
          <div class="ai-dist-bar-wrap">
            <div class="ai-dist-seg ai-dist-dac" style="width:${dacPct}%"><span class="ai-dist-pct">${dacPct.toFixed(0)}%</span></div>
            <div class="ai-dist-seg ai-dist-nondac" style="width:${nonPct}%"></div>
          </div>
        </div>
        <div class="ai-dist-row" style="margin-top:10px">
          <div class="ai-dist-row-head">
            <span class="ai-dist-label">Other Communities</span>
            <span class="ai-dist-amount" style="color:var(--text-2)">${fmtVal(nondacVal)}</span>
          </div>
          <div class="ai-dist-bar-wrap">
            <div class="ai-dist-seg ai-dist-pale" style="width:${nonPct}%"><span class="ai-dist-pct" style="color:var(--ink-2)">${nonPct}%</span></div>
            <div class="ai-dist-seg" style="width:${dacPct}%;background:var(--white-smoke)"></div>
          </div>
        </div>
        <div class="ai-dist-total">${fmtVal(totalVal)} Total</div>
        ${compareHtml}
        <div class="ai-dist-legend">
          <span><span class="ai-dist-swatch" style="background:var(--dusk)"></span>DAC ${dacPct.toFixed(0)}%</span>
          <span><span class="ai-dist-swatch" style="background:var(--pale-sky)"></span>Non-DAC ${nonPct}%</span>
        </div>
      </div>`;
  }

  // ── 2. YoY Growth ──
  function renderYoY() {
    const yr = A_DATA[state.year];

    if (!yr.yoy) {
      return `
        <div class="ai-card">
          <div class="ai-card-head">
            <div>
              <span class="ai-card-title">Year-Over-Year Growth</span>
              <p class="ai-card-sub">Overall vs DAC community growth · ${yr.prevYear} → ${state.year}</p>
            </div>
            <span class="ai-card-tag">${yr.prevYear} → ${state.year}</span>
          </div>
          <div class="empty-pane" style="flex:1;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text-3);font-style:italic;">
            No prior year baseline available for ${state.year}
          </div>
        </div>`;
    }

    const maxVal = 80;
    const chartH = 200;

    const bars = yr.yoy.map(row => {
      const oh = Math.max(3, (row.overall / maxVal) * chartH);
      const dh = Math.max(3, (row.dac     / maxVal) * chartH);
      return `
        <div class="ai-yoy-group">
          <div class="ai-yoy-bars" style="height:${chartH}px">
            <div class="ai-yoy-bar ai-yoy-overall" style="height:${oh}px"
              data-label="${row.label.replace('<br>',' ')}" data-overall="${row.overall}" data-dac="${row.dac}"></div>
            <div class="ai-yoy-bar ai-yoy-dac" style="height:${dh}px"
              data-label="${row.label.replace('<br>',' ')}" data-overall="${row.overall}" data-dac="${row.dac}"></div>
          </div>
          <div class="ai-yoy-vals">
            <span class="ai-yoy-val-o">${row.overall}%</span>
            <span class="ai-yoy-val-d">${row.dac}%</span>
          </div>
          <div class="ai-yoy-lbl">${row.label}</div>
        </div>`;
    }).join('');

    return `
      <div class="ai-card" style="gap:4px;">
        <div class="ai-card-head">
          <div>
            <span class="ai-card-title">Year-Over-Year Growth</span>
            <p class="ai-card-sub">Overall vs DAC community growth · ${yr.prevYear} → ${state.year}</p>
          </div>
          <span class="ai-card-tag">${yr.prevYear} → ${state.year}</span>
        </div>
        <div class="ai-yoy-chart">${bars}</div>
        <div class="ai-yoy-legend" style="border-top:none;padding-top:4px;">
          <span><span class="ai-yoy-dot" style="background:var(--pale-sky)"></span>Overall %</span>
          <span><span class="ai-yoy-dot" style="background:var(--dusk)"></span>DAC %</span>
        </div>
      </div>`;
  }

  // ── 3. Equity Quadrant ──
  function renderQuadrant() {
    const yr    = A_DATA[state.year];
    const isSav = quadMode === 'savings';

    const A2_2024 = [
      {name:'Affordable Multifamily Energy Efficiency Program',total:483052,dac:439980,dac_pct:0.91},
      {name:'Clean Heat – C&I Air Source Heat Pump',total:61309,dac:10598,dac_pct:0.17},
      {name:'Clean Heat – C&I Ground Source Heat Pump',total:3717,dac:0,dac_pct:0},
      {name:'Clean Heat – Midstream Heat Pump Water Heater',total:7685,dac:3728,dac_pct:0.49},
      {name:'Clean Heat – Multifamily Air Source Heat Pump',total:155733,dac:99387,dac_pct:0.64},
      {name:'Clean Heat – Multifamily Ground Source Heat Pump',total:25135,dac:24886,dac_pct:0.99},
      {name:'Clean Heat – Residential Air Source Heat Pump',total:563575,dac:240396,dac_pct:0.43},
      {name:'Clean Heat – Residential Ground Source Heat Pump',total:13617,dac:1080,dac_pct:0.08},
      {name:'Clean Heat – SMB Air Source Heat Pump',total:41270,dac:16139,dac_pct:0.39},
      {name:'Commercial & Industrial',total:330993,dac:96256,dac_pct:0.29},
      {name:'Commercial Water Heaters PEI',total:592,dac:23,dac_pct:0.04},
      {name:'Efficiency Starter Program - LMI',total:8324,dac:8324,dac_pct:1.0},
      {name:'EmPower+',total:4342,dac:4342,dac_pct:1.0},
      {name:'Instant Lighting',total:79292,dac:28446,dac_pct:0.36},
      {name:'Marketplace',total:998,dac:357,dac_pct:0.36},
      {name:'Midstream Water and Space Heating',total:25939,dac:14473,dac_pct:0.56},
      {name:'Multifamily',total:292367,dac:105777,dac_pct:0.36},
      {name:'Multifamily - Fuel-Switch',total:16684,dac:1043,dac_pct:0.06},
      {name:'Real Time Energy Management',total:1815,dac:1031,dac_pct:0.57},
      {name:'Residential Home Energy Reports',total:298526,dac:127114,dac_pct:0.43},
      {name:'Retail Lighting - LMI',total:31263,dac:31263,dac_pct:1.0},
      {name:'Retail Products',total:1695384,dac:1107423,dac_pct:0.65},
      {name:'Small-Medium Business',total:180049,dac:94989,dac_pct:0.53},
      {name:'Smart Kids',total:27604,dac:27604,dac_pct:1.0},
      {name:'Weather Ready',total:11614,dac:2303,dac_pct:0.20}
    ];
    const A2_2023 = [
      {name:'AMEEP – Electric & Gas',total:371543,dac:329992,dac_pct:0.89},
      {name:'Clean Heat – C&I ASHP',total:47217,dac:26941,dac_pct:0.57},
      {name:'Clean Heat – C&I GSHP',total:6747,dac:0,dac_pct:0},
      {name:'Clean Heat – Midstream Heat Pump Water Heater',total:9114,dac:161,dac_pct:0.02},
      {name:'Clean Heat – Multifamily ASHP',total:181349,dac:123384,dac_pct:0.68},
      {name:'Clean Heat – Multifamily GSHP',total:5648,dac:5648,dac_pct:1.0},
      {name:'Clean Heat – Residential ASHP',total:342390,dac:134186,dac_pct:0.39},
      {name:'Clean Heat – Residential GSHP',total:21478,dac:1822,dac_pct:0.08},
      {name:'Clean Heat – SMB ASHP',total:58845,dac:18955,dac_pct:0.32},
      {name:'C&I Program – Electric & Gas',total:779388,dac:122099,dac_pct:0.16},
      {name:'Commercial Kitchen',total:35373,dac:12935,dac_pct:0.37},
      {name:'Efficiency Starter Program - LMI',total:3870,dac:3870,dac_pct:1.0},
      {name:'EmPower – Electric & Gas',total:4464,dac:4464,dac_pct:1.0},
      {name:'Instant Lighting',total:87946,dac:15324,dac_pct:0.17},
      {name:'Marketplace – Electric & Gas',total:20062,dac:6474,dac_pct:0.32},
      {name:'Midstream Water and Space Heating',total:42366,dac:18615,dac_pct:0.44},
      {name:'Multifamily Program – Electric & Gas',total:204788,dac:73073,dac_pct:0.36},
      {name:'Multifamily - Fuel-Switch',total:60491,dac:22075,dac_pct:0.36},
      {name:'Real Time Energy Management',total:397,dac:397,dac_pct:1.0},
      {name:'Residential Home Energy Reports – Electric & Gas',total:301694,dac:124344,dac_pct:0.41},
      {name:'Residential Weatherization',total:27911,dac:3977,dac_pct:0.14},
      {name:'Retail Lighting',total:361313,dac:194269,dac_pct:0.54},
      {name:'Retail Lighting - LMI',total:61167,dac:61167,dac_pct:1.0},
      {name:'Retail Products – Electric & Gas',total:377573,dac:209487,dac_pct:0.55},
      {name:'SMB Program – Electric & Gas',total:258776,dac:109174,dac_pct:0.42},
      {name:'Smart Kids – Electric & Gas',total:17442,dac:9564,dac_pct:0.55},
      {name:'Smart Kids LMI – Electric & Gas',total:26852,dac:26852,dac_pct:1.0},
      {name:'Virtual Commissioning',total:1895,dac:653,dac_pct:0.34}
    ];
    const A1_2024 = [
      {name:'Affordable Multifamily Energy Efficiency Program',total:77558050,dac:71602722,dac_pct:0.92},
      {name:'Clean Heat – C&I Air Source Heat Pump',total:14233506,dac:3436916,dac_pct:0.24},
      {name:'Clean Heat – C&I Ground Source Heat Pump',total:1526891,dac:0,dac_pct:0},
      {name:'Clean Heat – Midstream Heat Pump Water Heater',total:1790099,dac:655300,dac_pct:0.37},
      {name:'Clean Heat – Multifamily Air Source Heat Pump',total:42663626,dac:27928074,dac_pct:0.65},
      {name:'Clean Heat – Multifamily Ground Source Heat Pump',total:6693753,dac:6579092,dac_pct:0.98},
      {name:'Clean Heat – Residential Air Source Heat Pump',total:94920742,dac:45204005,dac_pct:0.48},
      {name:'Clean Heat – Residential Ground Source Heat Pump',total:5455378,dac:547990,dac_pct:0.10},
      {name:'Clean Heat – SMB Air Source Heat Pump',total:10421345,dac:3285890,dac_pct:0.32},
      {name:'Commercial & Industrial',total:51280519,dac:8885679,dac_pct:0.17},
      {name:'Commercial Kitchen',total:474600,dac:216700,dac_pct:0.46},
      {name:'Efficiency Starter Program - LMI',total:84015,dac:84015,dac_pct:1.0},
      {name:'EmPower+',total:1409607,dac:1409607,dac_pct:1.0},
      {name:'Instant Lighting',total:4473123,dac:1718406,dac_pct:0.38},
      {name:'Marketplace',total:53844,dac:17900,dac_pct:0.33},
      {name:'Midstream Water and Space Heating',total:1471341,dac:1206857,dac_pct:0.82},
      {name:'Multifamily',total:34557141,dac:15476005,dac_pct:0.45},
      {name:'Multifamily - Fuel-Switch',total:917694,dac:39643,dac_pct:0.04},
      {name:'Commercial Water Heaters PEI',total:8984,dac:704,dac_pct:0.08},
      {name:'Pilots',total:128224,dac:47296,dac_pct:0.37},
      {name:'Real Time Energy Management',total:186163,dac:105798,dac_pct:0.57},
      {name:'Retail Lighting - LMI',total:1009602,dac:1009602,dac_pct:1.0},
      {name:'Retail Products',total:8074692,dac:5117078,dac_pct:0.63},
      {name:'Small-Medium Business',total:17674899,dac:9180221,dac_pct:0.52},
      {name:'Smart Kids',total:862636,dac:845316,dac_pct:0.98},
      {name:'Weather Ready',total:2904973,dac:618886,dac_pct:0.21}
    ];
    const A1_2023 = [
      {name:'AMEEP - Electric & Gas',total:33895737,dac:31612418,dac_pct:0.93},
      {name:'Clean Heat – C&I ASHP',total:6779790,dac:2940949,dac_pct:0.43},
      {name:'Clean Heat – C&I GSHP',total:2698732,dac:0,dac_pct:0},
      {name:'Clean Heat – Multifamily ASHP',total:28288902,dac:20952100,dac_pct:0.74},
      {name:'Clean Heat – Multifamily GSHP',total:1296000,dac:1296000,dac_pct:1.0},
      {name:'Clean Heat – Residential ASHP',total:78690616,dac:34121994,dac_pct:0.43},
      {name:'Clean Heat – Residential GSHP',total:8638271,dac:727485,dac_pct:0.08},
      {name:'Clean Heat – SMB ASHP',total:9942624,dac:3989082,dac_pct:0.40},
      {name:'C&I Program – Electric & Gas',total:33125776,dac:9110325,dac_pct:0.28},
      {name:'Commercial Kitchen',total:1702873,dac:793662,dac_pct:0.47},
      {name:'Efficiency Starter Program - LMI',total:65587,dac:65587,dac_pct:1.0},
      {name:'Instant Lighting',total:2823408,dac:503000,dac_pct:0.18},
      {name:'Marketplace – Electric & Gas',total:730641,dac:245178,dac_pct:0.34},
      {name:'Multifamily Program – Electric & Gas',total:21009690,dac:8565740,dac_pct:0.41},
      {name:'Pilots',total:163288,dac:57076,dac_pct:0.35},
      {name:'Residential Weatherization – Electric & Gas',total:2262712,dac:283948,dac_pct:0.13},
      {name:'Retail Lighting',total:4457050,dac:2483635,dac_pct:0.56},
      {name:'Retail Lighting - LMI',total:280147,dac:280147,dac_pct:1.0},
      {name:'Retail Products – Electric & Gas',total:1052683,dac:589636,dac_pct:0.56},
      {name:'SMB Program',total:22112993,dac:9441467,dac_pct:0.43},
      {name:'Smart Kids – Electric & Gas',total:879657,dac:466118,dac_pct:0.53},
      {name:'Smart Kids LMI – Electric & Gas',total:669504,dac:669504,dac_pct:1.0},
      {name:'Midstream Water and Space Heating',total:939139,dac:484759,dac_pct:0.52},
      {name:'Residential Program – Gas',total:19100,dac:425,dac_pct:0.02}
    ];

    // Use cached section payload if available, else fall back to hardcoded
    var a2Data   = state.year === '2024' ? A2_2024 : A2_2023;
    var a1Data   = state.year === '2024' ? A1_2024 : A1_2023;

    if (SECTION_CACHE['A'] && SECTION_CACHE['A'].tables) {
      var tables = SECTION_CACHE['A'].tables;
      var showCurrent = state.year === '2024';
      // A1 from tables
      var a1Table = tables.find(function(t){ return t.id === 'A1'; });
      if (a1Table) {
        var a1Raw = showCurrent ? a1Table.data_2024 : a1Table.data_2023;
        var parsed = [];
        a1Raw.forEach(function(row) {
          if (!row || !row[0]) return;
          var name = String(row[0]).trim();
          if (!name || /total|grand total|program name/i.test(name)) return;
          var total = Number(row[1]);
          var dac   = Number(row[2]);
          if (!isFinite(total) || total <= 0) return;
          parsed.push({ name: name, total: total, dac: isFinite(dac)?dac:0,
            dac_pct: total > 0 ? (isFinite(dac)?dac/total:0) : 0 });
        });
        if (parsed.length > 0) a1Data = parsed;
      }
      // A2 from tables
      var a2Table = tables.find(function(t){ return t.id === 'A2'; });
      if (a2Table) {
        var a2Raw = showCurrent ? a2Table.data_2024 : a2Table.data_2023;
        var parsed2 = [];
        a2Raw.forEach(function(row) {
          if (!row || !row[0]) return;
          var name = String(row[0]).trim();
          if (!name || /total|grand total/i.test(name)) return;
          var total = Number(row[1]);
          var dac   = Number(row[2]);
          if (!isFinite(total) || total <= 0) return;
          parsed2.push({ name: name, total: total, dac: isFinite(dac)?dac:0,
            dac_pct: total > 0 ? (isFinite(dac)?dac/total:0) : 0 });
        });
        if (parsed2.length > 0) a2Data = parsed2;
      }
    }

    const programs = isSav ? a2Data : a1Data;

    const xLabel = isSav ? 'Total Energy Savings (MMBtu)' : 'Total Incentive Funding ($)';
    const fmtX   = isSav
      ? v => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : Math.round(v/1e3)+'K'
      : v => v >= 1e6 ? '$'+(v/1e6).toFixed(0)+'M' : '$'+Math.round(v/1e3)+'K';
    const fmtTip = isSav
      ? v => v >= 1e6 ? (v/1e6).toFixed(2)+'M MMBtu' : Math.round(v/1e3)+'K MMBtu'
      : v => v >= 1e6 ? '$'+(v/1e6).toFixed(0)+'M' : '$'+Math.round(v/1e3)+'K';

    const W=240, H=150, pL=30, pR=8, pT=14, pB=22;
    const iW=W-pL-pR, iH=H-pT-pB;
    const maxT = Math.max(...programs.map(p=>p.total));
    const maxR=6, minR=2.5;
    const rFor = v => Math.max(minR, Math.min(maxR, Math.sqrt(v/maxT)*maxR));
    const xFor = v => pL + (v/maxT)*iW;
    const yFor = p => pT + iH - (p*iH);

    let s = '';
    [0,25,50,75,100].forEach(p => {
      const y = yFor(p/100);
      const is50 = p===50;
      s += '<line x1="'+pL+'" y1="'+y.toFixed(1)+'" x2="'+(W-pR)+'" y2="'+y.toFixed(1)+'"'
         + ' stroke="'+(is50?'#2F5496':'#e0e0e0')+'" stroke-width="'+(is50?'.8':'.4')+'"'
         + (is50?' stroke-dasharray="3 2"':'')+'"/>';
      s += '<text x="'+(pL-2)+'" y="'+(y+2).toFixed(1)+'" font-size="5" fill="#888" text-anchor="end">'+p+'%</text>';
    });
    const midX = xFor(maxT*0.5);
    s += '<line x1="'+midX.toFixed(1)+'" y1="'+pT+'" x2="'+midX.toFixed(1)+'" y2="'+(pT+iH)+'"'
       + ' stroke="#2F5496" stroke-width=".6" stroke-dasharray="3 2" opacity=".5"/>';
    [0,25,50,100].forEach(p => {
      const x = pL+(p/100)*iW;
      s += '<text x="'+x.toFixed(1)+'" y="'+(H-6)+'" font-size="4.5" fill="#888" text-anchor="middle">'+fmtX((p/100)*maxT)+'</text>';
    });
    s += '<text x="'+(pL+iW/2).toFixed(1)+'" y="'+(H-1)+'" font-size="5" fill="#888" text-anchor="middle">'+xLabel+'</text>';
    s += '<text x="6" y="'+(pT+iH/2).toFixed(1)+'" font-size="5" fill="#888" text-anchor="middle" transform="rotate(-90 6 '+(pT+iH/2)+')">DAC Share</text>';
    s += '<text x="'+(W-pR-2).toFixed(1)+'" y="'+(yFor(.5)-2).toFixed(1)+'" font-size="4.5" fill="#2F5496" text-anchor="end">50% parity</text>';

    programs.forEach(p => {
      const x = xFor(p.total);
      const y = yFor(p.dac_pct);
      const r = rFor(p.total);
      const color = p.dac_pct >= .5 ? '#2F5496' : '#7AAFD4';
      s += '<circle class="ai-quad-dot"'
         + ' cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r.toFixed(1)+'"'
         + ' fill="'+color+'" opacity=".75"'
         + ' data-name="'+p.name.replace(/"/g,"'")+'"'
         + ' data-total="'+fmtTip(p.total)+'"'
         + ' data-pct="'+(p.dac_pct*100).toFixed(0)+'%"/>';
    });

    const cardTitle = isSav ? 'Equity Quadrant · Energy Savings' : 'Equity Quadrant · Incentive Spend';
    const cardSub   = isSav
      ? 'DAC % vs total MMBtu · circle size = program volume · ' + state.year
      : 'DAC % vs total $ · circle size = program volume · ' + state.year;

    return `
      <div class="ai-card" style="gap:1px;">
        <div class="ai-card-head">
          <div>
            <span class="ai-card-title">${cardTitle}</span>
            <p class="ai-card-sub">${cardSub}</p>
          </div>
          <div class="ai-quad-toggle">
            <button class="ai-quad-btn ${!isSav ? 'active' : ''}" data-quad="incentives">$</button>
            <button class="ai-quad-btn ${isSav ? 'active' : ''}" data-quad="savings">MMBtu</button>
          </div>
        </div>
        <div class="ai-quad-body">
          <svg viewBox="0 0 ${W} ${H}" class="ai-quad-svg">${s}</svg>
        </div>
      </div>`;
  }

  // ── 4. KPI 2×2 ──
  function renderKPICards() {
    const yr = A_DATA[state.year];
    const incGrow = yr.prevDac ? Math.round((yr.dac - yr.prevDac) / yr.prevDac * 100) : null;
    const savGrow = yr.prevSavings_dac ? Math.round((yr.savings_dac - yr.prevSavings_dac) / yr.prevSavings_dac * 100) : null;

    const cards = [
      {
        tag:    'Incentive Growth',
        hero:   incGrow !== null ? '+' + incGrow + '%' : yr.dacPct + '%',
        sub:    incGrow !== null ? 'DAC YoY increase' : 'DAC share',
        detail: yr.prevDac ? fmtM(yr.prevDac) + ' → ' + fmtM(yr.dac) : fmtM(yr.dac) + ' total DAC'
      },
      {
        tag:    'Most Equitable Program',
        hero:   yr.topProgram.pct + '%',
        sub:    'DAC share',
        detail: yr.topProgram.name + ' · ' + fmtM(yr.topProgram.total)
      },
      {
        tag:    'Savings Achieved',
        hero:   savGrow !== null ? '+' + savGrow + '%' : fmtMMBtu(yr.savings_dac) + ' MMBtu',
        sub:    savGrow !== null ? 'DAC savings YoY increase' : 'DAC energy savings',
        detail: yr.prevSavings_dac
          ? fmtMMBtu(yr.prevSavings_dac) + ' → ' + fmtMMBtu(yr.savings_dac) + ' MMBtu'
          : fmtMMBtu(yr.savings_total) + ' MMBtu total'
      },
      {
        tag:    'Installations',
        hero:   yr.inst_pct + '%',
        sub:    'of upgrades in DACs',
        detail: yr.prevYear && A_DATA[yr.prevYear]
          ? 'vs ~' + A_DATA[yr.prevYear].inst_pct + '% in ' + yr.prevYear
          : 'Reporting year ' + state.year
      }
    ];

    const html = cards.map(c => `
      <div class="ai-kpi-mini">
        <span class="ai-kpi-mini-tag">${c.tag}</span>
        <span class="ai-kpi-mini-hero">${c.hero}</span>
        <span class="ai-kpi-mini-sub">${c.sub}</span>
        <span class="ai-kpi-mini-detail">${c.detail}</span>
      </div>`).join('');

    return `
      <div class="ai-card ai-kpi-card-outer">
        <div class="ai-card-head">
          <div>
            <span class="ai-card-title">Key Metrics · ${state.year}</span>
            <p class="ai-card-sub">Section A · Clean Energy highlights</p>
          </div>
          <span class="ai-card-tag">Section A</span>
        </div>
        <div class="ai-kpi-2x2">${html}</div>
      </div>`;
  }


  // ── Header Cards ──
  function renderHeaderCards() {
    const grid = document.getElementById('exec-header-cards');
    if (!grid) return;

    const yr = A_DATA[state.year];

    // Average DAC Impact % across all sections from PAYLOAD
    const dacPcts = PAYLOAD.kpis
      .filter(k => k['y' + state.year] && k['y' + state.year].dac_pct != null)
      .map(k => k['y' + state.year].dac_pct);
    const avgDac = dacPcts.length > 0
      ? (dacPcts.reduce((a, b) => a + b, 0) / dacPcts.length * 100).toFixed(1)
      : '—';

    const incGrow = yr.prevDac ? Math.round((yr.dac - yr.prevDac) / yr.prevDac * 100) : null;
    const savGrow = yr.prevSavings_dac ? Math.round((yr.savings_dac - yr.prevSavings_dac) / yr.prevSavings_dac * 100) : null;

    const cards = [
      {
        tag:    'Avg DAC Impact',
        hero:   avgDac + '%',
        sub:    'Average across all sections',
        detail: 'Based on ' + dacPcts.length + ' reported metrics · ' + state.year
      },
      {
        tag:    'Incentive Growth',
        hero:   incGrow !== null ? '+' + incGrow + '%' : yr.dacPct + '%',
        sub:    incGrow !== null ? 'DAC YoY increase' : 'DAC share',
        detail: yr.prevDac ? fmtM(yr.prevDac) + ' → ' + fmtM(yr.dac) : fmtM(yr.dac) + ' total DAC'
      },
      {
        tag:    'Most Equitable Program',
        hero:   yr.topProgram.pct + '%',
        sub:    'DAC share · Section A',
        detail: yr.topProgram.name + ' · ' + fmtM(yr.topProgram.total)
      },
      {
        tag:    'Savings Achieved',
        hero:   savGrow !== null ? '+' + savGrow + '%' : fmtMMBtu(yr.savings_dac) + ' MMBtu',
        sub:    savGrow !== null ? 'DAC savings YoY increase' : 'DAC energy savings',
        detail: yr.prevSavings_dac
          ? fmtMMBtu(yr.prevSavings_dac) + ' → ' + fmtMMBtu(yr.savings_dac) + ' MMBtu'
          : fmtMMBtu(yr.savings_total) + ' MMBtu total'
      },
      {
        tag:    'Installations',
        hero:   yr.inst_pct + '%',
        sub:    'of upgrades in DACs',
        detail: yr.prevYear && A_DATA[yr.prevYear]
          ? 'vs ~' + A_DATA[yr.prevYear].inst_pct + '% in ' + yr.prevYear
          : 'Reporting year ' + state.year
      }
    ];

    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(5, 1fr)';
    grid.style.gap = '12px';
    grid.style.marginBottom = '16px';

    grid.innerHTML = cards.map(c => `
      <div class="ai-kpi-mini ai-header-card">
        <span class="ai-kpi-mini-tag">${c.tag}</span>
        <span class="ai-kpi-mini-hero">${c.hero}</span>
        <span class="ai-kpi-mini-sub">${c.sub}</span>
        <span class="ai-kpi-mini-detail">${c.detail}</span>
      </div>`).join('');

    // wire tooltips for header cards
    let tip = document.querySelector('.exec-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'exec-tooltip';
      document.body.appendChild(tip);
    }
    grid.querySelectorAll('.ai-kpi-mini').forEach(card => {
      card.style.cursor = 'default';
      card.addEventListener('mouseenter', () => {
        const tag    = card.querySelector('.ai-kpi-mini-tag').textContent;
        const hero   = card.querySelector('.ai-kpi-mini-hero').textContent;
        const sub    = card.querySelector('.ai-kpi-mini-sub').textContent;
        const detail = card.querySelector('.ai-kpi-mini-detail').textContent;
        tip.innerHTML = `<div class="tt-name">${tag}</div>
          <div class="tt-row"><span>${sub}</span><span class="v">${hero}</span></div>
          <div class="tt-row"><span>Detail</span><span class="v">${detail}</span></div>`;
        tip.style.opacity = '1';
      });
      card.addEventListener('mousemove', e => {
        tip.style.left = (e.pageX + 14) + 'px';
        tip.style.top  = (e.pageY - 8)  + 'px';
      });
      card.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
    });
  }

  // ── Render all ──
  function renderAreaIntelligence() {
    const grid = document.getElementById('exec-area-grid');
    if (!grid) return;
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';
    grid.style.gap = '12px';
    grid.innerHTML =
      renderDistribution() +
      renderYoY() +
      renderQuadrant() +
      renderKPICards();
    renderHeaderCards();
    wireTooltips();
  }

  // ── Tooltips + toggle wiring ──
  function wireTooltips() {
    let tip = document.querySelector('.exec-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'exec-tooltip';
      document.body.appendChild(tip);
    }

    // Distribution toggle
    document.querySelectorAll('.ai-dist-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        distMode = btn.dataset.dist;
        renderAreaIntelligence();
      });
    });

    // Quadrant toggle
    document.querySelectorAll('.ai-quad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        quadMode = btn.dataset.quad;
        renderAreaIntelligence();
      });
    });

    // YoY bars
    document.querySelectorAll('.ai-yoy-bar').forEach(bar => {
      bar.style.cursor = 'default';
      bar.addEventListener('mouseenter', () => {
        tip.innerHTML = `
          <div class="tt-name">${bar.dataset.label}</div>
          <div class="tt-row"><span>Overall growth</span><span class="v">${bar.dataset.overall}%</span></div>
          <div class="tt-row"><span>DAC growth</span><span class="v">${bar.dataset.dac}%</span></div>`;
        tip.style.opacity = '1';
      });
      bar.addEventListener('mousemove', e => {
        tip.style.left = (e.pageX + 14) + 'px';
        tip.style.top  = (e.pageY - 8)  + 'px';
      });
      bar.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
    });

    // Quadrant dots
    document.querySelectorAll('.ai-quad-dot').forEach(dot => {
      dot.style.cursor = 'default';
      dot.addEventListener('mouseenter', () => {
        tip.innerHTML = `
          <div class="tt-name">${dot.dataset.name}</div>
          <div class="tt-row"><span>Total</span><span class="v">${dot.dataset.total}</span></div>
          <div class="tt-row"><span>DAC share</span><span class="v">${dot.dataset.pct}</span></div>`;
        tip.style.opacity = '1';
      });
      dot.addEventListener('mousemove', e => {
        tip.style.left = (e.pageX + 14) + 'px';
        tip.style.top  = (e.pageY - 8)  + 'px';
      });
      dot.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
    });

    // KPI mini cards
    document.querySelectorAll('.ai-kpi-mini').forEach(card => {
      card.style.cursor = 'default';
      card.addEventListener('mouseenter', () => {
        const tag    = card.querySelector('.ai-kpi-mini-tag').textContent;
        const hero   = card.querySelector('.ai-kpi-mini-hero').textContent;
        const sub    = card.querySelector('.ai-kpi-mini-sub').textContent;
        const detail = card.querySelector('.ai-kpi-mini-detail').textContent;
        tip.innerHTML = `
          <div class="tt-name">${tag}</div>
          <div class="tt-row"><span>${sub}</span><span class="v">${hero}</span></div>
          <div class="tt-row"><span>Detail</span><span class="v">${detail}</span></div>`;
        tip.style.opacity = '1';
      });
      card.addEventListener('mousemove', e => {
        tip.style.left = (e.pageX + 14) + 'px';
        tip.style.top  = (e.pageY - 8)  + 'px';
      });
      card.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
    });
  }

  // ── Init ──
  function init() {
    const yrSel = document.getElementById('year-select');
    if (yrSel) {
      state.year = yrSel.value || '2024';
      yrSel.addEventListener('change', e => {
        state.year = e.target.value;
        renderAreaIntelligence();
        renderHeaderCards();
      });
    }
    // Pre-fetch Section A payload to get full program tables
    getSectionPayload('A').then(function() {
      renderAreaIntelligence();
      renderHeaderCards();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();