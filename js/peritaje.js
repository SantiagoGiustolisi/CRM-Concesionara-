/* ═══════════════════════════════════════════════════════════════
   NEIFERT CRM — js/peritaje.js
   Módulo: Peritaje de vehículos (formulario A-E + carrocería)
   Se puede abrir con ?id=CAR_ID para ir directo a un vehículo
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

/* ── Guardar peritaje ── */
function savePeritaje(e) {
  e.preventDefault();
  const f   = e.target;
  const car = S.cars.find(c => c.id === selectedCarId);
  if (!car) return;

  const panelFields = PANELES.flatMap(([k]) => {
    const kCap = k.charAt(0).toUpperCase() + k.slice(1);
    return [`daño${kCap}`, `pct${kCap}`];
  });

  const FIELDS = [
    'fecha',
    // A — Equipamiento
    'gatoLlave', 'ruedaAux', 'matafuego', 'balizas',
    'antirrobos', 'alarma', 'segundaLlave', 'manualUnidad', 'codigosRadio',
    'carpetaDoc', 'audio', 'calefaccion', 'ac', 'vidriosElec',
    'cierreCentral', 'cinturon', 'frenoMano',
    'obsExt', 'desgasteCarroceria', 'costoA',
    // Carrocería paneles
    ...panelFields,
    // B — Motor
    'motor', 'cajaAT', 'embrague', 'cuatroX4', 'diferencial', 'mantenimiento', 'obsMotor', 'costoB',
    // C — Frenos
    'frenos', 'frenosTraseros', 'trenDelant', 'amortiguadores', 'direccion', 'neumaticos', 'obsC', 'costoC',
    // D — Eléctrico
    'abs', 'motorLuz', 'airbag', 'transLuz', 'bateria',
    'dtcCode1', 'dtcCode2', 'dtcCode3', 'dtcOtros', 'obsD', 'costoD',
    // E — Interior
    'butacaIzq', 'butacaDer', 'asientoTras', 'tapizPuertas', 'tapizTecho', 'bandejaT', 'obsE', 'costoE',
    // Resumen
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

  // Migrar campo viejo dtcCode → dtcCode1
  if (car.peritaje.dtcCode && !car.peritaje.dtcCode1) {
    car.peritaje.dtcCode1 = car.peritaje.dtcCode;
  }

  save();
  toast('Peritaje guardado correctamente', 'success');
  render();
}

/* ── Formulario de peritaje completo ── */
function rPeritajeForm(car) {
  const p  = car.peritaje || {};
  const s  = (name, opts) => `<select name="${name}">${opts.map(o => `<option value="${o}"${p[name] === o ? ' selected' : ''}>${o || '—'}</option>`).join('')}</select>`;
  const OF   = ['', 'ok', 'falta'];
  const OFf  = ['', 'ok', 'falta', 'falla'];
  const Ok   = ['', 'ok', 'falla'];
  const OkNA = ['', 'ok', 'falla', 'N/A'];

  const panelRows = PANELES.map(([k, label]) => {
    const kCap = k.charAt(0).toUpperCase() + k.slice(1);
    const dKey = `daño${kCap}`;
    const pKey = `pct${kCap}`;
    const dVal = p[dKey] || '';
    const pVal = p[pKey] || '';
    const hasDmg = dVal && dVal !== 'ok';
    return `
    <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)${hasDmg ? ';background:rgba(220,80,80,.04)' : ''}">
      <div style="width:140px;font-size:12px;color:var(--text-2);flex-shrink:0">${label}</div>
      <select name="${dKey}" style="flex:1">
        ${DAÑOS_PANEL.map(o => `<option value="${o}"${dVal === o ? ' selected' : ''}>${o || '—'}</option>`).join('')}
      </select>
      <input type="number" name="${pKey}" min="0" max="100" value="${pVal}" placeholder="%" style="width:62px" title="% desgaste">
      <span style="font-size:11px;color:var(--text-3);flex-shrink:0">%</span>
    </div>`;
  }).join('');

  return `
  <div class="form-section">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:8px">
      <div class="form-title" style="margin:0">Peritaje — ${esc(car.brand)} ${esc(car.model)} ${car.year}${car.patente ? ' [' + esc(car.patente) + ']' : ''}</div>
      <button type="button" class="btn sm" onclick="selectedCarId=null;render()">← Volver a lista</button>
    </div>

    <form onsubmit="savePeritaje(event)">

      <!-- Encabezado del peritaje -->
      <div class="hint-box">
        <div class="hint-label">Datos del peritaje</div>
        <div class="fg3">
          <div class="fg"><label>Fecha</label><input type="date" name="fecha" value="${p.fecha || ''}"></div>
          <div class="fg"><label>Peritador</label><input type="text" name="peritador" value="${esc(p.peritador || '')}" placeholder="Nombre del peritador"></div>
          <div class="fg"><label>De toma / precio compra ($)</label><input type="number" name="deToma" min="0" value="${p.deToma || ''}" placeholder="$"></div>
        </div>
      </div>

      <!-- A — Equipamiento y accesorios -->
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
          <div class="fg"><label>Códigos de radio</label>${s('codigosRadio', OF)}</div>
          <div class="fg"><label>Carpeta / documentación</label>${s('carpetaDoc', OF)}</div>
        </div>
        <div class="fg4">
          <div class="fg"><label>Antirrobos</label>${s('antirrobos', OF)}</div>
          <div class="fg"><label>Alarma</label>${s('alarma', OFf)}</div>
          <div class="fg"><label>Audio</label>${s('audio', OFf)}</div>
          <div class="fg"><label>Calefacción</label>${s('calefaccion', Ok)}</div>
        </div>
        <div class="fg4">
          <div class="fg"><label>Aire acondicionado</label>${s('ac', OkNA)}</div>
          <div class="fg"><label>Vidrios eléctricos</label>${s('vidriosElec', OkNA)}</div>
          <div class="fg"><label>Cierre centralizado</label>${s('cierreCentral', Ok)}</div>
          <div class="fg"><label>Cinturón seguridad</label>${s('cinturon', Ok)}</div>
        </div>
        <div class="fg4">
          <div class="fg"><label>Freno de mano</label>${s('frenoMano', Ok)}</div>
          <div class="fg"></div><div class="fg"></div><div class="fg"></div>
        </div>
        <div class="fg"><label>Observaciones</label><textarea name="obsExt">${esc(p.obsExt || '')}</textarea></div>
        <div class="fg2">
          <div class="fg"><label>% Desgaste carrocería (general)</label><input type="number" name="desgasteCarroceria" min="0" max="100" value="${p.desgasteCarroceria || ''}" placeholder="0–100"></div>
          <div class="fg"><label>Costo estimado A ($)</label><input type="number" name="costoA" min="0" value="${p.costoA || ''}" placeholder="$"></div>
        </div>
      </div>

      <!-- Carrocería — estado por panel -->
      <div class="hint-box">
        <div class="hint-label">
          Carrocería — Estado por panel
          <span style="font-size:11px;font-weight:400;color:var(--text-3);margin-left:8px">
            O=Observación &nbsp;MB=Microbollo &nbsp;RP=Repintado &nbsp;CH=Choque &nbsp;RY=Raya &nbsp;PC=Picado &nbsp;RJ=Rajado
          </span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 2rem">
          ${panelRows}
        </div>
      </div>

      <!-- B — Motor y transmisión -->
      <div class="hint-box">
        <div class="hint-label">B — Motor y transmisión</div>
        <div class="fg3">
          <div class="fg"><label>Motor</label>${s('motor', ['', 'ok', 'falla', 'observar'])}</div>
          <div class="fg"><label>Caja AT</label>${s('cajaAT', OkNA)}</div>
          <div class="fg"><label>Embrague</label>${s('embrague', OkNA)}</div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Caja MT</label>${s('cuatroX4', OkNA)}</div>
          <div class="fg"><label>4X4</label>${s('diferencial', OkNA)}</div>
          <div class="fg"><label>Último mantenimiento</label><input type="text" name="mantenimiento" value="${esc(p.mantenimiento || '')}" placeholder="km o fecha"></div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Observaciones motor</label><textarea name="obsMotor">${esc(p.obsMotor || '')}</textarea></div>
          <div class="fg"><label>Costo estimado B ($)</label><input type="number" name="costoB" min="0" value="${p.costoB || ''}" placeholder="$"></div>
        </div>
      </div>

      <!-- C — Frenos, tren y suspensión -->
      <div class="hint-box">
        <div class="hint-label">C — Frenos, tren delantero y suspensión</div>
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

      <!-- D — Sistema eléctrico y DTC -->
      <div class="hint-box">
        <div class="hint-label">D — Sistema eléctrico y diagnóstico DTC</div>
        <div class="fg4">
          <div class="fg"><label>ABS</label>${s('abs', Ok)}</div>
          <div class="fg"><label>Luz motor</label>${s('motorLuz', Ok)}</div>
          <div class="fg"><label>Airbag</label>${s('airbag', Ok)}</div>
          <div class="fg"><label>Trans. automática</label>${s('transLuz', OkNA)}</div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Batería</label>${s('bateria', ['', 'ok', 'falla', 'débil'])}</div>
          <div class="fg"><label>Código falla 1</label><input type="text" name="dtcCode1" value="${esc(p.dtcCode1 || p.dtcCode || '')}" placeholder="P0XXX, C0XXX..."></div>
          <div class="fg"><label>Código falla 2</label><input type="text" name="dtcCode2" value="${esc(p.dtcCode2 || '')}" placeholder="P0XXX, C0XXX..."></div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Código falla 3</label><input type="text" name="dtcCode3" value="${esc(p.dtcCode3 || '')}" placeholder="P0XXX, C0XXX..."></div>
          <div class="fg"><label>Otros códigos</label><input type="text" name="dtcOtros" value="${esc(p.dtcOtros || '')}" placeholder="Otros..."></div>
          <div class="fg"></div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Observaciones eléctrico</label><textarea name="obsD">${esc(p.obsD || '')}</textarea></div>
          <div class="fg"><label>Costo estimado D ($)</label><input type="number" name="costoD" min="0" value="${p.costoD || ''}" placeholder="$"></div>
        </div>
      </div>

      <!-- E — Interior y tapizado -->
      <div class="hint-box">
        <div class="hint-label">E — Interior y tapizado</div>
        <div class="fg3">
          <div class="fg"><label>Butaca delantera izq.</label>${s('butacaIzq', ['', 'ok', 'roto', 'manchado'])}</div>
          <div class="fg"><label>Butaca delantera der.</label>${s('butacaDer', ['', 'ok', 'roto', 'manchado'])}</div>
          <div class="fg"><label>Asiento trasero</label>${s('asientoTras', ['', 'ok', 'roto', 'manchado'])}</div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Tapizado puertas</label>${s('tapizPuertas', ['', 'ok', 'roto', 'desgaste'])}</div>
          <div class="fg"><label>Tapizado techo</label>${s('tapizTecho', ['', 'ok', 'manchado', 'caído'])}</div>
          <div class="fg"><label>Bandeja trasera</label>${s('bandejaT', ['', 'ok', 'falta', 'roto'])}</div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Observaciones interior</label><textarea name="obsE">${esc(p.obsE || '')}</textarea></div>
          <div class="fg"><label>Costo estimado E ($)</label><input type="number" name="costoE" min="0" value="${p.costoE || ''}" placeholder="$"></div>
        </div>
      </div>

      <!-- Resumen de costos -->
      <div class="hint-box">
        <div class="hint-label">Resumen de costos</div>
        <div class="fg2">
          <div class="fg"><label>Costo total reparaciones ($)</label><input type="number" name="costoTotal" min="0" value="${p.costoTotal || ''}" placeholder="$"></div>
          <div class="fg"></div>
        </div>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:1rem">
        <button type="button" class="btn" onclick="selectedCarId=null;render()">← Cancelar</button>
        <button type="submit" class="btn primary">Guardar peritaje</button>
      </div>
    </form>
  </div>`;
}

/* ── Vista: resumen de peritaje de un vehículo ── */
function rPeritajeResumen(car) {
  const p = car.peritaje || {};
  const v = (val) => {
    if (!val) return '<span style="color:var(--text-3)">—</span>';
    const cls = val === 'ok' ? 'ok' : (val === 'falla' || val === 'roto' || val === 'falta') ? 'bad' : 'warn';
    return `<span class="pcheck-val ${cls}">${val}</span>`;
  };
  const row = (label, val) => `
    <div class="pcheck-row">
      <div class="pcheck-label">${label}</div>
      ${v(val)}
    </div>`;

  const total  = p.costoTotal ? `$${(+p.costoTotal).toLocaleString('es-AR')}` : '—';
  const deToma = p.deToma     ? `$${(+p.deToma).toLocaleString('es-AR')}`     : '—';

  // Paneles con daño
  const panelesConDaño = PANELES.filter(([k]) => {
    const kCap = k.charAt(0).toUpperCase() + k.slice(1);
    const d = p[`daño${kCap}`];
    return d && d !== 'ok';
  });

  return `
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-weight:600;font-size:15px">${esc(car.brand)} ${esc(car.model)} ${car.year}${car.patente ? ' [' + esc(car.patente) + ']' : ''}</div>
        <div style="font-size:12px;color:var(--text-3)">${car.tipo} · ${car.trans}${car.km ? ' · ' + fk(car.km) : ''}</div>
        ${p.peritador ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px">Peritador: ${esc(p.peritador)}${p.fecha ? ' · ' + p.fecha : ''}</div>` : ''}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${p.costoTotal ? `<span class="badge bg-red">Reparaciones: ${total}</span>` : ''}
        ${p.deToma     ? `<span class="badge bg-gold">De toma: ${deToma}</span>`     : ''}
        <button class="btn sm" onclick="selectedCarId='${car.id}';render()">✏️ Editar peritaje</button>
      </div>
    </div>

    <div class="peritaje-grid">
      <div class="peritaje-section">
        <div class="peritaje-section-title">A — Equipamiento</div>
        ${row('Gato y llave', p.gatoLlave)}
        ${row('Rueda auxiliar', p.ruedaAux)}
        ${row('Matafuego', p.matafuego)}
        ${row('Balizas', p.balizas)}
        ${row('Segunda llave', p.segundaLlave)}
        ${row('Alarma', p.alarma)}
        ${row('Audio', p.audio)}
        ${row('Aire acond.', p.ac)}
        ${row('Cierre centr.', p.cierreCentral)}
        ${p.carpetaDoc ? row('Carpeta', p.carpetaDoc) : ''}
        ${p.obsExt ? `<div style="font-size:11px;color:var(--text-3);margin-top:6px;font-style:italic">"${esc(p.obsExt)}"</div>` : ''}
      </div>
      <div class="peritaje-section">
        <div class="peritaje-section-title">B — Motor</div>
        ${row('Motor', p.motor)}
        ${row('Caja AT', p.cajaAT)}
        ${row('Embrague', p.embrague)}
        ${row('4x4', p.cuatroX4)}
        ${p.mantenimiento ? row('Último mant.', p.mantenimiento) : ''}
        ${p.costoB ? `<div style="font-size:11px;color:var(--text-3);margin-top:6px">Est. B: $${(+p.costoB).toLocaleString('es-AR')}</div>` : ''}
      </div>
      <div class="peritaje-section">
        <div class="peritaje-section-title">C — Frenos / Tren</div>
        ${row('Frenos del.', p.frenos)}
        ${row('Frenos tras.', p.frenosTraseros)}
        ${row('Tren delant.', p.trenDelant)}
        ${row('Amortiguadores', p.amortiguadores)}
        ${row('Dirección', p.direccion)}
        ${p.costoC ? `<div style="font-size:11px;color:var(--text-3);margin-top:6px">Est. C: $${(+p.costoC).toLocaleString('es-AR')}</div>` : ''}
      </div>
      <div class="peritaje-section">
        <div class="peritaje-section-title">D — Eléctrico / DTC</div>
        ${row('ABS', p.abs)}
        ${row('Luz motor', p.motorLuz)}
        ${row('Airbag', p.airbag)}
        ${row('Batería', p.bateria)}
        ${(p.dtcCode1 || p.dtcCode) ? row('Código DTC', p.dtcCode1 || p.dtcCode) : ''}
        ${p.dtcCode2 ? row('Código DTC 2', p.dtcCode2) : ''}
        ${p.dtcCode3 ? row('Código DTC 3', p.dtcCode3) : ''}
        ${p.costoD ? `<div style="font-size:11px;color:var(--text-3);margin-top:6px">Est. D: $${(+p.costoD).toLocaleString('es-AR')}</div>` : ''}
      </div>
    </div>

    ${panelesConDaño.length > 0 ? `
    <div class="peritaje-section" style="margin-top:10px">
      <div class="peritaje-section-title">Carrocería — Daños</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
        ${panelesConDaño.map(([k, label]) => {
          const kCap = k.charAt(0).toUpperCase() + k.slice(1);
          const d = p[`daño${kCap}`];
          const pct = p[`pct${kCap}`];
          return `<span class="badge bg-red" style="font-size:11px">${label}: ${d}${pct ? ' ' + pct + '%' : ''}</span>`;
        }).join('')}
      </div>
    </div>` : ''}

    <div class="peritaje-section" style="margin-top:10px">
      <div class="peritaje-section-title">E — Interior</div>
      <div class="fg3" style="margin:0">
        <div>${row('Butaca izq.', p.butacaIzq)}</div>
        <div>${row('Butaca der.', p.butacaDer)}</div>
        <div>${row('Asiento tras.', p.asientoTras)}</div>
      </div>
      ${p.obsE ? `<div style="font-size:11px;color:var(--text-3);margin-top:6px;font-style:italic">"${esc(p.obsE)}"</div>` : ''}
      ${p.costoE ? `<div style="font-size:11px;color:var(--text-3);margin-top:4px">Est. E: $${(+p.costoE).toLocaleString('es-AR')}</div>` : ''}
    </div>
  </div>`;
}

/* ── Render principal ── */
function render() {
  if (selectedCarId) {
    const car = S.cars.find(c => c.id === selectedCarId);
    if (!car) { selectedCarId = null; render(); return; }
    document.getElementById('view').innerHTML = rPeritajeForm(car);
    return;
  }

  const disponibles = S.cars.filter(c => c.status === 'disponible');
  const otros       = S.cars.filter(c => c.status !== 'disponible');

  let html = `
  <div class="section-head">
    <div class="section-title">Peritaje de vehículos</div>
    <span class="badge bg-gold">${S.cars.filter(c => c.peritaje && Object.keys(c.peritaje).length > 0).length} peritados de ${S.cars.length}</span>
  </div>

  <div style="font-size:13px;color:var(--text-3);margin-bottom:1rem">
    Seleccioná un vehículo para cargar o editar su peritaje.
  </div>

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
