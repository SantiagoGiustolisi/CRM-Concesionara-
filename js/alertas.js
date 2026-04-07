/* ═══════════════════════════════════════════════════════════════
   NEIFERT CRM — js/alertas.js
   VERSIÓN ACTUALIZADA — incluye:
     · Alertas manuales (igual que antes)
     · Sección automática de tareas próximas (hoy + 48 h)
     · Sección automática de cumpleaños de clientes (hoy + 7 días)
     · Prefill automático desde Gestoría (botón "Solicitar turno")
   ═══════════════════════════════════════════════════════════════ */
 
let addAlertaOpen = false;
let activeTab     = 'activas';
let alertasSort   = 'proximas'; // 'proximas' | 'recientes'
 
/* Prefill que viene de gestoría.js vía sessionStorage */
let _prefillTurno = null;
 
const ICON_MAP  = { birthday:'🎉', itv:'⚠️', turno:'📅', general:'🔔' };
const COLOR_MAP = { birthday:'purple', itv:'red', turno:'gold', general:'blue' };
 
/* ── Helpers de fecha (locales para no depender del orden de carga) ── */
 
function _diffDays(isoDate) {
  if (!isoDate) return null;
  const hoy   = new Date(); hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(isoDate + 'T00:00:00');
  return Math.round((fecha - hoy) / (1000 * 60 * 60 * 24));
}
 
function _calcEdad(fechaNac) {
  if (!fechaNac) return null;
  const hoy  = new Date();
  const nac  = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m  = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad >= 0 ? edad : null;
}
 
function _diasHastaCumple(fechaNac) {
  if (!fechaNac) return null;
  return typeof daysUntil === 'function' ? daysUntil(fechaNac) : _calcDiasHastaCumple(fechaNac);
}
function _calcDiasHastaCumple(fechaNac) {
  const d = new Date(fechaNac), n = new Date();
  let next = new Date(n.getFullYear(), d.getMonth(), d.getDate());
  if (next < n) next.setFullYear(next.getFullYear() + 1);
  return Math.ceil((next - n) / (1000 * 60 * 60 * 24));
}
 
/* ── Carga de tareas desde localStorage ── */
function _loadTareasAlertas() {
  try {
    return JSON.parse(localStorage.getItem('crm_tareas') || '[]');
  } catch { return []; }
}
 
/* ═══════════════════════════════════════════════════════════════
   PREFILL DESDE GESTORÍA
   Lee sessionStorage al cargar la página y abre el formulario
   con tipo "turno" y la info del vehículo precargada.
   ═══════════════════════════════════════════════════════════════ */
 
function _checkPrefill() {
  try {
    const raw = sessionStorage.getItem('alertas_prefill');
    if (!raw) return;
    sessionStorage.removeItem('alertas_prefill');
    _prefillTurno = JSON.parse(raw);
    addAlertaOpen = true; // abrir el formulario automáticamente
  } catch (e) {
    _prefillTurno = null;
  }
}
 
/* ════════════════════════════════════════
   CRUD — Alertas manuales
   ════════════════════════════════════════ */
function addAlerta(e) {
  e.preventDefault();
  const f = e.target;
  S.alertas.unshift({
    id:          uid(),
    tipo:        f.tipoAlerta.value,
    titulo:      f.titulo.value.trim(),
    descripcion: f.descripcion.value.trim(),
    fecha:       f.fecha.value,
    creadoPor:    getSession().nombre,
    fechaCreacion: todayISO(),
    done:        false,
    date:        today(),
  });
  addAlertaOpen  = false;
  _prefillTurno  = null; // limpiar prefill al guardar
  save();
  render();
  toast('Alerta creada', 'success');
}
 
function marcarAlerta(id, done) {
  const a = S.alertas.find(x => x.id === id);
  if (a) {
    a.done = done;
    a.marcadoPor   = getSession().nombre;
    a.fechaMarcado = todayISO();
  }
  save(); render();
}
 
function delAlerta(id) {
  if (!confirm('¿Eliminar esta alerta?')) return;
  S.alertas = S.alertas.filter(a => a.id !== id);
  save(); render();
}
 
/* ════════════════════════════════════════
   FORMULARIO — Nueva alerta
   Con soporte para prefill desde gestoría
   ════════════════════════════════════════ */
function rAlertaForm() {
  /* Si hay prefill, usarlo para preseleccionar tipo e info */
  const pTipo  = _prefillTurno?.tipo  || 'general';
  const pInfo  = _prefillTurno?.info  || '';
 
  /* Opciones del select con el tipo prefillado marcado */
  const opcionesTipo = [
    { val: 'general',  label: '🔔 General' },
    { val: 'birthday', label: '🎉 Cumpleaños' },
    { val: 'itv',      label: '⚠️ ITV' },
    { val: 'turno',    label: '📅 Turno' },
  ].map(o => `<option value="${o.val}"${o.val === pTipo ? ' selected' : ''}>${o.label}</option>`).join('');
 
  return `
  <div class="form-section">
    <div class="form-title">Nueva alerta / recordatorio</div>
    <form onsubmit="addAlerta(event)">
      <div class="fg2">
        <div class="fg"><label>Tipo</label>
          <select name="tipoAlerta">
            ${opcionesTipo}
          </select>
        </div>
        <div class="fg"><label>Fecha</label><input type="date" name="fecha" value="${todayISO()}"></div>
      </div>
      <div class="fg"><label>Título *</label>
        <input type="text" name="titulo" placeholder="Descripción corta de la alerta" required
          value="${pTipo === 'turno' && pInfo ? 'Turno gestoría' : ''}">
      </div>
      <div class="fg"><label>Descripción / detalles</label>
        <textarea name="descripcion" placeholder="Información adicional, contexto...">${pInfo ? esc(pInfo) : ''}</textarea>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="btn" onclick="addAlertaOpen=false;_prefillTurno=null;render()">Cancelar</button>
        <button type="submit" class="btn primary">Crear alerta</button>
      </div>
    </form>
  </div>`;
}
 
/* ════════════════════════════════════════
   ITEM — Alerta manual
   ════════════════════════════════════════ */
function rAlertItem(a) {
  return `
  <div class="alert-item ${a.done ? 'done' : ''}">
    <div class="alert-icon ${a.tipo}" style="font-size:18px">${ICON_MAP[a.tipo] || '🔔'}</div>
    <div class="alert-body">
      <div class="alert-title">${esc(a.titulo)}</div>
      <div class="alert-sub">
        ${a.descripcion ? esc(a.descripcion) : ''}
        ${a.fecha ? ' · ' + a.fecha : ''}
        · Creada por <strong>${esc(a.creadoPor)}</strong>${a.fechaCreacion ? ' el ' + a.fechaCreacion : ''}${a.done && a.marcadoPor ? ' · Completada por <strong>' + esc(a.marcadoPor) + '</strong>' + (a.fechaMarcado ? ' el ' + a.fechaMarcado : '') : ''}
      </div>
    </div>
    <div class="alert-actions">
      ${a.refPhone ? whatsappBtn(a.refPhone, a.refName || '', true) : ''}
      ${!a.done
        ? `<button class="btn sm success" onclick="marcarAlerta('${a.id}',true)">✓ Hecho</button>`
        : `<button class="btn sm" onclick="marcarAlerta('${a.id}',false)">Reabrir</button>`}
      <button class="btn sm danger" onclick="delAlerta('${a.id}')">×</button>
    </div>
  </div>`;
}
 
/* ════════════════════════════════════════
   Sección de tareas próximas
   ════════════════════════════════════════ */
function _getTareasProximas() {
  return _loadTareasAlertas()
    .filter(t => {
      if (t.done) return false;
      const d = _diffDays(t.fecha);
      return d !== null && d >= 0 && d <= 2;
    })
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}
 
function rTareasProximas() {
  const tareas = _getTareasProximas();
  if (tareas.length === 0) return '';
 
  const items = tareas.map(t => {
    const d     = _diffDays(t.fecha);
    const label = d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : 'En 2 días';
    const color = d === 0 ? 'var(--gold)' : 'var(--green)';
    const badge = d === 0 ? 'bg-gold' : 'bg-green';
    return `
    <div class="alert-item" style="border-left:3px solid ${color}">
      <div style="font-size:18px">📋</div>
      <div class="alert-body">
        <div class="alert-title">${esc(t.titulo)}</div>
        <div class="alert-sub">
          ${t.descripcion ? esc(t.descripcion) + ' · ' : ''}
          ${t.clienteNombre ? '👤 ' + esc(t.clienteNombre) + ' · ' : ''}
          Por <strong>${esc(t.creadoPor)}</strong>
        </div>
      </div>
      <div class="alert-actions">
        ${t.clientePhone ? whatsappBtn(t.clientePhone, t.clienteNombre || '', true) : ''}
        <span class="badge ${badge}">${label}</span>
        <a href="tareas.html" class="btn sm">Ver tareas</a>
      </div>
    </div>`;
  }).join('');
 
  return `
  <div style="margin-bottom:1.25rem">
    <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
                color:var(--text-3);margin-bottom:8px;padding-bottom:4px;
                border-bottom:1px solid var(--border)">
      📋 Tareas próximas (hoy y mañana)
    </div>
    ${items}
  </div>`;
}
 
/* ════════════════════════════════════════
   Sección de cumpleaños de clientes
   ════════════════════════════════════════ */
function _getCumpleaniosProximos() {
  return S.clients
    .filter(c => c.fechaCumple)
    .map(c => ({
      ...c,
      diasHasta: _diasHastaCumple(c.fechaCumple),
      edad:      _calcEdad(c.fechaCumple),
    }))
    .filter(c => c.diasHasta !== null && c.diasHasta >= 0 && c.diasHasta <= 7)
    .sort((a, b) => a.diasHasta - b.diasHasta);
}
 
function rCumpleanios() {
  const clientes = _getCumpleaniosProximos();
  if (clientes.length === 0) return '';
 
  const items = clientes.map(c => {
    const esHoy  = c.diasHasta === 0;
    const label  = esHoy ? '¡Hoy!' : c.diasHasta === 1 ? 'Mañana' : `En ${c.diasHasta} días`;
    const badge  = esHoy ? 'bg-purple' : 'bg-blue';
    const edad   = c.edad !== null ? `· Cumple ${c.edad} años` : '';
 
    return `
    <div class="alert-item${esHoy ? ' birthday-hoy' : ''}">
      <div style="font-size:18px">${esHoy ? '🎁' : '🎂'}</div>
      <div class="alert-body">
        <div class="alert-title">${esc(c.name)} ${esHoy ? '🎉' : ''}</div>
        <div class="alert-sub">
          ${c.phone}
          ${c.email ? ' · ' + esc(c.email) : ''}
          ${edad}
        </div>
      </div>
      <div class="alert-actions">
        ${whatsappBtn(c.phone, c.name, true)}
        ${esHoy
          ? `<button class="btn sm" style="border-color:var(--purple-border);color:var(--purple)"
               onclick="openWhatsAppBirthday('${esc(c.phone)}','${esc(c.name)}')">🎉 Felicitar</button>`
          : ''}
        <span class="badge ${badge}">${label}</span>
      </div>
    </div>`;
  }).join('');
 
  return `
  <div style="margin-bottom:1.25rem">
    <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
                color:var(--text-3);margin-bottom:8px;padding-bottom:4px;
                border-bottom:1px solid var(--border)">
      🎂 Cumpleaños próximos (7 días)
    </div>
    ${items}
  </div>`;
}
 
/* ════════════════════════════════════════
   RENDER PRINCIPAL
   ════════════════════════════════════════ */
function render() {
  const pendientes  = S.alertas.filter(a => !a.done);
  const completadas = S.alertas.filter(a =>  a.done);
 
  const tipos = ['birthday', 'itv', 'turno', 'general'];
  const badgesConf = {
    birthday: { clase:'bg-purple', label:(n) => `🎉 ${n} cumpleaños` },
    itv:      { clase:'bg-red',    label:(n) => `⚠️ ${n} ITV` },
    turno:    { clase:'bg-gold',   label:(n) => `📅 ${n} turno${n>1?'s':''}` },
    general:  { clase:'bg-blue',   label:(n) => `🔔 ${n} general${n>1?'es':''}` },
  };
  const badgesHtml = tipos
    .map(tipo => {
      const n = pendientes.filter(a => a.tipo === tipo).length;
      if (n === 0) return '';
      const b = badgesConf[tipo];
      return `<span class="badge ${b.clase}">${b.label(n)}</span>`;
    })
    .join('');
 
  const cumpleHoy = _getCumpleaniosProximos().filter(c => c.diasHasta === 0);
 
  let html = `
  <div class="section-head">
    <div class="section-title">Alertas y recordatorios</div>
    <button class="btn primary" onclick="addAlertaOpen=true;_prefillTurno=null;render()">+ Nueva alerta</button>
  </div>
 
  ${addAlertaOpen ? rAlertaForm() : ''}
 
  <!-- Resumen rápido alertas manuales -->
  ${badgesHtml ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1rem">${badgesHtml}</div>` : ''}
 
  <!-- Cumpleaños próximos (automático desde clientes) -->
  ${rCumpleanios()}
 
  <!-- Tareas próximas (automático desde crm_tareas) -->
  ${rTareasProximas()}
 
  <!-- Tabs alertas manuales -->
  <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
              color:var(--text-3);margin-bottom:8px;padding-bottom:4px;
              border-bottom:1px solid var(--border)">
    🔔 Alertas manuales
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
    <div class="tabs" style="margin-bottom:0">
      <button class="tab-btn ${activeTab === 'activas' ? 'active' : ''}" onclick="activeTab='activas';render()">
        Activas (${pendientes.length})
      </button>
      <button class="tab-btn ${activeTab === 'done' ? 'active' : ''}" onclick="activeTab='done';render()">
        Completadas (${completadas.length})
      </button>
    </div>
    <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-3)">
      Ordenar:
      <button class="btn sm${alertasSort==='proximas'?' active':''}" onclick="alertasSort='proximas';render()">📅 Más próximas</button>
      <button class="btn sm${alertasSort==='recientes'?' active':''}" onclick="alertasSort='recientes';render()">🕐 Más recientes</button>
    </div>
  </div>`;
 
  /* Tab activas */
  if (activeTab === 'activas') {
    if (pendientes.length === 0) {
      html += `
      <div class="empty">
        <div class="empty-icon">✓</div>
        <strong>Sin alertas activas</strong>
        <div style="font-size:13px;margin-top:4px">¡Todo al día! No hay alertas pendientes.</div>
      </div>`;
    } else {
      let sorted;
      if (alertasSort === 'proximas') {
        sorted = [...pendientes].sort((a, b) => {
          const fa = a.fecha ? new Date(a.fecha) : new Date('9999-12-31');
          const fb = b.fecha ? new Date(b.fecha) : new Date('9999-12-31');
          return fa - fb;
        });
      } else {
        const orden = ['birthday', 'itv', 'turno', 'general'];
        sorted = [...pendientes].sort((a, b) => orden.indexOf(a.tipo) - orden.indexOf(b.tipo));
      }
      html += sorted.map(a => rAlertItem(a)).join('');
    }
  } else {
    if (completadas.length === 0) {
      html += `
      <div class="empty">
        <div class="empty-icon">○</div>
        <strong>Sin alertas completadas</strong>
      </div>`;
    } else {
      html += completadas.map(a => rAlertItem(a)).join('');
    }
  }
 
  document.getElementById('view').innerHTML = html;
 
  /* Toast automático: cumpleaños de hoy */
  if (cumpleHoy.length > 0) {
    const nombres = cumpleHoy.map(c => c.name).join(', ');
    toast(`🎉 Cumpleaños hoy: ${nombres}`, 'success');
  }
 
  /* Toast informativo si vino desde gestoría */
  if (_prefillTurno) {
    toast('📅 Completá los datos del turno y guardá la alerta', 'info');
  }
}
 
/* ── Boot ── */
bootApp('alertas');
_checkPrefill(); // ← leer prefill de gestoría ANTES del primer render
render();