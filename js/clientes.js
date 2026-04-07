/* ═══════════════════════════════════════════════════════════════
   NEIFERT CRM — js/clientes.js
   ═══════════════════════════════════════════════════════════════ */

let addClientOpen = false;
let editClientId  = null;

/* ── CRUD ── */
function addClient(e) {
  e.preventDefault();
  const f = e.target;
  S.clients.unshift({
    id: uid(),
    name:        f.cname.value.trim(),
    phone:       f.phone.value.trim(),
    email:       f.email.value.trim(),
    fechaCumple: f.fechaCumple.value,
    creadoPor:   getSession().nombre,
    fechaCreacion: todayISO(),
    brand:       f.brand.value.trim(),
    model:       f.model.value.trim(),
    tipo:        f.tipo.value,
    budget:      f.budget.value ? parseInt(f.budget.value) : null,
    trans:       f.trans.value,
    yearMin:     f.yearMin.value ? +f.yearMin.value : null,
    yearMax:     f.yearMax.value ? +f.yearMax.value : null,
    notes:       f.notes.value.trim(),
    status:      'activo',
    date:        today(),
  });
  addClientOpen = false;
  checkBirthdayAlerts();
  _alertaClienteNuevo(S.clients[0]);
  save();
  render();
  toast('Cliente agregado correctamente', 'success');
}

function saveEditClient(e) {
  e.preventDefault();
  const f  = e.target;
  const cl = S.clients.find(c=>c.id===editClientId);
  if (!cl) return;
  cl.name        = f.cname.value.trim();
  cl.phone       = f.phone.value.trim();
  cl.email       = f.email.value.trim();
  cl.fechaCumple = f.fechaCumple.value;
  cl.brand       = f.brand.value.trim();
  cl.model       = f.model.value.trim();
  cl.tipo        = f.tipo.value;
  cl.budget      = f.budget.value ? parseInt(f.budget.value) : null;
  cl.trans       = f.trans.value;
  cl.yearMin     = f.yearMin.value ? +f.yearMin.value : null;
  cl.yearMax     = f.yearMax.value ? +f.yearMax.value : null;
  cl.notes       = f.notes.value.trim();
  cl.editadoPor  = getSession().nombre;
  cl.fechaEdicion = todayISO();
  editClientId   = null;
  save();
  render();
  toast('Cliente actualizado', 'success');
}

function editClient(id) { editClientId=id; addClientOpen=false; render(); }
function cancelEdit()   { editClientId=null; render(); }

function setClientStatus(id, st) {
  const c = S.clients.find(x=>x.id===id);
  if (c) { c.status = st; c.editadoPor = getSession().nombre; c.fechaEdicion = todayISO(); }
  save(); render();
}
function delClient(id) {
  if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return;
  S.clients = S.clients.filter(c=>c.id!==id);
  save(); render();
}

/* ── Alerta automática al cargar un cliente nuevo ── */
function _alertaClienteNuevo(cliente) {
  if (!cliente) return;
  const yaExiste = S.alertas.some(a =>
    a.tipo === 'general' &&
    a.refId === cliente.id &&
    a.date  === today()
  );
  if (yaExiste) return;

  const intereses = [
    cliente.brand  ? `Marca: ${cliente.brand}`                       : null,
    cliente.model  ? `Modelo: ${cliente.model}`                      : null,
    cliente.tipo   ? `Tipo: ${cliente.tipo}`                         : null,
    cliente.budget ? `Presupuesto: $${parseInt(cliente.budget).toLocaleString('es-AR')}` : null,
  ].filter(Boolean).join(' · ');

  S.alertas.unshift({
    id:          uid(),
    tipo:        'general',
    titulo:      `👤 Nuevo cliente: ${cliente.name}`,
    descripcion: `Tel: ${cliente.phone}${intereses ? ' · ' + intereses : ''} · Cargado por: ${cliente.creadoPor}`,
    fecha:       todayISO(),
    creadoPor:   'Sistema',
    done:        false,
    date:        today(),
    refId:       cliente.id,
    refPhone:    cliente.phone,
    refName:     cliente.name,
  });
}

/* ── Helper: línea de auditoría ── */
function rAuditoria(c) {
  const partes = [];
  if (c.creadoPor) partes.push(`Cargado por <strong>${esc(c.creadoPor)}</strong>${c.fechaCreacion ? ' el ' + c.fechaCreacion : (c.date ? ' el ' + c.date : '')}`);
  if (c.editadoPor) partes.push(`Editado por <strong>${esc(c.editadoPor)}</strong>${c.fechaEdicion ? ' el ' + c.fechaEdicion : ''}`);
  if (!partes.length) return '';
  return `<div style="font-size:11px;color:var(--text-3);margin-top:3px">${partes.join(' · ')}</div>`;
}

/* ── Formulario ── */
function rClientForm(cl) {
  const edit = !!cl;
  return `
  <div class="form-section">
    <div class="form-title">${edit?'Editar cliente':'Nuevo cliente interesado'}</div>
    <form onsubmit="${edit?'saveEditClient(event)':'addClient(event)'}">

      <div class="hint-box">
        <div class="hint-label">Datos de contacto</div>
        <div class="fg2">
          <div class="fg"><label>Nombre completo *</label><input type="text" name="cname" placeholder="Juan Pérez" value="${edit?esc(cl.name):''}" required></div>
          <div class="fg"><label>Teléfono *</label><input type="tel" name="phone" placeholder="351 555-0000" value="${edit?esc(cl.phone):''}" required></div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Email</label><input type="email" name="email" placeholder="juan@email.com" value="${edit&&cl.email?esc(cl.email):''}"></div>
          <div class="fg"><label>Fecha de cumpleaños</label><input type="date" name="fechaCumple" value="${edit&&cl.fechaCumple?cl.fechaCumple:''}"></div>
        </div>
        ${edit ? rAuditoria(cl) : ''}
      </div>

      <div class="hint-box">
        <div class="hint-label">Intereses del cliente — completá solo lo que mencionó</div>
        <div class="fg2">
          <div class="fg"><label>Marca preferida</label>
            <input type="text" name="brand" placeholder="Fiat, Ford, Toyota..." value="${edit?esc(cl.brand):''}" list="ml1">
            <datalist id="ml1">${MARCAS.map(m=>`<option value="${m}">`).join('')}</datalist>
          </div>
          <div class="fg"><label>Modelo preferido</label>
            <input type="text" name="model" placeholder="Ranger, Cronos, Corolla..." value="${edit&&cl.model?esc(cl.model):''}">
          </div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Tipo de vehículo</label>
            <select name="tipo">
              <option value="">— cualquiera —</option>
              ${TIPOS.map(t=>`<option value="${t}"${edit&&cl.tipo===t?' selected':''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="fg"><label>Transmisión</label>
            <select name="trans">
              <option value="">— cualquiera —</option>
              <option value="manual"${edit&&cl.trans==='manual'?' selected':''}>Manual</option>
              <option value="automático"${edit&&cl.trans==='automático'?' selected':''}>Automático</option>
            </select>
          </div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Presupuesto máximo ($)</label><input type="number" name="budget" placeholder="15000000" min="0" value="${edit&&cl.budget?cl.budget:''}"></div>
          <div class="fg"></div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Año desde</label><input type="number" name="yearMin" placeholder="2018" min="1990" max="2030" value="${edit&&cl.yearMin?cl.yearMin:''}"></div>
          <div class="fg"><label>Año hasta</label><input type="number" name="yearMax" placeholder="2024" min="1990" max="2030" value="${edit&&cl.yearMax?cl.yearMax:''}"></div>
        </div>
        <div class="fg"><label>Notas adicionales</label><textarea name="notes" placeholder="Quiere color oscuro, necesita 4x4, urgente...">${edit&&cl.notes?esc(cl.notes):''}</textarea></div>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="btn" onclick="${edit?'cancelEdit()':'addClientOpen=false;render()'}">Cancelar</button>
        <button type="submit" class="btn primary">${edit?'Guardar cambios':'Guardar cliente'}</button>
      </div>
    </form>
  </div>`;
}

/* ── Render ── */
function render() {
  const active   = S.clients.filter(c=>c.status==='activo');
  const inactive = S.clients.filter(c=>c.status!=='activo');

  let html = `
  <div class="section-head">
    <div class="section-title">Clientes interesados</div>
    <button class="btn primary" onclick="addClientOpen=true;editClientId=null;render()">+ Agregar cliente</button>
  </div>

  ${addClientOpen ? rClientForm() : ''}
  ${editClientId  ? rClientForm(S.clients.find(c=>c.id===editClientId)) : ''}

  ${S.clients.length===0&&!addClientOpen?`
  <div class="empty">
    <div class="empty-icon">○</div>
    <strong>No hay clientes cargados</strong>
    <div style="font-size:13px;margin-top:4px">Registrá clientes interesados para empezar a hacer matches.</div>
  </div>`:'' }`;

  active.forEach(c => {
    if (editClientId===c.id) return;
    const ms       = matchesForClient(c);
    const bd       = c.fechaCumple ? daysUntil(c.fechaCumple) : null;
    const bdToday  = c.fechaCumple && isBirthdayToday(c.fechaCumple);

    html += `
    <div class="card">
      <div class="row" style="align-items:start">
        ${rAv(c.name, true)}
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:6px">
            <div>
              <div style="font-weight:600;font-size:15px">${esc(c.name)} ${bdToday?'🎉':bd!==null&&bd<=7?'🎂':''}</div>
              <div style="font-size:12px;color:var(--text-2)">
                ${c.phone}
                ${c.email?` · ${esc(c.email)}`:''}
              </div>
              ${rAuditoria(c)}
            </div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">
              ${ms.length>0?`<span class="badge bg-green">${ms.length} auto${ms.length>1?'s':''} disponible${ms.length>1?'s':''}</span>`:''}
              ${bdToday?'<span class="badge bg-purple">🎉 Cumpleaños</span>':''}
              <span class="badge bg-blue">Activo</span>
            </div>
          </div>
          <div style="margin-top:8px">${rTags(c)}</div>
          ${c.notes?`<div style="font-size:12px;color:var(--text-2);margin-top:6px;font-style:italic">"${esc(c.notes)}"</div>`:''}

          ${ms.length>0?`
          <div class="sep">
            <div style="font-size:12px;color:var(--text-3);margin-bottom:6px">Vehículos disponibles que pueden interesarle:</div>
            ${ms.slice(0,3).map(car=>`
            <div class="row" style="padding:6px 0;border-top:1px solid var(--border)">
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:500">${esc(car.brand)} ${esc(car.model)} <span style="color:var(--text-3)">${car.year}</span></div>
              </div>
              ${rScoreRow(car.sc)}
              <button class="btn sm" onclick="showMatchDetail('${c.id}','${car.id}')" style="border-color:var(--gold-border);color:var(--gold)">Ver match</button>
            </div>`).join('')}
            ${ms.length>3?`<div style="font-size:12px;color:var(--text-3);padding-top:6px">+${ms.length-3} vehículos más</div>`:''}
          </div>`:''}
        </div>
      </div>

      <div class="sep" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
        ${whatsappBtn(c.phone,c.name,true)}
        ${bdToday?`<button class="btn sm" style="border-color:var(--purple-border);color:var(--purple)" onclick="openWhatsAppBirthday('${esc(c.phone)}','${esc(c.name)}')">🎉 Felicitar</button>`:''}
        <button class="btn sm" onclick="editClient('${c.id}')">Editar</button>
        <button class="btn sm success" onclick="setClientStatus('${c.id}','vendido')">Compró</button>
        <button class="btn sm" onclick="setClientStatus('${c.id}','descartado')">Descartar</button>
        <button class="btn sm danger" onclick="delClient('${c.id}')">Eliminar</button>
      </div>
    </div>`;
  });

  if (inactive.length > 0) {
    html += `
    <details style="margin-top:1.25rem">
      <summary>Inactivos / Descartados (${inactive.length})</summary>
      <div style="margin-top:10px">
        ${inactive.map(c=>`
        <div class="card" style="opacity:.55">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div class="row">
              ${rAv(c.name)}
              <div>
                <div style="font-weight:500">${esc(c.name)}</div>
                <div style="font-size:12px;color:var(--text-3)">${c.phone}</div>
                ${rAuditoria(c)}
              </div>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <span class="badge ${c.status==='vendido'?'bg-green':'bg-gray'}">${c.status}</span>
              ${whatsappBtn(c.phone,c.name,true)}
              <button class="btn sm" onclick="setClientStatus('${c.id}','activo')">Reactivar</button>
              <button class="btn sm danger" onclick="delClient('${c.id}')">Eliminar</button>
            </div>
          </div>
        </div>`).join('')}
      </div>
    </details>`;
  }

  document.getElementById('view').innerHTML = html;
}

/* ── Boot ── */
bootApp('clientes');
render();