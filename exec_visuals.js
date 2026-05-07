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

  function renderStrip(baseline) {
    const rows = SECTIONS.map(s => {
      const pctNum = s.pct2024 * 100;
      const pctText = s.hasData ? pctNum.toFixed(1) + '%' : '—';
      const dacWidth = s.hasData ? pctNum : 0;
      const fillCls = s.isWarn ? 'strip-fill strip-fill-warn' : 'strip-fill';
      const naLabel = !s.hasData ? '<span class="strip-empty-label">N/A</span>' : '';
      const tooltipData = `data-section="${s.id}" data-name="${s.name}" data-pct="${pctText}" data-baseline="${baseline}%"`;
      return `
        <div class="strip-row" ${tooltipData}>
          <div class="strip-label"><span class="strip-letter">${s.id}</span> ${s.name}</div>
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
            <p class="chart-sub">Each bar = DAC share for one of 10 sections · Tick marks the ${baseline}% goal</p>
          </div>
          <span class="chart-tag">Section · STRIP</span>
        </div>
        <div class="chart-body">
          <div class="chart-legend">
            <div class="legend-item"><span class="legend-swatch" style="background:var(--dusk)"></span>DAC</div>
            <div class="legend-item"><span class="legend-swatch" style="background:var(--pale-sky)"></span>Non-DAC</div>
            <div class="legend-item"><span class="legend-swatch" style="background:#2873BA; width:2px;"></span>${baseline}% goal</div>
          </div>
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

  function renderRadar(baseline) {
    const N = SECTIONS.length;
    const cx = 230, cy = 195, R = 130;
    const max = 0.7;

    const pts2024 = SECTIONS.map((s, i) => {
      const angle = (Math.PI * 2 * i / N) - Math.PI / 2;
      const r = (s.pct2024 / max) * R;
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

    const dots = pts2024.map((p, i) => {
      const s = SECTIONS[i];
      const pctText = s.hasData ? (s.pct2024 * 100).toFixed(1) + '%' : '—';
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
            <p class="chart-sub">Each axis = one section · Outer = 70% · Dashed line = ${baseline}% goal</p>
          </div>
          <span class="chart-tag">10 Sections · RADAR</span>
        </div>
        <div class="chart-body">
          <div class="chart-legend">
            <div class="legend-item"><span class="legend-swatch" style="background:var(--dusk)"></span>2024</div>
            <div class="legend-item"><span class="legend-swatch" style="background:var(--mauve-shadow); width:8px; height:2px;"></span>${baseline}% goal</div>
          </div>
          <div class="radar-body">
            <svg viewBox="0 0 460 390" class="radar-svg">
              ${gridCircles}
              ${axes}
              ${scaleLabels}
              <path d="${pathFromPoints(ptsBench)}" fill="none" stroke="var(--mauve-shadow)" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.7"/>
              <path d="${pathFromPoints(pts2024)}" fill="var(--dusk)" fill-opacity="0.18" stroke="var(--dusk)" stroke-width="2"/>
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

  function renderDiverging(baseline) {
    const goal = baseline / 100;
    const data = SECTIONS.map(s => ({
      ...s,
      gap: (s.pct2024 - goal) * 100
    })).sort((a, b) => b.gap - a.gap);

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
      const pctText = s.hasData ? (s.pct2024 * 100).toFixed(1) + '%' : '—';
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
            <p class="chart-sub">How many points each section is above (green) or below (red) the goal</p>
          </div>
          <span class="chart-tag">Section · GAP</span>
        </div>
        <div class="chart-body">
          <div class="chart-legend">
            <div class="legend-item"><span class="legend-swatch" style="background:rgba(42,119,85,0.55)"></span>Above goal</div>
            <div class="legend-item"><span class="legend-swatch" style="background:rgba(178,59,42,0.55)"></span>Below goal</div>
          </div>
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

  function renderBlock() {
    const block = document.getElementById('exec-shares-block');
    if (!block) return;
    const baseline = getBaseline();
    block.innerHTML = `
      ${renderToggleBar()}
      <div class="exec-shares-grid">
        ${renderStrip(baseline)}
        ${renderRadar(baseline)}
        ${renderDiverging(baseline)}
      </div>
    `;
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

        if (which === 'strip') {
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

  function init() { renderBlock(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();