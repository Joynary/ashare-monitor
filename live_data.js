const EM = 'https://push2.eastmoney.com/api/qt';
const fields = 'f12,f14,f2,f3,f6,f8,f10,f15,f16,f17,f18,f20,f21';
const money = n => Number(n || 0);
const pct = n => `${n > 0 ? '+' : ''}${money(n).toFixed(2)}%`;
const cn = n => (money(n) / 1e8).toFixed(2) + '亿';
async function em(path) {
  const r = await fetch(path, { cache: 'no-store' });
  if (!r.ok) throw new Error(`行情源 HTTP ${r.status}`);
  const j = await r.json();
  if (j.rc !== 0 || !j.data) throw new Error('行情源暂未返回有效行情');
  return j.data;
}
async function refreshRealQuotes() {
  const params = new URLSearchParams({
    pn: '1', pz: '80', po: '1', np: '1', fltt: '2', invt: '2', fid: 'f6',
    fs: 'm:1+t:2,m:0+t:6,m:0+t:80', fields, ut: 'bd1d9ddb04089700cf9c27f4f4961f5b'
  });
  try {
    const [list, sh, sz, cy] = await Promise.all([
      em(`${EM}/clist/get?${params}`),
      em(`${EM}/stock/get?secid=1.000001&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f170,f169&fltt=2&invt=2`),
      em(`${EM}/stock/get?secid=0.399001&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f170,f169&fltt=2&invt=2`),
      em(`${EM}/stock/get?secid=0.399006&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f170,f169&fltt=2&invt=2`)
    ]);
    const rows = list.diff || [];
    const idx = [sh, sz, cy].map(q => q.data).filter(Boolean);
    document.querySelector('.notice').textContent = '真实行情来源：东方财富公开行情接口。行情仅在交易时段变化；财报、龙虎榜、分时买卖点未接入真实数据，已从演示值改为明确提示。'; document.querySelector('#trading-date').textContent = '最新报价 · ' + new Date().toLocaleDateString('zh-CN');
    document.querySelector('.right .live').textContent = '● 东方财富实时行情';
    document.querySelector('#clock').textContent = '行情更新 · ' + new Date().toLocaleTimeString('zh-CN', {hour12:false});
    document.querySelector('.market').innerHTML = idx.map((q,i) => `<div class="index"><div><small>${['上证指数','深证成指','创业板指'][i]}</small><strong>${money(q.f43).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div><div class="change ${money(q.f170)>=0?'up':'down'}">${pct(q.f170)}<br>${money(q.f169)>0?'+':''}${money(q.f169).toFixed(2)}</div></div>`).join('') + `<div class="index"><div><small>沪深京成交额（本页样本合计）</small><strong>${cn(rows.reduce((a,x)=>a+money(x.f6),0))}</strong></div><div class="change">行情列表前80只<br><small>按成交额排序</small></div></div>`;
    const target = rows.find(x => x.f12 === '300308') || rows[0];
    if (target) {
      document.querySelector('.charthead').innerHTML = `<strong>${target.f14}</strong><span>${target.f12}</span><b class="${money(target.f3)>=0?'up':'down'}">${money(target.f2).toFixed(2)}　${pct(target.f3)}</b><span>成交额 ${cn(target.f6)}　换手 ${money(target.f8).toFixed(2)}%　量比 ${money(target.f10).toFixed(2)}</span>`;
      document.querySelector('.chart').innerHTML = '<div class="note">该页面未接入真实分时序列图；上方为行情源最新快照。</div>';
    }
    const leaders = [...rows].sort((a,b)=>money(b.f6)-money(a.f6)).slice(0,12);
    const body = document.querySelector('#stocks tbody');
    body.innerHTML = leaders.map(s=>`<tr><td><span class="stock">${s.f14}</span><br><span class="code">${s.f12}</span></td><td>${money(s.f2).toFixed(2)}</td><td class="${money(s.f3)>=0?'up':'down'}">${pct(s.f3)}</td><td>${cn(s.f6)}</td><td>${money(s.f8).toFixed(2)}%</td><td>—</td><td>—</td></tr>`).join('');
    document.querySelector('#search').oninput=e=>{const q=e.target.value.trim().toLowerCase();body.querySelectorAll('tr').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(q))};
    document.querySelector('.cards').innerHTML = `<div class="tile"><span>涨停参考（当前列表）</span><strong class="up">${rows.filter(x=>money(x.f3)>=9.8).length}</strong><em>样本80只</em></div><div class="tile"><span>实时行情</span><strong>${rows.length}只</strong><em>公开报价</em></div><div class="tile"><span>成交额领先</span><strong>${leaders[0]?.f14||'—'}</strong><em>${leaders[0]?cn(leaders[0].f6):''}</em></div><div class="tile"><span>最高涨幅（样本）</span><strong class="up">${pct(Math.max(...rows.map(x=>money(x.f3))))}</strong><em>前80只</em></div><div class="tile"><span>龙虎榜</span><strong>未接入</strong><em>不显示模拟值</em></div><div class="tile"><span>昨日涨停</span><strong>未接入</strong><em>不显示模拟值</em></div><div class="tile"><span>资金净流入</span><strong>未接入</strong><em>不显示模拟值</em></div>`;
    document.querySelectorAll('.rightcol .signal').forEach(el=>el.innerHTML='<div class="signalrow"><span>状态</span><b>未接入真实分时序列</b></div><div class="note">不展示模拟买卖点。需要可信分时数据后才能计算参考信号。</div>');
    document.querySelector('.lower .panel:last-child').innerHTML = '<div class="ph">财报速览</div><div class="signal"><b>未接入真实财报数据</b><div class="note">移除了原型中的演示财务数字。接入合规财报源后再显示。</div></div>';
  } catch (e) {
    document.querySelector('.right .live').textContent = '● 行情源连接失败';
    document.querySelector('.notice').textContent = '行情源连接失败，当前不展示模拟行情。请稍后刷新；若持续失败，需配置稳定的后端数据源。';
    document.querySelector('#stocks tbody').innerHTML = '<tr><td colspan="7">暂时无法获取真实行情</td></tr>';
    document.querySelector('.market').innerHTML = '<div class="index"><strong>真实行情暂不可用</strong></div>';
    console.error(e);
  }
}
refreshRealQuotes();
setInterval(refreshRealQuotes, 20000);
document.querySelector('#refresh').onclick = refreshRealQuotes;

