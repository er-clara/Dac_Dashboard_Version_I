// ==========================================================================
// index_page.js — Executive Summary page
// Reported KPIs: bar + benchmark layout (no toggle here — it lives above the
// visuals block, controlled by exec_visuals.js, but reads same localStorage)
// ==========================================================================

(function () {
  const D = window.__DASH;
  const PAYLOAD = JSON.parse(document.getElementById('payload').textContent);
  const KPIS_REPORTED = PAYLOAD.kpis;
  const KPIS_ANALYTICAL = PAYLOAD.analytical;
  const CHARTS = PAYLOAD.charts;

  let state = { year: '2024' };

  // KPIs whose DAC % is not reported (no bar)
  const NO_PCT_IDS = new Set(['clean_energy_jobs']);

  // ---------- Baseline toggle (read from localStorage; written by exec_visuals.js) ----------
  const BASELINE_KEY = 'coned_dac_baseline_pct';
  function getBaseline() {
    const v = parseInt(localStorage.getItem(BASELINE_KEY), 10);
    return (v === 35 || v === 40) ? v : 35;
  }

  // ---------- Hero meta ----------
  function renderHero() {
    const el = document.getElementById('hero-meta');
    el.innerHTML = `<div><dt>Year</dt><dd>${state.year}</dd></div>`;
  }

  // ---------- Hero number formatter (DAC value) ----------
  function fmtDacHero(k, cur) {
    if (k.format === 'currency' && cur.dac != null) {
      return D.fmtNum(cur.dac, 'currency');
    }
    if (cur.dac != null) {
      const num = D.fmtNum(cur.dac, k.format);
      const unit = (k.unit && k.unit !== '$') ? ' ' + k.unit : '';
      return num + unit;
    }
    const num = D.fmtNum(cur.total, k.format);
    const unit = (k.unit && k.unit !== '$') ? ' ' + k.unit : '';
    return num + unit;
  }

  // ---------- Reported KPI cards ----------
  function renderReportedKPIs() {
    const grid = document.getElementById('kpi-grid-reported');
    grid.classList.add('rkpi-bar-grid');
    const yrkey = 'y' + state.year;
    const prevKey = state.year === '2024' ? 'y2023' : null;
    const prevYearLabel = state.year === '2024' ? '2023' : '2022';
    const baseline = getBaseline();

    grid.innerHTML = KPIS_REPORTED.map(k => {
      const cur = k[yrkey];
      const prev = prevKey ? k[prevKey] : null;
      const hasPrev = prev && prev.total !== null && prev.total !== undefined;
      const delta = hasPrev ? D.deltaPct(cur.total, prev.total) : null;
      const inv = k.lower_is_better ? ' invert' : '';
      let yoyCls = 'neutral', yoyArrow = '·';
      if (delta !== null) {
        if (delta > 0.005) { yoyCls = 'up'; yoyArrow = '↑'; }
        else if (delta < -0.005) { yoyCls = 'down'; yoyArrow = '↓'; }
      }

      const dacPct = cur.dac_pct;
      const hasDac = dacPct !== null && dacPct !== undefined;
      const dacPctNum = hasDac ? Math.round(dacPct * 1000) / 10 : null;

      const isNoPct = NO_PCT_IDS.has(k.id) || !hasDac;

      const yoyPill = (delta !== null)
        ? `<span class="kpi-delta ${yoyCls}${inv}">${yoyArrow} ${(Math.abs(delta)*100).toFixed(1)}%</span>`
        : `<span class="kpi-delta neutral">— no ${prevYearLabel}</span>`;

      const sectionTag = `<span class="kpi-tag">Section ${k.section}</span>`;

      const subLineText = hasPrev
        ? `vs <span class="prev-value">${D.fmtNum(prev.total, k.format)}</span> · ${prevYearLabel}`
        : `<span style="color:var(--text-4)">no ${prevYearLabel} baseline</span>`;
      const subLineRow = `<div class="rkpi-sub-row"><span class="rkpi-sub-text">${subLineText}</span>${yoyPill}</div>`;

      let cardClasses = 'kpi-card rkpi-bar';
      let bodyHtml = '';

      if (isNoPct) {
        cardClasses += ' is-no-pct';
        const heroNum = D.fmtNum(cur.total, k.format) +
                        (k.unit && k.format !== 'currency' ? ' ' + k.unit : '');
        bodyHtml = `
          <div class="rkpi-hero">${heroNum}</div>
          ${subLineRow}
          <div class="rkpi-no-pct-note">DAC breakdown not reported</div>
        `;
      } else {
        const gap = dacPctNum - baseline;
        const gapAbs = Math.abs(gap).toFixed(1);
        let gapText, gapCls;
        if (k.lower_is_better) {
          if (gap > 0)      { gapText = '+' + gapAbs + 'pp above baseline (DAC over-burdened)'; gapCls = 'gap-neg'; }
          else if (gap < 0) { gapText = '−' + gapAbs + 'pp below baseline (less burden)'; gapCls = 'gap-pos'; }
          else              { gapText = 'at baseline'; gapCls = 'gap-neutral'; }
        } else {
          if (gap > 0)      { gapText = '+' + gapAbs + 'pp above baseline'; gapCls = 'gap-pos'; }
          else if (gap < 0) { gapText = '−' + gapAbs + 'pp below baseline'; gapCls = 'gap-neg'; }
          else              { gapText = 'at baseline'; gapCls = 'gap-neutral'; }
        }

        bodyHtml = `
          <div class="rkpi-hero">${fmtDacHero(k, cur)}</div>
          ${subLineRow}
          <div class="rkpi-bar-wrap">
            <div class="rkpi-bar-pct-row">
              <span class="rkpi-bar-pct" style="left: ${dacPctNum}%;">${dacPctNum.toFixed(1)}%</span>
            </div>
            <div class="rkpi-bar">
              <div class="rkpi-bar-fill" style="width: ${dacPctNum}%;"></div>
              <div class="rkpi-benchmark-tick" style="left: ${baseline}%;"></div>
              <div class="rkpi-benchmark-label" style="left: ${baseline}%;">▲ ${baseline}% baseline</div>
            </div>
          </div>
          <div class="rkpi-foot">
            <span>vs <strong>${baseline}%</strong> baseline</span>
            <span class="${gapCls}">${gapText}</span>
          </div>
        `;
      }

      const tooltip = k.narrative
        ? `<div class="kpi-tooltip"><div class="kpi-tooltip-title">${k.label}</div><div class="kpi-tooltip-body">${k.narrative}</div></div>`
        : '';

      return `<a class="${cardClasses}" href="section_${k.section}.html" style="text-decoration:none; color:inherit;">
        ${sectionTag}
        <div class="rkpi-label">${k.label}</div>
        ${bodyHtml}
        ${tooltip}
      </a>`;
    }).join('');
  }

  // ---------- Analytical KPI cards (UNCHANGED) ----------
  function renderAnalyticalKPIs() {
    const grid = document.getElementById('kpi-grid-analytical');
    const yrkey = 'y' + state.year;
    const prevKey = state.year === '2024' ? 'y2023' : null;
    const prevYearLabel = state.year === '2024' ? '2023' : '2022';
    const featuredIds = new Set(['equity_index']);
    grid.innerHTML = KPIS_ANALYTICAL.map(k => {
      const cur = k[yrkey];
      const prev = prevKey ? k[prevKey] : null;
      const hasPrev = prev && prev.value !== null && prev.value !== undefined;
      const delta = hasPrev ? D.deltaPct(cur.value, prev.value) : null;
      const inv = k.lower_is_better ? ' invert' : '';
      let deltaCls = 'neutral', deltaArrow = '·';
      if (delta !== null) {
        if (delta > 0.005) { deltaCls = 'up'; deltaArrow = '↑'; }
        else if (delta < -0.005) { deltaCls = 'down'; deltaArrow = '↓'; }
      }
      const featured = featuredIds.has(k.id) ? ' featured' : '';
      const caveat = k.caveat_2023 && prevKey === 'y2023'
        ? `<span style="background:rgba(184,134,11,0.18); color:var(--amber); padding:1px 5px; border-radius:2px; font-size:9px; font-weight:700; letter-spacing:0.04em; margin-left:4px;">${k.caveat_2023}</span>` : '';
      const sectionTag = k.section === 'MULTI' ? 'COMPOSITE' : 'Section ' + k.section;
      const href = (k.section && k.section !== 'MULTI') ? `section_${k.section}.html` : '#';
      return `<a class="kpi-card analytical${featured}" href="${href}" style="text-decoration:none; color:inherit;">
        <span class="kpi-tag">${sectionTag}</span>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value-row">
          <span class="kpi-value-current">${D.fmtNum(cur.value, k.format)}</span>
        </div>
        <div class="kpi-prev-row">
          <div class="kpi-prev">${hasPrev
            ? `vs <span class="kpi-prev-value">${D.fmtNum(prev.value, k.format)}</span> · ${prevYearLabel}${caveat}`
            : `<span style="color:var(--text-4)">— no ${prevYearLabel} baseline</span>`}</div>
          ${delta !== null ? `<span class="kpi-delta ${deltaCls}${inv}">${deltaArrow} ${(Math.abs(delta)*100).toFixed(1)}%</span>` : ''}
        </div>
        <div class="kpi-tooltip">
          <div class="kpi-tooltip-title">${k.label}</div>
          ${k.narrative ? `<div class="kpi-tooltip-body">${k.narrative}</div>` : ''}
          <div class="kpi-tooltip-formula">ƒ = ${k.source_calc}</div>
        </div>
      </a>`;
    }).join('');
  }

  function rerenderAll() {
    renderHero();
    renderReportedKPIs();
    renderAnalyticalKPIs();
  }

  // Listen for baseline changes from exec_visuals.js
  document.addEventListener('baseline:changed', () => {
    renderReportedKPIs();
  });

  D.boot(newYear => {
    state.year = newYear;
    rerenderAll();
  });

  rerenderAll();
})();