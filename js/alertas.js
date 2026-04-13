/* ═══════════════════════════════════════════════════════════════
   NEIFERT CRM — js/alertas.js
   VERSIÓN ACTUALIZADA — incluye:
     · Alertas manuales (igual que antes)
     · Sección automática de tareas próximas (hoy + 48 h)
     · Sección automática de cumpleaños de clientes (hoy + 7 días)
     · Prefill automático desde Gestoría (botón "Solicitar turno")
   ═══════════════════════════════════════════════════════════════ */

let addAlertaOpen = false;
let activeTab = 'activas';
let alertasSort = 'proximas'; // 'proximas' | 'recientes'
let alertasFiltro = 'todas';   // 'todas' | 'birthday' | 'itv' | 'turno' | 'general'

/* Prefill que viene de gestoría.js vía sessionStorage */
let _prefillTurno = null;

const ICON_MAP = { birthday: '🎉', itv: '⚠️', turno: '📅', general: '🔔' };
const COLOR_MAP = { birthday: 'purple', itv: 'red', turno: 'gold', general: 'blue' };

/* ── Helpers de fecha (locales para no depender del orden de carga) ── */

function _diffDays(isoDate) {
  if (!isoDate) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(isoDate + 'T00:00:00');
  return Math.round((fecha - hoy) / (1000 * 60 * 60 * 24));
}

function _calcEdad(fechaNac) {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
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
    id: uid(),
    tipo: f.tipoAlerta.value,
    titulo: f.titulo.value.trim(),
    descripcion: f.descripcion.value.trim(),
    fecha: f.fecha.value,
    creadoPor: getSession().nombre,
    fechaCreacion: todayISO(),
    done: false,
    date: today(),
  });
  addAlertaOpen = false;
  _prefillTurno = null; // limpiar prefill al guardar
  save();
  render();
  toast('Alerta creada', 'success');
}

function marcarAlerta(id, done) {
  const a = S.alertas.find(x => x.id === id);
  if (a) {
    a.done = done;
    a.marcadoPor = getSession().nombre;
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
  const pTipo = _prefillTurno?.tipo || 'general';
  const pInfo = _prefillTurno?.info || '';

  /* Opciones del select con el tipo prefillado marcado */
  const opcionesTipo = [
    { val: 'general', label: '🔔 General' },
    { val: 'birthday', label: '🎉 Cumpleaños' },
    { val: 'itv', label: '⚠️ ITV' },
    { val: 'turno', label: '📅 Turno' },
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
   · Borde naranja  si vence en ≤ 2 días (48 h)
   · Borde rojo     si ya venció
   · Borde del tipo si tiene más tiempo
   ════════════════════════════════════════ */

/* Colores de borde por tipo (estado normal) */
const _TIPO_BORDER = {
  birthday: 'var(--purple-border)',
  itv: 'rgba(224,85,85,0.45)',
  turno: 'var(--gold-border)',
  general: 'rgba(85,130,224,0.35)',
};

function rAlertItem(a) {
  /* ── Urgencia por fecha ── */
  const dias = _diffDays(a.fecha);  // null si sin fecha
  const urgente = dias !== null && dias >= 0 && dias <= 2;  // ≤ 48 h, no vencida
  const vencida = dias !== null && dias < 0;

  /* Borde izquierdo: rojo si vencida, naranja si urgente, color del tipo si normal */
  const borderColor = vencida
    ? 'var(--red)'
    : urgente
      ? 'var(--orange, #e09055)'
      : (_TIPO_BORDER[a.tipo] || 'var(--border)');

  /* Fondo suave de urgencia */
  const urgBg = urgente
    ? 'background:rgba(224,144,85,0.06);'
    : vencida
      ? 'background:rgba(224,85,85,0.05);'
      : '';

  /* Badge de urgencia que se muestra junto a la fecha */
  let urgBadge = '';
  if (!a.done) {
    if (vencida) {
      urgBadge = `<span class="badge bg-red" style="font-size:10px">⚠️ Vencida hace ${Math.abs(dias)} día${Math.abs(dias) > 1 ? 's' : ''}</span>`;
    } else if (urgente) {
      const horasLabel = dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : 'En 2 días';
      urgBadge = `<span class="badge" style="background:rgba(224,144,85,0.18);color:var(--orange,#c97a30);border:1px solid rgba(224,144,85,0.4);font-size:10px">🔥 ${horasLabel}</span>`;
    }
  }

  return `
  <div class="alert-item ${a.done ? 'done' : ''}"
       style="border-left:3px solid ${borderColor};${urgBg}">
    <div class="alert-icon ${a.tipo}" style="font-size:18px">${ICON_MAP[a.tipo] || '🔔'}</div>
    <div class="alert-body">
      <div class="alert-title" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        ${esc(a.titulo)}
        ${urgBadge}
      </div>
      <div class="alert-sub">
        ${a.descripcion ? esc(a.descripcion) : ''}
        ${a.fecha ? ' · 📅 ' + a.fecha : ''}
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
      return d !== null && d >= 0 && d <= 1;
    })
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

function rTareasProximas() {
  const tareas = _getTareasProximas();
  if (tareas.length === 0) return '';

  const items = tareas.map(t => {
    const d = _diffDays(t.fecha);
    const label = d === 0 ? 'Hoy' : 'Mañana';
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
      📋 Tareas (hoy y mañana)
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
      edad: _calcEdad(c.fechaCumple),
    }))
    .filter(c => c.diasHasta !== null && c.diasHasta >= 0 && c.diasHasta <= 1)
    .sort((a, b) => a.diasHasta - b.diasHasta);
}

function rCumpleanios() {
  const clientes = _getCumpleaniosProximos();
  if (clientes.length === 0) return '';

  const items = clientes.map(c => {
    const esHoy = c.diasHasta === 0;
    const label = esHoy ? '¡Hoy!' : c.diasHasta === 1 ? 'Mañana' : `En ${c.diasHasta} días`;
    const badge = esHoy ? 'bg-purple' : 'bg-blue';
    const edad = c.edad !== null ? `· Cumple ${c.edad} años` : '';

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
      🎂 Cumpleaños (hoy y mañana)
    </div>
    ${items}
  </div>`;
}

/* ════════════════════════════════════════
   RENDER PRINCIPAL
   ════════════════════════════════════════ */
function render() {
  const pendientes = S.alertas.filter(a => !a.done);
  const completadas = S.alertas.filter(a => a.done);

  /* ── Conteo por tipo para los badges del resumen ── */
  const tipos = ['birthday', 'itv', 'turno', 'general'];
  const cntTipo = {};
  tipos.forEach(t => { cntTipo[t] = pendientes.filter(a => a.tipo === t).length; });

  const badgesConf = {
    birthday: { clase: 'bg-purple', label: (n) => `🎉 ${n} cumpleaños` },
    itv: { clase: 'bg-red', label: (n) => `⚠️ ${n} ITV` },
    turno: { clase: 'bg-gold', label: (n) => `📅 ${n} turno${n > 1 ? 's' : ''}` },
    general: { clase: 'bg-blue', label: (n) => `🔔 ${n} general${n > 1 ? 'es' : ''}` },
  };
  const badgesHtml = tipos
    .map(tipo => {
      const n = cntTipo[tipo];
      if (n === 0) return '';
      const b = badgesConf[tipo];
      return `<span class="badge ${b.clase}">${b.label(n)}</span>`;
    }).join('');

  /* ── Conteo urgentes (≤ 48 h) para badge extra ── */
  const urgentes = pendientes.filter(a => {
    const d = _diffDays(a.fecha);
    return d !== null && d >= 0 && d <= 2;
  }).length;

  const cumpleHoy = _getCumpleaniosProximos().filter(c => c.diasHasta === 0);

  /* ── Botones de filtro por tipo ── */
  const filtrosBtns = [
    { val: 'todas', icon: '🔔', label: `Todas (${pendientes.length})` },
    { val: 'birthday', icon: '🎉', label: `Cumpleaños (${cntTipo.birthday})` },
    { val: 'itv', icon: '⚠️', label: `ITV (${cntTipo.itv})` },
    { val: 'turno', icon: '📅', label: `Turno (${cntTipo.turno})` },
    { val: 'general', icon: '🔔', label: `General (${cntTipo.general})` },
  ].filter(f => f.val === 'todas' || cntTipo[f.val] > 0) // ocultar tipos vacíos
    .map(f => `<button class="btn sm${alertasFiltro === f.val ? ' active' : ''}"
      onclick="alertasFiltro='${f.val}';render()">${f.icon} ${f.label}</button>`)
    .join('');

  let html = `
  <div class="section-head">
    <div class="section-title">Alertas y recordatorios</div>
    <button class="btn primary" onclick="addAlertaOpen=true;_prefillTurno=null;render()">+ Nueva alerta</button>
  </div>

  ${addAlertaOpen ? rAlertaForm() : ''}

  <!-- Resumen rápido -->
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1rem;align-items:center">
    ${badgesHtml}
    ${urgentes > 0 ? `<span class="badge" style="background:rgba(224,144,85,0.18);color:var(--orange,#c97a30);border:1px solid rgba(224,144,85,0.4)">🔥 ${urgentes} vence en 48 h</span>` : ''}
  </div>

  <!-- Cumpleaños próximos -->
  ${rCumpleanios()}

  <!-- Tareas próximas -->
  ${rTareasProximas()}

  <!-- Alertas manuales -->
  <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
              color:var(--text-3);margin-bottom:10px;padding-bottom:4px;
              border-bottom:1px solid var(--border)">
    🔔 Alertas manuales
  </div>

  <!-- Tabs activas / completadas -->
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
    <div class="tabs" style="margin-bottom:0">
      <button class="tab-btn ${activeTab === 'activas' ? 'active' : ''}" onclick="activeTab='activas';render()">
        Activas (${pendientes.length})
      </button>
      <button class="tab-btn ${activeTab === 'done' ? 'active' : ''}" onclick="activeTab='done';render()">
        Completadas (${completadas.length})
      </button>
    </div>
    <div style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text-3)">
      Orden:
      <button class="btn sm${alertasSort === 'proximas' ? ' active' : ''}" onclick="alertasSort='proximas';render()">📅 Más próximas</button>
      <button class="btn sm${alertasSort === 'recientes' ? ' active' : ''}" onclick="alertasSort='recientes';render()">🕐 Por tipo</button>
    </div>
  </div>

  <!-- Filtros por tipo (solo en tab activas) -->
  ${activeTab === 'activas' && pendientes.length > 0 ? `
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;padding:10px 12px;
              background:var(--surface-2);border-radius:var(--radius);border:1px solid var(--border)">
    <span style="font-size:11px;color:var(--text-3);font-weight:600;align-self:center;margin-right:2px">FILTRAR:</span>
    ${filtrosBtns}
  </div>` : ''}`;

  /* ── Tab activas ── */
  if (activeTab === 'activas') {
    /* Aplicar filtro por tipo */
    let lista = alertasFiltro === 'todas'
      ? pendientes
      : pendientes.filter(a => a.tipo === alertasFiltro);

    /* Aplicar orden */
    if (alertasSort === 'proximas') {
      lista = [...lista].sort((a, b) => {
        const fa = a.fecha ? new Date(a.fecha) : new Date('9999-12-31');
        const fb = b.fecha ? new Date(b.fecha) : new Date('9999-12-31');
        return fa - fb;
      });
    } else {
      const orden = ['birthday', 'itv', 'turno', 'general'];
      lista = [...lista].sort((a, b) => orden.indexOf(a.tipo) - orden.indexOf(b.tipo));
    }

    if (lista.length === 0) {
      const msgFiltro = alertasFiltro !== 'todas'
        ? `No hay alertas activas de tipo "${badgesConf[alertasFiltro]?.label(0).replace(/\d+ /, '') || alertasFiltro}".`
        : '¡Todo al día! No hay alertas pendientes.';
      html += `
      <div class="empty">
        <div class="empty-icon">✓</div>
        <strong>${alertasFiltro !== 'todas' ? 'Sin resultados para este filtro' : 'Sin alertas activas'}</strong>
        <div style="font-size:13px;margin-top:4px">${msgFiltro}</div>
        ${alertasFiltro !== 'todas' ? `<button class="btn sm" style="margin-top:10px" onclick="alertasFiltro='todas';render()">Ver todas</button>` : ''}
      </div>`;
    } else {
      html += lista.map(a => rAlertItem(a)).join('');
    }

  } else {
    /* ── Tab completadas ── */
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