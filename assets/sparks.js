// Shared particle engine for the Rebirth variations.
// Every spark drifts as ash until the reader's place in the page calls it into a shape.
// A variation supplies the shapes (GLSL), any per-spark data they need, and where they sit.
import * as THREE from 'three';
import { MASK } from './phoenix-mask.js';

export const smooth = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
export const lerp1 = (arr, s) => { const i = Math.min(Math.floor(s), arr.length - 2); return arr[i] + (arr[i + 1] - arr[i]) * (s - i); };
export const lerpAt = (arr, s) => { const i = Math.min(Math.floor(s), arr.length - 2), t = s - i; return arr[i].map((v, n) => v + (arr[i + 1][n] - v) * t); };
// Weighted random index
export const picker = (weights, rnd) => {
  const c = []; let t = 0; for (const v of weights) c.push(t += v);
  return () => { const r = rnd() * t; let lo = 0, hi = c.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (c[m] < r) lo = m + 1; else hi = m; } return lo; };
};

const PAL = {
  uAshC:   [[.42, .39, .37], [.5, .37, .3], [.36, .43, .52], [.42, .47, .38], [.62, .54, .38]],
  uGlintC: [[1, .45, .12], [1, .55, .1], [.6, .85, 1], [.7, 1, .45], [1, .85, .45]],
  uBaseC:  [[.038, .031, .031], [.05, .026, .02], [.02, .03, .044], [.024, .038, .033], [.046, .04, .04]],
  uSmokeC: [[.06, .05, .05], [.1, .05, .035], [.04, .058, .08], [.045, .07, .055], [.09, .075, .06]],
  uGlowC:  [[.62, .17, .04], [.95, .3, .05], [.08, .26, .44], [.2, .42, .16], [.5, .34, .12]],
  uFloorC: [[.3, .07, .02], [.55, .13, .02], [.05, .13, .22], [.12, .22, .08], [.3, .2, .08]],
};
const ACCENT = [[255, 122, 43], [255, 168, 46], [126, 196, 238], [150, 212, 104], [244, 197, 106]];
const DEEP = [[210, 58, 18], [224, 72, 26], [52, 128, 190], [62, 150, 78], [222, 134, 44]];
const FALL = [1, -1.6, 3.2, 0.4, -0.7];   // ash sinks, rides the heat, is beaten down by rain, then lifts at dawn

export async function sparks(cfg) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('gl');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    canvas.style.background = 'radial-gradient(60% 60% at 70% 45%, #5a1c08, #0a0808 70%)';
    return;
  }
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const rnd = Math.random;

  // The phoenix, sampled from a 1-bit mask
  const img = new Image();
  img.src = MASK;
  await img.decode();
  const mc = document.createElement('canvas');
  mc.width = img.width; mc.height = img.height;
  const mx = mc.getContext('2d');
  mx.drawImage(img, 0, 0);
  const md = mx.getImageData(0, 0, mc.width, mc.height).data;
  const lit = [];
  for (let i = 0; i < mc.width * mc.height; i++) if (md[i * 4] > 127) lit.push(i);
  const UNIT = 2.15 / mc.width, BASE = mc.height / 2 * UNIT;

  const N = innerWidth < 700 ? 46000 : 90000, FREE = 5000, count = N + FREE;
  const BIRD = new Float32Array(count * 2), FLOW = new Float32Array(count * 2), SEED = new Float32Array(count * 4);
  const ASH = new Float32Array(count * 3), META = new Float32Array(count * 2);
  for (let k = 0; k < count; k++) {
    const free = k >= N, calm = rnd() < 0.7;
    if (!free) {
      const i = lit[(rnd() * lit.length) | 0];
      const x = ((i % mc.width) + rnd() - mc.width / 2) * UNIT;
      const y = (mc.height / 2 - Math.floor(i / mc.width) - rnd()) * UNIT;
      BIRD.set([x, y], k * 2);
      FLOW.set(calm ? [(rnd() - 0.5) * 0.006, 0.004 + rnd() * 0.012] : [(rnd() - 0.5) * 0.09, 0.05 + rnd() * rnd() * 0.3], k * 2);
      META[k * 2] = Math.max(0, Math.min(0.5, 0.27 * Math.hypot(x, y + BASE) + (rnd() - 0.5) * 0.2));
    }
    META[k * 2 + 1] = free ? 1 : 0;
    SEED.set([rnd(), free ? rnd() : calm ? rnd() * 0.3 : 0.45 + rnd() * 0.55, rnd(), rnd()], k * 4);
    ASH.set([rnd() * 2 - 1, rnd() * 2 - 1, rnd()], k * 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geo.setAttribute('aBird', new THREE.BufferAttribute(BIRD, 2));
  geo.setAttribute('aFlow', new THREE.BufferAttribute(FLOW, 2));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(SEED, 4));
  geo.setAttribute('aAsh', new THREE.BufferAttribute(ASH, 3));
  geo.setAttribute('aMeta', new THREE.BufferAttribute(META, 2));

  // Per-spark data the variation needs for its own shapes
  const env = { aspect: innerWidth / innerHeight, wide: innerWidth > 860, w: innerWidth, h: innerHeight };
  let custom = '';
  const arr = (name, size) => {
    const a = new Float32Array(count * size);
    geo.setAttribute(name, new THREE.BufferAttribute(a, size));
    custom += `attribute ${size === 1 ? 'float' : 'vec' + size} ${name};\n`;
    return a;
  };
  if (cfg.build) cfg.build({ N, rnd, arr, ...env });

  const v3 = () => ({ value: new THREE.Vector3() });
  const uniforms = {
    uTime: { value: 0 }, uT0: { value: 0 }, uFall: { value: 0 }, uStage: { value: 0 }, uIntro: { value: 0 }, uGrow: { value: 0 },
    uAspect: { value: 1 }, uPx: { value: 1 }, uScale: { value: 0.6 }, uDim: { value: 1 }, uSun: { value: 0 }, uX: { value: 0 },
    uCenter: { value: new THREE.Vector2() }, uGround: { value: new THREE.Vector2() }, uRes: { value: new THREE.Vector2(1, 1) },
    uAshC: v3(), uGlintC: v3(), uBaseC: v3(), uSmokeC: v3(), uGlowC: v3(), uFloorC: v3(),
  };
  const KMAX = (cfg.shapes || 4) - 1;

  const points = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec2 aBird, aFlow, aMeta;
      attribute vec4 aSeed;
      attribute vec3 aAsh;
      ${custom}
      uniform float uTime, uT0, uFall, uStage, uIntro, uGrow, uAspect, uPx, uScale, uDim, uSun, uX;
      uniform vec2 uCenter, uGround;
      uniform vec3 uAshC, uGlintC;
      varying vec3 vColor;
      varying float vAlpha, vStreak;

      // What a shape decides for this spark
      vec2 tgt; vec3 col; float alpha, size, streak, f, ang;

      vec3 fire(float t) {
        vec3 c = mix(vec3(1.0, 0.93, 0.72), vec3(1.0, 0.56, 0.12), smoothstep(0.0, 0.25, t));
        c = mix(c, vec3(0.92, 0.2, 0.05), smoothstep(0.2, 0.65, t));
        return mix(c, vec3(0.4, 0.05, 0.1), smoothstep(0.6, 1.0, t));
      }

      // Phoenix: sparks rest on the silhouette and lift off it like flame
      void phoenixCore() {
        float t = fract(aSeed.x + uTime * (0.03 + 0.3 * aSeed.y * aSeed.y));
        vec2 p = aBird + aFlow * (2.0 * t * (1.0 - t) * vec2(0.2, 0.5) + t * t);
        p += vec2(cos(ang), sin(ang)) * (0.002 + 0.03 * t * t);
        tgt = p * uScale + uCenter;
        col = fire(clamp(aMeta.x + t * 0.5, 0.0, 1.0));
        alpha = pow(1.0 - t, 1.3) * smoothstep(0.0, 0.04, t) * 0.52;
        size = 2.2 + 3.2 * aSeed.w * (1.0 - 0.5 * t);
      }
      void phoenix() {
        phoenixCore();
        f *= smoothstep(0.0, 1.0, clamp(uIntro * 1.7 - aSeed.w * 0.7, 0.0, 1.0));
      }

      // A rain streak falling across the whole screen
      void rain() {
        float rt = fract(aSeed.x + uTime * (0.5 + 0.45 * aSeed.y));
        tgt = vec2(aAsh.x * uAspect * 1.2 + 0.3 - rt * 0.3, 1.2 - rt * 2.4);
        col = mix(vec3(0.45, 0.66, 0.9), vec3(0.8, 0.92, 1.0), aSeed.z);
        alpha = 0.16 + 0.3 * aSeed.z;
        size = 15.0 + 24.0 * aSeed.z;
        streak = 1.0;
      }

      // A pool seen at a low angle, with rings running outward
      void pool(vec2 c, float R) {
        float rr = sqrt(aSeed.x) * 1.25;
        float a = aSeed.z * 6.2832;
        float rip = sin(rr * 26.0 - uTime * 3.4);
        tgt = c + vec2(cos(a) * rr, sin(a) * rr * 0.15 + rip * 0.007) * R;
        float crest = smoothstep(0.25, 1.0, rip);
        col = mix(vec3(0.16, 0.4, 0.68), vec3(0.75, 0.93, 1.0), crest);
        alpha = (0.08 + 0.5 * crest) * pow(1.0 - rr / 1.25, 0.6);
        size = 2.0 + 2.4 * aSeed.w;
      }

      // Something growing: revealed in order as uGrow climbs, with a bright growing tip
      void grown(vec2 p, float order, vec3 c, float a, float sz) {
        tgt = p;
        f *= smoothstep(order, order + 0.07, uGrow);
        float tip = (1.0 - smoothstep(0.0, 0.1, uGrow - order)) * step(uGrow, 0.97);
        col = c + vec3(0.8, 0.75, 0.35) * tip;
        alpha = a * (0.75 + 0.25 * sin(uTime * (1.0 + aSeed.y) + aSeed.x * 40.0)) + 0.3 * tip;
        size = sz;
      }

      ${cfg.glsl}

      void main() {
        ang = aSeed.z * 6.2832 + uTime * (0.5 + aSeed.y);

        // Which shape this spark belongs to right now, and how firmly it holds it.
        // Each spark crosses over at a slightly different moment.
        float sd = clamp(uStage + (aSeed.w - 0.5) * 0.3, 0.0, 4.0);
        float k = min(floor(sd + 0.5), ${KMAX}.0);
        f = sd > ${KMAX}.0 ? 1.0 : 1.0 - smoothstep(0.08, 0.5, abs(sd - k));
        f *= 1.0 - aMeta.y;
        tgt = vec2(0.0); col = vec3(0.0); alpha = 0.0; size = 2.0; streak = 0.0;
        shape(k);

        // drifting ash
        vec2 ash = aAsh.xy;
        ash.y = mod(ash.y - uFall * (0.015 + 0.045 * aSeed.y) + 1.15, 2.3) - 1.15;
        ash.x = ash.x * uAspect * 1.05 + sin(uTime * 0.25 + aSeed.z * 6.2832) * 0.06;
        float glint = step(0.93, aSeed.w);
        vec3 ashC = mix(uAshC, uGlintC, glint);
        float ashA = mix(0.16 + 0.3 * aAsh.z, 0.75, glint) * (0.6 + 0.4 * sin(uTime * (1.0 + aSeed.y * 2.0) + aSeed.x * 40.0));

        vec2 pos = mix(ash, tgt, f);
        pos += vec2(cos(ang * 3.0), sin(ang * 2.0)) * 0.2 * sin(3.14159 * f) * (1.0 - streak);

        gl_Position = vec4(pos.x / uAspect, pos.y, 0.0, 1.0);
        vColor = mix(ashC, col, f);
        vAlpha = mix(ashA, alpha * uDim, f);
        vStreak = streak * f;
        gl_PointSize = uPx * mix(1.4 + 2.4 * aAsh.z, size, f);
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vColor;
      varying float vAlpha, vStreak;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float head = mix(1.0, 0.35 + 0.65 * smoothstep(-0.5, 0.5, c.y), vStreak);
        c.x = (c.x + c.y * 0.125 * vStreak) * mix(1.0, 11.0, vStreak);
        float a = 1.0 - smoothstep(0.0, 0.5, length(c));
        gl_FragColor = vec4(vColor, a * a * vAlpha * head);
      }`,
  }));
  points.frustumCulled = false;

  // Backdrop: smoke that takes on each chapter's light, and a sunrise when uSun climbs
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    vertexShader: `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform vec2 uRes, uCenter, uGround;
      uniform float uTime, uT0, uAspect, uSun, uIntro, uStage, uScale, uX;
      uniform vec3 uBaseC, uSmokeC, uGlowC, uFloorC;
      float hash(vec2 p) { vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
      void main() {
        vec2 uv = gl_FragCoord.xy / uRes * 2.0 - 1.0;
        vec2 p = vec2(uv.x * uAspect, uv.y);
        float warp = fbm(p * 1.8 + uTime * 0.02);
        float s = fbm(p * 1.3 + vec2(0.0, -uTime * 0.035) + warp);
        vec3 col = uBaseC + uSmokeC * s * s * 1.6;
        vec2 q = p - uCenter;
        col += uGlowC * exp(-dot(q, q) * 1.5) * 0.36 * uIntro * (0.55 + 0.6 * s);
        col += uFloorC * (1.0 - smoothstep(-1.3, -0.3, p.y)) * 0.4 * s;

        vec2 g = p - uGround;
        float hill = uGround.y + 0.03 * (noise(vec2(p.x * 1.6, 3.0)) - 0.5) + 0.02 * sin(p.x * 0.9 + 1.0);
        float reach = exp(-g.x * g.x * 0.3);
        vec3 sun = vec3(1.0, 0.62, 0.3);
        float sky = smoothstep(hill - 0.01, hill + 0.012, p.y);
        float band = exp(-pow(max(p.y - hill, 0.0) * 2.3, 1.4));
        float rays = pow(noise(vec2(atan(g.y, g.x) * 5.0, uTime * 0.06)), 2.0) * exp(-length(g) * 1.3);
        vec2 e = g * vec2(0.75, 1.25);
        vec3 dawn = sun * (0.3 * band * reach * (0.65 + 0.5 * s) + 0.5 * exp(-dot(e, e) * 2.6) + 0.25 * rays)
                  + vec3(1.0, 0.9, 0.7) * 0.25 * exp(-dot(g, g) * 22.0);
        col += dawn * sky * uSun;
        col *= mix(1.0, 0.5 + 0.5 * sky, uSun * reach);

        ${cfg.backdrop || ''}

        col *= 1.0 - 0.22 * dot(uv, uv);
        col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -1;
  scene.add(backdrop, points);

  let dpr = 1;
  function resize() {
    env.w = innerWidth; env.h = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(env.w, env.h, false);
    env.aspect = env.w / env.h;
    env.wide = env.w > 860;   // the CSS breakpoint where the copy stops sharing the screen
    uniforms.uAspect.value = env.aspect;
    uniforms.uRes.value.set(env.w * dpr, env.h * dpr);
  }
  addEventListener('resize', resize);
  resize();

  const sections = [...document.querySelectorAll('[data-stage]')];
  const rail = [...document.querySelectorAll('.rail a')];
  const root = document.documentElement;

  // Where the reader is in the story: 0 at the hero, 4 at the contact section
  function stageTarget() {
    const vh = innerHeight, probe = scrollY + vh / 2;
    const c = sections.map((el) => el.offsetTop + el.offsetHeight / 2);
    c[0] = vh / 2;
    c[4] = Math.min(c[4], root.scrollHeight - vh / 2);
    if (probe <= c[0]) return 0;
    for (let i = 0; i < 4; i++) if (probe < c[i + 1]) return i + smooth(0.18, 0.82, (probe - c[i]) / (c[i + 1] - c[i]));
    return 4;
  }

  const start = performance.now();
  let stage = stageTarget(), last = start, fall = 0, shown = -1, chapter = -1;

  // Reduced motion: nothing moves. Each chapter is a still image, and chapters cross-fade.
  let still = Math.round(stage), fading = false, drawn = '';
  function stillStage() {
    const want = Math.round(stageTarget());
    if (want !== still && !fading) {
      fading = true;
      canvas.style.opacity = 0;
      setTimeout(() => { still = want; canvas.style.opacity = 1; fading = false; }, 360);
    }
    return still;
  }

  function frame(now) {
    const time = (now - start) / 1000;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (reduced) {
      stage = stillStage();
      const key = stage + '|' + env.w + '|' + env.h;
      if (key === drawn) { requestAnimationFrame(frame); return; }   // nothing changed, so nothing to redraw
      drawn = key;
    } else stage += (stageTarget() - stage) * 0.07;
    const s = Math.min(Math.max(stage, 0), 4);
    if (!reduced) fall += dt * lerp1(FALL, s);

    uniforms.uTime.value = reduced ? 8 : time;
    uniforms.uT0.value = reduced ? 8 : time;   // seconds since load, for opening sequences; skipped past when motion is reduced
    uniforms.uFall.value = fall;
    uniforms.uStage.value = s;
    uniforms.uIntro.value = reduced ? 1 : smooth(0.2, 2.6, time);
    const d = cfg.drive(s);
    uniforms.uGrow.value = d.grow || 0;
    uniforms.uSun.value = d.sun || 0;
    uniforms.uX.value = d.x || 0;
    for (const key in PAL) uniforms[key].value.fromArray(lerpAt(PAL[key], s));

    const L = cfg.layout(s, env);
    uniforms.uCenter.value.set(L.cx, L.cy);
    uniforms.uScale.value = L.sc;
    uniforms.uDim.value = L.dim;
    uniforms.uGround.value.set(L.gx ?? L.cx, L.gy ?? L.cy - 0.9 * L.sc);
    // spark size follows the size the imagery is drawn at
    uniforms.uPx.value = dpr * Math.min(Math.max((L.px ?? L.sc) * env.h / 568, 0.7), 1.4);

    if (Math.abs(s - shown) > 0.004) {
      shown = s;
      root.style.setProperty('--ember', `rgb(${lerpAt(ACCENT, s).map(Math.round)})`);
      root.style.setProperty('--ember-deep', `rgb(${lerpAt(DEEP, s).map(Math.round)})`);
      const ch = Math.round(s);
      if (ch !== chapter) { chapter = ch; rail.forEach((a, i) => a.classList.toggle('on', i === ch)); }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
