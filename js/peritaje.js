/* ═══════════════════════════════════════════════════════════════
   NEIFERT CRM — js/peritaje.js
   Módulo: Peritaje de vehículos (formulario A-E + carrocería)
   ═══════════════════════════════════════════════════════════════ */

let selectedCarId = null;

function getCarIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || null;
}

/* ── Paneles de carrocería ── */
const PANELES = [
  ['capo',          'Capó'],
  ['techo',         'Techo'],
  ['baul',          'Baúl'],
  ['paraDelant',    'Paragolpes del.'],
  ['paraTras',      'Paragolpes tras.'],
  ['puertaDelIzq',  'Puerta del. izq.'],
  ['puertaDelDer',  'Puerta del. der.'],
  ['puertaTrasIzq', 'Puerta tras. izq.'],
  ['puertaTrasDer', 'Puerta tras. der.'],
  ['gdaDelIzq',     'Gda. del. izq.'],
  ['gdaDelDer',     'Gda. del. der.'],
  ['gdaTrasIzq',    'Gda. tras. izq.'],
  ['gdaTrasDer',    'Gda. tras. der.'],
  ['espejoIzq',     'Espejo izq.'],
  ['espejoDer',     'Espejo der.'],
];
const DAÑOS_PANEL = ['', 'ok', 'O', 'MB', 'RP', 'CH', 'RY', 'PC', 'RJ'];

/* ══════════════════════════════════════════════════════════════
   CARROCERÍA SVG — Funciones globales
   (No hay ningún <script> dentro del innerHTML, así evitamos
    el problema de que innerHTML no ejecuta scripts)
   ══════════════════════════════════════════════════════════════ */

const CARRO_COLORES = {
  MB: '#639922', RP: '#378ADD', CH: '#E24B4A',
  RY: '#EF9F27', PC: '#7F77DD', RJ: '#D4537E',
};

const CARRO_PANEL_MAP = {
  'Capó':'capo', 'Techo':'techo', 'Baúl':'baul',
  'Paragolpes del.':'paraDelant', 'Paragolpes tras.':'paraTras',
  'Puerta del. izq.':'puertaDelIzq', 'Puerta del. der.':'puertaDelDer',
  'Puerta tras. izq.':'puertaTrasIzq', 'Puerta tras. der.':'puertaTrasDer',
  'Gda. del. izq.':'gdaDelIzq', 'Gda. del. der.':'gdaDelDer',
  'Gda. tras. izq.':'gdaTrasIzq', 'Gda. tras. der.':'gdaTrasDer',
  'Espejo izq.':'espejoIzq', 'Espejo der.':'espejoDer',
};

const CARRO_BTN_IDS = {
  'Capó':'chp-capo', 'Techo':'chp-techo', 'Baúl':'chp-baul',
  'Paragolpes del.':'chp-paraDelant', 'Paragolpes tras.':'chp-paraTras',
  'Puerta del. izq.':'chp-puertaDelIzq', 'Puerta del. der.':'chp-puertaDelDer',
  'Puerta tras. izq.':'chp-puertaTrasIzq', 'Puerta tras. der.':'chp-puertaTrasDer',
  'Gda. del. izq.':'chp-gdaDelIzq', 'Gda. del. der.':'chp-gdaDelDer',
  'Gda. tras. izq.':'chp-gdaTrasIzq', 'Gda. tras. der.':'chp-gdaTrasDer',
  'Espejo izq.':'chp-espejoIzq', 'Espejo der.':'chp-espejoDer',
};

let _carroData   = {};
let _carroCur    = null;
let _carroSelC   = null;
let _carroSelCol = null;

function _carroInyectarEstilos() {
  if (document.getElementById('carro-styles')) return;
  const st = document.createElement('style');
  st.id = 'carro-styles';
  st.textContent = `
    .carro-hp {
      position:absolute; cursor:pointer; border-radius:4px;
      border:1.5px solid transparent; background:rgba(128,128,128,0.06);
      transition:background .12s, border-color .12s;
      display:flex; align-items:center; justify-content:center;
      font-size:9px; font-weight:700; line-height:1.1;
      text-align:center; padding:1px; box-sizing:border-box;
    }
    .carro-hp:hover { background:rgba(128,128,128,0.22); border-color:rgba(200,200,200,.4); }
    .carro-opt {
      padding:8px 5px; border-radius:8px; font-size:12px;
      border:1.5px solid var(--border,#444); background:var(--bg2,#2a2a2a);
      cursor:pointer; text-align:center; color:var(--text,#eee); transition:all .12s;
    }
    .carro-opt:hover { border-color:rgba(200,200,200,.5); }
  `;
  document.head.appendChild(st);
}

function carroInit(p) {
  _carroData = {};
  PANELES.forEach(([k, label]) => {
    const kCap = k.charAt(0).toUpperCase() + k.slice(1);
    const d    = String(p['daño' + kCap] || '');
    const pct  = parseInt(p['pct' + kCap]) || 0;
    if (d && d !== '' && d !== 'ok') {
      _carroData[label] = { c: d, col: CARRO_COLORES[d] || '#888', pct: pct, obs: '' };
    }
  });
}

function _carroSync(panel) {
  const k = CARRO_PANEL_MAP[panel]; if (!k) return;
  const kCap = k.charAt(0).toUpperCase() + k.slice(1);
  const dEl  = document.getElementById('sv_daño' + kCap);
  const pEl  = document.getElementById('sv_pct'  + kCap);
  const d    = _carroData[panel];
  if (dEl) dEl.value = (d && d.c) ? d.c : '';
  if (pEl) pEl.value = (d && d.pct) ? d.pct : '';
}

function _carroUpdBtn(panel) {
  const btn = document.getElementById(CARRO_BTN_IDS[panel]); if (!btn) return;
  const d   = _carroData[panel];
  if (d && d.c) {
    btn.style.background  = d.col + '55';
    btn.style.borderColor = d.col;
    btn.style.color       = d.col;
    btn.textContent       = d.c + (d.pct ? ' ' + d.pct + '%' : '');
  } else {
    btn.style.background  = 'rgba(128,128,128,0.06)';
    btn.style.borderColor = 'transparent';
    btn.style.color       = 'transparent';
    btn.textContent       = '';
  }
}

function _carroUpdResumen() {
  const list = document.getElementById('carro-resumen-list');
  const sec  = document.getElementById('carro-resumen');
  if (!list || !sec) return;
  const ents = Object.entries(_carroData).filter(function(e) { return e[1].c; });
  if (!ents.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';
  list.innerHTML = ents.map(function(e) {
    var label = e[0], d = e[1];
    return '<span class="badge bg-red" style="font-size:11px;border:1px solid ' + d.col + '66;background:' + d.col + '22;color:' + d.col + '">'
      + label + ': ' + d.c + (d.pct ? ' ' + d.pct + '%' : '') + (d.obs ? ' — ' + d.obs : '') + '</span>';
  }).join('');
}

function carroRenderBtns() {
  Object.keys(CARRO_BTN_IDS).forEach(function(p) { _carroUpdBtn(p); });
  _carroUpdResumen();
}

function carroOpen(panel) {
  _carroCur    = panel;
  _carroSelC   = null;
  _carroSelCol = null;

  const overlay  = document.getElementById('carro-overlay');
  const titleEl  = document.getElementById('carro-modal-title');
  const pctEl    = document.getElementById('carro-pct');
  const obsEl    = document.getElementById('carro-obs');
  if (!overlay || !titleEl) return;

  titleEl.textContent = panel;
  pctEl.value = (_carroData[panel] && _carroData[panel].pct) || 0;
  obsEl.value = (_carroData[panel] && _carroData[panel].obs) || '';

  document.querySelectorAll('.carro-opt').forEach(function(b) {
    b.style.borderColor = ''; b.style.background = ''; b.style.color = '';
  });
  if (_carroData[panel] && _carroData[panel].c) {
    _carroSelC   = _carroData[panel].c;
    _carroSelCol = _carroData[panel].col;
    document.querySelectorAll('.carro-opt').forEach(function(b) {
      if (b.dataset.c === _carroSelC) {
        b.style.borderColor = _carroSelCol;
        b.style.background  = _carroSelCol + '33';
        b.style.color       = _carroSelCol;
      }
    });
  }
  overlay.style.display = 'flex';
}

function carroClose() {
  const ov = document.getElementById('carro-overlay');
  if (ov) ov.style.display = 'none';
  _carroCur = null;
}

function carroSelOpt(btn) {
  document.querySelectorAll('.carro-opt').forEach(function(b) {
    b.style.borderColor = ''; b.style.background = ''; b.style.color = '';
  });
  btn.style.borderColor = btn.dataset.col;
  btn.style.background  = btn.dataset.col + '33';
  btn.style.color       = btn.dataset.col;
  _carroSelC   = btn.dataset.c;
  _carroSelCol = btn.dataset.col;
}

function carroSave() {
  const panel = _carroCur; if (!panel) return;
  const pct   = parseInt(document.getElementById('carro-pct').value) || 0;
  const obs   = document.getElementById('carro-obs').value.trim();
  if (_carroSelC || pct || obs) {
    _carroData[panel] = { c: _carroSelC, col: _carroSelCol, pct: pct, obs: obs };
  } else {
    delete _carroData[panel];
  }
  _carroSync(panel);
  _carroUpdBtn(panel);
  _carroUpdResumen();
  carroClose();
}

function carroClear() {
  const panel = _carroCur; if (!panel) return;
  delete _carroData[panel];
  _carroSync(panel);
  _carroUpdBtn(panel);
  _carroUpdResumen();
  carroClose();
}

/* ── HTML del bloque SVG (cero script tags adentro) ── */
function rCarroceriaSVG(p) {
  _carroInyectarEstilos();
  carroInit(p);

  const hiddenInputs = PANELES.map(function(pair) {
    const k    = pair[0];
    const kCap = k.charAt(0).toUpperCase() + k.slice(1);
    return '<input type="hidden" name="daño' + kCap + '" id="sv_daño' + kCap + '" value="' + (p['daño' + kCap] || '') + '">'
         + '<input type="hidden" name="pct'  + kCap + '" id="sv_pct'  + kCap + '" value="' + (p['pct'  + kCap] || '') + '">';
  }).join('');

  const leyenda = Object.entries(CARRO_COLORES).map(function(e) {
    return '<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-2)">'
      + '<div style="width:10px;height:10px;border-radius:50%;background:' + e[1] + '"></div>' + e[0] + '</div>';
  }).join('');

  return `
  <div class="hint-box">
    <div class="hint-label">
      Carrocería — Estado por panel
      <span style="font-size:11px;font-weight:400;color:var(--text-3);margin-left:8px">
        MB=Microbollo &nbsp;RP=Repintado &nbsp;CH=Choque &nbsp;RY=Raya &nbsp;PC=Picado &nbsp;RJ=Rajado
      </span>
    </div>

    ${hiddenInputs}

    <div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-bottom:12px">${leyenda}</div>

    <div id="carro-wrap" style="position:relative;width:100%;max-width:380px;margin:0 auto 1rem">
      <svg viewBox="0 0 340 600" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
        <rect width="340" height="600" fill="transparent"/>
        <path d="M108,22 Q170,10 232,22 L236,52 Q170,42 104,52 Z" fill="#3a3a3a" stroke="#666" stroke-width="1"/>
        <rect x="130" y="28" width="80" height="14" rx="3" fill="#222" stroke="#555" stroke-width=".5"/>
        <line x1="150" y1="28" x2="150" y2="42" stroke="#444" stroke-width=".5"/>
        <line x1="170" y1="28" x2="170" y2="42" stroke="#444" stroke-width=".5"/>
        <line x1="190" y1="28" x2="190" y2="42" stroke="#444" stroke-width=".5"/>
        <rect x="104" y="26" width="26" height="20" rx="3" fill="#1a3a5a" stroke="#4a8abd" stroke-width=".8"/>
        <rect x="210" y="26" width="26" height="20" rx="3" fill="#1a3a5a" stroke="#4a8abd" stroke-width=".8"/>
        <path d="M104,52 Q170,44 236,52 L240,170 Q200,178 170,178 Q140,178 100,170 Z" fill="#2e2e2e" stroke="#555" stroke-width="1"/>
        <path d="M120,60 Q170,54 220,60 L222,165 Q170,170 118,165 Z" fill="none" stroke="#444" stroke-width=".5" stroke-dasharray="3,3"/>
        <path d="M72,55 L104,52 L100,170 L72,175 Q58,165 55,140 L55,90 Q57,65 72,55Z" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
        <path d="M268,55 L236,52 L240,170 L268,175 Q282,165 285,140 L285,90 Q283,65 268,55Z" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
        <rect x="38" y="80" width="34" height="80" rx="6" fill="#111" stroke="#444" stroke-width="1.2"/>
        <ellipse cx="55" cy="120" rx="13" ry="36" fill="#1a1a1a" stroke="#555" stroke-width=".8"/>
        <ellipse cx="55" cy="120" rx="6" ry="6" fill="#333" stroke="#666" stroke-width=".5"/>
        <rect x="268" y="80" width="34" height="80" rx="6" fill="#111" stroke="#444" stroke-width="1.2"/>
        <ellipse cx="285" cy="120" rx="13" ry="36" fill="#1a1a1a" stroke="#555" stroke-width=".8"/>
        <ellipse cx="285" cy="120" rx="6" ry="6" fill="#333" stroke="#666" stroke-width=".5"/>
        <path d="M100,172 Q170,165 240,172 L236,235 Q170,242 104,235 Z" fill="#1a3a4a" stroke="#3a6a8a" stroke-width=".8"/>
        <path d="M115,178 Q170,173 225,178 L222,228 Q170,234 118,228Z" fill="none" stroke="#2a5a7a" stroke-width=".4" stroke-dasharray="2,2"/>
        <path d="M100,238 L104,235 L236,235 L240,238 L240,365 L236,368 L104,368 L100,365 Z" fill="#222" stroke="#555" stroke-width="1"/>
        <rect x="98" y="232" width="10" height="140" rx="2" fill="#1a1a1a" stroke="#444" stroke-width=".5"/>
        <rect x="232" y="232" width="10" height="140" rx="2" fill="#1a1a1a" stroke="#444" stroke-width=".5"/>
        <line x1="170" y1="238" x2="170" y2="365" stroke="#333" stroke-width=".5" stroke-dasharray="4,4"/>
        <rect x="110" y="244" width="120" height="118" rx="4" fill="none" stroke="#2a2a2a" stroke-width=".8"/>
        <rect x="56" y="240" width="42" height="126" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
        <rect x="60" y="295" width="16" height="5" rx="2" fill="#555"/>
        <rect x="58" y="260" width="38" height="80" rx="2" fill="none" stroke="#3a3a3a" stroke-width=".8"/>
        <rect x="60" y="245" width="34" height="60" rx="2" fill="#1a3040" stroke="#2a5a7a" stroke-width=".5"/>
        <rect x="242" y="240" width="42" height="126" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
        <rect x="264" y="295" width="16" height="5" rx="2" fill="#555"/>
        <rect x="244" y="260" width="38" height="80" rx="2" fill="none" stroke="#3a3a3a" stroke-width=".8"/>
        <rect x="246" y="245" width="34" height="60" rx="2" fill="#1a3040" stroke="#2a5a7a" stroke-width=".5"/>
        <path d="M56,258 L40,262 Q34,270 36,278 L56,278 Z" fill="#2a2a2a" stroke="#555" stroke-width=".8"/>
        <path d="M284,258 L300,262 Q306,270 304,278 L284,278 Z" fill="#2a2a2a" stroke="#555" stroke-width=".8"/>
        <rect x="56" y="370" width="42" height="118" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
        <rect x="60" y="415" width="16" height="5" rx="2" fill="#555"/>
        <rect x="58" y="382" width="38" height="72" rx="2" fill="none" stroke="#3a3a3a" stroke-width=".8"/>
        <rect x="60" y="376" width="34" height="52" rx="2" fill="#1a3040" stroke="#2a5a7a" stroke-width=".5"/>
        <rect x="242" y="370" width="42" height="118" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
        <rect x="264" y="415" width="16" height="5" rx="2" fill="#555"/>
        <rect x="244" y="382" width="38" height="72" rx="2" fill="none" stroke="#3a3a3a" stroke-width=".8"/>
        <rect x="246" y="376" width="34" height="52" rx="2" fill="#1a3040" stroke="#2a5a7a" stroke-width=".5"/>
        <path d="M72,488 L100,485 L104,368 L72,372 Q58,382 55,405 L55,460 Q57,480 72,488Z" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
        <path d="M268,488 L240,485 L236,368 L268,372 Q282,382 285,405 L285,460 Q283,480 268,488Z" fill="#2a2a2a" stroke="#555" stroke-width="1"/>
        <rect x="38" y="400" width="34" height="80" rx="6" fill="#111" stroke="#444" stroke-width="1.2"/>
        <ellipse cx="55" cy="440" rx="13" ry="36" fill="#1a1a1a" stroke="#555" stroke-width=".8"/>
        <ellipse cx="55" cy="440" rx="6" ry="6" fill="#333" stroke="#666" stroke-width=".5"/>
        <rect x="268" y="400" width="34" height="80" rx="6" fill="#111" stroke="#444" stroke-width="1.2"/>
        <ellipse cx="285" cy="440" rx="13" ry="36" fill="#1a1a1a" stroke="#555" stroke-width=".8"/>
        <ellipse cx="285" cy="440" rx="6" ry="6" fill="#333" stroke="#666" stroke-width=".5"/>
        <path d="M100,368 Q170,375 240,368 L236,430 Q170,437 104,430 Z" fill="#1a3a4a" stroke="#3a6a8a" stroke-width=".8"/>
        <path d="M100,432 Q170,438 240,432 L236,490 Q170,498 104,490 Z" fill="#2e2e2e" stroke="#555" stroke-width="1"/>
        <path d="M118,438 Q170,433 222,438 L220,486 Q170,492 120,486Z" fill="none" stroke="#444" stroke-width=".5" stroke-dasharray="3,3"/>
        <path d="M104,490 Q170,500 236,490 L232,528 Q170,538 108,528 Z" fill="#3a3a3a" stroke="#666" stroke-width="1"/>
        <rect x="104" y="492" width="26" height="18" rx="2" fill="#3a1a1a" stroke="#c04040" stroke-width=".8"/>
        <rect x="210" y="492" width="26" height="18" rx="2" fill="#3a1a1a" stroke="#c04040" stroke-width=".8"/>
        <text x="170" y="7"   text-anchor="middle" font-size="9" fill="#666" font-family="sans-serif">FRENTE</text>
        <text x="170" y="598" text-anchor="middle" font-size="9" fill="#666" font-family="sans-serif">TRASERA</text>
        <text x="8"   y="304" text-anchor="middle" font-size="9" fill="#666" font-family="sans-serif" transform="rotate(-90,8,304)">IZQ</text>
        <text x="332" y="304" text-anchor="middle" font-size="9" fill="#666" font-family="sans-serif" transform="rotate(90,332,304)">DER</text>
      </svg>

      <button type="button" class="carro-hp" id="chp-paraDelant"    style="top:1.6%; left:30%; width:40%; height:7%"    onclick="carroOpen('Paragolpes del.')"></button>
      <button type="button" class="carro-hp" id="chp-capo"          style="top:8.6%; left:29%; width:42%; height:19.5%" onclick="carroOpen('Cap\u00f3')"></button>
      <button type="button" class="carro-hp" id="chp-gdaDelIzq"     style="top:9%;   left:14%; width:14%; height:20%"   onclick="carroOpen('Gda. del. izq.')"></button>
      <button type="button" class="carro-hp" id="chp-gdaDelDer"     style="top:9%;   left:72%; width:14%; height:20%"   onclick="carroOpen('Gda. del. der.')"></button>
      <button type="button" class="carro-hp" id="chp-espejoIzq"     style="top:43%;  left:5%;  width:12%; height:6%"    onclick="carroOpen('Espejo izq.')"></button>
      <button type="button" class="carro-hp" id="chp-espejoDer"     style="top:43%;  left:83%; width:12%; height:6%"    onclick="carroOpen('Espejo der.')"></button>
      <button type="button" class="carro-hp" id="chp-techo"         style="top:39.5%;left:29%; width:42%; height:21.5%" onclick="carroOpen('Techo')"></button>
      <button type="button" class="carro-hp" id="chp-puertaDelIzq"  style="top:40%;  left:14%; width:14%; height:21%"   onclick="carroOpen('Puerta del. izq.')"></button>
      <button type="button" class="carro-hp" id="chp-puertaDelDer"  style="top:40%;  left:72%; width:14%; height:21%"   onclick="carroOpen('Puerta del. der.')"></button>
      <button type="button" class="carro-hp" id="chp-puertaTrasIzq" style="top:61.5%;left:14%; width:14%; height:20%"   onclick="carroOpen('Puerta tras. izq.')"></button>
      <button type="button" class="carro-hp" id="chp-puertaTrasDer" style="top:61.5%;left:72%; width:14%; height:20%"   onclick="carroOpen('Puerta tras. der.')"></button>
      <button type="button" class="carro-hp" id="chp-gdaTrasIzq"    style="top:62%;  left:14%; width:14%; height:21%"   onclick="carroOpen('Gda. tras. izq.')"></button>
      <button type="button" class="carro-hp" id="chp-gdaTrasDer"    style="top:62%;  left:72%; width:14%; height:21%"   onclick="carroOpen('Gda. tras. der.')"></button>
      <button type="button" class="carro-hp" id="chp-baul"          style="top:72%;  left:29%; width:42%; height:14.5%" onclick="carroOpen('Ba\u00fal')"></button>
      <button type="button" class="carro-hp" id="chp-paraTras"      style="top:81.5%;left:30%; width:40%; height:7%"    onclick="carroOpen('Paragolpes tras.')"></button>
    </div>

    <div id="carro-resumen" style="display:none;margin-top:8px">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);margin-bottom:6px;font-weight:600">Daños registrados</div>
      <div id="carro-resumen-list" style="display:flex;flex-wrap:wrap;gap:6px"></div>
    </div>
  </div>

  <div id="carro-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;align-items:center;justify-content:center">
    <div style="background:var(--bg,#1e1e1e);border:1px solid var(--border,#444);border-radius:12px;padding:1.25rem;width:300px;max-width:92vw">
      <div style="font-size:14px;font-weight:600;margin-bottom:1rem;color:var(--text,#eee)" id="carro-modal-title">Panel</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:1rem">
        <button type="button" class="carro-opt" data-c="MB" data-col="#639922" onclick="carroSelOpt(this)">• Microbollo</button>
        <button type="button" class="carro-opt" data-c="RP" data-col="#378ADD" onclick="carroSelOpt(this)">&#9650; Repintado</button>
        <button type="button" class="carro-opt" data-c="CH" data-col="#E24B4A" onclick="carroSelOpt(this)">&#10005; Choque</button>
        <button type="button" class="carro-opt" data-c="RY" data-col="#EF9F27" onclick="carroSelOpt(this)">&#9585; Raya</button>
        <button type="button" class="carro-opt" data-c="PC" data-col="#7F77DD" onclick="carroSelOpt(this)">P Picado</button>
        <button type="button" class="carro-opt" data-c="RJ" data-col="#D4537E" onclick="carroSelOpt(this)">R Rajado</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:.8rem">
        <label style="font-size:12px;color:var(--text-2,#aaa);white-space:nowrap">% desgaste</label>
        <input type="number" id="carro-pct" min="0" max="100" value="0"
               style="width:70px;padding:6px 8px;border-radius:7px;border:1px solid var(--border,#444);background:var(--bg2,#2a2a2a);color:var(--text,#eee);font-size:12px">
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:1.1rem">
        <label style="font-size:12px;color:var(--text-2,#aaa);white-space:nowrap">Obs.</label>
        <input type="text" id="carro-obs" placeholder="Nota adicional..."
               style="flex:1;padding:6px 8px;border-radius:7px;border:1px solid var(--border,#444);background:var(--bg2,#2a2a2a);color:var(--text,#eee);font-size:12px">
      </div>
      <div style="display:flex;gap:8px">
        <button type="button" onclick="carroClose()"
                style="flex:1;padding:8px;border-radius:8px;font-size:12px;cursor:pointer;border:1px solid var(--border,#444);background:var(--bg2,#2a2a2a);color:var(--text-2,#aaa)">Cancelar</button>
        <button type="button" onclick="carroClear()"
                style="flex:1;padding:8px;border-radius:8px;font-size:12px;cursor:pointer;border:1px solid #E24B4A55;background:#E24B4A22;color:#e24b4a">Limpiar</button>
        <button type="button" onclick="carroSave()"
                style="flex:1;padding:8px;border-radius:8px;font-size:12px;cursor:pointer;border:none;background:#378ADD;color:#fff;font-weight:600">Guardar</button>
      </div>
    </div>
  </div>`;
}

/* ── Guardar peritaje ── */
function savePeritaje(e) {
  e.preventDefault();
  const f   = e.target;
  const car = S.cars.find(c => c.id === selectedCarId);
  if (!car) return;

  const panelFields = PANELES.flatMap(([k]) => {
    const kCap = k.charAt(0).toUpperCase() + k.slice(1);
    return ['daño' + kCap, 'pct' + kCap];
  });

  const FIELDS = [
    'fecha',
    'gatoLlave', 'ruedaAux', 'matafuego', 'balizas',
    'antirrobos', 'alarma', 'segundaLlave', 'manualUnidad', 'codigosRadio',
    'carpetaDoc', 'audio', 'calefaccion', 'ac', 'vidriosElec',
    'cierreCentral', 'cinturon', 'frenoMano',
    'obsExt', 'desgasteCarroceria', 'costoA',
    ...panelFields,
    'motor', 'cajaAT', 'embrague', 'cuatroX4', 'diferencial', 'mantenimiento', 'obsMotor', 'costoB',
    'frenos', 'frenosTraseros', 'trenDelant', 'amortiguadores', 'direccion', 'neumaticos', 'obsC', 'costoC',
    'abs', 'motorLuz', 'airbag', 'transLuz', 'bateria',
    'dtcCode1', 'dtcCode2', 'dtcCode3', 'dtcOtros', 'obsD', 'costoD',
    'butacaIzq', 'butacaDer', 'asientoTras', 'tapizPuertas', 'tapizTecho', 'bandejaT', 'obsE', 'costoE',
    'costoTotal', 'deToma', 'peritador',
  ];

  if (!car.peritaje) car.peritaje = {};
  FIELDS.forEach(name => {
    if (!f[name]) return;
    const el  = f[name];
    const val = el.type === 'number'   ? (el.value ? +el.value : null)
               : el.type === 'checkbox' ? el.checked
               : el.value;
    car.peritaje[name] = val;
  });

  if (car.peritaje.dtcCode && !car.peritaje.dtcCode1) {
    car.peritaje.dtcCode1 = car.peritaje.dtcCode;
  }

  save();
  toast('Peritaje guardado correctamente', 'success');
  render();
}

/* ── Formulario de peritaje completo ── */
function rPeritajeForm(car) {
  const p    = car.peritaje || {};
  const s    = (name, opts) => `<select name="${name}">${opts.map(o => `<option value="${o}"${p[name] === o ? ' selected' : ''}>${o || '—'}</option>`).join('')}</select>`;
  const OF   = ['', 'ok', 'falta'];
  const OFf  = ['', 'ok', 'falta', 'falla'];
  const Ok   = ['', 'ok', 'falla'];
  const OkNA = ['', 'ok', 'falla', 'N/A'];

  return `
  <div class="form-section">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:8px">
      <div class="form-title" style="margin:0">Peritaje — ${esc(car.brand)} ${esc(car.model)} ${car.year}${car.patente ? ' [' + esc(car.patente) + ']' : ''}</div>
      <button type="button" class="btn sm" onclick="selectedCarId=null;render()">&#8592; Volver a lista</button>
    </div>

    <form onsubmit="savePeritaje(event)">

      <div class="hint-box">
        <div class="hint-label">Datos del peritaje</div>
        <div class="fg3">
          <div class="fg"><label>Fecha</label><input type="date" name="fecha" value="${p.fecha || ''}"></div>
          <div class="fg"><label>Peritador</label><input type="text" name="peritador" value="${esc(p.peritador || '')}" placeholder="Nombre del peritador"></div>
          <div class="fg"><label>De toma / precio compra ($)</label><input type="number" name="deToma" min="0" value="${p.deToma || ''}" placeholder="$"></div>
        </div>
      </div>

      <div class="hint-box">
        <div class="hint-label">A — Equipamiento y accesorios</div>
        <div class="fg4">
          <div class="fg"><label>Gato y llave</label>${s('gatoLlave', OF)}</div>
          <div class="fg"><label>Rueda auxiliar</label>${s('ruedaAux', OF)}</div>
          <div class="fg"><label>Matafuego</label>${s('matafuego', OF)}</div>
          <div class="fg"><label>Balizas</label>${s('balizas', OF)}</div>
        </div>
        <div class="fg4">
          <div class="fg"><label>Segunda llave</label>${s('segundaLlave', OF)}</div>
          <div class="fg"><label>Manual unidad</label>${s('manualUnidad', OF)}</div>
          <div class="fg"><label>C&#243;digos de radio</label>${s('codigosRadio', OF)}</div>
          <div class="fg"><label>Carpeta / documentaci&#243;n</label>${s('carpetaDoc', OF)}</div>
        </div>
        <div class="fg4">
          <div class="fg"><label>Antirrobos</label>${s('antirrobos', OF)}</div>
          <div class="fg"><label>Alarma</label>${s('alarma', OFf)}</div>
          <div class="fg"><label>Audio</label>${s('audio', OFf)}</div>
          <div class="fg"><label>Calefacci&#243;n</label>${s('calefaccion', Ok)}</div>
        </div>
        <div class="fg4">
          <div class="fg"><label>Aire acondicionado</label>${s('ac', OkNA)}</div>
          <div class="fg"><label>Vidrios el&#233;ctricos</label>${s('vidriosElec', OkNA)}</div>
          <div class="fg"><label>Cierre centralizado</label>${s('cierreCentral', Ok)}</div>
          <div class="fg"><label>Cintur&#243;n seguridad</label>${s('cinturon', Ok)}</div>
        </div>
        <div class="fg4">
          <div class="fg"><label>Freno de mano</label>${s('frenoMano', Ok)}</div>
          <div class="fg"></div><div class="fg"></div><div class="fg"></div>
        </div>
        <div class="fg"><label>Observaciones</label><textarea name="obsExt">${esc(p.obsExt || '')}</textarea></div>
        <div class="fg2">
          <div class="fg"><label>% Desgaste carrocer&#237;a (general)</label><input type="number" name="desgasteCarroceria" min="0" max="100" value="${p.desgasteCarroceria || ''}" placeholder="0-100"></div>
          <div class="fg"><label>Costo estimado A ($)</label><input type="number" name="costoA" min="0" value="${p.costoA || ''}" placeholder="$"></div>
        </div>
      </div>

      ${rCarroceriaSVG(p)}

      <div class="hint-box">
        <div class="hint-label">B — Motor y transmisi&#243;n</div>
        <div class="fg3">
          <div class="fg"><label>Motor</label>${s('motor', ['', 'ok', 'falla', 'observar'])}</div>
          <div class="fg"><label>Caja AT</label>${s('cajaAT', OkNA)}</div>
          <div class="fg"><label>Embrague</label>${s('embrague', OkNA)}</div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Caja MT</label>${s('cuatroX4', OkNA)}</div>
          <div class="fg"><label>4X4</label>${s('diferencial', OkNA)}</div>
          <div class="fg"><label>&#218;ltimo mantenimiento</label><input type="text" name="mantenimiento" value="${esc(p.mantenimiento || '')}" placeholder="km o fecha"></div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Observaciones motor</label><textarea name="obsMotor">${esc(p.obsMotor || '')}</textarea></div>
          <div class="fg"><label>Costo estimado B ($)</label><input type="number" name="costoB" min="0" value="${p.costoB || ''}" placeholder="$"></div>
        </div>
      </div>

      <div class="hint-box">
        <div class="hint-label">C — Frenos, tren delantero y suspensi&#243;n</div>
        <div class="fg3">
          <div class="fg"><label>Frenos</label>${s('frenos', ['', 'ok', 'falla', 'desgaste'])}</div>
          <div class="fg"><label>Tren delantero</label>${s('trenDelant', ['', 'ok', 'falla', 'desgaste'])}</div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Amortiguadores</label>${s('amortiguadores', ['', 'ok', 'falla', 'desgaste'])}</div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Observaciones frenos/tren</label><textarea name="obsC">${esc(p.obsC || '')}</textarea></div>
          <div class="fg"><label>Costo estimado C ($)</label><input type="number" name="costoC" min="0" value="${p.costoC || ''}" placeholder="$"></div>
        </div>
      </div>

      <div class="hint-box">
        <div class="hint-label">D — Sistema el&#233;ctrico y diagn&#243;stico DTC</div>
        <div class="fg4">
          <div class="fg"><label>ABS</label>${s('abs', Ok)}</div>
          <div class="fg"><label>Luz motor</label>${s('motorLuz', Ok)}</div>
          <div class="fg"><label>Airbag</label>${s('airbag', Ok)}</div>
          <div class="fg"><label>Trans. autom&#225;tica</label>${s('transLuz', OkNA)}</div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Bater&#237;a</label>${s('bateria', ['', 'ok', 'falla', 'd&#233;bil'])}</div>
          <div class="fg"><label>C&#243;digo falla 1</label><input type="text" name="dtcCode1" value="${esc(p.dtcCode1 || p.dtcCode || '')}" placeholder="P0XXX, C0XXX..."></div>
          <div class="fg"><label>C&#243;digo falla 2</label><input type="text" name="dtcCode2" value="${esc(p.dtcCode2 || '')}" placeholder="P0XXX, C0XXX..."></div>
        </div>
        <div class="fg3">
          <div class="fg"><label>C&#243;digo falla 3</label><input type="text" name="dtcCode3" value="${esc(p.dtcCode3 || '')}" placeholder="P0XXX, C0XXX..."></div>
          <div class="fg"><label>Otros c&#243;digos</label><input type="text" name="dtcOtros" value="${esc(p.dtcOtros || '')}" placeholder="Otros..."></div>
          <div class="fg"></div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Observaciones el&#233;ctrico</label><textarea name="obsD">${esc(p.obsD || '')}</textarea></div>
          <div class="fg"><label>Costo estimado D ($)</label><input type="number" name="costoD" min="0" value="${p.costoD || ''}" placeholder="$"></div>
        </div>
      </div>

      <div class="hint-box">
        <div class="hint-label">E — Interior y tapizado</div>
        <div class="fg3">
          <div class="fg"><label>Butaca izquierda.</label>${s('butacaIzq', ['', 'ok', 'roto', 'manchado'])}</div>
          <div class="fg"><label>Butaca derecha.</label>${s('butacaDer', ['', 'ok', 'roto', 'manchado'])}</div>
          <div class="fg"><label>Asiento trasero</label>${s('asientoTras', ['', 'ok', 'roto', 'manchado'])}</div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Tapizado puertas</label>${s('tapizPuertas', ['', 'ok', 'roto', 'desgaste'])}</div>
          <div class="fg"><label>Tapizado techo</label>${s('tapizTecho', ['', 'ok', 'manchado', 'ca&#237;do'])}</div>
          <div class="fg"><label>Bandeja trasera</label>${s('bandejaT', ['', 'ok', 'falta', 'roto'])}</div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Observaciones interior</label><textarea name="obsE">${esc(p.obsE || '')}</textarea></div>
          <div class="fg"><label>Costo estimado E ($)</label><input type="number" name="costoE" min="0" value="${p.costoE || ''}" placeholder="$"></div>
        </div>
      </div>

      <div class="hint-box">
        <div class="hint-label">Resumen de costos</div>
        <div class="fg2">
          <div class="fg"><label>Costo total reparaciones ($)</label><input type="number" name="costoTotal" min="0" value="${p.costoTotal || ''}" placeholder="$"></div>
          <div class="fg"></div>
        </div>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:1rem">
        <button type="button" class="btn" onclick="selectedCarId=null;render()">&#8592; Cancelar</button>
        <button type="submit" class="btn primary">Guardar peritaje</button>
      </div>
    </form>
  </div>`;
}

/* ── Vista: resumen de peritaje de un vehículo ── */
function rPeritajeResumen(car) {
  const p = car.peritaje || {};
  const v = (val) => {
    if (!val) return '<span style="color:var(--text-3)">&#8212;</span>';
    const cls = val === 'ok' ? 'ok' : (val === 'falla' || val === 'roto' || val === 'falta') ? 'bad' : 'warn';
    return `<span class="pcheck-val ${cls}">${val}</span>`;
  };
  const row = (label, val) => `<div class="pcheck-row"><div class="pcheck-label">${label}</div>${v(val)}</div>`;
  const total  = p.costoTotal ? '$' + (+p.costoTotal).toLocaleString('es-AR') : '&#8212;';
  const deToma = p.deToma     ? '$' + (+p.deToma).toLocaleString('es-AR')     : '&#8212;';

  const panelesConDaño = PANELES.filter(([k]) => {
    const kCap = k.charAt(0).toUpperCase() + k.slice(1);
    const d = p['daño' + kCap];
    return d && d !== 'ok';
  });

  return `
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-weight:600;font-size:15px">${esc(car.brand)} ${esc(car.model)} ${car.year}${car.patente ? ' [' + esc(car.patente) + ']' : ''}</div>
        <div style="font-size:12px;color:var(--text-3)">${car.tipo} &middot; ${car.trans}${car.km ? ' &middot; ' + fk(car.km) : ''}</div>
        ${p.peritador ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px">Peritador: ${esc(p.peritador)}${p.fecha ? ' &middot; ' + p.fecha : ''}</div>` : ''}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${p.costoTotal ? `<span class="badge bg-red">Reparaciones: ${total}</span>` : ''}
        ${p.deToma     ? `<span class="badge bg-gold">De toma: ${deToma}</span>`     : ''}
        <button class="btn sm" onclick="selectedCarId='${car.id}';render()">&#9998; Editar peritaje</button>
      </div>
    </div>
    <div class="peritaje-grid">
      <div class="peritaje-section">
        <div class="peritaje-section-title">A &#8212; Equipamiento</div>
        ${row('Gato y llave', p.gatoLlave)}${row('Rueda auxiliar', p.ruedaAux)}
        ${row('Matafuego', p.matafuego)}${row('Balizas', p.balizas)}
        ${row('Segunda llave', p.segundaLlave)}${row('Alarma', p.alarma)}
        ${row('Audio', p.audio)}${row('Aire acond.', p.ac)}
        ${row('Cierre centr.', p.cierreCentral)}
        ${p.obsExt ? `<div style="font-size:11px;color:var(--text-3);margin-top:6px;font-style:italic">"${esc(p.obsExt)}"</div>` : ''}
      </div>
      <div class="peritaje-section">
        <div class="peritaje-section-title">B &#8212; Motor</div>
        ${row('Motor', p.motor)}${row('Caja AT', p.cajaAT)}
        ${row('Embrague', p.embrague)}${row('4x4', p.cuatroX4)}
        ${p.mantenimiento ? row('&#218;ltimo mant.', p.mantenimiento) : ''}
        ${p.costoB ? `<div style="font-size:11px;color:var(--text-3);margin-top:6px">Est. B: $${(+p.costoB).toLocaleString('es-AR')}</div>` : ''}
      </div>
      <div class="peritaje-section">
        <div class="peritaje-section-title">C &#8212; Frenos / Tren</div>
        ${row('Frenos del.', p.frenos)}${row('Frenos tras.', p.frenosTraseros)}
        ${row('Tren delant.', p.trenDelant)}${row('Amortiguadores', p.amortiguadores)}
        ${p.costoC ? `<div style="font-size:11px;color:var(--text-3);margin-top:6px">Est. C: $${(+p.costoC).toLocaleString('es-AR')}</div>` : ''}
      </div>
      <div class="peritaje-section">
        <div class="peritaje-section-title">D &#8212; El&#233;ctrico / DTC</div>
        ${row('ABS', p.abs)}${row('Luz motor', p.motorLuz)}
        ${row('Airbag', p.airbag)}${row('Bater&#237;a', p.bateria)}
        ${(p.dtcCode1 || p.dtcCode) ? row('C&#243;digo DTC', p.dtcCode1 || p.dtcCode) : ''}
        ${p.dtcCode2 ? row('C&#243;digo DTC 2', p.dtcCode2) : ''}
        ${p.costoD ? `<div style="font-size:11px;color:var(--text-3);margin-top:6px">Est. D: $${(+p.costoD).toLocaleString('es-AR')}</div>` : ''}
      </div>
    </div>
    ${panelesConDaño.length > 0 ? `
    <div class="peritaje-section" style="margin-top:10px">
      <div class="peritaje-section-title">Carrocer&#237;a &#8212; Da&#241;os</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
        ${panelesConDaño.map(([k, label]) => {
          const kCap = k.charAt(0).toUpperCase() + k.slice(1);
          const d   = p['daño' + kCap];
          const pct = p['pct'  + kCap];
          return `<span class="badge bg-red" style="font-size:11px">${label}: ${d}${pct ? ' ' + pct + '%' : ''}</span>`;
        }).join('')}
      </div>
    </div>` : ''}
    <div class="peritaje-section" style="margin-top:10px">
      <div class="peritaje-section-title">E &#8212; Interior</div>
      <div class="fg3" style="margin:0">
        <div>${row('Butaca izq.', p.butacaIzq)}</div>
        <div>${row('Butaca der.', p.butacaDer)}</div>
        <div>${row('Asiento tras.', p.asientoTras)}</div>
      </div>
      ${p.obsE ? `<div style="font-size:11px;color:var(--text-3);margin-top:6px;font-style:italic">"${esc(p.obsE)}"</div>` : ''}
    </div>
  </div>`;
}

/* ── Render principal ── */
function render() {
  if (selectedCarId) {
    const car = S.cars.find(c => c.id === selectedCarId);
    if (!car) { selectedCarId = null; render(); return; }
    document.getElementById('view').innerHTML = rPeritajeForm(car);
    /* CLAVE: inicializar los botones del SVG DESPUÉS de actualizar el DOM */
    carroRenderBtns();
    return;
  }

  const disponibles = S.cars.filter(c => c.status === 'disponible');
  const otros       = S.cars.filter(c => c.status !== 'disponible');

  let html = `
  <div class="section-head">
    <div class="section-title">Peritaje de vehículos</div>
    <span class="badge bg-gold">${S.cars.filter(c => c.peritaje && Object.keys(c.peritaje).length > 0).length} peritados de ${S.cars.length}</span>
  </div>
  <div style="font-size:13px;color:var(--text-3);margin-bottom:1rem">Seleccioná un vehículo para cargar o editar su peritaje.</div>
  ${S.cars.length === 0 ? `
  <div class="empty">
    <div class="empty-icon">📋</div>
    <strong>Sin vehículos en stock</strong>
    <div style="font-size:13px;margin-top:4px">Primero cargá vehículos en la sección Vehículos.</div>
  </div>` : ''}`;

  if (disponibles.length > 0) {
    html += `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3);margin-bottom:8px;font-weight:600">Disponibles</div>`;
    disponibles.forEach(car => {
      const hasP = car.peritaje && Object.keys(car.peritaje).length > 0;
      html += hasP ? rPeritajeResumen(car) : `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-weight:600">${esc(car.brand)} ${esc(car.model)} ${car.year}${car.patente ? ' [' + esc(car.patente) + ']' : ''}</div>
          <div style="font-size:12px;color:var(--text-3)">${car.tipo} · ${car.trans}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge bg-gray">Sin peritaje</span>
          <button class="btn sm primary" onclick="selectedCarId='${car.id}';render()">+ Peritar</button>
        </div>
      </div>`;
    });
  }

  if (otros.length > 0) {
    html += `
    <details style="margin-top:1.5rem">
      <summary>Vendidos / Reservados (${otros.length})</summary>
      <div style="margin-top:10px">
        ${otros.map(car => {
          const hasP = car.peritaje && Object.keys(car.peritaje).length > 0;
          return hasP ? rPeritajeResumen(car) : `
          <div class="card" style="opacity:.55;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div><div style="font-weight:500">${esc(car.brand)} ${esc(car.model)} ${car.year}</div></div>
            <div style="display:flex;gap:6px">
              <span class="badge ${car.status === 'vendido' ? 'bg-green' : 'bg-orange'}">${car.status}</span>
              <button class="btn sm" onclick="selectedCarId='${car.id}';render()">Ver peritaje</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </details>`;
  }

  document.getElementById('view').innerHTML = html;
}

/* ── Boot ── */
bootApp('peritaje');
const urlCarId = getCarIdFromURL();
if (urlCarId && S.cars.find(c => c.id === urlCarId)) {
  selectedCarId = urlCarId;
}
render();