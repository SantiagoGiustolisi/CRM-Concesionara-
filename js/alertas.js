/* ═══════════════════════════════════════════════════════════════
   NEIFERT CRM — js/alertas.js
   VERSIÓN ACTUALIZADA — incluye:
     · Alertas manuales (igual que antes)
     · Sección automática de tareas próximas (hoy + 48 h)
     · Sección automática de cumpleaños de clientes (hoy + 7 días)
   ═══════════════════════════════════════════════════════════════ */

let addAlertaOpen = false;
let activeTab     = 'activas';
let alertasSort   = 'proximas'; // 'proximas' | 'recientes'

const ICON_MAP  = { birthday:'🎉', itv:'⚠️', turno:'📅', general:'🔔' };
const COLOR_MAP = { birthday:'purple', itv:'red', turno:'gold', general:'blue' };

/* ── Helpers de fecha (locales para no depender del orden de carga) ── */

/**
 * Diferencia en días enteros entre HOY (00:00) y una fecha ISO.
 * Negativo = pasada, 0 = hoy, positivo = futura.
 */
function _diffDays(isoDate) {
  if (!isoDate) return null;
  const hoy   = new Date(); hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(isoDate + 'T00:00:00');
  return Math.round((fecha - hoy) / (1000 * 60 * 60 * 24));
}

/**
 * Calcula la edad a partir de una fecha de nacimiento ISO.
 * Devuelve null si no se puede calcular.
 */
function _calcEdad(fechaNac) {
  if (!fechaNac) return null;
  const hoy  = new Date();
  const nac  = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m  = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad >= 0 ? edad : null;
}

/**
 * Días hasta el próximo cumpleaños (0 = hoy, 1 = mañana, etc.)
 * Utiliza la función daysUntil de app.js si está disponible,
 * pero también puede calcularlo de forma autónoma.
 */
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

/* ════════════════════════════════════════
   CRUD — Alertas manuales (sin cambios)
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
    creadoPor:   getSession().nombre,
    done:        false,
    date:        today(),
  });
  addAlertaOpen = false;
  save();
  render();
  toast('Alerta creada', 'success');
}

function marcarAlerta(id, done) {
  const a = S.alertas.find(x => x.id === id);
  if (a) a.done = done;
  save(); render();
}

function delAlerta(id) {
  if (!confirm('¿Eliminar esta alerta?')) return;
  S.alertas = S.alertas.filter(a => a.id !== id);
  save(); render();
}

/* ════════════════════════════════════════
   FORMULARIO — Nueva alerta (sin cambios)
   ════════════════════════════════════════ */
function rAlertaForm() {
  return `
  <div class="form-section">
    <div class="form-title">Nueva alerta / recordatorio</div>
    <form onsubmit="addAlerta(event)">
      <div class="fg2">
        <div class="fg"><label>Tipo</label>
          <select name="tipoAlerta">
            <option value="general">🔔 General</option>
            <option value="birthday">🎉 Cumpleaños</option>
            <option value="itv">⚠️ ITV</option>
            <option value="turno">📅 Turno</option>
          </select>
        </div>
        <div class="fg"><label>Fecha</label><input type="date" name="fecha" value="${todayISO()}"></div>
      </div>
      <div class="fg"><label>Título *</label><input type="text" name="titulo" placeholder="Descripción corta de la alerta" required></div>
      <div class="fg"><label>Descripción / detalles</label><textarea name="descripcion" placeholder="Información adicional, contexto..."></textarea></div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="btn" onclick="addAlertaOpen=false;render()">Cancelar</button>
        <button type="submit" class="btn primary">Crear alerta</button>
      </div>
    </form>
  </div>`;
}

/* ════════════════════════════════════════
   ITEM — Alerta manual (sin cambios)
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
        · Por <strong>${esc(a.creadoPor)}</strong>
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
   NUEVO — Sección de tareas próximas
   ════════════════════════════════════════ */

/**
 * Devuelve las tareas pendientes que vencen HOY o en las próximas 48 horas.
 */
function _getTareasProximas() {
  return _loadTareasAlertas()
    .filter(t => {
      if (t.done) return false;
      const d = _diffDays(t.fecha);
      return d !== null && d >= 0 && d <= 2; // 0 = hoy, 1 = mañana, 2 = pasado
    })
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

/** Render de la sección de tareas próximas */
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
   NUEVO — Sección de cumpleaños de clientes
   ════════════════════════════════════════ */

/**
 * Devuelve clientes con cumpleaños hoy o en los próximos 7 días,
 * junto con metadata calculada (días, edad).
 */
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

/** Render de la sección de cumpleaños */
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

  /* Resumen rápido de alertas manuales */
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

  /* Conteos para toast de cumpleaños de hoy */
  const cumpleHoy = _getCumpleaniosProximos().filter(c => c.diasHasta === 0);

  let html = `
  <div class="section-head">
    <div class="section-title">Alertas y recordatorios</div>
    <button class="btn primary" onclick="addAlertaOpen=true;render()">+ Nueva alerta</button>
  </div>

  ${addAlertaOpen ? rAlertaForm() : ''}

  <!-- Resumen rápido alertas manuales -->
  ${badgesHtml ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1rem">${badgesHtml}</div>` : ''}

  <!-- ── NUEVO: cumpleaños próximos (automático desde clientes) ── -->
  ${rCumpleanios()}

  <!-- ── NUEVO: tareas próximas (automático desde crm_tareas) ── -->
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
        // Ordenar por fecha más próxima; sin fecha van al final
        sorted = [...pendientes].sort((a, b) => {
          const fa = a.fecha ? new Date(a.fecha) : new Date('9999-12-31');
          const fb = b.fecha ? new Date(b.fecha) : new Date('9999-12-31');
          return fa - fb;
        });
      } else {
        // Más recientes primero (por date de creación)
        const orden = ['birthday', 'itv', 'turno', 'general'];
        sorted = [...pendientes].sort((a, b) => orden.indexOf(a.tipo) - orden.indexOf(b.tipo));
      }
      html += sorted.map(a => rAlertItem(a)).join('');
    }
  } else {
    /* Tab completadas */
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

  /* ── Toast automático: cumpleaños de hoy ── */
  if (cumpleHoy.length > 0) {
    const nombres = cumpleHoy.map(c => c.name).join(', ');
    toast(`🎉 Cumpleaños hoy: ${nombres}`, 'success');
  }
}

/* ── Boot ── */
bootApp('alertas');
render();