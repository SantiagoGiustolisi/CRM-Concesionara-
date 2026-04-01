/* ═══════════════════════════════════════════════════════════════════
   CRM Concesionaria Premium — app.js
   ═══════════════════════════════════════════════════════════════════ */

const TIPOS  = ['Sedan','Hatchback','SUV','Pickup','Camioneta','Coupé','Familiar','Utilitario'];
const MARCAS = ['Fiat','Ford','Chevrolet','Volkswagen','Renault','Toyota','Peugeot','Citroën','Nissan','Honda','Jeep','Dodge','RAM','Otra'];
const BUDGET_RANGES = [
  { label:'Hasta $5M',    min:0,         max:5000000   },
  { label:'$5M – $10M',  min:5000000,   max:10000000  },
  { label:'$10M – $15M', min:10000000,  max:15000000  },
  { label:'$15M – $20M', min:15000000,  max:20000000  },
  { label:'Más de $20M', min:20000000,  max:Infinity  },
];

let S = {
  view: 'dash',
  clients: [], cars: [],
  addClient: false, addCar: false,
  editClient: null, editCar: null,
  matches: null,
};

/* ── Chart instances ──────────────────────────────────────────────── */
const _charts = {};

function destroyChart(id) {
  if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
}

/* ── Persistence ──────────────────────────────────────────────────── */
function save() {
  try {
    localStorage.setItem('crm_clients', JSON.stringify(S.clients));
    localStorage.setItem('crm_cars',    JSON.stringify(S.cars));
  } catch(e) {}
}
function load() {
  try {
    const c = localStorage.getItem('crm_clients');
    const v = localStorage.getItem('crm_cars');
    if (c) S.clients = JSON.parse(c);
    if (v) S.cars    = JSON.parse(v);
  } catch(e) {}
}

/* ── Helpers ──────────────────────────────────────────────────────── */
function fp(n)    { return '$' + parseInt(n).toLocaleString('es-AR'); }
function fk(n)    { return parseInt(n).toLocaleString('es-AR') + ' km'; }
function ini(nm)  { return nm.trim().split(/\s+/).map(w=>w[0]||'').join('').toUpperCase().slice(0,2); }
function uid()    { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function today()  { return new Date().toLocaleDateString('es-AR'); }
function cleanPhone(p) { return p.replace(/\D/g,''); }

/* ── WhatsApp ─────────────────────────────────────────────────────── */
function openWhatsApp(phone, name) {
  const num  = cleanPhone(phone);
  const full = num.startsWith('54') ? num : '54' + num;
  const msg  = encodeURIComponent(`Hola ${name}! Te contactamos desde la concesionaria. ¿Cómo estás? Tenemos novedades que pueden interesarte.`);
  window.open(`https://wa.me/${full}?text=${msg}`, '_blank');
}

/* ── Matching ─────────────────────────────────────────────────────────
   Pesos por criterio:
     Tipo        25 pts  CRITICO: sedan vs camioneta = no rotundo
     Presupuesto 25 pts  CRITICO: >10% del budget = excluido, no aparece
     Modelo      30 pts  MUY importante: match exacto o parcial sobre el modelo
     Marca       25 pts  importante: match exacto de marca
     Transmision 10 pts  negociable, baja score pero sigue apareciendo
     Anio         5 pts  deseable
     Color        3 pts  bonus menor si el cliente lo menciono en notas
     KM           2 pts  bonus menor si el auto tiene bajo kilometraje
──────────────────────────────────────────────────────────────────── */
const WEIGHTS = { tipo: 25, budget: 25, model: 30, brand: 25, trans: 10, year: 5, color: 3, km: 2 };

function score(client, car) {
  let possible = 0, earned = 0;

  // PRESUPUESTO -- si supera >10% del budget: retorna -1 para excluirlo del listado
  if (client.budget) {
    if (car.price > client.budget * 1.10) return -1;
    possible += WEIGHTS.budget;
    if (car.price <= client.budget) earned += WEIGHTS.budget;
    else                            earned += Math.round(WEIGHTS.budget * 0.4); // hasta +10%: penalizado
  }

  // TIPO -- critico
  if (client.tipo) {
    possible += WEIGHTS.tipo;
    if (car.tipo === client.tipo) earned += WEIGHTS.tipo;
  }

  // MARCA -- importante, match exacto
  if (client.brand) {
    possible += WEIGHTS.brand;
    const cb = client.brand.toLowerCase().trim();
    if (car.brand.toLowerCase().trim() === cb) {
      earned += WEIGHTS.brand;
    } else if (car.brand.toLowerCase().includes(cb) || cb.includes(car.brand.toLowerCase())) {
      earned += Math.round(WEIGHTS.brand * 0.6); // match parcial de marca
    }
  }

  // MODELO -- más peso que marca, match exacto o parcial/fuzzy
  if (client.model) {
    possible += WEIGHTS.model;
    const cm      = client.model.toLowerCase().trim();
    const carModel = car.model.toLowerCase().trim();
    const carFull  = (car.brand + ' ' + car.model).toLowerCase();
    if (carModel === cm || carFull === cm) {
      earned += WEIGHTS.model;                              // match exacto
    } else if (carModel.includes(cm) || cm.includes(carModel)) {
      earned += Math.round(WEIGHTS.model * 0.85);          // match parcial fuerte (ej: "Ranger" en "Ranger XL")
    } else if (cm.split(/\s+/).some(w => w.length > 2 && carModel.includes(w))) {
      earned += Math.round(WEIGHTS.model * 0.5);           // match parcial por palabra
    }
  }

  // TRANSMISION -- negociable
  if (client.trans) {
    possible += WEIGHTS.trans;
    if (car.trans === client.trans) earned += WEIGHTS.trans;
  }

  // ANIO -- deseable
  if (client.yearMin || client.yearMax) {
    possible += WEIGHTS.year;
    const ok = (!client.yearMin || car.year >= +client.yearMin) &&
               (!client.yearMax || car.year <= +client.yearMax);
    if (ok) earned += WEIGHTS.year;
  }

  // COLOR -- bonus menor: si el cliente menciono el color del auto en sus notas
  if (car.color && client.notes) {
    possible += WEIGHTS.color;
    if (client.notes.toLowerCase().includes(car.color.toLowerCase())) earned += WEIGHTS.color;
  }

  // KM -- bonus menor: menos km es mejor
  if (car.km !== null && car.km !== undefined) {
    possible += WEIGHTS.km;
    if (car.km <= 80000)      earned += WEIGHTS.km;
    else if (car.km <= 150000) earned += Math.round(WEIGHTS.km * 0.5);
  }

  return possible === 0 ? 0 : Math.round((earned / possible) * 100);
}

function scoreStyle(s) {
  if (s >= 80) return 'color:var(--green);';
  if (s >= 50) return 'color:var(--orange);';
  return 'color:var(--text-3);';
}
function scoreFill(s) {
  const color = s >= 80 ? 'var(--green)' : s >= 50 ? 'var(--orange)' : 'var(--text-3)';
  return `<div class="score-bar"><div class="score-fill" style="width:${s}%;background:${color}"></div></div>`;
}
function matchDetail(client, car) {
  const checks = [];

  if (client.tipo) {
    const ok = car.tipo === client.tipo;
    checks.push({ label: 'Tipo de vehículo', client: client.tipo, car: car.tipo, ok, weight: WEIGHTS.tipo, critical: true });
  }
  if (client.budget) {
    const diff    = car.price - client.budget;
    const pctOver = diff / client.budget;
    let ok, warn = null;
    if (car.price <= client.budget)             { ok = true; }
    else if (car.price <= client.budget * 1.10) { ok = 'partial'; warn = `+${fp(diff)} sobre el budget`; }
    else                                         { ok = false;     warn = `Supera el budget en más del 10%`; }
    checks.push({ label: 'Presupuesto', client: fp(client.budget), car: fp(car.price), ok, warn, weight: WEIGHTS.budget, critical: true });
  }
  if (client.brand) {
    const cb  = client.brand.toLowerCase().trim();
    const carB = car.brand.toLowerCase().trim();
    let ok;
    if (carB === cb) ok = true;
    else if (carB.includes(cb) || cb.includes(carB)) ok = 'partial';
    else ok = false;
    checks.push({ label: 'Marca', client: client.brand, car: car.brand, ok, weight: WEIGHTS.brand });
  }
  if (client.model) {
    const cm      = client.model.toLowerCase().trim();
    const carModel = car.model.toLowerCase().trim();
    const carFull  = (car.brand + ' ' + car.model).toLowerCase();
    let ok;
    if (carModel === cm || carFull === cm)                ok = true;
    else if (carModel.includes(cm) || cm.includes(carModel)) ok = 'partial';
    else if (cm.split(/\s+/).some(w => w.length > 2 && carModel.includes(w))) ok = 'partial';
    else ok = false;
    checks.push({ label: 'Modelo', client: client.model, car: car.model, ok, weight: WEIGHTS.model });
  }
  if (client.trans) {
    const ok = car.trans === client.trans;
    checks.push({ label: 'Transmisión', client: client.trans, car: car.trans, ok, weight: WEIGHTS.trans });
  }
  if (client.yearMin || client.yearMax) {
    const ok = (!client.yearMin || car.year >= +client.yearMin) &&
               (!client.yearMax || car.year <= +client.yearMax);
    checks.push({ label: 'Año', client: `${client.yearMin||'?'} – ${client.yearMax||'?'}`, car: String(car.year), ok, weight: WEIGHTS.year });
  }
  // COLOR — bonus menor
  if (car.color && client.notes) {
    const ok = client.notes.toLowerCase().includes(car.color.toLowerCase());
    checks.push({ label: 'Color', client: `mencionado en notas`, car: car.color, ok, weight: WEIGHTS.color, bonus: true });
  }
  // KM — bonus menor
  if (car.km !== null && car.km !== undefined) {
    const ok = car.km <= 80000 ? true : car.km <= 150000 ? 'partial' : false;
    const kmLabel = car.km <= 80000 ? 'Bajo (≤80k km)' : car.km <= 150000 ? 'Moderado' : 'Alto (>150k km)';
    checks.push({ label: 'Kilometraje', client: 'Menor mejor', car: fk(car.km) + ' — ' + kmLabel, ok, weight: WEIGHTS.km, bonus: true });
  }
  return checks;
}

/* ── Match detail popup ───────────────────────────────────────────── */
function showMatchDetail(clientId, carId) {
  const client = S.clients.find(c => c.id === clientId);
  const car    = S.cars.find(c => c.id === carId);
  if (!client || !car) return;

  const checks = matchDetail(client, car);
  const sc     = score(client, car);

  const rows = checks.map(ch => {
    const isOk      = ch.ok === true;
    const isPartial = ch.ok === 'partial';
    const isBad     = ch.ok === false;
    const iconBg    = isOk ? 'var(--green-bg)' : isPartial ? 'var(--orange-bg)' : 'var(--red-bg)';
    const iconBord  = isOk ? 'var(--green-border)' : isPartial ? 'rgba(224,144,85,0.25)' : 'rgba(224,85,85,0.2)';
    const iconColor = isOk ? 'var(--green)' : isPartial ? 'var(--orange)' : 'var(--red)';
    const icon      = isOk ? '✓' : isPartial ? '~' : '✗';
    const valColor  = isOk ? 'var(--green)' : isPartial ? 'var(--orange)' : 'var(--red)';
    const weightTag = ch.critical
      ? `<span style="font-size:9px;background:rgba(224,85,85,0.12);color:var(--red);border:1px solid rgba(224,85,85,0.2);padding:1px 6px;border-radius:100px;letter-spacing:.06em">CRÍTICO</span>`
      : ch.bonus
      ? `<span style="font-size:9px;background:var(--gold-bg);color:var(--gold);border:1px solid var(--gold-border);padding:1px 6px;border-radius:100px;letter-spacing:.06em">BONUS ${ch.weight}pts</span>`
      : `<span style="font-size:9px;background:var(--surface-3);color:var(--text-3);border:1px solid var(--border);padding:1px 6px;border-radius:100px">${ch.weight} pts</span>`;
    return `
    <div style="display:flex;align-items:start;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)">
      <div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;
        background:${iconBg};border:1px solid ${iconBord}">
        <span style="font-size:12px;color:${iconColor};font-weight:700">${icon}</span>
      </div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <div style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-2)">${ch.label}</div>
          ${weightTag}
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span style="font-size:13px;color:var(--text-3)">Quiere: <strong style="color:var(--text)">${ch.client}</strong></span>
          <span style="color:var(--text-3);font-size:11px">→</span>
          <span style="font-size:13px;color:var(--text-3)">Auto: <strong style="color:${valColor}">${ch.car}</strong></span>
        </div>
        ${ch.warn ? `<div style="font-size:11px;color:${isBad?'var(--red)':'var(--orange)'};margin-top:3px">${ch.warn}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  const noChecks = checks.length === 0
    ? `<div style="font-size:13px;color:var(--text-3);padding:1rem 0">El cliente no especificó preferencias — cualquier auto puede interesarle.</div>`
    : '';

  const scoreColor = sc >= 80 ? 'var(--green)' : sc >= 50 ? 'var(--orange)' : 'var(--red)';
  const rec = sc >= 80
    ? { label: 'Recomendado ofrecerlo', color: 'var(--green)', bg: 'var(--green-bg)', border: 'var(--green-border)' }
    : sc >= 50
    ? { label: 'Puede interesarle', color: 'var(--orange)', bg: 'var(--orange-bg)', border: 'rgba(224,144,85,0.2)' }
    : { label: 'Poco compatible', color: 'var(--red)', bg: 'var(--red-bg)', border: 'rgba(224,85,85,0.2)' };

  const html = `
  <div class="modal-overlay" onclick="if(event.target===this)closeMatchDetail()">
    <div class="modal">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1.25rem">
        <div>
          <div class="modal-title" style="margin-bottom:4px">Análisis de compatibilidad</div>
          <div style="font-size:13px;color:var(--text-2)">${client.name} <span style="color:var(--text-3)">→</span> ${car.brand} ${car.model} ${car.year}</div>
          <div style="margin-top:8px;display:inline-block;font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px;
            background:${rec.bg};color:${rec.color};border:1px solid ${rec.border}">${rec.label}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:1rem">
          <div style="font-family:var(--font-display);font-size:36px;font-weight:700;color:${scoreColor};line-height:1">${sc}%</div>
          <div style="font-size:10px;color:var(--text-3);letter-spacing:.06em;text-transform:uppercase;margin-top:2px">compatibilidad</div>
        </div>
      </div>
      <div style="font-size:10px;color:var(--text-3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">Criterios evaluados</div>
      ${rows}
      ${noChecks}
      ${client.notes ? `<div style="margin-top:12px;padding:10px 12px;background:var(--surface-2);border-radius:var(--radius);border:1px solid var(--border)">
        <div style="font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);margin-bottom:4px">Nota del cliente</div>
        <div style="font-size:13px;color:var(--text-2);font-style:italic">"${client.notes}"</div>
      </div>` : ''}
      <div class="modal-footer">
        <button class="btn" onclick="closeMatchDetail()">Cerrar</button>
        ${whatsappBtn(client.phone, client.name, false)}
      </div>
    </div>
  </div>`;

  const el = document.createElement('div');
  el.id = 'match-detail-overlay';
  el.innerHTML = html;
  document.body.appendChild(el);
}

function closeMatchDetail() {
  const el = document.getElementById('match-detail-overlay');
  if (el) el.remove();
}

function matchesForCar(car) {
  return S.clients.filter(c => c.status === 'activo')
    .map(c => ({ ...c, sc: score(c, car) }))
    .filter(c => c.sc > 0).sort((a,b) => b.sc - a.sc);   // sc=-1 queda filtrado por >0
}
function matchesForClient(client) {
  return S.cars.filter(c => c.status === 'disponible')
    .map(car => ({ ...car, sc: score(client, car) }))
    .filter(car => car.sc > 0).sort((a,b) => b.sc - a.sc);
}

/* ── Navigation ───────────────────────────────────────────────────── */
function go(v) {
  S.view = v; S.addClient = false; S.addCar = false;
  S.editClient = null; S.editCar = null; S.matches = null;
  render();
}

/* ── CRUD: Clients ────────────────────────────────────────────────── */
function addClient(e) {
  e.preventDefault();
  const f = e.target;
  S.clients.unshift({
    id: uid(),
    name: f.cname.value.trim(), phone: f.phone.value.trim(),
    brand: f.brand.value.trim(), model: f.model.value.trim(), tipo: f.tipo.value,
    budget: f.budget.value ? parseInt(f.budget.value) : null,
    trans: f.trans.value,
    yearMin: f.yearMin.value ? +f.yearMin.value : null,
    yearMax: f.yearMax.value ? +f.yearMax.value : null,
    notes: f.notes.value.trim(),
    status: 'activo', date: today(),
  });
  S.addClient = false; save(); render();
}

function saveEditClient(e) {
  e.preventDefault();
  const f  = e.target;
  const cl = S.clients.find(c => c.id === S.editClient);
  if (!cl) return;
  cl.name   = f.cname.value.trim();
  cl.phone  = f.phone.value.trim();
  cl.brand  = f.brand.value.trim();
  cl.model  = f.model.value.trim();
  cl.budget = f.budget.value ? parseInt(f.budget.value) : null;
  cl.trans  = f.trans.value;
  cl.yearMin = f.yearMin.value ? +f.yearMin.value : null;
  cl.yearMax = f.yearMax.value ? +f.yearMax.value : null;
  cl.notes  = f.notes.value.trim();
  S.editClient = null; save(); render();
}

function editClient(id) { S.editClient = id; render(); }
function cancelEditClient() { S.editClient = null; render(); }

function setClientStatus(id, st) {
  const c = S.clients.find(x => x.id === id);
  if (c) c.status = st;
  save(); render();
}
function delClient(id) {
  if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return;
  S.clients = S.clients.filter(c => c.id !== id);
  save(); render();
}

/* ── CRUD: Cars ───────────────────────────────────────────────────── */
function addCar(e) {
  e.preventDefault();
  const f = e.target;
  const car = {
    id: uid(),
    brand: f.brand.value.trim(), model: f.model.value.trim(),
    tipo: f.tipo.value, year: +f.year.value, price: +f.price.value,
    km: f.km.value ? +f.km.value : null, trans: f.trans.value,
    color: f.color.value.trim(), status: 'disponible', date: today(),
  };
  S.cars.unshift(car);
  S.matches = matchesForCar(car);
  S.addCar = false; save(); render();
}

function saveEditCar(e) {
  e.preventDefault();
  const f   = e.target;
  const car = S.cars.find(c => c.id === S.editCar);
  if (!car) return;
  car.brand = f.brand.value.trim(); car.model = f.model.value.trim();
  car.tipo  = f.tipo.value; car.year = +f.year.value;
  car.price = +f.price.value; car.km = f.km.value ? +f.km.value : null;
  car.trans = f.trans.value; car.color = f.color.value.trim();
  S.editCar = null; save(); render();
}

function editCar(id) { S.editCar = id; render(); }
function cancelEditCar() { S.editCar = null; render(); }

function setCarStatus(id, st) {
  const c = S.cars.find(x => x.id === id);
  if (c) c.status = st;
  save(); render();
}
function delCar(id) {
  if (!confirm('¿Eliminar este auto del stock? Esta acción no se puede deshacer.')) return;
  S.cars = S.cars.filter(c => c.id !== id);
  if (S.matches) S.matches = null;
  save(); render();
}

/* ── Stats helpers ────────────────────────────────────────────────── */
function topN(items, key, n) {
  const cnt = {};
  items.forEach(i => { const v = i[key]; if (v) cnt[v] = (cnt[v]||0)+1; });
  return Object.entries(cnt).sort((a,b) => b[1]-a[1]).slice(0,n);
}

/* ── Render helpers ───────────────────────────────────────────────── */
function rAv(name, lg, green) {
  return `<div class="av${lg?' lg':''}${green?' green':''}">${ini(name)}</div>`;
}
function rScoreRow(sc) {
  return `<div style="text-align:right"><div style="font-size:12px;font-weight:600;${scoreStyle(sc)}">${sc}%</div>${scoreFill(sc)}</div>`;
}
function rTags(c) {
  let t = '';
  if (c.brand) t += `<span class="tag">Marca: ${c.brand}</span>`;
  if (c.model) t += `<span class="tag">Modelo: ${c.model}</span>`;
  if (c.tipo)  t += `<span class="tag">${c.tipo}</span>`;
  if (c.trans) t += `<span class="tag">${c.trans}</span>`;
  if (c.budget) t += `<span class="tag">Hasta ${fp(c.budget)}</span>`;
  if (c.yearMin || c.yearMax) t += `<span class="tag">${c.yearMin||'?'} – ${c.yearMax||'?'}</span>`;
  if (!t) t = `<span class="tag" style="opacity:.4">Sin preferencias</span>`;
  return t;
}

function whatsappBtn(phone, name, sm) {
  return `<button class="btn whatsapp${sm?' sm':''}" onclick="openWhatsApp('${phone}','${name}')">
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
    WhatsApp
  </button>`;
}

/* ── Form: Client ─────────────────────────────────────────────────── */
function rClientForm(cl) {
  const edit = !!cl;
  return `<div class="form-section">
    <div class="form-title">${edit ? 'Editar cliente' : 'Nuevo cliente interesado'}</div>
    <form onsubmit="${edit ? 'saveEditClient(event)' : 'addClient(event)'}">
      <div class="fg2">
        <div class="fg"><label>Nombre *</label><input type="text" name="cname" placeholder="Juan Pérez" value="${edit?cl.name:''}" required></div>
        <div class="fg"><label>Teléfono *</label><input type="tel" name="phone" placeholder="351 555-0000" value="${edit?cl.phone:''}" required></div>
      </div>
      <div class="hint-box">
        <div class="hint-label">Intereses — completá solo lo que el cliente mencionó</div>
        <div class="fg2">
        <div class="fg2">
          <div class="fg"><label>Marca preferida</label>
            <input type="text" name="brand" placeholder="Fiat, Ford, Toyota..." value="${edit?cl.brand:''}" list="ml1">
            <datalist id="ml1">${MARCAS.map(m=>`<option value="${m}">`).join('')}</datalist>
          </div>
          <div class="fg"><label>Modelo preferido</label>
            <input type="text" name="model" placeholder="Ranger, Cronos, Corolla..." value="${edit&&cl.model?cl.model:''}">
          </div>
        </div>
          <div class="fg"><label>Tipo de vehículo</label>
            <select name="tipo"><option value="">— cualquiera —</option>${TIPOS.map(t=>`<option value="${t}"${edit&&cl.tipo===t?' selected':''}>${t}</option>`).join('')}</select>
          </div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Transmisión</label>
            <select name="trans">
              <option value="">— cualquiera —</option>
              <option value="manual"${edit&&cl.trans==='manual'?' selected':''}>Manual</option>
              <option value="automático"${edit&&cl.trans==='automático'?' selected':''}>Automático</option>
            </select>
          </div>
          <div class="fg"><label>Presupuesto máximo ($)</label><input type="number" name="budget" placeholder="15000000" min="0" value="${edit&&cl.budget?cl.budget:''}"></div>
        </div>
        <div class="fg2">
          <div class="fg"><label>Año desde</label><input type="number" name="yearMin" placeholder="2018" min="1990" max="2030" value="${edit&&cl.yearMin?cl.yearMin:''}"></div>
          <div class="fg"><label>Año hasta</label><input type="number" name="yearMax" placeholder="2024" min="1990" max="2030" value="${edit&&cl.yearMax?cl.yearMax:''}"></div>
        </div>
        <div class="fg"><label>Notas adicionales</label><textarea name="notes" placeholder="Quiere color oscuro, necesita 4x4...">${edit?cl.notes:''}</textarea></div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="btn" onclick="${edit ? 'cancelEditClient()' : 'S.addClient=false;render()'}">Cancelar</button>
        <button type="submit" class="btn primary">${edit ? 'Guardar cambios' : 'Guardar cliente'}</button>
      </div>
    </form>
  </div>`;
}

/* ── Form: Car ────────────────────────────────────────────────────── */
function rCarForm(car) {
  const edit = !!car;
  return `<div class="form-section">
    <div class="form-title">${edit ? 'Editar auto' : 'Agregar auto al stock'}</div>
    <form onsubmit="${edit ? 'saveEditCar(event)' : 'addCar(event)'}">
      <div class="fg2">
        <div class="fg"><label>Marca *</label>
          <input type="text" name="brand" placeholder="Ford" value="${edit?car.brand:''}" required list="ml2">
          <datalist id="ml2">${MARCAS.map(m=>`<option value="${m}">`).join('')}</datalist>
        </div>
        <div class="fg"><label>Modelo *</label><input type="text" name="model" placeholder="Ranger XL" value="${edit?car.model:''}" required></div>
      </div>
      <div class="fg2">
        <div class="fg"><label>Tipo *</label>
          <select name="tipo" required><option value="">— seleccioná —</option>${TIPOS.map(t=>`<option value="${t}"${edit&&car.tipo===t?' selected':''}>${t}</option>`).join('')}</select>
        </div>
        <div class="fg"><label>Transmisión *</label>
          <select name="trans" required>
            <option value="">— seleccioná —</option>
            <option value="manual"${edit&&car.trans==='manual'?' selected':''}>Manual</option>
            <option value="automático"${edit&&car.trans==='automático'?' selected':''}>Automático</option>
          </select>
        </div>
      </div>
      <div class="fg3">
        <div class="fg"><label>Año *</label><input type="number" name="year" placeholder="2022" min="1990" max="2030" value="${edit?car.year:''}" required></div>
        <div class="fg"><label>Precio ($) *</label><input type="number" name="price" placeholder="13000000" min="0" value="${edit?car.price:''}" required></div>
        <div class="fg"><label>Kilometraje</label><input type="number" name="km" placeholder="45000" min="0" value="${edit&&car.km?car.km:''}"></div>
      </div>
      <div class="fg"><label>Color</label><input type="text" name="color" placeholder="Blanco, Rojo..." value="${edit&&car.color?car.color:''}"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button type="button" class="btn" onclick="${edit ? 'cancelEditCar()' : 'S.addCar=false;render()'}">Cancelar</button>
        <button type="submit" class="btn primary">${edit ? 'Guardar cambios' : 'Guardar auto'}</button>
      </div>
    </form>
  </div>`;
}

/* ── Dashboard ────────────────────────────────────────────────────── */
function rDash() {
  const ac   = S.clients.filter(c=>c.status==='activo').length;
  const av   = S.cars.filter(c=>c.status==='disponible').length;
  const tv   = S.cars.filter(c=>c.status==='disponible').reduce((s,c)=>s+c.price,0);
  const sold = S.cars.filter(c=>c.status==='vendido').length;
  const hot  = S.cars.filter(c=>c.status==='disponible' && matchesForCar(c).length>0);

  // Charts data for dashboard
  const allClients = S.clients;
  const brandData  = topN(allClients.filter(c=>c.brand), 'brand', 6);
  const tipoData   = topN(allClients.filter(c=>c.tipo),  'tipo',  6);

  setTimeout(() => {
    renderDashCharts(brandData, tipoData);
  }, 50);

  return `
  <div class="metrics-grid">
    <div class="metric">
      <div class="metric-label">Clientes activos</div>
      <div class="metric-value">${ac}</div>
      <div class="metric-sub">en seguimiento</div>
    </div>
    <div class="metric">
      <div class="metric-label">Autos disponibles</div>
      <div class="metric-value">${av}</div>
      <div class="metric-sub">en stock</div>
    </div>
    <div class="metric">
      <div class="metric-label">Valor del stock</div>
      <div class="metric-value" style="font-size:${tv>99999999?'18px':tv>9999999?'22px':'28px'}">${tv>0?fp(tv):'—'}</div>
      <div class="metric-sub">disponible</div>
    </div>
    <div class="metric">
      <div class="metric-label">Autos vendidos</div>
      <div class="metric-value">${sold}</div>
      <div class="metric-sub">total histórico</div>
    </div>
  </div>

  ${allClients.length > 0 ? `
  <div class="charts-grid-2" style="margin-bottom:1.5rem">
    <div class="stats-card">
      <div class="stats-card-title">Marcas más pedidas por clientes</div>
      <div class="chart-container"><canvas id="dash-brands-chart"></canvas></div>
    </div>
    <div class="stats-card">
      <div class="stats-card-title">Tipos de vehículo más pedidos</div>
      <div class="chart-container"><canvas id="dash-tipos-chart"></canvas></div>
    </div>
  </div>` : ''}

  <div class="section-head">
    <div class="section-title">Oportunidades de venta</div>
    ${hot.length>0?`<span class="badge bg-green">${hot.length} auto${hot.length>1?'s':''} con matches</span>`:''}
  </div>

  ${hot.length===0 ? `<div class="empty">
    <div class="empty-icon">◎</div>
    <strong>Sin oportunidades activas</strong>
    <div style="font-size:13px;margin-top:4px">Cargá clientes y autos al stock para ver coincidencias.</div>
  </div>` : hot.map(car => {
    const ms = matchesForCar(car);
    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px">
        <div>
          <div style="font-weight:600;font-size:15px">${car.brand} ${car.model} <span style="color:var(--text-3);font-weight:400">${car.year}</span></div>
          <div style="font-size:13px;color:var(--text-2)">${fp(car.price)} · ${car.tipo} · ${car.trans}${car.km?' · '+fk(car.km):''}</div>
        </div>
        <span class="badge bg-gold">${ms.length} interesado${ms.length>1?'s':''}</span>
      </div>
      ${ms.slice(0,4).map(c=>`
        <div class="row" style="padding:8px 0;border-top:1px solid var(--border)">
          ${rAv(c.name)}
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500">${c.name}</div>
            <div style="font-size:12px;color:var(--text-2)">${c.phone}</div>
          </div>
          ${rScoreRow(c.sc)}
          <button class="btn sm" onclick="showMatchDetail('${c.id}','${car.id}')" style="border-color:var(--gold-border);color:var(--gold);white-space:nowrap">Ver coincidencias</button>
          ${whatsappBtn(c.phone, c.name, true)}
        </div>`).join('')}
      ${ms.length>4?`<div style="font-size:12px;color:var(--text-3);text-align:center;padding-top:8px">+${ms.length-4} clientes más</div>`:''}
    </div>`;
  }).join('')}`;
}

/* ── Dashboard charts ─────────────────────────────────────────────── */
function renderDashCharts(brandData, tipoData) {
  const GOLD_COLORS = [
    'rgba(201,169,110,0.85)', 'rgba(91,155,213,0.85)', 'rgba(76,175,125,0.85)',
    'rgba(224,144,85,0.85)',  'rgba(180,100,160,0.85)', 'rgba(100,180,160,0.85)'
  ];
  const chartDefaults = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  if (brandData.length > 0 && document.getElementById('dash-brands-chart')) {
    destroyChart('dash-brands');
    _charts['dash-brands'] = new Chart(document.getElementById('dash-brands-chart'), {
      type: 'bar',
      data: {
        labels: brandData.map(([l])=>l),
        datasets: [{ data: brandData.map(([,v])=>v), backgroundColor: GOLD_COLORS, borderRadius: 4, borderSkipped: false }]
      },
      options: {
        ...chartDefaults,
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#666' } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#666', stepSize: 1 }, beginAtZero: true }
        }
      }
    });
  }

  if (tipoData.length > 0 && document.getElementById('dash-tipos-chart')) {
    destroyChart('dash-tipos');
    _charts['dash-tipos'] = new Chart(document.getElementById('dash-tipos-chart'), {
      type: 'doughnut',
      data: {
        labels: tipoData.map(([l])=>l),
        datasets: [{ data: tipoData.map(([,v])=>v), backgroundColor: GOLD_COLORS, borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        ...chartDefaults,
        cutout: '60%',
        plugins: {
          legend: { display: true, position: 'right', labels: { color: '#888', font: { size: 11 }, boxWidth: 10, padding: 8 } }
        }
      }
    });
  }
}

/* ── Clients view ─────────────────────────────────────────────────── */
function rClients() {
  const active   = S.clients.filter(c=>c.status==='activo');
  const inactive = S.clients.filter(c=>c.status!=='activo');
  return `
  <div class="section-head">
    <div class="section-title">Clientes interesados</div>
    <button class="btn primary" onclick="S.addClient=true;render()">+ Agregar cliente</button>
  </div>
  ${S.addClient ? rClientForm() : ''}
  ${S.editClient ? rClientForm(S.clients.find(c=>c.id===S.editClient)) : ''}
  ${S.clients.length===0&&!S.addClient ? `<div class="empty">
    <div class="empty-icon">○</div>
    <strong>No hay clientes cargados</strong>
    <div style="font-size:13px;margin-top:4px">Registrá clientes interesados para empezar a hacer matches.</div>
  </div>` : ''}
  ${active.map(c => {
    if (S.editClient === c.id) return '';
    const ms = matchesForClient(c);
    return `<div class="card">
      <div class="row" style="align-items:start">
        ${rAv(c.name,true)}
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:6px">
            <div>
              <div style="font-weight:600;font-size:15px">${c.name}</div>
              <div style="font-size:12px;color:var(--text-2)">${c.phone} · Cargado ${c.date}</div>
            </div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">
              ${ms.length>0?`<span class="badge bg-green">${ms.length} auto${ms.length>1?'s':''} disponible${ms.length>1?'s':''}</span>`:''}
              <span class="badge bg-blue">Activo</span>
            </div>
          </div>
          <div style="margin-top:8px">${rTags(c)}</div>
          ${c.notes?`<div style="font-size:12px;color:var(--text-2);margin-top:6px;font-style:italic">"${c.notes}"</div>`:''}
          ${ms.length>0?`<div class="sep">
            <div style="font-size:12px;color:var(--text-3);margin-bottom:6px">Autos disponibles que pueden interesarle:</div>
            ${ms.slice(0,3).map(car=>`<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid var(--border)">
              <span style="font-weight:500;color:var(--text-2)">${car.brand} ${car.model} ${car.year}${car.color?' · '+car.color:''}</span>
              <span style="font-weight:600;${scoreStyle(car.sc)}">${car.sc}% match · ${fp(car.price)}</span>
            </div>`).join('')}
          </div>`:''}
        </div>
      </div>
      <div class="sep" style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
        ${whatsappBtn(c.phone, c.name, true)}
        <button class="btn sm" onclick="editClient('${c.id}')">Editar</button>
        <button class="btn sm" onclick="setClientStatus('${c.id}','vendido')">Vendido</button>
        <button class="btn sm" onclick="setClientStatus('${c.id}','descartado')">Descartar</button>
        <button class="btn sm danger" onclick="delClient('${c.id}')">Eliminar</button>
      </div>
    </div>`;
  }).join('')}
  ${inactive.length>0?`<details style="margin-top:1.25rem">
    <summary>Inactivos (${inactive.length})</summary>
    <div style="margin-top:10px">
      ${inactive.map(c=>`<div class="card" style="opacity:.55">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div class="row">
            ${rAv(c.name)}
            <div>
              <div style="font-weight:500">${c.name}</div>
              <div style="font-size:12px;color:var(--text-3)">${c.phone}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span class="badge ${c.status==='vendido'?'bg-green':'bg-gray'}">${c.status}</span>
            ${whatsappBtn(c.phone, c.name, true)}
            <button class="btn sm" onclick="setClientStatus('${c.id}','activo')">Reactivar</button>
            <button class="btn sm danger" onclick="delClient('${c.id}')">Eliminar</button>
          </div>
        </div>
      </div>`).join('')}
    </div>
  </details>`:''}`;
}

/* ── Match banner ─────────────────────────────────────────────────── */
function rMatchBanner() {
  const ms = S.matches;
  if (!ms) return '';
  return `<div class="match-banner">
    <div class="match-banner-title">
      <span>${ms.length>0 ? `${ms.length} cliente${ms.length>1?'s':''} que podrían estar interesados` : 'Auto guardado correctamente'}</span>
      <button class="btn sm" onclick="S.matches=null;render()" style="background:transparent;color:var(--text-3)">×</button>
    </div>
    ${ms.length===0 ? `<div style="font-size:13px;color:var(--text-2)">Ningún cliente registrado coincide con este auto todavía.</div>` :
    ms.map(c=>`<div class="row" style="padding:8px 0;border-top:1px solid rgba(76,175,125,0.15)">
      ${rAv(c.name,false,true)}
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500">${c.name}</div>
        <div style="font-size:12px;color:var(--text-2)">${c.phone}</div>
      </div>
      ${rScoreRow(c.sc)}
      ${whatsappBtn(c.phone, c.name, true)}
    </div>`).join('')}
  </div>`;
}

/* ── Stock view ───────────────────────────────────────────────────── */
function rStock() {
  const avail  = S.cars.filter(c=>c.status==='disponible');
  const others = S.cars.filter(c=>c.status!=='disponible');
  return `
  <div class="section-head">
    <div class="section-title">Stock de autos</div>
    <button class="btn primary" onclick="S.addCar=true;S.matches=null;render()">+ Agregar auto</button>
  </div>
  ${S.addCar ? rCarForm() : ''}
  ${S.editCar ? rCarForm(S.cars.find(c=>c.id===S.editCar)) : ''}
  ${rMatchBanner()}
  ${S.cars.length===0&&!S.addCar ? `<div class="empty">
    <div class="empty-icon">◻</div>
    <strong>El stock está vacío</strong>
    <div style="font-size:13px;margin-top:4px">Agregá un auto y verás automáticamente qué clientes pueden estar interesados.</div>
  </div>` : ''}
  ${avail.map(car => {
    if (S.editCar === car.id) return '';
    const ms = matchesForCar(car);
    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:${ms.length?'10px':'0'}">
        <div>
          <div style="font-weight:600;font-size:15px">${car.brand} ${car.model}</div>
          <div style="font-size:13px;color:var(--text-2)">${car.year} · ${car.tipo} · ${car.trans}${car.km?' · '+fk(car.km):''}${car.color?' · '+car.color:''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:600;font-size:15px;color:var(--gold)">${fp(car.price)}</div>
          ${ms.length>0 ? `<span class="badge bg-green" style="margin-top:4px">${ms.length} match${ms.length>1?'es':''}</span>` : `<span class="badge bg-gray" style="margin-top:4px">Sin matches</span>`}
        </div>
      </div>
      ${ms.length>0 ? `<div class="sep" style="padding-top:8px;margin-top:0">
        <div style="font-size:12px;color:var(--text-3);margin-bottom:6px">Clientes que pueden estar interesados:</div>
        ${ms.map(c=>`<div class="row" style="padding:7px 0;border-bottom:1px solid var(--border)">
          ${rAv(c.name)}
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500">${c.name}</div>
            <div style="font-size:12px;color:var(--text-2)">${c.phone}</div>
          </div>
          ${rScoreRow(c.sc)}
          <button class="btn sm" onclick="showMatchDetail('${c.id}','${car.id}')" style="border-color:var(--gold-border);color:var(--gold);white-space:nowrap">Ver coincidencias</button>
          ${whatsappBtn(c.phone, c.name, true)}
        </div>`).join('')}
      </div>` : ''}
      <div class="sep" style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap">
        <button class="btn sm" onclick="editCar('${car.id}')">Editar</button>
        <button class="btn sm" onclick="setCarStatus('${car.id}','reservado')">Reservar</button>
        <button class="btn sm" onclick="setCarStatus('${car.id}','vendido')">Vendido</button>
        <button class="btn sm danger" onclick="delCar('${car.id}')">Eliminar</button>
      </div>
    </div>`;
  }).join('')}
  ${others.length>0?`<details style="margin-top:1.25rem">
    <summary>Vendidos / reservados (${others.length})</summary>
    <div style="margin-top:10px">
      ${others.map(car=>`<div class="card" style="opacity:.55">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <span style="font-weight:500;color:var(--text-2)">${car.brand} ${car.model} ${car.year}</span>
            <span style="color:var(--text-3)"> · ${fp(car.price)}</span>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span class="badge ${car.status==='vendido'?'bg-green':'bg-orange'}">${car.status}</span>
            <button class="btn sm" onclick="setCarStatus('${car.id}','disponible')">Disponible</button>
            <button class="btn sm danger" onclick="delCar('${car.id}')">Eliminar</button>
          </div>
        </div>
      </div>`).join('')}
    </div>
  </details>`:''}`;
}

/* ── Stats view ───────────────────────────────────────────────────── */
function rStats() {
  const all   = S.clients;
  const total = all.length;

  if (total === 0) {
    return `<div class="section-head"><div class="section-title">Estadísticas</div></div>
    <div class="empty">
      <div class="empty-icon">◈</div>
      <strong>Sin datos todavía</strong>
      <div style="font-size:13px;margin-top:4px">Registrá clientes para ver qué es lo más pedido en tu concesionaria.</div>
    </div>`;
  }

  const brands     = topN(all.filter(c=>c.brand), 'brand', 8);
  const brandTotal = all.filter(c=>c.brand).length;
  const brandMax   = brands.length > 0 ? brands[0][1] : 1;
  const tipos      = topN(all.filter(c=>c.tipo), 'tipo', 8);
  const tipoTotal  = all.filter(c=>c.tipo).length;
  const tipoMax    = tipos.length > 0 ? tipos[0][1] : 1;
  const withTrans  = all.filter(c=>c.trans);
  const manual     = withTrans.filter(c=>c.trans==='manual').length;
  const autoT      = withTrans.filter(c=>c.trans==='automático').length;
  const withBudget = all.filter(c=>c.budget);
  const budgetData = BUDGET_RANGES.map(r=>({
    label: r.label,
    count: withBudget.filter(c=>c.budget>r.min&&c.budget<=r.max).length,
  })).filter(b=>b.count>0);
  const budgetMax  = budgetData.length > 0 ? Math.max(...budgetData.map(b=>b.count)) : 1;
  const avgBudget  = withBudget.length > 0 ? Math.round(withBudget.reduce((s,c)=>s+c.budget,0)/withBudget.length) : null;
  const withYear   = all.filter(c=>c.yearMin||c.yearMax);
  const avgYearMin = withYear.length > 0 ? Math.round(withYear.reduce((s,c)=>s+(c.yearMin||c.yearMax),0)/withYear.length) : null;

  // Cars stats
  const stockBrands = topN(S.cars, 'brand', 8);
  const stockTipos  = topN(S.cars, 'tipo',  8);
  const stockMax    = stockBrands.length > 0 ? stockBrands[0][1] : 1;
  const stockTMax   = stockTipos.length  > 0 ? stockTipos[0][1]  : 1;

  const lines = [];
  if (brands.length>0)    lines.push(`El <strong>${Math.round(brands[0][1]/total*100)}%</strong> de los clientes prefieren <strong>${brands[0][0]}</strong>.`);
  if (tipos.length>0)     lines.push(`El tipo más pedido es <strong>${tipos[0][0]}</strong> (${Math.round(tipos[0][1]/total*100)}%).`);
  if (withTrans.length>0) {
    const winner = manual>=autoT ? 'manual' : 'automático';
    const pct    = Math.round(Math.max(manual,autoT)/withTrans.length*100);
    lines.push(`El ${pct}% prefiere transmisión <strong>${winner}</strong>.`);
  }
  if (avgBudget) lines.push(`Presupuesto promedio: <strong>${fp(avgBudget)}</strong>.`);
  if (avgYearMin) lines.push(`Los clientes buscan autos a partir del <strong>${avgYearMin}</strong> en promedio.`);

  const rBar = (label, count, total, maxCount, color) => {
    const pct    = total  > 0 ? Math.round(count/total*100) : 0;
    const barPct = maxCount > 0 ? Math.round(count/maxCount*100) : 0;
    return `<div class="insight-row">
      <div class="insight-label">${label}</div>
      <div class="insight-bar-wrap"><div class="insight-bar" style="width:${barPct}%;background:${color}"></div></div>
      <div class="insight-pct">${pct}%</div>
      <div class="insight-count">${count} cliente${count!==1?'s':''}</div>
    </div>`;
  };

  setTimeout(() => renderStatsCharts(brands, tipos, withTrans, manual, autoT, budgetData, stockBrands, stockTipos), 50);

  return `
  <div class="section-head">
    <div class="section-title">Estadísticas</div>
    <div style="font-size:13px;color:var(--text-3)">Basado en ${total} cliente${total>1?'s':''} registrado${total>1?'s':''}</div>
  </div>

  ${lines.length>0?`<div class="summary-box">
    <div style="font-size:10px;color:var(--gold);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;font-weight:600">Lo que más se pide en tu concesionaria</div>
    <ul>${lines.map(l=>`<li>— ${l}</li>`).join('')}</ul>
  </div>`:''}

  <div class="charts-grid" style="margin-bottom:10px">
    <div class="stats-card">
      <div class="stats-card-title">Marcas — demanda de clientes</div>
      <div class="chart-container"><canvas id="brands-chart"></canvas></div>
    </div>
    <div class="stats-card">
      <div class="stats-card-title">Tipos — demanda de clientes</div>
      <div class="chart-container"><canvas id="tipos-chart"></canvas></div>
    </div>
    <div class="stats-card">
      <div class="stats-card-title">Transmisión preferida</div>
      <div class="chart-container"><canvas id="trans-chart"></canvas></div>
    </div>
  </div>

  <div class="charts-grid-2" style="margin-bottom:10px">
    <div class="stats-card">
      <div class="stats-card-title">Marcas en stock actual</div>
      <div class="chart-container"><canvas id="stock-brands-chart"></canvas></div>
    </div>
    <div class="stats-card">
      <div class="stats-card-title">Tipos en stock actual</div>
      <div class="chart-container"><canvas id="stock-tipos-chart"></canvas></div>
    </div>
  </div>

  <div class="stats-grid-2">
    <div class="stats-card">
      <div class="stats-card-title">Rango de presupuesto</div>
      ${budgetData.length===0 ? `<div style="font-size:13px;color:var(--text-3)">Sin datos</div>` :
        budgetData.map(b=>rBar(b.label,b.count,withBudget.length,budgetMax,'var(--orange)')).join('')}
      ${avgBudget?`<div style="font-size:11px;color:var(--text-3);margin-top:8px">Promedio: ${fp(avgBudget)}</div>`:''}
    </div>
    ${avgYearMin ? `<div class="stats-card">
      <div class="stats-card-title">Año promedio buscado</div>
      <div style="font-family:var(--font-display);font-size:36px;font-weight:600;color:var(--gold);letter-spacing:-0.02em;margin:8px 0">${avgYearMin}<span style="font-size:16px;font-weight:400;color:var(--text-3)"> en adelante</span></div>
      <div style="font-size:12px;color:var(--text-3)">Basado en ${withYear.length} cliente${withYear.length>1?'s':''} que especificaron año</div>
    </div>` : '<div class="stats-card"><div class="stats-card-title">Año buscado</div><div style="font-size:13px;color:var(--text-3)">Sin datos</div></div>'}
  </div>`;
}

/* ── Stats charts ─────────────────────────────────────────────────── */
function renderStatsCharts(brands, tipos, withTrans, manual, autoT, budgetData, stockBrands, stockTipos) {
  const PALETTE = [
    'rgba(201,169,110,0.85)', 'rgba(91,155,213,0.85)', 'rgba(76,175,125,0.85)',
    'rgba(224,144,85,0.85)', 'rgba(180,100,160,0.85)', 'rgba(100,180,160,0.85)',
    'rgba(210,100,100,0.85)', 'rgba(130,180,80,0.85)'
  ];
  const gridColor = 'rgba(255,255,255,0.04)';
  const tickColor = '#555';
  const opts = { responsive: true, maintainAspectRatio: false };

  // Brands bar chart
  if (brands.length > 0 && document.getElementById('brands-chart')) {
    destroyChart('brands');
    _charts['brands'] = new Chart(document.getElementById('brands-chart'), {
      type: 'bar',
      data: {
        labels: brands.map(([l])=>l),
        datasets: [{ data: brands.map(([,v])=>v), backgroundColor: PALETTE, borderRadius: 4, borderSkipped: false }]
      },
      options: {
        ...opts, plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor, stepSize: 1 }, beginAtZero: true }
        }
      }
    });
  }

  // Tipos doughnut
  if (tipos.length > 0 && document.getElementById('tipos-chart')) {
    destroyChart('tipos');
    _charts['tipos'] = new Chart(document.getElementById('tipos-chart'), {
      type: 'doughnut',
      data: {
        labels: tipos.map(([l])=>l),
        datasets: [{ data: tipos.map(([,v])=>v), backgroundColor: PALETTE, borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        ...opts, cutout: '58%',
        plugins: { legend: { display: true, position: 'right', labels: { color: '#777', font: { size: 10 }, boxWidth: 9, padding: 6 } } }
      }
    });
  }

  // Trans pie
  if (withTrans.length > 0 && document.getElementById('trans-chart')) {
    destroyChart('trans');
    _charts['trans'] = new Chart(document.getElementById('trans-chart'), {
      type: 'pie',
      data: {
        labels: ['Manual', 'Automático'],
        datasets: [{ data: [manual, autoT], backgroundColor: ['rgba(201,169,110,0.85)','rgba(91,155,213,0.85)'], borderWidth: 0 }]
      },
      options: {
        ...opts,
        plugins: { legend: { display: true, position: 'bottom', labels: { color: '#777', font: { size: 11 }, boxWidth: 10, padding: 8 } } }
      }
    });
  }

  // Stock brands bar
  if (stockBrands.length > 0 && document.getElementById('stock-brands-chart')) {
    destroyChart('stock-brands');
    _charts['stock-brands'] = new Chart(document.getElementById('stock-brands-chart'), {
      type: 'bar',
      data: {
        labels: stockBrands.map(([l])=>l),
        datasets: [{ data: stockBrands.map(([,v])=>v), backgroundColor: 'rgba(76,175,125,0.75)', borderRadius: 4, borderSkipped: false }]
      },
      options: {
        ...opts, plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor, stepSize: 1 }, beginAtZero: true }
        }
      }
    });
  }

  // Stock tipos doughnut
  if (stockTipos.length > 0 && document.getElementById('stock-tipos-chart')) {
    destroyChart('stock-tipos');
    _charts['stock-tipos'] = new Chart(document.getElementById('stock-tipos-chart'), {
      type: 'doughnut',
      data: {
        labels: stockTipos.map(([l])=>l),
        datasets: [{ data: stockTipos.map(([,v])=>v), backgroundColor: PALETTE.slice().reverse(), borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        ...opts, cutout: '58%',
        plugins: { legend: { display: true, position: 'right', labels: { color: '#777', font: { size: 10 }, boxWidth: 9, padding: 6 } } }
      }
    });
  }
}

/* ── Main render ──────────────────────────────────────────────────── */
function render() {
  ['dash','clients','stock','stats'].forEach(v => {
    const el = document.getElementById('nb-'+v);
    if (el) el.className = 'nav-btn' + (S.view===v?' active':'');
  });
  let h = '';
  if      (S.view==='dash')    h = rDash();
  else if (S.view==='clients') h = rClients();
  else if (S.view==='stock')   h = rStock();
  else if (S.view==='stats')   h = rStats();
  document.getElementById('view').innerHTML = h;
}

load();
render();
