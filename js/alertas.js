/* ═══════════════════════════════════════════════════════════════
   NEIFERT CRM — js/alertas.js
   ═══════════════════════════════════════════════════════════════ */

let addAlertaOpen = false;
let activeTab     = 'activas';

const ICON_MAP  = { birthday:'🎉', itv:'⚠️', turno:'📅', general:'🔔' };
const COLOR_MAP = { birthday:'purple', itv:'red', turno:'gold', general:'blue' };

/* ── CRUD ── */
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
  const a = S.alertas.find(x=>x.id===id);
  if (a) a.done = done;
  save(); render();
}

function delAlerta(id) {
  if (!confirm('¿Eliminar esta alerta?')) return;
  S.alertas = S.alertas.filter(a=>a.id!==id);
  save(); render();
}

/* ── Formulario de nueva alerta ── */
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

/* ── Item de alerta ── */
function rAlertItem(a) {
  return `
  <div class="alert-item ${a.done?'done':''}">
    <div class="alert-icon ${a.tipo}" style="font-size:18px">${ICON_MAP[a.tipo]||'🔔'}</div>
    <div class="alert-body">
      <div class="alert-title">${esc(a.titulo)}</div>
      <div class="alert-sub">
        ${a.descripcion?esc(a.descripcion):''}
        ${a.fecha?' · '+a.fecha:''}
        · Por <strong>${esc(a.creadoPor)}</strong>
      </div>
    </div>
    <div class="alert-actions">
      ${a.refPhone?whatsappBtn(a.refPhone,a.refName||'',true):''}
      ${!a.done
        ?`<button class="btn sm success" onclick="marcarAlerta('${a.id}',true)">✓ Hecho</button>`
        :`<button class="btn sm" onclick="marcarAlerta('${a.id}',false)">Reabrir</button>`}
      <button class="btn sm danger" onclick="delAlerta('${a.id}')">×</button>
    </div>
  </div>`;
}

/* ── Render ── */
function render() {
  const pendientes  = S.alertas.filter(a=>!a.done);
  const completadas = S.alertas.filter(a=>a.done);

  let html = `
  <div class="section-head">
    <div class="section-title">Alertas y recordatorios</div>
    <button class="btn primary" onclick="addAlertaOpen=true;render()">+ Nueva alerta</button>
  </div>

  ${addAlertaOpen ? rAlertaForm() : ''}

  <!-- Resumen rápido -->
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:1rem">
    ${pendientes.filter(a=>a.tipo==='birthday').length>0?`<span class="badge bg-purple">🎉 ${pendientes.filter(a=>a.tipo==='birthday').length} cumpleaños</span>`:''}
    ${pendientes.filter(a=>a.tipo==='itv').length>0?`<span class="badge bg-red">⚠️ ${pendientes.filter(a=>a.tipo==='itv').length} ITV</span>`:''}
    ${pendientes.filter(a=>a.tipo==='turno').length>0?`<span class="badge bg-gold">📅 ${pendientes.filter(a=>a.tipo==='turno').length} turno${pendientes.filter(a=>a.tipo==='turno').length>1?'s':''}</span>`:''}
    ${pendientes.filter(a=>a.tipo==='general').length>0?`<span class="badge bg-blue">🔔 ${pendientes.filter(a=>a.tipo==='general').length} general${pendientes.filter(a=>a.tipo==='general').length>1?'es':''}</span>`:''}
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <button class="tab-btn ${activeTab==='activas'?'active':''}" onclick="activeTab='activas';render()">
      Activas (${pendientes.length})
    </button>
    <button class="tab-btn ${activeTab==='done'?'active':''}" onclick="activeTab='done';render()">
      Completadas (${completadas.length})
    </button>
  </div>`;

  if (activeTab === 'activas') {
    if (pendientes.length === 0) {
      html += `
      <div class="empty">
        <div class="empty-icon">✓</div>
        <strong>Sin alertas activas</strong>
        <div style="font-size:13px;margin-top:4px">¡Todo al día! No hay alertas pendientes.</div>
      </div>`;
    } else {
      /* Ordenar: birthday primero, luego ITV, luego turno, luego general */
      const orden = ['birthday','itv','turno','general'];
      const sorted = [...pendientes].sort((a,b)=>orden.indexOf(a.tipo)-orden.indexOf(b.tipo));
      html += sorted.map(a=>rAlertItem(a)).join('');
    }
  } else {
    if (completadas.length === 0) {
      html += `
      <div class="empty">
        <div class="empty-icon">○</div>
        <strong>Sin alertas completadas</strong>
      </div>`;
    } else {
      html += completadas.map(a=>rAlertItem(a)).join('');
    }
  }

  document.getElementById('view').innerHTML = html;
}

/* ── Boot ── */
bootApp('alertas');
render();
