// ==========================================================================
// exec_visuals.js — DAC Shares block for the Executive Summary
// ==========================================================================

(function () {
  const PAYLOAD = JSON.parse(document.getElementById('payload').textContent);

  function buildSectionDAC() {
    const map24 = {}, map23 = {};
    PAYLOAD.kpis.forEach(k => {
      const sec = k.section;
      const p24 = k.y2024 && k.y2024.dac_pct;
      if (p24 != null) {
        if (!map24[sec] || (k.format === 'currency' && map24[sec].format !== 'currency')) {
          map24[sec] = { pct: p24, format: k.format, label: k.label, dac: k.y2024.dac, total: k.y2024.total };
        }
      }
      const p23 = k.y2023 && k.y2023.dac_pct;
      if (p23 != null) {
        if (!map23[sec] || (k.format === 'currency' && map23[sec].format !== 'currency')) {
          map23[sec] = { pct: p23 };
        }
      }
    });
    const SECTION_NAMES = {
      A: 'Clean Energy', B: 'EV Make-Ready', C: 'Demand Response',
      D: 'DER', E: 'Strategic Cap', F: 'Outages',
      G: 'Main Replace', H: 'Leak Repairs', I: 'Jobs', J: 'Customer Ops'
    };
    const RADAR_SHORT_NAMES = {
      A: 'Clean Energy', B: 'EV Ready', C: 'Demand Resp',
      D: 'DER', E: 'Strategic', F: 'Outages',
      G: 'Mains', H: 'Leaks', I: 'Jobs', J: 'Cust Ops'
    };
    const sections = ['A','B','C','D','E','F','G','H','I','J'];
    return sections.map(s => ({
      id: s,
      name: SECTION_NAMES[s],
      radarName: RADAR_SHORT_NAMES[s],
      pct2024: map24[s] ? map24[s].pct : 0,
      pct2023: map23[s] ? map23[s].pct : null,
      hasData: !!map24[s],
      label: map24[s] ? map24[s].label : null,
      isWarn: s === 'F'
    }));
  }

  const SECTIONS = buildSectionDAC();

  // ===== Page-wide state =====
  let state = { year: '2024' };

  const BASELINE_KEY = 'coned_dac_baseline_pct';
  function getBaseline() {
    const v = parseInt(localStorage.getItem(BASELINE_KEY), 10);
    return (v === 35 || v === 40) ? v : 35;
  }
  function setBaseline(n) {
    localStorage.setItem(BASELINE_KEY, String(n));
    document.dispatchEvent(new CustomEvent('baseline:changed', { detail: n }));
  }

  function renderToggleBar() {
    const baseline = getBaseline();
    return `
      <div class="rkpi-toggle-bar exec-toggle-bar">
        <span class="rkpi-toggle-label">DAC EQUITY BASELINE</span>
        <div class="rkpi-toggle-group" role="tablist">
          <button class="rkpi-toggle-btn ${baseline === 35 ? 'active' : ''}" data-baseline="35">35%<span class="toggle-sub">· NY Climate Act</span></button>
          <button class="rkpi-toggle-btn ${baseline === 40 ? 'active' : ''}" data-baseline="40">40%<span class="toggle-sub">· NY Climate Act Goal</span></button>
        </div>
        <span class="rkpi-toggle-help">DAC % shown vs the ${baseline}% NY Climate Act ${baseline === 40 ? 'goal' : 'mandate'}</span>
      </div>
    `;
  }

  // ===== Op NEW: Dumbbell (YoY per section) =====
  function renderDumbbell(baseline, year) {
    // Dumbbell shows year-vs-prev. If year=2024 → 2023 baseline (data exists).
    // If year=2023 → 2022 baseline (data does NOT exist yet) → show "no baseline"
    const hasBaseline = (year === '2024');
    const prevLabel = hasBaseline ? '2023' : '2022';

    const data = SECTIONS.slice().sort((a,b) => a.id.localeCompare(b.id));

    const rows = data.map(s => {
      // For year=2024: prev=pct2023, curr=pct2024
      // For year=2023: prev=null (no 2022), curr=pct2023
      const curr = (year === '2024') ? s.pct2024 : s.pct2023;
      const prev = (year === '2024') ? s.pct2023 : null;
      const hasCurr = (year === '2024') ? s.hasData : (s.pct2023 != null);
      const hasPrev = (prev != null);
      const hasBoth = hasCurr && hasPrev;

      // Compute YoY pp delta if we have both
      let pillCls = 'dumb-pill-neutral';
      let pillText = '—';
      if (!hasBoth) {
        pillText = hasBaseline ? '—' : 'no ' + prevLabel;
      } else {
        const dpp = (curr - prev) * 100;
        // F is inverted: lower DAC % is better
        if (s.isWarn) {
          if (dpp < -0.5) { pillCls = 'dumb-pill-up'; pillText = dpp.toFixed(1) + 'pp'; }
          else if (dpp > 0.5) { pillCls = 'dumb-pill-down'; pillText = '+' + dpp.toFixed(1) + 'pp'; }
          else { pillText = (dpp >= 0 ? '+' : '') + dpp.toFixed(1) + 'pp'; }
        } else {
          if (dpp > 0.5)      { pillCls = 'dumb-pill-up';   pillText = '+' + dpp.toFixed(1) + 'pp'; }
          else if (dpp < -0.5){ pillCls = 'dumb-pill-down'; pillText = dpp.toFixed(1) + 'pp'; }
          else                { pillText = (dpp >= 0 ? '+' : '') + dpp.toFixed(1) + 'pp'; }
        }
      }

      // Bar drawing: connector + 2 dots
      let barInner;
      if (!hasCurr) {
        barInner = `<div class="dumb-tick" style="left: ${baseline}%;"></div><span class="dumb-empty-label">N/A</span>`;
      } else if (!hasBoth) {
        // Only curr (no prev) — single dot
        const pctNum = curr * 100;
        barInner = `
          <div class="dumb-tick" style="left: ${baseline}%;"></div>
          <div class="dumb-dot dumb-dot-curr" style="left: ${pctNum}%;"></div>
        `;
      } else {
        const currNum = curr * 100;
        const prevNum = prev * 100;
        const left = Math.min(currNum, prevNum);
        const width = Math.abs(currNum - prevNum);
        barInner = `
          <div class="dumb-tick" style="left: ${baseline}%;"></div>
          <div class="dumb-connector" style="left: ${left}%; width: ${width}%;"></div>
          <div class="dumb-dot dumb-dot-prev" style="left: ${prevNum}%;"></div>
          <div class="dumb-dot dumb-dot-curr" style="left: ${currNum}%;"></div>
        `;
      }

      const currTxt = hasCurr ? (curr * 100).toFixed(1) + '%' : '—';
      const tooltipData = `data-section="${s.id}" data-name="${s.name}" data-pct="${currTxt}" data-baseline="${baseline}%" data-gap="${pillText}"`;

      return `
        <div class="dumb-row ${!hasCurr ? 'is-na' : ''}" ${tooltipData}>
          <div class="dumb-label">${s.name}</div>
          <div class="dumb-bar">${barInner}</div>
          <div class="dumb-pill ${pillCls}">${pillText}</div>
        </div>
      `;
    }).join('');

    // X-axis labels
    const axisHtml = `
      <div class="dumb-axis">
        <span class="dumb-axis-tick" style="left: 0%;">0%</span>
        <span class="dumb-axis-tick" style="left: 25%;">25%</span>
        <span class="dumb-axis-tick dumb-axis-goal" style="left: ${baseline}%;">${baseline}% goal</span>
        <span class="dumb-axis-tick" style="left: 50%;">50%</span>
        <span class="dumb-axis-tick" style="left: 75%;">75%</span>
        <span class="dumb-axis-tick" style="left: 100%;">100%</span>
      </div>
    `;

    const subText = hasBaseline
      ? `Each row shows ${prevLabel} → ${year} year-over-year movement per section`
      : `Showing ${year} only · No ${prevLabel} baseline available yet`;

    return `
      <div class="exec-card" data-help="dumbbell">
        <div class="chart-card-head">
          <div>
            <h3>DAC Equity · YoY Movement</h3>
            <p class="chart-sub">${subText}</p>
          </div>
          <div class="chart-head-right">
            <div class="chart-legend">
              <div class="legend-item"><span class="legend-swatch" style="background:#B0BCC9; border-radius:50%; width:11px; height:11px;"></span>${prevLabel}</div>
              <div class="legend-item"><span class="legend-swatch" style="background:var(--dusk); border-radius:50%; width:11px; height:11px;"></span>${year}</div>
              <div class="legend-item"><span class="legend-swatch" style="background:#2873BA; width:2px;"></span>${baseline}% goal</div>
            </div>
            <span class="chart-tag">Section · DUMBBELL</span>
          </div>
        </div>
        <div class="chart-body">
          <div class="dumb-body">${rows}</div>
          ${axisHtml}
          <div class="quadrant-help-trigger">
            <button class="help-btn help-btn-icon-only" data-help-modal="dumbbell" type="button" aria-label="How to read this chart">
              <span class="help-icon">?</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderStrip(baseline, year) {
    // Year mode: 2024 uses pct2024, 2023 uses pct2023
    const data = SECTIONS.slice().sort((a,b) => a.id.localeCompare(b.id));
    const pctOf = s => year === '2023' ? s.pct2023 : s.pct2024;
    const hasOf = s => year === '2023' ? (s.pct2023 != null) : s.hasData;

    const rows = data.map(s => {
      const pct = pctOf(s);
      const has = hasOf(s);
      const pctNum = has ? pct * 100 : 0;
      const pctText = has ? pctNum.toFixed(1) + '%' : '—';
      const dacWidth = has ? pctNum : 0;
      const fillCls = s.isWarn ? 'strip-fill strip-fill-warn' : 'strip-fill';
      const naLabel = !has ? '<span class="strip-empty-label">N/A</span>' : '';
      const tooltipData = `data-section="${s.id}" data-name="${s.name}" data-pct="${pctText}" data-baseline="${baseline}%"`;
      return `
        <div class="strip-row" ${tooltipData}>
          <div class="strip-label">${s.name}</div>
          <div class="strip-bar">
            <div class="${fillCls}" style="width: ${dacWidth}%;"></div>
            <div class="strip-tick" style="left: ${baseline}%;"></div>
            ${naLabel}
          </div>
          <div class="strip-pct">${pctText}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="exec-card" data-help="strip">
        <div class="chart-card-head">
          <div>
            <h3>DAC Equity by Section</h3>
            <p class="chart-sub">Each bar = DAC share · Tick marks the ${baseline}% goal · ${year}</p>
          </div>
          <div class="chart-head-right">
            <div class="chart-legend">
              <div class="legend-item"><span class="legend-swatch" style="background:var(--dusk)"></span>DAC</div>
              <div class="legend-item"><span class="legend-swatch" style="background:var(--pale-sky)"></span>Non-DAC</div>
              <div class="legend-item"><span class="legend-swatch" style="background:#2873BA; width:2px;"></span>${baseline}% goal</div>
            </div>
            <span class="chart-tag">Section · STRIP</span>
          </div>
        </div>
        <div class="chart-body">
          <div class="strip-body">${rows}</div>
          <div class="quadrant-help-trigger">
            <button class="help-btn help-btn-icon-only" data-help-modal="strip" type="button" aria-label="How to read this chart">
              <span class="help-icon">?</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderRadar(baseline, year) {
    const N = SECTIONS.length;
    const cx = 230, cy = 195, R = 130;
    const max = 0.7;

    const ptsCurr = SECTIONS.map((s, i) => {
      const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
      const v = year === '2023' ? (s.pct2023 || 0) : s.pct2024;
      const r = (v / max) * R;
      return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
    });

    const ptsBench = SECTIONS.map((s, i) => {
      const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
      const r = (baseline / 100 / max) * R;
      return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
    });

    const pathFromPoints = (pts) => 'M ' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L ') + ' Z';

    const gridCircles = [10, 20, 30, 40, 50, 60, 70].map(p => {
      const r = (p / 100 / max) * R;
      return `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="var(--line)" stroke-width="1" stroke-dasharray="2 3"/>`;
    }).join('');

    const axes = SECTIONS.map((s, i) => {
      const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
      const lineX = cx + Math.cos(angle) * R;
      const lineY = cy + Math.sin(angle) * R;
      const labelX = cx + Math.cos(angle) * (R + 22);
      const labelY = cy + Math.sin(angle) * (R + 22);
      let anchor = 'middle';
      if (Math.cos(angle) > 0.3) anchor = 'start';
      else if (Math.cos(angle) < -0.3) anchor = 'end';
      return `
        <line x1="${cx}" y1="${cy}" x2="${lineX.toFixed(1)}" y2="${lineY.toFixed(1)}" stroke="var(--line)" stroke-width="0.5"/>
        <text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle"
              font-size="11" font-weight="600" fill="var(--text-2)">
          ${s.radarName}
        </text>
      `;
    }).join('');

    const dots = ptsCurr.map((p, i) => {
      const s = SECTIONS[i];
      const v = year === '2023' ? s.pct2023 : s.pct2024;
      const has = year === '2023' ? (s.pct2023 != null) : s.hasData;
      const pctText = has ? (v * 100).toFixed(1) + '%' : '—';
      return `<circle class="radar-dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" fill="var(--dusk)" stroke="white" stroke-width="1.5" data-section="${s.id}" data-name="${s.name}" data-pct="${pctText}" data-baseline="${baseline}%"/>`;
    }).join('');

    const scaleLabels = [10, 30, 50, 70].map(p => {
      const r = (p / 100 / max) * R;
      return `<text x="${cx + 3}" y="${cy - r + 3}" font-size="9" fill="var(--text-3)" font-family="Inter">${p}%</text>`;
    }).join('');

    return `
      <div class="exec-card" data-help="radar">
        <div class="chart-card-head">
          <div>
            <h3>Equity Radar · 360° Profile</h3>
            <p class="chart-sub">Each axis = one section · Outer = 70% · Dashed line = ${baseline}% goal · ${year}</p>
          </div>
          <div class="chart-head-right">
            <div class="chart-legend">
              <div class="legend-item"><span class="legend-swatch" style="background:var(--dusk)"></span>${year}</div>
              <div class="legend-item"><span class="legend-swatch" style="background:var(--mauve-shadow); width:8px; height:2px;"></span>${baseline}% goal</div>
            </div>
            <span class="chart-tag">10 Sections · RADAR</span>
          </div>
        </div>
        <div class="chart-body">
          <div class="radar-body">
            <svg viewBox="0 0 460 390" class="radar-svg">
              ${gridCircles}
              ${axes}
              ${scaleLabels}
              <path d="${pathFromPoints(ptsBench)}" fill="none" stroke="var(--mauve-shadow)" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.7"/>
              <path d="${pathFromPoints(ptsCurr)}" fill="var(--dusk)" fill-opacity="0.18" stroke="var(--dusk)" stroke-width="2"/>
              ${dots}
            </svg>
          </div>
          <div class="quadrant-help-trigger">
            <button class="help-btn help-btn-icon-only" data-help-modal="radar" type="button" aria-label="How to read this chart">
              <span class="help-icon">?</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderDiverging(baseline, year) {
    const goal = baseline / 100;
    // Sort by section letter A→J (not by gap anymore)
    const data = SECTIONS.slice().sort((a,b) => a.id.localeCompare(b.id)).map(s => {
      const pct = year === '2023' ? (s.pct2023 || 0) : s.pct2024;
      const has = year === '2023' ? (s.pct2023 != null) : s.hasData;
      return { ...s, pct, has, gap: has ? (pct - goal) * 100 : 0 };
    });

    const maxAbs = Math.max(20, ...data.map(d => Math.abs(d.gap)));
    const scale = 50 / maxAbs;

    const rows = data.map(s => {
      const w = Math.abs(s.gap) * scale;
      const dir = s.gap >= 0 ? 'pos' : 'neg';
      const cls = !s.hasData ? 'div-bar div-bar-na'
                : Math.abs(s.gap) < 0.5 ? 'div-bar div-bar-neutral'
                : (dir === 'pos' ? 'div-bar div-bar-pos' : 'div-bar div-bar-neg');
      const labelText = !s.hasData ? ''
                      : Math.abs(s.gap) < 0.5 ? 'at goal'
                      : (s.gap > 0 ? '+' + s.gap.toFixed(1) + 'pp' : s.gap.toFixed(1) + 'pp');
      const left = dir === 'pos' ? '50%' : (50 - w) + '%';
      const width = w + '%';
      const labelLeft = dir === 'pos' ? `${50 + w}%` : `${50 - w}%`;
      const labelTransform = dir === 'pos' ? 'translateX(4px)' : 'translateX(-4px) translateX(-100%)';
      const v = year === '2023' ? s.pct2023 : s.pct2024;
      const has = year === '2023' ? (s.pct2023 != null) : s.hasData;
      const pctText = has ? (v * 100).toFixed(1) + '%' : '—';
      return `
        <div class="div-row" data-section="${s.id}" data-name="${s.name}" data-pct="${pctText}" data-baseline="${baseline}%" data-gap="${labelText}">
          <div class="div-label"><span class="div-letter">${s.id}</span> ${s.name}</div>
          <div class="div-track">
            <div class="div-zero-line"></div>
            <div class="${cls}" style="left: ${left}; width: ${width};"></div>
            <div class="div-value-label" style="left: ${labelLeft}; transform: ${labelTransform};">${labelText}</div>
          </div>
        </div>
      `;
    }).join('');

    const axisMax = Math.ceil(maxAbs / 10) * 10;
    const ticks = [-axisMax, -Math.round(axisMax/2), 0, Math.round(axisMax/2), axisMax].map(t => {
      const left = 50 + t * scale;
      return `<span class="div-axis-tick" style="left: ${left}%;">${t === 0 ? '0' : (t > 0 ? '+' + t : t) + 'pp'}</span>`;
    }).join('');

    return `
      <div class="exec-card" data-help="diverging">
        <div class="chart-card-head">
          <div>
            <h3>Gap vs ${baseline}% Goal</h3>
            <p class="chart-sub">How many points each section is above or below the goal · ${year}</p>
          </div>
          <div class="chart-head-right">
            <div class="chart-legend">
              <div class="legend-item"><span class="legend-swatch" style="background:rgba(42,119,85,0.55)"></span>Above</div>
              <div class="legend-item"><span class="legend-swatch" style="background:rgba(178,59,42,0.55)"></span>Below</div>
            </div>
            <span class="chart-tag">Section · GAP</span>
          </div>
        </div>
        <div class="chart-body">
          <div class="div-body">
            ${rows}
            <div class="div-axis">
              <div class="div-axis-zero-label">${baseline}% GOAL</div>
              ${ticks}
            </div>
          </div>
          <div class="quadrant-help-trigger">
            <button class="help-btn help-btn-icon-only" data-help-modal="diverging" type="button" aria-label="How to read this chart">
              <span class="help-icon">?</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }


  // ==========================================================================
  // TREND ANALYSIS BLOCK — 3 visuals
  //   Op 4: Investment Trend (line chart with 2023, 2024 + projected 2025)
  //   Op 7: Slope Chart (YoY movement, lines colored vs baseline goal)
  //   Op 8: KPI Heatmap (per-section grid: YoY trend, vs Goal, growth)
  // ==========================================================================

  // ===== Investment totals for the trend chart =====
  // Sums Section A (clean_energy_spend) + B (ev_funding) + E (strategic_capital)
  function buildInvestmentTotals() {
    const ids = ['clean_energy_spend', 'ev_funding', 'strategic_capital'];
    let dac24 = 0, dac23 = 0, nondac24 = 0, nondac23 = 0;
    PAYLOAD.kpis.forEach(k => {
      if (!ids.includes(k.id)) return;
      if (k.y2024 && k.y2024.dac != null && k.y2024.total != null) {
        dac24 += k.y2024.dac;
        nondac24 += (k.y2024.total - k.y2024.dac);
      }
      if (k.y2023 && k.y2023.dac != null && k.y2023.total != null) {
        dac23 += k.y2023.dac;
        nondac23 += (k.y2023.total - k.y2023.dac);
      }
    });
    return { dac23, dac24, nondac23, nondac24 };
  }

  // ===== Op 4: Investment Trend (line chart) =====
  function renderInvestmentTrend(year) {
    const t = buildInvestmentTotals();
    // Linear projection for 2025 = 2024 + (2024 - 2023)
    const dacProj   = t.dac24   + (t.dac24   - t.dac23);
    const nondacProj= t.nondac24+ (t.nondac24- t.nondac23);

    const W = 560, H = 270;
    const padL = 64, padR = 30, padT = 28, padB = 36;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const years = [2023, 2024, 2025];
    // y axis range: round up max
    const allVals = [t.dac23, t.dac24, dacProj, t.nondac23, t.nondac24, nondacProj];
    const rawMax = Math.max(...allVals);
    const niceMax = Math.ceil(rawMax / 100e6) * 100e6;     // round to nearest 100M
    const niceMin = 0;

    const xFor = (i) => padL + (i / (years.length - 1)) * innerW;
    const yFor = (v) => padT + innerH - ((v - niceMin) / (niceMax - niceMin)) * innerH;

    const fmt = v => {
      if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
      if (v >= 1e6) return '$' + Math.round(v / 1e6) + 'M';
      return '$' + Math.round(v / 1e3) + 'K';
    };

    // Y-axis grid lines (5 levels)
    let grid = '';
    for (let i = 0; i <= 5; i++) {
      const v = niceMin + (i / 5) * (niceMax - niceMin);
      const y = yFor(v);
      grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width="0.5" stroke-dasharray="2 3"/>`;
      grid += `<text x="${padL - 8}" y="${(y + 3).toFixed(1)}" font-size="10" fill="var(--text-3)" text-anchor="end" font-family="Inter">${fmt(v)}</text>`;
    }

    // X-axis labels
    let xlabels = '';
    years.forEach((y, i) => {
      const x = xFor(i);
      const isProj = (y === 2025);
      xlabels += `<text x="${x.toFixed(1)}" y="${H - 12}" font-size="11" font-weight="${isProj ? 600 : 700}" fill="${isProj ? 'var(--text-3)' : 'var(--text-2)'}" text-anchor="middle" font-family="Inter">${y}${isProj ? ' · projected' : ''}</text>`;
    });

    // DAC line: solid 2023→2024, dashed 2024→2025
    const dacVals = [t.dac23, t.dac24, dacProj];
    const nonDacVals = [t.nondac23, t.nondac24, nondacProj];

    const buildPath = (vals, sliceStart, sliceEnd) => {
      let p = '';
      for (let i = sliceStart; i <= sliceEnd; i++) {
        const x = xFor(i).toFixed(1);
        const y = yFor(vals[i]).toFixed(1);
        p += (i === sliceStart ? `M ${x},${y}` : ` L ${x},${y}`);
      }
      return p;
    };

    // Solid segment (2023→2024) + dashed segment (2024→2025)
    const dacSolid    = buildPath(dacVals, 0, 1);
    const dacDashed   = buildPath(dacVals, 1, 2);
    const nondacSolid = buildPath(nonDacVals, 0, 1);
    const nondacDashed= buildPath(nonDacVals, 1, 2);

    // Dots
    const dots = (vals, color, isFinalProj) => vals.map((v, i) => {
      const x = xFor(i).toFixed(1);
      const y = yFor(v).toFixed(1);
      const isProj = (i === 2);
      return `<circle cx="${x}" cy="${y}" r="${isProj ? 5 : 5.5}" fill="${isProj ? 'var(--white)' : color}" stroke="${color}" stroke-width="${isProj ? 2 : 1.5}"/>`;
    }).join('');

    // Value labels above dots (only for 2024 actual & 2025 projected)
    const valueLabels = [
      { x: xFor(0), y: yFor(t.dac23) - 12,    text: fmt(t.dac23),    color: 'var(--dusk)', anchor: 'middle' },
      { x: xFor(1), y: yFor(t.dac24) - 12,    text: fmt(t.dac24),    color: 'var(--dusk)', anchor: 'middle' },
      { x: xFor(2), y: yFor(dacProj) - 12,    text: fmt(dacProj) + ' (proj.)',  color: 'var(--dusk)', anchor: 'end' },
      { x: xFor(0), y: yFor(t.nondac23) + 18, text: fmt(t.nondac23), color: 'var(--mauve-shadow)', anchor: 'middle' },
      { x: xFor(1), y: yFor(t.nondac24) + 18, text: fmt(t.nondac24), color: 'var(--mauve-shadow)', anchor: 'middle' },
      { x: xFor(2), y: yFor(nondacProj) + 18, text: fmt(nondacProj) + ' (proj.)',color: 'var(--mauve-shadow)', anchor: 'end' }
    ].map(l => `<text x="${l.x.toFixed(1)}" y="${l.y.toFixed(1)}" font-size="10" font-weight="700" fill="${l.color}" text-anchor="${l.anchor}" font-family="Inter">${l.text}</text>`).join('');

    // YoY annotations
    const dacGrowth = ((t.dac24 - t.dac23) / t.dac23 * 100).toFixed(1);
    const nondacGrowth = ((t.nondac24 - t.nondac23) / t.nondac23 * 100).toFixed(1);

    return `
      <div class="exec-card" data-help="trend-line">
        <div class="chart-card-head">
          <div>
            <h3>Investment Trend · DAC vs Non-DAC</h3>
            <p class="chart-sub">Total across Sections A + B + E · Solid = actuals · Dashed = projection</p>
          </div>
          <div class="chart-head-right">
            <div class="chart-legend">
              <div class="legend-item"><span class="legend-swatch" style="background:var(--dusk)"></span>DAC</div>
              <div class="legend-item"><span class="legend-swatch" style="background:var(--mauve-shadow)"></span>Non-DAC</div>
              <div class="legend-item"><span class="legend-swatch" style="background:transparent; border: 1px dashed var(--text-3); width:14px; height:1px;"></span>Projected</div>
            </div>
            <span class="chart-tag">A + B + E · TREND</span>
          </div>
        </div>
        <div class="chart-body">
          <div class="trend-svg-wrap">
            <svg viewBox="0 0 ${W} ${H}" class="trend-svg" preserveAspectRatio="xMidYMid meet">
              ${grid}
              <path d="${nondacSolid}"  fill="none" stroke="var(--mauve-shadow)" stroke-width="2.5"/>
              <path d="${nondacDashed}" fill="none" stroke="var(--mauve-shadow)" stroke-width="2.5" stroke-dasharray="6 4" opacity="0.7"/>
              <path d="${dacSolid}"     fill="none" stroke="var(--dusk)"         stroke-width="2.5"/>
              <path d="${dacDashed}"    fill="none" stroke="var(--dusk)"         stroke-width="2.5" stroke-dasharray="6 4" opacity="0.7"/>
              ${dots(dacVals, 'var(--dusk)', true)}
              ${dots(nonDacVals, 'var(--mauve-shadow)', true)}
              ${valueLabels}
              ${xlabels}
            </svg>
          </div>
          <div class="trend-meta">
            <div class="trend-meta-row">
              <span class="trend-meta-dot" style="background:var(--dusk);"></span>
              <span class="trend-meta-label">DAC YoY 2023→2024</span>
              <span class="trend-meta-val" style="color:${dacGrowth >= 0 ? 'var(--green)' : 'var(--red)'};">${dacGrowth >= 0 ? '+' : ''}${dacGrowth}%</span>
            </div>
            <div class="trend-meta-row">
              <span class="trend-meta-dot" style="background:var(--mauve-shadow);"></span>
              <span class="trend-meta-label">Non-DAC YoY 2023→2024</span>
              <span class="trend-meta-val" style="color:${nondacGrowth >= 0 ? 'var(--green)' : 'var(--red)'};">${nondacGrowth >= 0 ? '+' : ''}${nondacGrowth}%</span>
            </div>
          </div>
          <div class="quadrant-help-trigger">
            <button class="help-btn help-btn-icon-only" data-help-modal="trend-line" type="button" aria-label="How to read this chart">
              <span class="help-icon">?</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ===== Op 7: Slope Chart =====
  function renderSlopeChart(baseline, year) {
    const goal = baseline / 100;
    // Slope chart needs 2 years. Only meaningful when year='2024' (we have 2023 baseline)
    const hasBaseline = (year === '2024');
    const prevLabel = hasBaseline ? '2023' : '2022';
    // Build per-section data, sorted A→J
    const data = SECTIONS.filter(s => s.hasData && s.pct2023 != null)
      .slice().sort((a,b) => a.id.localeCompare(b.id))
      .map(s => ({
        id: s.id, name: s.name,
        p23: s.pct2023, p24: s.pct2024,
        delta: s.pct2024 - s.pct2023,
        meets24: s.pct2024 >= goal,
        meets23: s.pct2023 >= goal
      }));

    // If we are in single-year mode, return a placeholder card
    if (!hasBaseline) {
      return `
        <div class="exec-card" data-help="slope">
          <div class="chart-card-head">
            <div>
              <h3>YoY Movement · ${prevLabel} → ${year}</h3>
              <p class="chart-sub">Slope chart needs 2 years · No ${prevLabel} baseline available</p>
            </div>
            <div class="chart-head-right">
              <span class="chart-tag">10 Sections · SLOPE</span>
            </div>
          </div>
          <div class="chart-body">
            <div class="exec-no-baseline">
              <strong>No ${prevLabel} baseline yet</strong>
              <span>This visual needs two consecutive years to draw the slope. It will activate once ${prevLabel} data is loaded.</span>
            </div>
            <div class="quadrant-help-trigger">
              <button class="help-btn help-btn-icon-only" data-help-modal="slope" type="button" aria-label="How to read this chart">
                <span class="help-icon">?</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }


    const W = 560, H = 360;
    const padL = 130, padR = 80, padT = 28, padB = 32;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const allPcts = data.flatMap(d => [d.p23, d.p24, goal]);
    const yMin = Math.max(0, Math.min(...allPcts) - 0.05);
    const yMax = Math.min(1, Math.max(...allPcts) + 0.05);

    const yFor = (p) => padT + innerH - ((p - yMin) / (yMax - yMin)) * innerH;
    const xLeft = padL, xRight = padL + innerW;

    // Headers (years)
    const header = `
      <text x="${xLeft}"  y="${padT - 8}" font-size="11" font-weight="700" fill="var(--text-3)" text-anchor="middle" font-family="Inter">2023</text>
      <text x="${xRight}" y="${padT - 8}" font-size="11" font-weight="700" fill="var(--text-3)" text-anchor="middle" font-family="Inter">2024</text>
    `;

    // Vertical anchor lines for the two years
    const anchors = `
      <line x1="${xLeft}"  y1="${padT}" x2="${xLeft}"  y2="${padT + innerH}" stroke="var(--text-4)" stroke-width="1"/>
      <line x1="${xRight}" y1="${padT}" x2="${xRight}" y2="${padT + innerH}" stroke="var(--text-4)" stroke-width="1"/>
    `;

    // Goal reference line (dashed) at goal % across the whole chart
    const goalY = yFor(goal);
    const goalLine = `
      <line x1="${padL - 20}" y1="${goalY.toFixed(1)}" x2="${xRight + 20}" y2="${goalY.toFixed(1)}"
            stroke="var(--mauve-shadow)" stroke-width="1" stroke-dasharray="3 4" opacity="0.7"/>
      <text x="${xRight + 24}" y="${(goalY + 3).toFixed(1)}" font-size="10" font-weight="700" fill="var(--mauve-shadow)" font-family="Inter">${baseline}% goal</text>
    `;

    // For each section: line + 2 dots + 2 labels
    const lines = data.map(d => {
      const y23 = yFor(d.p23);
      const y24 = yFor(d.p24);
      let color, status;
      if (d.delta > 0.005)      { color = 'var(--green)';        status = 'improving'; }
      else if (d.delta < -0.005){ color = 'var(--red)';          status = 'declining'; }
      else                      { color = 'var(--text-4)';       status = 'stable';    }
      const labelLeft = `<text x="${xLeft - 8}" y="${(y23 + 3).toFixed(1)}" font-size="10" font-weight="600" fill="var(--text-2)" text-anchor="end" font-family="Inter">${d.name} ${(d.p23 * 100).toFixed(1)}%</text>`;
      const labelRight= `<text x="${xRight + 8}" y="${(y24 + 3).toFixed(1)}" font-size="10" font-weight="700" fill="${color}" text-anchor="start" font-family="Inter">${(d.p24 * 100).toFixed(1)}%</text>`;
      return `
        <line x1="${xLeft}" y1="${y23.toFixed(1)}" x2="${xRight}" y2="${y24.toFixed(1)}" stroke="${color}" stroke-width="1.6" opacity="0.85"/>
        <circle cx="${xLeft}"  cy="${y23.toFixed(1)}" r="3.5" fill="${color}"/>
        <circle cx="${xRight}" cy="${y24.toFixed(1)}" r="3.5" fill="${color}"/>
        ${labelLeft}
        ${labelRight}
      `;
    }).join('');

    // Counts for the summary
    const improving = data.filter(d => d.delta > 0.005).length;
    const stable    = data.filter(d => Math.abs(d.delta) <= 0.005).length;
    const declining = data.filter(d => d.delta < -0.005).length;

    return `
      <div class="exec-card" data-help="slope">
        <div class="chart-card-head">
          <div>
            <h3>YoY Movement · 2023 → 2024</h3>
            <p class="chart-sub">Each line = one section · Slope up = improving · ${baseline}% goal as dashed reference</p>
          </div>
          <div class="chart-head-right">
            <div class="chart-legend">
              <div class="legend-item"><span class="legend-swatch" style="background:var(--green)"></span>↑ ${improving}</div>
              <div class="legend-item"><span class="legend-swatch" style="background:var(--text-4)"></span>= ${stable}</div>
              <div class="legend-item"><span class="legend-swatch" style="background:var(--red)"></span>↓ ${declining}</div>
            </div>
            <span class="chart-tag">10 Sections · SLOPE</span>
          </div>
        </div>
        <div class="chart-body">
          <div class="slope-svg-wrap">
            <svg viewBox="0 0 ${W} ${H}" class="slope-svg" preserveAspectRatio="xMidYMid meet">
              ${anchors}
              ${header}
              ${goalLine}
              ${lines}
            </svg>
          </div>
          <div class="quadrant-help-trigger">
            <button class="help-btn help-btn-icon-only" data-help-modal="slope" type="button" aria-label="How to read this chart">
              <span class="help-icon">?</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ===== Op 8: KPI Heatmap (without DAC % column) =====
  function renderKpiHeatmap(baseline, year) {
    const goal = baseline / 100;
    const rows = SECTIONS.slice().sort((a,b) => a.id.localeCompare(b.id)).map(s => {
      // YoY pp delta
      const hasYoy = s.pct2023 != null && s.hasData;
      const yoyPp = hasYoy ? (s.pct2024 - s.pct2023) * 100 : null;

      // vs Goal: above / at / near (within 5pp) / below
      let vsGoal, vsGoalCls;
      if (!s.hasData) { vsGoal = '—'; vsGoalCls = 'hm-na'; }
      else {
        const gap = (s.pct2024 - goal) * 100;
        if (Math.abs(gap) < 0.5) { vsGoal = 'At goal'; vsGoalCls = 'hm-at'; }
        else if (gap > 0)        { vsGoal = 'Above';   vsGoalCls = 'hm-above'; }
        else if (gap > -5)       { vsGoal = 'Near';    vsGoalCls = 'hm-near'; }
        else                     { vsGoal = 'Below';   vsGoalCls = 'hm-below'; }
      }
      // Section F is inverted (lower DAC % is better)
      if (s.id === 'F' && s.hasData) {
        const gap = (s.pct2024 - goal) * 100;
        if (gap > 5)        { vsGoal = 'Critical'; vsGoalCls = 'hm-below'; }
        else if (gap > 0)   { vsGoal = 'Monitor';  vsGoalCls = 'hm-near';  }
        else                { vsGoal = 'OK';       vsGoalCls = 'hm-above'; }
      }

      // Growth (relative change in DAC dollars or absolute share, depending on data)
      // We use relative change in the DAC share itself if YoY is positive, else raw delta
      let growth = null;
      if (hasYoy && s.pct2023 > 0) {
        growth = ((s.pct2024 - s.pct2023) / s.pct2023) * 100;
      }

      // YoY pp cell
      const yoyText = !hasYoy ? '—'
                    : (yoyPp >= 0 ? '+' : '') + yoyPp.toFixed(1) + 'pp';
      let yoyCls = 'hm-na';
      if (hasYoy) {
        if (s.id === 'F') {  // inverted
          yoyCls = yoyPp < -0.5 ? 'hm-above' : (yoyPp > 0.5 ? 'hm-below' : 'hm-at');
        } else {
          yoyCls = yoyPp > 0.5 ? 'hm-above' : (yoyPp < -0.5 ? 'hm-below' : 'hm-at');
        }
      }

      // Growth cell
      const growthText = growth == null ? '—'
                       : (growth >= 0 ? '+' : '') + growth.toFixed(1) + '%';
      let growthCls = 'hm-na';
      if (growth != null) {
        if (s.id === 'F') {
          growthCls = growth < -1 ? 'hm-above' : (growth > 1 ? 'hm-below' : 'hm-at');
        } else {
          growthCls = growth > 1 ? 'hm-above' : (growth < -1 ? 'hm-below' : 'hm-at');
        }
      }

      return `
        <div class="hm-row">
          <div class="hm-label">${s.name}</div>
          <div class="hm-cell ${yoyCls}">${yoyText}</div>
          <div class="hm-cell ${vsGoalCls}">${vsGoal}</div>
          <div class="hm-cell ${growthCls}">${growthText}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="exec-card" data-help="heatmap">
        <div class="chart-card-head">
          <div>
            <h3>KPI Heatmap · ${baseline}% Goal Compliance</h3>
            <p class="chart-sub">Three signals per section · Color intensity = distance from the goal</p>
          </div>
          <div class="chart-head-right">
            <div class="chart-legend hm-legend-top">
              <div class="legend-item"><span class="legend-swatch hm-sw-below"></span>Critical</div>
              <div class="legend-item"><span class="legend-swatch hm-sw-near"></span>Monitor</div>
              <div class="legend-item"><span class="legend-swatch hm-sw-at"></span>At goal</div>
              <div class="legend-item"><span class="legend-swatch hm-sw-above"></span>Above</div>
            </div>
            <span class="chart-tag">10 Sections · HEATMAP</span>
          </div>
        </div>
        <div class="chart-body">
          <div class="hm-table">
            <div class="hm-row hm-header">
              <div class="hm-label-head">Section</div>
              <div class="hm-cell-head">YoY trend</div>
              <div class="hm-cell-head">vs Goal</div>
              <div class="hm-cell-head">2023→2024</div>
            </div>
            ${rows}
          </div>
          <div class="quadrant-help-trigger">
            <button class="help-btn help-btn-icon-only" data-help-modal="heatmap" type="button" aria-label="How to read this chart">
              <span class="help-icon">?</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ===== Render the full Trend Analysis block =====
  function renderTrendAnalysis(baseline) {
    const trendsGrid = document.getElementById('exec-trends-grid');
    if (!trendsGrid) return;
    if (!trendsGrid.classList.contains('exec-shares-grid')) {
      trendsGrid.classList.add('exec-shares-grid');
    }
    const yr = state.year;
    trendsGrid.innerHTML = `
      ${renderInvestmentTrend(yr)}
      ${renderSlopeChart(baseline, yr)}
      ${renderKpiHeatmap(baseline, yr)}
    `;
  }

  function renderBlock() {
    const toggleMount = document.getElementById('exec-toggle-mount');
    const sharesGrid  = document.getElementById('exec-shares-grid');
    if (!toggleMount || !sharesGrid) return;
    const baseline = getBaseline();
    toggleMount.innerHTML = renderToggleBar();
    // Make sure the grid container has the layout class
    if (!sharesGrid.classList.contains('exec-shares-grid')) {
      sharesGrid.classList.add('exec-shares-grid');
    }
    // Apply 4-col layout class for the new layout
    if (!sharesGrid.classList.contains('exec-shares-grid-4')) {
      sharesGrid.classList.add('exec-shares-grid-4');
    }
    const yr = state.year;
    sharesGrid.innerHTML = `
      ${renderStrip(baseline, yr)}
      ${renderDumbbell(baseline, yr)}
      ${renderRadar(baseline, yr)}
      ${renderDiverging(baseline, yr)}
    `;
    // Render the Trend Analysis block (Op 4 + Op 7 + Op 8)
    renderTrendAnalysis(baseline);
    wireToggle();
    wireTooltips();
    wireHelpButtons();
  }

  function wireToggle() {
    document.querySelectorAll('.exec-toggle-bar .rkpi-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const newBase = parseInt(btn.dataset.baseline, 10);
        if (newBase !== getBaseline()) {
          setBaseline(newBase);
          renderBlock();
        }
      });
    });
  }

  function ensureTooltip() {
    let tip = document.querySelector('.exec-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'exec-tooltip';
      document.body.appendChild(tip);
    }
    return tip;
  }

  function wireTooltips() {
    const tip = ensureTooltip();
    const targets = document.querySelectorAll('.strip-row[data-section], .div-row[data-section], .radar-dot[data-section]');
    targets.forEach(el => {
      el.addEventListener('mouseenter', () => {
        const id = el.getAttribute('data-section');
        const name = el.getAttribute('data-name');
        const pct = el.getAttribute('data-pct');
        const bl = el.getAttribute('data-baseline');
        const gap = el.getAttribute('data-gap');
        let html = `<div class="tt-name">Section ${id} · ${name}</div>`;
        html += `<div class="tt-row"><span>DAC share</span><span class="v">${pct}</span></div>`;
        html += `<div class="tt-row"><span>Goal</span><span class="v">${bl}</span></div>`;
        if (gap) html += `<div class="tt-row"><span>Gap</span><span class="v">${gap}</span></div>`;
        tip.innerHTML = html;
        tip.style.opacity = '1';
      });
      el.addEventListener('mousemove', e => {
        tip.style.left = (e.pageX + 14) + 'px';
        tip.style.top = (e.pageY - 8) + 'px';
      });
      el.addEventListener('mouseleave', () => {
        tip.style.opacity = '0';
      });
    });
  }

  // Track if delegation is wired (only once)
  let helpDelegationWired = false;
  function wireHelpButtons() {
    if (helpDelegationWired) return;
    helpDelegationWired = true;
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.help-btn[data-help-modal]');
      if (!btn) return;
      // Only handle clicks within the exec shares block
      if (!btn.closest('#exec-shares-block')) return;
      e.preventDefault();
      e.stopPropagation();
      ((btn) => {
        const which = btn.dataset.helpModal;
        const baseline = getBaseline();
        let title, body;

        if (which === 'dumbbell') {
          title = 'How to read · DAC Equity YoY Movement';
          body = `
            <div class="exec-help-content">
              <p>Each row is one section. The <strong>gray dot</strong> is the prior year's DAC share, the <strong>blue dot</strong> is the current year's, and the line connecting them visualizes how much the section moved year-over-year.</p>
              <p>The <strong>blue tick</strong> marks the ${baseline}% Climate Act benchmark. Dots to the right of the tick exceed the benchmark; dots to the left fall short. The pill on the far right shows the year-over-year change in percentage points — green for improving, red for declining, gray for essentially stable (within ±0.5pp).</p>
              <p class="exec-help-note">For Section F (Outages), the color logic flips: a smaller DAC share is better, so a leftward movement shows as green. Section I (Jobs) appears as N/A because the source report doesn't break out DAC participation.</p>
            </div>
          `;
        } else if (which === 'trend-line') {
          title = 'How to read · Investment Trend';
          body = `
            <div class="exec-help-content">
              <p>This chart sums total investment across three sections: <strong>Section A (Clean Energy Spending)</strong>, <strong>Section B (EV Make-Ready)</strong>, and <strong>Section E (Strategic Capital)</strong>. The blue line tracks the dollars reaching Disadvantaged Communities; the mauve line tracks Non-DAC dollars.</p>
              <p>Solid segments are <strong>actuals</strong> (2023, 2024). The dashed continuation is a <strong>linear projection for 2025</strong> based on the 2023→2024 movement — it is shown only to give a directional sense of where the trend is heading and will be replaced with real data once the 2025 report is filed.</p>
              <p class="exec-help-note">A divergence between the two lines tells the equity story most clearly: when the blue line grows faster than the mauve, the gap is closing in DACs' favor.</p>
            </div>
          `;
        } else if (which === 'slope') {
          title = 'How to read · YoY Movement Slope';
          body = `
            <div class="exec-help-content">
              <p>Each line connects one section's DAC share in 2023 (left) to the same section's DAC share in 2024 (right). The <strong>slope of the line</strong> is the year-over-year movement: lines going up mean DAC equity is improving in that section; lines going down mean equity is regressing.</p>
              <p>Lines are colored by direction: <span style="color:var(--green); font-weight:700;">green</span> for improving, <span style="color:var(--text-3); font-weight:700;">gray</span> for stable, <span style="color:var(--red); font-weight:700;">red</span> for declining. The horizontal dashed line marks the <strong>${baseline}% Climate Act benchmark</strong>; lines that cross above it are at or beyond the goal.</p>
              <p class="exec-help-note">This is the fastest way to spot which sections changed the most year over year, and whether that change is taking them toward or away from the Climate Act target.</p>
            </div>
          `;
        } else if (which === 'heatmap') {
          title = 'How to read · KPI Heatmap';
          body = `
            <div class="exec-help-content">
              <p>Each row is one of the ten sections. Three signals are shown side by side: <strong>YoY trend</strong> (the change in DAC share in percentage points from 2023 to 2024), <strong>vs Goal</strong> (where this year's DAC share stands relative to the ${baseline}% Climate Act benchmark), and <strong>2023→2024</strong> (the relative growth in the DAC share itself).</p>
              <p>Cell color intensity tells you the urgency: <span style="color:var(--red); font-weight:700;">red</span> = critical or far below goal, <span style="color:#C97A3A; font-weight:700;">amber</span> = needs monitoring, <span style="color:var(--green); font-weight:700;">light green</span> = at or just above goal, <span style="color:var(--green); font-weight:700;">dark green</span> = clearly exceeding goal.</p>
              <p class="exec-help-note">Section F (Outages) is inverted — lower DAC share is better — so its color logic flips: a high DAC share of outages is treated as "critical", not "above goal".</p>
            </div>
          `;
        } else if (which === 'strip') {
          title = 'How to read · DAC Equity by Section';
          body = `
            <div class="exec-help-content">
              <p>Each row is one of the ten reporting sections (A through J). The <strong>blue fill</strong> shows the share of that section's primary metric that reached Disadvantaged Communities in 2024. Bars closer to the right edge mean a larger DAC share.</p>
              <p>The vertical <strong>blue tick</strong> marks the <strong>${baseline}% Climate Act benchmark</strong>. Reading the chart is straightforward: bars that pass the tick are exceeding the benchmark; bars that fall short of it are below it.</p>
              <p class="exec-help-note">Section F (Outages) is shown in mauve rather than blue because in this case a higher DAC share is <em>worse</em>, not better — DACs are bearing more of the outage burden.</p>
            </div>
          `;
        } else if (which === 'radar') {
          title = 'How to read · Equity Radar · 360° Profile';
          body = `
            <div class="exec-help-content">
              <p>Each axis radiating from the center represents one of the ten sections. The distance from the center to a vertex is that section's DAC share — the outer ring is <strong>70%</strong>, the inner ring is <strong>10%</strong>.</p>
              <p>The <strong>solid blue polygon</strong> traces 2024 performance across all ten sections at once. The <strong>dashed inner ring</strong> shows the <strong>${baseline}% Climate Act benchmark</strong>. Wherever the polygon extends beyond the dashed ring, that section is meeting or exceeding the benchmark; wherever it falls inside, that section is below it.</p>
              <p class="exec-help-note">A balanced (regular) shape means equity is consistent across sections. A "spike" or "dent" reveals where one section is significantly over- or under-performing relative to the rest.</p>
            </div>
          `;
        } else {
          title = 'How to read · Gap vs Goal';
          body = `
            <div class="exec-help-content">
              <p>The vertical line at the center represents the <strong>${baseline}% Climate Act benchmark</strong>. Each bar shows how many percentage points (pp) a section is above or below that benchmark in 2024.</p>
              <p>Bars extending to the <strong>right</strong> indicate sections exceeding the benchmark; the further right, the larger the over-performance. Bars extending to the <strong>left</strong> indicate sections below it. Sections essentially at the benchmark (within ±0.5pp) appear as a small dot at the center.</p>
              <p class="exec-help-note">Sections are sorted from the largest positive gap at the top to the largest negative gap at the bottom — making it instantly clear which sections are leading the equity story and which need attention.</p>
            </div>
          `;
        }

        const modal = document.createElement('div');
        modal.className = 'help-modal-overlay';
        modal.innerHTML = `
          <div class="help-modal" role="dialog" aria-labelledby="help-modal-title">
            <div class="help-modal-head">
              <h3 id="help-modal-title">${title}</h3>
              <button class="help-modal-close" type="button" aria-label="Close">×</button>
            </div>
            <div class="help-modal-body">${body}</div>
          </div>`;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.addEventListener('click', e => { if (e.target === modal) close(); });
        modal.querySelector('.help-modal-close').addEventListener('click', close);
        document.addEventListener('keydown', function esc(e) {
          if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
        });
      })(btn);
    });
  }

  function init() {
    // Wire the topbar year dropdown so visuals re-render on change
    const yrSel = document.getElementById('year-select');
    if (yrSel) {
      state.year = yrSel.value || '2024';
      yrSel.addEventListener('change', e => {
        state.year = e.target.value;
        renderBlock();
      });
    }
    renderBlock();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();