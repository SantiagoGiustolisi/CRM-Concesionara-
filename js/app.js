/* ═══════════════════════════════════════════════════════════════
   NEIFERT CRM — js/app.js
   Núcleo compartido: estado, persistencia, helpers, matching
   Incluir este archivo PRIMERO en todas las páginas
   ═══════════════════════════════════════════════════════════════ */

/* ── Constantes globales ── */
const TIPOS = ['Sedan', 'Hatchback', 'SUV', 'Pickup', 'Camioneta', 'Coupé', 'Familiar', 'Utilitario', 'Moto'];
const MARCAS = ['Fiat', 'Ford', 'Chevrolet', 'Volkswagen', 'Renault', 'Toyota', 'Peugeot', 'Citroën', 'Nissan', 'Honda', 'Jeep', 'Dodge', 'RAM', 'Hyundai', 'Kia', 'Geely', 'BMW', 'Audi', 'Otra'];
const MONEDAS = ['ARS', 'USD'];
const BUDGET_RANGES = [
  { label: 'Hasta $5M', min: 0, max: 5000000 },
  { label: '$5M – $10M', min: 5000000, max: 10000000 },
  { label: '$10M – $15M', min: 10000000, max: 15000000 },
  { label: '$15M – $20M', min: 15000000, max: 20000000 },
  { label: 'Más de $20M', min: 20000000, max: Infinity },
];

/* ── Pesos del motor de matching ── */
const WEIGHTS = { tipo: 25, budget: 25, model: 30, brand: 25, trans: 10, year: 5, color: 3, km: 2 };

/* ── Estado global compartido ── */
let S = {
  clients: [],
  cars: [],
  alertas: [],
  jerarquia: [],
};

/* ── Sesión / Auth ── */
function getSession() {
  return JSON.parse(localStorage.getItem('crm_session') || 'null');
}
function requireAuth() {
  const s = getSession();
  if (!s) { window.location.href = 'login.html'; return null; }
  return s;
}
function doLogout() {
  if (confirm('¿Querés cerrar sesión?')) {
    localStorage.removeItem('crm_session');
    window.location.href = 'login.html';
  }
}

/* ── Persistencia ── */
function save() {
  try {
    localStorage.setItem('crm_clients', JSON.stringify(S.clients));
    localStorage.setItem('crm_cars', JSON.stringify(S.cars));
    localStorage.setItem('crm_alertas', JSON.stringify(S.alertas));
    localStorage.setItem('crm_jerarquia', JSON.stringify(S.jerarquia));
  } catch (e) { console.warn('Error guardando:', e); }
}
function load() {
  try {
    const c = localStorage.getItem('crm_clients');
    const v = localStorage.getItem('crm_cars');
    const a = localStorage.getItem('crm_alertas');
    const j = localStorage.getItem('crm_jerarquia');
    if (c) S.clients = JSON.parse(c);
    if (v) S.cars = JSON.parse(v);
    if (a) S.alertas = JSON.parse(a);
    if (j) S.jerarquia = JSON.parse(j);
  } catch (e) { console.warn('Error cargando:', e); }
}

/* ── Helpers generales ── */
function fp(n) { return '$' + parseInt(n).toLocaleString('es-AR'); }
function fk(n) { return parseInt(n).toLocaleString('es-AR') + ' km'; }
function ini(nm) { return String(nm).trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function today() { return new Date().toLocaleDateString('es-AR'); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function cleanPhone(p) { return String(p).replace(/\D/g, ''); }
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* ── Cumpleaños ── */
function isBirthdayToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr), n = new Date();
  return d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr), n = new Date();
  let next = new Date(n.getFullYear(), d.getMonth(), d.getDate());
  if (next < n) next.setFullYear(next.getFullYear() + 1);
  return Math.ceil((next - n) / (1000 * 60 * 60 * 24));
}

/* ── WhatsApp ── */
function openWhatsApp(phone, name, msg) {
  const num = cleanPhone(phone);
  const full = num.startsWith('54') ? num : '54' + num;
  const m = msg || `Hola ${name}! Te contactamos desde NEIFERT Automotores. ¿Cómo estás?`;
  window.open(`https://wa.me/${full}?text=${encodeURIComponent(m)}`, '_blank');
}
function openWhatsAppBirthday(phone, name) {
  openWhatsApp(phone, name, `🎉 ¡Feliz cumpleaños ${name}! Te deseamos un excelente día desde el equipo de NEIFERT Automotores. 🎂🚗`);
}

/* ── Toast ── */
let _toastTimer;
function toast(msg, type = '') {
  let el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = 'toast'; }, 3500);
}

/* ── Render helpers compartidos ── */
function rAv(name, lg, green) {
  return `<div class="av${lg ? ' lg' : ''}${green ? ' green' : ''}">${ini(name)}</div>`;
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
function rScoreRow(sc) {
  return `<div style="text-align:right"><div style="font-size:12px;font-weight:600;${scoreStyle(sc)}">${sc}%</div>${scoreFill(sc)}</div>`;
}
function rTags(c) {
  let t = '';
  if (c.brand) t += `<span class="tag">Marca: ${esc(c.brand)}</span>`;
  if (c.model) t += `<span class="tag">Modelo: ${esc(c.model)}</span>`;
  if (c.tipo) t += `<span class="tag">${c.tipo}</span>`;
  if (c.trans) t += `<span class="tag">${c.trans}</span>`;
  if (c.budget) t += `<span class="tag">Hasta ${fp(c.budget)}</span>`;
  if (c.yearMin || c.yearMax) t += `<span class="tag">${c.yearMin || '?'} – ${c.yearMax || '?'}</span>`;
  if (!t) t = `<span class="tag" style="opacity:.4">Sin preferencias</span>`;
  return t;
}
function whatsappBtn(phone, name, sm) {
  return `<button class="btn whatsapp${sm ? ' sm' : ''}" onclick="openWhatsApp('${esc(phone)}','${esc(name)}')">
    <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
    WhatsApp
  </button>`;
}

/* ── Header compartido ── */
function renderHeader(activePage) {
  const session = getSession();
  const pendAlerts = S.alertas.filter(a => !a.done).length;
  /* Conteo de tareas vencidas para el dot de Tareas */
  let pendTareas = 0;
  try {
    const _t = JSON.parse(localStorage.getItem('crm_tareas') || '[]');
    const _hoy = new Date(); _hoy.setHours(0, 0, 0, 0);
    pendTareas = _t.filter(t => !t.done && new Date(t.fecha + 'T00:00:00') <= _hoy).length;
  } catch (e) { }

  const pages = [
    { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
    { id: 'clientes', label: 'Clientes', href: 'clientes.html' },
    { id: 'vehiculos', label: 'Vehículos', href: 'vehiculos.html' },
    { id: 'alertas', label: 'Alertas', href: 'alertas.html', dot: pendAlerts > 0 },
    { id: 'tareas', label: 'Tareas', href: 'tareas.html', dot: pendTareas > 0 },
    { id: 'gestoria', label: 'Gestoría', href: 'gestoria.html' },
    { id: 'peritaje', label: 'Peritaje', href: 'peritaje.html' },
  
  ];
  const navLinks = pages.map(p => {
    const isActive = p.id === activePage;
    const cls = `nav-btn${isActive ? ' active' : ''}${p.dot ? ' alert-dot' : ''}`;
    return `<a href="${p.href}" class="${cls}">${p.label}</a>`;
  }).join('');

  const headerEl = document.getElementById('app-header');
  if (!headerEl) return;
  headerEl.innerHTML = `
    <div class="header-inner">
      <a href="dashboard.html" class="logo">
        NEIFERT<span class="logo-dot">.</span>CRM
        <span class="logo-sub">Sistema de Gestión</span>
      </a>
      <nav class="nav">${navLinks}</nav>
      <div class="header-user">
        <span class="user-badge" id="user-name-badge">Hola, <strong>${esc(session ? session.nombre : '—')}</strong></span>
        <button class="btn-logout" onclick="doLogout()">Salir</button>
      </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   MOTOR DE MATCHING
   ═══════════════════════════════════════════════════════════════ */
function score(client, car) {
  let possible = 0, earned = 0;
  if (client.budget) {
    if (car.price > client.budget * 1.10) return -1;
    possible += WEIGHTS.budget;
    if (car.price <= client.budget) earned += WEIGHTS.budget;
    else earned += Math.round(WEIGHTS.budget * 0.4);
  }
  if (client.tipo) {
    possible += WEIGHTS.tipo;
    if (car.tipo === client.tipo) earned += WEIGHTS.tipo;
  }
  if (client.brand) {
    possible += WEIGHTS.brand;
    const cb = client.brand.toLowerCase().trim(), carB = car.brand.toLowerCase().trim();
    if (carB === cb) earned += WEIGHTS.brand;
    else if (carB.includes(cb) || cb.includes(carB)) earned += Math.round(WEIGHTS.brand * 0.6);
  }
  if (client.model) {
    possible += WEIGHTS.model;
    const cm = client.model.toLowerCase().trim();
    const carModel = (car.model || '').toLowerCase().trim();
    const carFull = (car.brand + ' ' + car.model).toLowerCase();
    if (carModel === cm || carFull === cm) earned += WEIGHTS.model;
    else if (carModel.includes(cm) || cm.includes(carModel)) earned += Math.round(WEIGHTS.model * 0.85);
    else if (cm.split(/\s+/).some(w => w.length > 2 && carModel.includes(w))) earned += Math.round(WEIGHTS.model * 0.5);
  }
  if (client.trans) {
    possible += WEIGHTS.trans;
    if (car.trans === client.trans) earned += WEIGHTS.trans;
  }
  if (client.yearMin || client.yearMax) {
    possible += WEIGHTS.year;
    const ok = (!client.yearMin || car.year >= +client.yearMin) && (!client.yearMax || car.year <= +client.yearMax);
    if (ok) earned += WEIGHTS.year;
  }
  if (car.color && client.notes) {
    possible += WEIGHTS.color;
    if (client.notes.toLowerCase().includes(car.color.toLowerCase())) earned += WEIGHTS.color;
  }
  if (car.km !== null && car.km !== undefined) {
    possible += WEIGHTS.km;
    if (car.km <= 80000) earned += WEIGHTS.km;
    else if (car.km <= 150000) earned += Math.round(WEIGHTS.km * 0.5);
  }
  return possible === 0 ? 0 : Math.round((earned / possible) * 100);
}

function matchesForCar(car) {
  return S.clients
    .filter(c => c.status === 'activo')
    .map(c => ({ ...c, sc: score(c, car) }))
    .filter(c => c.sc > 0)
    .sort((a, b) => b.sc - a.sc);
}
function matchesForClient(client) {
  return S.cars
    .filter(c => c.status === 'disponible')
    .map(car => ({ ...car, sc: score(client, car) }))
    .filter(car => car.sc > 0)
    .sort((a, b) => b.sc - a.sc);
}
function matchDetail(client, car) {
  const checks = [];
  if (client.tipo) checks.push({ label: 'Tipo', client: client.tipo, car: car.tipo, ok: car.tipo === client.tipo, weight: WEIGHTS.tipo, critical: true });
  if (client.budget) {
    const diff = car.price - client.budget;
    let ok, warn = null;
    if (car.price <= client.budget) ok = true;
    else if (car.price <= client.budget * 1.10) { ok = 'partial'; warn = `+${fp(diff)} sobre el budget`; }
    else { ok = false; warn = 'Supera el budget en más del 10%'; }
    checks.push({ label: 'Presupuesto', client: fp(client.budget), car: fp(car.price), ok, warn, weight: WEIGHTS.budget, critical: true });
  }
  if (client.brand) {
    const cb = client.brand.toLowerCase().trim(), carB = car.brand.toLowerCase().trim();
    let ok; if (carB === cb) ok = true; else if (carB.includes(cb) || cb.includes(carB)) ok = 'partial'; else ok = false;
    checks.push({ label: 'Marca', client: client.brand, car: car.brand, ok, weight: WEIGHTS.brand });
  }
  if (client.model) {
    const cm = client.model.toLowerCase().trim(), carModel = (car.model || '').toLowerCase().trim(), carFull = (car.brand + ' ' + car.model).toLowerCase();
    let ok;
    if (carModel === cm || carFull === cm) ok = true;
    else if (carModel.includes(cm) || cm.includes(carModel)) ok = 'partial';
    else if (cm.split(/\s+/).some(w => w.length > 2 && carModel.includes(w))) ok = 'partial';
    else ok = false;
    checks.push({ label: 'Modelo', client: client.model, car: car.model, ok, weight: WEIGHTS.model });
  }
  if (client.trans) checks.push({ label: 'Transmisión', client: client.trans, car: car.trans, ok: car.trans === client.trans, weight: WEIGHTS.trans });
  if (client.yearMin || client.yearMax) {
    const ok = (!client.yearMin || car.year >= +client.yearMin) && (!client.yearMax || car.year <= +client.yearMax);
    checks.push({ label: 'Año', client: `${client.yearMin || '?'} – ${client.yearMax || '?'}`, car: String(car.year), ok, weight: WEIGHTS.year });
  }
  if (car.color && client.notes) {
    const ok = client.notes.toLowerCase().includes(car.color.toLowerCase());
    checks.push({ label: 'Color', client: 'mencionado en notas', car: car.color, ok, weight: WEIGHTS.color, bonus: true });
  }
  if (car.km !== null && car.km !== undefined) {
    const ok = car.km <= 80000 ? true : car.km <= 150000 ? 'partial' : false;
    const kmLabel = car.km <= 80000 ? 'Bajo (≤80k km)' : car.km <= 150000 ? 'Moderado' : 'Alto (>150k km)';
    checks.push({ label: 'Kilometraje', client: 'Menor mejor', car: fk(car.km) + ' — ' + kmLabel, ok, weight: WEIGHTS.km, bonus: true });
  }
  return checks;
}

/* ── Modal de compatibilidad (compartido, usado en varios módulos) ── */
function showMatchDetail(clientId, carId) {
  const client = S.clients.find(c => c.id === clientId);
  const car = S.cars.find(c => c.id === carId);
  if (!client || !car) return;
  const checks = matchDetail(client, car);
  const sc = score(client, car);
  const rows = checks.map(ch => {
    const isOk = ch.ok === true, isPartial = ch.ok === 'partial';
    const iconBg = isOk ? 'var(--green-bg)' : isPartial ? 'var(--orange-bg)' : 'var(--red-bg)';
    const iconBord = isOk ? 'var(--green-border)' : isPartial ? 'rgba(224,144,85,0.25)' : 'rgba(224,85,85,0.2)';
    const iconColor = isOk ? 'var(--green)' : isPartial ? 'var(--orange)' : 'var(--red)';
    const icon = isOk ? '✓' : isPartial ? '~' : '✗';
    const valColor = isOk ? 'var(--green)' : isPartial ? 'var(--orange)' : 'var(--red)';
    const weightTag = ch.critical
      ? `<span style="font-size:9px;background:rgba(224,85,85,0.12);color:var(--red);border:1px solid rgba(224,85,85,0.2);padding:1px 6px;border-radius:100px">CRÍTICO</span>`
      : ch.bonus
        ? `<span style="font-size:9px;background:var(--gold-bg);color:var(--gold);border:1px solid var(--gold-border);padding:1px 6px;border-radius:100px">BONUS ${ch.weight}pts</span>`
        : `<span style="font-size:9px;background:var(--surface-3);color:var(--text-3);border:1px solid var(--border);padding:1px 6px;border-radius:100px">${ch.weight} pts</span>`;
    return `<div style="display:flex;align-items:start;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)">
      <div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;background:${iconBg};border:1px solid ${iconBord}">
        <span style="font-size:12px;color:${iconColor};font-weight:700">${icon}</span></div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <div style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-2)">${ch.label}</div>${weightTag}</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span style="font-size:13px;color:var(--text-3)">Quiere: <strong style="color:var(--text)">${ch.client}</strong></span>
          <span style="color:var(--text-3);font-size:11px">→</span>
          <span style="font-size:13px;color:var(--text-3)">Auto: <strong style="color:${valColor}">${ch.car}</strong></span></div>
        ${ch.warn ? `<div style="font-size:11px;color:${!isOk && !isPartial ? 'var(--red)' : 'var(--orange)'};margin-top:3px">${ch.warn}</div>` : ''}
      </div></div>`;
  }).join('');
  const scoreColor = sc >= 80 ? 'var(--green)' : sc >= 50 ? 'var(--orange)' : 'var(--red)';
  const rec = sc >= 80 ? { label: 'Recomendado ofrecerlo', color: 'var(--green)', bg: 'var(--green-bg)', border: 'var(--green-border)' }
    : sc >= 50 ? { label: 'Puede interesarle', color: 'var(--orange)', bg: 'var(--orange-bg)', border: 'rgba(224,144,85,0.2)' }
      : { label: 'Poco compatible', color: 'var(--red)', bg: 'var(--red-bg)', border: 'rgba(224,85,85,0.2)' };
  const html = `<div class="modal-overlay" onclick="if(event.target===this)closeMatchDetail()">
    <div class="modal">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1.25rem">
        <div>
          <div class="modal-title" style="margin-bottom:4px">Análisis de compatibilidad</div>
          <div style="font-size:13px;color:var(--text-2)">${esc(client.name)} → ${esc(car.brand)} ${esc(car.model)} ${car.year}</div>
          <div style="margin-top:8px;display:inline-block;font-size:11px;font-weight:600;padding:3px 10px;border-radius:100px;background:${rec.bg};color:${rec.color};border:1px solid ${rec.border}">${rec.label}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:1rem">
          <div style="font-family:var(--font-display);font-size:36px;font-weight:700;color:${scoreColor};line-height:1">${sc}%</div>
          <div style="font-size:10px;color:var(--text-3);letter-spacing:.06em;text-transform:uppercase;margin-top:2px">compatibilidad</div>
        </div>
      </div>
      <div style="font-size:10px;color:var(--text-3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">Criterios evaluados</div>
      ${rows}
      ${checks.length === 0 ? `<div style="font-size:13px;color:var(--text-3);padding:1rem 0">El cliente no especificó preferencias.</div>` : ''}
      ${client.notes ? `<div style="margin-top:12px;padding:10px 12px;background:var(--surface-2);border-radius:var(--radius);border:1px solid var(--border)">
        <div style="font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);margin-bottom:4px">Nota del cliente</div>
        <div style="font-size:13px;color:var(--text-2);font-style:italic">"${esc(client.notes)}"</div>
      </div>`: ''}
      <div class="modal-footer">
        <button class="btn" onclick="closeMatchDetail()">Cerrar</button>
        ${whatsappBtn(client.phone, client.name, false)}
      </div>
    </div>
  </div>`;
  const el = document.createElement('div'); el.id = 'match-detail-overlay'; el.innerHTML = html;
  document.body.appendChild(el);
}
function closeMatchDetail() { const el = document.getElementById('match-detail-overlay'); if (el) el.remove(); }

/* ── Generación automática de alertas ── */
function checkBirthdayAlerts() {
  S.clients.forEach(c => {
    if (!c.fechaCumple) return;
    if (isBirthdayToday(c.fechaCumple)) {
      const exists = S.alertas.some(a => a.tipo === 'birthday' && a.refId === c.id && a.date === today());
      if (!exists) S.alertas.unshift({
        id: uid(), tipo: 'birthday',
        titulo: `🎉 Cumpleaños de ${c.name}`,
        descripcion: `Hoy es el cumpleaños de ${c.name}. Teléfono: ${c.phone}`,
        fecha: todayISO(), creadoPor: 'Sistema', done: false, date: today(), refId: c.id, refPhone: c.phone, refName: c.name
      });
    }
  });
}
function checkITVAlerts() {
  S.cars.forEach(car => {
    if (car.itv === 'no' && car.itvVenc) {
      const diff = Math.ceil((new Date(car.itvVenc) - new Date()) / (1000 * 60 * 60 * 24));
      if (diff <= 30) {
        const exists = S.alertas.some(a => a.tipo === 'itv' && a.refId === car.id && !a.done);
        if (!exists) S.alertas.unshift({
          id: uid(), tipo: 'itv',
          titulo: `⚠️ ITV vencida: ${car.brand} ${car.model}`,
          descripcion: `Vence el ${car.itvVenc}. Patente: ${car.patente || 'N/D'}`,
          fecha: car.itvVenc, creadoPor: 'Sistema', done: false, date: today(), refId: car.id
        });
      }
    }
  });
}
function checkTurnoAlerts() {
  S.jerarquia.forEach(j => {
    if (!j.fechaTurno) return;
    const diff = Math.ceil((new Date(j.fechaTurno) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff <= 7) {
      const exists = S.alertas.some(a => a.tipo === 'turno' && a.refId === j.id && !a.done);
      if (!exists) S.alertas.unshift({
        id: uid(), tipo: 'turno',
        titulo: `📅 Turno de ${j.nombre} ${j.apellido}`,
        descripcion: `${j.rol || ''} — Turno: ${j.fechaTurno}`,
        fecha: j.fechaTurno, creadoPor: 'Sistema', done: false, date: today(), refId: j.id
      });
    }
  });
}

/* ── topN helper (para stats y dashboard) ── */
function topN(items, key, n) {
  const cnt = {};
  items.forEach(i => { const v = i[key]; if (v) cnt[v] = (cnt[v] || 0) + 1; });
  return Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, n);
}

/* ── Boot: cargar datos y verificar sesión ── */
function bootApp(activePage) {
  const session = requireAuth();
  if (!session) return;
  load();
  checkBirthdayAlerts();
  checkITVAlerts();
  checkTurnoAlerts();
  save();
  renderHeader(activePage);
}