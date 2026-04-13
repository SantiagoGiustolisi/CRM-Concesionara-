/* ═══════════════════════════════════════════════════════════════
   NEIFERT CRM — js/gestoria.js
   Módulo: Gestoría (vehículos + equipo)
   ═══════════════════════════════════════════════════════════════ */
 
/* ── Estado local ── */
let addMiembroOpen  = false;
let editMiembroId   = null;
let activeTab       = 'vehiculos';
let gestoriaCarId   = null;
let verGestoriaId   = null;
let gFilterStatus   = '';
 
const ROLES_SUGERIDOS = ['Administrador','Jefe de Ventas','Vendedor','Peritador','Recepcionista','Gestor','Otro'];
 
const GESTORIA_ITEMS = [
  { key: 'form08',          label: 'Formulario 08',                                  desc: 'Firmado en el registro correspondiente de radicación o ante escribano público y legalizado por el colegio (firma cónyuge si corresponde)' },
  { key: 'verificPolicial', label: 'Verificación policial',                          desc: '' },
  { key: 'multasNac',       label: 'Informe de multas nacionales',                   desc: 'Actualizado a la fecha solicitada' },
  { key: 'dominioHist',     label: 'Informe Estado Dominio Histórico de Titularidad',desc: 'Actualizado a la fecha solicitada' },
  { key: 'libreDeudas',     label: 'Libre deudas y multas municipales',              desc: 'Actualizado a la fecha solicitada' },
  { key: 'titulo',          label: 'Título automotor',                               desc: '' },
  { key: 'cedulas',         label: 'Cédulas de identificación',                      desc: '' },
  { key: 'identificacion',  label: 'Identificación (verde) Autorizados (azules)',    desc: '' },
];
 
/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */
 
function getGestoria(car) {
  if (!car.gestoria) {
    car.gestoria = { estado: 'pendiente', items: {}, notas: '', fechaInicio: '', fechaCierre: '' };
  }
  return car.gestoria;
}
 
function gestoriaProgress(car) {
  const g     = getGestoria(car);
  const done  = GESTORIA_ITEMS.filter(i => g.items[i.key]?.checked).length;
  const total = GESTORIA_ITEMS.length;
  return { done, total, pct: Math.round((done / total) * 100) };
}
 
function autoUpdateEstado(car) {
  const g = getGestoria(car);
  const { done, total } = gestoriaProgress(car);
  if (done === total) g.estado = 'completa';
  else if (done > 0)  g.estado = 'en_proceso';
  else                g.estado = 'pendiente';
}
 
function gestoriaBadge(car) {
  if (!car.gestoria) return `<span class="badge bg-gray">Sin iniciar</span>`;
  const { done, total } = gestoriaProgress(car);
  const e = car.gestoria.estado;
  if (e === 'completa')   return `<span class="badge bg-green">✓ Completa</span>`;
  if (e === 'en_proceso') return `<span class="badge bg-orange">⏳ En proceso ${done}/${total}</span>`;
  return `<span class="badge bg-gray">Sin iniciar</span>`;
}
 
/* ═══════════════════════════════════════════════════════════════
   SOLICITAR TURNO DESDE GESTORÍA
   Redirige a alertas.html con tipo "Turno" preseleccionado
   ═══════════════════════════════════════════════════════════════ */
 
function setITVGestoria(carId, status) {
  const car = S.cars.find(c => c.id === carId);
  if (!car) return;
  car.itv = status;
  if (status === 'si') car.itvVenc = '';
  save();
  renderGestoriaModal();
  renderVehiculosList();
}

function setITVDateGestoria(carId, date) {
  const car = S.cars.find(c => c.id === carId);
  if (!car) return;
  car.itvVenc = date;
  save();
}

function solicitarTurnoDesdeGestoria(carId, itemKey, itemLabel) {
  const car = S.cars.find(c => c.id === carId);
  const contexto = {
    tipo: 'turno',
    titulo: 'Solicitar turno',
    info: car
      ? `Gestoría · ${car.brand} ${car.model} ${car.year}${car.patente ? ' · ' + car.patente : ''} · ${itemLabel}`
      : itemLabel,
  };
  sessionStorage.setItem('alertas_prefill', JSON.stringify(contexto));
  window.location.href = 'alertas.html';
}
 
/* ═══════════════════════════════════════════════════════════════
   MODAL EDITAR GESTORÍA (checklist interactivo)
   ═══════════════════════════════════════════════════════════════ */
 
function openGestoriaModal(carId) {
  gestoriaCarId = carId;
  renderGestoriaModal();
}
 
function closeGestoriaModal() {
  gestoriaCarId = null;
  const el = document.getElementById('gestoria-modal-overlay');
  if (el) el.remove();
}
 
function renderGestoriaModal() {
  const existing = document.getElementById('gestoria-modal-overlay');
  if (existing) existing.remove();
 
  const car = S.cars.find(c => c.id === gestoriaCarId);
  if (!car) return;
 
  const g         = getGestoria(car);
  const prog      = gestoriaProgress(car);
  const progColor = prog.pct === 100 ? 'var(--green)' : prog.pct > 0 ? 'var(--orange)' : 'var(--text-3)';
 
  const itemRows = GESTORIA_ITEMS.map(item => {
    const iv      = g.items[item.key] || { checked: false, fecha: '', obs: '' };
    const checked = !!iv.checked;
 
    return `
    <div id="grow-${item.key}" style="
      display:flex;align-items:flex-start;gap:14px;
      padding:14px 16px;margin-bottom:8px;border-radius:var(--radius);
      border:1px solid ${checked ? 'rgba(76,175,125,0.25)' : 'var(--border)'};
      background:${checked ? 'rgba(76,175,125,0.04)' : 'var(--surface-2)'};
      transition:all .2s">
 
      <!-- Checkbox visual (clickeable) -->
      <div data-checkbox onclick="toggleItem('${item.key}')" style="
        width:22px;height:22px;border-radius:5px;flex-shrink:0;margin-top:2px;
        background:${checked ? 'var(--green)' : 'var(--surface-3)'};
        border:2px solid ${checked ? 'var(--green)' : 'var(--border-md)'};
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;transition:all .15s;font-size:12px;font-weight:800;color:#fff;
        user-select:none">
        ${checked ? '✓' : ''}
      </div>
 
      <!-- Contenido -->
      <div style="flex:1;min-width:0">
        <div data-label onclick="toggleItem('${item.key}')" style="
          font-size:13px;font-weight:600;
          color:${checked ? 'var(--green)' : 'var(--text)'};
          margin-bottom:${item.desc ? '3px' : '10px'};
          cursor:pointer;user-select:none">
          ${esc(item.label)}
        </div>
        ${checked && iv.marcadoPor ? `<div style="font-size:10px;color:var(--green);margin-top:-6px;margin-bottom:4px">✓ Marcado por <strong>${esc(iv.marcadoPor)}</strong>${iv.fecha ? ' · ' + iv.fecha : ''}</div>` : ''}
        ${item.desc ? `<div style="font-size:11px;color:var(--text-3);margin-bottom:10px">${esc(item.desc)}</div>` : ''}
 
        <!-- BOTÓN SOLICITAR TURNO: visible solo cuando el ítem NO está chequeado -->
        <div data-btn-turno style="margin-bottom:7px;display:${checked ? 'none' : 'block'}">
          <button class="btn sm" onclick="solicitarTurnoDesdeGestoria('${car.id}','${item.key}','${esc(item.label)}')"
            style="font-size:11px;padding:4px 12px;display:inline-flex;align-items:center;gap:5px">
            📅 Solicitar turno
          </button>
        </div>
 
        <input type="text" placeholder="Observación (opcional)…" value="${esc(iv.obs || '')}"
          onchange="setItemObs('${item.key}',this.value)"
          style="width:100%;font-size:12px;padding:6px 10px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:var(--font)">
      </div>
    </div>`;
  }).join('');
 
  const html = `
  <div class="modal-overlay" id="gestoria-modal-overlay" onclick="if(event.target.id==='gestoria-modal-overlay')closeGestoriaModal()">
    <div class="modal modal-wide" style="max-width:660px;padding:0;overflow:hidden;display:flex;flex-direction:column;max-height:92vh">
 
      <!-- Header fijo -->
      <div style="padding:1.4rem 1.75rem 1rem;border-bottom:1px solid var(--border);flex-shrink:0">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:12px">
          <div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);font-weight:600;margin-bottom:4px">Gestoría del vehículo</div>
            <div class="modal-title" style="margin-bottom:4px;font-size:20px">
              ${esc(car.brand)} ${esc(car.model)} <span style="color:var(--text-3);font-size:16px;font-weight:400">${car.year}</span>
            </div>
            ${car.patente ? `<div style="font-size:12px;color:var(--text-3)">Patente: <strong style="color:var(--text-2)">${esc(car.patente)}</strong></div>` : ''}
          </div>
          <button class="btn sm" onclick="closeGestoriaModal()">✕ Cerrar</button>
        </div>
 
        <!-- Barra de progreso -->
        <div style="margin-top:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.08em">Progreso de documentación</span>
            <span id="gestoria-prog-count" style="font-size:13px;font-weight:700;color:${progColor}">${prog.done}/${prog.total} ítems</span>
          </div>
          <div style="height:6px;background:var(--surface-3);border-radius:3px;overflow:hidden">
            <div id="gestoria-prog-bar" style="height:100%;width:${prog.pct}%;background:${progColor};border-radius:3px;transition:width .4s ease"></div>
          </div>
        </div>
      </div>
 
      <!-- Cuerpo scrolleable -->
      <div style="padding:1.25rem 1.75rem;overflow-y:auto;flex:1">

        <!-- Sección ITV -->
        ${(()=>{
          const itvOk      = car.itv === 'si';
          const itvNo      = car.itv === 'no';
          const dITV       = itvNo && car.itvVenc ? Math.ceil((new Date(car.itvVenc) - new Date()) / (1000*60*60*24)) : null;
          const itvVencida = dITV !== null && dITV <= 0;
          const itvProxima = dITV !== null && dITV > 0 && dITV <= 30;
          const borde      = itvVencida ? 'rgba(224,85,85,0.45)' : itvProxima ? 'rgba(224,144,85,0.4)' : itvOk ? 'rgba(76,175,125,0.3)' : 'var(--border-md)';
          const fondo      = itvVencida ? 'rgba(224,85,85,0.05)' : itvProxima ? 'rgba(224,144,85,0.05)' : itvOk ? 'rgba(76,175,125,0.04)' : 'var(--surface-2)';

          return `
        <div style="padding:14px 16px;border-radius:var(--radius);border:1px solid ${borde};background:${fondo};margin-bottom:1.25rem">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3);font-weight:600;margin-bottom:10px">
            🚗 Estado ITV
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <button onclick="setITVGestoria('${car.id}','si')" class="btn sm${itvOk?' success':''}"
              style="${itvOk?'font-weight:700':''}">✓ Al día</button>
            <button onclick="setITVGestoria('${car.id}','no')" class="btn sm"
              style="${itvNo?'border-color:var(--red);color:var(--red);font-weight:700':''}">⚠️ Vencida / Pendiente</button>
            ${itvNo ? `
            <input type="date" value="${car.itvVenc||''}" onchange="setITVDateGestoria('${car.id}',this.value)"
              style="font-size:12px;padding:5px 9px;border:1px solid var(--border-md);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-family:var(--font)">
            <button onclick="solicitarTurnoITV('${car.id}')" class="btn sm"
              style="border-color:var(--gold-border);color:var(--gold)">📅 Solicitar turno ITV</button>
            ` : ''}
          </div>
          ${itvVencida ? `<div style="font-size:11px;color:var(--red);margin-top:8px">⚠️ ITV vencida hace ${Math.abs(dITV)} día${Math.abs(dITV)>1?'s':''}.</div>` : ''}
          ${itvProxima ? `<div style="font-size:11px;color:var(--orange);margin-top:8px">⏳ Vence en ${dITV} día${dITV>1?'s':''}.</div>` : ''}
        </div>`;
        })()}

        <!-- Título checklist -->
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3);font-weight:600;margin-bottom:10px">
          Documentación requerida &nbsp;·&nbsp; <span style="color:var(--text-3);font-weight:400;text-transform:none;letter-spacing:0">hacé clic en cada ítem para marcarlo</span>
        </div>
 
        <div id="gestoria-checklist">${itemRows}</div>
 
        <!-- Notas -->
        <div style="margin-top:1rem">
          <label style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em;display:block;margin-bottom:5px">Notas generales</label>
          <textarea placeholder="Notas, aclaraciones, referencias…" onchange="setGestoriaNotas(this.value)"
            style="width:100%;font-family:var(--font);font-size:13px;padding:9px 12px;background:var(--surface-2);border:1px solid var(--border-md);border-radius:var(--radius);color:var(--text);resize:vertical;min-height:70px">${esc(g.notas || '')}</textarea>
        </div>
      </div>
 
      <!-- Footer fijo -->
      <div style="padding:1rem 1.75rem;border-top:1px solid var(--border);flex-shrink:0;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <span id="gestoria-guardado-info" style="font-size:12px;color:var(--text-3)"></span>
        <div style="display:flex;gap:8px">
          <button class="btn" onclick="closeGestoriaModal()">Cerrar</button>
          <button class="btn primary" onclick="guardarGestoria()">💾 Guardar gestoría</button>
        </div>
      </div>
    </div>
  </div>`;
 
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el.firstElementChild);
}
 
/* ── Guardar gestoría con auditoría ── */
function guardarGestoria() {
  const car = S.cars.find(c => c.id === gestoriaCarId);
  if (!car) return;
  const g = getGestoria(car);
  g.ultimoGuardadoPor  = getSession().nombre;
  g.fechaUltimoGuardado = todayISO();
  autoUpdateEstado(car);
  save();
  toast('Gestoría guardada por ' + getSession().nombre, 'success');
  closeGestoriaModal();
  renderVehiculosList();
}

/* ── Acciones del checklist ── */
function toggleItem(key) {
  const car = S.cars.find(c => c.id === gestoriaCarId);
  if (!car) return;
  const g = getGestoria(car);
  if (!g.items[key]) g.items[key] = { checked: false, fecha: '', obs: '' };
  g.items[key].checked = !g.items[key].checked;
  if (g.items[key].checked) {
    if (!g.items[key].fecha) g.items[key].fecha = todayISO();
    g.items[key].marcadoPor = getSession().nombre;
  } else {
    g.items[key].marcadoPor = null;
  }
  autoUpdateEstado(car);
  save();
 
  // Actualizar solo el ítem en el DOM sin re-renderizar el modal completo (evita scroll al top)
  const checked = g.items[key].checked;
  const row = document.getElementById('grow-' + key);
  if (row) {
    row.style.border = '1px solid ' + (checked ? 'rgba(76,175,125,0.25)' : 'var(--border)');
    row.style.background = checked ? 'rgba(76,175,125,0.04)' : 'var(--surface-2)';
 
    const checkbox = row.querySelector('[data-checkbox]');
    if (checkbox) {
      checkbox.style.background = checked ? 'var(--green)' : 'var(--surface-3)';
      checkbox.style.border = '2px solid ' + (checked ? 'var(--green)' : 'var(--border-md)');
      checkbox.textContent = checked ? '✓' : '';
    }
 
    const label = row.querySelector('[data-label]');
    if (label) label.style.color = checked ? 'var(--green)' : 'var(--text)';
 
    // Ocultar botón al chequear, mostrar al deschequear
    const btnTurno = row.querySelector('[data-btn-turno]');
    if (btnTurno) btnTurno.style.display = checked ? 'none' : 'block';
  }
 
  // Actualizar barra de progreso y contador en el header del modal
  const prog = gestoriaProgress(car);
  const progColor = prog.pct === 100 ? 'var(--green)' : prog.pct > 0 ? 'var(--orange)' : 'var(--text-3)';
  const progBar = document.getElementById('gestoria-prog-bar');
  if (progBar) { progBar.style.width = prog.pct + '%'; progBar.style.background = progColor; }
  const progCount = document.getElementById('gestoria-prog-count');
  if (progCount) { progCount.textContent = prog.done + '/' + prog.total + ' ítems'; progCount.style.color = progColor; }
 
  renderVehiculosList();
  if (verGestoriaId) renderVerGestoria();
}
 
function setItemObs(key, val) {
  const car = S.cars.find(c => c.id === gestoriaCarId);
  if (!car) return;
  const g = getGestoria(car);
  if (!g.items[key]) g.items[key] = { checked: false, fecha: '', obs: '' };
  g.items[key].obsEditadoPor = getSession().nombre;
  g.items[key].obs = val;
  save();
}
 
function setGestoriaNotas(val) {
  const car = S.cars.find(c => c.id === gestoriaCarId);
  if (!car) return;
  getGestoria(car).notas = val; save();
}
 
function marcarTodosListo() {
  const car = S.cars.find(c => c.id === gestoriaCarId);
  if (!car) return;
  const g = getGestoria(car);
  GESTORIA_ITEMS.forEach(item => {
    if (!g.items[item.key]) g.items[item.key] = { checked: false, fecha: '', obs: '' };
    g.items[item.key].checked = true;
    if (!g.items[item.key].fecha) g.items[item.key].fecha = todayISO();
  });
  autoUpdateEstado(car);
  save();
  renderGestoriaModal();
  renderVehiculosList();
  if (verGestoriaId) renderVerGestoria();
  toast('Todos los ítems marcados como listos', 'success');
}
 
/* ═══════════════════════════════════════════════════════════════
   MODAL VER GESTORÍA (solo lectura)
   ═══════════════════════════════════════════════════════════════ */
 
function openVerGestoria(carId) {
  verGestoriaId = carId;
  renderVerGestoria();
}
 
function closeVerGestoria() {
  verGestoriaId = null;
  const el = document.getElementById('ver-gestoria-overlay');
  if (el) el.remove();
}
 
function renderVerGestoria() {
  const existing = document.getElementById('ver-gestoria-overlay');
  if (existing) existing.remove();
 
  const car = S.cars.find(c => c.id === verGestoriaId);
  if (!car) return;
 
  const g         = getGestoria(car);
  const prog      = gestoriaProgress(car);
  const progColor = prog.pct === 100 ? 'var(--green)' : prog.pct > 0 ? 'var(--orange)' : 'var(--text-3)';
  const estadoColor = g.estado === 'completa' ? 'var(--green)' : g.estado === 'en_proceso' ? 'var(--orange)' : 'var(--text-3)';
  const estadoBg    = g.estado === 'completa' ? 'var(--green-bg)' : g.estado === 'en_proceso' ? 'var(--orange-bg)' : 'var(--surface-3)';
  const estadoBord  = g.estado === 'completa' ? 'var(--green-border)' : g.estado === 'en_proceso' ? 'rgba(224,144,85,0.3)' : 'var(--border)';
  const estadoLabel = g.estado === 'completa' ? '✓ Completa' : g.estado === 'en_proceso' ? '⏳ En proceso' : '— Sin iniciar';
 
  const itemRows = GESTORIA_ITEMS.map(item => {
    const iv      = g.items[item.key] || {};
    const checked = !!iv.checked;
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:11px 14px;border-bottom:1px solid var(--border)">
      <div style="
        width:20px;height:20px;border-radius:4px;flex-shrink:0;
        background:${checked ? 'var(--green)' : 'var(--surface-3)'};
        border:2px solid ${checked ? 'var(--green)' : 'var(--border-md)'};
        display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:800;color:#fff">
        ${checked ? '✓' : ''}
      </div>
      <div style="flex:1;min-width:0">
        <span style="font-size:13px;color:${checked ? 'var(--text)' : 'var(--text-3)'};font-weight:${checked ? '500' : '400'}">${esc(item.label)}</span>
        ${checked && iv.marcadoPor ? `<div style="font-size:10px;color:var(--green);margin-top:2px">por <strong>${esc(iv.marcadoPor)}</strong>${iv.fecha ? ' · ' + iv.fecha : ''}</div>` : ''}
        ${iv.obs ? `<div style="font-size:11px;color:var(--text-3);margin-top:2px;font-style:italic">"${esc(iv.obs)}"</div>` : ''}
      </div>
      <span style="font-size:10px;font-weight:600;flex-shrink:0;padding:2px 8px;border-radius:100px;
        background:${checked ? 'var(--green-bg)' : 'var(--surface-3)'};
        color:${checked ? 'var(--green)' : 'var(--text-3)'};
        border:1px solid ${checked ? 'var(--green-border)' : 'var(--border)'}">
        ${checked ? 'Listo' : 'Pendiente'}
      </span>
    </div>`;
  }).join('');
 
  const pendientes = GESTORIA_ITEMS.filter(i => !g.items[i.key]?.checked);
 
  const html = `
  <div class="modal-overlay" id="ver-gestoria-overlay" onclick="if(event.target.id==='ver-gestoria-overlay')closeVerGestoria()">
    <div class="modal modal-wide" style="max-width:580px;padding:0;overflow:hidden;display:flex;flex-direction:column;max-height:92vh">
 
      <!-- Header -->
      <div style="padding:1.4rem 1.75rem 1rem;border-bottom:1px solid var(--border);flex-shrink:0">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:12px">
          <div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);font-weight:600;margin-bottom:4px">Estado de gestoría</div>
            <div class="modal-title" style="margin-bottom:4px;font-size:20px">
              ${esc(car.brand)} ${esc(car.model)} <span style="color:var(--text-3);font-size:16px;font-weight:400">${car.year}</span>
            </div>
            ${car.patente ? `<div style="font-size:12px;color:var(--text-3)">Patente: <strong style="color:var(--text-2)">${esc(car.patente)}</strong></div>` : ''}
          </div>
          <button class="btn sm" onclick="closeVerGestoria()">✕ Cerrar</button>
        </div>
 
        <!-- Estado + progreso -->
        <div style="margin-top:14px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <span style="font-size:12px;font-weight:600;padding:4px 12px;border-radius:100px;background:${estadoBg};color:${estadoColor};border:1px solid ${estadoBord}">
            ${estadoLabel}
          </span>
          <div style="flex:1;min-width:100px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.07em">Documentación</span>
              <span style="font-size:12px;font-weight:700;color:${progColor}">${prog.done}/${prog.total}</span>
            </div>
            <div style="height:5px;background:var(--surface-3);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${prog.pct}%;background:${progColor};border-radius:3px"></div>
            </div>
          </div>
        </div>
      </div>
 
      <!-- Cuerpo -->
      <div style="overflow-y:auto;flex:1;padding:1rem 1.75rem">
 
        ${prog.pct === 100 ? `
        <div style="padding:10px 14px;background:var(--green-bg);border:1px solid var(--green-border);border-radius:var(--radius);margin-bottom:1rem">
          <div style="font-size:13px;font-weight:600;color:var(--green)">✓ Gestoría completa — toda la documentación está lista.</div>
        </div>` : pendientes.length > 0 ? `
        <div style="padding:10px 14px;background:var(--orange-bg);border:1px solid rgba(224,144,85,0.25);border-radius:var(--radius);margin-bottom:1rem">
          <div style="font-size:11px;font-weight:600;color:var(--orange);margin-bottom:4px">⚠ ${pendientes.length} documento${pendientes.length>1?'s':''} pendiente${pendientes.length>1?'s':''}</div>
          <div style="font-size:12px;color:var(--text-2)">${pendientes.map(p => esc(p.label)).join(' · ')}</div>
        </div>` : ''}
 
        <!-- Lista ítems -->
        <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:1rem">
          <div style="padding:10px 14px;border-bottom:1px solid var(--border);font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-3);font-weight:600">
            Documentación requerida
          </div>
          ${itemRows}
        </div>
 
        ${g.notas ? `
        <div style="padding:12px 14px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius)">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-3);font-weight:600;margin-bottom:6px">Notas</div>
          <div style="font-size:13px;color:var(--text-2);font-style:italic">"${esc(g.notas)}"</div>
        </div>` : ''}
      </div>
 
      <!-- Footer -->
      <div style="padding:1rem 1.75rem;border-top:1px solid var(--border);flex-shrink:0;display:flex;justify-content:flex-end;gap:8px">
        <button class="btn" onclick="closeVerGestoria()">Cerrar</button>
        <button class="btn primary" onclick="closeVerGestoria();openGestoriaModal('${car.id}')">✏ Editar gestoría</button>
      </div>
    </div>
  </div>`;
 
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el.firstElementChild);
}
 
/* ═══════════════════════════════════════════════════════════════
   TAB VEHÍCULOS
   ═══════════════════════════════════════════════════════════════ */
 
function renderVehiculosList() {
  const container = document.getElementById('tab-vehiculos-content');
  if (!container) return;
 
  const cars = S.cars;
 
  if (cars.length === 0) {
    container.innerHTML = `
    <div class="empty">
      <div class="empty-icon">🚗</div>
      <strong>Sin vehículos cargados</strong>
      <div style="font-size:13px;margin-top:4px">Cargá vehículos en la sección de Vehículos para gestionar su documentación aquí.</div>
    </div>`;
    return;
  }
 
  const sinIniciar = cars.filter(c => !c.gestoria || c.gestoria.estado === 'pendiente').length;
  const enProceso  = cars.filter(c => c.gestoria?.estado === 'en_proceso').length;
  const completa   = cars.filter(c => c.gestoria?.estado === 'completa').length;
 
  let filtered = cars;
  if (gFilterStatus === 'sin_iniciar') filtered = cars.filter(c => !c.gestoria || c.gestoria.estado === 'pendiente');
  if (gFilterStatus === 'en_proceso')  filtered = cars.filter(c => c.gestoria?.estado === 'en_proceso');
  if (gFilterStatus === 'completa')    filtered = cars.filter(c => c.gestoria?.estado === 'completa');
 
  let html = `
  <!-- Filtros -->
  <div style="display:flex;gap:6px;margin-bottom:1rem;flex-wrap:wrap">
    <button class="btn sm${gFilterStatus===''?' primary':''}" onclick="gFilterStatus='';renderVehiculosList()">Todos (${cars.length})</button>
    <button class="btn sm" onclick="gFilterStatus='sin_iniciar';renderVehiculosList()"
      style="${gFilterStatus==='sin_iniciar'?'color:var(--text);border-color:var(--border-hover);background:var(--surface-3)':''}">Sin iniciar (${sinIniciar})</button>
    <button class="btn sm" onclick="gFilterStatus='en_proceso';renderVehiculosList()"
      style="${gFilterStatus==='en_proceso'?'color:var(--orange);border-color:rgba(224,144,85,0.4);background:var(--orange-bg)':''}">En proceso (${enProceso})</button>
    <button class="btn sm" onclick="gFilterStatus='completa';renderVehiculosList()"
      style="${gFilterStatus==='completa'?'color:var(--green);border-color:var(--green-border);background:var(--green-bg)':''}">Completa (${completa})</button>
  </div>`;
 
  if (filtered.length === 0) {
    html += `<div style="text-align:center;padding:2rem;color:var(--text-3);font-size:13px">No hay vehículos en este estado.</div>`;
    container.innerHTML = html;
    return;
  }
 
  filtered.forEach(car => {
    const prog      = gestoriaProgress(car);
    const g         = car.gestoria;
    const progColor = prog.pct === 100 ? 'var(--green)' : prog.pct > 0 ? 'var(--orange)' : 'var(--text-3)';
    const borderColor = !g || g.estado === 'pendiente' ? 'var(--border)'
      : g.estado === 'en_proceso' ? 'rgba(224,144,85,0.25)'
      : 'rgba(76,175,125,0.25)';
 
    const faltantes = g
      ? GESTORIA_ITEMS.filter(i => !g.items[i.key]?.checked).map(i => i.label)
      : GESTORIA_ITEMS.map(i => i.label);
 
    html += `
    <div style="background:var(--surface);border:1px solid ${borderColor};border-radius:var(--radius-lg);padding:1.2rem 1.4rem;margin-bottom:10px;transition:border-color .15s">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:12px;flex-wrap:wrap">
 
        <!-- Info vehículo -->
        <div style="display:flex;gap:14px;align-items:center;flex:1;min-width:0">
          <div style="width:44px;height:44px;border-radius:var(--radius);background:var(--gold-bg);border:1px solid var(--gold-border);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🚗</div>
          <div>
            <div style="font-size:15px;font-weight:600;color:var(--text)">${esc(car.brand)} ${esc(car.model)}</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:1px">
              ${car.year}${car.patente ? ` · <strong style="color:var(--text-2)">${esc(car.patente)}</strong>` : ''}${car.tipo ? ` · ${esc(car.tipo)}` : ''}
            </div>
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
              ${car.status ? `<span class="badge ${car.status==='disponible'?'bg-green':car.status==='reservado'?'bg-orange':'bg-gray'}">${car.status}</span>` : ''}
            </div>
          </div>
        </div>
 
        <!-- Progreso + botones -->
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0">
          <div style="text-align:right">
            <div style="font-size:13px;font-weight:600;color:${progColor};line-height:1">${prog.done}/${prog.total} items</div>
            ${g && g.ultimoGuardadoPor
              ? `<div style="font-size:10px;color:var(--text-3);margin-top:3px">por <strong style="color:var(--text-2)">${esc(g.ultimoGuardadoPor)}</strong>${g.fechaUltimoGuardado ? ' · ' + g.fechaUltimoGuardado : ''}</div>`
              : `<div style="font-size:10px;color:var(--text-3);margin-top:3px">Sin gestión guardada</div>`}
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn sm" onclick="openVerGestoria('${car.id}')">👁 Ver gestoría</button>
            <button class="btn primary sm" onclick="openGestoriaModal('${car.id}')">📋 Gestionar</button>
          </div>
        </div>
      </div>
 
      <!-- Barra de progreso -->
      <div style="margin-top:12px;height:4px;background:var(--surface-3);border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${prog.pct}%;background:${progColor};border-radius:2px;transition:width .4s"></div>
      </div>
 
      <!-- Ítems pendientes (preview) -->
      ${faltantes.length > 0 && prog.pct < 100 ? `
      <div style="margin-top:10px;display:flex;gap:5px;flex-wrap:wrap;align-items:center">
        <span style="font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-right:2px">Pendiente:</span>
        ${faltantes.slice(0, 3).map(l => `<span style="font-size:10px;color:var(--text-3);background:var(--surface-2);border:1px solid var(--border);border-radius:100px;padding:2px 8px">⬜ ${esc(l)}</span>`).join('')}
        ${faltantes.length > 3 ? `<span style="font-size:10px;color:var(--text-3)">+${faltantes.length - 3} más</span>` : ''}
      </div>` : ''}
    </div>`;
  });
 
  container.innerHTML = html;
}
 
/* ═══════════════════════════════════════════════════════════════
   CRUD EQUIPO
   ═══════════════════════════════════════════════════════════════ */
 
function addMiembro(e) {
  e.preventDefault();
  const f = e.target;
  S.jerarquia.push({
    id: uid(), nombre: f.jnombre.value.trim(), apellido: f.japellido.value.trim(),
    rol: f.jrol.value.trim(), telefono: f.jtelefono.value.trim(), email: f.jemail.value.trim(),
    fechaTurno: f.fechaTurno.value, verificPolicial: f.verificPolicial.value,
    notas: f.jnotas.value.trim(), date: today(), creadoPor: getSession().nombre,
  });
  addMiembroOpen = false;
  checkTurnoAlerts();
  save(); render();
  toast('Miembro agregado', 'success');
}
 
function saveEditMiembro(e) {
  e.preventDefault();
  const f = e.target;
  const m = S.jerarquia.find(j => j.id === editMiembroId);
  if (!m) return;
  m.nombre = f.jnombre.value.trim(); m.apellido = f.japellido.value.trim();
  m.rol = f.jrol.value.trim(); m.telefono = f.jtelefono.value.trim();
  m.email = f.jemail.value.trim(); m.fechaTurno = f.fechaTurno.value;
  m.verificPolicial = f.verificPolicial.value; m.notas = f.jnotas.value.trim();
  editMiembroId = null;
  save(); render();
  toast('Miembro actualizado', 'success');
}
 
function editMiembro(id)    { editMiembroId = id; addMiembroOpen = false; render(); }
function cancelEditMiembro(){ editMiembroId = null; render(); }
 
function delMiembro(id) {
  if (!confirm('¿Eliminar este miembro del equipo?')) return;
  S.jerarquia = S.jerarquia.filter(j => j.id !== id);
  save(); render();
}
 
function rMiembroForm(m) {
  const edit = !!m;
  return `
  <div class="form-section">
    <div class="form-title">${edit ? 'Editar miembro' : 'Agregar miembro al equipo'}</div>
    <form onsubmit="${edit ? 'saveEditMiembro(event)' : 'addMiembro(event)'}">
      <div class="hint-box">
        <div class="hint-label">Datos personales</div>
        <div class="fg2">
          <div class="fg"><label>Nombre *</label><input type="text" name="jnombre" required placeholder="Juan" value="${edit ? esc(m.nombre) : ''}"></div>
          <div class="fg"><label>Apellido *</label><input type="text" name="japellido" required placeholder="Pérez" value="${edit ? esc(m.apellido) : ''}"></div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Rol / Cargo</label>
            <input type="text" name="jrol" placeholder="Vendedor" value="${edit ? esc(m.rol || '') : ''}" list="roles-list">
            <datalist id="roles-list">${ROLES_SUGERIDOS.map(r => `<option value="${r}">`).join('')}</datalist>
          </div>
          <div class="fg"><label>Teléfono</label><input type="tel" name="jtelefono" placeholder="351 555-0000" value="${edit ? esc(m.telefono || '') : ''}"></div>
          <div class="fg"><label>Email</label><input type="email" name="jemail" placeholder="juan@neifert.com" value="${edit ? esc(m.email || '') : ''}"></div>
        </div>
      </div>
      <div class="hint-box">
        <div class="hint-label">Turno y verificación</div>
        <div class="fg2">
          <div class="fg"><label>Fecha de turno</label>
            <input type="date" name="fechaTurno" value="${edit && m.fechaTurno ? m.fechaTurno : ''}">
          </div>
          <div class="fg"><label>Verificación policial</label>
            <select name="verificPolicial">
              <option value="">— sin datos —</option>
              <option value="pendiente"${edit && m.verificPolicial === 'pendiente' ? ' selected' : ''}>⏳ Pendiente</option>
              <option value="aprobada"${edit && m.verificPolicial === 'aprobada'   ? ' selected' : ''}>✓ Aprobada</option>
              <option value="rechazada"${edit && m.verificPolicial === 'rechazada' ? ' selected' : ''}>✗ Rechazada</option>
            </select>
          </div>
        </div>
        <div class="fg"><label>Notas</label>
          <textarea name="jnotas" placeholder="Información adicional, horarios, observaciones...">${edit && m.notas ? esc(m.notas) : ''}</textarea>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="btn" onclick="${edit ? 'cancelEditMiembro()' : 'addMiembroOpen=false;render()'}">Cancelar</button>
        <button type="submit" class="btn primary">${edit ? 'Guardar cambios' : 'Guardar miembro'}</button>
      </div>
    </form>
  </div>`;
}
 
function renderEquipoTab() {
  const container = document.getElementById('tab-equipo-content');
  if (!container) return;
 
  let html = `
  <div style="display:flex;justify-content:flex-end;margin-bottom:1rem">
    <button class="btn primary" onclick="addMiembroOpen=true;editMiembroId=null;render()">+ Agregar miembro</button>
  </div>
  ${addMiembroOpen ? rMiembroForm() : ''}
  ${editMiembroId  ? rMiembroForm(S.jerarquia.find(j => j.id === editMiembroId)) : ''}`;
 
  if (S.jerarquia.length === 0 && !addMiembroOpen) {
    html += `
    <div class="empty">
      <div class="empty-icon">◈</div>
      <strong>Sin miembros cargados</strong>
      <div style="font-size:13px;margin-top:4px">Agregá miembros del equipo para gestionar roles, turnos y verificaciones.</div>
    </div>`;
  }
 
  S.jerarquia.forEach(j => {
    if (editMiembroId === j.id) return;
    const vPolOk  = j.verificPolicial === 'aprobada';
    const vPolBad = j.verificPolicial === 'rechazada';
    const diasTurno    = j.fechaTurno ? Math.ceil((new Date(j.fechaTurno) - new Date()) / (1000 * 60 * 60 * 24)) : null;
    const turnoProximo = diasTurno !== null && diasTurno >= 0 && diasTurno <= 7;
 
    html += `
    <div class="jerarq-card">
      <div class="jerarq-header">
        <div>
          <div class="jerarq-name">${esc(j.nombre)} ${esc(j.apellido)}</div>
          <div class="jerarq-role">${esc(j.rol || '—')}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          ${j.verificPolicial ? `<span class="badge ${vPolOk ? 'bg-green' : vPolBad ? 'bg-red' : 'bg-orange'}">
            ${vPolOk ? '✓ Verificado' : vPolBad ? '✗ Rechazado' : '⏳ Pendiente'}
          </span>` : ''}
          ${turnoProximo ? `<span class="badge ${diasTurno === 0 ? 'bg-red' : 'bg-gold'}">
            Turno ${diasTurno === 0 ? 'HOY' : 'en ' + diasTurno + 'd'}
          </span>` : ''}
          ${j.telefono ? whatsappBtn(j.telefono, j.nombre + ' ' + j.apellido, true) : ''}
          <button class="btn sm" onclick="editMiembro('${j.id}')">Editar</button>
          <button class="btn sm danger" onclick="delMiembro('${j.id}')">Eliminar</button>
        </div>
      </div>
      <div class="jerarq-body">
        ${j.telefono   ? `<div class="jerarq-field"><div class="jerarq-field-label">Teléfono</div><div class="jerarq-field-val">${esc(j.telefono)}</div></div>` : ''}
        ${j.email      ? `<div class="jerarq-field"><div class="jerarq-field-label">Email</div><div class="jerarq-field-val">${esc(j.email)}</div></div>` : ''}
        ${j.verificPolicial ? `<div class="jerarq-field"><div class="jerarq-field-label">Verif. policial</div><div class="jerarq-field-val" style="color:${vPolOk?'var(--green)':vPolBad?'var(--red)':'var(--orange)'}">${j.verificPolicial}</div></div>` : ''}
        ${j.fechaTurno ? `<div class="jerarq-field"><div class="jerarq-field-label">Fecha de turno</div><div class="jerarq-field-val" style="color:${turnoProximo?'var(--gold)':'var(--text-2)'}">${j.fechaTurno}</div></div>` : ''}
        ${j.creadoPor  ? `<div class="jerarq-field"><div class="jerarq-field-label">Cargado por</div><div class="jerarq-field-val">${esc(j.creadoPor)}</div></div>` : ''}
        ${j.notas      ? `<div class="jerarq-field" style="grid-column:1/-1"><div class="jerarq-field-label">Notas</div><div class="jerarq-field-val">${esc(j.notas)}</div></div>` : ''}
      </div>
    </div>`;
  });
 
  container.innerHTML = html;
}
 
/* ═══════════════════════════════════════════════════════════════
   RENDER PRINCIPAL
   ═══════════════════════════════════════════════════════════════ */
 
function render() {
  document.getElementById('view').innerHTML = `
  <div class="section-head">
    <div class="section-title">Gestoría</div>
  </div>
 
  <div id="tab-vehiculos-content"></div>`;

  renderVehiculosList();
}
 
/* ── Boot ── */
bootApp('gestoria');
render();