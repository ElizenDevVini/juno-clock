const START = 1800;      // seconds to midnight before any evidence
const PER_POINT = 30;    // seconds each weight point advances the clock
const MIDNIGHT = 60;     // points

const $ = (s) => document.querySelector(s);

function pad(n) { return String(n).padStart(2, '0'); }
function clockString(secsLeft) {
  const t = 43200 - secsLeft; // seconds since 12:00 on a 12h dial, midnight = 43200
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return pad(h + 12) + ':' + pad(m) + ':' + pad(s);
}
function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function polar(cx, cy, r, deg) {
  const a = (deg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function buildDial() {
  const ticks = $('#ticks'), nums = $('#numerals');
  let t = '', n = '';
  for (let i = 0; i < 60; i++) {
    const big = i % 5 === 0;
    const [x1, y1] = polar(200, 200, big ? 168 : 176, i * 6);
    const [x2, y2] = polar(200, 200, 184, i * 6);
    t += `<line class="tick${big ? ' big' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }
  for (let i = 1; i <= 12; i++) {
    const [x, y] = polar(200, 200, 142, i * 30);
    n += `<text x="${x}" y="${y}">${i}</text>`;
  }
  ticks.innerHTML = t; nums.innerHTML = n;
}

function setHands(secsLeft) {
  const t = 43200 - secsLeft;
  const mDeg = ((t % 3600) / 3600) * 360;
  const sDeg = (t % 60) * 6;
  $('#hand-m').style.transform = `rotate(${mDeg}deg)`;
  $('#hand-s').style.transform = `rotate(${sDeg}deg)`;
  // arc from the minute hand to midnight, drawn on the rim
  const from = mDeg, to = 360;
  const [x1, y1] = polar(200, 200, 192, from), [x2, y2] = polar(200, 200, 192, to - 0.01);
  const large = to - from > 180 ? 1 : 0;
  $('#doom-arc').setAttribute('d', `M${x1} ${y1} A192 192 0 ${large} 1 ${x2} ${y2}`);
}

function dither(secsLeft) {
  const c = $('#dither'), ctx = c.getContext('2d');
  const W = c.width = Math.ceil(c.clientWidth / 4), H = c.height = Math.ceil(c.clientHeight / 4);
  const img = ctx.createImageData(W, H);
  const density = 0.03 + 0.18 * (1 - secsLeft / START); // more noise as midnight nears
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const fall = Math.pow(1 - y / H, 1.6);            // noise thins toward the bottom
    const v = Math.random() * fall * density * 16;
    const on = v > bayer[(y % 4) * 4 + (x % 4)] * 0.25;
    const i = (y * W + x) * 4;
    img.data[i] = 21; img.data[i + 1] = 18; img.data[i + 2] = 31; img.data[i + 3] = on ? 60 : 0;
  }
  ctx.putImageData(img, 0, 0);
}

function renderLedger(events, secsLeft) {
  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));
  // replay chronologically to know the clock reading after each entry
  const chrono = [...events].sort((a, b) => a.date.localeCompare(b.date));
  let left = START; const after = new Map();
  for (const e of chrono) { left = Math.max(1, left - e.w * PER_POINT); after.set(e, left); }
  $('#ledger').innerHTML = sorted.map((e) => `
    <li>
      <div class="date">${fmtDate(e.date)}</div>
      <div>
        <h3 class="title">${e.title}</h3>
        <p class="body">${e.body}</p>
        <p class="src">Source: ${e.source}</p>
      </div>
      <div class="effect"><b>+${e.w}</b><span class="adv">+${e.w * PER_POINT}s</span><br>to ${clockString(after.get(e))}</div>
    </li>`).join('');
  const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.ledger li').forEach((li) => io.observe(li));
}

function calc(secsLeft) {
  const hold = +$('#c-hold').value || 0, supply = +$('#c-supply').value || 1, pot = +$('#c-pot').value || 0, w = +$('#c-w').value;
  const share = Math.min(1, hold / supply);
  const slice = Math.min(1, (w * PER_POINT) / secsLeft);
  const late = Math.min(1, (w * PER_POINT) / 60);
  const usd = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 4 }) + ' ETH';
  $('#o-slice').textContent = (slice * 100).toFixed(1) + '%';
  $('#o-mine').textContent = usd(pot * slice * share);
  $('#o-late').textContent = usd(pot * late * share);
  $('#o-mid').textContent = usd(pot * share);
}

async function main() {
  const events = await fetch('events.json').then((r) => r.json());
  const score = events.reduce((a, e) => a + e.w, 0);
  const secsLeft = Math.max(1, START - score * PER_POINT);
  const latest = [...events].sort((a, b) => b.date.localeCompare(a.date))[0];
  const nav = $('.nav');
  addEventListener('scroll', () => nav.classList.toggle('stuck', scrollY > 24), { passive: true });

  for (const el of document.querySelectorAll('[data-reading]')) el.textContent = clockString(secsLeft);
  for (const el of document.querySelectorAll('[data-score]')) el.textContent = score + ' / ' + MIDNIGHT;

  if ($('#clock')) {
    buildDial();
    setHands(secsLeft);
    $('#readout').textContent = clockString(secsLeft);
    $('#secs').textContent = secsLeft;
    $('#count').textContent = events.length;
    $('#score').textContent = score + ' / ' + MIDNIGHT;
    $('#last').textContent = fmtDate(latest.date);
    document.title = clockString(secsLeft) + ' · Juno Clock';

    dither(secsLeft);
    let last = 0;
    const loop = (ts) => { if (ts - last > 260) { dither(secsLeft); last = ts; } requestAnimationFrame(loop); };
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(loop);
    addEventListener('resize', () => dither(secsLeft));

    // second hand twitches once a second but never gains: the clock only moves on evidence
    setInterval(() => {
      const h = $('#hand-s'); const base = ((43200 - secsLeft) % 60) * 6;
      h.style.transform = `rotate(${base + 2}deg)`;
      setTimeout(() => { h.style.transform = `rotate(${base}deg)`; }, 120);
    }, 1000);

    const hero = $('#creature');
    addEventListener('scroll', () => {
      hero.style.marginBottom = Math.floor(Math.min(scrollY, 600) * 0.18 / 4) * 4 + 'px';
    }, { passive: true });
  }

  if ($('#ledger')) {
    renderLedger(events, secsLeft);
    const crawler = $('#crawler'), wrap = $('.ledger-wrap');
    let lastY = 0;
    const onScroll = () => {
      const r = wrap.getBoundingClientRect();
      const prog = Math.min(1, Math.max(0, (innerHeight * 0.55 - r.top) / r.height));
      crawler.style.setProperty('--y', Math.floor(prog * (r.height - 120) / 24) * 24 + 'px');
      crawler.style.setProperty('--dir', scrollY >= lastY ? 1 : -1);
      lastY = scrollY;
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if ($('#calc')) {
    calc(secsLeft);
    $('#calc').addEventListener('input', () => calc(secsLeft));
  }
}
main();
