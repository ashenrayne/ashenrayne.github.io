// Three alternative openings for Bloom. Each replaces only the first chapter;
// uT0 is seconds since the page loaded, so each can stage an entrance.

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
