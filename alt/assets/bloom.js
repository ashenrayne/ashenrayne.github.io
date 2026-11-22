// Bloom: the story swings from side to side.
// Crest → the stained-glass shield → storm cloud → a world tree grown from a seed → a meadow in flower under the rising sun.
import { sparks, smooth, lerp1, picker } from './sparks.js';

// Small screens stack each section's copy below its illustration. Each illustration is centred in the gap between
// the header and that copy (it may tuck under the header a little), scaled to fit from how far each shape reaches
// below and above its centre (in units of its scale), and capped so it spans about nine tenths of the screen's width
// (WIDE is 0.9 over each shape's half-width) where the screen is tall enough for that.
const REACH = [[-0.85, 0.85], [-1.22, 1.1], [-0.95, 0.85], [-1.38, 2.02], [-1.0, 0.5]];
const ICE_REACH = [-1.38, 1.22];   // the ice take, in the glass's place
const WIDE = [0.84, 1.06, 0.98, 0.62, 0.6];   // the tree and the sun as they were; (site.css sizes each section's --band from these and REACH: keep them in step)
const bands = { w: 0, h: 0, list: [] };
if (document.fonts) document.fonts.ready.then(() => { bands.list = []; });   // the copy moves once its fonts arrive
function mobileBands(aspect) {
  if (bands.w === innerWidth && bands.h === innerHeight && bands.list.length) return bands.list;
  const vh = innerHeight, header = document.querySelector('header');
  const from = (header ? header.offsetHeight : 80) - 16;
  bands.list = [...document.querySelectorAll('main > section')].map((sec, i) => {
    const col = sec.querySelector('.col');
    let top = 0;
    for (let el = col; el && el !== sec; el = el.offsetParent) top += el.offsetTop;   // offsets ignore the reveal's slide-in
    const yTop = 1 - 2 * from / vh, yBot = 1 - 2 * Math.min(top - 14, vh) / vh;
    const [lo, hi] = i === 1 && !GLASS_ON ? ICE_REACH : REACH[i] || REACH[0];
    const sc = Math.max(0.05, Math.min((yTop - yBot) / (hi - lo), aspect * (WIDE[i] || 0.5), 1.2));
    return { sc, cy: (yTop + yBot) / 2 - (hi + lo) / 2 * sc };
  });
  Object.assign(bands, { w: innerWidth, h: innerHeight });
  return bands.list;
}

// The rain chapter's fish: a point on its silhouette, in its own units (length 1, nose at +0.5), and which of
// its four stripes that point falls in (set alongside, read back as fishStripe). Body, forked tail, a fin on top.
let fishStripe = 0;
function fishPoint(rnd) {
  for (;;) {
    const x = rnd() * 1.3 - 0.8, y = rnd() * 0.5 - 0.25;
    const body = x > -0.48 && x < 0.5 && Math.abs(y) < 0.17 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 0.02) / 0.5, 2))) * (y > 0 ? 1.1 : 0.95);
    const tail = x <= -0.42 && x > -0.8 && Math.abs(y) < (-x - 0.42) * 0.75 && Math.abs(y) > (-x - 0.42) * 0.75 - 0.12 - (x + 0.8) * 0.2;
    const fin = x > -0.15 && x < 0.15 && y > 0.1 && y < 0.1 + (0.15 - Math.abs(x)) * 0.7;
    if (body || tail || fin) { fishStripe = Math.min(3, Math.floor((0.5 - x) / 1.3 * 4)); return [x, y]; }
  }
}

// The tree chapter's birds, in the fish's colours: a point on one, side on, in its own units (length 1, beak at +0.48):
// [x, y, 1 on a wing (then x is across the wing's chord and y how far out along it), its band: 0 cream to 3 deep orange]
function birdPoint(rnd) {
  if (rnd() < 0.42) {
    const sp = Math.sqrt(rnd()), c = (rnd() - 0.5) * 0.3 * (1 - 0.75 * sp) - 0.08 * sp;
    return [c, sp, 1, sp < 0.4 ? 1 : sp < 0.75 ? 2 : 3];
  }
  for (;;) {
    const x = rnd() * 1.1 - 0.62, y = rnd() * 0.42 - 0.18;
    const body = ((x + 0.02) / 0.3) ** 2 + (y / 0.14) ** 2 < 1;
    const head = (x - 0.3) ** 2 + (y - 0.07) ** 2 < 0.0144;
    const beak = x > 0.38 && x < 0.48 && Math.abs(y - 0.05) < (0.48 - x) * 0.35;
    const tail = x < -0.25 && x > -0.6 && Math.abs(y + 0.02 + (x + 0.25) * 0.1) < 0.03 + (-0.25 - x) * 0.25;
    if (body || head || beak || tail) return [x, y, 0, beak ? 0 : Math.min(3, Math.max(0, Math.floor((0.45 - x) / 1.05 * 4)))];
  }
}
const BIRDS = 7;

// If lightning flashes while the fish is in the air, it leaves glowing after-images along its arc. The shaders can't remember that, so
// the moment is found here (with the same jump timing and flash as the shaders) and handed over as uX:
// the time it was struck, or -1.
// Left to chance the two rarely meet, so every fourth leap the lightning is timed to flash at the top of its arc.
const FISH_P = 7, FISH_D = 1.3;
const flashAt = (t) => Math.pow(Math.max(0, Math.sin(t * 0.9) * Math.sin(t * 0.23 + 1.3)), 24);
let fishStruck = -1;
function strikeFish(s, t) {
  const n = Math.floor(t / FISH_P), jt = (t - n * FISH_P) / FISH_D;
  if (fishStruck >= 0 && Math.floor(fishStruck / FISH_P) !== n) fishStruck = -1;   // a new leap, a new fish
  const timed = n % 4 === 3 && Math.abs(jt - 0.5) < 0.04;
  if (fishStruck < 0 && Math.abs(s - 2) < 0.6 && jt > 0.12 && jt < 0.88 && (timed || flashAt(t) > 0.35)) fishStruck = t;
  return fishStruck;
}
// the timed flash, for the shaders: both the storm's own flicker and the sky's
const FISH_BOLT = /* glsl */`
    float fishBolt() {
      float n = floor(uTime / ${FISH_P.toFixed(1)}), jt = (uTime - n * ${FISH_P.toFixed(1)}) / ${FISH_D.toFixed(1)};
      return step(2.5, mod(n, 4.0)) * exp(-pow((jt - 0.5) / 0.04, 2.0));
    }
`;

// The tree chapter: a world tree grown from a seed (see worldTreeParts).
const TREE_G = -0.3;   // the ground line, in units of uScale

// A world tree, grown from a seed. A massive trunk flaring into buttresses at the ground, forking into great limbs
// that reach out and up under one broad crown of leaves; roots spreading wide and deep below.
// One particle's place in it: [x, y, the moment it grows in (in uGrow), kind], and for wood and roots, aG: its offset
// from the branch's centre line (so a young tree can be slender) and how lit it is.
// kinds: 0 root, 1 snowflake, 2 bird, 3 earth, 4 seed, 5 none, 6 leaf (the fraction is how lit it is), 7 wood
// the tree's shape, shared with the shader: the trunk, where the canopy's underside sits, the canopy
const WT = { rootD: 1.2 };   // rootD: how deep the roots go
WT.base = 0.815;      // the canopy's underside
// the trunk: a gentle curve from the ground to where it forks, and its half-width by height, flaring into buttresses
WT.trunk = [[0, TREE_G - 0.02], [-0.06, 0.15], [0.02, 0.62]];
WT.trunkR = (y) => 0.14 + 0.22 * Math.pow(Math.min(1, Math.max(0, (0.05 - y) / 0.35)), 2.2) + 0.03 * smooth(0.3, 0.6, y);
// how growth unfolds, in "age" (0 the sprout, 1 grown): the trunk first, then the limbs, branches and twigs out to the crown
WT.age = (g) => 0.05 + 0.95 * g;   // age to uGrow
WT.trunkAge = 0.22;
WT.crown = { x: 0, rx: 1.55, ry: 0.85, under: 0.35 };
WT.crown.y = WT.base + WT.crown.under;
// the tree's branches and roots: each a curve with a radius along it and the ages its growth passes its two ends
function worldTreeBranches(rnd, topAt, botAt) {
  const branches = [];
  const bez = (S, C, E, t) => [(1 - t) * (1 - t) * S[0] + 2 * (1 - t) * t * C[0] + t * t * E[0], (1 - t) * (1 - t) * S[1] + 2 * (1 - t) * t * C[1] + t * t * E[1]];
  const add = (S, C, E, r0, r1, b0, b1, order, rf) => {
    const pts = [], rs = [];
    const wob = order < 0 ? 0.035 + 0.03 * rnd() : order > 1 ? 0.012 : 0.006, ph = rnd() * 6.28, fq = 7 + 6 * rnd();
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, q = bez(S, C, E, t), w = Math.sin(t * fq + ph) * wob * t * (1 - 0.5 * t);   // wandering a little as it goes
      pts.push([q[0] + w, q[1] + w * 0.4]); rs.push(rf ? rf(q[1], t) : r0 + (r1 - r0) * t);
    }
    let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const b = { pts, rs, b0, b1, order, len, root: order < 0 };
    branches.push(b);
    return b;
  };
  const at = (b, t) => { const f = t * 24, i = Math.min(23, Math.floor(f)), u = f - i, a = b.pts[i], c = b.pts[i + 1]; return [a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u]; };
  const inCrown = (x, y, pad) => { const u = Math.max(-0.98, Math.min(0.98, x / WT.crown.rx)); return Math.max(botAt(u) + pad, Math.min(topAt(u) - pad, y)); };
  const [S, C, E] = WT.trunk;
  const trunk = add(S, C, E, 0, 0, 0, WT.trunkAge, 0, (y) => WT.trunkR(y));
  // the great limbs: fanning out from the top of the trunk, low and wide first, then curving up into the crown
  const nL = 7;
  for (let i = 0; i < nL; i++) {
    const a = (-1.2 + 2.4 * (i + 0.5) / nL) + (rnd() - 0.5) * 0.18, sx = Math.sign(a) || 1;
    const t0 = 0.72 + 0.26 * rnd(), s0 = at(trunk, t0);
    const L = 0.75 + 0.55 * Math.abs(Math.sin(a));
    const E1 = [s0[0] + Math.sin(a) * L * 1.15, inCrown(s0[0] + Math.sin(a) * L * 1.15, s0[1] + Math.cos(a) * L * 0.75 + 0.25, 0.12)];
    const C1 = [s0[0] + Math.sin(a) * L * 0.75, s0[1] + Math.cos(a) * L * 0.25];
    const lb0 = t0 * WT.trunkAge, lb1 = lb0 + 0.4 * L / 1.3;
    const limb = add(s0, C1, E1, 0.085 - 0.025 * Math.abs(a) / 1.2, 0.022, lb0, lb1, 1);
    // branches off each limb, and twigs off those, all ending in the crown
    for (let j = 0, nB = 3 + ((rnd() * 2) | 0); j < nB; j++) {
      const t1 = 0.35 + 0.6 * (j + rnd() * 0.6) / nB, p1 = at(limb, t1);
      const ang = a + sx * (j % 2 ? 0.55 : -0.35) + (rnd() - 0.5) * 0.4, L2 = 0.25 + 0.25 * rnd();
      const E2 = [p1[0] + Math.sin(ang) * L2, inCrown(p1[0] + Math.sin(ang) * L2, p1[1] + Math.abs(Math.cos(ang)) * L2 + 0.05, 0.08)];
      const C2 = [(p1[0] + E2[0]) / 2 + (rnd() - 0.5) * 0.06, (p1[1] + E2[1]) / 2 - 0.03];
      const bb0 = lb0 + (lb1 - lb0) * t1, bb1 = bb0 + 0.2 * L2 / 0.5;
      const br = add(p1, C2, E2, 0.03, 0.01, bb0, bb1, 2);
      for (let k = 0; k < 3; k++) {
        const t2 = 0.4 + 0.55 * rnd(), p2 = at(br, t2), a3 = ang + (rnd() - 0.5) * 1.6, L3 = 0.09 + 0.12 * rnd();
        const E3 = [p2[0] + Math.sin(a3) * L3, inCrown(p2[0] + Math.sin(a3) * L3, p2[1] + Math.abs(Math.cos(a3)) * L3, 0.05)];
        const tb0 = bb0 + (bb1 - bb0) * t2;
        add(p2, [(p2[0] + E3[0]) / 2, (p2[1] + E3[1]) / 2], E3, 0.011, 0.005, tb0, tb0 + 0.12, 3);
      }
    }
  }
  // roots: a taproot and laterals spreading wide from the buttresses, out then down, with smaller roots off them
  const deepest = TREE_G - WT.rootD;
  add([0, TREE_G], [0.03, TREE_G - 0.5], [-0.04, deepest + 0.05], 0.1, 0.012, 0, 0.5, -1);
  const nR = 9;
  for (let i = 0; i < nR; i++) {
    const a = (-1.35 + 2.7 * (i + 0.5) / nR) + (rnd() - 0.5) * 0.15, sx = Math.sign(a) || 1;
    const s0 = [sx * Math.min(0.3, 0.05 + Math.abs(a) * 0.2), TREE_G - 0.01];
    const L = 0.8 + 0.5 * rnd();
    const E1 = [s0[0] + Math.sin(a) * L * 1.1, Math.max(deepest, s0[1] - Math.cos(a) * L * 0.7 - 0.3 * L)];
    const C1 = [s0[0] + Math.sin(a) * L * 0.7, s0[1] - Math.cos(a) * L * 0.15];
    const r = add(s0, C1, E1, 0.085 - 0.02 * Math.abs(a), 0.01, 0.02, 0.02 + 0.45 * L / 1.3, -1);
    for (let j = 0; j < 3; j++) {
      const t1 = 0.3 + 0.6 * rnd(), p1 = at(r, t1), a2 = a + (rnd() - 0.5) * 1.4, L2 = 0.2 + 0.3 * rnd();
      const E2 = [p1[0] + Math.sin(a2) * L2, Math.max(deepest, p1[1] - Math.abs(Math.cos(a2)) * L2 - 0.08)];
      const rb0 = 0.02 + 0.45 * L / 1.3 * t1;
      add(p1, [(p1[0] + E2[0]) / 2 + (rnd() - 0.5) * 0.08, (p1[1] + E2[1]) / 2], E2, 0.025, 0.005, rb0, rb0 + 0.2, -2);
    }
  }
  return branches;
}

// The tree's two stages before the world tree: a sprig (a stem out of the cracked seed, one leaf, rootlets) and a
// sapling (a slender trunk, a few branches with tufts of leaves, roots). The dots form each in turn and rearrange into
// the next. Drawn in uScale units from the seed's heart, as seen close up: the sprig at the seed's zoom, the sapling a
// little further back. Each returns a point of a part (0 root, 1 wood, 2 leaf): { x, y, lit }.
const SPRIG_TIP = [0.06, 1.45];
function youngTree(rnd) {
  const bez = (S, C, E, t) => [0, 1].map((i) => (1 - t) * (1 - t) * S[i] + 2 * (1 - t) * t * C[i] + t * t * E[i]);
  const curve = (S, C, E, r0, r1) => ({ S, C, E, r0, r1, w: Math.hypot(E[0] - S[0], E[1] - S[1]) * (r0 + r1) });
  const onCurve = ({ S, C, E, r0, r1 }) => {
    const t = rnd(), P = bez(S, C, E, t), Q = bez(S, C, E, Math.min(1, t + 0.01)), R = bez(S, C, E, Math.max(0, t - 0.01));
    const dl = Math.hypot(Q[0] - R[0], Q[1] - R[1]) || 1, nx = -(Q[1] - R[1]) / dl, ny = (Q[0] - R[0]) / dl;
    const v = rnd() * 2 - 1, r = r0 + (r1 - r0) * t;
    return { x: P[0] + nx * v * r, y: P[1] + ny * v * r, lit: Math.min(1, Math.max(0, 0.5 + 0.5 * v * Math.sign(-nx * 0.6 + ny * 0.8 || 1))) };
  };
  const pickOf = (list) => { const pk = picker(list.map((c) => c.w), rnd); return () => onCurve(list[pk()]); };
  const tuft = (cs) => { const pk = picker(cs.map((c) => c[2] * c[2]), rnd); return () => {
    const [cx, cy, r] = cs[pk()], a = rnd() * 6.2832, d = Math.pow(rnd(), 0.7) * (0.85 + 0.15 * Math.sin(5 * a + cx * 9));
    const sy = Math.sin(a);
    return { x: cx + Math.cos(a) * d * r * 1.2, y: cy + sy * d * r * (sy > 0 ? 0.8 : 0.55), lit: Math.min(1, Math.max(0, 0.45 + 0.45 * sy * d + 0.1 * (rnd() - 0.5))) };
  }; };

  // the sprig: a stem with a little bend, one leaf held out to the right and drooping a touch, three rootlets
  const stem = pickOf([curve([0, -0.15], [-0.14, 0.7], SPRIG_TIP, 0.05, 0.026)]);   // from where the rootlets start, so it's whole once the husk is gone
  const rootlets = pickOf([[-0.5, 0.55], [0.1, 0.8], [0.6, 0.5]].map(([a, L]) => curve([0, -0.15],
    [Math.sin(a) * L * 0.3 + 0.05, -0.15 - L * 0.55], [Math.sin(a) * L * 0.8, -0.15 - Math.cos(a) * L], 0.016, 0.006)));
  const leaf = () => {
    const L = 0.85, a = 1.05, dx = Math.sin(a), dy = Math.cos(a), u = rnd();
    const v = rnd() < 0.18 ? (rnd() - 0.5) * 0.1 : rnd() * 2 - 1;                     // a midrib, and the blade
    const w = 0.3 * L * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.65)), 0.8);
    const mx = SPRIG_TIP[0] + dx * u * L, my = SPRIG_TIP[1] + dy * u * L - 0.18 * L * u * u;
    return { x: mx - dy * v * w, y: my + dx * v * w, lit: Math.min(1, 0.6 + 0.22 * v + 0.3 * Math.exp(-v * v * 60)) };
  };
  const sprig = [rootlets, stem, leaf];

  // the sapling: a slender trunk and leader, branches alternating up it with twigs, tufts of leaves at their ends
  const T0 = [0, -0.12], TC = [-0.08, 0.7], TE = [0.05, 1.45];
  const wood = [curve(T0, TC, TE, 0.075, 0.032), curve(TE, [0.08, 1.7], [0.0, 1.95], 0.032, 0.012)], tufts = [[0.0, 1.98, 0.27], [0.06, 1.72, 0.2]];
  [[0.42, -1, 0.55], [0.52, 1, 0.62], [0.65, -1, 0.58], [0.76, 1, 0.5], [0.87, -1, 0.42], [0.95, 1, 0.36]].forEach(([t, side, L]) => {
    const s0 = bez(T0, TC, TE, t), a = side * (1.05 - 0.4 * t + 0.15 * (rnd() - 0.5));
    const E = [s0[0] + Math.sin(a) * L, s0[1] + Math.cos(a) * L + 0.08];
    const C = [s0[0] + Math.sin(a) * L * 0.55, s0[1] + Math.cos(a) * L * 0.3];
    wood.push(curve(s0, C, E, 0.028, 0.01));
    tufts.push([E[0], E[1] + 0.04, 0.2 + 0.08 * L]);
    for (let j = 0; j < 2; j++) {
      const p1 = bez(s0, C, E, 0.45 + 0.35 * j + 0.1 * rnd()), a2 = a + side * (j ? -0.6 : 0.5) * (0.7 + 0.6 * rnd()), L2 = 0.14 + 0.1 * rnd();
      const E2 = [p1[0] + Math.sin(a2) * L2, p1[1] + Math.abs(Math.cos(a2)) * L2];
      wood.push(curve(p1, [(p1[0] + E2[0]) / 2, (p1[1] + E2[1]) / 2], E2, 0.012, 0.005));
      tufts.push([E2[0], E2[1] + 0.02, 0.11 + 0.06 * rnd()]);
    }
  });
  const roots = [curve(T0, [0.04, -0.5], [0.03, -0.9], 0.05, 0.01)];
  [[-1.1, 0.65], [-0.5, 0.6], [0.45, 0.7], [1.0, 0.55]].forEach(([a, L]) => roots.push(curve([Math.sign(a) * 0.04, -0.13],
    [Math.sin(a) * L * 0.6, -0.15 - L * 0.15], [Math.sin(a) * L, -0.13 - Math.cos(a) * L * 0.9 - 0.15], 0.035, 0.008)));
  const sapling = [pickOf(roots), pickOf(wood), tuft(tufts)];
  const S = 0.85;   // the sapling a little smaller than drawn, so it stands well short of the crown to come
  return { sprig: (part) => sprig[part](), sapling: (part) => { const q = sapling[part](); return { x: q.x * S, y: q.y * S, lit: q.lit }; } };
}

function worldTreeParts(rnd) {
  // the crown, after the reference painting: a broad umbrella of big billowing lumps, not an even haze. Its outline
  // is a low dome over a flat underside, the outer lumps hanging a little lower at the sides. The visible billows sit
  // on its surface, packed but each kept clear of its neighbours, over a dimmer fill of lumps inside. Each lump is
  // lit on top and shadowed beneath, so the crown reads as stacked masses of foliage.
  const CROWN = WT.crown, clumps = [];
  const yb = CROWN.y - CROWN.under, HT = CROWN.under + CROWN.ry;               // the underside, and the crown's height
  const topAt = (u) => yb + HT * Math.pow(Math.max(0, 1 - u * u), 0.55);       // the dome's outline, u = x / rx
  const botAt = (u) => yb - 0.16 * Math.pow(u, 4);                             // the underside, drooping at the rim
  // Lumps vary a lot in size (many small, a few big), none quite round, and they crowd unevenly, overlapping here and
  // leaving gaps there, so the crown doesn't read as a repeated pattern. Each: [x, y, depth, size, its own shape].
  const shape = () => [0.8 + 0.5 * rnd(), (rnd() - 0.5) * 0.7, rnd() * 6.2832, 0.08 + 0.22 * rnd(), 0.25 + 0.35 * rnd()];   // [aspect, tilt, lobe phase, lobe depth, rim share]
  const room = () => 0.42 + 0.35 * rnd();                                    // how close a neighbour may crowd, lump by lump
  for (let tries = 0; tries < 20000 && clumps.length < 130; tries++) {       // the billows on the surface
    const u = (rnd() * 2 - 1) * 0.97, x = u * CROWN.rx;
    const r = (0.07 + 0.21 * Math.pow(rnd(), 1.6)) * (1 - 0.35 * Math.abs(u));  // bigger lumps toward the middle
    // on the outline: along the dome's top and round its rim, or along the underside's edge
    const y = rnd() < 0.8 ? topAt(u) - r * (0.55 + 0.25 * rnd()) : botAt(u) + r * 0.6;
    if (y - r * 0.6 < botAt(u) - 0.02) continue;
    const k = room();
    if (clumps.some((c) => Math.hypot(c[0] - x, (c[1] - y) * 1.3) < (c[3] + r) * k)) continue;
    clumps.push([x, y, 0.75 + 0.25 * rnd(), r, ...shape()]);                                // [x, y, depth: 0 back, 1 front, size]
  }
  const face = clumps.length;
  for (let tries = 0; tries < 20000 && clumps.length < face + 85; tries++) { // billows across the crown's face, toward us
    const u = (rnd() * 2 - 1) * 0.85, x = u * CROWN.rx, r = 0.06 + 0.2 * Math.pow(rnd(), 1.5);
    const y = botAt(u) + r * 0.7 + rnd() * Math.max(0, topAt(u) - botAt(u) - r * 1.5);
    if (y + r * 0.5 > topAt(u)) continue;
    const k = room();
    if (clumps.some((c) => Math.hypot(c[0] - x, (c[1] - y) * 1.3) < (c[3] + r) * k)) continue;
    clumps.push([x, y, 0.55 + 0.25 * rnd(), r, ...shape()]);
  }
  for (let tries = 0; tries < 20000 && clumps.length < face + 145; tries++) { // the fill behind, so there's no hollow
    const u = (rnd() * 2 - 1) * 0.9, x = u * CROWN.rx, y = botAt(u) + rnd() * (topAt(u) - botAt(u));
    const r = 0.1 + 0.16 * rnd();
    if (y + r * 0.4 > topAt(u) || y - r * 0.5 < botAt(u)) continue;
    clumps.push([x, y, 0.3 * rnd(), r, ...shape()]);
  }
  // where the birds land: on top of billows round the dome's shoulders (its crest is up under the header), spread apart
  const perches = [];
  for (let tries = 0; tries < 2000 && perches.length < BIRDS; tries++) {
    const c = clumps[(rnd() * face) | 0], x = c[0], y = c[1] + c[3] * 0.62;
    if (c[1] < yb + HT * 0.3 || Math.abs(x) < 0.45 || Math.abs(x) > 1.35 || perches.some((q) => Math.hypot(q[0] - x, q[1] - y) < 0.35)) continue;
    perches.push([x, y]);
  }
  while (perches.length < BIRDS) perches.push([(rnd() - 0.5) * 1.6, yb + HT * 0.8]);
  const pickClump = picker(clumps.map((c) => c[3] * c[3] * (0.4 + c[2])), rnd);
  const branches = worldTreeBranches(rnd, topAt, botAt);
  const woods = branches.filter((b) => !b.root), roots = branches.filter((b) => b.root);
  const weight = (b) => b.len * (2 * b.rs.reduce((s, r) => s + r, 0) / b.rs.length + 0.012) * (b.order === 0 ? 2.6 : b.order === 1 ? 1.4 : b.order === -1 ? 1.3 : 1);   // the trunk and great limbs solid
  const pickWood = picker(woods.map(weight), rnd), pickRoot = picker(roots.map(weight), rnd);
  // a point in a branch: on its centre line, its offset across it, the age growth reaches it, how lit it is
  const inBranch = (b) => {
    const f = rnd() * 24, i = Math.min(23, Math.floor(f)), u = f - i, P0 = b.pts[i], P1 = b.pts[i + 1];
    const cx = P0[0] + (P1[0] - P0[0]) * u, cy = P0[1] + (P1[1] - P0[1]) * u;
    const tl = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]) || 1, nx = -(P1[1] - P0[1]) / tl, ny = (P1[0] - P0[0]) / tl;
    const r = b.rs[i] + (b.rs[i + 1] - b.rs[i]) * u, v = rnd() * 2 - 1;
    const lit = Math.min(1, Math.max(0, 0.5 + 0.5 * v * (nx * -0.6 + ny * 0.8) * Math.sign(1)));
    return { cx, cy, ox: nx * v * r, oy: ny * v * r, age: b.b0 + (b.b1 - b.b0) * (f / 24), lit };
  };
  // which of the world tree's sparks also form the sprig and the sapling (the sprig's are all in the sapling too), where,
  // and how lit they are there, packed in aH (sprig x, y, sapling x, y) and aG.w (the parts, then both lits)
  const young = youngTree(rnd);
  const stages = (H, k, part) => {
    const inSprig = rnd() < [0.03, 0.1, 0.09][part], inSapling = inSprig || rnd() < [0.14, 0.32, 0.24][part];
    const a = inSprig ? young.sprig(part) : { x: 0, y: 0, lit: 0 }, b = inSapling ? young.sapling(part) : { x: 0, y: 0, lit: 0 };
    H.set([a.x, a.y, b.x, b.y], k * 4);
    return ((inSprig ? part + 1 : 0) + 4 * (inSapling ? part + 1 : 0)) * 1024 + Math.round(a.lit * 31) * 32 + Math.round(b.lit * 31);
  };
  return (G, H, k) => {
    const q = rnd();
    if (q < 0.065) return [(rnd() + rnd() - 1) * 1.6, TREE_G + (rnd() - 0.5) * 0.025, 0, 3];
    if (q < 0.085) {                                                      // the seed: a teardrop at the foot of the trunk, where the tree grows from
      const v = rnd() * 2 - 1, w = Math.sqrt(1 - v * v) * (0.78 - 0.22 * v), u = (rnd() * 2 - 1) * w;
      return [u * 0.03, TREE_G + 0.044 + v * 0.042, Math.abs(u) / Math.max(w, 1e-3), 4];   // z: how near the husk's edge
    }
    if (q < 0.24) {                                                       // roots
      const pt = inBranch(roots[pickRoot()]);
      G.set([pt.ox, pt.oy, pt.lit, stages(H, k, 0)], k * 4);
      return [pt.cx, pt.cy, WT.age(pt.age), 0];
    }
    if (q < 0.44) {                                                       // trunk, limbs, branches and twigs
      const pt = inBranch(woods[pickWood()]);
      G.set([pt.ox, pt.oy, pt.lit, stages(H, k, 1)], k * 4);
      return [pt.cx, pt.cy, WT.age(pt.age), 7 + 0.4 * pt.lit];
    }
    if (q < 0.85) {                                                       // leaves: clumps filling the whole crown
      const [cx, cy, depth, cr, asp, tilt, ph, lobe, rim] = clumps[pickClump()];
      // a lump wider than tall, thickest toward its rim so its outline holds, its top bulging more than its underside;
      // its outline lobed and leaning its own way, so no two match
      const a = rnd() * 6.2832, sy = Math.sin(a);
      const edge = 1 + lobe * (0.6 * Math.sin(3 * a + ph) + 0.4 * Math.sin(5 * a + 2.3 * ph));
      const r = (rnd() < 1 - rim ? Math.sqrt(rnd()) : 0.78 + 0.22 * rnd()) * edge;
      const ex = Math.cos(a) * r * cr * asp, ey = sy * r * cr * (sy > 0 ? 0.78 : 0.5) / Math.sqrt(asp);
      const lx = ex * Math.cos(tilt) - ey * Math.sin(tilt), ly = ex * Math.sin(tilt) + ey * Math.cos(tilt);
      const nx = (cx - CROWN.x) / CROWN.rx, ny = (cy - yb) / HT, out = Math.min(1, Math.hypot(nx, ny * 0.8));
      // how lit this leaf is: mostly the top of its lump over the underside, then front lumps over back ones, the crown's
      // upper parts over its shaded underside, and the side toward the light (upper left)
      const top = 0.5 + 0.5 * sy * Math.pow(r, 0.6) - 0.12 * Math.cos(a) * r;
      const shade = Math.min(1, Math.max(0, 0.5 * top + 0.22 * depth + 0.2 * ny + 0.08 * (0.5 - 0.5 * nx)));
      G.set([0, 0, 0, stages(H, k, 2)], k * 4);
      return [cx + lx, cy + ly, WT.age(0.3 + 0.52 * Math.min(1, out) + 0.1 * rnd()), 6 + 0.4 * shade];   // filling out from the centre as the branches reach
    }
    if (q < 0.89) {                                                       // the flock: [x, y, which bird + .5 on a wing, kind]
      const i = (rnd() * BIRDS) | 0, [bx, by, wing, band] = birdPoint(rnd);
      H.set([band, 0, ...perches[i]], k * 4);
      return [bx, by, i + 0.5 * wing, 2];
    }
    if (q < 0.97) return [rnd() * 2 - 1, rnd(), rnd(), 1];                // snow: [across, phase, speed]
    return [0, 0, 0, 5];
  };
}

// The growth plays on each arrival rather than following the scroll (a snap would rush it): a clock in seconds runs
// while the tree's chapter is in view, and starts over once you've moved well away.
const stillMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const treeT = { value: 0 };
// once the world tree stands, the year turns, over and over: birds fly in and land, the leaves colour and fall, it
// snows, thaws, and the leaves come back. Seconds into the year, or -1 before it starts (and with motion reduced)
const YEAR_AT = 14, YEAR = 40;
const treeYear = { value: -1 };
let treeClock = 0;
function growTree(s) {
  const now = performance.now(), dt = treeClock ? Math.min((now - treeClock) / 1000, 0.1) : 0;
  treeClock = now;
  if (Math.abs(s - 3) < 0.3) treeT.value = stillMotion ? 99 : treeT.value + dt;
  else if (Math.abs(s - 3) > 0.75) treeT.value = 0;
  treeYear.value = stillMotion || treeT.value < YEAR_AT ? -1 : (treeT.value - YEAR_AT) % YEAR;
}
// the storm's wind, the same one that drives the rain (kept in step with the rain's shader): it carries the loose
// ash across the whole screen while the storm chapter is in view
// never settling: a few swells at odd rates, so it surges where they line up, slackens and flexes about, only now
// and then dropping near dead. Written once here, as [strength, rate, phase], and built into both JS and the shader.
const STORM_BASE = 0.2, STORM_SWELLS = [[0.11, 0.73, 0], [0.08, 1.37, 1.1], [0.06, 2.3, 2.7], [0.04, 3.9, 0.4]];
const softPos = (v) => 0.5 * (v + Math.sqrt(v * v + 0.004));   // never below zero, without a kink
const stormW = (t) => softPos(STORM_SWELLS.reduce((v, [a, f, p]) => v + a * Math.sin(t * f + p), STORM_BASE));
const STORM_GLSL = `float stormW(float t) {
      float w = ${STORM_BASE.toFixed(3)}${STORM_SWELLS.map(([a, f, p]) => ` + ${a.toFixed(3)} * sin(t * ${f.toFixed(3)} + ${p.toFixed(3)})`).join('')};
      return 0.5 * (w + sqrt(w * w + 0.004));
    }`;
function stormWind(s, t) {
  const near = 1 - smooth(0.3, 0.8, Math.abs(s - 2));
  if (near <= 0) return { wind: 0, sink: 0, gust: 0 };
  const w = stormW(t);
  return { wind: near * w * 5.2, sink: near * w * 0.8, gust: near * Math.min(1, w * 2) };
}
const addWind = (a, b) => ({ wind: a.wind + b.wind, sink: a.sink + b.sink, gust: Math.max(a.gust, b.gust) });
// winter's wind: it rises with the snow and blows the ash hard across from the left in gusts, then dies with the thaw
function winterWind(t) {
  const y = treeYear.value;
  if (y < 0) return { wind: 0, sink: 0, gust: 0 };
  const w = smooth(16.5, 19, y) * (1 - smooth(26, 29, y));
  const g = 0.55 + 0.45 * Math.max(0, Math.sin(t * 0.9) * Math.sin(t * 0.37 + 1));   // gusting
  return { wind: w * g * 1.7, sink: w * g * 0.5, gust: w * g };
}

// The ice chapter: the rail's ice crystal itself, frozen in the air. Its exact outline (read from the icon in the page
// and drawn into a texture at load) freezes outward from the centre on arrival, then holds: faceted clear ice, its
// rim white with hoar frost, a slow glint sweeping across it now and then, snow drifting down round it.
// The crystal's frame, in units of uScale from uCenter: its centre and the reach of its arms.
const ICE = /* glsl */`
    const vec2 ICE_C = vec2(-0.7, -0.05);   // set left, about a third of its width
    const float ICE_R = 1.3;
    uniform float uFreeze;   // 0 to 1 as it freezes in
    // the arms' reach frozen so far, at angle a: a front running out from the centre, a little ragged
    float iceFront(float a) { return uFreeze * 1.25 * (0.92 + 0.08 * sin(a * 6.0 + 1.0)) - 0.05; }
`;

// the ice crystal icon, drawn into a texture: white inside its outline (its hollow centre left out)
function crystalIcon(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 2048;   // big enough that the outline stays smooth at full-screen size
  const x = c.getContext('2d'), path = document.querySelector('#i-ice path');
  if (path) {
    x.scale(2048 / 24, 2048 / 24);
    x.fillStyle = '#fff';
    x.fill(new Path2D(path.getAttribute('d')), 'nonzero');
  }
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearMipmapLinearFilter;   // the blurred copies (mipmaps) give its glow and its thickness
  return t;
}

// it freezes on each arrival rather than following the scroll, like the tree's growth
const iceFreeze = { value: 0 };
let iceClock = 0;
function freezeIce(s) {
  const now = performance.now(), dt = iceClock ? Math.min((now - iceClock) / 1000, 0.1) : 0;
  iceClock = now;
  if (Math.abs(s - 1) < 0.3) iceFreeze.value = stillMotion ? 1 : Math.min(1, iceFreeze.value + dt / 2.6);
  else if (Math.abs(s - 1) > 0.75) iceFreeze.value = 0;
}

// The crystal: backdrop only (it needs the noise there)
const ICE_BACK = /* glsl */`
    uniform sampler2D uIcon;
    float fbm4(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.07 + 7.3; a *= 0.5; } return s; }
    // ice units (0 at the centre, 1 at an arm's tip) to the icon's texture
    vec2 iconUV(vec2 u) { return (12.0 + u * 10.9) / 24.0; }
    // the facets inside the ice: a cell pattern; x: how near a facet's edge, y: which facet
    vec2 facets(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      float d1 = 8.0, d2 = 8.0, id = 0.0;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        vec2 o = vec2(float(x), float(y));
        vec2 c = o + vec2(hash(i + o), hash(i + o + 19.1)) * 0.85 - f;
        float d = dot(c, c);
        if (d < d1) { d2 = d1; d1 = d; id = hash(i + o + 7.7); } else if (d < d2) d2 = d;
      }
      return vec2(sqrt(d2) - sqrt(d1), id);
    }
    // the crystal at u (added)
    vec3 iceAt(vec2 u) {
      float r = length(u), a = atan(u.y, u.x);
      float front = iceFront(a);
      float on = smoothstep(front, front - 0.04, r);                     // frozen this far out
      float m = smoothstep(0.2, 0.8, texture2D(uIcon, iconUV(u)).r) * on;
      float thick = texture2D(uIcon, iconUV(u), 4.0).r;                  // deep in the ice, or near its edge
      float halo = texture2D(uIcon, iconUV(u), 2.5).r;
      vec3 col = vec3(0.0);
      // hoar frost feathering out past the rim, finest at the edge
      float hoar = smoothstep(0.55, 0.85, fbm4(u * 38.0 + 3.0)) * clamp(halo - m * 1.2, 0.0, 1.0) * on;
      col += vec3(0.7, 0.9, 1.0) * hoar * 0.9;
      // the freezing front: a bright line running out along the arms as they freeze
      float edgeF = exp(-pow((r - front) / 0.03, 2.0)) * smoothstep(0.2, 0.8, texture2D(uIcon, iconUV(u)).r) * step(uFreeze, 0.999);
      col += vec3(0.85, 0.97, 1.0) * edgeF * 1.4;
      if (m > 0.0) {
        vec2 fc = facets(u * 6.0 + 0.6 * vec2(fbm4(u * 3.0), fbm4(u * 3.0 + 5.0)));   // fractures, not a tidy grid
        float lit = 0.35 + 0.65 * fract(fc.y * 7.13);                    // each facet catches the light its own way
        // a slow glint sweeping across the whole crystal every so often, and single facets flashing
        float sweep = mod(uTime * 0.32, 4.5) - 1.6;
        float band = exp(-pow((dot(u, vec2(0.83, 0.55)) - sweep) / 0.12, 2.0));
        float spark = step(0.94, fc.y) * pow(max(0.0, sin(uTime * 1.3 + fc.y * 60.0)), 12.0);
        // clear ice: dark and deep where it's thick, the sky showing through, paling to white at its edges
        float clear = fbm4(vec2(dot(u, vec2(0.5, 0.87)) * 14.0, dot(u, vec2(-0.87, 0.5)) * 2.5));   // streaks in the ice
        vec3 body = mix(vec3(0.03, 0.14, 0.24), vec3(0.2, 0.5, 0.66), (1.0 - thick) * 0.8 + 0.35 * lit * clear);
        float rim = smoothstep(0.75, 0.15, thick);
        col += body * m * 0.7;
        col += vec3(0.8, 0.95, 1.0) * m * (0.8 * rim * rim + 0.22 * smoothstep(0.06, 0.0, fc.x) * lit);   // white rim, faint fracture lines
        col += vec3(0.9, 0.98, 1.0) * m * (band * (0.25 + 0.6 * lit) * (0.4 + 0.6 * rim) + spark * 0.3 * smoothstep(0.25, 0.0, fc.x));
      }
      return col;
    }
`;

// The second chapter: the logo's shield as a stained-glass window, the eagle its leading, the sky and fire its panes,
// broken into pieces of glass. A flashlight from our side wanders over it, picking out its detail: the pieces' highs
// and lows, the grain and bubbles in the glass, the worn, ridged eagle, the raised rim, and the shadows they cast. Dust
// drifts in the beam. The ice crystal that came before it is kept behind ?take=ice.
const GLASS_ON = new URLSearchParams(location.search).get('take') !== 'ice';
// the ice take wears its crystal as the chapter's icon, in the rail and over the copy
if (!GLASS_ON) {
  document.documentElement.classList.add('take-ice');
  document.querySelectorAll('.rail a[href="#studio"] img, #studio .label .icon img').forEach((el) => {
    el.outerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-ice"/></svg>';
  });
  const rail = document.querySelector('.rail a[href="#studio"]');
  if (rail) rail.title = 'Ice';
}
// Up close: a click or tap on the shield brings it forward to fill the screen, the page steps aside, and the flashlight
// is the visitor's: it follows the mouse, or on a touch screen it's held a little above the finger so the finger
// doesn't hide what it lights. A click or tap (not a drag), the close button or Esc put it back. The light starts from
// wherever it had wandered to, so nothing jumps.
const focus = (() => {
  const LIFT = 90;   // px the light is held above a finger
  const st = { want: 0, e: 0, aim: [0, 0], to: [0, 0], on: 0, t: 0, s: 0, base: null, cur: null };
  const aimU = { value: null }, onU = { value: 0 };
  const wander = (t) => [0.42 * Math.sin(t * 0.21) + 0.18 * Math.sin(t * 0.57 + 1), 0.45 * Math.sin(t * 0.16 + 2) + 0.18 * Math.cos(t * 0.43)];
  // a point on the screen, in window units for a given layout (the inverse of GLASS_C + u * GLASS_R, in uScale units from uCenter)
  const toU = (x, y, L) => {
    const a = innerWidth / innerHeight, px = (x / innerWidth * 2 - 1) * a, py = 1 - y / innerHeight * 2;
    return [(px - L.cx) / L.sc / 1.12, ((py - L.cy) / L.sc + 0.05) / 1.12];
  };
  // on the shield: inside its outline, near enough (square shoulders, tapering to the point at the foot)
  const onShield = (x, y) => {
    if (!st.base || Math.abs(st.s - 1) > 0.15) return false;
    const [ux, uy] = toU(x, y, st.base);
    const w = 0.8 * (uy < -0.25 ? Math.max(0, 1 - (-0.25 - uy) / 0.8) : 1);
    return Math.abs(uy) < 0.98 && Math.abs(ux) < w;
  };
  const clampU = ([x, y]) => [Math.max(-1.1, Math.min(1.1, x)), Math.max(-1.1, Math.min(1.1, y))];

  let ui, opener, back = null;
  function open(e) {
    if (st.want) return;
    st.want = 1;
    st.to = wander(st.t); st.aim = [...st.to]; st.on = 1;   // take the light from where it is
    back = document.activeElement;
    document.documentElement.classList.add('glass-focus');
    ui.classList.remove('moved');
    ui.querySelector('.glass-close').focus({ preventScroll: true });
  }
  function close() {
    if (!st.want) return;
    st.want = 0;
    document.documentElement.classList.remove('glass-focus');
    if (back && back !== document.body) back.focus({ preventScroll: true });   // back to the button, if that's how they came in
    else document.activeElement.blur();
  }
  function point(e) {
    if (!st.cur || e.target.closest('.glass-close')) return;
    const touch = e.pointerType !== 'mouse';
    if (touch && !(e.buttons & 1) && e.type !== 'pointerdown') return;   // a finger moves the light only while it's down
    st.to = clampU(toU(e.clientX, e.clientY - (touch ? LIFT : 0), st.cur));
    ui.classList.add('moved');
  }

  if (GLASS_ON) {
    const sec = document.getElementById('studio');
    ui = document.createElement('div');
    ui.className = 'glass-ui';
    ui.innerHTML = '<button class="glass-close" type="button" aria-label="Close the window"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
      + '<p class="glass-hint label"><span class="fine">Move to shine the light · click to close</span><span class="coarse">Drag to shine the light · tap to close</span></p>';
    document.body.append(ui);
    opener = document.createElement('button');
    opener.className = 'glass-open label';
    opener.type = 'button';
    opener.textContent = 'Hold the light';
    sec.querySelector('.col').append(opener);
    opener.addEventListener('click', open);
    ui.querySelector('.glass-close').addEventListener('click', close);
    const words = (t) => t.closest && t.closest('.col > *');   // the copy stays the copy
    sec.addEventListener('click', (e) => { if (!words(e.target) && onShield(e.clientX, e.clientY)) open(e); });
    sec.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') sec.style.cursor = !words(e.target) && onShield(e.clientX, e.clientY) ? 'pointer' : '';
    });
    // a press that barely moves is a click or tap, and closes it; one that travels is a drag, and only moves the light
    let down = null;
    ui.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.glass-close')) return;
      down = { x: e.clientX, y: e.clientY, far: false };
      try { ui.setPointerCapture(e.pointerId); } catch (_) {}
      if (e.pointerType !== 'mouse') point(e);
    });
    ui.addEventListener('pointermove', (e) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) down.far = true;
      point(e);
    });
    ui.addEventListener('pointerup', (e) => { const tap = down && !down.far; down = null; if (tap && !e.target.closest('.glass-close')) close(); });
    ui.addEventListener('pointercancel', () => { down = null; });
    addEventListener('keydown', (e) => {
      if (!st.want) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];   // arrows move it too
      if (d) { e.preventDefault(); st.to = clampU([st.to[0] + d[0] * 0.08, st.to[1] + d[1] * 0.08]); ui.classList.add('moved'); }
    });
  }

  return {
    get t() { return st.t; }, set t(v) { st.t = v; },
    uniforms(THREE) { aimU.value = new THREE.Vector2(); return { uAim: aimU, uAimOn: onU }; },
    key: () => (st.want ? 'f' + st.to.join(',') : ''),
    // each frame: the page's own layout, eased toward the shield centred and filling the screen while it's up close
    layout(s, aspect, L) {
      st.s = s; st.base = L;
      const k = stillMotion ? 1 : 0.09;
      st.e += (st.want - st.e) * k;
      if (st.e < 0.001 && !st.want) st.e = 0;
      st.aim = st.aim.map((v, i) => v + (st.to[i] - v) * (stillMotion ? 1 : 0.3));
      st.on += (st.want - st.on) * (stillMotion ? 1 : 0.05);
      if (aimU.value) { aimU.value.set(st.aim[0], st.aim[1]); onU.value = st.on; }
      if (!st.e) { st.cur = L; return L; }
      const sc = Math.min(0.9 / 1.12, aspect * 0.94 / (0.81 * 1.12)), e = smooth(0, 1, st.e);
      st.cur = { ...L, cx: L.cx + (0 - L.cx) * e, cy: L.cy + (0.05 * sc - L.cy) * e, sc: L.sc + (sc - L.sc) * e };
      return st.cur;
    },
  };
})();

const GLASS = /* glsl */`
    const vec2 GLASS_C = vec2(0.0, -0.05);
    const float GLASS_R = 1.12;   // half the window's height
    uniform vec2 uAim;      // where the visitor holds the light, up close (see glassFocus)
    uniform float uAimOn;   // 0 the light wanders on its own, 1 it's theirs
    // where the flashlight points, in window units (0 the centre, 1 the top), wandering as someone looks about
    // (the same path as wander() in glassFocus)
    vec2 beamAt() {
      float t = uTime;
      vec2 w = vec2(0.42 * sin(t * 0.21) + 0.18 * sin(t * 0.57 + 1.0), 0.45 * sin(t * 0.16 + 2.0) + 0.18 * cos(t * 0.43));
      return mix(w, uAim, uAimOn);
    }
    // how strongly it shines at u: switched on as we arrive, with a stutter, then steady
    float beam(vec2 u) {
      float on = smoothstep(0.1, 0.35, uFreeze) * (1.0 - 0.7 * step(0.18, uFreeze) * step(uFreeze, 0.24));
      vec2 d = u - beamAt();
      return on * (0.65 * exp(-dot(d, d) / 0.16) + 0.6 * exp(-dot(d, d) / 0.025));   // a wide spill round a hot spot
    }
`;

// the shield from the logo, drawn into a square texture (its own colours, the eagle black), and a relief map made from
// it: R its height (the leading and the eagle raised, rounded at their edges; the rim standing higher), G where it's glass
function shieldGlass(THREE) {
  const S = 1024, c = document.createElement('canvas'), r = document.createElement('canvas');
  c.width = c.height = r.width = r.height = S;
  const glass = new THREE.CanvasTexture(c), relief = new THREE.CanvasTexture(r);
  fetch('../assets/logo.svg').then((res) => res.text()).then((svg) => {
    svg = svg.replace(/viewBox="[^"]*"/, 'viewBox="-235 -8 470 580" width="830" height="1024"');   // just the shield, not the name
    const img = new Image();
    img.onload = () => {
      const x = c.getContext('2d');
      x.drawImage(img, 97, 0, 830, 1024);   // centred, at the same scale
      const px = x.getImageData(0, 0, S, S).data;
      // masks: the shield, and its glass (bright) against its leading (dark)
      const mk = () => { const m = document.createElement('canvas'); m.width = m.height = S; return m; };
      const shield = mk(), lead = mk();
      const sd = shield.getContext('2d').createImageData(S, S), ld = lead.getContext('2d').createImageData(S, S);
      for (let i = 0; i < S * S * 4; i += 4) {
        const a = px[i + 3] / 255, lum = (0.3 * px[i] + 0.55 * px[i + 1] + 0.15 * px[i + 2]) / 255;
        const g = a * Math.min(1, Math.max(0, (lum - 0.08) / 0.17));
        sd.data[i] = sd.data[i + 1] = sd.data[i + 2] = 255; sd.data[i + 3] = a * 255;
        ld.data[i] = ld.data[i + 1] = ld.data[i + 2] = 255; ld.data[i + 3] = (a - g) * 255;
      }
      shield.getContext('2d').putImageData(sd, 0, 0); lead.getContext('2d').putImageData(ld, 0, 0);
      const blurred = (src, px) => { const m = mk(), y = m.getContext('2d'); y.filter = `blur(${px}px)`; y.drawImage(src, 0, 0); return y.getImageData(0, 0, S, S).data; };
      const L0 = lead.getContext('2d').getImageData(0, 0, S, S).data, L1 = blurred(lead, 2.5), L2 = blurred(lead, 7), A0 = sd.data, A1 = blurred(shield, 9);
      const out = r.getContext('2d').createImageData(S, S);
      for (let i = 0; i < S * S * 4; i += 4) {
        const a = A0[i + 3] / 255, rimBand = a * (1 - Math.min(1, Math.max(0, (A1[i + 3] / 255 - 0.6) / 0.35)));   // a band just inside the outline
        const l = L0[i + 3] / 255;
        // the lead: a flat top with rounded shoulders, overlapping the glass's edge a little
        let h = 0.45 * L1[i + 3] / 255 + 0.55 * L2[i + 3] / 255;
        h = Math.max(h * (0.4 + 0.6 * l), rimBand * 1.25);                                       // the rim stands highest
        const g = Math.max(0, a - l) * (1 - rimBand);
        out.data[i] = Math.min(255, h * 200); out.data[i + 1] = g * 255; out.data[i + 2] = a * 255; out.data[i + 3] = 255;
      }
      r.getContext('2d').putImageData(out, 0, 0);
      glass.needsUpdate = relief.needsUpdate = true;
    };
    img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  });
  return { glass, relief };
}

const GLASS_BACK = /* glsl */`
    uniform sampler2D uGlass, uRelief;
    float gfbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.07 + 7.3; a *= 0.5; } return s; }
    // the pieces of glass: x how near a piece's edge (where the lead runs), y which piece
    vec2 panes(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      float d1 = 8.0, d2 = 8.0, id = 0.0;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        vec2 o = vec2(float(x), float(y));
        vec2 c = o + vec2(hash(i + o), hash(i + o + 19.1)) * 0.8 - f;
        float d = dot(c, c);
        if (d < d1) { d2 = d1; d1 = d; id = hash(i + o + 7.7); } else if (d < d2) d2 = d;
      }
      return vec2(sqrt(d2) - sqrt(d1), id);
    }
    vec2 paneAt(vec2 u) { return panes(u * 5.5 + 0.35 * vec2(gfbm(u * 2.5), gfbm(u * 2.5 + 4.0))); }
    // the window's surface height at u: the raised leading, the eagle worn and ridged, the rim, and in the glass each
    // piece a little domed and tilted its own way, wavy, grained, with the odd bubble
    float glassH(vec2 u) {
      vec4 R = texture2D(uRelief, 0.5 + 0.5 * u);
      float h = R.r * 1.275, gm = R.g, a = R.b;
      if (gm > 0.02) {
        vec2 pc = paneAt(u);
        float came = 1.0 - smoothstep(0.0, 0.045, pc.x);                       // the lead between the pieces
        float dome = smoothstep(0.0, 0.3, pc.x);
        vec2 tilt = vec2(cos(pc.y * 6.2832), sin(pc.y * 6.2832));
        float wav = gfbm(u * 9.0 + pc.y * 13.0);
        float ang = pc.y * 3.1416;                                             // each piece's grain runs its own way
        vec2 gu = vec2(dot(u, vec2(cos(ang), sin(ang))), dot(u, vec2(-sin(ang), cos(ang))));
        float grain = noise(vec2(gu.x * 140.0, gu.y * 12.0));
        float bubble = smoothstep(0.88, 0.97, noise(u * 160.0 + pc.y * 50.0));
        h += gm * (0.16 * dome + 0.1 * dot(tilt, u * 5.5 - floor(u * 5.5) - 0.5) * dome + 0.1 * wav + 0.025 * grain - 0.08 * bubble)
           + gm * sqrt(max(0.0, 1.0 - pow(1.0 - came, 2.0))) * 0.75 * came;
      }
      float metal = a * (1.0 - gm);
      if (metal > 0.02) {
        // the eagle and the leading, cast and worn: shallow ridges following its form, pitting, and the odd scratch
        float n = gfbm(u * 6.0);
        float ridge = abs(sin(n * 22.0)) * 0.07;
        float pit = smoothstep(0.66, 0.8, gfbm(u * 60.0 + 3.0)) * 0.045;
        float scratch = smoothstep(0.985, 1.0, sin(dot(u, vec2(0.82, 0.57)) * 260.0 + n * 40.0)) * smoothstep(0.5, 0.7, noise(u * 7.0)) * 0.08;
        h += metal * (ridge - pit - scratch);
      }
      return h;
    }
    // the window at u (added), lit from the front by the flashlight
    vec3 glassAt(vec2 u) {
      vec2 uv = 0.5 + 0.5 * u;
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec3(0.0);
      vec4 g = texture2D(uGlass, uv);
      vec4 R = texture2D(uRelief, uv);
      float a = R.b, gm = R.g;
      if (a < 0.01) return vec3(0.0);
      float b = beam(u);
      // its surface: normal from the height, then shadows cast by the leading and the rim toward the light
      const float K = 0.028, E = 0.0035;
      float h = glassH(u), hx = glassH(u + vec2(E, 0.0)), hy = glassH(u + vec2(0.0, E));
      vec3 N = normalize(vec3(-(hx - h) / E * K, -(hy - h) / E * K, 1.0));
      vec3 Lp = vec3(beamAt(), 0.45);
      vec3 L = normalize(Lp - vec3(u, h * K));
      vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
      vec2 dir = normalize(Lp.xy - u + 1e-4);
      float tanE = Lp.z / max(length(Lp.xy - u), 0.05), sh = 0.0;
      for (int i = 1; i <= 6; i++) {
        float t = float(i) * 0.008;
        float occ = texture2D(uRelief, 0.5 + 0.5 * (u + dir * t)).r * 1.275 * K;
        sh = max(sh, clamp((occ - (h * K + t * tanE)) / 0.004, 0.0, 1.0));
      }
      float lit = 1.0 - 0.8 * sh;
      float diff = max(dot(N, L), 0.0);
      vec3 col = vec3(0.0);
      if (gm > 0.02) {
        vec2 pc = paneAt(u);
        vec3 tint = pow(g.rgb, vec3(1.5)) * (0.82 + 0.36 * pc.y);
        tint = mix(tint, tint.gbr * 0.9 + tint * 0.4, step(0.9, pc.y) * 0.35);
        float seedy = 0.85 + 0.3 * gfbm(u * 40.0 + pc.y * 9.0);
        float spec = pow(max(dot(N, H), 0.0), 90.0);
        // a faint glow of its own, the colour the flashlight brings out, and the light glancing off its surface
        vec3 c = tint * seedy * (0.3 + 1.8 * b * diff * lit) + vec3(1.0, 0.97, 0.9) * spec * b * lit * 1.2;
        col += c * gm;
      }
      float metal = a * (1.0 - gm);
      if (metal > 0.0) {
        vec3 patina = mix(vec3(0.06, 0.055, 0.05), vec3(0.14, 0.12, 0.1), gfbm(u * 12.0));   // dark, a little warm
        float spec = pow(max(dot(N, H), 0.0), 24.0);
        col += metal * (patina * (0.12 + 2.0 * b * diff * lit) + vec3(0.9, 0.85, 0.75) * spec * b * lit * 0.25);
      }
      return col;
    }
`;

// the ice chapter's sparks: snow drifting down round the crystal and glitter along its arms
const ICE_POINTS = /* glsl */`
        // The crystal is drawn in the backdrop; here, snow drifting down round it and glitter along its arms
        if (aAsh.z < 0.022) {
          float h = fract(aSeed.x + uTime * (0.025 + 0.025 * aSeed.y));
          vec2 u = vec2(aAsh.x * 1.5 + sin(uTime * 0.4 + aSeed.z * 6.2832) * 0.08 + 0.15 * h, 1.35 - 2.7 * h);
          tgt = (ICE_C + u * ICE_R) * uScale + uCenter;
          col = mix(vec3(0.75, 0.88, 1.0), vec3(1.0), aSeed.z);
          alpha = 0.55 * smoothstep(0.0, 0.1, h) * (1.0 - smoothstep(0.85, 1.0, h)) * smoothstep(0.0, 0.4, uFreeze);
          size = 1.8 + 2.8 * aSeed.w * aSeed.w;
        } else if (aAsh.z < 0.03) {
          float arm = floor(aSeed.y * 6.0), ra = arm * 1.0472 + 1.5708, r = 0.18 + 0.78 * aSeed.z;
          vec2 u = vec2(cos(ra), sin(ra)) * r + vec2(-sin(ra), cos(ra)) * (aSeed.x - 0.5) * 0.06;
          tgt = (ICE_C + u * ICE_R) * uScale + uCenter;
          col = vec3(0.92, 0.98, 1.0);
          alpha = pow(max(0.0, sin(uTime * (0.8 + aSeed.w) + aSeed.x * 40.0)), 16.0) * step(r, iceFront(ra));
          size = 2.0 + 3.0 * aSeed.w;
        } else {
          // the rest wait, unseen, at the crystal's heart for the next chapter
          tgt = (ICE_C + vec2(aAsh.x * 0.25, aSeed.y * 0.3)) * uScale + uCenter;
          alpha = 0.0;
        }
`;
// the glass take's: dust drifting in the beam on our side of the window, lit in the glass's warm colours where it shines
const GLASS_POINTS = /* glsl */`
        if (aAsh.z < 0.03) {
          vec2 u = vec2(aAsh.x * 1.1, aSeed.y * 2.2 - 1.1);
          u += vec2(sin(uTime * 0.13 + aSeed.z * 6.2832), cos(uTime * 0.11 + aSeed.x * 6.2832)) * 0.12
             + vec2(0.0, -fract(aSeed.w + uTime * 0.01) * 0.3);
          tgt = (GLASS_C + u * GLASS_R) * uScale + uCenter;
          float b = beam(u);
          col = mix(vec3(1.0, 0.7, 0.3), vec3(1.0, 0.95, 0.8), aSeed.z);
          alpha = (0.05 + 0.9 * b) * (0.6 + 0.4 * sin(uTime * 2.0 + aSeed.x * 30.0));
          size = 1.4 + 2.2 * aSeed.w;
        } else {
          tgt = (GLASS_C + vec2(aAsh.x * 0.25, aSeed.y * 0.3)) * uScale + uCenter;
          alpha = 0.0;
        }
`;

// each take's drawing in the backdrop
const ICE_DRAW = /* glsl */`
    // The ice chapter: the crystal, frozen in the air
    float hf = max(0.0, 1.0 - abs(uStage - 1.0) * 2.0);
    if (hf > 0.0) {
      vec2 u = ((p - uCenter) / uScale - ICE_C) / ICE_R;   // ice units: 0 at the centre, 1 at an arm's tip
      // its cold glow: a soft, blurred copy of the crystal, cheap enough to run everywhere so it has no edge
      col += vec3(0.25, 0.6, 0.8) * texture2D(uIcon, iconUV(u), 7.5).r * 0.38 * smoothstep(0.0, 0.6, uFreeze) * hf;
      if (length(u) < 1.15) col += iceAt(u) * hf;
    }

`;
const GLASS_DRAW = /* glsl */`
    // The glass take: the window, lit from behind
    float hf = max(0.0, 1.0 - abs(uStage - 1.0) * 2.0);
    if (hf > 0.0) {
      vec2 u = ((p - uCenter) / uScale - GLASS_C) / GLASS_R;   // window units: 0 the centre, 1 the top
      // the window stands solid against the sky: its leading and the eagle block what's behind
      vec2 wuv = 0.5 + 0.5 * u;
      if (wuv.x > 0.0 && wuv.x < 1.0 && wuv.y > 0.0 && wuv.y < 1.0) {
        col *= 1.0 - 0.9 * texture2D(uRelief, wuv).b * hf;
      }
      col += glassAt(u) * hf;
      // the flashlight's spill round where it points, in the air in front of the window
      vec2 d = u - beamAt();
      col += vec3(1.0, 0.86, 0.66) * exp(-dot(d, d) / 0.3) * 0.1 * smoothstep(0.1, 0.35, uFreeze) * hf;
    }

`;

// A planet: a larger light hung in the sky behind everything, a little darker at its limb, with a soft halo.
// c is its place in screen units (-1..1 each way), R its radius, tint its colour.
const PLANET = /* glsl */`
    vec3 planet(vec2 p, vec2 c, float R, vec3 tint, float seed) {
      if (uAspect < 1.0) c = vec2(c.x * 0.9, 0.62 + c.y * 0.3);   // portrait: in the band around the illustration, above the copy
      vec2 d = p - vec2(c.x * uAspect, c.y);
      float r = length(d);
      float disc = smoothstep(R, R * 0.8, r) * (0.75 + 0.25 * sqrt(max(0.0, 1.0 - r * r / (R * R))));
      float halo = exp(-r / (R * 2.2)) * 0.35 + exp(-r / (R * 7.0)) * 0.08;
      return tint * (disc * 0.85 + halo) * (0.92 + 0.08 * sin(uTime * 0.7 + seed * 2.0)) * 0.8;
    }
`;

// The default opening: the phoenix inside its shield
const CREST = /* glsl */`
    void hero() {
      if (aA.z > 0.5) {
        float fl = 0.5 + 0.5 * sin(uTime * (1.0 + 2.0 * aSeed.y) + aSeed.x * 50.0);
        tgt = (aA.xy + vec2(cos(ang), sin(ang)) * 0.006) * uScale + uCenter;
        col = mix(vec3(0.95, 0.4, 0.1), vec3(1.0, 0.8, 0.45), fl);
        alpha = 0.16 + 0.26 * fl;
        size = 2.0 + 2.4 * aSeed.w;
        f *= smoothstep(0.0, 1.0, clamp(uIntro * 1.7 - aSeed.w * 0.7, 0.0, 1.0));
      } else phoenix();
    }`;

// hero: { glsl defining void hero(), backdrop glsl, cx (-1..1 across the screen) / cy (or cy(sc), given the opening's scale) / sc for the opening chapter on wide screens,
//         chill(t) 0..1 for how cold the opening is t seconds in, fall(t) a multiplier on the loose ash's fall,
//         still: the moment shown when motion is reduced }
export const bloom = (hero = {}) => sparks({
  shapes: 5,
  chill: hero.chill,
  still: hero.still,
  fall: hero.fall,
  // the glass chapter in candle yellow and white, the ice take keeps the engine's cold blues
  palette: GLASS_ON ? { 1: {
    uAshC: [.66, .62, .52], uGlintC: [1, .96, .8], uBaseC: [.03, .027, .02], uSmokeC: [.08, .072, .052],
    uGlowC: [.6, .5, .24], uFloorC: [.26, .21, .09], accent: [255, 236, 168], deep: [214, 172, 66],
  } } : {},

  build({ N, rnd, arr }) {
    const A = arr('aA', 4), B = arr('aB', 4), C = arr('aC', 4), D = arr('aD', 4), E = arr('aE', 4), G = arr('aG', 4), H = arr('aH', 4);
    const tree = worldTreeParts(rnd);
    // blades of grass, some carrying a flower
    const blades = Array.from({ length: 460 }, () => ({ x: rnd() * 2 - 1, h: 0.06 + rnd() * rnd() * 0.26, lean: (rnd() - 0.5) * 0.6, flower: rnd() < 0.16, hue: rnd() }));
    const flowers = blades.filter((b) => b.flower);
    const blobs = [[-0.45, 0.55, 0.3], [-0.1, 0.68, 0.36], [0.3, 0.6, 0.33], [0.62, 0.5, 0.24], [-0.72, 0.47, 0.2], [0.05, 0.48, 0.3]];
    const pickBlob = picker(blobs.map((b) => b[2] * b[2]), rnd);
    for (let k = 0; k < N; k++) {
      // Shield outline around the phoenix
      if (rnd() < 0.15) {
        const u = rnd(), sgn = rnd() < 0.5 ? -1 : 1, inner = rnd() < 0.35 ? 0.93 : 1;
        let x, y;
        if (u < 0.3) { x = u / 0.3 * 1.25; y = 1; }
        else if (u < 0.52) { x = 1.25; y = 1 - (u - 0.3) / 0.22; }
        else { const t = (u - 0.52) / 0.48, m = 1 - t; x = m * m * 1.25 + 2 * m * t * 1.22; y = 2 * m * t * -0.95 + t * t * -1.42; }
        A.set([x * sgn * inner + (rnd() - 0.5) * 0.012, (y + 0.1) * inner - 0.1 + (rnd() - 0.5) * 0.012, 1, 0], k * 4);
      }

      // Storm cloud: 0 cloud, 1 its rain, 2 the pool beneath, 3 left as ash, 4 the fish, 5 its splash
      const r = rnd();
      if (r < 0.57) {
        const b = blobs[pickBlob()], a = rnd() * 6.2832, d = b[2] * Math.sqrt(rnd());
        let y = b[1] + Math.sin(a) * d * 0.8;
        if (y < 0.36) y = 0.36 + (0.36 - y) * 0.2;
        B.set([b[0] + Math.cos(a) * d, y, 0, rnd()], k * 4);
      } else if (r >= 0.88 && r < 0.9) B.set([...fishPoint(rnd), 4, 0], k * 4), B[k * 4 + 3] = fishStripe;
      else if (r >= 0.9 && r < 0.906) B.set([rnd() * 2 - 1, rnd(), 5, rnd()], k * 4);
      else B.set([0, 0, r < 0.7 ? 1 : r < 0.88 ? 2 : 3, rnd()], k * 4);

      // The world tree: roots, trunk and branches, leaves, earth, the seed
      C.set(tree(G, H, k), k * 4);

      // Meadow: 0 grass, 1 flower head, 2 the sun's halo, 3 left as ash
      const p = rnd();
      if (p < 0.5) { const b = blades[(rnd() * blades.length) | 0], t = Math.pow(rnd(), 0.8); D.set([b.x, t, b.h, b.lean], k * 4); E.set([0, t * 0.5 + rnd() * 0.25, 0, rnd()], k * 4); }
      else if (p < 0.6) { const b = flowers[(rnd() * flowers.length) | 0]; D.set([b.x, 1, b.h, b.lean], k * 4); E.set([1, 0.72 + rnd() * 0.2, b.hue, rnd()], k * 4); }
      else E.set([p < 0.9 ? 2 : 3, 0, 0, rnd()], k * 4);
    }
  },

  glsl: (hero.glsl || CREST) + ICE + (GLASS_ON ? GLASS : '') + FISH_BOLT + /* glsl */`
    float vhash(vec2 p) { vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    // the storm's wind (built from STORM_SWELLS, the same wind the ash feels)
    ${STORM_GLSL}
    // the fish's leap n: where it leaves the water, which way it heads, how far and high it goes, and its size
    void fishLeap(float n, out vec2 from, out float dirX, out float span, out float H, out float big) {
      float h1 = fract(sin(n * 12.9898) * 43758.5453), h2 = fract(sin(n * 78.233) * 43758.5453), h3 = fract(sin(n * 37.719) * 43758.5453);
      float R = uScale * 0.85;
      dirX = h2 < 0.5 ? -1.0 : 1.0; big = 0.7 + 0.7 * h3;
      span = 0.34 * R; H = (0.3 + 0.12 * h3) * uScale;
      from = vec2(uGround.x + (h1 - 0.5) * 0.9 * R - dirX * span * 0.5, uGround.y - 0.01);
    }
    // a ring of light running out across the pool from where the fish broke the surface, t seconds ago
    float ripple(vec2 p, vec2 spot, float t) {
      if (t < 0.0 || t > 2.5) return 0.0;
      vec2 q = p - spot;
      float d = length(vec2(q.x, q.y / 0.15));   // the pool is seen at a low angle, so its rings are flattened
      return exp(-pow((d - t * 0.3 * uScale) / (0.026 * uScale), 2.0)) * exp(-t * 1.2);
    }

    // The tree chapter: the seed close up, then the sprig, the sapling and the world tree, each formed by the dots in turn
    uniform float uTreeT;                    // seconds since the chapter came into view
    const float TM1 = 6.6, TM2 = 11.0;       // when the sprig rearranges into the sapling, and the sapling into the world tree
    const vec2 TREE_B = vec2(0.0, ${(TREE_G + 0.044).toFixed(3)});   // the seed's heart, where the tree grows from
    const vec2 SPRIG_TIP = vec2(${SPRIG_TIP.join(', ')});
    vec2 treeCam(vec2 p) { return p * uScale + uCenter; }                 // the world tree, as seen at last
    vec2 nearCam(vec2 o) { return (o + TREE_B) * uScale + uCenter; }      // o: already zoomed, from the seed's heart
    // the camera's zoom on the seed: close in for the seed and sprig, back a way for the sapling, then out to the whole tree
    float treeZ() {
      float a = smoothstep(TM1, TM1 + 2.0, uTreeT), b = smoothstep(TM2, TM2 + 2.6, uTreeT);
      return exp(mix(mix(log(9.0), log(3.0), a), 0.0, b));
    }
    // the year (see treeYear): -1 before it starts
    uniform float uYear;
    float snowCover() { return uYear < 0.0 ? 0.0 : smoothstep(19.5, 25.0, uYear) * (1.0 - smoothstep(27.0, 30.5, uYear)); }
    // one young stage's look for a spark: part 1 root, 2 wood, 3 leaf, at o, lit this much; the sprig grows in
    void youngLook(float part, vec2 o, float lit, bool sprig, out vec2 t, out vec3 c, out float a, out float s) {
      float T = uTreeT, tip = 0.0, gi = 1.0;
      if (sprig) {
        // out of the cracked seed: rootlets down and the stem up, then its leaf unfolding at the top
        float at = part < 1.5 ? 2.9 + 1.4 * clamp(-(o.y + 0.15) / 0.8, 0.0, 1.0)
                 : part < 2.5 ? 2.7 + 1.6 * clamp(o.y / SPRIG_TIP.y, 0.0, 1.0)
                 : 4.3 + 0.9 * clamp(length(o - SPRIG_TIP) / 0.8, 0.0, 1.0);
        gi = smoothstep(at, at + 0.15, T);
        tip = 1.0 - smoothstep(0.0, 0.45, T - at);
        if (part > 2.5) o = SPRIG_TIP + (o - SPRIG_TIP) * mix(0.3, 1.0, smoothstep(4.3, 5.7, T));
      }
      float h = max(o.y, 0.0);
      o.x += sin(uTime * 0.9 + o.y * 0.8) * h * h * 0.012;                  // a young thing bends in the breeze
      if (part > 2.5) o += vec2(sin(uTime * 1.6 + o.x * 9.0 + o.y * 6.0), cos(uTime * 1.3 + o.y * 8.0)) * 0.006 * h;
      t = nearCam(o);
      if (part < 1.5) c = sprig ? vec3(0.88, 0.82, 0.68) : mix(vec3(0.5, 0.33, 0.18), vec3(0.74, 0.56, 0.36), lit);
      else if (part < 2.5) c = sprig ? mix(vec3(0.28, 0.52, 0.17), vec3(0.62, 0.88, 0.38), lit) : mix(vec3(0.36, 0.33, 0.17), vec3(0.68, 0.6, 0.34), lit);
      else c = mix(vec3(0.05, 0.22, 0.07), vec3(0.6, 0.9, 0.36), lit * lit * (3.0 - 2.0 * lit));
      c += vec3(0.8, 0.75, 0.35) * tip;
      a = ((part < 1.5 ? 0.5 : sprig ? 0.62 : 0.75) * (0.8 + 0.2 * sin(uTime * (1.0 + aSeed.y) + aSeed.x * 40.0)) + 0.3 * tip) * gi;
      s = (sprig ? 2.6 : 2.3) + 2.4 * aSeed.w;
    }
    // from one stage to the next: sparks in both fly across on an arc; those only in the next fly in from the ash
    void toStage(inout vec2 tA, inout vec3 cA, inout float aA, inout float sA, inout float vA, vec2 tB, vec3 cB, float aB, float sB, float e) {
      if (vA <= 0.0) { tA = tB; cA = cB; aA = aB; sA = sB; vA = e; return; }
      vec2 d = tB - tA;
      tA = mix(tA, tB, e) + vec2(-d.y, d.x) * sin(3.14159 * e) * (aSeed.z - 0.5) * 0.5;
      cA = mix(cA, cB, e); aA = mix(aA, aB, e); sA = mix(sA, sB, e); vA = mix(vA, 1.0, e);
    }
    // a world-tree spark's part in the sprig and the sapling (see worldTreeParts), over its look in the world tree
    void youngTree() {
      float code = floor(aG.w / 1024.0 + 1e-4), rem = aG.w - code * 1024.0;
      float r1 = mod(code, 4.0), r2 = floor(code / 4.0 + 1e-4);
      float l1 = floor(rem / 32.0 + 1e-4) / 31.0, l2 = mod(rem, 32.0) / 31.0;
      float leafy = step(2.5, max(r1, r2));                                  // leaves land after the wood
      float e1 = smoothstep(TM1 + aSeed.x * 0.7 + 0.45 * leafy, TM1 + aSeed.x * 0.7 + 0.45 * leafy + 1.1, uTreeT);
      float e2 = smoothstep(TM2 + aSeed.x + 0.5 * leafy, TM2 + aSeed.x + 0.5 * leafy + 1.3, uTreeT);
      if (e2 >= 1.0) return;
      vec2 tA = vec2(0.0); vec3 cA = vec3(0.0); float aA = 0.0, sA = 2.0, vA = 0.0;
      if (r1 > 0.5) { youngLook(r1, aH.xy, l1, true, tA, cA, aA, sA); vA = 1.0; }
      if (r2 > 0.5) {
        vec2 tB; vec3 cB; float aB, sB;
        youngLook(r2, aH.zw, l2, false, tB, cB, aB, sB);
        if (vA > 0.0) toStage(tA, cA, aA, sA, vA, tB, cB, aB, sB, e1);
        else { tA = tB; cA = cB; aA = aB; sA = sB; vA = e1; }
      }
      toStage(tA, cA, aA, sA, vA, tgt, col, alpha, size, e2);
      tgt = tA; col = cA; alpha = aA; size = sA; f *= vA;
    }
    // wind through the crown: gusts sweep across it from the left, leaning it over and setting it rippling, then ease
    // off; w is how far this part gives (the crown's top and edges most, the trunk not at all)
    vec2 treeWind(vec2 p, float w) {
      float g = 0.3 + 0.7 * pow(0.5 + 0.5 * sin(uTime * 0.45 - p.x * 1.3 + 2.0 * sin(uTime * 0.11)), 3.0);   // how hard it blows here, now
      float wave = sin(uTime * 1.7 - p.x * 5.0 + p.y * 2.5);                                               // the ripple running through the leaves
      return vec2(g * (1.0 + 0.4 * wave), -0.3 * g * g * (0.5 + 0.5 * wave)) * w;
    }

    float flash() { return max(pow(max(0.0, sin(uTime * 0.9) * sin(uTime * 0.23 + 1.3)), 24.0), fishBolt()); }

    void shape(float k) {
      if (k < 0.5) {
        hero();
      } else if (k < 1.5) {
        ${GLASS_ON ? GLASS_POINTS : ICE_POINTS}
      } else if (k < 2.5) {
        // A storm cloud, the rain under it and the pool it fills
        float fl = flash();
        if (aB.z < 0.5) {
          vec2 p = aB.xy + vec2(sin(uTime * 0.3 + aB.w * 6.2832), cos(uTime * 0.23 + aB.w * 9.0)) * 0.018;
          tgt = p * uScale + uCenter;
          col = mix(vec3(0.17, 0.23, 0.34), vec3(0.6, 0.72, 0.9), smoothstep(0.4, 0.95, p.y)) + vec3(0.7, 0.8, 1.0) * fl;
          alpha = 0.13 * (1.0 + 3.0 * fl);
          size = 2.6 + 3.6 * aSeed.w;
        } else if (aB.z < 1.5) {
          // falling from under the whole cloud, centred on it, bent by the storm's wind; the lower a drop, the earlier the
          // wind that carried it, so the sheets of rain flex and ripple as the wind shifts
          float rt = fract(aSeed.x + uTime * (0.6 + 0.5 * aSeed.y));
          float wnd = 0.95 * stormW(uTime - 0.5 * rt), burst = min(1.0, stormW(uTime) * 2.0);
          tgt = vec2(aAsh.x * 0.84 + wnd * (rt - 0.35), 0.38 - rt * 1.28) * uScale + uCenter;
          sdir = normalize(vec2(wnd, -1.28));
          col = mix(vec3(0.45, 0.66, 0.9), vec3(0.8, 0.92, 1.0), aSeed.z);
          alpha = (0.2 + 0.3 * aSeed.z) * (0.65 + 0.5 * burst) * smoothstep(0.0, 0.08, rt) * (1.0 - 0.75 * smoothstep(0.7, 1.0, abs(aAsh.x)));   // thinning at the sides
          size = 11.0 + 16.0 * aSeed.z;
          streak = 1.0;
        } else if (aB.z < 2.5) {
          pool(uGround, uScale * 0.85);
          // ripples where the fish leaves the water and where it lands
          float P = ${FISH_P.toFixed(1)}, D = ${FISH_D.toFixed(1)}, n = floor(uTime / P);
          vec2 from; float dirX, span, H, big;
          fishLeap(n, from, dirX, span, H, big);
          float rp = ripple(tgt, from, uTime - n * P) + ripple(tgt, from + vec2(dirX * span, 0.0), uTime - n * P - D) * 1.3;
          col += vec3(0.75, 0.92, 1.0) * rp * 1.8;
          alpha += 0.9 * rp;
          tgt.y += 0.006 * uScale * rp;
        } else if (aB.z < 3.5) {
          f = 0.0;
        } else {
          // A little striped fish: every so often it leaps out of the pool and dives back in, a different size each time
          float P = ${FISH_P.toFixed(1)}, D = ${FISH_D.toFixed(1)}, n = floor(uTime / P), jt = (uTime - n * P) / D;
          vec2 from; float dirX, span, H, big;
          fishLeap(n, from, dirX, span, H, big);
          float t = clamp(jt, 0.0, 1.0);
          vec2 at = from + vec2(dirX * span * t, H * 4.0 * t * (1.0 - t));
          float f0 = f;   // how firmly it holds the fish shape, before the water hides it
          if (aB.z < 4.5) {
            // its body, turned along its arc and facing the way it's going, the tail flicking
            vec2 v = normalize(vec2(dirX * span, H * 4.0 * (1.0 - 2.0 * t)));
            // floppy: the whole body flexes in a wave running nose to tail, the tail swinging widest, hardest at the top
            // of the leap, and the fish wobbles off its line a little as it goes
            float flop = 1.0 + 0.9 * sin(3.14159 * t);
            float wob = sin(uTime * 9.0) * 0.28 * flop;
            v = vec2(v.x * cos(wob) - v.y * sin(wob), v.x * sin(wob) + v.y * cos(wob));
            vec2 q = aB.xy;
            q.y += sin(uTime * 13.0 - q.x * 6.0) * 0.07 * (0.25 + smoothstep(0.5, -0.8, q.x)) * flop;
            q.y *= dirX;                                  // mirrored when heading left, so its fin stays on top
            float L = 0.14 * uScale * big;
            tgt = at + (v * q.x + vec2(-v.y, v.x) * q.y) * L;   // nose along the way it's moving
            vec3 st0 = vec3(1.0, 0.93, 0.72), st1 = vec3(1.0, 0.6, 0.18), st2 = vec3(0.96, 0.41, 0.09), st3 = vec3(0.94, 0.29, 0.07);
            col = aB.w < 0.5 ? st0 : aB.w < 1.5 ? st1 : aB.w < 2.5 ? st2 : st3;
            alpha = 0.42 * step(jt, 1.0);
            size = 2.2 + 1.8 * aSeed.w;
            // hidden below the surface, so it breaks out and dives back in
            f *= smoothstep(uGround.y - 0.004, uGround.y + 0.006, tgt.y) * step(jt, 1.0);

            // Struck by lightning in mid-air (uX holds the moment), it leaves after-images from there to where it goes
            // back in: a glowing copy left behind at each point it passes, lingering and fading after it.
            // Most of its sparks make the copies; the fish itself glows brighter to make up for them.
            float age = uTime - uX;
            if (uX >= 0.0 && age >= 0.0 && floor(uX / P) == n) {
              float fade = exp(-age * 1.4) * smoothstep(0.0, 0.05, age);
              if (aSeed.x < 0.6) {
                float k = floor(aSeed.y * 8.0);                       // which of eight copies this spark draws
                float bt = clamp((uX - n * P) / D, 0.0, 1.0);
                float tc = bt + (1.0 - bt) * (k + 0.5) / 8.0;         // that copy's moment, between the strike and going back in
                float since = (jt - tc) * D;                          // how long ago the fish passed it (negative: not yet)
                vec2 cAt = from + vec2(dirX * span * tc, H * 4.0 * tc * (1.0 - tc));
                vec2 cv = normalize(vec2(dirX * span, H * 4.0 * (1.0 - 2.0 * tc)));
                vec2 cq = aB.xy;
                cq.y *= dirX;
                tgt = cAt + (cv * cq.x + vec2(-cv.y, cv.x) * cq.y) * L;
                col = mix(col, vec3(1.0, 0.92, 0.75), 0.55) * 1.6;
                alpha = 0.95 * step(0.0, since) * exp(-max(since, 0.0) * 0.9) * smoothstep(0.0, 0.05, age);
                size = 3.2 + 2.6 * aSeed.w;
                f = f0 * smoothstep(uGround.y - 0.004, uGround.y + 0.006, tgt.y);
              } else {
                alpha *= 1.0 + 1.6 * fade;
                col += vec3(1.0, 0.88, 0.65) * 0.9 * fade;
              }
            }
          } else {
            // the splash where it leaves the water and where it goes back in
            float leave = jt / 0.3, enter = (jt - 0.72) / 0.3;
            float u = leave < 1.0 ? leave : enter;
            vec2 spot = leave < 1.0 ? from : from + vec2(dirX * span, 0.0);
            float ok = step(0.0, u) * step(u, 1.0) * step(jt, 1.3);
            vec2 d = vec2(aB.x * 0.06, 0.05 + 0.1 * aB.y) * uScale * big;
            tgt = spot + vec2(d.x * u, d.y * 4.0 * u * (1.0 - u));
            col = mix(vec3(0.55, 0.75, 0.95), vec3(0.9, 0.96, 1.0), aSeed.z);
            alpha = 0.5 * (1.0 - u);
            size = 1.8 + 1.6 * aSeed.w;
            f *= ok;
          }
        }
      } else if (k < 3.5) {
        // A world tree, grown from a seed: it cracks, a sprig climbs out, its dots rearrange into a sapling, then the world tree
        float ty = aC.w;
        vec2 p = aC.xy;
        float sway = sin(uTime * 0.35 + p.y * 2.5 + p.x * 1.5) * 0.003 * max(p.y - ${TREE_G.toFixed(2)}, 0.0);   // so massive a trunk barely moves
        if (ty > 6.5) {
          // trunk and branches, lit from the upper left
          vec2 wp = p + aG.xy + treeWind(p, 0.035 * smoothstep(0.6, 1.9, p.y)) + vec2(sway, 0.0);   // the limbs bend with the crown
          vec3 bark = mix(vec3(0.34, 0.21, 0.11), vec3(0.62, 0.43, 0.25), aG.z) * (0.9 + 0.2 * aSeed.x);
          float sn = snowCover() * smoothstep(0.15, 0.55, aG.z);
          bark = mix(bark, vec3(0.92, 0.95, 1.0), sn);                                     // snow lying thick along the tops of the limbs
          // the crotch, where the limbs leave the trunk and crowd together: thinned and shaded under the leaves
          float yr = uYear, leafy = yr < 0.0 ? 1.0 : 1.0 - smoothstep(14.0, 18.0, yr) * (1.0 - smoothstep(32.5, 37.0, yr));
          vec2 cq = (p + aG.xy - vec2(0.0, 0.6)) / vec2(0.4, 0.24);
          float crotch = (1.0 - smoothstep(0.3, 1.0, length(cq))) * leafy;
          bark *= 1.0 - 0.45 * crotch;
          grown(treeCam(wp), aC.z, bark, mix(0.55 * (1.0 - 0.5 * crotch), 0.85, sn), 2.2 + 2.4 * aSeed.w + 0.8 * sn);
        } else if (ty > 5.5) {
          // leaves: fresh greens, a few catching the light, stirring in the wind more than the wood does
          // lit by structure (clump depth, top over underside, height), so it shades gradually instead of speckling
          float lu = clamp((ty - 6.0) / 0.4 + (aSeed.x - 0.5) * 0.12, 0.0, 1.0);
          // so big a crown doesn't sway as one: each part of it drifts slowly on its own, the leaves barely fluttering
          vec2 stir = vec2(sin(uTime * 0.32 + p.x * 7.0 + p.y * 5.0), cos(uTime * 0.27 + p.y * 6.0 - p.x * 4.0)) * 0.007
                    + vec2(sin(uTime * 0.7 + aSeed.x * 30.0), cos(uTime * 0.6 + aSeed.z * 30.0)) * 0.0015;
          vec3 c = mix(vec3(0.03, 0.13, 0.06), vec3(0.55, 0.86, 0.33), lu * lu * (3.0 - 2.0 * lu));   // deep shadow under each lump, so the billows separate
          c = mix(c, vec3(0.85, 0.95, 0.55), step(0.97, aSeed.w) * 0.4 * lu);
          float give = 0.05 * smoothstep(0.7, 2.0, p.y) + 0.02 * smoothstep(0.6, 1.5, abs(p.x));
          stir *= 1.0 + 1.5 * give / 0.07 * (0.5 + 0.5 * sin(uTime * 0.45 - p.x * 1.3));   // they flutter harder in a gust
          vec2 lp = p + stir + treeWind(p, give);
          float la = 0.25 + 0.65 * lu, ls = 1.0;
          if (uYear >= 0.0) {
            float y = uYear;
            if (y < 28.0) {
              // autumn: each leaf turns its own shade, from vivid yellow through hot orange to a deep dark orange, in its
              // own time, then lets go and flutters down, drifting with the wind, to lie under the tree until the snow covers it
              float hz = aSeed.z;
              vec3 hue = hz < 0.35 ? mix(vec3(1.0, 0.95, 0.1), vec3(1.0, 0.66, 0.0), hz / 0.35)
                                   : mix(vec3(1.0, 0.48, 0.0), vec3(0.8, 0.2, 0.0), (hz - 0.35) / 0.65);
              float tc = 8.0 + aSeed.y * 4.0, turned = smoothstep(tc, tc + 1.5, y);
              c = mix(c, hue * mix(0.8, 1.35, lu), turned);
              la *= 1.0 + 0.6 * turned;                                                  // the turned leaves glow
              float td = 13.0 + aSeed.x * 5.5, u = clamp((y - td) / (2.2 + 1.3 * aSeed.w), 0.0, 1.0);
              if (u > 0.0) {
                float gx = lp.x * 0.85 + (0.06 + 0.14 * aSeed.z);                       // where it comes to rest: a loose drift
                float gy = ${TREE_G.toFixed(2)} - 0.01 + (0.05 + 0.22 * (1.0 - smoothstep(0.0, 1.7, abs(gx)))) * aSeed.y;   // heaped toward the trunk
                vec2 down = vec2(mix(lp.x, gx, u) + sin(y * 2.4 + aSeed.x * 30.0) * 0.07 * u * (1.0 - u * u), mix(lp.y, gy, u * u));
                lp = mix(lp, down, smoothstep(0.0, 0.05, u));
                la = mix(max(la, 0.5), 0.1, smoothstep(0.9, 1.0, u)) * (1.0 - smoothstep(22.5, 25.0, y));
              }
            } else {
              // spring: buds first, a sparse scatter of tiny pale points over the bare crown, more breaking each moment;
              // then they open and swell into full leaf, a fresh light green deepening to summer's
              float r0 = 31.0 + pow(aSeed.x, 0.7) * 4.5;                                 // when this bud breaks
              float open = smoothstep(r0 + 0.6, max(r0 + 2.5, 38.6 - aSeed.y), y);       // and opens into a leaf
              vec3 bud = vec3(0.86, 0.96, 0.52), young = vec3(0.62, 0.92, 0.36) * mix(0.6, 1.1, lu);
              c = mix(mix(bud, young, smoothstep(0.0, 0.5, open)), c, smoothstep(0.5, 1.0, open));
              la = mix(0.8 + 0.2 * lu, la, open) * smoothstep(r0, r0 + 0.5, y);          // a bud: a bright little point
              ls = mix(0.6, 1.0, open);
            }
          }
          grown(treeCam(lp), aC.z, c, la, (2.4 + 3.0 * aSeed.w) * (0.85 + 0.3 * lu) * ls);
        } else if (ty > 4.5) {
          f = 0.0;
        } else if (ty > 3.5) {
          // the seed: rests whole a moment, then cracks: a jagged hairline runs down from its tip, off centre, glowing
          // from inside; a second crack branches off it; and it breaks apart unevenly into three pieces, each drifting
          // and turning its own way, as the sprig climbs out between them
          vec2 heart = vec2(0.0, ${(TREE_G + 0.044).toFixed(3)});
          vec2 q = (p - heart) / vec2(0.03, 0.042);                         // the seed's own frame, about -1 to 1
          float tc = smoothstep(0.5, 2.0, uTreeT);                          // the hairline running down from the tip
          float tb = smoothstep(1.3, 2.4, uTreeT);                          // the branch crack
          float op = smoothstep(2.3, 3.4, uTreeT);                          // breaking apart, making way for the sprig
          // the main crack: piecewise straight runs at broken angles, a little right of centre
          float sv = (1.0 - q.y) * 3.5, si = floor(sv), sf = fract(sv);
          float xc = 0.16 + 0.34 * mix(fract(sin(si * 127.1) * 43758.5), fract(sin((si + 1.0) * 127.1) * 43758.5), sf) - 0.17;
          float dM = q.x - xc;
          float reachM = step((1.0 - q.y) * 0.5, tc * 1.05);
          // the branch: off the main crack, out and down to the right-hand edge, broken the same way
          vec2 b0 = vec2(0.2, 0.18), bv = vec2(0.95, -0.75), bd = normalize(bv);
          float bt = dot(q - b0, bd) / length(bv);
          float bj = floor(bt * 4.0);
          float bn = dot(q - b0, vec2(-bd.y, bd.x)) - 0.12 * (mix(fract(sin(bj * 311.7) * 43758.5), fract(sin((bj + 1.0) * 311.7) * 43758.5), fract(bt * 4.0)) - 0.5);
          float right = step(0.0, dM);
          float reachB = step(bt, tb * 1.1) * step(0.0, bt) * right;
          // which piece: the big left half, the top right, or the small lower right
          float pc = right < 0.5 ? 0.0 : (bn > 0.0 || bt < 0.0) ? 1.0 : 2.0;
          vec2 piv = pc < 0.5 ? vec2(-0.4, 0.0) : pc < 1.5 ? vec2(0.5, 0.45) : vec2(0.6, -0.45);
          vec2 mv = pc < 0.5 ? vec2(-0.32, 0.06) : pc < 1.5 ? vec2(0.3, 0.42) : vec2(0.24, -0.1);
          float ang = (pc < 0.5 ? 0.18 : pc < 1.5 ? -0.45 : -0.15) * op;
          vec2 r = q - piv;
          q = piv + vec2(r.x * cos(ang) - r.y * sin(ang), r.x * sin(ang) + r.y * cos(ang)) + mv * op * (1.0 + 0.3 * op);
          q += (vec2(vhash(aSeed.xy + uTime), vhash(aSeed.yz + uTime)) - 0.5) * 0.03 * tc * (1.0 - op);   // it trembles as it cracks
          p = heart + q * vec2(0.03, 0.042);
          tgt = nearCam((p - heart) * treeZ());
          // the cracks glow: hairlines while they run, wider and brighter as the pieces part
          float cw = 0.06 + 0.12 * op;
          float edge = max(exp(-pow(dM / cw, 2.0)) * reachM, exp(-pow(bn / cw, 2.0)) * reachB);
          vec3 husk = mix(vec3(0.86, 0.6, 0.3), vec3(1.0, 0.8, 0.45), aC.z * aC.z);        // a solid warm body, brightening to gold at its edge
          col = mix(husk, vec3(1.0, 0.95, 0.72), clamp(edge + 0.5 * op * (1.0 - aC.z), 0.0, 1.0));
          alpha = (0.6 + 0.15 * sin(uTime * 2.2 + aSeed.x * 20.0) + 0.35 * edge) ;
          size = 2.0 + 1.8 * aSeed.w + 1.2 * edge;
          alpha *= 1.0 - smoothstep(2.8 + aSeed.x * 0.5, 3.6 + aSeed.x * 0.8, uTreeT);   // the husk fades away as the sprig climbs out
        } else if (ty > 2.5) {
          float cover = snowCover();
          // in winter the snow drifts into piles: banked against the trunk, a few heaps of their own out to either side
          float x = p.x, pile = 0.14 * exp(-x * x / 0.1) + 0.1 * exp(-pow((x + 0.9) / 0.24, 2.0)) + 0.06 * exp(-pow((x + 0.42) / 0.13, 2.0))
                              + 0.085 * exp(-pow((x - 0.75) / 0.28, 2.0)) + 0.055 * exp(-pow((x - 1.3) / 0.18, 2.0)) + 0.015 * (1.0 + sin(x * 11.0 + 1.3));
          tgt = nearCam((p + vec2(0.0, pile * cover * sqrt(aSeed.z)) - TREE_B) * treeZ());
          col = mix(vec3(0.14, 0.09, 0.05), vec3(0.3, 0.32, 0.36), step(0.95, aSeed.w));   // the ground line: dark soil
          col = mix(col, vec3(0.88, 0.93, 1.0), cover);                                      // under snow in winter
          alpha = mix(0.18, 0.5, cover); size = 2.0 + 2.0 * aSeed.w;
        } else if (ty > 1.5) {
          // a bird of the flock, in the fish's bands: it flies in, swooping down to land on the crown, sits a while, and
          // takes off up and away before the leaves fall
          float i = floor(aC.z), wing = step(0.25, fract(aC.z));
          float h1 = fract(sin(i * 12.9898 + 1.0) * 43758.5), h2 = fract(sin(i * 78.233 + 2.0) * 43758.5);
          float y = uYear, a0 = 2.2 + i * 0.35 + h1 * 0.5, land = a0 + 2.0, go = 11.8 + h2 * 0.8 + i * 0.12, gone = go + 1.9;
          vec2 perch = aH.zw, at, vel = vec2(1.0, 0.0);
          float fly = 1.0, dir = h1 < 0.5 ? -1.0 : 1.0, look = 0.0, tilt = 0.0;
          // in early spring, while the branches are still bare, a pair of them pass back through, across and away
          float fb = 29.6 + i * 0.5 + h1 * 0.4, byU = (y - fb) / 2.4, by = i < 1.5 && byU > 0.0 && byU < 1.0 ? 1.0 : 0.0;
          if (by > 0.5) {
            at = vec2(mix(-3.2, 3.4, byU), 1.05 + 0.3 * h2 + 0.1 * sin(byU * 7.0 + i * 2.0) + 0.35 * byU * byU);
            vel = vec2(1.0, 0.1 * cos(byU * 7.0 + i * 2.0) + 0.25 * byU);
            dir = 1.0;
          } else if (y < land) {
            vec2 S = perch + vec2(-3.4 - h2, 0.45 + 0.4 * h1), C = perch + vec2(-1.1, 0.6);
            float u = clamp((y - a0) / (land - a0), 0.0, 1.0), e = 1.0 - (1.0 - u) * (1.0 - u);   // slowing as it comes in
            at = (1.0 - e) * (1.0 - e) * S + 2.0 * (1.0 - e) * e * C + e * e * perch + vec2(0.0, sin(uTime * 3.0 + i) * 0.03 * (1.0 - u));
            vel = 2.0 * (1.0 - e) * (C - S) + 2.0 * e * (perch - C);
            fly = smoothstep(land, land - 0.25, y); dir = mix(1.0, dir, step(land - 0.2, y));
          } else if (y < go) {
            // perched, it looks about: the head turns to a new angle every so often, and the body tilts a little, slowly
            at = perch;
            fly = 0.0;
            float lt = uTime * 0.7 + h1 * 9.0, ln = floor(lt), lf = fract(lt);
            float pa = fract(sin((ln - 1.0) * 91.7 + i * 13.1) * 43758.5), ca = fract(sin(ln * 91.7 + i * 13.1) * 43758.5);
            look = mix(pa, ca, smoothstep(0.0, 0.35, lf)) * 0.7 - 0.3;   // up, level or down a little
            tilt = 0.1 * sin(uTime * 0.8 + h2 * 6.3) + 0.05 * sin(uTime * 1.9 + i * 2.1);
          } else {
            vec2 C = perch + vec2(0.5, 0.5), E = perch + vec2(2.4 + h1, 2.2);
            float u = clamp((y - go) / (gone - go), 0.0, 1.0), e = pow(u, 1.7);                // gathering speed as it leaves
            at = (1.0 - e) * (1.0 - e) * perch + 2.0 * (1.0 - e) * e * C + e * e * E;
            vel = 2.0 * (1.0 - e) * (C - perch) + 2.0 * e * (E - C) + vec2(0.01, 0.0);
            fly = smoothstep(go, go + 0.2, y); dir = mix(dir, 1.0, step(go + 0.1, y));
          }
          // the wings beat in flight, spreading to glide in, and fold along the back once it's down
          float beat = sin(uTime * 19.0 + i * 1.7) * mix(0.35, 1.0, smoothstep(land - 0.2, land - 0.7, y) + step(go, y));
          vec2 q = aC.xy;
          if (wing < 0.5 && q.x > 0.16) { vec2 r = q - vec2(0.16, 0.03); q = vec2(0.16, 0.03) + vec2(r.x * cos(look) - r.y * sin(look), r.x * sin(look) + r.y * cos(look)); }
          if (wing > 0.5) q = mix(vec2(0.12 - 0.5 * q.y, 0.03 + 0.55 * q.x),   // folded: lying along its back
                                  vec2(0.02 + q.x - 0.12 * q.y, 0.04 + q.y * 0.5 * beat), fly);
          vec2 v = normalize(vec2(abs(vel.x) + 0.3, vel.y * 0.5));                         // nose a little up or down, never steep
          v = mix(vec2(0.97, 0.24), v, fly);                                     // perched, it sits up a little
          v = vec2(v.x * cos(tilt) - v.y * sin(tilt), v.x * sin(tilt) + v.y * cos(tilt));   // and rocks gently
          q = vec2(q.x * v.x - q.y * v.y, q.x * v.y + q.y * v.x);
          tgt = treeCam(at + vec2(q.x * dir, q.y) * 0.24);
          vec3 b0 = vec3(1.0, 0.93, 0.72), b1 = vec3(1.0, 0.6, 0.18), b2 = vec3(0.96, 0.41, 0.09), b3 = vec3(0.94, 0.29, 0.07);
          col = aH.x < 0.5 ? b0 : aH.x < 1.5 ? b1 : aH.x < 2.5 ? b2 : b3;
          alpha = 0.7; size = 2.0 + 1.6 * aSeed.w;
          f *= step(0.0, y) * max(step(a0, y) * step(y, gone), by);
        } else if (ty > 0.5) {
          // snow, falling across the whole sky in winter, thickening and thinning
          float on = uYear < 0.0 ? 0.0 : smoothstep(17.5, 19.5, uYear) * (1.0 - smoothstep(25.5, 28.0, uYear));
          float yy = 1.15 - mod(aC.y * 2.4 + uTime * (0.08 + 0.1 * aC.z), 2.4);
          float sw = uAspect * 1.1, sx = mod(aC.x * sw + uBlow * (0.8 + 0.9 * aC.z) + sw, 2.0 * sw) - sw;   // driven by the wind
          tgt = vec2(sx + sin(uTime * (0.4 + aC.z) + aC.y * 20.0) * 0.03, yy - uGust * 0.04 * sin(uTime * 2.3 + aC.y * 30.0));
          col = vec3(0.92, 0.96, 1.0);
          alpha = (0.45 + 0.4 * aC.z) * smoothstep(aSeed.y - 0.05, aSeed.y, on);   // the nearer, faster flakes brighter
          size = 2.2 + 3.0 * aSeed.w * (0.5 + aC.z);
        } else {
          // the roots, in browns, reaching down and out from the trunk
          // lighter, shading smoothly from a warm mid-brown at the crown to light tan at the tips
          // big and bold under the trunk, then fading evenly into the dark as they go deep: a deliberate fade, not a cut-off
          vec2 rp = p + aG.xy;
          float rd = clamp((${TREE_G.toFixed(2)} - p.y) / ${(WT.rootD + 0.25).toFixed(2)}, 0.0, 1.0);
          vec3 c = mix(vec3(0.5, 0.33, 0.18), vec3(0.74, 0.56, 0.36), smoothstep(0.0, 0.6, rd)) * (0.92 + 0.16 * aSeed.x);
          grown(treeCam(rp), aC.z, c, 0.6 * (1.0 - smoothstep(0.3, 0.95, rd)), (2.2 + 2.6 * aSeed.w) * (1.0 - 0.35 * rd));
        }
        if (ty > 2.5 && ty < 4.5) size *= mix(1.0, 2.2, smoothstep(1.5, 9.0, treeZ()));   // the seed and soil larger while we're close in
        if (ty < 0.5 || ty > 5.5) youngTree();
      } else {
        float kd = aE.x;
        if (kd < 1.5) {
          // A meadow coming up across the whole width, and its flowers
          float t = aD.y;
          float lean = aD.w + sin(uTime * 0.9 + aD.x * 7.0) * 0.3;
          vec2 p = vec2(aD.x * uAspect * 1.05 + lean * t * t * aD.z, uGround.y - 0.03 + aD.z * t * mix(0.6, 1.25, uGrow));
          vec3 c = mix(vec3(0.1, 0.42, 0.15), vec3(0.55, 0.85, 0.25), t * aSeed.x);
          if (kd > 0.5) {
            p += vec2(cos(aE.w * 6.2832), sin(aE.w * 6.2832)) * 0.014 * sqrt(aSeed.w);
            c = aE.z < 0.25 ? vec3(1.0, 0.95, 0.85) : mix(vec3(1.0, 0.8, 0.35), vec3(1.0, 0.4, 0.2), aE.z);
          }
          grown(p, aE.y, c, kd > 0.5 ? 0.42 : 0.32, kd > 0.5 ? 2.4 + 2.6 * aSeed.w : 1.8 + 2.0 * aSeed.w);
        } else if (kd < 2.5) {
          // The sun: a halo of sparks with rays, climbing over the horizon
          float a = aSeed.z * 6.2832 + uTime * 0.03;
          float h = fract(aSeed.x + uTime * (0.05 + 0.1 * aSeed.y));
          float ray = pow(0.5 + 0.5 * sin(a * 16.0), 3.0);
          vec2 p = vec2(uGround.x, uGround.y - 0.3 + 0.42 * uSun) + vec2(cos(a), sin(a)) * 0.4 * (1.0 + h * (0.2 + 1.1 * ray)) * uScale;
          tgt = p;
          col = mix(vec3(1.0, 0.92, 0.65), vec3(1.0, 0.55, 0.2), h);
          alpha = (1.0 - h) * 0.3 * uSun;
          size = 2.2 + 3.0 * aSeed.w;
          f *= smoothstep(uGround.y, uGround.y + 0.04, p.y) * step(0.02, uSun);
        } else f = 0.0;
      }
    }`,

  backdropHead: ICE + (GLASS_ON ? GLASS + GLASS_BACK : ICE_BACK) + PLANET + FISH_BOLT,
  uniforms: (THREE) => (GLASS_ON ? (({ glass, relief }) => ({ uGlass: { value: glass }, uRelief: { value: relief }, uFreeze: iceFreeze, uTreeT: treeT, uYear: treeYear, ...focus.uniforms(THREE) }))(shieldGlass(THREE)) : { uIcon: { value: crystalIcon(THREE) }, uFreeze: iceFreeze, uTreeT: treeT, uYear: treeYear }),

  backdrop: /* glsl */`
    // A few planets in each later chapter's sky, in its own light, on the side away from its copy
    {
      vec3 H1_TINT = ${GLASS_ON ? 'vec3(1.0, 0.95, 0.8)' : 'vec3(0.74, 0.9, 1.0)'};
      float h1 = max(0.0, 1.0 - abs(uStage - 1.0) * 2.0), h2 = max(0.0, 1.0 - abs(uStage - 2.0) * 2.0);
      float h3 = max(0.0, 1.0 - abs(uStage - 3.0) * 2.0), h4 = max(0.0, 1.0 - abs(uStage - 4.0) * 2.0);
      if (h1 > 0.0) col += (planet(p, vec2(-0.82, 0.62), 0.022, H1_TINT, 1.0) + planet(p, vec2(-0.94, -0.6), 0.013, H1_TINT, 2.0)) * h1;
      if (h2 > 0.0) col += (planet(p, vec2(0.62, 0.68), 0.026, vec3(0.7, 0.85, 1.0), 3.0) + planet(p, vec2(0.4, -0.8), 0.014, vec3(0.78, 0.9, 1.0), 4.0)
                          + planet(p, vec2(0.95, -0.55), 0.011, vec3(0.7, 0.85, 1.0), 5.0)) * h2;
      if (h3 > 0.0) col += planet(p, vec2(-0.62, 0.72), 0.012, vec3(0.9, 1.0, 0.86), 7.0) * h3;
      if (h4 > 0.0) col += (planet(p, vec2(0.55, 0.62), 0.022, vec3(1.0, 0.9, 0.66), 8.0) + planet(p, vec2(0.25, 0.4), 0.011, vec3(1.0, 0.94, 0.78), 9.0)) * h4;
    }

    ${GLASS_ON ? GLASS_DRAW : ICE_DRAW}
    // lightning inside the storm cloud
    vec2 cq = p - uCenter - vec2(0.0, 0.55) * uScale;
    float fl = max(pow(max(0.0, sin(uTime * 0.9) * sin(uTime * 0.23 + 1.3)), 24.0), fishBolt());
    col += vec3(0.3, 0.38, 0.55) * fl * exp(-dot(cq, cq) * 2.2) * max(0.0, 1.0 - abs(uStage - 2.0) * 2.0);` + (hero.backdrop || ''),

  // the tree grows on arrival (see growTree); the meadow follows the scroll. The hand-over happens while the sparks are scattered
  drive: (s, t) => (focus.t = t, freezeIce(s), growTree(s), { grow: s < 3.5 ? 1 : 0.35 + 0.7 * smooth(3.5, 4, s), sun: smooth(3.5, 4, s), x: strikeFish(s, t), ...addWind(winterWind(t), stormWind(s, t)) }),

  layout(s, { aspect, wide }) {
    if (wide) {
      const big = Math.min(0.66, aspect * 0.4), sc = big * lerp1([hero.sc ?? 0.78, 1, 1, 0.76, 1], s);
      const cy0 = typeof hero.cy === 'function' ? hero.cy(big * (hero.sc ?? 0.78)) : hero.cy ?? 0.08;
      const cy = lerp1([cy0, 0.06, 0.06, -0.26 * big * 0.76, 0.06], s);   // the tree: crown top to fading root tips, on screen
      return focus.layout(s, aspect, {
        cx: aspect * 0.44 * lerp1([hero.cx ?? 1, -1, 1, -1, 1], s),
        cy, sc,
        gy: cy - 0.9 * sc - 0.17 * smooth(3.5, 4, s),   // the meadow sits a little lower, clear of the contact copy
        dim: 1,
      });
    }
    // small screens: each chapter's illustration centred in the gap between the header and its copy
    const b = mobileBands(aspect);
    return focus.layout(s, aspect, { cx: 0, cy: lerp1(b.map((v) => v.cy), s), sc: lerp1(b.map((v) => v.sc), s), dim: 1 });
  },
  redraw: () => focus.key(),   // with reduced motion, the still frame is redrawn when the light is moved
});
