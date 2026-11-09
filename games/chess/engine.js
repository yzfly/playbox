// 国际象棋规则引擎 + AI（0x88 棋盘，纯逻辑，可在浏览器和 Node 中运行）
(function (root) {
  'use strict';
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const KN = [-33, -31, -18, -14, 14, 18, 31, 33], KD = [-17, -16, -15, -1, 1, 15, 16, 17];
  const BD = [-17, -15, 15, 17], RD = [-16, -1, 1, 16];
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  // 子力位置表（白方视角，a8 起）
  const PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
    ke: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50],
  };
  const colorOf = p => (p === null ? null : p < 'a' ? 'w' : 'b');
  const onBoard = s => (s & 0x88) === 0;
  const sqName = s => 'abcdefgh'[s & 7] + (8 - (s >> 4));
  const nameSq = n => (8 - +n[1]) * 16 + 'abcdefgh'.indexOf(n[0]);
  const CORNER = { 0: 'q', 7: 'k', 112: 'Q', 119: 'K' };
  const opp = s => (s === 'w' ? 'b' : 'w');

  function Pos(fen) { this.load(fen || START); }
  Pos.prototype.load = function (fen) {
    const [b, side, cast, ep, hm, fm] = fen.trim().split(/\s+/);
    this.b = new Array(128).fill(null); this.ksq = { w: -1, b: -1 };
    let r = 0, f = 0;
    for (const ch of b) {
      if (ch === '/') { r++; f = 0; }
      else if (ch >= '1' && ch <= '8') f += +ch;
      else { const s = r * 16 + f; this.b[s] = ch; if (ch === 'K') this.ksq.w = s; if (ch === 'k') this.ksq.b = s; f++; }
    }
    this.side = side || 'w';
    this.cast = !cast || cast === '-' ? '' : cast;
    this.ep = !ep || ep === '-' ? -1 : nameSq(ep);
    this.half = +hm || 0; this.full = +fm || 1; this.hist = [];
  };
  Pos.prototype.attacked = function (sq, by) {
    const b = this.b, w = by === 'w';
    const N = w ? 'N' : 'n', B = w ? 'B' : 'b', R = w ? 'R' : 'r', Q = w ? 'Q' : 'q', K = w ? 'K' : 'k';
    if (w) { for (const d of [15, 17]) { const s = sq + d; if (onBoard(s) && b[s] === 'P') return true; } }
    else { for (const d of [-15, -17]) { const s = sq + d; if (onBoard(s) && b[s] === 'p') return true; } }
    for (const d of KN) { const s = sq + d; if (onBoard(s) && b[s] === N) return true; }
    for (const d of KD) { const s = sq + d; if (onBoard(s) && b[s] === K) return true; }
    for (const d of BD) { let s = sq + d; while (onBoard(s)) { const p = b[s]; if (p) { if (p === B || p === Q) return true; break; } s += d; } }
    for (const d of RD) { let s = sq + d; while (onBoard(s)) { const p = b[s]; if (p) { if (p === R || p === Q) return true; break; } s += d; } }
    return false;
  };
  Pos.prototype.inCheck = function (side) { side = side || this.side; return this.attacked(this.ksq[side], opp(side)); };
  // 伪合法着法；capsOnly 只生成吃子与升变
  Pos.prototype.gen = function (capsOnly) {
    const b = this.b, us = this.side, them = opp(us), mv = [];
    const add = (from, to, flag, promo) => mv.push({ from, to, piece: b[from], cap: flag === 'e' ? (us === 'w' ? 'p' : 'P') : b[to], flag: flag || '', promo: promo || null });
    for (let s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      const p = b[s]; if (!p || colorOf(p) !== us) continue;
      const t = p.toLowerCase();
      if (t === 'p') {
        const dir = us === 'w' ? -16 : 16, startRow = us === 'w' ? 6 : 1, promoRow = us === 'w' ? 0 : 7;
        const addP = to => { if ((to >> 4) === promoRow) for (const pr of 'qrbn') add(s, to, '', us === 'w' ? pr.toUpperCase() : pr); else add(s, to); };
        const one = s + dir;
        if (onBoard(one) && !b[one]) {
          if (!capsOnly || (one >> 4) === promoRow) addP(one);
          if (!capsOnly && (s >> 4) === startRow && !b[one + dir]) add(s, one + dir, 'd');
        }
        for (const d of [dir - 1, dir + 1]) {
          const to = s + d; if (!onBoard(to)) continue;
          if (b[to] && colorOf(b[to]) === them) addP(to);
          else if (to === this.ep) add(s, to, 'e');
        }
        continue;
      }
      if (t === 'n' || t === 'k') {
        for (const d of t === 'n' ? KN : KD) {
          const to = s + d; if (!onBoard(to)) continue;
          const q = b[to]; if (q && colorOf(q) === us) continue; if (capsOnly && !q) continue;
          add(s, to);
        }
        if (t === 'k' && !capsOnly && this.cast) {
          if (us === 'w' && s === 116) {
            if (this.cast.includes('K') && !b[117] && !b[118] && b[119] === 'R' && !this.attacked(116, 'b') && !this.attacked(117, 'b') && !this.attacked(118, 'b')) add(s, 118, 'ck');
            if (this.cast.includes('Q') && !b[115] && !b[114] && !b[113] && b[112] === 'R' && !this.attacked(116, 'b') && !this.attacked(115, 'b') && !this.attacked(114, 'b')) add(s, 114, 'cq');
          } else if (us === 'b' && s === 4) {
            if (this.cast.includes('k') && !b[5] && !b[6] && b[7] === 'r' && !this.attacked(4, 'w') && !this.attacked(5, 'w') && !this.attacked(6, 'w')) add(s, 6, 'ck');
            if (this.cast.includes('q') && !b[3] && !b[2] && !b[1] && b[0] === 'r' && !this.attacked(4, 'w') && !this.attacked(3, 'w') && !this.attacked(2, 'w')) add(s, 2, 'cq');
          }
        }
        continue;
      }
      for (const d of t === 'b' ? BD : t === 'r' ? RD : KD) {
        let to = s + d;
        while (onBoard(to)) {
          const q = b[to];
          if (q) { if (colorOf(q) === them) add(s, to); break; }
          if (!capsOnly) add(s, to);
          to += d;
        }
      }
    }
    return mv;
  };
  Pos.prototype.make = function (m) {
    const b = this.b, us = this.side;
    this.hist.push({ m, cast: this.cast, ep: this.ep, half: this.half, full: this.full });
    b[m.to] = m.promo || m.piece; b[m.from] = null;
    if (m.flag === 'e') b[m.to + (us === 'w' ? 16 : -16)] = null;
    else if (m.flag === 'ck') { const r0 = us === 'w' ? 119 : 7; b[r0 - 2] = b[r0]; b[r0] = null; }
    else if (m.flag === 'cq') { const r0 = us === 'w' ? 112 : 0; b[r0 + 3] = b[r0]; b[r0] = null; }
    if (m.piece === 'K') this.ksq.w = m.to; else if (m.piece === 'k') this.ksq.b = m.to;
    if (this.cast) {
      if (m.piece === 'K') this.cast = this.cast.replace(/[KQ]/g, '');
      else if (m.piece === 'k') this.cast = this.cast.replace(/[kq]/g, '');
      if (CORNER[m.from]) this.cast = this.cast.replace(CORNER[m.from], '');
      if (CORNER[m.to]) this.cast = this.cast.replace(CORNER[m.to], '');
    }
    this.ep = m.flag === 'd' ? (m.from + m.to) >> 1 : -1;
    this.half = m.piece === 'P' || m.piece === 'p' || m.cap ? 0 : this.half + 1;
    if (us === 'b') this.full++;
    this.side = opp(us);
  };
  Pos.prototype.unmake = function () {
    const h = this.hist.pop(), m = h.m, b = this.b;
    this.side = opp(this.side); const us = this.side;
    b[m.from] = m.piece;
    if (m.flag === 'e') { b[m.to] = null; b[m.to + (us === 'w' ? 16 : -16)] = m.cap; }
    else b[m.to] = m.cap;
    if (m.flag === 'ck') { const r0 = us === 'w' ? 119 : 7; b[r0] = b[r0 - 2]; b[r0 - 2] = null; }
    else if (m.flag === 'cq') { const r0 = us === 'w' ? 112 : 0; b[r0] = b[r0 + 3]; b[r0 + 3] = null; }
    if (m.piece === 'K') this.ksq.w = m.from; else if (m.piece === 'k') this.ksq.b = m.from;
    this.cast = h.cast; this.ep = h.ep; this.half = h.half; this.full = h.full;
    return m;
  };
  Pos.prototype.legal = function () {
    const us = this.side;
    return this.gen().filter(m => { this.make(m); const ok = !this.attacked(this.ksq[us], opp(us)); this.unmake(); return ok; });
  };
  Pos.prototype.key = function () { return this.b.join(',') + this.side + this.cast + this.ep; };
  Pos.prototype.insufficient = function () {
    const rest = [];
    for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = this.b[s]; if (p && p.toLowerCase() !== 'k') rest.push(p.toLowerCase()); }
    return rest.length === 0 || (rest.length === 1 && (rest[0] === 'n' || rest[0] === 'b'));
  };
  // 局面结果：null 表示继续
  Pos.prototype.result = function (repCount) {
    if (this.legal().length === 0) return this.inCheck() ? { type: 'mate', winner: opp(this.side) } : { type: 'stalemate' };
    if (this.half >= 100) return { type: 'fifty' };
    if (this.insufficient()) return { type: 'material' };
    if (repCount >= 3) return { type: 'repetition' };
    return null;
  };

  function perft(pos, d) {
    if (d === 0) return 1;
    let n = 0; const us = pos.side;
    for (const m of pos.gen()) { pos.make(m); if (!pos.attacked(pos.ksq[us], pos.side)) n += d === 1 ? 1 : perft(pos, d - 1); pos.unmake(); }
    return n;
  }

  function evaluate(pos) {
    const b = pos.b; let s = 0, nonPawn = 0;
    for (let i = 0; i < 128; i++) { if (i & 0x88) { i += 7; continue; } const p = b[i]; if (p && 'nbrqNBRQ'.includes(p)) nonPawn += VAL[p.toLowerCase()]; }
    const endgame = nonPawn <= 2600;
    for (let i = 0; i < 128; i++) {
      if (i & 0x88) { i += 7; continue; }
      const p = b[i]; if (!p) continue;
      const t = p.toLowerCase(), w = p < 'a';
      const idx = w ? (i >> 4) * 8 + (i & 7) : (7 - (i >> 4)) * 8 + (i & 7);
      const v = VAL[t] + PST[t === 'k' && endgame ? 'ke' : t][idx];
      s += w ? v : -v;
    }
    return pos.side === 'w' ? s : -s;
  }
  const MATE = 100000;
  const ordScore = m => (m.cap ? 10 * VAL[m.cap.toLowerCase()] - VAL[m.piece.toLowerCase()] + 10000 : 0) + (m.promo ? 9000 : 0);

  // 迭代加深 alpha-beta + 静态搜索，超时则返回上一层结果
  function search(pos, maxDepth, timeMs) {
    const t0 = Date.now(), ABORT = {};
    let nodes = 0, rootBest = null, best = null;
    const tick = () => { if ((++nodes & 1023) === 0 && Date.now() - t0 > timeMs) throw ABORT; };
    function qs(alpha, beta, qd) {
      tick();
      const stand = evaluate(pos);
      if (stand >= beta) return beta;
      if (stand > alpha) alpha = stand;
      if (qd > 6) return alpha;
      const us = pos.side, ms = pos.gen(true).sort((a, b) => ordScore(b) - ordScore(a));
      for (const m of ms) {
        pos.make(m);
        if (pos.attacked(pos.ksq[us], pos.side)) { pos.unmake(); continue; }
        const sc = -qs(-beta, -alpha, qd + 1); pos.unmake();
        if (sc >= beta) return beta;
        if (sc > alpha) alpha = sc;
      }
      return alpha;
    }
    function ab(depth, alpha, beta, ply, pv) {
      tick();
      if (depth === 0) return qs(alpha, beta, 0);
      const us = pos.side, ms = pos.gen().sort((a, b) => ordScore(b) - ordScore(a));
      if (pv) { const i = ms.findIndex(m => m.from === pv.from && m.to === pv.to && m.promo === pv.promo); if (i > 0) ms.unshift(ms.splice(i, 1)[0]); }
      let legal = 0;
      for (const m of ms) {
        pos.make(m);
        if (pos.attacked(pos.ksq[us], pos.side)) { pos.unmake(); continue; }
        legal++;
        const sc = -ab(depth - 1, -beta, -alpha, ply + 1, null); pos.unmake();
        if (sc > alpha) { alpha = sc; if (ply === 0) rootBest = m; }
        if (alpha >= beta) break;
      }
      if (!legal) return pos.inCheck() ? -MATE + ply : 0;
      return alpha;
    }
    const depth0 = pos.hist.length;
    for (let d = 1; d <= maxDepth; d++) {
      try { rootBest = null; ab(d, -Infinity, Infinity, 0, best); if (rootBest) best = rootBest; }
      catch (e) { if (e !== ABORT) throw e; while (pos.hist.length > depth0) pos.unmake(); break; }
    }
    return best || pos.legal()[0] || null;
  }
  const LEVELS = { easy: { depth: 1, time: 300, rand: 0.35 }, normal: { depth: 3, time: 900, rand: 0 }, hard: { depth: 6, time: 2500, rand: 0 } };
  function bestMove(pos, level) {
    const L = LEVELS[level] || LEVELS.normal;
    const legal = pos.legal(); if (!legal.length) return null;
    if (L.rand && Math.random() < L.rand) return legal[(Math.random() * legal.length) | 0];
    return search(pos, L.depth, L.time);
  }
  root.ChessEngine = { Pos, START, perft, evaluate, bestMove, sqName, nameSq, colorOf };
})(typeof self !== 'undefined' ? self : globalThis);
