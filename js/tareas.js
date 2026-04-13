/* ═══════════════════════════════════════════════════════════════
   NEIFERT CRM — js/tareas.js
   ═══════════════════════════════════════════════════════════════ */

let addTareaOpen = false;
let editTareaId = null;
let tareasSort = 'proximas';

const TAREAS_KEY = 'crm_tareas';

function loadTareas() {
  try { return JSON.parse(localStorage.getItem(TAREAS_KEY) || '[]'); }
  catch { return []; }
}
function saveTareas(tareas) {
  try { localStorage.setItem(TAREAS_KEY, JSON.stringify(tareas)); }
  catch (e) { console.warn('Error guardando tareas:', e); }
}

function diffDays(isoDate) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(isoDate + 'T00:00:00');
  return Math.round((fecha - hoy) / (1000 * 60 * 60 * 24));
}

function labelFecha(isoDate) {
  const d = diffDays(isoDate);
  if (d < 0) return `Venció hace ${Math.abs(d)} día${Math.abs(d) > 1 ? 's' : ''}`;
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Mañana';
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function urgencia(isoDate, done) {
  if (done) return 'done';
  const d = diffDays(isoDate);
  if (d < 0) return 'vencida';
  if (d === 0) return 'hoy';
  return 'proxima';
}

function checkTareasVencidas(tareas) {
  const vencidas = tareas.filter(t => !t.done && diffDays(t.fecha) < 0);
  if (vencidas.length > 0) {
    toast(`⚠️ Tenés ${vencidas.length} tarea${vencidas.length > 1 ? 's' : ''} vencida${vencidas.length > 1 ? 's' : ''}`, 'error');
  }
}

/* ════════════════════════════════════════
   CRUD — con redirección a alertas al crear
   ════════════════════════════════════════ */
function addTarea(e) {
  e.preventDefault();
  const f = e.target;
  const selIdx = f.clienteId.value;
  const cliente = selIdx ? S.clients.find(c => c.id === selIdx) : null;

  const tareas = loadTareas();
  tareas.unshift({
    id: uid(),
    titulo: f.titulo.value.trim(),
    descripcion: f.descripcion.value.trim(),
    fecha: f.fecha.value,
    clienteId: cliente ? cliente.id : null,
    clienteNombre: cliente ? cliente.name : null,
    clientePhone: cliente ? cliente.phone : null,
    creadoPor: getSession().nombre,
    done: false,
    createdAt: todayISO(),
  });
  saveTareas(tareas);
  addTareaOpen = false;

  toast('Tarea creada ✓ — redirigiendo a Alertas...', 'success');

  /* Redirigir a alertas después de 800ms para que se vea el toast */
  setTimeout(() => {
    window.location.href = 'alertas.html';
  }, 800);
}

function saveEditTarea(e) {
  e.preventDefault();
  const f = e.target;
  const selIdx = f.clienteId.value;
  const cliente = selIdx ? S.clients.find(c => c.id === selIdx) : null;

  const tareas = loadTareas();
  const tarea = tareas.find(t => t.id === editTareaId);
  if (!tarea) return;

  tarea.titulo = f.titulo.value.trim();
  tarea.descripcion = f.descripcion.value.trim();
  tarea.fecha = f.fecha.value;
  tarea.clienteId = cliente ? cliente.id : null;
  tarea.clienteNombre = cliente ? cliente.name : null;
  tarea.clientePhone = cliente ? cliente.phone : null;

  saveTareas(tareas);
  editTareaId = null;
  render();
  toast('Tarea actualizada', 'success');
}

function marcarTarea(id, done) {
  const tareas = loadTareas();
  const t = tareas.find(x => x.id === id);
  if (t) { t.done = done; saveTareas(tareas); }
  render();
}

function editTarea(id) { editTareaId = id; addTareaOpen = false; render(); }
function cancelEditTarea() { editTareaId = null; render(); }

function delTarea(id) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  const tareas = loadTareas().filter(t => t.id !== id);
  saveTareas(tareas);
  render();
  toast('Tarea eliminada', '');
}

/* ════════════════════════════════════════
   Crear tarea de ITV desde vehículo
   ════════════════════════════════════════ */
function crearTareaITV(carId) {
  const car = S.cars.find(c => c.id === carId);
  if (!car) return;

  const tareas = loadTareas();

  /* Evitar duplicados: no crear si ya existe una tarea ITV activa para este vehículo */
  const yaExiste = tareas.some(t =>
    !t.done &&
    t.origenITV === carId
  );
  if (yaExiste) {
    toast('Ya existe una tarea ITV activa para este vehículo', 'error');
    return;
  }

  const nombreAuto = `${car.brand} ${car.model} ${car.year}${car.patente ? ' [' + car.patente + ']' : ''}`;
  const fechaTarea = car.itvVenc || todayISO();

  tareas.unshift({
    id: uid(),
    titulo: `⚠️ ITV pendiente — ${nombreAuto}`,
    descripcion: car.itvVenc
      ? `La ITV vence el ${car.itvVenc}. Gestionar renovación.`
      : `ITV vencida o sin fecha de vencimiento cargada. Verificar estado.`,
    fecha: fechaTarea,
    clienteId: null,
    clienteNombre: null,
    clientePhone: car.duenioContacto || null,
    creadoPor: getSession().nombre,
    done: false,
    createdAt: todayISO(),
    origenITV: carId,        /* referencia al vehículo */
    origenLabel: nombreAuto,
  });
  saveTareas(tareas);

  toast(`Tarea ITV creada para ${nombreAuto} — redirigiendo a Alertas...`, 'success');

  setTimeout(() => {
    window.location.href = 'alertas.html';
  }, 900);
}

/* ── Formulario ── */
function rTareaForm(tarea) {
  const edit = !!tarea;
  const clientesActivos = S.clients.filter(c => c.status === 'activo');
  const clientesInactivos = S.clients.filter(c => c.status !== 'activo');
  const optsActivos = clientesActivos.map(c =>
    `<option value="${c.id}"${edit && tarea.clienteId === c.id ? ' selected' : ''}>${esc(c.name)} · ${c.phone}</option>`
  ).join('');
  const optsInactivos = clientesInactivos.length > 0
    ? `<optgroup label="Inactivos/Descartados">${clientesInactivos.map(c =>
      `<option value="${c.id}"${edit && tarea.clienteId === c.id ? ' selected' : ''}>${esc(c.name)}</option>`
    ).join('')}</optgroup>`
    : '';

  return `
  <div class="form-section">
    <div class="form-title">${edit ? 'Editar tarea' : 'Nueva tarea'}</div>
    <form onsubmit="${edit ? 'saveEditTarea(event)' : 'addTarea(event)'}">
      <div class="hint-box">
        <div class="hint-label">Datos de la tarea</div>
        <div class="fg2">
          <div class="fg" style="flex:2">
            <label>Título *</label>
            <input type="text" name="titulo" placeholder="Ej: Llamar a cliente, enviar presupuesto..." value="${edit ? esc(tarea.titulo) : ''}" required>
          </div>
          <div class="fg">
            <label>Fecha *</label>
            <input type="date" name="fecha" value="${edit ? tarea.fecha : todayISO()}" required>
          </div>
        </div>
        <div class="fg">
          <label>Descripción / detalles</label>
          <textarea name="descripcion" placeholder="Información adicional sobre la tarea...">${edit && tarea.descripcion ? esc(tarea.descripcion) : ''}</textarea>
        </div>
      </div>
      <div class="hint-box">
        <div class="hint-label">Cliente asociado (opcional)</div>
        <div class="fg">
          <label>Cliente</label>
          <select name="clienteId">
            <option value="">— Sin cliente asociado —</option>
            ${optsActivos}
            ${optsInactivos}
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="btn" onclick="${edit ? 'cancelEditTarea()' : 'addTareaOpen=false;render()'}">Cancelar</button>
        <button type="submit" class="btn primary">${edit ? 'Guardar cambios' : 'Crear tarea → Alertas'}</button>
      </div>
    </form>
    ${!edit ? `<div style="font-size:11px;color:var(--text-3);text-align:right;margin-top:6px">Al crear, se abrirá la sección de Alertas automáticamente</div>` : ''}
  </div>`;
}

/* ── Item de tarea individual ── */
function rTareaItem(t) {
  const urg = urgencia(t.fecha, t.done);
  const label = labelFecha(t.fecha);
  const colores = {
    vencida: { border: 'var(--red)', bg: 'var(--red-bg)', badge: 'bg-red', icon: '🔴' },
    hoy: { border: 'var(--gold)', bg: 'var(--gold-bg)', badge: 'bg-gold', icon: '🟡' },
    proxima: { border: 'var(--green)', bg: 'var(--green-bg)', badge: 'bg-green', icon: '🟢' },
    done: { border: 'var(--border)', bg: 'var(--surface-2)', badge: 'bg-gray', icon: '✓' },
  };
  const c = colores[urg] || colores.proxima;

  return `
  <div class="card" style="${urg !== 'done' ? `border-left: 3px solid ${c.border};` : 'opacity:.6'}">
    <div class="row" style="align-items:start;gap:10px">
      <div style="font-size:18px;line-height:1;padding-top:2px">${c.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:6px">
          <div>
            <div style="font-weight:600;font-size:15px${t.done ? ';text-decoration:line-through;opacity:.5' : ''}">${esc(t.titulo)}</div>
            <div style="font-size:12px;color:var(--text-2);margin-top:2px">
              📅 <strong>${label}</strong>
              · Por <strong>${esc(t.creadoPor)}</strong>
              ${t.clienteNombre ? `· 👤 <strong>${esc(t.clienteNombre)}</strong>` : ''}
              ${t.origenITV ? `· 🚗 <strong>${esc(t.origenLabel||'Vehículo')}</strong>` : ''}
            </div>
            ${t.descripcion ? `<div style="font-size:12px;color:var(--text-2);margin-top:4px;font-style:italic">"${esc(t.descripcion)}"</div>` : ''}
          </div>
          <span class="badge ${c.badge}" style="flex-shrink:0">${label}</span>
        </div>
      </div>
    </div>
    <div class="sep" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
      ${t.clientePhone ? whatsappBtn(t.clientePhone, t.clienteNombre || '', true) : ''}
      ${!t.done
        ? `<button class="btn sm success" onclick="marcarTarea('${t.id}',true)">✓ Completar</button>`
        : `<button class="btn sm" onclick="marcarTarea('${t.id}',false)">Reabrir</button>`
      }
      ${!t.done ? `<button class="btn sm" onclick="editTarea('${t.id}')">Editar</button>` : ''}
      <button class="btn sm danger" onclick="delTarea('${t.id}')">×</button>
    </div>
  </div>`;
}

function rGrupo(titulo, items, colorClass) {
  if (items.length === 0) return '';
  return `
  <div style="margin-bottom:1.25rem">
    <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
                color:var(--text-3);margin-bottom:8px;padding-bottom:4px;
                border-bottom:1px solid var(--border)">
      ${titulo} (${items.length})
    </div>
    ${items.map(t => rTareaItem(t)).join('')}
  </div>`;
}

function rResumen(vencidas, hoy, proximas, completadas) {
  let badges = '';
  if (vencidas.length > 0) badges += `<span class="badge bg-red">🔴 ${vencidas.length} vencida${vencidas.length > 1 ? 's' : ''}</span>`;
  if (hoy.length > 0) badges += `<span class="badge bg-gold">🟡 ${hoy.length} hoy</span>`;
  if (proximas.length > 0) badges += `<span class="badge bg-green">🟢 ${proximas.length} próxima${proximas.length > 1 ? 's' : ''}</span>`;
  if (completadas.length > 0) badges += `<span class="badge bg-gray">✓ ${completadas.length} completada${completadas.length > 1 ? 's' : ''}</span>`;
  if (!badges) return '';
  return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1rem">${badges}</div>`;
}

function render() {
  const tareas = loadTareas();
  const pendientes = tareas.filter(t => !t.done);
  const completadas = tareas.filter(t => t.done);
  pendientes.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const vencidas = pendientes.filter(t => diffDays(t.fecha) < 0);
  const hoy_arr = pendientes.filter(t => diffDays(t.fecha) === 0);
  const proximas = pendientes.filter(t => diffDays(t.fecha) > 0);
  completadas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  let html = `
  <div class="section-head">
    <div class="section-title">Tareas</div>
    <div style="display:flex;gap:6px">
      <a href="alertas.html" class="btn">🔔 Ver alertas</a>
      <button class="btn primary" onclick="addTareaOpen=true;editTareaId=null;render()">+ Nueva tarea</button>
    </div>
  </div>

  ${addTareaOpen ? rTareaForm() : ''}
  ${editTareaId ? rTareaForm(loadTareas().find(t => t.id === editTareaId)) : ''}

  ${rResumen(vencidas, hoy_arr, proximas, completadas)}

  ${tareas.length > 0 ? `
  <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-3);margin-bottom:12px;flex-wrap:wrap">
    Ordenar:
    <button class="btn sm${tareasSort === 'proximas' ? ' active' : ''}" onclick="tareasSort='proximas';render()">📅 Más próximas primero</button>
    <button class="btn sm${tareasSort === 'vencimiento' ? ' active' : ''}" onclick="tareasSort='vencimiento';render()">🔴 Vencidas primero</button>
  </div>` : ''}`;

  if (tareas.length === 0 && !addTareaOpen) {
    html += `
    <div class="empty">
      <div class="empty-icon">○</div>
      <strong>No hay tareas creadas</strong>
      <div style="font-size:13px;margin-top:4px">Creá tareas para organizar el seguimiento de tus clientes.</div>
    </div>`;
    document.getElementById('view').innerHTML = html;
    return;
  }

  if (pendientes.length === 0 && !addTareaOpen) {
    html += `
    <div class="empty">
      <div class="empty-icon">✓</div>
      <strong>¡Todo al día!</strong>
      <div style="font-size:13px;margin-top:4px">No hay tareas pendientes.</div>
    </div>`;
  } else if (tareasSort === 'vencimiento') {
    html += rGrupo('🔴 Vencidas', vencidas, 'red');
    html += rGrupo('🟡 Hoy', hoy_arr, 'gold');
    html += rGrupo('🟢 Próximas', proximas, 'green');
  } else {
    html += rGrupo('🟡 Hoy', hoy_arr, 'gold');
    html += rGrupo('🟢 Próximas', proximas, 'green');
    html += rGrupo('🔴 Vencidas', vencidas, 'red');
  }

  if (completadas.length > 0) {
    html += `
    <details style="margin-top:1.25rem">
      <summary style="cursor:pointer;font-size:13px;color:var(--text-2);font-weight:500">
        Completadas (${completadas.length})
      </summary>
      <div style="margin-top:10px">
        ${completadas.map(t => rTareaItem(t)).join('')}
      </div>
    </details>`;
  }

  document.getElementById('view').innerHTML = html;
}

bootApp('tareas');
checkTareasVencidas(loadTareas());
render();
