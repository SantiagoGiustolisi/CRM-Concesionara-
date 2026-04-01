/* ═══════════════════════════════════════════════════════════════
   NEIFERT CRM — js/estadisticas.js
   ═══════════════════════════════════════════════════════════════ */

const _charts = {};
function destroyChart(id) { if(_charts[id]){_charts[id].destroy();delete _charts[id];} }

const PAL = [
  'rgba(201,169,110,0.85)','rgba(91,155,213,0.85)','rgba(76,175,125,0.85)',
  'rgba(224,144,85,0.85)','rgba(180,100,160,0.85)','rgba(100,180,160,0.85)',
  'rgba(210,100,100,0.85)','rgba(130,180,80,0.85)'
];
const GC = 'rgba(255,255,255,0.04)', TC = '#555';
const BASE_OPTS = { responsive:true, maintainAspectRatio:false };

/* ── Render principal ── */
function render() {
  const all   = S.clients;
  const total = all.length;

  if (total === 0) {
    document.getElementById('view').innerHTML = `
    <div class="section-head"><div class="section-title">Estadísticas</div></div>
    <div class="empty">
      <div class="empty-icon">◈</div>
      <strong>Sin datos todavía</strong>
      <div style="font-size:13px;margin-top:4px">Registrá clientes para ver las estadísticas de demanda.</div>
    </div>`;
    return;
  }

  /* Calcular datos */
  const brands       = topN(all.filter(c=>c.brand),'brand',8);
  const tipos        = topN(all.filter(c=>c.tipo),'tipo',8);
  const withTrans    = all.filter(c=>c.trans);
  const manual       = withTrans.filter(c=>c.trans==='manual').length;
  const autoT        = withTrans.filter(c=>c.trans==='automático').length;
  const withBudget   = all.filter(c=>c.budget);
  const budgetData   = BUDGET_RANGES.map(r=>({ label:r.label, count:withBudget.filter(c=>c.budget>r.min&&c.budget<=r.max).length })).filter(b=>b.count>0);
  const budgetMax    = budgetData.length>0 ? Math.max(...budgetData.map(b=>b.count)) : 1;
  const avgBudget    = withBudget.length>0 ? Math.round(withBudget.reduce((s,c)=>s+c.budget,0)/withBudget.length) : null;
  const withYear     = all.filter(c=>c.yearMin||c.yearMax);
  const avgYearMin   = withYear.length>0 ? Math.round(withYear.reduce((s,c)=>s+(c.yearMin||c.yearMax),0)/withYear.length) : null;

  /* Stock */
  const stockBrands  = topN(S.cars,'brand',8);
  const stockTipos   = topN(S.cars,'tipo',8);

  /* Stock valores */
  const stockTotal   = S.cars.filter(c=>c.status==='disponible').length;
  const stockValor   = S.cars.filter(c=>c.status==='disponible').reduce((s,c)=>s+c.price,0);
  const stockVendidos= S.cars.filter(c=>c.status==='vendido').length;

  /* Frases resumen */
  const lines = [];
  if (brands.length>0)    lines.push(`El <strong>${Math.round(brands[0][1]/total*100)}%</strong> de los clientes prefieren <strong>${brands[0][0]}</strong>.`);
  if (tipos.length>0)     lines.push(`El tipo más pedido es <strong>${tipos[0][0]}</strong> (${Math.round(tipos[0][1]/total*100)}%).`);
  if (withTrans.length>0) {
    const winner = manual>=autoT?'manual':'automático';
    lines.push(`El ${Math.round(Math.max(manual,autoT)/withTrans.length*100)}% prefiere transmisión <strong>${winner}</strong>.`);
  }
  if (avgBudget)  lines.push(`Presupuesto promedio de los clientes: <strong>${fp(avgBudget)}</strong>.`);
  if (avgYearMin) lines.push(`Los clientes buscan autos a partir del <strong>${avgYearMin}</strong> en promedio.`);

  const rBar = (label,count,total2,maxCount,color) => `
  <div class="insight-row">
    <div class="insight-label">${label}</div>
    <div class="insight-bar-wrap"><div class="insight-bar" style="width:${maxCount>0?Math.round(count/maxCount*100):0}%;background:${color}"></div></div>
    <div class="insight-pct">${total2>0?Math.round(count/total2*100):0}%</div>
    <div class="insight-count">${count} cliente${count!==1?'s':''}</div>
  </div>`;

  /* Programar renderizado de gráficos */
  setTimeout(()=>renderCharts(brands,tipos,withTrans,manual,autoT,stockBrands,stockTipos), 60);

  document.getElementById('view').innerHTML = `

  <div class="section-head">
    <div class="section-title">Estadísticas</div>
    <div style="font-size:13px;color:var(--text-3)">Basado en ${total} cliente${total>1?'s':''}</div>
  </div>

  <!-- Métricas stock -->
  <div class="metrics-grid" style="margin-bottom:1.25rem">
    <div class="metric">
      <div class="metric-label">Clientes totales</div>
      <div class="metric-value">${total}</div>
      <div class="metric-sub">${all.filter(c=>c.status==='activo').length} activos</div>
    </div>
    <div class="metric">
      <div class="metric-label">Stock disponible</div>
      <div class="metric-value">${stockTotal}</div>
      <div class="metric-sub">${stockVendidos} vendidos</div>
    </div>
    <div class="metric">
      <div class="metric-label">Valor del stock</div>
      <div class="metric-value" style="font-size:${stockValor>99999999?'16px':stockValor>9999999?'20px':'28px'}">${stockValor>0?fp(stockValor):'—'}</div>
      <div class="metric-sub">disponible</div>
    </div>
    <div class="metric">
      <div class="metric-label">Matches activos</div>
      <div class="metric-value">${S.cars.filter(c=>c.status==='disponible'&&S.clients.filter(cl=>cl.status==='activo').some(cl=>{const sc=(()=>{let p=0,e=0;if(cl.budget){if(c.price>cl.budget*1.10)return -1;}return 50;})();return sc>0;}).length}</div>
      <div class="metric-sub">oportunidades</div>
    </div>
  </div>

  <!-- Resumen textual -->
  ${lines.length>0?`
  <div class="summary-box">
    <div style="font-size:10px;color:var(--gold);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;font-weight:600">Resumen de demanda — lo más pedido</div>
    <ul>${lines.map(l=>`<li>— ${l}</li>`).join('')}</ul>
  </div>`:''}

  <!-- Charts demanda de clientes -->
  <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.1em;font-weight:600;margin-bottom:8px">Demanda de clientes</div>
  <div class="charts-grid" style="margin-bottom:10px">
    <div class="stats-card"><div class="stats-card-title">Marcas más pedidas</div><div class="chart-container"><canvas id="brands-chart"></canvas></div></div>
    <div class="stats-card"><div class="stats-card-title">Tipos de vehículo</div><div class="chart-container"><canvas id="tipos-chart"></canvas></div></div>
    <div class="stats-card"><div class="stats-card-title">Transmisión preferida</div><div class="chart-container"><canvas id="trans-chart"></canvas></div></div>
  </div>

  <!-- Charts stock -->
  <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.1em;font-weight:600;margin-bottom:8px">Composición del stock</div>
  <div class="charts-grid-2" style="margin-bottom:10px">
    <div class="stats-card"><div class="stats-card-title">Marcas en stock</div><div class="chart-container"><canvas id="stock-brands-chart"></canvas></div></div>
    <div class="stats-card"><div class="stats-card-title">Tipos en stock</div><div class="chart-container"><canvas id="stock-tipos-chart"></canvas></div></div>
  </div>

  <!-- Presupuesto y año -->
  <div class="stats-grid-2">
    <div class="stats-card">
      <div class="stats-card-title">Rango de presupuesto</div>
      ${budgetData.length===0?`<div style="font-size:13px;color:var(--text-3)">Sin datos de presupuesto</div>`:
        budgetData.map(b=>rBar(b.label,b.count,withBudget.length,budgetMax,'var(--orange)')).join('')}
      ${avgBudget?`<div style="font-size:11px;color:var(--text-3);margin-top:8px">Promedio: <strong style="color:var(--text)">${fp(avgBudget)}</strong></div>`:''}
    </div>
    ${avgYearMin?`
    <div class="stats-card">
      <div class="stats-card-title">Año promedio buscado</div>
      <div style="font-family:var(--font-display);font-size:40px;font-weight:600;color:var(--gold);letter-spacing:-.02em;margin:8px 0;line-height:1">
        ${avgYearMin}<span style="font-size:16px;font-weight:400;color:var(--text-3)"> en adelante</span>
      </div>
      <div style="font-size:12px;color:var(--text-3)">Basado en ${withYear.length} cliente${withYear.length>1?'s':''} que especificaron año</div>
    </div>`:
    `<div class="stats-card"><div class="stats-card-title">Año buscado</div><div style="font-size:13px;color:var(--text-3)">Clientes sin año especificado</div></div>`}
  </div>`;
}

/* ── Render charts ── */
function renderCharts(brands, tipos, withTrans, manual, autoT, stockBrands, stockTipos) {
  /* Marcas clientes */
  if (brands.length>0&&document.getElementById('brands-chart')) {
    destroyChart('brands');
    _charts['brands'] = new Chart(document.getElementById('brands-chart'), { type:'bar',
      data:{ labels:brands.map(([l])=>l), datasets:[{ data:brands.map(([,v])=>v), backgroundColor:PAL, borderRadius:4, borderSkipped:false }] },
      options:{ ...BASE_OPTS, plugins:{ legend:{ display:false } }, scales:{ x:{ grid:{color:GC}, ticks:{color:TC,font:{size:11}} }, y:{ grid:{color:GC}, ticks:{color:TC,stepSize:1}, beginAtZero:true } } }
    });
  }
  /* Tipos clientes */
  if (tipos.length>0&&document.getElementById('tipos-chart')) {
    destroyChart('tipos');
    _charts['tipos'] = new Chart(document.getElementById('tipos-chart'), { type:'doughnut',
      data:{ labels:tipos.map(([l])=>l), datasets:[{ data:tipos.map(([,v])=>v), backgroundColor:PAL, borderWidth:0, hoverOffset:6 }] },
      options:{ ...BASE_OPTS, cutout:'58%', plugins:{ legend:{ display:true, position:'right', labels:{ color:'#777', font:{size:10}, boxWidth:9, padding:6 } } } }
    });
  }
  /* Transmisión */
  if (withTrans.length>0&&document.getElementById('trans-chart')) {
    destroyChart('trans');
    _charts['trans'] = new Chart(document.getElementById('trans-chart'), { type:'pie',
      data:{ labels:['Manual','Automático'], datasets:[{ data:[manual,autoT], backgroundColor:['rgba(201,169,110,0.85)','rgba(91,155,213,0.85)'], borderWidth:0 }] },
      options:{ ...BASE_OPTS, plugins:{ legend:{ display:true, position:'bottom', labels:{ color:'#777', font:{size:11}, boxWidth:10, padding:8 } } } }
    });
  }
  /* Stock marcas */
  if (stockBrands.length>0&&document.getElementById('stock-brands-chart')) {
    destroyChart('stock-brands');
    _charts['stock-brands'] = new Chart(document.getElementById('stock-brands-chart'), { type:'bar',
      data:{ labels:stockBrands.map(([l])=>l), datasets:[{ data:stockBrands.map(([,v])=>v), backgroundColor:'rgba(76,175,125,0.75)', borderRadius:4, borderSkipped:false }] },
      options:{ ...BASE_OPTS, plugins:{ legend:{ display:false } }, scales:{ x:{ grid:{color:GC}, ticks:{color:TC,font:{size:11}} }, y:{ grid:{color:GC}, ticks:{color:TC,stepSize:1}, beginAtZero:true } } }
    });
  }
  /* Stock tipos */
  if (stockTipos.length>0&&document.getElementById('stock-tipos-chart')) {
    destroyChart('stock-tipos');
    _charts['stock-tipos'] = new Chart(document.getElementById('stock-tipos-chart'), { type:'doughnut',
      data:{ labels:stockTipos.map(([l])=>l), datasets:[{ data:stockTipos.map(([,v])=>v), backgroundColor:PAL.slice().reverse(), borderWidth:0, hoverOffset:6 }] },
      options:{ ...BASE_OPTS, cutout:'58%', plugins:{ legend:{ display:true, position:'right', labels:{ color:'#777', font:{size:10}, boxWidth:9, padding:6 } } } }
    });
  }
}

/* ── Boot ── */
bootApp('estadisticas');
render();
