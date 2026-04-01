/* ═══════════════════════════════════════════════════════════════
   NEIFERT CRM — js/peritaje.js
   Módulo: Peritaje de vehículos (formulario A-E + costos)
   Se puede abrir con ?id=CAR_ID para ir directo a un vehículo
   ═══════════════════════════════════════════════════════════════ */

let selectedCarId = null;

/* ── Detectar si viene con ?id=... en la URL ── */
function getCarIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || null;
}

/* ── Guardar peritaje ── */
function savePeritaje(e) {
  e.preventDefault();
  const f   = e.target;
  const car = S.cars.find(c=>c.id===selectedCarId);
  if (!car) return;
  const FIELDS = [
    'gatoLlave','ruedaAux','antirrobos','alarma','audio','calefaccion','ac',
    'vidriosElec','cierreCentral','cinturon','obsExt',
    'motor','cajaAT','embrague','cuatroX4','mantenimiento','costoB',
    'frenos','trenDelant','amortiguadores','obsC','costoC',
    'abs','motorLuz','airbag','transLuz','dtcCode','obsD','costoD',
    'butacaIzq','butacaDer','asientoTras','tapizPuertas','tapizTrasero','bandejaT','obsE','costoE',
    'costoTotal','deToma','peritador',
  ];
  if (!car.peritaje) car.peritaje = {};
  FIELDS.forEach(name => {
    if (!f[name]) return;
    const el = f[name];
    const val = el.type==='number' ? (el.value ? +el.value : null) : el.value;
    car.peritaje[name] = val;
  });
  save();
  toast('Peritaje guardado correctamente', 'success');
  render(); // re-render para mostrar el resumen actualizado
}

/* ── Select helper ── */
function selOpt(name, options, currentVal) {
  return `<select name="${name}">
    ${options.map(o=>`<option value="${o}"${currentVal===o?' selected':''}>${o}</option>`).join('')}
  </select>`;
}
const ESTADOEXT = ['','ok','repintado','choque','raya','picado','rajado'];
const ESTADOINT = ['','ok','roto','falta','sucio'];
const ESTADOMEC = ['','ok','falla','N/A'];

/* ── Formulario de peritaje completo ── */
function rPeritajeForm(car) {
  const p = car.peritaje || {};
  const estadoOpts = v => ['','ok','falla','falta','N/A'].map(o=>`<option value="${o}"${p[v]===o?' selected':''}>${o||'—'}</option>`).join('');
  const sel = (name, opts) => `<select name="${name}">${opts.map(o=>`<option value="${o}"${p[name]===o?' selected':''}>${o||'—'}</option>`).join('')}</select>`;

  return `
  <div class="form-section">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap;gap:8px">
      <div class="form-title" style="margin:0">Peritaje — ${esc(car.brand)} ${esc(car.model)} ${car.year}${car.patente?' ['+esc(car.patente)+']':''}</div>
      <button type="button" class="btn sm" onclick="selectedCarId=null;render()">← Volver a lista</button>
    </div>

    <form onsubmit="savePeritaje(event)">

      <!-- A — Exterior y equipamiento -->
      <div class="hint-box">
        <div class="hint-label">A — Exterior y equipamiento</div>
        <div class="fg4">
          <div class="fg"><label>Gato y llave</label>${sel('gatoLlave',['','ok','falta'])}</div>
          <div class="fg"><label>Rueda auxiliar</label>${sel('ruedaAux',['','ok','falta'])}</div>
          <div class="fg"><label>Matafuego</label>${sel('matafuego',['','ok','falta'])}</div>
          <div class="fg"><label>Balizas</label>${sel('balizas',['','ok','falta'])}</div>
        </div>
        <div class="fg4">
          <div class="fg"><label>Antirrobos</label>${sel('antirrobos',['','ok','falta'])}</div>
          <div class="fg"><label>Alarma</label>${sel('alarma',['','ok','falta','falla'])}</div>
          <div class="fg"><label>Segunda llave</label>${sel('segundaLlave',['','ok','falta'])}</div>
          <div class="fg"><label>Manual unidad</label>${sel('manualUnidad',['','ok','falta'])}</div>
        </div>
        <div class="fg4">
          <div class="fg"><label>Audio</label>${sel('audio',['','ok','falla','falta'])}</div>
          <div class="fg"><label>Calefacción</label>${sel('calefaccion',['','ok','falla'])}</div>
          <div class="fg"><label>Aire acondicionado</label>${sel('ac',['','ok','falla','N/A'])}</div>
          <div class="fg"><label>Vidrios eléctricos</label>${sel('vidriosElec',['','ok','falla','N/A'])}</div>
        </div>
        <div class="fg4">
          <div class="fg"><label>Cierre centralizado</label>${sel('cierreCentral',['','ok','falla'])}</div>
          <div class="fg"><label>Cinturón seguridad</label>${sel('cinturon',['','ok','falla'])}</div>
          <div class="fg"><label>Freno de mano</label>${sel('frenoMano',['','ok','falla'])}</div>
          <div class="fg"></div>
        </div>
        <div class="fg"><label>Observaciones exteriores</label><textarea name="obsExt">${esc(p.obsExt||'')}</textarea></div>
        <div class="fg2">
          <div class="fg"><label>% Desgaste carrocería</label><input type="number" name="desgasteCarroceria" min="0" max="100" value="${p.desgasteCarroceria||''}" placeholder="0-100 %"></div>
          <div class="fg"><label>Costo estimado A ($)</label><input type="number" name="costoA" min="0" value="${p.costoA||''}" placeholder="$"></div>
        </div>
      </div>

      <!-- B — Motor -->
      <div class="hint-box">
        <div class="hint-label">B — Motor y transmisión</div>
        <div class="fg3">
          <div class="fg"><label>Estado motor</label>${sel('motor',['','ok','falla','observar'])}</div>
          <div class="fg"><label>Caja AT</label>${sel('cajaAT',['','ok','falla','N/A'])}</div>
          <div class="fg"><label>Embrague</label>${sel('embrague',['','ok','falla','N/A'])}</div>
        </div>
        <div class="fg3">
          <div class="fg"><label>4x4</label>${sel('cuatroX4',['','ok','falla','N/A'])}</div>
          <div class="fg"><label>Diferencial</label>${sel('diferencial',['','ok','falla','N/A'])}</div>
          <div class="fg"><label>Último mantenimiento</label><input type="text" name="mantenimiento" value="${esc(p.mantenimiento||'')}" placeholder="km o fecha"></div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Observaciones motor</label><textarea name="obsMotor">${esc(p.obsMotor||'')}</textarea></div>
          <div class="fg"><label>Costo estimado B ($)</label><input type="number" name="costoB" min="0" value="${p.costoB||''}" placeholder="$"></div>
        </div>
      </div>

      <!-- C — Frenos y tren -->
      <div class="hint-box">
        <div class="hint-label">C — Frenos, tren delantero y suspensión</div>
        <div class="fg3">
          <div class="fg"><label>Frenos delanteros</label>${sel('frenos',['','ok','falla','desgaste'])}</div>
          <div class="fg"><label>Frenos traseros</label>${sel('frenosTraseros',['','ok','falla','desgaste'])}</div>
          <div class="fg"><label>Tren delantero</label>${sel('trenDelant',['','ok','falla','desgaste'])}</div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Amortiguadores</label>${sel('amortiguadores',['','ok','falla','desgaste'])}</div>
          <div class="fg"><label>Dirección</label>${sel('direccion',['','ok','falla'])}</div>
          <div class="fg"><label>Neumáticos</label>${sel('neumaticos',['','ok','desgaste','falla'])}</div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Observaciones frenos/tren</label><textarea name="obsC">${esc(p.obsC||'')}</textarea></div>
          <div class="fg"><label>Costo estimado C ($)</label><input type="number" name="costoC" min="0" value="${p.costoC||''}" placeholder="$"></div>
        </div>
      </div>

      <!-- D — Sistema eléctrico / DTC -->
      <div class="hint-box">
        <div class="hint-label">D — Sistema eléctrico y diagnóstico DTC</div>
        <div class="fg4">
          <div class="fg"><label>ABS</label>${sel('abs',['','ok','falla'])}</div>
          <div class="fg"><label>Luz motor</label>${sel('motorLuz',['','ok','falla'])}</div>
          <div class="fg"><label>Airbag</label>${sel('airbag',['','ok','falla'])}</div>
          <div class="fg"><label>Trans. automática</label>${sel('transLuz',['','ok','falla','N/A'])}</div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Código de falla DTC</label><input type="text" name="dtcCode" value="${esc(p.dtcCode||'')}" placeholder="P0XXX, C0XXX..."></div>
          <div class="fg"><label>Batería</label>${sel('bateria',['','ok','falla','débil'])}</div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Observaciones eléctrico</label><textarea name="obsD">${esc(p.obsD||'')}</textarea></div>
          <div class="fg"><label>Costo estimado D ($)</label><input type="number" name="costoD" min="0" value="${p.costoD||''}" placeholder="$"></div>
        </div>
      </div>

      <!-- E — Interior -->
      <div class="hint-box">
        <div class="hint-label">E — Interior y tapizado</div>
        <div class="fg3">
          <div class="fg"><label>Butaca delantera izq.</label>${sel('butacaIzq',['','ok','roto','manchado'])}</div>
          <div class="fg"><label>Butaca delantera der.</label>${sel('butacaDer',['','ok','roto','manchado'])}</div>
          <div class="fg"><label>Asiento trasero</label>${sel('asientoTras',['','ok','roto','manchado'])}</div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Tapizado puertas</label>${sel('tapizPuertas',['','ok','roto','desgaste'])}</div>
          <div class="fg"><label>Tapizado techo</label>${sel('tapizTecho',['','ok','manchado','caído'])}</div>
          <div class="fg"><label>Bandeja trasera</label>${sel('bandejaT',['','ok','falta','roto'])}</div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Observaciones interior</label><textarea name="obsE">${esc(p.obsE||'')}</textarea></div>
          <div class="fg"><label>Costo estimado E ($)</label><input type="number" name="costoE" min="0" value="${p.costoE||''}" placeholder="$"></div>
        </div>
      </div>

      <!-- Totales y firma -->
      <div class="hint-box">
        <div class="hint-label">Resumen de costos y firma</div>
        <div class="fg3">
          <div class="fg"><label>Costo total reparaciones ($)</label><input type="number" name="costoTotal" min="0" value="${p.costoTotal||''}" placeholder="$"></div>
          <div class="fg"><label>De toma / precio compra ($)</label><input type="number" name="deToma" min="0" value="${p.deToma||''}" placeholder="$"></div>
          <div class="fg"><label>Peritador</label><input type="text" name="peritador" value="${esc(p.peritador||'')}" placeholder="Nombre del peritador"></div>
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
    const cls = val==='ok'?'ok':val==='falla'||val==='roto'||val==='falta'||val==='VENCIDA'?'bad':'warn';
    return `<span class="pcheck-val ${cls}">${val}</span>`;
  };
  const row = (label, val) => `
    <div class="pcheck-row">
      <div class="pcheck-label">${label}</div>
      ${v(val)}
    </div>`;

  const total  = p.costoTotal ? `$${(+p.costoTotal).toLocaleString('es-AR')}` : '—';
  const deToma = p.deToma     ? `$${(+p.deToma).toLocaleString('es-AR')}`     : '—';

  return `
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-weight:600;font-size:15px">${esc(car.brand)} ${esc(car.model)} ${car.year}${car.patente?' ['+esc(car.patente)+']':''}</div>
        <div style="font-size:12px;color:var(--text-3)">${car.tipo} · ${car.trans}${car.km?' · '+fk(car.km):''}</div>
        ${p.peritador?`<div style="font-size:11px;color:var(--text-3);margin-top:2px">Peritador: ${esc(p.peritador)}</div>`:''}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${p.costoTotal?`<span class="badge bg-red">Reparaciones: ${total}</span>`:''}
        ${p.deToma?`<span class="badge bg-gold">De toma: ${deToma}</span>`:''}
        <button class="btn sm" onclick="selectedCarId='${car.id}';render()">✏️ Editar peritaje</button>
      </div>
    </div>

    <div class="peritaje-grid">
      <div class="peritaje-section">
        <div class="peritaje-section-title">A — Equipamiento</div>
        ${row('Gato y llave', p.gatoLlave)}
        ${row('Rueda auxiliar', p.ruedaAux)}
        ${row('Alarma', p.alarma)}
        ${row('Audio', p.audio)}
        ${row('Aire acond.', p.ac)}
        ${row('Cierre centr.', p.cierreCentral)}
        ${p.obsExt?`<div style="font-size:11px;color:var(--text-3);margin-top:6px;font-style:italic">"${esc(p.obsExt)}"</div>`:''}
      </div>
      <div class="peritaje-section">
        <div class="peritaje-section-title">B — Motor</div>
        ${row('Motor', p.motor)}
        ${row('Caja AT', p.cajaAT)}
        ${row('Embrague', p.embrague)}
        ${row('4x4', p.cuatroX4)}
        ${p.mantenimiento?`${row('Último mant.', p.mantenimiento)}`:''}
        ${p.costoB?`<div style="font-size:11px;color:var(--text-3);margin-top:6px">Est. B: $${(+p.costoB).toLocaleString('es-AR')}</div>`:''}
      </div>
      <div class="peritaje-section">
        <div class="peritaje-section-title">C — Frenos / Tren</div>
        ${row('Frenos', p.frenos)}
        ${row('Tren delant.', p.trenDelant)}
        ${row('Amortiguadores', p.amortiguadores)}
        ${row('Dirección', p.direccion)}
        ${p.costoC?`<div style="font-size:11px;color:var(--text-3);margin-top:6px">Est. C: $${(+p.costoC).toLocaleString('es-AR')}</div>`:''}
      </div>
      <div class="peritaje-section">
        <div class="peritaje-section-title">D — Eléctrico / DTC</div>
        ${row('ABS', p.abs)}
        ${row('Luz motor', p.motorLuz)}
        ${row('Airbag', p.airbag)}
        ${p.dtcCode?`${row('Código DTC', p.dtcCode)}`:''}
        ${p.costoD?`<div style="font-size:11px;color:var(--text-3);margin-top:6px">Est. D: $${(+p.costoD).toLocaleString('es-AR')}</div>`:''}
      </div>
    </div>

    <div class="peritaje-section" style="margin-top:10px">
      <div class="peritaje-section-title">E — Interior</div>
      <div class="fg3" style="margin:0">
        <div>${row('Butaca izq.', p.butacaIzq)}</div>
        <div>${row('Butaca der.', p.butacaDer)}</div>
        <div>${row('Asiento tras.', p.asientoTras)}</div>
      </div>
      ${p.obsE?`<div style="font-size:11px;color:var(--text-3);margin-top:6px;font-style:italic">"${esc(p.obsE)}"</div>`:''}
      ${p.costoE?`<div style="font-size:11px;color:var(--text-3);margin-top:4px">Est. E: $${(+p.costoE).toLocaleString('es-AR')}</div>`:''}
    </div>
  </div>`;
}

/* ── Render principal ── */
function render() {
  /* Si hay un vehículo seleccionado, mostrar su formulario o resumen */
  if (selectedCarId) {
    const car = S.cars.find(c=>c.id===selectedCarId);
    if (!car) { selectedCarId=null; render(); return; }
    document.getElementById('view').innerHTML = rPeritajeForm(car);
    return;
  }

  /* Lista de todos los vehículos con peritaje o sin él */
  const disponibles = S.cars.filter(c=>c.status==='disponible');
  const otros       = S.cars.filter(c=>c.status!=='disponible');

  let html = `
  <div class="section-head">
    <div class="section-title">Peritaje de vehículos</div>
    <span class="badge bg-gold">${S.cars.filter(c=>c.peritaje&&Object.keys(c.peritaje).length>0).length} peritados de ${S.cars.length}</span>
  </div>

  <div style="font-size:13px;color:var(--text-3);margin-bottom:1rem">
    Seleccioná un vehículo para cargar o editar su peritaje.
  </div>

  ${S.cars.length===0?`
  <div class="empty">
    <div class="empty-icon">📋</div>
    <strong>Sin vehículos en stock</strong>
    <div style="font-size:13px;margin-top:4px">Primero cargá vehículos en la sección Vehículos.</div>
  </div>`:'' }`;

  if (disponibles.length > 0) {
    html += `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3);margin-bottom:8px;font-weight:600">Disponibles</div>`;
    disponibles.forEach(car => {
      const hasP = car.peritaje && Object.keys(car.peritaje).length > 0;
      html += hasP ? rPeritajeResumen(car) : `
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-weight:600">${esc(car.brand)} ${esc(car.model)} ${car.year}${car.patente?' ['+esc(car.patente)+']':''}</div>
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
              <span class="badge ${car.status==='vendido'?'bg-green':'bg-orange'}">${car.status}</span>
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
// Si viene con ?id=X en la URL, pre-seleccionar ese vehículo
const urlCarId = getCarIdFromURL();
if (urlCarId && S.cars.find(c=>c.id===urlCarId)) {
  selectedCarId = urlCarId;
}
render();
