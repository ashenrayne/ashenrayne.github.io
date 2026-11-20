// Section-by-section scrolling. One flick of the wheel (or an arrow key, or a nav link) starts a move, and
// from there the page glides to the next frame at our own pace and locks squarely onto it. The wheel is
// ignored until the page has settled, a trackpad's momentum tail included, so one gesture is one section.
// A section taller than the screen gets stops a screen at a time down it (overlapping a little), so nothing in
// it is skipped. On touch screens a swipe does the same; pinch-zoom is left alone. With reduced motion the
// jumps are instant.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;
const sections = [...document.querySelectorAll('main > section')];
const DURATION = 1100;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

let stops = [], moving = false, locked = false, quiet = 0;

// where the page can come to rest: each section's top, a screen at a time down any taller than the screen
// (each step overlapping the last a little, so you keep your place), its foot, and the very bottom
function measure() {
  const vh = innerHeight, max = root.scrollHeight - vh, at = [];
  for (const el of sections) {
    // the foot is where the content ends (plus a little air), not the section's padding: a section whose content
    // fits on screen gets no extra stops, however much padding hangs below it
    const top = el.offsetTop, inner = el.querySelector('.wrap') || el;
    const end = inner.getBoundingClientRect().bottom + scrollY + 12;
    const foot = Math.min(top + el.offsetHeight, end) - vh;
    at.push(top);
    for (let y = top + vh * 0.85; y < foot - vh * 0.15; y += vh * 0.85) at.push(y);
    if (foot > top + 4) at.push(foot);
  }
  at.push(max);
  stops = [...new Set(at.map((v) => Math.round(Math.min(Math.max(v, 0), max))))].sort((a, b) => a - b);
}

const nearest = () => stops.reduce((best, v, i) => (Math.abs(v - scrollY) < Math.abs(stops[best] - scrollY) ? i : best), 0);

// the stop one step on from here in a direction (from mid-move or mid-way, the next one past where we are)
function next(dir) {
  if (dir > 0) { const i = stops.findIndex((v) => v > scrollY + 2); return i < 0 ? stops.length - 1 : i; }
  for (let i = stops.length - 1; i >= 0; i--) if (stops[i] < scrollY - 2) return i;
  return 0;
}

// after a move, keep ignoring the wheel until it has been still for a moment (a trackpad keeps sending
// momentum for a second or so after the fingers lift)
function settle() {
  clearTimeout(quiet);
  quiet = setTimeout(() => { if (!moving) locked = false; }, 220);
}

function go(i) {
  const to = stops[Math.max(0, Math.min(i, stops.length - 1))], from = scrollY;
  if (Math.abs(to - from) < 1) return;
  if (reduced.matches) { scrollTo(0, to); return; }
  moving = locked = true;
  const t0 = performance.now();
  (function frame(now) {
    const t = Math.min((now - t0) / DURATION, 1);
    scrollTo(0, from + (to - from) * ease(t));
    if (t < 1) requestAnimationFrame(frame);
    else { moving = false; settle(); }
  })(t0);
}

const step = (dir) => { measure(); go(next(dir)); };

addEventListener('wheel', (e) => {
  if (e.ctrlKey) return;            // ctrl + wheel is the browser's zoom
  e.preventDefault();
  if (locked) { settle(); return; }          // still moving or settling: this event only extends the wait
  if (Math.abs(e.deltaY) < 4) return;
  step(Math.sign(e.deltaY));
}, { passive: false });

addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
  const dir = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1, ' ': e.shiftKey ? -1 : 1 }[e.key];
  if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); measure(); if (!moving) go(e.key === 'Home' ? 0 : stops.length - 1); return; }
  if (!dir) return;
  e.preventDefault();
  if (!moving) step(dir);
});

// in-page links (the nav, the rail, the arrow) take the same glide to their section
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href^="#"]');
  if (!a) return;
  const el = document.getElementById(a.getAttribute('href').slice(1));
  if (!el) return;
  e.preventDefault();
  measure();
  const top = el.closest('main > section') ? el.closest('main > section').offsetTop : el.offsetTop;
  go(stops.reduce((best, v, i) => (Math.abs(v - top) < Math.abs(stops[best] - top) ? i : best), 0));
});

// a swipe: one finger, mostly vertical, far enough to mean it. Dragging the page is held off so it doesn't
// fight the glide; two fingers (a pinch to zoom) are left to the browser.
let touchY = null, touchX = 0;
addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1) { touchY = null; return; }
  touchY = e.touches[0].clientY; touchX = e.touches[0].clientX;
}, { passive: true });
addEventListener('touchmove', (e) => { if (touchY !== null && e.touches.length === 1) e.preventDefault(); }, { passive: false });
addEventListener('touchend', (e) => {
  if (touchY === null) return;
  const t = e.changedTouches[0], dy = touchY - t.clientY, dx = touchX - t.clientX;
  touchY = null;
  if (Math.abs(dy) < 40 || Math.abs(dy) < Math.abs(dx)) return;
  if (!moving) step(Math.sign(dy));
});

// a real resize moves the frames: settle onto the nearest again. (A phone's address bar showing and hiding
// changes the height a little as you go; that alone isn't worth a jump.)
let resizing = 0, lastW = innerWidth, lastH = innerHeight;
addEventListener('resize', () => {
  clearTimeout(resizing);
  resizing = setTimeout(() => {
    if (moving || (innerWidth === lastW && Math.abs(innerHeight - lastH) < 150)) return;
    lastW = innerWidth; lastH = innerHeight;
    measure(); scrollTo(0, stops[nearest()]);
  }, 150);
});

// the browser's own smooth scrolling would fight the glide, so it's off while this is in charge
root.style.scrollBehavior = 'auto';

// start squarely on a frame (a reload part-way down, or a link with a #section)
addEventListener('load', () => { measure(); scrollTo(0, stops[nearest()]); });
