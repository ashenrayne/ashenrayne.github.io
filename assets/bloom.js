// Bloom: the story swings from side to side.
// Crest → fire whirl → storm cloud → seedling → a meadow in flower under the rising sun.
import { sparks, smooth, lerp1, picker } from './sparks.js';

function leaf(rnd, bx, by, a, L, W) {
  const l = rnd(), w = Math.pow(Math.sin(Math.PI * l), 0.7) * W * (rnd() * 2 - 1);
  return [bx + Math.sin(a) * l * L + Math.cos(a) * w, by + Math.cos(a) * l * L - Math.sin(a) * w - l * l * 0.08, l];
}

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

// hero: { glsl defining void hero(), backdrop glsl, cy / sc for the opening chapter on wide screens }
export const bloom = (hero = {}) => sparks({
  shapes: 5,

  build({ N, rnd, arr }) {
    const A = arr('aA', 4), B = arr('aB', 4), C = arr('aC', 4), D = arr('aD', 4), E = arr('aE', 4);
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

      // Storm cloud: 0 cloud, 1 its rain, 2 the pool beneath, 3 left as ash
      const r = rnd();
      if (r < 0.6) {
        const b = blobs[pickBlob()], a = rnd() * 6.2832, d = b[2] * Math.sqrt(rnd());
        let y = b[1] + Math.sin(a) * d * 0.8;
        if (y < 0.36) y = 0.36 + (0.36 - y) * 0.2;
        B.set([b[0] + Math.cos(a) * d, y, 0, rnd()], k * 4);
      } else B.set([0, 0, r < 0.68 ? 1 : r < 0.88 ? 2 : 3, rnd()], k * 4);

      // Seedling: stem, two leaves, a little turned earth
      const q = rnd();
      if (q < 0.06) C.set([(rnd() + rnd() + rnd() - 1.5) * 0.3, -0.9 - rnd() * 0.03, 0, 3], k * 4);
      else if (q < 0.14) { const t = rnd(); C.set([0.06 * Math.sin(t * 2.2) + (rnd() - 0.5) * 0.02, -0.9 + 0.75 * t, t * 0.6, 0], k * 4); }
      else if (q < 0.42) { const [x, y, l] = leaf(rnd, 0.048, -0.15, rnd() < 0.5 ? -0.95 : 0.85, 0.44, 0.12); C.set([x, y, 0.6 + l * 0.35, 1], k * 4); }
      else C.set([0, 0, 0, 2], k * 4);

      // Meadow: 0 grass, 1 flower head, 2 the sun's halo, 3 left as ash
      const p = rnd();
      if (p < 0.5) { const b = blades[(rnd() * blades.length) | 0], t = Math.pow(rnd(), 0.8); D.set([b.x, t, b.h, b.lean], k * 4); E.set([0, t * 0.5 + rnd() * 0.25, 0, rnd()], k * 4); }
      else if (p < 0.6) { const b = flowers[(rnd() * flowers.length) | 0]; D.set([b.x, 1, b.h, b.lean], k * 4); E.set([1, 0.72 + rnd() * 0.2, b.hue, rnd()], k * 4); }
      else E.set([p < 0.9 ? 2 : 3, 0, 0, rnd()], k * 4);
    }
  },

  glsl: (hero.glsl || CREST) + /* glsl */`
    float flash() { return pow(max(0.0, sin(uTime * 0.9) * sin(uTime * 0.23 + 1.3)), 24.0); }

    void shape(float k) {
      if (k < 0.5) {
        hero();
      } else if (k < 1.5) {
        // A whirl of fire: three arms winding up around a bright core
        float h = fract(aSeed.x + uTime * (0.12 + 0.25 * aSeed.y));
        vec2 p;
        if (aAsh.z < 0.62) {
          float a = h * 9.0 + floor(aSeed.z * 3.0) * 2.0944 - uTime * 2.2 + (fract(aSeed.z * 3.0) - 0.5) * 0.9;
          float r = (0.1 + 0.55 * pow(h, 1.4)) * (0.9 + 0.2 * aAsh.x);
          float z = sin(a);
          p = vec2(cos(a) * r, -0.9 + h * 1.8 + z * r * 0.18);
          col = fire(clamp(h * 0.95 + 0.15 - 0.2 * z, 0.0, 1.0));
          alpha = pow(1.0 - h, 0.9) * smoothstep(0.0, 0.06, h) * (0.2 + 0.22 * (0.5 + 0.5 * z));
          size = (2.4 + 3.6 * aSeed.w) * (0.8 + 0.3 * z);
        } else {
          p = vec2(aAsh.x * abs(aAsh.x) * 0.16 * (1.0 - h) + sin(h * 8.0 - uTime * 3.0 + aSeed.z * 6.2832) * 0.04, -0.9 + h * (0.9 + 0.7 * aSeed.z));
          col = fire(clamp(h * 1.1, 0.0, 1.0));
          alpha = pow(1.0 - h, 1.2) * smoothstep(0.0, 0.05, h) * 0.3;
          size = 2.5 + 4.0 * aSeed.w * (1.0 - 0.6 * h);
        }
        tgt = p * uScale + uCenter;
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
          float rt = fract(aSeed.x + uTime * (0.55 + 0.5 * aSeed.y));
          tgt = vec2(aAsh.x * 0.72 + 0.08 - rt * 0.16, 0.38 - rt * 1.28) * uScale + uCenter;
          col = mix(vec3(0.45, 0.66, 0.9), vec3(0.8, 0.92, 1.0), aSeed.z);
          alpha = (0.2 + 0.3 * aSeed.z) * smoothstep(0.0, 0.08, rt);
          size = 11.0 + 16.0 * aSeed.z;
          streak = 1.0;
        } else if (aB.z < 2.5) {
          pool(uGround, uScale * 0.85);
        } else f = 0.0;
      } else if (k < 3.5) {
        // A seedling pushing up out of the wet ground
        if (aC.w > 2.5) {
          tgt = aC.xy * uScale + uCenter;
          col = mix(vec3(0.3, 0.2, 0.12), vec3(0.6, 0.75, 0.9), step(0.9, aSeed.w));
          alpha = 0.22; size = 2.0 + 2.0 * aSeed.w;
        } else if (aC.w < 1.5) {
          vec2 p = aC.xy;
          p.x += sin(uTime * 0.8 + p.y * 3.0) * 0.02 * (p.y + 0.9);
          vec3 c = aC.w < 0.5 ? mix(vec3(0.3, 0.55, 0.2), vec3(0.6, 0.8, 0.3), aSeed.x)
                              : mix(vec3(0.12, 0.55, 0.22), vec3(0.6, 0.9, 0.3), aSeed.x * aSeed.x);
          grown(p * uScale + uCenter, aC.z, c, aC.w < 0.5 ? 0.14 : 0.3, 2.2 + 3.0 * aSeed.w);
        } else f = 0.0;
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

  backdrop: /* glsl */`
    // lightning inside the storm cloud
    vec2 cq = p - uCenter - vec2(0.0, 0.55) * uScale;
    float fl = pow(max(0.0, sin(uTime * 0.9) * sin(uTime * 0.23 + 1.3)), 24.0);
    col += vec3(0.3, 0.38, 0.55) * fl * exp(-dot(cq, cq) * 2.2) * max(0.0, 1.0 - abs(uStage - 2.0) * 2.0);` + (hero.backdrop || ''),

  // the seedling and the meadow each grow in their own chapter; the hand-over happens while the sparks are scattered
  drive: (s) => ({ grow: s < 3.5 ? smooth(2.55, 3.05, s) : 0.35 + 0.7 * smooth(3.5, 4, s), sun: smooth(3.5, 4, s) }),

  layout(s, { aspect, wide }) {
    if (wide) {
      const big = Math.min(0.66, aspect * 0.4), cy = lerp1([hero.cy ?? 0.08, 0.06, 0.06, 0.1, 0.06], s), sc = big * lerp1([hero.sc ?? 0.78, 1, 1, 0.9, 1], s);
      return {
        cx: aspect * 0.44 * lerp1([1, -1, 1, -1, 1], s),
        cy, sc,
        gy: cy - 0.9 * sc - 0.17 * smooth(3.5, 4, s),   // the meadow sits a little lower, clear of the contact copy
        dim: 1,
      };
    }
    return {
      cx: 0,
      cy: lerp1([0.66, -0.08, 0.1, -0.1, 0.46], s),
      sc: Math.min(0.5, aspect * lerp1([0.52, 0.8, 0.8, 0.8, 0.84], s)),
      dim: lerp1([1, 0.3, 0.45, 0.5, 1], s),
    };
  },
});
