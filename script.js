(() => {
  /* ---------- helpers ---------- */
  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine   = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- 1. split the name into letters ---------- */
  const nameEl = $('#name');
  const lines = nameEl.dataset.lines.split('|');
  let k = 0;
  nameEl.innerHTML = lines.map(line =>
    `<span class="line" aria-hidden="true">${[...line].map(c =>
      c === ' ' ? '<span class="ch sp"> </span>'
                : `<span class="ch" style="--d:${(0.15 + (k++) * 0.055).toFixed(2)}s">${c}</span>`
    ).join('')}</span>`
  ).join('');
  nameEl.setAttribute('aria-label', lines.join(' '));
  const letters = $$('.ch:not(.sp)', nameEl).map(el => ({ el, w: 300, wd: 100 }));

  /* ---------- 2. marquee rows ---------- */
  const skills = ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Express', 'MongoDB', 'Mongoose', 'Git', 'GitHub', 'VS Code', 'Postman', 'Claude Code', 'REST APIs'];
  $$('.mq-row').forEach((row, i) => {
    const list = i ? [...skills].reverse() : skills;
    const html = list.map(s => `<span>${s}</span><span aria-hidden="true">✺</span>`).join('');
    row.innerHTML = `<div class="mq-track">${html}</div><div class="mq-track" aria-hidden="true">${html}</div>`;
  });

  /* ---------- 3. split the about text into words ---------- */
  const lede = $('#lede');
  lede.innerHTML = lede.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  const words = $$('.w', lede);

  /* ---------- 4. loader ---------- */
  const loader = $('#loader');
  const startSite = () => {
    document.body.classList.remove('loading');
    document.body.classList.add('ready');
  };
  if (reduce) {
    loader.style.display = 'none';
    startSite();
  } else {
    const countEl = $('#count'), barEl = $('#bar');
    const t0 = performance.now();
    const tick = now => {
      const t = clamp((now - t0) / 1900, 0, 1);
      const n = Math.round((1 - Math.pow(1 - t, 3)) * 100);
      countEl.textContent = n;
      barEl.style.transform = `scaleX(${n / 100})`;
      if (t < 1) requestAnimationFrame(tick);
      else setTimeout(() => {
        loader.classList.add('done');
        startSite();
        setTimeout(() => (loader.style.display = 'none'), 1200);
      }, 200);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- 5. pointer + custom cursor ---------- */
  let mx = -9999, my = -9999, lastMove = -99999;
  addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY; lastMove = performance.now();
  }, { passive: true });

  const cursor = $('.cursor');
  if (fine && !reduce) {
    let cx = innerWidth / 2, cy = innerHeight / 2, s = 1, target = 1;
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('a, button, [data-tilt]');
      target = !t ? 1 : t.matches('[data-tilt]') ? 2.6 : 2;
    });
    const loop = () => {
      cx += (mx - cx) * 0.18; cy += (my - cy) * 0.18; s += (target - s) * 0.15;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%) scale(${s})`;
      requestAnimationFrame(loop);
    };
    loop();
  } else {
    cursor.remove();
  }

  /* ---------- 6. hero: dot-grid canvas + breathing letters ---------- */
  const hero = $('.hero'), heroInner = $('.hero-inner');
  const canvas = $('#field'), ctx = canvas.getContext('2d');
  let INK = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
  const GAP = 30;                                // spacing between dots
  let W = 0, H = 0, cols = 0, rows = 0;

  function sizeField() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.clientWidth === W && canvas.clientHeight === H) return;   // nothing changed (e.g. phone address bar)
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / GAP) + 1;
    rows = Math.ceil(H / GAP) + 1;
  }

  // a quiet ripple travels across the grid; near the pointer the dots swell and drift outward
  function drawField(t, px, py) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = INK;
    const reach = 190;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = c * GAP, by = r * GAP;
        const wave = Math.sin(t * 0.0012 + bx * 0.011 + by * 0.007) * 0.5 + 0.5;   // 0..1
        const dx = bx - px, dy = by - py, d = Math.hypot(dx, dy);
        let x = bx, y = by, near = 0;
        if (d < reach) {
          near = 1 - d / reach;
          near = near * near * (3 - 2 * near);
          const k = (near * 24) / (d || 1);
          x += dx * k; y += dy * k;
        }
        ctx.globalAlpha = 0.1 + wave * 0.08 + near * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, 1 + wave * 0.5 + near * 2.6, 0, 6.283);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function breatheLetters(vx, vy, idle) {
    const rects = letters.map(l => l.el.getBoundingClientRect());   // read all first
    const reach = Math.max(220, innerWidth * 0.22);
    letters.forEach((l, i) => {                                      // then write
      const r = rects[i];
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const d = Math.hypot(cx - vx, ((idle ? cy : vy) - cy) * 1.4);
      const f = clamp(1 - d / reach, 0, 1);
      const e = f * f * (3 - 2 * f);
      l.w  += ((300 + e * 500) - l.w)  * 0.15;   // thin -> heavy
      l.wd += ((100 - e * 25)  - l.wd) * 0.15;   // wide -> condensed
      l.el.style.fontVariationSettings = `"wght" ${l.w.toFixed(0)}, "wdth" ${l.wd.toFixed(1)}, "opsz" 96`;
    });
  }

  let heroVisible = true;
  new IntersectionObserver(([e]) => (heroVisible = e.isIntersecting)).observe(hero);

  function heroLoop(t) {
    if (heroVisible) {
      const r = canvas.getBoundingClientRect();
      const idle = !fine || performance.now() - lastMove > 2500;
      // with no mouse, an invisible "breeze" sweeps across the field
      let px = mx - r.left, py = my - r.top;
      if (idle) { px = W * (0.5 + 0.45 * Math.sin(t * 0.00045)); py = H * 0.8; }
      drawField(t, px, py);
      breatheLetters(r.left + px, r.top + py, idle);
    }
    requestAnimationFrame(heroLoop);
  }

  sizeField();
  if (reduce) drawField(0, -9999, -9999);
  else requestAnimationFrame(heroLoop);

  /* ---------- 7. scroll-driven scenes ---------- */
  const marquee = $('#marquee');
  const work = $('#work'), sticky = $('.work-sticky'), track = $('#track'), workBar = $('#workBar');
  const cards = $$('.card');
  const steps = $('#steps'), rail = $('#rail'), stepEls = $$('.step');
  const fill = $('#fill');
  const progressBar = $('#progress'), badge = $('.badge'), portrait = $('.portrait');
  const qaCards = $$('.qa-card'), cases = $$('.case');

  function sizeWork() {
    if (reduce) return;
    const dist = track.scrollWidth - sticky.clientWidth;
    work.style.height = (Math.max(0, dist) + innerHeight) + 'px';
  }
  sizeWork();

  // the question cards only stack while they are sticky (not on short screens)
  let qaSticky = true;
  const checkQa = () => {
    qaSticky = qaCards.length > 0 && getComputedStyle(qaCards[0]).position === 'sticky';
    if (!qaSticky) qaCards.forEach(c => { c.style.setProperty('--s', 1); c.style.setProperty('--dim', 0); });
  };
  checkQa();

  let lastY = scrollY, skew = 0;
  function onFrame() {
    const y = scrollY, vh = innerHeight;

    // page progress bar
    const maxY = document.documentElement.scrollHeight - vh;
    progressBar.style.transform = `scaleX(${maxY > 0 ? clamp(y / maxY, 0, 1) : 0})`;

    if (!reduce) {
      // hero drifts and shrinks away
      if (y < vh * 1.2) {
        heroInner.style.transform = `translate3d(0, ${y * 0.35}px, 0) scale(${1 - (y / vh) * 0.08})`;
        heroInner.style.opacity = clamp(1 - y / (vh * 0.9), 0, 1);
        badge.style.setProperty('--spin', (y * 0.3).toFixed(1) + 'deg');   // badge winds up as you scroll
        portrait.style.setProperty('--drift', (y * -0.12).toFixed(1) + 'px');   // portrait drifts up slower than the text
      }
      // marquee leans with scroll speed
      const vel = y - lastY;
      skew += (clamp(vel * 0.15, -12, 12) - skew) * 0.1;
      marquee.style.setProperty('--skew', skew.toFixed(2) + 'deg');
    }
    lastY = y;

    // about: words light up
    const ar = lede.getBoundingClientRect();
    const ap = clamp((vh * 0.85 - ar.top) / (ar.height + vh * 0.25), 0, 1);
    const lit = Math.floor(ap * words.length * 1.1);
    words.forEach((w, i) => w.classList.toggle('lit', reduce || i < lit));

    // work: vertical scroll becomes horizontal travel
    if (!reduce) {
      const wr = work.getBoundingClientRect();
      if (wr.bottom > 0 && wr.top < vh) {
        const total = work.offsetHeight - vh;
        const p = total > 0 ? clamp(-wr.top / total, 0, 1) : 0;
        const dist = track.scrollWidth - sticky.clientWidth;
        track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px, 0, 0)`;
        workBar.style.transform = `scaleX(${p})`;
        cards.forEach(c => {
          const b = c.getBoundingClientRect();
          const off = (b.left + b.width / 2 - innerWidth / 2) / innerWidth;
          c.style.setProperty('--rz', (off * -7).toFixed(2) + 'deg');
        });
      }
    }

    if (!reduce && qaSticky) {
      // about: each card sinks back as the next one stacks on top of it
      const qaTops = qaCards.map(c => c.getBoundingClientRect().top);       // read all first
      qaCards.forEach((c, i) => {                                            // then write
        if (i === qaCards.length - 1) return;
        const a = qaTops[i], b = qaTops[i + 1];
        const t = vh - a > 1 ? clamp((vh - b) / (vh - a), 0, 1) : 0;
        c.style.setProperty('--s', (1 - t * 0.06).toFixed(4));
        c.style.setProperty('--dim', t.toFixed(3));
      });
    }

    if (!reduce) {
      // case studies: giant project names drift sideways
      const caseRects = cases.map(c => c.getBoundingClientRect());
      cases.forEach((c, i) => {
        const r = caseRects[i];
        if (r.bottom < 0 || r.top > vh) return;
        const p = (vh - r.top) / (vh + r.height);
        c.style.setProperty('--gx', (-p * 45).toFixed(2) + 'vw');
      });
    }

    // process: the rail draws itself, steps switch on as it passes
    const sr = steps.getBoundingClientRect();
    const sp = clamp((vh * 0.6 - sr.top) / sr.height, 0, 1);
    rail.style.transform = `scaleY(${sp})`;
    const lineY = sr.top + sp * sr.height;
    stepEls.forEach(s => s.classList.toggle('on', sp > 0 && s.getBoundingClientRect().top < lineY + 10));

    // contact: headline fills with gold
    if (!reduce) {
      const fr = fill.getBoundingClientRect();
      fill.style.setProperty('--p', clamp((vh * 0.95 - fr.top) / (vh * 0.65), 0, 1).toFixed(3));
    }

    requestAnimationFrame(onFrame);
  }
  requestAnimationFrame(onFrame);

  // phones fire 'resize' whenever the address bar slides in or out; only re-measure the
  // pinned work section when the size really changes, so the page doesn't jump mid-scroll
  let lastW = innerWidth, lastH = innerHeight;
  addEventListener('resize', () => {
    sizeField();
    if (reduce) drawField(0, -9999, -9999);
    checkQa();
    if (innerWidth !== lastW || Math.abs(innerHeight - lastH) > 150) {
      lastW = innerWidth; lastH = innerHeight;
      sizeWork();
    }
  });
  addEventListener('load', sizeWork);

  /* ---------- 8. headline mask reveals ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.3 });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- 9. 3D tilt + magnetic buttons ---------- */
  if (fine && !reduce) {
    $$('[data-tilt]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const b = el.getBoundingClientRect();
        const x = (e.clientX - b.left) / b.width - 0.5;
        const y = (e.clientY - b.top) / b.height - 0.5;
        el.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const b = el.getBoundingClientRect();
        const dx = e.clientX - b.left - b.width / 2;
        const dy = e.clientY - b.top - b.height / 2;
        el.style.transform = `translate(${dx * 0.3}px, ${dy * 0.35}px)`;
      });
      el.addEventListener('pointerleave', () => (el.style.transform = ''));
    });
  }

  /* ---------- 10. typing terminal ---------- */
  const term = $('#term');
  const termLines = [
    '$ npm run dev',
    'Server listening on port 5000',
    'MongoDB connected',
    'POST   /api/tasks     201 Created',
    'GET    /api/books     200 OK',
    'PATCH  /api/tasks/42  200 OK'
  ];
  if (reduce) {
    term.innerHTML = termLines.map(l => `<div>${l}</div>`).join('');
  } else {
    let termVisible = false;
    new IntersectionObserver(([e]) => (termVisible = e.isIntersecting)).observe(term);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    (async function type() {
      while (true) {
        term.textContent = '';
        for (const line of termLines) {
          const row = document.createElement('div');
          term.appendChild(row);
          for (const ch of line) {
            while (!termVisible) await sleep(300);
            row.textContent += ch;
            await sleep(line.startsWith('$') ? 75 : 16);
          }
          await sleep(380);
        }
        await sleep(2400);
      }
    })();
  }

  /* ---------- 11. local time next to the location ---------- */
  const clock = $('#clock');
  const clockFmt = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });
  const tickClock = () => (clock.textContent = clockFmt.format(new Date()) + ' local time');
  tickClock();
  setInterval(tickClock, 30000);

  /* ---------- 12. staggered scroll reveals for the new sections ---------- */
  $$('[data-stagger]').forEach(list => {
    const step = parseFloat(list.dataset.stagger) || 0.08;
    [...list.children].forEach((el, i) => {
      el.style.setProperty('--d', (i * step).toFixed(2) + 's');
      el.style.setProperty('--rot', ((Math.random() - 0.5) * 30).toFixed(1) + 'deg');
    });
  });

  const revealEls = $$('.io, .skill-group, .cert, .edu-card');
  if (reduce) {
    revealEls.forEach(el => el.classList.add('in'));
  } else {
    const io2 = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io2.unobserve(e.target); }
    }), { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(el => io2.observe(el));
  }

  /* ---------- 13. degree progress ring ---------- */
  const edu = $('.edu-card');
  const eduStart = new Date(+edu.dataset.start, 7, 1);   // school year opens in August
  const eduEnd   = new Date(+edu.dataset.end, 5, 1);     // and ends in June
  const eduP = clamp((Date.now() - eduStart) / (eduEnd - eduStart), 0, 1);
  const eduPct = $('#eduPct'), eduTarget = Math.round(eduP * 100);
  edu.style.setProperty('--p', eduP.toFixed(3));
  if (reduce) {
    eduPct.textContent = eduTarget;
  } else {
    const ringIO = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      ringIO.disconnect();
      const t0 = performance.now();
      const count = now => {
        const t = clamp((now - t0) / 2000, 0, 1);
        eduPct.textContent = Math.round((1 - Math.pow(1 - t, 3)) * eduTarget);
        if (t < 1) requestAnimationFrame(count);
      };
      requestAnimationFrame(count);
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    ringIO.observe(edu);
  }

  /* ---------- 15. dark / light switch ---------- */
  const root = document.documentElement, themeBtn = $('#theme');
  const syncTheme = () => {
    const light = root.dataset.theme === 'light';
    themeBtn.setAttribute('aria-pressed', light);
    const label = light ? 'Switch to dark mode' : 'Switch to light mode';
    themeBtn.setAttribute('aria-label', label);
    themeBtn.title = label;
    $('meta[name="theme-color"]').setAttribute('content', light ? '#F3F3F4' : '#26262A');   // phone browser bar
    INK =getComputedStyle(root).getPropertyValue('--ink').trim();   // hero dots follow the text colour
    if (reduce) drawField(0, -9999, -9999);
  };
  const applyTheme = mode => {
    root.dataset.theme = mode;
    try { localStorage.setItem('theme', mode); } catch (e) {}
    syncTheme();
  };
  themeBtn.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    if (document.startViewTransition && !reduce) {
      const b = themeBtn.getBoundingClientRect();                     // the wipe grows out of the button
      root.style.setProperty('--tx', (b.left + b.width / 2) + 'px');
      root.style.setProperty('--ty', (b.top + b.height / 2) + 'px');
      document.startViewTransition(() => applyTheme(next));
    } else {
      applyTheme(next);
    }
  });
  syncTheme();

  /* ---------- 16. phone menu ---------- */
  const menu = $('#menu'), menuBtn = $('#menuBtn'), main = $('main');
  const setMenu = open => {
    if (open) {
      const b = menuBtn.getBoundingClientRect();                       // the circle grows out of the button
      menu.style.setProperty('--ox', (b.left + b.width / 2) + 'px');
      menu.style.setProperty('--oy', (b.top + b.height / 2) + 'px');
    }
    menu.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    root.style.overflow = open ? 'hidden' : '';                         // no scrolling behind the menu
    main.inert = open;
    if (open) setTimeout(() => $('a', menu).focus({ preventScroll: true }), 300);
  };
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
  });
  matchMedia('(min-width: 641px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  /* ---------- 14. spotlight that follows the pointer on skill panels ---------- */
  if (fine && !reduce) {
    $$('.skill-group').forEach(el => el.addEventListener('pointermove', e => {
      const b = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - b.left) + 'px');
      el.style.setProperty('--my', (e.clientY - b.top) + 'px');
    }));
  }
})();
