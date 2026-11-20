// Alternative openings for Bloom. Each replaces only the first chapter;
// uT0 is seconds since the page loaded, so each can stage an entrance.
import { smooth } from './sparks.js';

// Ascend: embers gather into a mound, erupt as a column of fire, and the phoenix
// unfurls out of it with a ring of sparks. After that its wings keep a slow beat.
export const ascend = {
  cy: 0.08, sc: 0.95,
  glsl: /* glsl */`
    void hero() {
      float T = uT0;
      if (aAsh.z < 0.09) {
        // the ring thrown off as the wings open
        float tt = T - 2.3;
        float a = aSeed.x * 6.2832;
        tgt = uCenter + vec2(cos(a), sin(a) * 0.92) * max(tt, 0.0) * (1.2 + 0.5 * aSeed.z) * uScale * 1.5;
        col = mix(vec3(1.0, 0.92, 0.65), vec3(1.0, 0.4, 0.1), clamp(tt * 0.9, 0.0, 1.0));
        alpha = 0.75 * (1.0 - smoothstep(0.2, 1.5, tt));
        size = 2.4 + 3.2 * aSeed.w;
        f *= step(0.0, tt) * (1.0 - smoothstep(1.1, 1.6, tt));
        return;
      }
      phoenixCore();
      vec2 lp = (tgt - uCenter) / uScale;
      float ax = abs(lp.x);
      // wing beat: a wave that runs from shoulder to tip, and the whole bird riding it
      vec2 bird = tgt + vec2(0.0, sin(uTime * 1.5 - ax * 1.6) * 0.085 * pow(ax, 1.5) - sin(uTime * 1.5 + 0.6) * 0.02) * uScale;

      vec2 mound = uCenter + vec2(aAsh.x * 0.36, -1.02 + 0.2 * aSeed.z * aSeed.z * sqrt(1.0 - aAsh.x * aAsh.x)) * uScale;
      float d = aSeed.w * 0.45 + length(lp) * 0.3;
      float e = smoothstep(1.0 + d, 1.85 + d, T);
      float up = 1.0 - pow(1.0 - e, 3.0);
      // rise in a tight column, then spread into the wings
      tgt = vec2(mix(mound.x, uCenter.x + (bird.x - uCenter.x) * smoothstep(0.4, 1.0, e), e) + sin(e * 12.0 + aSeed.z * 6.2832) * 0.1 * e * (1.0 - e) * uScale,
                 mix(mound.y, bird.y, up));
      float glow = 0.5 + 0.5 * sin(uTime * (2.0 + 4.0 * aSeed.y) + aSeed.x * 50.0);
      float mid = e * (1.0 - e) * 4.0;
      float flash = exp(-max(T - 1.85 - d, 0.0) * 2.2) * step(1.85 + d, T);
      col = mix(mix(vec3(0.6, 0.1, 0.03), vec3(1.0, 0.55, 0.15), glow * glow), col, e) + vec3(1.0, 0.85, 0.55) * (0.5 * mid + 0.5 * flash);
      alpha = mix(0.1 + 0.3 * glow, alpha, e) + 0.2 * mid + 0.2 * flash;
      f *= smoothstep(0.0, 0.9, T - aSeed.w * 0.3);
    }`,
  backdrop: /* glsl */`
    col += vec3(0.6, 0.24, 0.06) * exp(-max(uT0 - 2.2, 0.0) * 1.8) * step(2.2, uT0) * exp(-dot(q, q) * 0.7) * max(0.0, 1.0 - uStage * 2.0);`,
};

// Soar: a phoenix built in three dimensions, wings beating, flying a banked circuit
// beside the headline with fire streaming off it. It arrives from far away on load.
export const soar = {
  cy: 0.1, sc: 1,
  glsl: /* glsl */`
    float heat, dens;
    vec3 birdAt(float tm, float T) {
      float au = abs(aAsh.x), side = aAsh.x < 0.0 ? -1.0 : 1.0, v = aSeed.x, part = aAsh.z;
      float w = tm * 3.7;
      vec3 p;
      if (part < 0.56) {
        // wings: two-jointed, the outer half lagging the inner
        // sparks crowd the leading edge and thin toward the trailing one; the outer wing splits into feathers
        float fing = smoothstep(0.45, 0.7, au);
        float chord = mix(0.4, 0.2, au) * mix(1.0, 0.25 + 0.75 * pow(abs(sin(au * 26.0)), 0.6), fing);
        v = v * v;
        float x = au * 1.3;
        float a1 = 0.45 * sin(w) + 0.1, a2 = a1 + 0.5 * sin(w - 1.1);
        float xi = min(x, 0.5), xo = max(x - 0.5, 0.0);
        p = vec3(side * (0.07 + cos(a1) * xi + cos(a2) * xo), sin(a1) * xi + sin(a2) * xo, 0.14 - 0.3 * au * au - v * chord);
        heat = 0.1 + 0.3 * au + 0.45 * v; dens = 0.24;
      } else if (part < 0.7) {
        float zz = aAsh.y, r = sqrt(max(1.0 - zz * zz, 0.0)) * 0.1 * sqrt(v), a = aSeed.z * 6.2832;
        p = vec3(cos(a) * r, sin(a) * r * 0.85 - 0.02, zz * 0.32);
        heat = 0.05 + 0.1 * abs(zz); dens = 0.1;
      } else if (part < 0.76) {
        // neck, head and beak
        p = vec3(aAsh.x * mix(0.05, 0.008, v), 0.02 + 0.05 * sin(v * 2.2) + aAsh.y * mix(0.04, 0.006, v), 0.3 + v * 0.26);
        heat = 0.0; dens = 0.22;
      } else {
        // tail: seven long feathers streaming and rippling behind
        float fi = floor(aSeed.z * 7.0), sp = (fi - 3.0) / 3.0;
        float len = 0.8 + 0.6 * (1.0 - abs(sp));
        p = vec3(sp * 0.34 * v * (0.35 + 0.65 * v) + aAsh.x * 0.02 * (1.0 + 2.5 * v), sin(v * 5.0 - w * 0.8 + fi * 1.3) * 0.08 * v - 0.04 * v, -0.3 - v * len);
        heat = 0.08 + 0.34 * v; dens = 0.5;
      }
      p.y -= 0.04 * sin(w);
      p *= 0.36;

      // a banked right-hand circuit
      float th = tm * 0.5;
      float cr = cos(0.38), sr = sin(0.38);
      p.xy = vec2(p.x * cr + p.y * sr, -p.x * sr + p.y * cr);
      float yaw = atan(0.7 * cos(th), -0.6 * sin(th));
      float cy = cos(yaw), sy = sin(yaw);
      p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
      p += vec3(sin(th) * 0.7, sin(th * 2.0 + 0.6) * 0.12, cos(th) * 0.6);

      // arriving from a long way off, then seen from slightly above
      float far = 1.0 - smoothstep(0.0, 3.2, T);
      p.z -= far * 7.0;
      p.y += far * 0.5;
      p.yz = vec2(p.y * cos(0.65) - p.z * sin(0.65), p.y * sin(0.65) + p.z * cos(0.65));
      return p;
    }

    void hero() {
      // most sparks are the bird as it is now; some are where it was a moment ago, and those are the fire it trails
      float lag = pow(aSeed.w, 4.0) * 1.5;
      vec3 p = birdAt(uTime - lag, uT0 - lag);
      p += vec3(sin(aSeed.z * 40.0), -0.5, cos(aSeed.x * 40.0)) * 0.14 * lag;
      float s = 1.0 / max(1.0 - p.z * 0.3, 0.25);
      tgt = uCenter + p.xy * s * uScale;
      col = fire(clamp(heat + lag * 0.55, 0.0, 1.0));
      alpha = dens * pow(1.0 - lag / 1.5, 1.3) * clamp(s, 0.45, 1.3) * (0.75 + 0.25 * sin(uTime * (1.0 + aSeed.y * 3.0) + aSeed.x * 40.0));
      size = (2.0 + 3.0 * aSeed.z) * clamp(s, 0.6, 1.3);
      f *= smoothstep(0.0, 1.2, uT0 - aSeed.x * 0.4);
    }`,
};

// Flock: a flight of small ember birds sweeps in across the headline and settles into
// the phoenix. Every so often the phoenix breaks back into the flock and re-forms.
export const flock = {
  cy: 0.08, sc: 0.95,
  glsl: /* glsl */`
    float h1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
    void hero() {
      phoenixCore();
      vec2 ph = tgt; vec3 pc = col; float pa = alpha, ps = size;
      float T = uT0, t = uTime;
      float b = floor(aSeed.z * 150.0);
      float r1 = h1(b), r2 = h1(b + 7.3), r3 = h1(b + 19.1);
      float cyc = mod(T, 22.0);
      float conv = smoothstep(2.6 + r1 * 1.8, 4.0 + r1 * 1.8, cyc) * (1.0 - smoothstep(16.0 + r2 * 1.5, 17.1 + r2 * 1.5, cyc));
      float e = conv * conv * (3.0 - 2.0 * conv);

      // the flock wheels as one; each bird keeps its own loose orbit inside it
      vec2 C = vec2(sin(t * 0.45) * 0.9 - 0.55, sin(t * 0.7 + 1.0) * 0.32 + 0.08);
      C.x -= (1.0 - smoothstep(0.0, 2.8, T)) * 3.0;
      vec2 O = vec2(sin(t * (0.5 + 0.6 * r1) + r2 * 6.2832) * (0.25 + 0.6 * r3), cos(t * (0.45 + 0.5 * r2) + r1 * 6.2832) * (0.15 + 0.32 * r1));
      // one small bird: two wings and a beat
      float span = 0.04 + 0.04 * r2;
      float flap = sin(t * (8.0 + 4.0 * r3) + b);
      vec2 loc = vec2(aAsh.x * span, abs(aAsh.x) * span * (0.2 + 0.8 * flap) + aAsh.y * 0.004 - aAsh.x * aAsh.x * span * 0.25);
      vec2 fp = uCenter + ((C + O) * 1.25 + loc * 1.6) * uScale;

      tgt = mix(fp, ph, e) + vec2(cos(ang * 2.0), sin(ang * 3.0)) * 0.07 * sin(3.14159 * e);
      col = mix(mix(vec3(1.0, 0.45, 0.1), vec3(1.0, 0.85, 0.5), r3), pc, e);
      alpha = mix(0.3, pa, e);
      size = mix(1.8 + 1.8 * aSeed.w, ps, e);
      f *= smoothstep(0.0, 0.8, T);
    }`,
};

// Kindle: a cold, frosty starfield, a couple of planets hanging in it. The stars are drawn straight in from
// where they hang, from every side, to form the phoenix, frozen. It catches
// fire from the heart outward, and when the fire reaches the wingtips it bursts in a flash of light, a few
// sparks flying out past the viewer. Faint fire-wisps and heat haze rise off it after that, and a ring of light pulses out
// from its heart, faint at first and stronger each time, lighting the sky as it leaves the wingtips.
const K = { gather: 1.8, ignite: 5.05, spread: 1.1, pulse: 8.25, gap: 3.4, run: 1.9, reach: 1.3, edge: 1.05 };
K.burst = K.ignite + K.spread;   // the blast goes off as the fire reaches the wingtips
const kf = (v) => v.toFixed(3);
const HEAD = 0.46;   // height of the phoenix's head above its centre, in bird units
const headAt = { w: 0, h: 0, y: 0 };
const LIFT = 100;    // px the head sits above the middle of the hero heading

export const kindle = {
  cx: 0, sc: 1.9,
  // the phoenix's head sits a little above the middle of the hero heading
  cy: (sc) => {
    const h1 = document.querySelector('.hero h1');
    if (!h1) return 0.2;
    if (headAt.w !== innerWidth || headAt.h !== innerHeight) {
      let top = 0;
      for (let el = h1; el; el = el.offsetParent) top += el.offsetTop;   // offsets ignore the reveal's slide-in
      Object.assign(headAt, { w: innerWidth, h: innerHeight, y: 1 - 2 * (top + h1.offsetHeight / 2 - LIFT) / innerHeight });
    }
    return headAt.y - HEAD * sc;
  },
  still: K.pulse + K.gap * 5 + 2.6,   // reduced motion: lit, sky warm, between pulses
  chill: (t) => Math.max(0, 1 - 0.6 * smooth(K.ignite, K.burst + 0.3, t) - 0.4 * smooth(K.burst + 0.3, K.pulse + K.gap * 3, t)),
  // the loose stars hang still while it's cold, then drift as ordinary ash once the phoenix is lit
  fall: (t) => smooth(K.ignite, K.burst + 1, t),

  glsl: /* glsl */`
    // a pulse of light running out from the heart: radius (in bird units) and strength, or -1 between pulses
    float pulse(float T, out float amp) {
      float n = floor((T - ${kf(K.pulse)}) / ${kf(K.gap)});
      float pt = T - ${kf(K.pulse)} - n * ${kf(K.gap)};
      amp = min(1.0, 0.22 + 0.26 * n);
      return (T < ${kf(K.pulse)} || pt > ${kf(K.run)}) ? -1.0 : pt / ${kf(K.run)} * ${kf(K.reach)};
    }

    void hero() {
      float T = uT0;
      // hold every spark firmly at the top of the page, so nothing wobbles; scrolling hands back to the usual cross-over
      // (the loose stars, which have no place in the bird, stay loose)
      f = mix(1.0 - aMeta.y, f, smoothstep(0.0, 0.15, uStage));
      phoenixCore();                                   // the living bird, once it is lit
      vec3 fireCol = col; float fireA = alpha, fireS = size;
      vec2 P = aBird * uScale + uCenter;               // its still, cold place in the bird
      vec2 lp = aBird;
      float dist = length(lp - vec2(0.0, 0.05));

      float tw = 0.6 + 0.4 * sin(uTime * (0.7 + 2.0 * aSeed.y) + aSeed.x * 60.0);
      float bright = step(0.975, aSeed.w);
      vec3 frost = mix(mix(vec3(0.1, 0.24, 0.72), vec3(0.62, 0.84, 1.0), aSeed.y), vec3(0.92, 0.97, 1.0), bright * 0.7);
      float starA = mix(0.05 + 0.12 * aAsh.z, 0.85, bright) * tw;
      float starS = mix(1.0 + 1.6 * aAsh.z, 3.4, bright);

      // ...then drawn straight from where it hangs to its place in the bird: the starfield fills the whole
      // screen, so the bird is built from every side at once
      vec2 F = vec2(aAsh.x * uAspect * 1.05, aAsh.y);
      float g0 = ${kf(K.gather)} + aSeed.w * 0.84;
      float e = clamp((T - g0) / 1.6, 0.0, 1.0);
      float ee = e * e * (3.0 - 2.0 * e);
      vec2 cold = mix(F, P + vec2(cos(ang), sin(ang)) * 0.002 * uScale, ee);
      float coldA = mix(starA, 0.16 + 0.22 * tw, ee) + 0.3 * ee * (1.0 - ee);
      float coldS = mix(starS, 1.8 + 2.0 * aSeed.w, ee);

      // Catching fire from the heart outward, reaching the wingtips as the blast goes off
      float reachT = ${kf(K.ignite)} + ${kf(K.spread)} * pow(clamp(dist / 1.15, 0.0, 1.0), 1.0 / 1.3);
      float h = smoothstep(0.0, 1.0, (T - reachT - aSeed.y * 0.15) / 0.45);
      tgt = mix(cold, tgt, h);
      col = mix(frost, fireCol, h);
      alpha = mix(coldA, fireA, h);
      size = mix(coldS, fireS, h);

      // The blast as the fire reaches the wingtips: a flash through the whole bird and a shove outward
      float bt = T - ${kf(K.burst)};
      float burst = step(0.0, bt) * exp(-max(bt, 0.0) * 2.2) * smoothstep(-0.05, 0.08, bt);
      tgt += (tgt - uCenter) * 0.07 * burst;
      col += vec3(1.0, 0.88, 0.65) * burst * 0.8 * (1.0 - 0.5 * smoothstep(0.0, 1.0, dist));
      alpha += burst * 0.35;
      size += burst * 2.5;

      // Sparks thrown out of the blast toward the viewer, swelling and streaking as they pass
      if (aAsh.z < 0.045) {
        float u = (bt - aSeed.x * 0.4) / (1.2 + aSeed.y * 0.9);
        if (u >= 0.0 && u < 1.0) {
          float z = mix(1.0, 0.03, pow(u, 1.6));        // depth: 1 at the bird, near 0 at the viewer
          // each leaves from its own place on the bird, radiating out from the chest, a little above centre
          vec2 chest = uCenter + vec2(0.0, 0.22) * uScale;
          vec2 dir = normalize(lp - vec2(0.0, 0.22) + vec2(aSeed.z - 0.5, aSeed.w - 0.5) * 0.6);
          // they spread less than true perspective would, so more of them cross the screen while they are big
          tgt = chest + (P - chest + dir * 0.12 * uScale * u) * pow(1.0 / z, 0.55);
          // sparks: streaked along their flight, white-hot at the head, stretching as they come close
          col = mix(vec3(1.0, 0.8, 0.48), vec3(1.0, 0.46, 0.12), u * u) * 1.3;   // over-bright (the additive blend lets them burn), warm enough to stay fire-coloured when it saturates
          alpha = mix(1.0, 0.55, u) * smoothstep(0.0, 0.04, u) * (1.0 - smoothstep(0.86, 1.0, u));
          size = min(9.0 / z, 230.0);
          streak = 0.5;   // half a rain streak: a fat, short spark rather than a thread
          sdir = normalize(tgt - chest);
        } else if (u >= 1.0) {
          alpha *= smoothstep(1.0, 2.5, u);   // and a fresh spark takes its place in the bird
        }
      }

      // light running out from the heart, gathering strength as it goes
      float amp, pr = pulse(T, amp);
      if (pr >= 0.0) {
        float ring = exp(-pow((dist - pr) / (0.05 + 0.04 * pr), 2.0)) * amp * (0.35 + 0.65 * smoothstep(0.0, ${kf(K.edge)}, pr));
        col += vec3(1.0, 0.78, 0.45) * ring * 0.75;
        alpha += ring * 0.35;
        size += ring * 2.5;
      }
    }`,

  backdrop: /* glsl */`
    {
      float h0 = max(0.0, 1.0 - uStage * 2.0);
      vec2 lq = q / uScale;
      vec2 hq = lq - vec2(0.0, 0.05);
      float hr = length(hq);

      // Planets: a few larger lights hung in the sky, behind the bird, so they glow on through it
      col += (planet(p, vec2(0.58, 0.5), 0.034, vec3(0.72, 0.86, 1.0), 0.0) + planet(p, vec2(-0.3, -0.42), 0.022, mix(vec3(0.72, 0.86, 1.0), vec3(1.0, 0.86, 0.66), 0.6), 1.0)
            + planet(p, vec2(0.86, -0.22), 0.014, mix(vec3(0.72, 0.86, 1.0), vec3(1.0, 0.86, 0.66), 0.2), 2.0)) * h0;

      // The blast: a flash of light from the heart as the fire reaches the wingtips
      float bt = uT0 - ${kf(K.burst)};
      if (bt > 0.0 && bt < 4.0 && h0 > 0.0) {   // nothing left of it after ~4s, so stop paying for it
        float fade = exp(-bt * 1.25);
        col += vec3(1.0, 0.6, 0.25) * (exp(-hr * hr * 2.5) * 0.5 + exp(-hr * 0.9) * 0.18) * fade * h0;
      }

      // Each pulse carries on past the wingtips as a soft wave of light across the sky
      float n = floor((uT0 - ${kf(K.pulse)}) / ${kf(K.gap)});
      float pt = uT0 - ${kf(K.pulse)} - n * ${kf(K.gap)};
      float amp = min(1.0, 0.22 + 0.26 * n) * step(${kf(K.pulse)}, uT0);
      float pr = pt / ${kf(K.run)} * ${kf(K.reach)};
      float tEdge = ${kf(K.run * K.edge / K.reach)};
      float wave = exp(-pow((hr - pr) / (0.25 + 0.35 * max(pr - 1.0, 0.0)), 2.0)) * smoothstep(0.85, 1.15, pr) * exp(-max(pt - tEdge, 0.0) * 0.9);
      float flare = step(tEdge, pt) * exp(-(pt - tEdge) * 1.6) * exp(-dot(lq, lq) * 0.35);
      col += vec3(1.0, 0.42, 0.12) * (0.13 * wave + 0.06 * flare) * amp * h0;
      // and the sky behind the bird warms as it burns
      float heat = smoothstep(${kf(K.burst)}, ${kf(K.pulse + K.gap * 4)}, uT0);
      col += uGlowC * exp(-dot(lq, lq) * 0.6) * 0.2 * heat * h0;

      // Faint fire-wisps and heat haze rising off the bird after the blast
      float lit = smoothstep(${kf(K.burst + 0.4)}, ${kf(K.burst + 2.5)}, uT0) * h0;   // only once the blast has passed
      // (only near the bird, and cheaply: this runs on every pixel for as long as the phoenix is on screen)
      if (lit > 0.0 && abs(lq.x) < 1.25 && lq.y > -0.95 && lq.y < 1.3) {
        float rise = 0.0;
        float sway = noise(vec2(lq.y * 3.5 - uTime * 0.5, 1.7)) - 0.5;
        for (int i = 1; i <= 4; i++) {
          float fi = float(i);
          vec2 uv = (lq - vec2(sway * 0.07 * fi, fi * 0.07)) / uMaskSize + 0.5;
          float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
          rise += texture2D(uMask, uv, 1.5).r * inside * (1.0 - fi / 5.0);   // read from a softer mip, so the outline doesn't show
        }
        if (rise > 0.0) {
          vec2 wq = vec2(lq.x * 5.0, lq.y * 1.5 - uTime * 0.6);
          float wisp = smoothstep(0.5, 0.8, 0.65 * noise(wq) + 0.35 * noise(wq * 2.1 + 5.3));
          float haze = 0.5 + 0.5 * sin(lq.y * 38.0 - uTime * 3.0 + sway * 12.0);
          col += vec3(0.85, 0.32, 0.08) * rise * (0.045 * wisp + 0.015 * haze) * lit;
        }
      }
    }`,
};
