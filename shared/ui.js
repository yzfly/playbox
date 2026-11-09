// 童年游戏盒 公共工具：存储、提示、选项面板、画布适配、AI Worker
(function () {
  'use strict';
  const PB = (window.PB = {});
  PB.store = {
    get(k, d) { try { const v = localStorage.getItem('pb:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('pb:' + k, JSON.stringify(v)); } catch (e) { /* 隐私模式 */ } },
  };
  PB.toast = function (msg, ms) {
    let t = document.querySelector('.pb-toast');
    if (!t) { t = document.createElement('div'); t.className = 'pb-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms || 1800);
  };
  // 底部选项面板：options = [{label, hint, value, primary}]
  PB.choose = function (title, options, sub, cancelable) {
    return new Promise(resolve => {
      const m = document.createElement('div'); m.className = 'pb-modal';
      const s = document.createElement('div'); s.className = 'pb-sheet'; m.appendChild(s);
      const h = document.createElement('h2'); h.textContent = title; s.appendChild(h);
      if (sub) { const p = document.createElement('p'); p.className = 'sub'; p.textContent = sub; s.appendChild(p); }
      const box = document.createElement('div'); box.className = 'opts'; s.appendChild(box);
      options.forEach(o => {
        const b = document.createElement('button'); b.className = 'btn' + (o.primary ? ' primary' : '');
        const l = document.createElement('span'); l.textContent = o.label; b.appendChild(l);
        if (o.hint) { const sm = document.createElement('small'); sm.textContent = o.hint; b.appendChild(sm); }
        b.onclick = () => { m.remove(); resolve(o.value); };
        box.appendChild(b);
      });
      if (cancelable) m.addEventListener('click', e => { if (e.target === m) { m.remove(); resolve(null); } });
      document.body.appendChild(m);
    });
  };
  // 玩法说明：页面里的 <section id="howto" hidden> 是静态文字（便于搜索引擎收录），点 [data-howto] 按钮在底部面板中显示
  PB.showHowto = function () {
    const src = document.getElementById('howto'); if (!src) return;
    const m = document.createElement('div'); m.className = 'pb-modal';
    const s = document.createElement('div'); s.className = 'pb-sheet pb-rules'; m.appendChild(s);
    s.innerHTML = src.innerHTML;
    const ok = document.createElement('button'); ok.className = 'btn primary'; ok.textContent = '知道了'; s.appendChild(ok);
    const close = () => m.remove();
    ok.onclick = close; m.addEventListener('click', e => { if (e.target === m) close(); });
    document.body.appendChild(m);
  };
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-howto]')) PB.showHowto(); });
  PB.markPlayed = function (id) {
    const r = PB.store.get('recent', []).filter(x => x !== id); r.unshift(id); PB.store.set('recent', r.slice(0, 8));
  };
  PB.fitCanvas = function (canvas, w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  };
  // 棋盘可用区域：去掉顶栏、状态栏、工具栏后的最大尺寸
  PB.boardSpace = function (reserve) {
    const top = document.querySelector('.topbar');
    const h = window.innerHeight - (top ? top.offsetHeight : 0) - (reserve || 130);
    return { w: Math.min(window.innerWidth - 16, 640), h: Math.max(200, h) };
  };
  PB.sleep = ms => new Promise(r => setTimeout(r, ms));
  // 在 Worker 中运行引擎（不卡界面）；不支持时回退主线程。body 为 onmessage 处理函数源码
  PB.engineWorker = function (engineFile, body, fallback) {
    let w = null;
    try {
      const url = new URL(engineFile, location.href).href;
      const src = `importScripts(${JSON.stringify(url)});\nonmessage = function (e) { postMessage({ id: e.data.id, r: (${body})(e.data.d) }); };`;
      w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    } catch (e) { w = null; }
    let seq = 0;
    // 每次请求带编号，只接收对应结果；被新请求取代的旧请求返回 undefined
    return function run(data) {
      const my = ++seq;
      return new Promise(resolve => {
        if (!w) { setTimeout(() => resolve(my === seq ? fallback(data) : undefined), 30); return; }
        const onMsg = e => {
          if (e.data.id !== my) return;
          w.removeEventListener('message', onMsg); w.removeEventListener('error', onErr);
          resolve(my === seq ? e.data.r : undefined);
        };
        const onErr = () => { w.removeEventListener('message', onMsg); w = null; resolve(my === seq ? fallback(data) : undefined); };
        w.addEventListener('message', onMsg); w.addEventListener('error', onErr, { once: true });
        w.postMessage({ id: my, d: data });
      });
    };
  };
  PB.LEVELS = [
    { label: '简单', hint: '随手走，适合新手', value: 'easy' },
    { label: '普通', hint: '会算几步', value: 'normal', primary: true },
    { label: '困难', hint: '认真思考，每步稍慢', value: 'hard' },
  ];
})();
