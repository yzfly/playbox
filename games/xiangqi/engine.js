// 中国象棋规则引擎 + AI（9x10 棋盘，下标 r*9+c，r=0 为黑方底线；大写红方、小写黑方）
(function (root) {
  'use strict';
  const START = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w';
  const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const KNV = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [1, -2], [-1, 2], [1, 2]];
  const sideOf = p => (p === null ? null : p < 'a' ? 'w' : 'b');
  const opp = s => (s === 'w' ? 'b' : 'w');
  const inB = (r, c) => r >= 0 && r <= 9 && c >= 0 && c <= 8;
  const NAMES = { K: '帅', A: '仕', B: '相', N: '马', R: '车', C: '炮', P: '兵', k: '将', a: '士', b: '象', n: '马', r: '车', c: '炮', p: '卒' };

  function Pos(fen) { this.load(fen || START); }
  Pos.prototype.load = function (fen) {
    const [b, side] = fen.trim().split(/\s+/);
    this.b = new Array(90).fill(null); this.ksq = { w: -1, b: -1 };
    b.split('/').forEach((row, r) => {
      let c = 0;
      for (const ch of row) {
        if (ch >= '1' && ch <= '9') c += +ch;
        else { const s = r * 9 + c; this.b[s] = ch; if (ch === 'K') this.ksq.w = s; if (ch === 'k') this.ksq.b = s; c++; }
      }
    });
    this.side = side === 'b' ? 'b' : 'w'; this.hist = [];
  };
  Pos.prototype.gen = function (capsOnly) {
    const b = this.b, us = this.side, red = us === 'w', mv = [];
    for (let s = 0; s < 90; s++) {
      const p = b[s]; if (!p || sideOf(p) !== us) continue;
      const r = (s / 9) | 0, c = s % 9, t = p.toLowerCase();
      const push = (nr, nc) => {
        if (!inB(nr, nc)) return;
        const to = nr * 9 + nc, q = b[to];
        if (q && sideOf(q) === us) return;
        if (capsOnly && !q) return;
        mv.push({ from: s, to, piece: p, cap: q });
      };
      const palace = (nr, nc) => nc >= 3 && nc <= 5 && (red ? nr >= 7 && nr <= 9 : nr >= 0 && nr <= 2);
      switch (t) {
        case 'k': for (const [dr, dc] of ORTH) if (palace(r + dr, c + dc)) push(r + dr, c + dc); break;
        case 'a': for (const [dr, dc] of DIAG) if (palace(r + dr, c + dc)) push(r + dr, c + dc); break;
        case 'b':
          for (const [dr, dc] of DIAG) {
            const nr = r + 2 * dr, nc = c + 2 * dc;
            if (!inB(nr, nc) || (red ? nr < 5 : nr > 4) || b[(r + dr) * 9 + c + dc]) continue;
            push(nr, nc);
          }
          break;
        case 'n':
          for (const [dr, dc] of ORTH) {
            const lr = r + dr, lc = c + dc;
            if (!inB(lr, lc) || b[lr * 9 + lc]) continue;
            if (dr) { push(r + 2 * dr, c + 1); push(r + 2 * dr, c - 1); } else { push(r + 1, c + 2 * dc); push(r - 1, c + 2 * dc); }
          }
          break;
        case 'r':
          for (const [dr, dc] of ORTH) {
            let nr = r + dr, nc = c + dc;
            while (inB(nr, nc)) {
              const q = b[nr * 9 + nc];
              if (q) { if (sideOf(q) !== us) mv.push({ from: s, to: nr * 9 + nc, piece: p, cap: q }); break; }
              if (!capsOnly) mv.push({ from: s, to: nr * 9 + nc, piece: p, cap: null });
              nr += dr; nc += dc;
            }
          }
          break;
        case 'c':
          for (const [dr, dc] of ORTH) {
            let nr = r + dr, nc = c + dc, screen = false;
            while (inB(nr, nc)) {
              const q = b[nr * 9 + nc];
              if (!screen) {
                if (!q) { if (!capsOnly) mv.push({ from: s, to: nr * 9 + nc, piece: p, cap: null }); }
                else screen = true;
              } else if (q) { if (sideOf(q) !== us) mv.push({ from: s, to: nr * 9 + nc, piece: p, cap: q }); break; }
              nr += dr; nc += dc;
            }
          }
          break;
        case 'p': {
          push(r + (red ? -1 : 1), c);
          if (red ? r <= 4 : r >= 5) { push(r, c - 1); push(r, c + 1); }
          break;
        }
      }
    }
    return mv;
  };
  // sq 是否被 by 方攻击（用于判断将帅安全；士象不可能攻击到对方将帅）
  Pos.prototype.attacked = function (sq, by) {
    const b = this.b, w = by === 'w', R = w ? 'R' : 'r', C = w ? 'C' : 'c', N = w ? 'N' : 'n', P = w ? 'P' : 'p';
    const r = (sq / 9) | 0, c = sq % 9;
    for (const [dr, dc] of ORTH) {
      let nr = r + dr, nc = c + dc, seen = false;
      while (inB(nr, nc)) {
        const q = b[nr * 9 + nc];
        if (q) { if (!seen) { if (q === R) return true; seen = true; } else { if (q === C) return true; break; } }
        nr += dr; nc += dc;
      }
    }
    for (const [vr, vc] of KNV) {
      const kr = r - vr, kc = c - vc;
      if (!inB(kr, kc) || b[kr * 9 + kc] !== N) continue;
      const lr = kr + (Math.abs(vr) === 2 ? Math.sign(vr) : 0), lc = kc + (Math.abs(vc) === 2 ? Math.sign(vc) : 0);
      if (!b[lr * 9 + lc]) return true;
    }
    if (w) {
      if (inB(r + 1, c) && b[(r + 1) * 9 + c] === 'P') return true;
      if (r <= 4) for (const dc of [-1, 1]) if (inB(r, c + dc) && b[r * 9 + c + dc] === 'P') return true;
    } else {
      if (inB(r - 1, c) && b[(r - 1) * 9 + c] === 'p') return true;
      if (r >= 5) for (const dc of [-1, 1]) if (inB(r, c + dc) && b[r * 9 + c + dc] === 'p') return true;
    }
    return false;
  };
  Pos.prototype.facing = function () {
    const a = this.ksq.w, k = this.ksq.b;
    if (a % 9 !== k % 9) return false;
    for (let s = k + 9; s < a; s += 9) if (this.b[s]) return false;
    return true;
  };
  Pos.prototype.inCheck = function (side) { side = side || this.side; return this.attacked(this.ksq[side], opp(side)) || this.facing(); };
  Pos.prototype.make = function (m) {
    this.hist.push(m);
    this.b[m.to] = m.piece; this.b[m.from] = null;
    if (m.piece === 'K') this.ksq.w = m.to; else if (m.piece === 'k') this.ksq.b = m.to;
    this.side = opp(this.side);
  };
  Pos.prototype.unmake = function () {
    const m = this.hist.pop();
    this.b[m.from] = m.piece; this.b[m.to] = m.cap;
    if (m.piece === 'K') this.ksq.w = m.from; else if (m.piece === 'k') this.ksq.b = m.from;
    this.side = opp(this.side);
    return m;
  };
  Pos.prototype.illegalAfter = function (us) { return this.attacked(this.ksq[us], opp(us)) || this.facing(); };
  Pos.prototype.legal = function () {
    const us = this.side;
    return this.gen().filter(m => { this.make(m); const bad = this.illegalAfter(us); this.unmake(); return !bad; });
  };
  Pos.prototype.key = function () { return this.b.join(',') + this.side; };
  // 无子可走即负（象棋中困毙也判负）
  Pos.prototype.result = function (repCount) {
    if (this.legal().length === 0) return { type: this.inCheck() ? 'mate' : 'stalemate', winner: opp(this.side) };
    if (repCount >= 3) return { type: 'repetition' };
    let attackers = 0;
    for (const p of this.b) if (p && 'rncpRNCP'.includes(p)) attackers++;
    if (attackers === 0) return { type: 'material' };
    return null;
  };

  function perft(pos, d) {
    if (d === 0) return 1;
    let n = 0; const us = pos.side;
    for (const m of pos.gen()) { pos.make(m); if (!pos.illegalAfter(us)) n += d === 1 ? 1 : perft(pos, d - 1); pos.unmake(); }
    return n;
  }

  const VAL = { k: 0, r: 600, n: 270, c: 285, a: 120, b: 120, p: 30 };
  function pieceBonus(t, red, r, c) {
    const adv = red ? 9 - r : r; // 前进距离
    switch (t) {
      case 'p': {
        const crossed = red ? r <= 4 : r >= 5;
        if (!crossed) return 0;
        let v = 50 + (c >= 3 && c <= 5 ? 15 : 0);
        if (adv >= 6 && adv <= 8) v += 20;
        if (adv === 9) v -= 30; // 老兵
        return v;
      }
      case 'n': return (c === 0 || c === 8 ? -20 : 0) + (adv >= 3 && adv <= 7 ? 15 : 0) + (c >= 2 && c <= 6 ? 5 : 0);
      case 'c': return (c === 4 ? 10 : 0) + (adv === 2 ? 5 : 0);
      case 'r': return (adv >= 3 ? 10 : 0) + (c === 3 || c === 5 ? 5 : 0);
      default: return 0;
    }
  }
  function evaluate(pos) {
    let s = 0;
    for (let i = 0; i < 90; i++) {
      const p = pos.b[i]; if (!p) continue;
      const red = p < 'a', t = p.toLowerCase();
      const v = VAL[t] + pieceBonus(t, red, (i / 9) | 0, i % 9);
      s += red ? v : -v;
    }
    return pos.side === 'w' ? s : -s;
  }
  const MATE = 100000;
  const ordScore = m => (m.cap ? 10 * (VAL[m.cap.toLowerCase()] || 2000) - VAL[m.piece.toLowerCase()] + 10000 : 0);

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
        if (pos.illegalAfter(us)) { pos.unmake(); continue; }
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
      if (pv) { const i = ms.findIndex(m => m.from === pv.from && m.to === pv.to); if (i > 0) ms.unshift(ms.splice(i, 1)[0]); }
      let legal = 0;
      for (const m of ms) {
        pos.make(m);
        if (pos.illegalAfter(us)) { pos.unmake(); continue; }
        legal++;
        const sc = -ab(depth - 1, -beta, -alpha, ply + 1, null); pos.unmake();
        if (sc > alpha) { alpha = sc; if (ply === 0) rootBest = m; }
        if (alpha >= beta) break;
      }
      if (!legal) return -MATE + ply;
      return alpha;
    }
    const depth0 = pos.hist.length;
    for (let d = 1; d <= maxDepth; d++) {
      try { rootBest = null; ab(d, -Infinity, Infinity, 0, best); if (rootBest) best = rootBest; }
      catch (e) { if (e !== ABORT) throw e; while (pos.hist.length > depth0) pos.unmake(); break; }
    }
    return best || pos.legal()[0] || null;
  }
  const LEVELS = { easy: { depth: 1, time: 300, rand: 0.3 }, normal: { depth: 3, time: 1000, rand: 0 }, hard: { depth: 6, time: 2500, rand: 0 } };
  function bestMove(pos, level) {
    const L = LEVELS[level] || LEVELS.normal;
    const legal = pos.legal(); if (!legal.length) return null;
    if (L.rand && Math.random() < L.rand) return legal[(Math.random() * legal.length) | 0];
    return search(pos, L.depth, L.time);
  }
  root.XiangqiEngine = { Pos, START, perft, evaluate, bestMove, NAMES, sideOf };
})(typeof self !== 'undefined' ? self : globalThis);
