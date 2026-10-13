/* ============================================================
   Cake-ma — interactions
   ============================================================ */

/* ---------- À personnaliser ---------- */
const CONTACT = {
  whatsapp: '33600000000',            // numéro au format international, sans + ni espaces
  email: 'contact@exemple.fr',
};

/* Rotation « photo » : quand les images générées par IA sont prêtes
   (voir README + tools/extract-frames.sh), mettre count > 0.
   Tant que count = 0, c'est le gâteau 3D en CSS qui tourne. */
const TURNTABLE = {
  count: 0,                            // nombre d'images (ex. 72)
  path: 'assets/turntable/frame_',     // frame_001.webp, frame_002.webp…
  ext: '.webp',
  pad: 3,
  mode: 'loop',                        // 'loop' = vrai 360°, 'pingpong' = aller-retour (vidéo IA < 360°)
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   01 — Turntable
   ============================================================ */
const turntable = document.getElementById('turntable');
const cakeEl = document.getElementById('cake');
let angle = 0;
let renderAngle = () => {};

function buildCssCake() {
  const N = 40, R = 95, H = 150;
  const fw = (2 * Math.PI * R) / N + 1.2;
  cakeEl.style.setProperty('--r', R + 'px');
  cakeEl.style.setProperty('--h', H + 'px');
  cakeEl.style.setProperty('--fw', fw + 'px');

  const frag = document.createDocumentFragment();
  for (let i = 0; i < N; i++) {
    const face = document.createElement('div');
    face.className = 'face';
    face.style.setProperty('--fa', (i * 360) / N + 'deg');
    // coulures pseudo-aléatoires mais stables
    const drip = 10 + Math.abs(Math.sin(i * 1.7) * 26 + Math.sin(i * 0.6) * 14);
    face.style.setProperty('--drip', drip.toFixed(1) + 'px');
    frag.appendChild(face);
  }

  const top = document.createElement('div');
  top.className = 'top';
  // fruits / décor posés sur le dessus, en couronne
  const deco = [];
  for (let i = 0; i < 9; i++) {
    const t = (i / 9) * Math.PI * 2;
    deco.push({ x: 50 + Math.cos(t) * 32, y: 50 + Math.sin(t) * 32, s: 15 + (i % 3) * 3, c: i % 3 === 2 ? 'var(--deco-2)' : 'var(--deco)' });
  }
  deco.push({ x: 50, y: 50, s: 22, c: 'var(--deco)' });
  for (const d of deco) {
    const b = document.createElement('span');
    b.className = 'berry';
    b.style.cssText = `--x:calc(${d.x}% - ${d.s / 2}px);--y:calc(${d.y}% - ${d.s / 2}px);--s:${d.s}px;--c:${d.c}`;
    top.appendChild(b);
  }
  frag.appendChild(top);
  cakeEl.appendChild(frag);

  renderAngle = (a) => cakeEl.style.setProperty('--a', a + 'deg');
}

function buildImageTurntable() {
  const canvas = turntable.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const frames = [];
  let loaded = 0;
  let lastFrame = -1;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    lastFrame = -1;
  };

  for (let i = 1; i <= TURNTABLE.count; i++) {
    const img = new Image();
    img.decoding = 'async';
    img.src = TURNTABLE.path + String(i).padStart(TURNTABLE.pad, '0') + TURNTABLE.ext;
    img.onload = () => {
      loaded++;
      if (loaded === 1) { // la première image suffit pour basculer
        canvas.hidden = false;
        turntable.querySelector('.cake3d').hidden = true;
        turntable.querySelectorAll('.cote').forEach((c) => (c.hidden = true));
        resize();
      }
    };
    frames.push(img);
  }
  window.addEventListener('resize', resize);

  renderAngle = (a) => {
    const n = TURNTABLE.count;
    let t = (((a % 360) + 360) % 360) / 360; // 0..1
    if (TURNTABLE.mode === 'pingpong') t = 1 - Math.abs(1 - 2 * t);
    const idx = Math.min(n - 1, Math.floor(t * n));
    const img = frames[idx];
    if (idx === lastFrame || !img.complete || !img.naturalWidth) return;
    lastFrame = idx;
    // object-fit: contain
    const s = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  };
}

buildCssCake();
if (TURNTABLE.count > 0) buildImageTurntable();

/* rotation auto + glisser au doigt avec inertie */
(() => {
  const AUTO = reduceMotion ? 0 : 22; // degrés / seconde
  let dragging = false, lastX = 0, velocity = 0, last = performance.now();
  let visible = true;

  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(turntable);

  turntable.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; velocity = 0;
    turntable.classList.add('is-dragging');
    turntable.setPointerCapture(e.pointerId);
  });
  turntable.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    angle += dx * 0.7;
    velocity = dx * 0.7 * 60; // ≈ deg/s
  });
  const stop = () => { dragging = false; turntable.classList.remove('is-dragging'); };
  turntable.addEventListener('pointerup', stop);
  turntable.addEventListener('pointercancel', stop);

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!dragging) {
      velocity *= Math.pow(0.04, dt);           // amortissement
      angle += (AUTO + velocity) * dt;
    }
    if (visible) renderAngle(angle);
    requestAnimationFrame(tick);
  }
  renderAngle(angle);
  requestAnimationFrame(tick);
})();

/* ---------- Saveurs (pilotent tous les gâteaux de la page) ---------- */
const FLAVOR_TEXT = {
  framboise: { glaze: 'chocolat blanc · framboise', sponge: 'pistache torréfiée', fill: 'framboises entières', cream: 'mascarpone · vanille', crunch: 'praliné noisette' },
  chocolat:  { glaze: 'ganache chocolat noir', sponge: 'cacao intense', fill: 'caramel beurre salé', cream: 'chantilly vanille', crunch: 'feuilletine · gianduja' },
  myrtille:  { glaze: 'chocolat blanc · violette', sponge: 'citron de Menton', fill: 'compotée de myrtilles', cream: 'mascarpone · citron', crunch: 'sablé breton' },
};

document.querySelectorAll('.flavors button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.body.dataset.flavor = btn.dataset.flavor;
    document.querySelectorAll('.flavors button').forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
    document.getElementById('fig-name').textContent = 'Fig. 1 — ' + btn.dataset.label;
    renderCutLabels();
  });
});

/* ============================================================
   02 — La coupe
   ============================================================ */
const LAYERS = [
  { k: 'glaze',  r: 0.9, label: 'Glaçage' },
  { k: 'sponge', r: 3,   label: 'Génoise' },
  { k: 'fill',   r: 1.1, label: 'Insert' },
  { k: 'cream',  r: 1.3, label: 'Crème montée' },
  { k: 'sponge', r: 3 },
  { k: 'crunch', r: 0.9, label: 'Croustillant' },
  { k: 'sponge', r: 3 },
];
const cutCake = document.getElementById('cut-cake');
const cutInside = document.getElementById('cut-inside');
const cutLabels = document.getElementById('cut-labels');
const cutLines = document.getElementById('cut-lines');
const cutHint = document.getElementById('cut-hint');

const totalR = LAYERS.reduce((s, l) => s + l.r, 0);
let acc = 0;
const labelled = [];
for (const l of LAYERS) {
  const d = document.createElement('div');
  d.style.flex = l.r;
  d.style.background = `var(--${l.k})`;
  cutInside.appendChild(d);
  if (l.label) labelled.push({ ...l, center: ((acc + l.r / 2) / totalR) * 100 });
  acc += l.r;
}

function renderCutLabels() {
  const txt = FLAVOR_TEXT[document.body.dataset.flavor];
  const n = labelled.length;
  cutLabels.innerHTML = '';
  cutLines.innerHTML = '';
  labelled.forEach((l, i) => {
    const y = 6 + (i * 88) / (n - 1); // étiquettes réparties régulièrement
    const li = document.createElement('li');
    li.style.top = y + '%';
    li.innerHTML = `<small>${String(i + 1).padStart(2, '0')} · ${l.label}</small>${txt[l.k]}`;
    cutLabels.appendChild(li);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M 42 ${l.center} L 45 ${l.center} L 50 ${y} L 51.5 ${y}`);
    cutLines.appendChild(path);
  });
  updateCut();
}

function updateCut() {
  const r = cutCake.closest('.cut').getBoundingClientRect();
  const range = r.height - window.innerHeight;
  const p = Math.min(1, Math.max(0, -r.top / range));
  const knife = Math.min(1, Math.max(0, (p - 0.08) / 0.3));   // coup de couteau
  cutCake.style.setProperty('--p', knife.toFixed(3));
  cutHint.style.opacity = knife < 1 ? 1 : 0;
  const items = cutLabels.children;
  const paths = cutLines.children;
  for (let i = 0; i < items.length; i++) {
    const on = p > 0.4 + i * 0.09;
    items[i].classList.toggle('is-on', on);
    paths[i].setAttribute('class', on ? 'is-on' : 'is-off');
  }
}
renderCutLabels();
window.addEventListener('scroll', () => requestAnimationFrame(updateCut), { passive: true });
window.addEventListener('resize', updateCut);

/* ============================================================
   03 — Configurateur d'invités
   ============================================================ */
// parts approximatives pour un layer cake haut (~15 cm) par diamètre
const PARTS = { 15: 15, 20: 25, 25: 40, 30: 55, 35: 75 };
const SIZES = Object.keys(PARTS).map(Number);

// toutes les structures réalistes : étages décroissants, écart ≤ 10 cm, 4 étages max
const STRUCTURES = [];
(function combos(start, stack) {
  if (stack.length) STRUCTURES.push({ tiers: [...stack], parts: stack.reduce((s, d) => s + PARTS[d], 0) });
  if (stack.length === 4) return;
  for (let i = start; i < SIZES.length; i++) {
    const prev = stack[stack.length - 1];
    if (prev !== undefined && SIZES[i] - prev > 10) continue;
    combos(i + 1, [...stack, SIZES[i]]);
  }
})(0, []);
STRUCTURES.forEach((s) => s.tiers.sort((a, b) => b - a));
STRUCTURES.sort((a, b) => a.parts - b.parts || a.tiers.length - b.tiers.length);

function structureFor(guests) {
  return STRUCTURES.find((s) => s.parts >= guests) || STRUCTURES[STRUCTURES.length - 1];
}

const range = document.getElementById('guests');
const configCake = document.getElementById('config-cake');
const formGuests = document.getElementById('form-guests');
let currentKey = '';

function updateConfig() {
  const g = Number(range.value);
  const s = structureFor(g);
  document.getElementById('guests-out').textContent = g;
  document.getElementById('cta-guests').textContent = g;
  document.getElementById('spec-tiers').textContent = s.tiers.length;
  document.getElementById('spec-diam').textContent = s.tiers.map((d) => 'Ø' + d).join(' + ');
  document.getElementById('spec-height').textContent = '≈ ' + s.tiers.length * 15 + ' cm';
  document.getElementById('spec-parts').textContent = s.parts;
  formGuests.value = g;

  const key = s.tiers.join('-');
  if (key === currentKey) return;
  currentKey = key;
  // on met à jour les étages existants et on ajoute/retire ceux qui manquent
  const scale = Math.min(7.4, (configCake.clientWidth - 70) / 35);
  const th = s.tiers.length > 3 ? 56 : 66;
  while (configCake.children.length > s.tiers.length) configCake.lastElementChild.remove();
  s.tiers.forEach((d, i) => {
    let t = configCake.children[i];
    if (!t) {
      t = document.createElement('div');
      t.className = 'tier';
      t.appendChild(document.createElement('span'));
      configCake.appendChild(t);
    }
    t.style.setProperty('--w', d * scale + 'px');
    t.style.setProperty('--th', th + 'px');
    t.firstChild.textContent = 'Ø' + d;
  });
}
range.addEventListener('input', updateConfig);
window.addEventListener('resize', () => { currentKey = ''; updateConfig(); });
updateConfig();

/* ============================================================
   Barre du haut : étage courant + CTA collant
   ============================================================ */
const floorNum = document.getElementById('floor-num');
const floorName = document.getElementById('floor-name');
const floorObs = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    floorNum.textContent = e.target.dataset.floor;
    floorName.textContent = e.target.dataset.floorName;
  }
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('[data-floor]').forEach((s) => floorObs.observe(s));

const stickyCta = document.getElementById('sticky-cta');
const hideCtaFor = new Set();
const ctaObs = new IntersectionObserver((entries) => {
  for (const e of entries) e.isIntersecting ? hideCtaFor.add(e.target) : hideCtaFor.delete(e.target);
  stickyCta.classList.toggle('is-hidden', hideCtaFor.size > 0);
});
ctaObs.observe(document.getElementById('devis'));
ctaObs.observe(document.getElementById('config-cta'));

/* ============================================================
   05 — Bon de commande → WhatsApp ou e-mail
   ============================================================ */
const form = document.getElementById('order-form');
const formError = document.getElementById('form-error');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const guests = Number(data.get('guests'));
  const missing = [];
  if (!data.get('date')) missing.push('la date');
  if (!data.get('name')) missing.push('votre nom');
  if (!guests || guests < 15) missing.push('un nombre d\'invités (15 minimum)');
  if (missing.length) {
    formError.textContent = 'Il manque ' + missing.join(', ') + '.';
    formError.hidden = false;
    return;
  }
  formError.hidden = true;

  const date = new Date(data.get('date')).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const s = structureFor(guests);
  const lines = [
    `Bonjour ! Je souhaiterais un devis :`,
    `• Événement : ${data.get('event')}`,
    `• Date : ${date}`,
    `• Invités : ${guests} (structure estimée : ${s.tiers.map((d) => 'Ø' + d).join(' + ')})`,
    data.getAll('flavors').length ? `• Saveurs : ${data.getAll('flavors').join(', ')}` : '',
    data.get('place') ? `• Lieu : ${data.get('place')}` : '',
    data.get('message') ? `• Envies : ${data.get('message')}` : '',
    ``,
    data.get('name'),
  ].filter((l) => l !== '').join('\n');

  const channel = e.submitter?.dataset.channel || 'whatsapp';
  const url = channel === 'email'
    ? `mailto:${CONTACT.email}?subject=${encodeURIComponent('Demande de devis — ' + data.get('event'))}&body=${encodeURIComponent(lines)}`
    : `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(lines)}`;
  window.open(url, channel === 'email' ? '_self' : '_blank', 'noopener');
});
