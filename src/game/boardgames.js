// Chess, ludo and uno engines. Nobody controls them: each step() plays one move for whoever's turn it is, so a match
// plays itself out at random. They know nothing about 3D, so they can be tested on their own.
// every engine takes a random number function, so two browsers given the same seed play the same match
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ======================= chess ======================= */
// Board is 64 squares, index = row * 8 + col, row 0 is black's back rank. Upper case = white. No castling or en passant.
const NN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KK = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const white = p => p === p.toUpperCase();
const sideOf = p => (white(p) ? 0 : 1);

function pseudo(b, side) {
  const out = [];
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!p || sideOf(p) !== side) continue;
    const r = i >> 3, c = i & 7, t = p.toLowerCase();
    const add = (rr, cc, noCap) => {
      if (rr < 0 || rr > 7 || cc < 0 || cc > 7) return false;
      const j = rr * 8 + cc, q = b[j];
      if (q) { if (!noCap && sideOf(q) !== side) out.push([i, j]); return false; }
      out.push([i, j]);
      return true;
    };
    if (t === 'p') {
      const d = side === 0 ? -1 : 1, start = side === 0 ? 6 : 1;
      if (add(r + d, c, true) && r === start) add(r + 2 * d, c, true);
      for (const dc of [-1, 1]) {
        const rr = r + d, cc = c + dc;
        if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
        const q = b[rr * 8 + cc];
        if (q && sideOf(q) !== side) out.push([i, rr * 8 + cc]);
      }
    } else if (t === 'n') for (const [dr, dc] of NN) add(r + dr, c + dc);
    else if (t === 'k') for (const [dr, dc] of KK) add(r + dr, c + dc);
    else {
      const dirs = t === 'r' ? ORTH : t === 'b' ? DIAG : ORTH.concat(DIAG);
      for (const [dr, dc] of dirs) { let rr = r + dr, cc = c + dc; while (add(rr, cc)) { rr += dr; cc += dc; } }
    }
  }
  return out;
}
function inCheck(b, side) {
  const k = b.indexOf(side === 0 ? 'K' : 'k');
  return k >= 0 && pseudo(b, 1 - side).some(m => m[1] === k);
}
function apply(b, [i, j]) {
  const nb = b.slice(), p = nb[i];
  nb[j] = p; nb[i] = '';
  if (p === 'P' && j < 8) nb[j] = 'Q';
  if (p === 'p' && j >= 56) nb[j] = 'q';
  return nb;
}
const legal = (b, side) => pseudo(b, side).filter(m => !inCheck(apply(b, m), side));
const material = (b, side) => b.reduce((s, p) => s + (p && sideOf(p) === side ? VAL[p.toLowerCase()] : 0), 0);

// who: participant index playing white / black. skill: chance each move is the best-looking one (the rest are random).
export function createChess(whiteIdx = 0, blackIdx = 1, skill = [.55, .55], rng = Math.random) {
  const b = [];
  const back = 'rnbqkbnr';
  for (let c = 0; c < 8; c++) { b[c] = back[c]; b[8 + c] = 'p'; b[48 + c] = 'P'; b[56 + c] = back[c].toUpperCase(); }
  for (let i = 16; i < 48; i++) b[i] = '';
  const g = { b, turn: 0, plies: 0, done: false, who: [whiteIdx, blackIdx], winner: -1, draw: false, last: null };
  g.step = () => {
    if (g.done) return null;
    const side = g.turn, mv = legal(g.b, side), name = ['সাদা', 'কালো'];
    if (!mv.length) {
      g.done = true;
      if (inCheck(g.b, side)) { g.winner = g.who[1 - side]; g.msg = 'চেকমেট! ' + name[1 - side] + ' জিতল।'; } else { g.draw = true; g.msg = 'স্টেলমেট, ড্র।'; }
      return { end: true, msg: g.msg };
    }
    let mvPick;
    if (rng() < skill[side]) {
      let best = -1e9;
      for (const m of mv) {
        const q = g.b[m[1]], nb = apply(g.b, m);
        let s = q ? VAL[q.toLowerCase()] * 2 : 0;
        if (nb[m[1]] !== g.b[m[0]]) s += 8;
        if (inCheck(nb, 1 - side)) s += 1.2;
        // don't walk into an immediate capture of something bigger
        if (pseudo(nb, 1 - side).some(o => o[1] === m[1])) s -= VAL[nb[m[1]].toLowerCase()] * 1.4;
        s += rng() * 1.6;
        if (s > best) { best = s; mvPick = m; }
      }
    } else mvPick = mv[Math.floor(rng() * mv.length)];
    const piece = g.b[mvPick[0]], cap = g.b[mvPick[1]];
    g.b = apply(g.b, mvPick);
    g.turn = 1 - side; g.plies++;
    const promo = g.b[mvPick[1]] !== piece;
    const check = inCheck(g.b, g.turn);
    g.last = { from: mvPick[0], to: mvPick[1], piece, cap, promo, check, side };
    g.msg = name[side] + ' চাল দিল' + (cap ? ', ঘুঁটি কেটে নিল' : '') + (check ? ' (চেক!)' : '') + '।';
    if (g.plies >= 160) { // out of patience: whoever has more material wins
      const w = material(g.b, 0), bl = material(g.b, 1);
      g.done = true;
      if (Math.abs(w - bl) >= 1) { const ws = w > bl ? 0 : 1; g.winner = g.who[ws]; g.msg = 'সময় শেষ, বেশি ঘুঁটি থাকায় ' + name[ws] + ' জিতল।'; } else { g.draw = true; g.msg = 'সময় শেষ, ড্র।'; }
    }
    return g.last;
  };
  // participants in finishing order
  g.order = () => (g.draw ? [g.who[0], g.who[1]] : [g.winner, g.who[0] === g.winner ? g.who[1] : g.who[0]]);
  g.forceEnd = () => {
    if (g.done) return;
    const w = material(g.b, 0), bl = material(g.b, 1);
    g.done = true;
    if (w !== bl) { g.winner = g.who[w > bl ? 0 : 1]; } else g.draw = true;
  };
  return g;
}

/* ======================= ludo ======================= */
// Each player has 4 tokens. p = -1 in base, 0..50 on the shared 52-square ring (relative to the player's own start),
// 51..55 in the home column, 56 = home.
export const LUDO_COLORS = ['লাল', 'সবুজ', 'হলুদ', 'নীল'];
const SAFE = a => a % 13 === 0 || a % 13 === 8;
export function createLudo(n, rng = Math.random) {
  const rnd = k => Math.floor(rng() * k), pickOf = a => a[rnd(a.length)];
  const corner = n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0, 1, 2, 3];   // which board corner each participant uses
  const tok = corner.map(() => [-1, -1, -1, -1]);
  const g = { n, corner, tok, turn: 0, sixes: 0, done: false, roll: 0, finished: [], steps: 0, last: null };
  const abs = (pl, p) => (13 * corner[pl] + p) % 52;
  const progress = pl => tok[pl].reduce((s, p) => s + (p < 0 ? 0 : p + 1), 0);
  g.progress = progress;
  g.step = () => {
    if (g.done) return null;
    g.steps++;
    const pl = g.turn, roll = 1 + rnd(6);
    g.roll = roll;
    const opts = [];
    tok[pl].forEach((p, t) => {
      if (p === 56) return;
      if (p < 0) { if (roll === 6) opts.push({ t, np: 0 }); return; }
      if (p + roll <= 56) opts.push({ t, np: p + roll });
    });
    let ev = { pl, roll, moved: false, msg: LUDO_COLORS[corner[pl]] + ' 🎲' + roll };
    let extra = roll === 6;
    if (opts.length) {
      for (const o of opts) {
        let s = rng() * 6 + o.np * .15;
        if (o.np === 56) s += 100;
        if (tok[pl][o.t] < 0) s += 40;
        if (o.np <= 50) {
          const a = abs(pl, o.np);
          for (let q = 0; q < n; q++) if (q !== pl) for (const p of tok[q]) if (p >= 0 && p <= 50 && abs(q, p) === a && !SAFE(a)) s += 60;
          if (SAFE(a)) s += 8;
        }
        o.s = s;
      }
      opts.sort((x, y) => y.s - x.s);
      const o = rng() < .85 ? opts[0] : pickOf(opts);
      const from = tok[pl][o.t];
      tok[pl][o.t] = o.np;
      const caught = [];
      if (o.np <= 50) {
        const a = abs(pl, o.np);
        if (!SAFE(a)) for (let q = 0; q < n; q++) if (q !== pl) tok[q].forEach((p, t) => { if (p >= 0 && p <= 50 && abs(q, p) === a) { tok[q][t] = -1; caught.push({ pl: q, t }); } });
      }
      ev = { pl, roll, moved: true, t: o.t, from, to: o.np, caught, msg: ev.msg + (from < 0 ? ', বের হল' : '') + (caught.length ? ', ঘুঁটি কাটল!' : '') + (o.np === 56 ? ', ঘরে পৌঁছল!' : '') };
      if (caught.length || o.np === 56) extra = true;
      if (tok[pl].every(p => p === 56)) {
        g.finished.push(pl); g.done = true; ev.msg += ' ' + LUDO_COLORS[corner[pl]] + ' জিতল!';
      }
    }
    if (extra) g.sixes = roll === 6 ? g.sixes + 1 : g.sixes; else g.sixes = 0;
    if (g.sixes >= 3) { extra = false; g.sixes = 0; }
    if (!extra && !g.done) g.turn = (g.turn + 1) % n;
    g.last = ev;
    return ev;
  };
  // participants in finishing order: the winner first, the rest by how far they got
  g.order = () => {
    const rest = [...Array(n).keys()].filter(i => !g.finished.includes(i)).sort((a, b) => progress(b) - progress(a));
    return g.finished.concat(rest);
  };
  return g;
}

/* ======================= uno ======================= */
const UCOL = ['R', 'Y', 'G', 'B'];
export const UNO_NAMES = { R: 'লাল', Y: 'হলুদ', G: 'সবুজ', B: 'নীল' };
function unoDeck(rng) {
  const d = [];
  for (const c of UCOL) {
    d.push({ c, v: '0' });
    for (let k = 0; k < 2; k++) {
      for (let v = 1; v <= 9; v++) d.push({ c, v: String(v) });
      for (const s of ['skip', 'rev', 'd2']) d.push({ c, v: s });
    }
  }
  for (let k = 0; k < 4; k++) { d.push({ c: 'W', v: 'wild' }); d.push({ c: 'W', v: 'w4' }); }
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
export function createUno(n, rng = Math.random) {
  const rnd = k => Math.floor(rng() * k), pickOf = a => a[rnd(a.length)];
  let deck = unoDeck(rng);
  const hands = Array.from({ length: n }, () => []);
  for (let r = 0; r < 7; r++) for (let p = 0; p < n; p++) hands[p].push(deck.pop());
  let top;
  do { top = deck.pop(); if (top.c === 'W') deck.unshift(top); } while (top.c === 'W');
  const g = { n, hands, discard: [top], top, color: top.c, turn: 0, dir: 1, done: false, winner: -1, steps: 0, last: null };
  const draw = pl => {
    if (!deck.length) { const keep = g.discard.pop(); deck = g.discard; g.discard = [keep]; for (let i = deck.length - 1; i > 0; i--) { const j = rnd(i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; } }
    if (!deck.length) return null;
    const c = deck.pop(); hands[pl].push(c); return c;
  };
  const playable = c => c.c === 'W' || c.c === g.color || (c.v === g.top.v && g.top.c !== 'W');
  const next = (from, k = 1) => ((from + g.dir * k) % n + n) % n;
  const cardName = c => (c.c === 'W' ? (c.v === 'w4' ? 'ওয়াইল্ড +৪' : 'ওয়াইল্ড') : UNO_NAMES[c.c] + ' ' + ({ skip: 'স্কিপ', rev: 'রিভার্স', d2: '+২' }[c.v] || c.v));
  g.cardName = cardName;
  g.step = () => {
    if (g.done) return null;
    g.steps++;
    const pl = g.turn;
    let drew = 0, c = hands[pl].filter(playable);
    if (!c.length) { const d = draw(pl); drew = 1; if (d && playable(d)) c = [d]; }
    const ev = { pl, drew, card: null, msg: '' };
    if (!c.length) {
      ev.msg = 'তুলল ১টা কার্ড, খেলার মতো নেই';
      g.turn = next(pl);
    } else {
      // prefer action cards a little, keep wilds for when nothing else fits
      const nonWild = c.filter(x => x.c !== 'W');
      const pool = nonWild.length ? nonWild : c;
      const card = rng() < .35 ? pickOf(pool) : pool.slice().sort((a, b) => ((/\d/.test(b.v) ? 0 : 1) - (/\d/.test(a.v) ? 0 : 1)))[0];
      hands[pl].splice(hands[pl].indexOf(card), 1);
      g.discard.push(card); g.top = card;
      if (card.c === 'W') {
        const cnt = { R: 0, Y: 0, G: 0, B: 0 };
        for (const x of hands[pl]) if (x.c !== 'W') cnt[x.c]++;
        g.color = UCOL.slice().sort((a, b) => cnt[b] - cnt[a])[0];
      } else g.color = card.c;
      ev.card = card;
      ev.msg = cardName(card) + (drew ? ' (তুলে খেলল)' : '') + (card.c === 'W' ? ' → ' + UNO_NAMES[g.color] : '');
      let skip = 0;
      if (card.v === 'skip') skip = 1;
      else if (card.v === 'rev') { if (n === 2) skip = 1; else g.dir = -g.dir; }
      else if (card.v === 'd2') { const v = next(pl); draw(v); draw(v); ev.msg += ', পরের জন ২টা তুলল'; skip = 1; }
      else if (card.v === 'w4') { const v = next(pl); for (let k = 0; k < 4; k++) draw(v); ev.msg += ', পরের জন ৪টা তুলল'; skip = 1; }
      if (!hands[pl].length) { g.done = true; g.winner = pl; ev.msg += ' — শেষ কার্ড! জিতে গেল!'; }
      else if (hands[pl].length === 1) ev.msg += ' — UNO!';
      g.turn = next(pl, 1 + skip);
    }
    ev.color = g.color;
    g.last = ev;
    return ev;
  };
  g.order = () => {
    const idx = [...Array(n).keys()];
    return idx.sort((a, b) => (a === g.winner ? -1 : b === g.winner ? 1 : hands[a].length - hands[b].length));
  };
  return g;
}

/* ======================= ratings (also used by the server) ======================= */
// order: participant ids best first. Returns the change for `me` using standard Elo against each opponent.
export function eloDelta(me, order, ratings, draw = false, K = 32) {
  const n = order.length, mine = order.indexOf(me);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    if (i === mine) continue;
    const exp = 1 / (1 + Math.pow(10, ((ratings[order[i]] ?? 1000) - (ratings[me] ?? 1000)) / 400));
    sum += (draw ? .5 : (mine < i ? 1 : 0)) - exp;
  }
  return Math.round(K / (n - 1) * sum);
}
