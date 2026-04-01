/* ═══════════════════════════════════════════════════════════════
   NEIFERT CRM — js/gestoria.js
   Módulo: Gestoría del equipo (jerarquía, roles, turnos, verificación)
   ═══════════════════════════════════════════════════════════════ */

let addMiembroOpen = false;
let editMiembroId  = null;

const ROLES_SUGERIDOS = ['Administrador','Jefe de Ventas','Vendedor','Peritador','Recepcionista','Gestor','Otro'];

/* ── CRUD ── */
function addMiembro(e) {
  e.preventDefault();
  const f = e.target;
  S.jerarquia.push({
    id:            uid(),
    nombre:        f.jnombre.value.trim(),
    apellido:      f.japellido.value.trim(),
    rol:           f.jrol.value.trim(),
    telefono:      f.jtelefono.value.trim(),
    email:         f.jemail.value.trim(),
    fechaTurno:    f.fechaTurno.value,
    verificPolicial: f.verificPolicial.value,
    notas:         f.jnotas.value.trim(),
    date:          today(),
    creadoPor:     getSession().nombre,
  });
  addMiembroOpen = false;
  checkTurnoAlerts();
  save();
  render();
  toast('Miembro agregado', 'success');
}

function saveEditMiembro(e) {
  e.preventDefault();
  const f = e.target;
  const m = S.jerarquia.find(j=>j.id===editMiembroId);
  if (!m) return;
  m.nombre         = f.jnombre.value.trim();
  m.apellido       = f.japellido.value.trim();
  m.rol            = f.jrol.value.trim();
  m.telefono       = f.jtelefono.value.trim();
  m.email          = f.jemail.value.trim();
  m.fechaTurno     = f.fechaTurno.value;
  m.verificPolicial= f.verificPolicial.value;
  m.notas          = f.jnotas.value.trim();
  editMiembroId    = null;
  save();
  render();
  toast('Miembro actualizado', 'success');
}

function editMiembro(id)   { editMiembroId=id; addMiembroOpen=false; render(); }
function cancelEditMiembro(){ editMiembroId=null; render(); }

function delMiembro(id) {
  if (!confirm('¿Eliminar este miembro del equipo?')) return;
  S.jerarquia = S.jerarquia.filter(j=>j.id!==id);
  save(); render();
}

/* ── Formulario ── */
function rMiembroForm(m) {
  const edit = !!m;
  return `
  <div class="form-section">
    <div class="form-title">${edit?'Editar miembro':'Agregar miembro al equipo'}</div>
    <form onsubmit="${edit?'saveEditMiembro(event)':'addMiembro(event)'}">
      <div class="hint-box">
        <div class="hint-label">Datos personales</div>
        <div class="fg2">
          <div class="fg"><label>Nombre *</label><input type="text" name="jnombre" required placeholder="Juan" value="${edit?esc(m.nombre):''}"></div>
          <div class="fg"><label>Apellido *</label><input type="text" name="japellido" required placeholder="Pérez" value="${edit?esc(m.apellido):''}"></div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Rol / Cargo</label>
            <input type="text" name="jrol" placeholder="Vendedor" value="${edit?esc(m.rol||''):''}" list="roles-list">
            <datalist id="roles-list">${ROLES_SUGERIDOS.map(r=>`<option value="${r}">`).join('')}</datalist>
          </div>
          <div class="fg"><label>Teléfono</label><input type="tel" name="jtelefono" placeholder="351 555-0000" value="${edit?esc(m.telefono||''):''}"></div>
          <div class="fg"><label>Email</label><input type="email" name="jemail" placeholder="juan@neifert.com" value="${edit?esc(m.email||''):''}"></div>
        </div>
      </div>

      <div class="hint-box">
        <div class="hint-label">Turno y verificación</div>
        <div class="fg2">
          <div class="fg"><label>Fecha de turno</label>
            <input type="date" name="fechaTurno" value="${edit&&m.fechaTurno?m.fechaTurno:''}">
          </div>
          <div class="fg"><label>Verificación policial</label>
            <select name="verificPolicial">
              <option value="">— sin datos —</option>
              <option value="pendiente"${edit&&m.verificPolicial==='pendiente'?' selected':''}>⏳ Pendiente</option>
              <option value="aprobada"${edit&&m.verificPolicial==='aprobada'?' selected':''}>✓ Aprobada</option>
              <option value="rechazada"${edit&&m.verificPolicial==='rechazada'?' selected':''}>✗ Rechazada</option>
            </select>
          </div>
        </div>
        <div class="fg"><label>Notas</label><textarea name="jnotas" placeholder="Información adicional, horarios, observaciones...">${edit&&m.notas?esc(m.notas):''}</textarea></div>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="btn" onclick="${edit?'cancelEditMiembro()':'addMiembroOpen=false;render()'}">Cancelar</button>
        <button type="submit" class="btn primary">${edit?'Guardar cambios':'Guardar miembro'}</button>
      </div>
    </form>
  </div>`;
}

/* ── Render ── */
function render() {
  let html = `
  <div class="section-head">
    <div class="section-title">Gestoría del equipo</div>
    <button class="btn primary" onclick="addMiembroOpen=true;editMiembroId=null;render()">+ Agregar miembro</button>
  </div>

  ${addMiembroOpen ? rMiembroForm() : ''}
  ${editMiembroId  ? rMiembroForm(S.jerarquia.find(j=>j.id===editMiembroId)) : ''}

  ${S.jerarquia.length===0&&!addMiembroOpen?`
  <div class="empty">
    <div class="empty-icon">◈</div>
    <strong>Sin miembros cargados</strong>
    <div style="font-size:13px;margin-top:4px">Agregá miembros del equipo para gestionar roles, turnos y verificaciones.</div>
  </div>`:'' }`;

  S.jerarquia.forEach(j => {
    if (editMiembroId===j.id) return;
    const vPolOk  = j.verificPolicial==='aprobada';
    const vPolBad = j.verificPolicial==='rechazada';
    const diasTurno = j.fechaTurno ? Math.ceil((new Date(j.fechaTurno)-new Date())/(1000*60*60*24)) : null;
    const turnoProximo = diasTurno!==null && diasTurno>=0 && diasTurno<=7;

    html += `
    <div class="jerarq-card">
      <div class="jerarq-header">
        <div>
          <div class="jerarq-name">${esc(j.nombre)} ${esc(j.apellido)}</div>
          <div class="jerarq-role">${esc(j.rol||'—')}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          ${j.verificPolicial?`<span class="badge ${vPolOk?'bg-green':vPolBad?'bg-red':'bg-orange'}">
            ${vPolOk?'✓ Verificado':vPolBad?'✗ Rechazado':'⏳ Pendiente'}
          </span>`:''}
          ${turnoProximo?`<span class="badge ${diasTurno===0?'bg-red':'bg-gold'}">
            Turno ${diasTurno===0?'HOY':'en '+diasTurno+'d'}
          </span>`:''}
          ${j.telefono?whatsappBtn(j.telefono,j.nombre+' '+j.apellido,true):''}
          <button class="btn sm" onclick="editMiembro('${j.id}')">Editar</button>
          <button class="btn sm danger" onclick="delMiembro('${j.id}')">Eliminar</button>
        </div>
      </div>

      <div class="jerarq-body">
        ${j.telefono?`<div class="jerarq-field">
          <div class="jerarq-field-label">Teléfono</div>
          <div class="jerarq-field-val">${esc(j.telefono)}</div>
        </div>`:''}
        ${j.email?`<div class="jerarq-field">
          <div class="jerarq-field-label">Email</div>
          <div class="jerarq-field-val">${esc(j.email)}</div>
        </div>`:''}
        ${j.verificPolicial?`<div class="jerarq-field">
          <div class="jerarq-field-label">Verificación policial</div>
          <div class="jerarq-field-val" style="color:${vPolOk?'var(--green)':vPolBad?'var(--red)':'var(--orange)'}">${j.verificPolicial}</div>
        </div>`:''}
        ${j.fechaTurno?`<div class="jerarq-field">
          <div class="jerarq-field-label">Fecha de turno</div>
          <div class="jerarq-field-val" style="color:${turnoProximo?'var(--gold)':'var(--text-2)'}">${j.fechaTurno}</div>
        </div>`:''}
        ${j.creadoPor?`<div class="jerarq-field">
          <div class="jerarq-field-label">Cargado por</div>
          <div class="jerarq-field-val">${esc(j.creadoPor)}</div>
        </div>`:''}
        ${j.notas?`<div class="jerarq-field" style="grid-column:1/-1">
          <div class="jerarq-field-label">Notas</div>
          <div class="jerarq-field-val">${esc(j.notas)}</div>
        </div>`:''}
      </div>
    </div>`;
  });

  document.getElementById('view').innerHTML = html;
}

/* ── Boot ── */
bootApp('gestoria');
render();
