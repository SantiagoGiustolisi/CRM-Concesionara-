/* ═══════════════════════════════════════════════════════════════
   NEIFERT CRM — js/vehiculos.js
   ═══════════════════════════════════════════════════════════════ */

let addCarOpen  = false;
let editCarId   = null;
let lastMatches = null;

/* ── CRUD ── */
function addCar(e) {
  e.preventDefault();
  const f   = e.target;
  const car = {
    id:              uid(),
    brand:           f.brand.value.trim(),
    model:           f.model.value.trim(),
    version:         f.version.value.trim(),
    patente:         f.patente.value.trim().toUpperCase(),
    tipo:            f.tipo.value,
    year:            +f.year.value,
    km:              f.km.value ? +f.km.value : 0,
    trans:           f.trans.value,
    color:           f.color.value.trim(),
    monedaContado:   f.monedaContado.value,
    precioContado:   f.precioContado.value ? +f.precioContado.value : null,
    monedaCanje:     f.monedaCanje.value,
    precioCanje:     f.precioCanje.value ? +f.precioCanje.value : null,
    duenioNombre:    f.duenioNombre.value.trim(),
    duenioApellido:  f.duenioApellido.value.trim(),
    duenioContacto:  f.duenioContacto.value.trim(),
    itv:             f.itv.value,
    itvVenc:         f.itvVenc.value,
    carpetaEntregada:f.carpetaEntregada.checked,
    nota:            f.nota.value.trim(),
    status:          'disponible',
    date:            today(),
    creadoPor:       getSession().nombre,
    fechaCreacion:   todayISO(),
    peritaje:        {},
  };
  S.cars.unshift(car);
  lastMatches = matchesForCar(car);
  addCarOpen = false;
  checkITVAlerts();
  save();
  render();
  toast('Vehículo agregado correctamente', 'success');
}

function saveEditCar(e) {
  e.preventDefault();
  const f   = e.target;
  const car = S.cars.find(c=>c.id===editCarId);
  if (!car) return;
  car.brand           = f.brand.value.trim();
  car.model           = f.model.value.trim();
  car.version         = f.version.value.trim();
  car.patente         = f.patente.value.trim().toUpperCase();
  car.tipo            = f.tipo.value;
  car.year            = +f.year.value;
  car.km              = f.km.value ? +f.km.value : 0;
  car.trans           = f.trans.value;
  car.color           = f.color.value.trim();
  car.monedaContado   = f.monedaContado.value;
  car.precioContado   = f.precioContado.value ? +f.precioContado.value : null;
  car.monedaCanje     = f.monedaCanje.value;
  car.precioCanje     = f.precioCanje.value ? +f.precioCanje.value : null;
  car.duenioNombre    = f.duenioNombre.value.trim();
  car.duenioApellido  = f.duenioApellido.value.trim();
  car.duenioContacto  = f.duenioContacto.value.trim();
  car.itv             = f.itv.value;
  car.itvVenc         = f.itvVenc.value;
  car.carpetaEntregada= f.carpetaEntregada.checked;
  car.nota            = f.nota.value.trim();
  car.editadoPor      = getSession().nombre;
  car.fechaEdicion    = todayISO();
  editCarId   = null;
  lastMatches = null;
  save();
  render();
  toast('Vehículo actualizado', 'success');
}

function editCar(id)   { editCarId=id; addCarOpen=false; lastMatches=null; render(); }
function cancelEditCar(){ editCarId=null; render(); }

function setCarStatus(id, st) {
  const c = S.cars.find(x=>x.id===id);
  if (c) { c.status = st; c.editadoPor = getSession().nombre; c.fechaEdicion = todayISO(); }
  save(); render();
}
function delCar(id) {
  if (!confirm('¿Eliminar este vehículo del stock?')) return;
  S.cars = S.cars.filter(c=>c.id!==id);
  if (lastMatches) lastMatches = null;
  save(); render();
}

/* ── Helper: línea de auditoría ── */
function rAuditoriaAuto(car) {
  const partes = [];
  if (car.creadoPor) partes.push(`Cargado por <strong>${esc(car.creadoPor)}</strong>${car.fechaCreacion ? ' el ' + car.fechaCreacion : (car.date ? ' el ' + car.date : '')}`);
  if (car.editadoPor) partes.push(`Editado por <strong>${esc(car.editadoPor)}</strong>${car.fechaEdicion ? ' el ' + car.fechaEdicion : ''}`);
  if (!partes.length) return '';
  return `<div style="font-size:11px;color:var(--text-3);margin-top:2px">${partes.join(' · ')}</div>`;
}

/* ── Toggle 0km ── */
function toggleZeroKm(btn) {
  const input  = document.getElementById('kmInput');
  const duenio = document.getElementById('duenioWrap');
  const isZero = btn.dataset.zero === 'true';

  if (isZero) {
    btn.dataset.zero      = 'false';
    btn.textContent       = '0 km';
    btn.style.background  = '';
    btn.style.color       = '';
    btn.style.borderColor = '';
    input.disabled        = false;
    input.value           = '';
    input.placeholder     = '45000';
    if (duenio) duenio.style.display = 'block';
  } else {
    btn.dataset.zero      = 'true';
    btn.textContent       = '✓ 0 km';
    btn.style.background  = 'var(--green)';
    btn.style.color       = '#fff';
    btn.style.borderColor = 'var(--green)';
    input.disabled        = true;
    input.value           = '0';
    input.placeholder     = '0';
    if (duenio) duenio.style.display = 'none';
  }
}

/* ── Formulario ── */
function toggleITV(sel) {
  const wrap = document.getElementById('itvVencWrap');
  if (wrap) wrap.style.display = sel.value==='no' ? 'block' : 'none';
}

function rCarForm(car) {
  const edit      = !!car;
  const itvSi     = !edit || car.itv==='si' || !car.itv;
  const esZeroKm  = edit && car.km === 0;
  const kmVal     = edit && !esZeroKm && car.km ? car.km : '';
  const showDuenio= !esZeroKm;

  return `
  <div class="form-section">
    <div class="form-title">${edit?'Editar vehículo':'Agregar vehículo al stock'}</div>
    <form onsubmit="${edit?'saveEditCar(event)':'addCar(event)'}">

      <div class="hint-box">
        <div class="hint-label">Datos del vehículo</div>
        <div class="fg3">
          <div class="fg"><label>Marca *</label>
            <input type="text" name="brand" placeholder="Ford" value="${edit?esc(car.brand):''}" required list="ml2">
            <datalist id="ml2">${MARCAS.map(m=>`<option value="${m}">`).join('')}</datalist>
          </div>
          <div class="fg"><label>Modelo *</label><input type="text" name="model" placeholder="Ranger" value="${edit?esc(car.model):''}" required></div>
          <div class="fg"><label>Versión</label><input type="text" name="version" placeholder="XL 4x2 T/M" value="${edit&&car.version?esc(car.version):''}"></div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Patente</label><input type="text" name="patente" placeholder="AA123BB" value="${edit&&car.patente?esc(car.patente):''}" style="text-transform:uppercase"></div>
          <div class="fg"><label>Año *</label><input type="number" name="year" placeholder="2022" min="1990" max="2030" value="${edit?car.year:''}" required></div>
          <div class="fg">
            <label>Kilometraje</label>
            <div style="display:flex;gap:6px;align-items:center">
              <input
                id="kmInput"
                type="number"
                name="km"
                placeholder="45000"
                min="0"
                value="${kmVal}"
                ${esZeroKm?'disabled':''}
                style="flex:1"
                oninput="const w=document.getElementById('duenioWrap');if(w)w.style.display=this.value==0?'none':'block'"
              >
              <button
                type="button"
                class="btn sm"
                data-zero="${esZeroKm?'true':'false'}"
                onclick="toggleZeroKm(this)"
                style="${esZeroKm?'background:var(--green);color:#fff;border-color:var(--green)':''}"
              >${esZeroKm?'✓ 0 km':'0 km'}</button>
            </div>
          </div>
        </div>
        <div class="fg3">
          <div class="fg"><label>Tipo *</label>
            <select name="tipo" required>
              <option value="">— seleccioná —</option>
              ${TIPOS.map(t=>`<option value="${t}"${edit&&car.tipo===t?' selected':''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="fg"><label>Transmisión *</label>
            <select name="trans" required>
              <option value="">— seleccioná —</option>
              <option value="manual"${edit&&car.trans==='manual'?' selected':''}>Manual</option>
              <option value="automático"${edit&&car.trans==='automático'?' selected':''}>Automático</option>
            </select>
          </div>
          <div class="fg"><label>Color</label><input type="text" name="color" placeholder="Blanco" value="${edit&&car.color?esc(car.color):''}"></div>
        </div>
        ${edit ? rAuditoriaAuto(car) : ''}
      </div>

      <div class="hint-box">
        <div class="hint-label">Precios</div>
        <div class="fg3">
          <div class="fg">
            <label>Precio contado / efectivo</label>
            <div style="display:flex;gap:6px">
              <select name="monedaContado" style="width:85px;flex-shrink:0">${MONEDAS.map(m=>`<option value="${m}"${edit&&car.monedaContado===m?' selected':''}>${m}</option>`).join('')}</select>
              <input type="number" name="precioContado" placeholder="0" min="0" value="${edit&&car.precioContado?car.precioContado:''}" style="flex:1">
            </div>
          </div>
          <div class="fg">
            <label>Precio canje / crédito</label>
            <div style="display:flex;gap:6px">
              <select name="monedaCanje" style="width:85px;flex-shrink:0">${MONEDAS.map(m=>`<option value="${m}"${edit&&car.monedaCanje===m?' selected':''}>${m}</option>`).join('')}</select>
              <input type="number" name="precioCanje" placeholder="0" min="0" value="${edit&&car.precioCanje?car.precioCanje:''}" style="flex:1">
            </div>
          </div>
        </div>
      </div>

      <div class="hint-box" id="duenioWrap" style="display:${showDuenio?'block':'none'}">
        <div class="hint-label">Dueño anterior</div>
        <div class="fg3">
          <div class="fg"><label>Nombre</label><input type="text" name="duenioNombre" placeholder="Carlos" value="${edit&&car.duenioNombre?esc(car.duenioNombre):''}"></div>
          <div class="fg"><label>Apellido</label><input type="text" name="duenioApellido" placeholder="García" value="${edit&&car.duenioApellido?esc(car.duenioApellido):''}"></div>
          <div class="fg"><label>Contacto</label><input type="tel" name="duenioContacto" placeholder="351 000-0000" value="${edit&&car.duenioContacto?esc(car.duenioContacto):''}"></div>
        </div>
      </div>

      <div class="hint-box">
        <div class="hint-label">ITV y documentación</div>
        <div class="fg2">
          <div class="fg"><label>ITV</label>
            <select name="itv" id="itvSel" onchange="toggleITV(this)">
              <option value="si"${itvSi?' selected':''}>Sí ✓</option>
              <option value="no"${!itvSi?' selected':''}>No — vencida / pendiente</option>
            </select>
          </div>
          <div class="fg" id="itvVencWrap" style="display:${itvSi?'none':'block'}">
            <label>Fecha de vencimiento ITV</label>
            <input type="date" name="itvVenc" value="${edit&&car.itvVenc?car.itvVenc:''}">
          </div>
        </div>
        <div class="fg" style="display:flex;align-items:center;gap:10px;margin-top:4px">
          <input type="checkbox" name="carpetaEntregada" id="carpetaChk" style="width:auto;margin:0" ${edit&&car.carpetaEntregada?'checked':''}>
          <label for="carpetaChk" style="text-transform:none;letter-spacing:0;font-size:13px;color:var(--text-2);margin:0;cursor:pointer">Carpeta entregada</label>
        </div>
      </div>

      <div class="fg"><label>Nota interna</label>
        <textarea name="nota" placeholder="Historial, observaciones, detalles importantes...">${edit&&car.nota?esc(car.nota):''}</textarea>
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="btn" onclick="${edit?'cancelEditCar()':'addCarOpen=false;render()'}">Cancelar</button>
        <button type="submit" class="btn primary">${edit?'Guardar cambios':'Guardar vehículo'}</button>
      </div>
    </form>
  </div>`;
}

/* ── Match banner ── */
function rMatchBanner() {
  if (!lastMatches) return '';
  return `
  <div class="match-banner">
    <div class="match-banner-title">
      <span>${lastMatches.length>0?`${lastMatches.length} cliente${lastMatches.length>1?'s':''} que podrían interesarse`:'Vehículo guardado — sin matches todavía'}</span>
      <button class="btn sm" onclick="lastMatches=null;render()" style="background:transparent;color:var(--text-3)">×</button>
    </div>
    ${lastMatches.map(c=>`
    <div class="row" style="padding:8px 0;border-top:1px solid rgba(76,175,125,0.15)">
      ${rAv(c.name,false,true)}
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500">${esc(c.name)}</div>
        <div style="font-size:12px;color:var(--text-2)">${c.phone}</div>
      </div>
      ${rScoreRow(c.sc)}
      ${whatsappBtn(c.phone,c.name,true)}
    </div>`).join('')}
  </div>`;
}

/* ── Render ── */
function render() {
  const avail  = S.cars.filter(c=>c.status==='disponible');
  const others = S.cars.filter(c=>c.status!=='disponible');

  let html = `
  <div class="section-head">
    <div class="section-title">Stock de vehículos</div>
    <button class="btn primary" onclick="addCarOpen=true;editCarId=null;lastMatches=null;render()">+ Agregar vehículo</button>
  </div>

  ${addCarOpen ? rCarForm() : ''}
  ${editCarId  ? rCarForm(S.cars.find(c=>c.id===editCarId)) : ''}
  ${rMatchBanner()}

  ${S.cars.length===0&&!addCarOpen?`
  <div class="empty">
    <div class="empty-icon">◻</div>
    <strong>El stock está vacío</strong>
    <div style="font-size:13px;margin-top:4px">Agregá un vehículo y verás qué clientes pueden estar interesados.</div>
  </div>`:'' }`;

  avail.forEach(car => {
    if (editCarId===car.id) return;
    const ms          = matchesForCar(car);
    const hasPeritaje = car.peritaje && Object.keys(car.peritaje).length > 0;
    const itvVencida  = car.itv==='no' && car.itvVenc;
    const daysITV     = itvVencida ? Math.ceil((new Date(car.itvVenc)-new Date())/(1000*60*60*24)) : null;
    const esZeroKm    = car.km === 0;

    html += `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:${ms.length?'10px':'0'}">
        <div>
          <div style="font-weight:600;font-size:15px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            ${esc(car.brand)} ${esc(car.model)}
            ${car.version?`<span style="font-size:13px;font-weight:400;color:var(--text-3)">${esc(car.version)}</span>`:''}
            ${car.patente?`<span style="font-size:11px;background:var(--surface-3);color:var(--text-2);padding:2px 8px;border-radius:4px;border:1px solid var(--border);letter-spacing:.08em">${esc(car.patente)}</span>`:''}
            ${esZeroKm?'<span class="badge bg-blue">0 km</span>':''}
            ${itvVencida?`<span class="badge ${daysITV!==null&&daysITV<=0?'bg-red':'bg-orange'}">ITV ${daysITV!==null&&daysITV<=0?'VENCIDA':`vence en ${daysITV}d`}</span>`:''}
            ${car.carpetaEntregada?'<span class="badge bg-green">Carpeta ✓</span>':''}
          </div>
          <div style="font-size:13px;color:var(--text-2);margin-top:3px">
            ${car.year} · ${car.tipo} · ${car.trans}
            ${!esZeroKm && car.km ? ' · '+fk(car.km) : ''}
            ${car.color?' · '+esc(car.color):''}
          </div>
          <div style="font-size:12px;margin-top:4px;display:flex;gap:12px;flex-wrap:wrap">
            ${car.precioContado?`<span style="color:var(--green)">Contado: ${car.monedaContado||'ARS'} ${car.precioContado.toLocaleString('es-AR')}</span>`:''}
            ${car.precioCanje?`<span style="color:var(--blue)">Canje: ${car.monedaCanje||'ARS'} ${car.precioCanje.toLocaleString('es-AR')}</span>`:''}
          </div>
          ${!esZeroKm && car.duenioNombre ? `<div style="font-size:11px;color:var(--text-3);margin-top:3px">Dueño ant.: ${esc(car.duenioNombre)} ${esc(car.duenioApellido)}${car.duenioContacto?' · '+esc(car.duenioContacto):''}</div>` : ''}
          ${car.nota?`<div style="font-size:12px;color:var(--text-2);font-style:italic;margin-top:3px">"${esc(car.nota)}"</div>`:''}
          ${rAuditoriaAuto(car)}
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${ms.length>0?`<span class="badge bg-green" style="margin-top:4px">${ms.length} match${ms.length>1?'es':''}</span>`:`<span class="badge bg-gray" style="margin-top:4px">Sin matches</span>`}
        </div>
      </div>

      ${ms.length>0?`
      <div class="sep" style="padding-top:8px;margin-top:0">
        <div style="font-size:12px;color:var(--text-3);margin-bottom:6px">Clientes interesados:</div>
        ${ms.map(c=>`
        <div class="row" style="padding:7px 0;border-bottom:1px solid var(--border)">
          ${rAv(c.name)}
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500">${esc(c.name)}</div>
            <div style="font-size:12px;color:var(--text-2)">${c.phone}</div>
          </div>
          ${rScoreRow(c.sc)}
          <button class="btn sm" onclick="showMatchDetail('${c.id}','${car.id}')" style="border-color:var(--gold-border);color:var(--gold)">Match</button>
          ${whatsappBtn(c.phone,c.name,true)}
        </div>`).join('')}
      </div>`:''}

      <div class="sep" style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
        <a href="peritaje.html?id=${car.id}" class="btn sm" style="${hasPeritaje?'color:var(--gold);border-color:var(--gold-border)':''}">📋 ${hasPeritaje?'Ver peritaje':'Peritaje'}</a>
        <button class="btn sm" onclick="editCar('${car.id}')">Editar</button>
        <button class="btn sm" onclick="setCarStatus('${car.id}','reservado')">Reservar</button>
        <button class="btn sm success" onclick="setCarStatus('${car.id}','vendido')">Vendido</button>
        <button class="btn sm danger" onclick="delCar('${car.id}')">Eliminar</button>
      </div>
    </div>`;
  });

  if (others.length > 0) {
    html += `
    <details style="margin-top:1.25rem">
      <summary>Vendidos / Reservados (${others.length})</summary>
      <div style="margin-top:10px">
        ${others.map(car=>`
        <div class="card" style="opacity:.55">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <div>
              <span style="font-weight:500;color:var(--text-2)">${esc(car.brand)} ${esc(car.model)} ${car.year}</span>
              ${car.patente?`<span style="font-size:11px;color:var(--text-3);margin-left:6px">[${esc(car.patente)}]</span>`:''}
              ${car.km===0?'<span class="badge bg-blue" style="margin-left:6px">0 km</span>':''}
              ${rAuditoriaAuto(car)}
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <span class="badge ${car.status==='vendido'?'bg-green':'bg-orange'}">${car.status}</span>
              <button class="btn sm" onclick="setCarStatus('${car.id}','disponible')">Disponible</button>
              <button class="btn sm danger" onclick="delCar('${car.id}')">Eliminar</button>
            </div>
          </div>
        </div>`).join('')}
      </div>
    </details>`;
  }

  document.getElementById('view').innerHTML = html;
}

/* ── Boot ── */
bootApp('vehiculos');
render();