/**
 * Acoustic Escalation Dashboard — app.js
 * Fetches data/latest.json and renders the full 5-tab report dynamically.
 * No data is hardcoded here — swap latest.json to refresh the entire site.
 */

/* ── Chart.js shared config ─────────────────────────────────────────────── */
var gC  = 'rgba(255,255,255,.08)';          // grid colour
var tC  = 'rgba(255,255,255,.65)';          // tick colour
var axF = {family:"'Plus Jakarta Sans',sans-serif", size:11};
var CAT_PAL = ['#706CFF','#FF8A65','#00DF8F','#D0D1D8','#FFB74D','#FF4444','#64B5F6'];
var REG_PAL = ['#FF8A65','#706CFF','#00DF8F','#C8FF49'];

function thresh(n) {
  return {
    label:'10% Reference', data:Array(n).fill(10),
    borderColor:'#FF4444', borderWidth:1.5, borderDash:[7,3],
    pointRadius:0, fill:false, tension:0, order:0
  };
}
function dOpts() {
  return {
    responsive:true, maintainAspectRatio:false,
    scales:{
      y:{min:0, ticks:{color:tC,font:axF,callback:function(v){return v+'%';}}, grid:{color:gC}},
      x:{ticks:{color:tC,font:axF}, grid:{display:false}}
    },
    plugins:{
      legend:{position:'top',labels:{color:'rgba(255,255,255,.85)',font:axF,boxWidth:11,padding:12}},
      tooltip:{backgroundColor:'rgba(0,0,0,.85)'}
    }
  };
}
function dPie(total) {
  return {
    responsive:true, maintainAspectRatio:false, cutout:'0%',
    plugins:{
      legend:{position:'bottom',labels:{color:'rgba(255,255,255,.85)',font:{family:"'Plus Jakarta Sans',sans-serif",size:10},boxWidth:10,padding:8}},
      tooltip:{backgroundColor:'rgba(0,0,0,.85)',callbacks:{label:function(c){return ' '+c.label+': '+c.parsed+' ('+Math.round(c.parsed/total*100)+'%)';}}}
    }
  };
}

/* ── HTML helpers ───────────────────────────────────────────────────────── */
function escB(t) {
  if (t==='Both')       return '<span class="b b-both">Both</span>';
  if (t==='Hot Case')   return '<span class="b b-hot">Hot Case</span>';
  return '<span class="b b-cesc">Client Esc</span>';
}
function priB(p) {
  if (p==='High') return '<span class="b b-high">High</span>';
  if (p==='Low')  return '<span class="b b-low">Low</span>';
  return '<span class="b b-normal">Normal</span>';
}
function stB(s) {
  var sl = (s||'').toLowerCase();
  if (sl==='open')            return '<span class="b b-open">Open</span>';
  if (sl==='solved'||sl==='closed') return '<span class="b b-solved">Solved</span>';
  return '<span class="b b-pending">Pending</span>';
}
function regP(r) {
  if (r==='EMEA')  return '<span class="reg-pill reg-emea">EMEA</span>';
  if (r==='APJ')   return '<span class="reg-pill reg-apj">APJ</span>';
  if (r==='LATAM') return '<span class="reg-pill reg-latam">LATAM</span>';
  return '<span class="reg-pill reg-amer">Americas</span>';
}
function rC(d)  { return d>=90 ? 'row-r' : d>=30 ? 'row-a' : ''; }
function zdlnk(id) {
  return '<a class="zd" href="https://acousticmkt.zendesk.com/agent/tickets/'+id+'" target="_blank">#'+id+'</a>';
}
function jlnk(j) {
  if (!j || j==='—') return '—';
  var m = j.match(/([A-Z]+-\d+)/);
  if (m) return '<a class="jl" href="https://acoustic-jiraconf.atlassian.net/browse/'+m[1]+'" target="_blank">'+j+'</a>';
  return j;
}
function badge(w8r, w7r) {
  if (w8r > w7r) return '<span class="kpi-badge up">&#8593; vs W7 '+w7r+'%</span>';
  if (w8r < w7r) return '<span class="kpi-badge dn">&#8595; vs W7 '+w7r+'%</span>';
  return '<span class="kpi-badge neu">No change</span>';
}
function peakWeek(rates, labels) { var mx=Math.max.apply(null,rates); return mx+'% ('+labels[rates.indexOf(mx)]+')'; }
function bestWeek(rates, labels) { var mn=Math.min.apply(null,rates); return mn+'% ('+labels[rates.indexOf(mn)]+')'; }
function sum(arr) { return arr.reduce(function(a,b){return a+b;},0); }
function fmt(n)   { return n.toLocaleString(); }
function rate(e,t){ return t ? Math.round(e/t*1000)/10 : 0; }

/* ── Tab switching (lazy chart initialisation) ──────────────────────────── */
var lazy = {};
function showTab(id) {
  document.querySelectorAll('.tab').forEach(function(b){b.classList.remove('active');});
  document.querySelectorAll('.pane').forEach(function(p){p.classList.remove('active');});
  var btn  = document.querySelector('.tab[data-tab="'+id+'"]');
  var pane = document.getElementById('pane-'+id);
  if (btn)  btn.classList.add('active');
  if (pane) pane.classList.add('active');
  if (lazy[id]) { lazy[id](); delete lazy[id]; }
}
document.querySelectorAll('.tab').forEach(function(btn){
  btn.addEventListener('click', function(){ showTab(btn.dataset.tab); });
});

/* ══════════════════════════════════════════════════════════════════════════
   MAIN — fetch data and render
══════════════════════════════════════════════════════════════════════════ */
fetch('data/latest.json')
  .then(function(r){ return r.json(); })
  .then(function(D){ render(D); })
  .catch(function(err){
    document.getElementById('loading-overlay').innerHTML =
      '<div style="color:#FF4444;font-size:18px;font-weight:700">Failed to load data/latest.json</div>'+
      '<div style="color:rgba(255,255,255,.5);margin-top:8px;font-size:13px">'+err+'</div>';
  });

function render(D) {
  /* ── Derive computed arrays ─────────────────────────────────────────── */
  var LABELS  = D.weeks;
  var n       = LABELS.length;
  var NA_T    = D.NA_T,   LATAM_T = D.LATAM_T, EMEA_T = D.EMEA_T, APJ_T = D.APJ_T;
  var NA_E    = D.NA_E,   LATAM_E = D.LATAM_E, EMEA_E = D.EMEA_E, APJ_E = D.APJ_E;

  var AMER_T  = NA_T.map(function(v,i){return v+LATAM_T[i];});
  var AMER_E  = NA_E.map(function(v,i){return v+LATAM_E[i];});
  var GLOB_T  = AMER_T.map(function(v,i){return v+EMEA_T[i]+APJ_T[i];});
  var GLOB_E  = AMER_E.map(function(v,i){return v+EMEA_E[i]+APJ_E[i];});

  var AMER_R  = AMER_T.map(function(t,i){return rate(AMER_E[i],t);});
  var EMEA_R  = EMEA_T.map(function(t,i){return rate(EMEA_E[i],t);});
  var APJ_R   = APJ_T.map(function(t,i){return rate(APJ_E[i],t);});
  var GLOB_R  = GLOB_T.map(function(t,i){return rate(GLOB_E[i],t);});

  var sumAmerE = sum(AMER_E), sumAmerT = sum(AMER_T);
  var sumEmEa  = sum(EMEA_E), sumEmT   = sum(EMEA_T);
  var sumApj   = sum(APJ_E),  sumApjT  = sum(APJ_T);
  var sumGlobE = sum(GLOB_E), sumGlobT = sum(GLOB_T);

  var globAvg  = rate(sumGlobE,sumGlobT);
  var amerAvg  = rate(sumAmerE,sumAmerT);
  var emeaAvg  = rate(sumEmEa,sumEmT);
  var apjAvg   = rate(sumApj,sumApjT);
  var totalEsc = sumGlobE;

  var catTotal  = D.cat_total  || sum(D.cat_vals);
  var suppTotal = sum(Object.values(D.supp_reg));
  var prodTotal = sum(Object.values(D.prod_reg));

  var W8 = n - 1;  // last week index
  var w8Label    = LABELS[W8];
  var w8End      = new Date(D.week_ends[W8]);
  w8End.setDate(w8End.getDate()-1);
  var w8EndStr   = w8End.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  var genDate    = D.generated_at;

  /* ── Header ─────────────────────────────────────────────────────────── */
  document.title = 'Weekly Global Escalation Trend — '+genDate;
  document.getElementById('hdr-subtitle').innerHTML =
    LABELS[0]+'&ndash;'+w8EndStr+'&nbsp;&middot;&nbsp;8 Complete Weeks&nbsp;&middot;&nbsp;Zendesk Export '+genDate;
  document.getElementById('meta-glob-avg').textContent  = globAvg+'%';
  document.getElementById('meta-total-esc').textContent = totalEsc;
  document.getElementById('meta-total-tkt').textContent = fmt(sumGlobT);
  document.getElementById('meta-backlog').textContent   = D.backlog.length;
  document.getElementById('meta-generated').textContent = genDate;
  document.getElementById('tab-lastweek').textContent   = 'Last Week ('+w8Label+')';

  /* ── Exec KPI tiles ─────────────────────────────────────────────────── */
  var execGrid = document.getElementById('exec-kpi-grid');
  execGrid.innerHTML = kpiTile('glob','Global Average',globAvg+'%',totalEsc+' esc / '+fmt(sumGlobT)+' tickets','<span class="kpi-badge neu">8W AVG</span>')+
    kpiTile('amer','Americas',amerAvg+'%',sumAmerE+' esc / '+fmt(sumAmerT)+' tickets','<span class="kpi-badge neu">NA + LATAM</span>')+
    kpiTile('emea','EMEA',emeaAvg+'%',sumEmEa+' esc / '+fmt(sumEmT)+' tickets','<span class="kpi-badge neu">8W AVG</span>')+
    kpiTile('apj','APJ',apjAvg+'%',sumApj+' esc / '+fmt(sumApjT)+' tickets','<span class="kpi-badge neu">8W AVG</span>');

  /* ── Exec regional cards ────────────────────────────────────────────── */
  document.getElementById('exec-region-row').innerHTML =
    regionCard('amer','Americas (NA + LATAM)',amerAvg,AMER_R,LABELS)+
    regionCard('emea','EMEA',emeaAvg,EMEA_R,LABELS)+
    regionCard('apj','APJ',apjAvg,APJ_R,LABELS);

  /* ── Key observations ───────────────────────────────────────────────── */
  var typeHot  = Math.round(D.type_dist[0]/totalEsc*100);
  var typeCesc = Math.round(D.type_dist[1]/totalEsc*100);
  var typeBoth = Math.round(D.type_dist[2]/totalEsc*100);
  var topCatIdx = D.cat_vals.indexOf(Math.max.apply(null,D.cat_vals));
  var topCat    = D.cat_labels[topCatIdx];
  var top5Acc   = D.top5.length ? D.top5[0].acc : '—';
  var top5N     = D.top5.length ? D.top5[0].n   : 0;
  var oldest    = D.backlog.length ? D.backlog[0] : {};
  var direction = GLOB_R[W8] > GLOB_R[W8-1] ? 'up' : 'down';

  document.getElementById('exec-obs').innerHTML =
    obsItem('Global rate averaged '+globAvg+'% ('+totalEsc+' esc / '+fmt(sumGlobT)+' tickets). Type split: '+typeHot+'% hot_case only, '+typeCesc+'% client_esc only, '+typeBoth+'% both.')+
    obsItem('Top category: <strong>'+topCat+'</strong> ('+D.cat_vals[topCatIdx]+', '+Math.round(D.cat_vals[topCatIdx]/catTotal*100)+'%). Top account: '+top5Acc+' with '+top5N+' escalations.')+
    obsItem('EMEA peaked at '+peakWeek(EMEA_R,LABELS)+'. APJ had '+APJ_R.filter(function(r){return r===0;}).length+' clean weeks. Americas peaked at '+peakWeek(AMER_R,LABELS)+'.')+
    obsItem('W8 ('+w8Label+'): Global rate '+GLOB_R[W8]+'% — '+direction+' vs W7 '+GLOB_R[W8-1]+'%. Americas '+AMER_R[W8]+'%, EMEA '+EMEA_R[W8]+'%, APJ '+APJ_R[W8]+'%.')+
    obsItem('Open backlog: '+D.backlog.length+' tickets. Oldest escalation: '+(oldest.days_esc||'—')+'d — Ticket #'+(oldest.id||'—')+' ('+(oldest.cat||'—')+').');

  /* ── Exec charts (rendered immediately — exec pane is active) ───────── */
  new Chart(document.getElementById('chartGlobal'),{
    type:'line',
    data:{labels:LABELS,datasets:[
      {label:'Global %',data:GLOB_R,borderColor:'#C8FF49',backgroundColor:'rgba(200,255,73,.1)',
       borderWidth:2.5,pointRadius:5,pointBackgroundColor:'#C8FF49',
       pointBorderColor:'rgba(255,255,255,.3)',pointBorderWidth:2,tension:.35,fill:true},
      thresh(n)
    ]},
    options:{
      responsive:true,maintainAspectRatio:false,
      scales:{
        y:{min:0,ticks:{color:tC,font:axF,callback:function(v){return v+'%';}},grid:{color:gC}},
        x:{ticks:{color:tC,font:axF},grid:{display:false}}
      },
      plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(0,0,0,.85)'}}
    }
  });

  new Chart(document.getElementById('chartTypeDist'),{
    type:'doughnut',
    data:{labels:['Hot Case Only','Client Esc Only','Both'],datasets:[{
      data:D.type_dist,
      backgroundColor:['#FF4444','#706CFF','#FF8A65'],
      borderWidth:3,borderColor:'#1F1E5D'
    }]},
    options:{
      responsive:true,maintainAspectRatio:false,cutout:'62%',
      plugins:{
        legend:{position:'bottom',labels:{color:'rgba(255,255,255,.85)',font:axF,boxWidth:11,padding:10}},
        tooltip:{backgroundColor:'rgba(0,0,0,.85)',callbacks:{label:function(c){return ' '+c.label+': '+c.parsed+' ('+Math.round(c.parsed/totalEsc*100)+'%)';}}}
      }
    }
  });

  /* ── Last Week KPI ──────────────────────────────────────────────────── */
  document.getElementById('lw-title').textContent = 'Last Week — '+w8Label+' to '+w8EndStr;
  document.getElementById('lw-note').textContent  = GLOB_E[W8]+' region-tagged escalations · Global rate '+GLOB_R[W8]+'%';

  var apjW8Badge = APJ_R[W8]===0 ? '<span class="kpi-badge neu">Clean</span>' : badge(APJ_R[W8],APJ_R[W8-1]);
  document.getElementById('lw-kpi-grid').innerHTML =
    kpiTile('glob','W8 Global Rate',GLOB_R[W8]+'%',GLOB_E[W8]+'/'+GLOB_T[W8]+' tickets',badge(GLOB_R[W8],GLOB_R[W8-1]))+
    kpiTile('amer','W8 Americas',AMER_R[W8]+'%',AMER_E[W8]+'/'+AMER_T[W8]+' tickets',badge(AMER_R[W8],AMER_R[W8-1]))+
    kpiTile('emea','W8 EMEA',EMEA_R[W8]+'%',EMEA_E[W8]+'/'+EMEA_T[W8]+' tickets',badge(EMEA_R[W8],EMEA_R[W8-1]))+
    kpiTile('apj','W8 APJ',APJ_R[W8]+'%',APJ_E[W8]+'/'+APJ_T[W8]+' tickets',apjW8Badge);

  /* ── Last Week table ────────────────────────────────────────────────── */
  var lwBody = document.getElementById('lw-body');
  lwBody.innerHTML = '';
  if (D.lw_tickets.length === 0) {
    lwBody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:24px">No escalations recorded last week</td></tr>';
  }
  D.lw_tickets.forEach(function(t){
    lwBody.innerHTML += '<tr><td>'+zdlnk(t.id)+'</td><td><strong>'+escapeHtml(t.org)+'</strong></td><td>'+regP(t.reg)+'</td>'+
      '<td>'+escB(t.esc)+'</td><td style="font-size:12px">'+escapeHtml(t.cat)+'</td><td>'+priB(t.pri)+'</td><td>'+stB(t.st)+'</td>'+
      '<td>'+jlnk(t.jira)+'</td><td style="font-size:12px">'+escapeHtml(t.csm)+'</td></tr>';
  });

  /* ── Category tiles & notes ─────────────────────────────────────────── */
  document.getElementById('cat-total-note').textContent = catTotal+' total escalations across 8 weeks (includes unregioned tickets).';
  document.getElementById('cat-dist-title').textContent = 'Escalation Category Distribution ('+catTotal+' tickets)';
  document.getElementById('cat-share-title').textContent = 'Category Share';
  document.getElementById('cat-share-sub').textContent  = 'Proportional breakdown · '+catTotal+' tickets';
  document.getElementById('cat-strained-note').textContent = 'Weekly escalation count · '+sum(D.cat_strained)+' total';
  document.getElementById('cat-product-note').textContent  = 'Weekly escalation count · '+sum(D.cat_product)+' total';
  document.getElementById('cat-support-note').textContent  = 'Weekly escalation count · '+sum(D.cat_support)+' total';
  document.getElementById('supp-esc-note').textContent     = suppTotal+' support escalations by region';
  document.getElementById('prod-esc-note').textContent     = prodTotal+' product escalations by region';
  document.getElementById('cat-resolved-note').textContent = 'Resolution data · '+D.lw_tickets.filter(function(t){return ['solved','closed'].indexOf(t.st.toLowerCase())>-1;}).length+' resolved last week';

  var sortedCats = D.cat_labels.map(function(l,i){return {l:l,v:D.cat_vals[i]};}).sort(function(a,b){return b.v-a.v;});
  var ordinals   = ['Top Category','2nd Category','3rd Category'];
  document.getElementById('cat-tiles').innerHTML = sortedCats.slice(0,3).map(function(c,i){
    return '<div class="cat-tile t'+(i+1)+'"><div class="cat-tile-count">'+c.v+'</div>'+
      '<div class="cat-tile-label">'+ordinals[i]+'</div>'+
      '<div style="font-size:15px;font-weight:800;color:var(--navy);margin-top:4px">'+c.l+'</div>'+
      '<div class="cat-tile-pct">'+Math.round(c.v/catTotal*100)+'% of all escalations</div></div>';
  }).join('');

  /* ── Backlog KPI ────────────────────────────────────────────────────── */
  var oldestOrg   = oldest.org || '';
  var oldestShort = oldestOrg.length>15 ? oldestOrg.slice(0,15)+'…' : (oldestOrg||'—');
  document.getElementById('backlog-kpi-grid').innerHTML =
    kpiTile('glob','Open Escalations',D.backlog.length,'As of '+genDate,'')+
    kpiTile('alert','Longest Escalated',(oldest.days_esc||'—')+'d','#'+(oldest.id||'—')+' · '+oldestShort+' · '+(oldest.cat||'—'),'')+
    kpiTile('amer','&gt;90d Since Esc.','<span id="kpi-90d">—</span>','Critical','')+
    kpiTile('emea','&gt;30d Since Esc.','<span id="kpi-30d">—</span>','Needs attention','');

  /* ── Backlog filter & table ─────────────────────────────────────────── */
  var activeRegion = 'All', activeCSM = 'All';

  var csms = ['All'];
  D.backlog.forEach(function(t){ if(t.csm && t.csm!=='—' && csms.indexOf(t.csm)<0) csms.push(t.csm); });
  csms.sort(function(a,b){ return a==='All'?-1:b==='All'?1:a.localeCompare(b); });
  var csmWrap = document.getElementById('csm-filters');
  csms.forEach(function(c){
    var btn = document.createElement('button');
    btn.className = 'fbtn'+(c==='All'?' active':'');
    btn.textContent = c; btn.dataset.filterCsm = c;
    btn.addEventListener('click',function(){
      document.querySelectorAll('[data-filter-csm]').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active'); activeCSM = c; renderBacklog();
    });
    csmWrap.appendChild(btn);
  });

  document.querySelectorAll('[data-filter-region]').forEach(function(btn){
    btn.addEventListener('click',function(){
      document.querySelectorAll('[data-filter-region]').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active'); activeRegion = btn.dataset.filterRegion; renderBacklog();
    });
  });

  function renderBacklog() {
    var filtered = D.backlog.filter(function(t){
      var regOk = activeRegion==='All' || t.reg===activeRegion || (activeRegion==='Americas' && (t.reg==='NA'||t.reg==='LATAM'));
      var csmOk = activeCSM==='All' || t.csm===activeCSM;
      return regOk && csmOk;
    });
    var tb = document.getElementById('backlog-body'); tb.innerHTML='';
    var c90=0, c30=0, n=0;
    filtered.forEach(function(t){
      n++;
      if (t.days_esc>=90) c90++; else if (t.days_esc>=30) c30++;
      tb.innerHTML += '<tr class="'+rC(t.days_esc)+'">' +
        '<td>'+n+'</td><td>'+zdlnk(t.id)+'</td>' +
        '<td style="max-width:180px"><strong>'+escapeHtml(t.org)+'</strong></td>' +
        '<td>'+regP(t.reg)+'</td><td>'+escB(t.esc)+'</td>' +
        '<td style="font-size:12px">'+escapeHtml(t.cat)+'</td>' +
        '<td style="font-size:11px;max-width:150px">'+escapeHtml(t.sub)+'</td>' +
        '<td>'+priB(t.pri)+'</td><td>'+stB(t.st)+'</td>' +
        '<td style="text-align:center">'+t.days_open+'</td>' +
        '<td style="text-align:center;font-weight:800;color:'+(t.days_esc>=90?'#CC0000':t.days_esc>=30?'#9A7000':'inherit')+'">'+t.days_esc+'</td>' +
        '<td>'+jlnk(t.jira)+'</td>' +
        '<td style="font-size:12px">'+escapeHtml(t.csm)+'</td></tr>';
    });
    var el90 = document.getElementById('kpi-90d'); if(el90) el90.textContent = c90;
    var el30 = document.getElementById('kpi-30d'); if(el30) el30.textContent = c30;
    document.getElementById('backlog-count').textContent = 'Showing '+n+' of '+D.backlog.length+' tickets';
  }
  renderBacklog();

  /* ── 8-Week Trend table ─────────────────────────────────────────────── */
  var trendTb = document.getElementById('trend-tbody'); trendTb.innerHTML='';
  for (var i=0;i<n;i++) {
    trendTb.innerHTML += '<tr>' +
      '<td style="font-weight:700">'+LABELS[i]+'</td>' +
      '<td>'+AMER_R[i]+'%</td><td>'+AMER_E[i]+'/'+AMER_T[i]+'</td>' +
      '<td>'+EMEA_R[i]+'%</td><td>'+EMEA_E[i]+'/'+EMEA_T[i]+'</td>' +
      '<td>'+APJ_R[i]+'%</td><td>'+APJ_E[i]+'/'+APJ_T[i]+'</td>' +
      '<td style="font-weight:700">'+GLOB_R[i]+'%</td><td>'+GLOB_E[i]+'/'+GLOB_T[i]+'</td></tr>';
  }
  trendTb.innerHTML += '<tr style="background:var(--navy);color:#fff">' +
    '<td style="font-weight:800">8W AVG</td>' +
    '<td style="font-weight:800">'+(sumAmerE/sumAmerT*100).toFixed(1)+'%</td><td style="font-weight:700">'+sumAmerE+'/'+sumAmerT+'</td>' +
    '<td style="font-weight:800">'+(sumEmEa/sumEmT*100).toFixed(1)+'%</td><td style="font-weight:700">'+sumEmEa+'/'+sumEmT+'</td>' +
    '<td style="font-weight:800">'+(sumApj/sumApjT*100).toFixed(1)+'%</td><td style="font-weight:700">'+sumApj+'/'+sumApjT+'</td>' +
    '<td style="font-weight:800">'+(sumGlobE/sumGlobT*100).toFixed(1)+'%</td><td style="font-weight:700">'+sumGlobE+'/'+sumGlobT+'</td></tr>';

  /* ── Top 5 Accounts table ───────────────────────────────────────────── */
  var top5Tb = document.getElementById('top5-body'); top5Tb.innerHTML='';
  D.top5.forEach(function(a,i){
    top5Tb.innerHTML += '<tr>' +
      '<td style="font-weight:800">'+(i+1)+'</td>' +
      '<td><strong>'+escapeHtml(a.acc)+'</strong></td>' +
      '<td>'+regP(a.reg)+'</td>' +
      '<td style="font-size:12px">'+escapeHtml(a.csm)+'</td>' +
      '<td style="text-align:center;font-weight:800;font-size:16px">'+a.n+'</td>' +
      '<td style="font-weight:700">'+Math.round(a.n/totalEsc*100)+'%</td></tr>';
  });

  /* ══ LAZY: Trend charts (initialise on first tab click) ══════════════ */
  lazy['trend'] = function() {
    new Chart(document.getElementById('chartTrend'),{
      type:'line',
      data:{labels:LABELS,datasets:[
        {label:'Americas',data:AMER_R,borderColor:'#FF8A65',fill:false,tension:.35,
         pointRadius:5,borderWidth:2.5,pointBackgroundColor:'#FF8A65',pointBorderColor:'rgba(255,255,255,.3)',pointBorderWidth:2},
        {label:'EMEA',data:EMEA_R,borderColor:'#00DF8F',fill:false,tension:.35,
         pointRadius:5,borderWidth:2.5,pointBackgroundColor:'#00DF8F',pointBorderColor:'rgba(255,255,255,.3)',pointBorderWidth:2},
        {label:'APJ',data:APJ_R,borderColor:'#C8FF49',fill:false,tension:.35,
         pointRadius:5,borderWidth:2.5,pointBackgroundColor:'#C8FF49',pointBorderColor:'rgba(255,255,255,.3)',pointBorderWidth:2},
        {label:'Global',data:GLOB_R,borderColor:'rgba(255,255,255,.5)',fill:false,tension:.35,borderDash:[4,2],borderWidth:2,pointRadius:3},
        thresh(n)
      ]},
      options:dOpts()
    });

    new Chart(document.getElementById('chartStackedCount'),{
      type:'bar',
      data:{labels:LABELS,datasets:[
        {label:'NA',    data:NA_E,    backgroundColor:'#FF8A65',borderRadius:3,stack:'s'},
        {label:'LATAM', data:LATAM_E, backgroundColor:'#706CFF',borderRadius:3,stack:'s'},
        {label:'EMEA',  data:EMEA_E,  backgroundColor:'#00DF8F',borderRadius:3,stack:'s'},
        {label:'APJ',   data:APJ_E,   backgroundColor:'#C8FF49',borderRadius:3,stack:'s'}
      ]},
      options:{
        responsive:true,maintainAspectRatio:false,
        scales:{
          y:{stacked:true,ticks:{color:tC,font:axF},grid:{color:gC},title:{display:true,text:'Escalations',color:tC,font:axF}},
          x:{stacked:true,ticks:{color:tC,font:axF},grid:{display:false}}
        },
        plugins:{
          legend:{position:'top',labels:{color:'rgba(255,255,255,.85)',font:axF,boxWidth:11,padding:12}},
          tooltip:{backgroundColor:'rgba(0,0,0,.85)'}
        }
      }
    });

    var naSum  = sum(NA_E), latSum = sum(LATAM_E), emSum = sum(EMEA_E), apSum = sum(APJ_E);
    new Chart(document.getElementById('chartRegionPie'),{
      type:'pie',
      data:{labels:['Americas (NA)','Americas (LATAM)','EMEA','APJ'],datasets:[{
        data:[naSum,latSum,emSum,apSum],
        backgroundColor:['#FF8A65','#706CFF','#00DF8F','#C8FF49'],
        borderWidth:3,borderColor:'#1F1E5D'
      }]},
      options:dPie(totalEsc)
    });

    new Chart(document.getElementById('chartCatPie'),{
      type:'pie',
      data:{labels:D.cat_labels,datasets:[{data:D.cat_vals,backgroundColor:CAT_PAL,borderWidth:3,borderColor:'#1F1E5D'}]},
      options:dPie(catTotal)
    });

    new Chart(document.getElementById('chartResolution'),{
      type:'bar',
      data:{labels:D.res_labels,datasets:[{label:'Avg Days',data:D.res_vals,backgroundColor:CAT_PAL,borderRadius:4}]},
      options:{
        responsive:true,maintainAspectRatio:false,
        scales:{
          y:{ticks:{color:tC,font:axF,callback:function(v){return v+'d';}},grid:{color:gC},
             title:{display:true,text:'Avg Days to Close',color:tC,font:axF}},
          x:{ticks:{color:tC,font:{family:"'Plus Jakarta Sans',sans-serif",size:10}},grid:{display:false}}
        },
        plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(0,0,0,.85)',callbacks:{label:function(c){return ' '+c.parsed.toFixed(1)+' days avg';}}}}
      }
    });
  };

  /* ══ LAZY: Category charts ═══════════════════════════════════════════ */
  lazy['categories'] = function() {
    function catTrendOpts() {
      return {
        responsive:true,maintainAspectRatio:false,
        scales:{
          y:{min:0,ticks:{color:tC,font:axF,stepSize:1},grid:{color:gC}},
          x:{ticks:{color:tC,font:{family:"'Plus Jakarta Sans',sans-serif",size:10}},grid:{display:false}}
        },
        plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(0,0,0,.85)'}}
      };
    }

    new Chart(document.getElementById('chartCatDist'),{
      type:'bar',
      data:{labels:D.cat_labels,datasets:[{label:'Escalations',data:D.cat_vals,backgroundColor:CAT_PAL,borderRadius:5}]},
      options:{
        responsive:true,maintainAspectRatio:false,
        scales:{y:{ticks:{color:tC,font:axF},grid:{color:gC}},x:{ticks:{color:tC,font:axF},grid:{display:false}}},
        plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(0,0,0,.85)'}}
      }
    });

    new Chart(document.getElementById('chartCatShare'),{
      type:'doughnut',
      data:{labels:D.cat_labels,datasets:[{data:D.cat_vals,backgroundColor:CAT_PAL,borderWidth:3,borderColor:'#1F1E5D'}]},
      options:{
        responsive:true,maintainAspectRatio:false,cutout:'58%',
        plugins:{
          legend:{position:'right',labels:{color:'rgba(255,255,255,.85)',font:{family:"'Plus Jakarta Sans',sans-serif",size:11},boxWidth:11,padding:10}},
          tooltip:{backgroundColor:'rgba(0,0,0,.85)',callbacks:{label:function(c){return ' '+c.label+': '+c.parsed+' ('+Math.round(c.parsed/catTotal*100)+'%)';}}}
        }
      }
    });

    new Chart(document.getElementById('chartStrainedTrend'),{type:'bar',data:{labels:LABELS,datasets:[{label:'Strained Rel.',data:D.cat_strained,backgroundColor:'#706CFF',borderRadius:4}]},options:catTrendOpts()});
    new Chart(document.getElementById('chartProductTrend'),{type:'bar',data:{labels:LABELS,datasets:[{label:'Product',data:D.cat_product,backgroundColor:'#FF8A65',borderRadius:4}]},options:catTrendOpts()});
    new Chart(document.getElementById('chartSupportTrend'),{type:'bar',data:{labels:LABELS,datasets:[{label:'Support',data:D.cat_support,backgroundColor:'#00DF8F',borderRadius:4}]},options:catTrendOpts()});

    new Chart(document.getElementById('chartSuppRegion'),{
      type:'doughnut',
      data:{labels:['Americas','EMEA','APJ'],datasets:[{
        data:[D.supp_reg.Americas||0,D.supp_reg.EMEA||0,D.supp_reg.APJ||0],
        backgroundColor:REG_PAL,borderWidth:3,borderColor:'#1F1E5D'
      }]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{
        legend:{position:'bottom',labels:{color:'rgba(255,255,255,.85)',font:axF,boxWidth:11,padding:10}},
        tooltip:{backgroundColor:'rgba(0,0,0,.85)',callbacks:{label:function(c){return ' '+c.label+': '+c.parsed+' ('+Math.round(c.parsed/suppTotal*100)+'%)';}}}
      }}
    });

    new Chart(document.getElementById('chartProdRegion'),{
      type:'doughnut',
      data:{labels:['Americas','EMEA','APJ'],datasets:[{
        data:[D.prod_reg.Americas||0,D.prod_reg.EMEA||0,D.prod_reg.APJ||0],
        backgroundColor:REG_PAL,borderWidth:3,borderColor:'#1F1E5D'
      }]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{
        legend:{position:'bottom',labels:{color:'rgba(255,255,255,.85)',font:axF,boxWidth:11,padding:10}},
        tooltip:{backgroundColor:'rgba(0,0,0,.85)',callbacks:{label:function(c){return ' '+c.label+': '+c.parsed+' ('+Math.round(c.parsed/prodTotal*100)+'%)';}}}
      }}
    });
  };

  /* ── Hide loading overlay ───────────────────────────────────────────── */
  var overlay = document.getElementById('loading-overlay');
  overlay.classList.add('hidden');
  setTimeout(function(){ overlay.style.display='none'; }, 450);
}

/* ── Template helpers ───────────────────────────────────────────────────── */
function kpiTile(cls, label, val, sub, badgeHtml) {
  return '<div class="kpi '+cls+'">' +
    '<div class="kpi-label">'+label+'</div>' +
    '<div class="kpi-val">'+val+'</div>' +
    '<div class="kpi-sub">'+sub+'</div>' +
    badgeHtml+'</div>';
}
function regionCard(cls, label, avgRate, rates, labels) {
  return '<div class="region-card '+cls+'">' +
    '<div class="r-label">'+label+'</div>' +
    '<div class="r-rate">'+avgRate+'%</div>' +
    '<div class="r-detail">Peak: '+peakWeek(rates,labels)+'</div>' +
    '<div class="r-detail">Best: '+bestWeek(rates,labels)+'</div></div>';
}
function obsItem(html) {
  return '<div class="obs-item">'+html+'</div>';
}
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
