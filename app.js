import config from './config.js';
import {today,shiftDate,daysBetween,validateState,intervals,summarize,ranking,seed,csv} from './core.js';

const icons = {
 bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 chart:'<path d="M4 3v17h17M8 14l4-5 4 3 5-7"/>',
 book:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/>',
 building:'<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1m-4 6v-3h2v3"/>',
 trophy:'<path d="M8 3h8v5a4 4 0 0 1-8 0zM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 1v6m-4 3h8M9 18h6"/>',
 leaf:'<path d="M20 3c0 12-4 17-10 17a7 7 0 0 1-7-7C3 5 13 7 20 3ZM5 20l10-10"/>',
 settings:'<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>',
 arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.5 2.5 0 1 1 4 2c-1 .5-1.5 1-1.5 2.5M12 17h.01"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 money:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9h.01M18 15h.01"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
 plug:'<path d="M8 3v5m8-5v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.bolt}</svg>`;
const esc = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n = (value, digits=0) => new Intl.NumberFormat('en-IN',{maximumFractionDigits:digits}).format(value);
const date = value => new Date(value+'T00:00:00Z').toLocaleDateString('en-IN',{day:'numeric',month:'short',timeZone:'UTC'});
const uid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2);
const $ = id => document.getElementById(id);
let state, view='overview', block='all', range=14, query='', saving=false, timer;
const navs=[['overview','Overview','grid'],['readings','Meter readings','book'],['blocks','Hostel blocks','building'],['leaderboard','Leaderboard','trophy'],['insights','Saving insights','leaf'],['settings','Settings','settings']];
const period=()=>({from:shiftDate(today(),-range),to:today()});
const button=(text,action,ico='',cls='')=>`<button class="button ${cls}" data-action="${action}">${ico?icon(ico):''}${text}</button>`;
const empty=(title,copy,action='reading',label='Add a reading')=>`<div class="empty">${icon('book')}<h2>${title}</h2><p>${copy}</p>${button(label,action,'plus','primary')}</div>`;

async function load() {
  document.title=config.name+' — Energy workspace';
  document.body.classList.toggle('orange',config.accent==='orange');
  try {
    if(config.backend) {
      const response=await fetch('./api/state');
      if(!response.ok) throw Error('The database could not be opened. Refresh to try again.');
      state=validateState(await response.json());
    } else {
      const saved=localStorage.getItem(config.storageKey);
      state=validateState(saved?JSON.parse(saved):seed());
      if(!saved) localStorage.setItem(config.storageKey,JSON.stringify(state));
    }
    route();
  } catch(error) {
    $('app').innerHTML=`<main class="main"><div class="panel"><h1>Let’s restore your workspace</h1><p class="muted" style="margin:20px 0">${esc(error.message)}</p><p>Your saved data has not been overwritten. You can retry, or download the browser record before starting again.</p><div class="actions" style="margin-top:20px">${button('Retry','retry')}${!config.backend?button('Download saved record','raw-backup','download')+button('Start with sample data','recover','plus'):''}</div></div></main>`;
  }
}
async function commit(next,message) {
  if(saving) return false;
  saving=true;
  try {
    validateState(next);
    if(config.backend) {
      const res=await fetch('./api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});
      if(!res.ok) {const body=await res.json().catch(()=>({})); throw Error(body.error||'Could not save. Your previous data is safe.');}
    } else localStorage.setItem(config.storageKey,JSON.stringify(next));
    state=next; if(block!=='all'&&!state.blocks.some(b=>b.id===block))block='all';
    close(); render(); toast(message); return true;
  } catch(error) { if($('form-error'))$('form-error').textContent=error.message; else toast(error.message); return false; }
  finally {saving=false;}
}
const clone=()=>JSON.parse(JSON.stringify(state));
function toast(message){clearTimeout(timer);$('toast').textContent=message;$('toast').classList.add('show');timer=setTimeout(()=>$('toast').classList.remove('show'),4200);}
function close(){$('modal').close();}
function open(title,subtitle,content){$('modal').innerHTML=`<div class="dialog-head"><div><h2 id="dialog-title">${title}</h2><p>${subtitle}</p></div><button class="icon-button" data-action="close" aria-label="Close dialog">${icon('close')}</button></div>${content}`;$('modal').showModal();}
function route(){const route=location.hash.slice(1);view=navs.some(n=>n[0]===route)?route:'overview';query='';if(state)render();}
window.addEventListener('hashchange',route);

function render() {
  const name=navs.find(n=>n[0]===view)[1];
  $('app').innerHTML=`<div class="layout"><button class="mobile-backdrop" data-action="menu-close" aria-label="Close navigation"></button><aside class="sidebar"><a class="brand" href="#overview"><span class="logo">${icon('bolt')}</span>${config.name}</a><div class="workspace"><span class="workspace-icon">${icon('building')}</span><div><strong>Hostel workspace</strong><span class="small muted">${state.blocks.length} blocks · Energy management</span></div></div><p class="nav-label">WORKSPACE</p><nav class="nav" aria-label="Main navigation">${navs.map(([id,label,ico])=>`<a href="#${id}" class="${view===id?'active':''}" ${view===id?'aria-current="page"':''}>${icon(ico)}${label}${id==='insights'?'<span class="badge">4</span>':''}</a>`).join('')}</nav><div class="side-bottom"><div class="side-note">${icon('leaf')}<h3>Small steps. Real impact.</h3><p>A little less energy today.<br>A better tomorrow for everyone.</p><a class="text-button" href="#insights">Explore saving tips ${icon('arrow')}</a></div><div class="identity"><span class="avatar">${config.initials}</span><div><strong>${config.owner}</strong><span class="small muted">Workspace owner</span></div><button data-action="help" aria-label="About this workspace">${icon('help')}</button></div></div></aside><div class="shell"><header class="topbar"><div class="breadcrumb"><button class="icon-button menu-toggle" data-action="menu" aria-label="Open navigation">${icon('menu')}</button><span>Workspace</span><span>/</span><strong>${name}</strong></div><div class="top-actions"><span class="status"><i class="dot"></i>${state.demo?'Sample workspace':config.backend?'Saved to SQLite':'Saved on this browser'}</span><span class="date-top">${new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'long',year:'numeric'})}</span><button class="icon-button" data-action="help" aria-label="Help and calculation guide">${icon('help')}</button><span class="avatar">${config.initials}</span></div></header><main id="main" class="main" tabindex="-1">${views[view]()}<footer class="footer"><span>${config.name} · Thoughtful energy, everyday.</span><a href="#" data-action="help">${state.demo?'Sample data · ':''}${config.backend?'SQLite workspace':'Browser workspace'} ↗</a></footer></main></div></div>`;
}
const heads=(title,desc,actions='')=>`<div class="page-head"><div><h1>${title}</h1><p>${desc}</p></div><div class="actions">${actions}</div></div>`;
function filters(){return `<div class="filters"><label class="sr-only" for="block-filter">Filter by block</label><select class="select" id="block-filter"><option value="all">All hostel blocks</option>${state.blocks.map(b=>`<option value="${esc(b.id)}" ${block===b.id?'selected':''}>${esc(b.name)}</option>`).join('')}</select><label class="sr-only" for="range-filter">Reporting period</label><select class="select" id="range-filter">${[7,14,28].map(r=>`<option value="${r}" ${range===r?'selected':''}>Last ${r} days</option>`).join('')}</select></div>`;}
function stats(){
  const {from,to}=period(),s=summarize(state,block,from,to), prev=summarize(state,block,shiftDate(from,-range),from);
  const matching=[...ranking(state,from,to),...ranking(state,shiftDate(from,-range),from)].filter(b=>block==='all'||b.id===block).every(b=>b.comparable);
  const delta=prev.total>0&&matching?(s.total-prev.total)/prev.total*100:null;
  const residents=state.blocks.reduce((v,b)=>v+b.residents,0),selected=state.blocks.filter(b=>block==='all'||b.id===block).reduce((v,b)=>v+b.residents,0);
  const target=residents?state.settings.target*selected/residents*range:0;
  const cards=[['Total consumption',`${n(s.total,1)}<span>kWh</span>`,'bolt',delta===null?'No previous-period baseline':`${delta<=0?'↓':'↑'} ${n(Math.abs(delta),1)}% vs previous ${range} days`],['Estimated energy cost',`₹${n(s.cost)}<span>INR</span>`,'money',`At ₹${n(state.settings.tariff,2)} per kWh`],['Estimated emissions',`${n(s.co2)}<span>kg CO₂e</span>`,'leaf',`${n(state.settings.carbon,2)} kg per kWh · configurable`],['Daily target',`${n(target/range,1)}<span>kWh / day</span>`,'target',target?`${n(s.total/target*100)}% of period allowance used`:'Add blocks to track your target']];
  return `<div class="stats">${cards.map(([label,value,ico,foot],i)=>`<article class="stat"><div class="stat-label">${label}${icon(ico)}</div><div class="stat-number">${value}</div><div class="stat-foot">${i===0&&delta!==null?`<span class="change">${delta<=0?'↓':'↑'} ${n(Math.abs(delta),1)}%</span> previous ${range} days`:foot}</div></article>`).join('')}</div>${s.resets.length?`<div class="notice warn">${s.resets.length} decreasing meter interval(s) need review. They are excluded from usage, cost, emissions and ranking.</div>`:''}`;
}
function chart(){
  const {from,to}=period(),s=summarize(state,block,from,to);
  if(!s.valid.length)return empty('No usage intervals yet','Two readings on different dates are needed to calculate consumption.');
  const values=Array.from({length:range},(_,i)=>{const d=shiftDate(from,i+1),rows=s.valid.filter(r=>r.from<d&&r.to>=d);return {d,v:rows.length?rows.reduce((sum,r)=>sum+r.kwh/r.days,0):null};});
  const allResidents=state.blocks.reduce((v,b)=>v+b.residents,0),selResidents=state.blocks.filter(b=>block==='all'||b.id===block).reduce((v,b)=>v+b.residents,0),target=allResidents?state.settings.target*selResidents/allResidents:0;
  const w=600,h=220,p={l:40,r:12,t:15,b:30},max=Math.max(target,...values.map(r=>r.v||0),1)*1.18;
  const x=i=>p.l+i*(w-p.l-p.r)/Math.max(1,range-1),y=v=>h-p.b-v/max*(h-p.b-p.t);
  let path='',area='',last=false;
  values.forEach((r,i)=>{if(r.v===null){last=false;return;}path+=`${last?'L':'M'}${x(i)},${y(r.v)} `;last=true;});
  if(values.every(r=>r.v!==null))area=`M${x(0)},${h-p.b} ${values.map((r,i)=>`L${x(i)},${y(r.v)}`).join(' ')} L${x(range-1)},${h-p.b}Z`;
  return `<div class="chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Daily electricity usage for the selected period"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a6c78b" stop-opacity=".27"/><stop offset="1" stop-color="#cdddba" stop-opacity=".03"/></linearGradient></defs>${[0,1,2,3].map(i=>{const v=max*i/3;return `<path class="grid" d="M${p.l} ${y(v)}H${w-p.r}"/><text x="${p.l-9}" y="${y(v)+3}" text-anchor="end">${n(v)}</text>`;}).join('')}<path d="${area}" fill="url(#chart-fill)"/><path class="target" d="M${p.l} ${y(target)}H${w-p.r}"/><path class="line" d="${path}"/>${values.map((r,i)=>r.v===null?'':`<circle cx="${x(i)}" cy="${y(r.v)}" r="3.1"><title>${date(r.d)}: ${n(r.v,1)} kWh/day (recorded average)</title></circle>`).join('')}${[0,Math.floor(range/3),Math.floor(range*2/3),range-1].map(i=>`<text x="${x(i)}" y="${h-6}" text-anchor="middle">${date(values[i].d)}</text>`).join('')}</svg></div><div class="chart-note">kWh / day · Usage is spread evenly across each recorded interval. Missing coverage is not measured zero.</div>`;
}
function blockList(){const {from,to}=period(),rows=ranking(state,from,to).filter(b=>block==='all'||b.id===block),max=Math.max(...rows.map(r=>r.total),1);return rows.length?rows.map(b=>`<div class="block-row"><span class="block-symbol">${icon('building')}</span><div class="block-info"><strong>${esc(b.name)}</strong><div class="bar"><i style="width:${b.total/max*100}%"></i></div><div class="small">${b.residents} residents</div></div><div class="block-value">${n(b.total)} <span class="muted small">kWh</span><div class="small">${b.comparable?n(b.score,2)+' / resident / day':'Partial coverage'}</div></div></div>`).join(''):'<p class="muted small">No blocks added yet.</p>';}
function readingTable(limit){
  let rows=state.readings.filter(r=>(block==='all'||r.blockId===block)&&(`${state.blocks.find(b=>b.id===r.blockId)?.name} ${r.date} ${r.value} ${r.note}`).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date)||a.blockId.localeCompare(b.blockId));
  if(limit)rows=rows.slice(0,limit);
  if(!rows.length)return empty('Your reading register starts here','Add a cumulative meter reading. The next reading unlocks usage calculations.');
  const all=intervals(state);
  return `<div class="table-wrap"><table><thead><tr><th>Hostel block</th><th>Reading date</th><th>Meter (kWh)</th>${!limit?'<th>Interval usage</th>':''}<th>Status</th>${!limit?'<th>Manage</th>':''}</tr></thead><tbody>${rows.map(r=>{const b=state.blocks.find(b=>b.id===r.blockId),i=all.find(i=>i.blockId===r.blockId&&i.to===r.date);return `<tr><td><strong class="row-label"><i class="tiny-dot"></i>${esc(b.name)}</strong></td><td>${date(r.date)}${!limit?' '+r.date.slice(0,4):''}</td><td>${n(r.value,1)}</td>${!limit?`<td>${i&&!i.reset?n(i.kwh,1)+' kWh / '+i.days+'d':'—'}</td>`:''}<td><span class="tag ${i?.reset?'warn':''}">${!i?'Baseline':i.reset?'Review reset':'Recorded'}</span></td>${!limit?`<td><div class="inline-actions"><button data-action="edit-reading" data-id="${esc(r.id)}" aria-label="Edit ${esc(b.name)} reading on ${r.date}">Edit</button><button data-action="delete-reading" data-id="${esc(r.id)}" aria-label="Delete ${esc(b.name)} reading on ${r.date}">Delete</button></div></td>`:''}</tr>`;}).join('')}</tbody></table></div>`;
}
const views={
 overview:()=>`${heads('Every watt tells a story.','Your hostel’s energy, understood. Make the next step a greener one.',button('Export report','export','download')+button('Add reading','reading','plus','primary'))}<section class="hero"><div><div class="eyebrow">GOOD ENERGY STARTS WITH AWARENESS</div><h2>A little insight.<br><em>A lighter footprint.</em></h2><p>${config.tagline} Track your hostel’s electricity use and turn everyday habits into thoughtful change.</p><a class="hero-link" href="#insights">Make every watt count ${icon('arrow')}</a></div><div class="hero-art"><div class="energy-orb">${icon('bolt')}<div class="orb-label"><strong>${state.blocks.length}</strong> blocks, one greener goal</div></div></div></section><div class="toolbar"><div class="toolbar-title"><h2>Your energy at a glance</h2><span class="pill">${date(period().from)} – ${date(period().to)}</span></div>${filters()}</div>${stats()}<div class="grid-main"><section class="panel"><div class="panel-head"><div><h2>Consumption over time</h2><p>A clearer picture of your everyday usage</p></div><div class="chart-legend"><span><i class="legend-dot"></i>Usage</span><span><i class="legend-dot target"></i>Target</span></div></div>${chart()}</section><section class="panel"><div class="panel-head"><div><h2>Across your hostel</h2><p>A closer look, block by block</p></div><span class="pill">${state.blocks.length} blocks</span></div><div class="block-list">${blockList()}</div><div class="panel-footer"><a class="text-button" href="#blocks">View all blocks ${icon('arrow')}</a></div></section></div><div class="lower-grid"><section class="panel"><div class="panel-head"><div><h2>Recent meter readings</h2><p>The latest entries in your energy journal</p></div><a class="text-button" href="#readings">View all ${icon('arrow')}</a></div>${readingTable(4)}</section><section class="panel tip-panel"><div class="tip-top">${icon('sun')} A SMALL CHANGE TO TRY</div><h2>Let the daylight<br>do its thing.</h2><p>Open the curtains before switching on the lights. It’s a simple habit with a brighter upside.</p><a class="button" href="#insights">More saving tips ${icon('arrow')}</a></section></div>`,
 readings:()=>`${heads('Your energy journal.','Reliable readings are the beginning of better decisions.',button('Export readings','export-readings','download')+button('Add reading','reading','plus','primary'))}<div class="notice">Enter the cumulative number shown on the meter, not daily consumption. A lower reading is flagged for review and never counted as negative usage.</div><div class="toolbar"><input class="search" id="search" type="search" placeholder="Search blocks, dates or notes…" aria-label="Search readings" value="${esc(query)}">${filters()}</div><section class="panel"><div class="panel-head"><div><h2>Meter register</h2><p>${state.readings.filter(r=>block==='all'||r.blockId===block).length} entries · All dates shown; period filter applies to reports</p></div></div><div id="reading-results">${readingTable()}</div></section>`,
 blocks:()=>`${heads('A place for every block.','Keep your meters organised and your comparisons meaningful.',button('Add block','block','plus','primary'))}<div class="view-grid">${state.blocks.map(b=>{const rs=state.readings.filter(r=>r.blockId===b.id).sort((a,b)=>b.date.localeCompare(a.date)),s=summarize(state,b.id,period().from,period().to);return `<article class="panel block-card"><span class="block-symbol">${icon('building')}</span><h2>${esc(b.name)}</h2><p class="muted small" style="margin-top:7px">${b.residents} residents · ${rs.length} readings</p><div class="metrics"><div><strong>${n(s.total,1)}</strong><span>kWh · last ${range} days</span></div><div><strong>₹${n(s.cost)}</strong><span>Estimated energy cost</span></div></div><p class="small muted">${rs.length?'Latest: '+date(rs[0].date)+' · '+n(rs[0].value,1)+' cumulative kWh':'No readings yet'}</p><div class="panel-footer actions"><button class="button primary" data-action="block-reading" data-id="${esc(b.id)}">${icon('plus')}Add reading</button><button class="button" data-action="edit-block" data-id="${esc(b.id)}">Edit block</button><button class="button danger" data-action="delete-block" data-id="${esc(b.id)}">Delete</button></div></article>`;}).join('')||empty('Make room for your first block','Add a name and resident count to start tracking.','block','Add block')}</div>`,
 leaderboard:()=>`${heads('A friendly kind of competition.','Less energy per person. More reasons to work together.')}<div class="toolbar"><div class="toolbar-title"><h2>Green leaderboard</h2><span class="pill">Lower is better</span></div>${filters()}</div><div class="notice">Rankings use kWh per resident per day. Blocks need readings on both ${date(period().from)} and ${date(period().to)}, with no decreasing interval. Resident counts are assumed constant; equipment, weather and meter coverage may still differ.</div><section class="panel">${ranking(state,period().from,period().to).map((b,i)=>({...b,rank:i+1})).filter(b=>block==='all'||b.id===block).map(b=>`<article class="rank-row ${b.rank===1&&b.comparable?'winner':''}"><div class="rank-num">${b.comparable?String(b.rank).padStart(2,'0'):'—'}</div><div><strong>${esc(b.name)}</strong><p>${b.residents} residents · ${b.comparable?'Matching reporting period':'Needs matching boundary readings or reset review'}</p></div><div class="rank-usage"><strong>${n(b.total,1)} kWh</strong><p>Recorded consumption</p></div><div class="rank-score">${b.comparable?n(b.score,2):'—'}<span>${b.comparable?'kWh / resident / day':'Not ranked'}</span></div></article>`).join('')||empty('A shared goal starts here','Add blocks and matching readings to compare.','block','Add block')}</section>`,
 insights:()=>`${heads('Good habits. Better energy.','Small, practical changes to bring into your everyday routine.')}<div class="view-grid">${[
 ['sun','Make room for daylight.','Open curtains and use natural light when practical. Switch off unnecessary lights in empty spaces.','Daylight is a good starting point: review lighting during a daytime walk-through, keep windows unobstructed, and turn lights off when nobody needs them. Never compromise visibility or safety.'],
 ['plug','Give idle devices a break.','Switch off chargers, monitors and shared appliances when they are not needed.','Check unoccupied study rooms and shared spaces. Use accessible switches to turn off devices that do not need to run. Leave essential, medical and safety equipment powered.'],
 ['clock','Build a simple closing routine.','A quick evening check can help catch lights and fans left running.','Agree who checks shared areas after use. Record observations alongside meter readings so changes in usage have context. Check equipment safely; do not touch meter wiring.'],
 ['chart','Read the pattern, then act.','Compare similar periods and note changes in occupancy, weather or equipment.','Review at least two comparable periods before drawing conclusions. If usage changes, inspect reading dates, resident counts and appliance schedules first. A change in a chart does not prove a saving caused by this app.']
 ].map(([ico,title,copy,detail],i)=>`<article class="panel insight-card"><div class="insight-icon">${icon(ico)}</div><div class="eyebrow">EVERYDAY HABIT ${String(i+1).padStart(2,'0')}</div><h2 style="margin-top:12px">${title}</h2><p>${copy}</p><button class="text-button" data-action="tip" data-tip="${i}">Try this habit ${icon('arrow')}</button></article>`).join('')}</div><div class="notice" style="margin-top:22px">These are general awareness tips. This app estimates recorded usage and costs; it does not measure automatic savings or connect to live meters.</div>`,
 settings:()=>`${heads('Make it your workspace.','Set your assumptions. Keep your records in your hands.')}<div class="settings-stack"><section class="panel"><h2>Energy assumptions</h2><p class="muted">Estimates use these values. Tariff excludes taxes and fixed charges; the emissions factor is a sample assumption.</p><form id="settings-form"><div class="form-grid"><label class="field">Energy tariff (₹ / kWh)<input name="tariff" type="number" min="0" max="100" step="0.01" required value="${state.settings.tariff}"></label><label class="field">Daily target, all blocks (kWh)<input name="target" type="number" min="1" max="10000000" step="0.1" required value="${state.settings.target}"><small>Individual block targets are allocated by resident count.</small></label><label class="field full">Emissions factor (kg CO₂e / kWh)<input name="carbon" type="number" min="0" max="5" step="0.001" required value="${state.settings.carbon}"><small>Use an appropriate factor for your electricity source. The default is illustrative, not an official local factor.</small></label></div><p id="form-error" class="form-error" role="alert"></p><div class="form-actions"><button class="button primary" type="submit">Save assumptions</button></div></form></section><section class="panel"><h2>Workspace data</h2><p class="muted">${config.backend?'Your records are stored in this server’s SQLite database.':'Records stay in this browser on this device. There is no account sync.'} Export a backup before clearing browser data. Import replaces this workspace after confirmation.</p><div class="data-actions">${button('Download backup','backup','download')}${button('Import backup','import','book')}${button('Start empty workspace','clear','','danger')}${button('Load sample data','demo')}</div><input id="import-file" type="file" accept=".json,application/json" hidden></section><section class="panel"><h2>About ${config.name}</h2><p class="muted" style="margin-bottom:0">An energy-tracking project by ${config.owner}. ${config.tagline} Built for manual readings, transparent calculations and a calmer daily workflow.</p></section></div>`
};

function readingForm(id,preferred){
  if(!state.blocks.length){toast('Add a hostel block first.');blockForm();return;}
  const r=state.readings.find(r=>r.id===id),selected=r?.blockId||preferred||(block!=='all'?block:state.blocks[0].id);
  open(r?'Edit meter reading':'A new chapter in your energy journal.','Record the cumulative value displayed on the meter.',`<form id="reading-form" data-id="${r?esc(r.id):''}"><div class="form-grid"><label class="field full">Hostel block<select name="blockId" required>${state.blocks.map(b=>`<option value="${esc(b.id)}" ${b.id===selected?'selected':''}>${esc(b.name)}</option>`).join('')}</select></label><label class="field">Reading date<input name="date" type="date" required max="${today()}" value="${r?.date||today()}"></label><label class="field">Cumulative meter (kWh)<input name="value" type="number" required min="0" max="10000000000" step="0.1" placeholder="e.g. 18420.5" value="${r?.value??''}"></label><label class="field full">Note (optional)<textarea name="note" maxlength="240" placeholder="Any change in occupancy, equipment or the meter?">${esc(r?.note||'')}</textarea><small>Lower readings are retained and flagged for reset review.</small></label></div><p id="form-error" class="form-error" role="alert"></p><div class="form-actions">${button('Cancel','close')}<button class="button primary" type="submit">${r?'Save changes':'Save reading'} ${icon('arrow')}</button></div></form>`);
}
function blockForm(id){const b=state.blocks.find(b=>b.id===id);open(b?'Edit hostel block':'A new place to make a difference.','One block, one meter and a consistent group of residents.',`<form id="block-form" data-id="${b?esc(b.id):''}"><div class="form-grid"><label class="field full">Block name<input name="name" required maxlength="60" placeholder="e.g. Maple House" value="${esc(b?.name||'')}"></label><label class="field full">Number of residents<input name="residents" type="number" required min="1" max="10000" step="1" value="${b?.residents||''}" placeholder="e.g. 80"><small>Used for comparisons. Changing it recalculates all historical per-resident figures; use a stable count for your reporting period.</small></label></div><p id="form-error" class="form-error" role="alert"></p><div class="form-actions">${button('Cancel','close')}<button class="button primary" type="submit">${b?'Save changes':'Create block'}</button></div></form>`);}
function confirm(title,copy,action,id='',label='Confirm'){open(title,copy,`<div class="form-actions">${button('Cancel','close')}<button class="button danger" data-action="${action}" data-id="${esc(id)}">${label}</button></div>`);}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Download prepared.');}
function exportReport(){const {from,to}=period(),rows=ranking(state,from,to).filter(b=>block==='all'||b.id===block);download(`${config.name.toLowerCase()}-report-${to}.csv`,csv([['Block','From','To','Recorded kWh','Estimated INR','Estimated kg CO2e','Residents','kWh per resident per day (matching coverage only)','Coverage'],...rows.map(b=>[b.name,from,to,b.total.toFixed(2),b.cost.toFixed(2),b.co2.toFixed(2),b.residents,b.comparable?b.score.toFixed(4):'',b.comparable?'Matching boundary readings':'Partial or reset'])]),'text/csv;charset=utf-8');}

document.addEventListener('submit',async e=>{
  const form=e.target;if(!['reading-form','block-form','settings-form'].includes(form.id))return;e.preventDefault();if(saving)return;
  const f=new FormData(form),next=clone(),id=form.dataset.id;
  if(form.id==='reading-form'){
    const row={id:id||uid(),blockId:f.get('blockId'),date:f.get('date'),value:Number(f.get('value')),note:String(f.get('note')).trim()};
    if(next.readings.some(r=>r.id!==id&&r.blockId===row.blockId&&r.date===row.date)){$('form-error').textContent='This block already has a reading on that date. Edit the existing entry instead.';return;}
    if(id)next.readings=next.readings.map(r=>r.id===id?row:r);else next.readings.push(row);
    await commit(next,id?'Reading updated.':'Reading saved.');
  }else if(form.id==='block-form'){
    const b={id:id||uid(),name:String(f.get('name')).trim(),residents:Number(f.get('residents'))};
    if(id)next.blocks=next.blocks.map(r=>r.id===id?b:r);else next.blocks.push(b);
    await commit(next,id?'Block updated.':'New block created.');
  }else{next.settings={tariff:Number(f.get('tariff')),target:Number(f.get('target')),carbon:Number(f.get('carbon'))};await commit(next,'Energy assumptions saved.');}
});
document.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value;$('reading-results').innerHTML=readingTable();}});
document.addEventListener('change',async e=>{
  if(e.target.id==='block-filter'){block=e.target.value;render();}
  if(e.target.id==='range-filter'){range=Number(e.target.value);render();}
  if(e.target.id==='import-file'){
    const file=e.target.files[0];if(!file)return;
    try{if(file.size>6e6)throw Error('Choose a backup smaller than 6 MB.');const imported=validateState(JSON.parse(await file.text()));pendingImport=JSON.parse(JSON.stringify(imported));confirm('Replace this workspace?',`Import ${imported.blocks.length} blocks and ${imported.readings.length} readings. Download a backup first if you need the current records.`,'confirm-import','','Replace workspace');}catch(err){toast(err.message);}e.target.value='';
  }
});
let pendingImport;
document.addEventListener('click',async e=>{
  if(e.target.closest('.skip')){e.preventDefault();$('main')?.focus();return;}
  const target=e.target.closest('[data-action]');if(!target)return;e.preventDefault();const a=target.dataset.action,id=target.dataset.id;
  if(a==='close'){close();pendingImport=undefined;}
  else if(a==='reading')readingForm();
  else if(a==='block-reading')readingForm(null,id);
  else if(a==='edit-reading')readingForm(id);
  else if(a==='block')blockForm();
  else if(a==='edit-block')blockForm(id);
  else if(a==='delete-reading')confirm('Remove this reading?','Usage will be recalculated between the remaining adjacent readings. Export a backup if you need to keep this record.','confirm-delete-reading',id,'Remove reading');
  else if(a==='confirm-delete-reading'){const next=clone();next.readings=next.readings.filter(r=>r.id!==id);await commit(next,'Reading removed.');}
  else if(a==='delete-block'){const b=state.blocks.find(b=>b.id===id);confirm(`Remove ${esc(b.name)}?`,'This also removes its readings from this workspace. Export a backup first if you need to retain them.','confirm-delete-block',id,'Remove block');}
  else if(a==='confirm-delete-block'){const next=clone();next.blocks=next.blocks.filter(b=>b.id!==id);next.readings=next.readings.filter(r=>r.blockId!==id);await commit(next,'Block and its readings removed.');}
  else if(a==='menu')document.querySelectorAll('.sidebar,.mobile-backdrop').forEach(el=>el.classList.add(el.matches('.sidebar')?'open':'visible'));
  else if(a==='menu-close')document.querySelectorAll('.sidebar,.mobile-backdrop').forEach(el=>el.classList.remove('open','visible'));
  else if(a==='export')exportReport();
  else if(a==='export-readings'){download(`${config.name.toLowerCase()}-readings-${today()}.csv`,csv([['Block','Date','Cumulative kWh','Note'],...state.readings.filter(r=>block==='all'||r.blockId===block).sort((a,b)=>a.date.localeCompare(b.date)).map(r=>[state.blocks.find(b=>b.id===r.blockId).name,r.date,r.value,r.note])]),'text/csv;charset=utf-8');}
  else if(a==='backup')download(`${config.name.toLowerCase()}-backup-${today()}.json`,JSON.stringify(state,null,2),'application/json');
  else if(a==='import')$('import-file').click();
  else if(a==='confirm-import'&&pendingImport){await commit(pendingImport,'Backup restored.');pendingImport=undefined;}
  else if(a==='clear')confirm('Start with a clean slate?','This removes blocks and readings, and keeps your energy assumptions. Download a backup first to keep your current workspace.','confirm-clear','','Start empty');
  else if(a==='confirm-clear')await commit({version:1,blocks:[],readings:[],settings:{...state.settings},demo:false},'Your empty workspace is ready.');
  else if(a==='demo')confirm('Load a sample workspace?','This replaces the current blocks, readings and settings with illustrative data. Download a backup first if you need your records.','confirm-demo','','Load sample data');
  else if(a==='confirm-demo')await commit(seed(),'Sample workspace loaded.');
  else if(a==='retry')load();
  else if(a==='raw-backup')download(config.name.toLowerCase()+'-saved-record.txt',localStorage.getItem(config.storageKey)||'No saved record','text/plain');
  else if(a==='recover'){confirm('Replace the saved browser record?','Download it first if you need it. A fresh sample workspace will replace it.','confirm-demo','','Start again');}
  else if(a==='help')open(`Welcome to ${config.name}.`,'A thoughtful workspace for understanding electricity.',`<div class="help-copy"><h3>Read, record, understand.</h3><p>Add a block, enter cumulative kWh readings on different dates, then explore usage. Each interval is the newer reading minus the previous one. Only whole intervals inside the chosen period are included; no partial-period extrapolation.</p><h3>A fairer view.</h3><p>Leaderboard scores divide usage by residents and days. Matching boundary readings are required. Lower readings are flagged as possible resets and excluded. Gaps between valid readings are averaged for the chart, not measured live.</p><h3>Your records, your workspace.</h3><p>${config.backend?'Data is saved in a local SQLite database.':'Data is saved in this browser; another device or browser has a separate workspace.'} Download JSON backups in Settings. All initial buildings and readings are fictional sample data. Costs and emissions are estimates based on editable assumptions.</p><p>Made for ${config.owner} · Manual meter entry · No live meter connection</p></div><div class="form-actions">${button('Got it','close','','primary')}</div>`);
  else if(a==='tip'){
    const tips=[['Make room for daylight.','Review lighting during a daytime walk-through. Keep windows unobstructed and switch off lights when nobody needs them. Never compromise visibility or safety.'],['Give idle devices a break.','Check unoccupied study rooms and shared spaces. Switch off devices that do not need to run. Leave essential, medical and safety equipment powered.'],['Build a simple closing routine.','Agree who checks shared spaces after use. Note equipment or occupancy changes alongside readings. Do not touch meter wiring.'],['Read the pattern, then act.','Compare similar periods. Inspect reading dates, occupancy and equipment schedules before interpreting a change. A chart alone does not prove a saving caused by this app.']];const t=tips[Number(target.dataset.tip)];open(t[0],'One small habit to bring into your week.',`<div class="help-copy"><p>${t[1]}</p></div><div class="form-actions">${button('Got it','close','','primary')}</div>`);
  }
});
$('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
load();
