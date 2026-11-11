// Pure domain logic. Dates are UTC calendar dates; readings are cumulative kWh.
export const DAY = 86400000;
export const today = () => new Date().toISOString().slice(0, 10);
export const shiftDate = (date, days) => new Date(Date.parse(date + 'T00:00:00Z') + days * DAY).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY);
export function validateState(s) {
  if (!s || s.version !== 1 || !Array.isArray(s.blocks) || !Array.isArray(s.readings) || !s.settings) throw Error('Choose a valid version 1 backup.');
  if (s.blocks.length > 100 || s.readings.length > 20000) throw Error('Backup is too large (100 blocks / 20,000 readings maximum).');
  const ids = new Set(), names = new Set(), readings = new Set(), pairs = new Set();
  for (const b of s.blocks) {
    if (typeof b.id !== 'string' || !b.id || ids.has(b.id) || typeof b.name !== 'string' || !b.name.trim() || b.name.length > 60 || names.has(b.name.trim().toLowerCase()) || !Number.isInteger(b.residents) || b.residents < 1 || b.residents > 10000) throw Error('Every block needs a unique name and 1–10,000 residents.');
    ids.add(b.id); names.add(b.name.trim().toLowerCase());
  }
  for (const r of s.readings) {
    const pair = r.blockId + '|' + r.date;
    if (typeof r.id !== 'string' || !r.id || readings.has(r.id) || !ids.has(r.blockId) || typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || !Number.isFinite(Date.parse(r.date + 'T00:00:00Z')) || new Date(r.date + 'T00:00:00Z').toISOString().slice(0,10) !== r.date || r.date > today() || typeof r.value !== 'number' || !Number.isFinite(r.value) || r.value < 0 || r.value > 1e10 || typeof r.note !== 'string' || r.note.length > 240 || pairs.has(pair)) throw Error('Check reading dates, values and duplicates. Dates cannot be in the future.');
    readings.add(r.id); pairs.add(pair);
  }
  const {tariff, target, carbon} = s.settings;
  if (![tariff, target, carbon].every(x => typeof x === 'number' && Number.isFinite(x)) || tariff < 0 || tariff > 100 || target < 1 || target > 1e7 || carbon < 0 || carbon > 5) throw Error('Check tariff (0–100), daily target (1–10,000,000) and emissions factor (0–5).');
  return s;
}
export function intervals(s, blockId = 'all') {
  return s.blocks.filter(b => blockId === 'all' || b.id === blockId).flatMap(b => {
    const rows = s.readings.filter(r => r.blockId === b.id).sort((a,b) => a.date.localeCompare(b.date));
    return rows.slice(1).map((r,i) => ({blockId:b.id, name:b.name, residents:b.residents, from:rows[i].date, to:r.date, days:daysBetween(rows[i].date,r.date), kwh:r.value - rows[i].value, reset:r.value < rows[i].value}));
  });
}
export function summarize(s, blockId, from, to) {
  const all = intervals(s, blockId).filter(i => i.from >= from && i.to <= to);
  const valid = all.filter(i => !i.reset);
  const total = valid.reduce((n,i) => n+i.kwh,0);
  return {total, cost:total*s.settings.tariff, co2:total*s.settings.carbon, valid, resets:all.filter(i=>i.reset), days:daysBetween(from,to)};
}
export function ranking(s, from, to) {
  return s.blocks.map(b => {
    const data = summarize(s,b.id,from,to);
    const readings = s.readings.filter(r=>r.blockId===b.id);
    const comparable = readings.some(r=>r.date===from) && readings.some(r=>r.date===to) && data.resets.length === 0 && data.days > 0;
    return {...b, ...data, comparable, score:comparable ? data.total/b.residents/data.days : null};
  }).sort((a,b)=>(a.score ?? Infinity)-(b.score ?? Infinity));
}
export function seed() {
  const end = today(), start = shiftDate(end,-28);
  const blocks = [{id:'a',name:'Maple House',residents:80},{id:'b',name:'Cedar House',residents:64},{id:'c',name:'Willow House',residents:72},{id:'d',name:'Oak House',residents:96}];
  const readings = [];
  blocks.forEach((b,i)=>{
    let value = 12000 + i*5000;
    for (let day=0;day<=28;day++) {
      if(day) value += Math.round((125+i*22 + 18*Math.sin(day*0.8+i) + (day<14?16:0))*10)/10;
      readings.push({id:`sample-${b.id}-${day}`,blockId:b.id,date:shiftDate(start,day),value:Math.round(value*10)/10,note:day===0?'Starting meter reading':'Sample reading'});
    }
  });
  return {version:1,blocks,readings,settings:{tariff:8,target:700,carbon:0.7},demo:true};
}
export function csv(rows) { return rows.map(row=>row.map(v=>{const text=typeof v==='string'&&/^[=+@\-\t\r]/.test(v)?"'"+v:String(v);return '"'+text.replaceAll('"','""')+'"';}).join(',')).join('\r\n'); }
