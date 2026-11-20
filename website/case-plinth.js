/* Plinth case study: phone screens scroll slowly, and the calculator prototype plays its flow on a loop. */
// Phone screens: slowly scroll each long screen up and down.
document.querySelectorAll('.feed.auto').forEach(f => {
  const d = f.parentElement.clientHeight - f.scrollHeight;
  if (d < -20) { f.style.setProperty('--d', d + 'px'); f.style.setProperty('--t', Math.max(8, -d / 45) + 's'); f.classList.add('go'); }
});

// Animated calculator prototype: plays the new flow on a loop while it is on screen.
// Touches look like a real finger: they appear on the target, press and lift, and swipes drag the content.
(() => {
  const stage = document.querySelector('.proto-stage');
  if (!stage) return;
  const scr = stage.querySelector('.screen'), tap = scr.querySelector('.tap'), views = scr.querySelector('.views');
  const form = scr.querySelector('[data-v=form]'), res = scr.querySelector('[data-v=res]');
  const rail = [...stage.querySelectorAll('.proto-steps li')];
  const steps = Object.fromEntries([...scr.querySelectorAll('.step')].map(e => [e.dataset.step, e]));
  const btn = scr.querySelector('[data-cta=form]'), out = scr.querySelector('output');
  const fill = scr.querySelector('.range-t i'), knob = scr.querySelector('.range-t b');
  const tabs = [...scr.querySelectorAll('.tabs span')], bar = scr.querySelector('.tabs i');
  const prices = [[2000, 8150, 5450], [2500, 9350, 7650], [3400, 10600, 12400]];
  const usd = n => '$' + n.toLocaleString('en-US');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = false, run = 0;
  const SPEED = 1.3; // the whole sequence plays 1.3x faster
  const wait = ms => new Promise((ok, no) => { const id = run; setTimeout(() => id === run ? ok() : no(), ms / SPEED); });
  const think = () => wait(450 + Math.random() * 350);

  // Finger: positioned instantly while hidden, so it never flies across the screen.
  const pos = el => { const a = el.getBoundingClientRect(), b = scr.getBoundingClientRect(); return [a.left - b.left + a.width / 2, a.top - b.top + a.height / 2]; };
  const finger = (x, y, o, s = 1, t = '.18s') => { tap.style.transition = `opacity ${t}, transform ${t}`; tap.style.opacity = o; tap.style.transform = `translate(${x}px, ${y}px) scale(${s})`; };
  const place = (x, y, s) => { tap.style.transition = 'none'; tap.style.opacity = 0; tap.style.transform = `translate(${x}px, ${y}px) scale(${s})`; void tap.offsetWidth; };
  async function press(el, then) {
    await think();
    const [x, y] = pos(el);
    place(x, y, 1.35); finger(x, y, 1, 1); await wait(170);
    finger(x, y, 1, .82, '.12s'); then && then(); await wait(140);
    finger(x, y, 0, 1.15, '.25s'); await wait(220);
  }
  async function drag(from, steps, each) {
    await think();
    let [x, y] = pos(from);
    place(x, y, 1.35); finger(x, y, 1, 1); await wait(200);
    for (let i = 0; i < steps; i++) { each(i); [x, y] = pos(from); finger(x, y, 1, 1, '0s'); await wait(34); }
    await wait(120); finger(x, y, 0, 1.15, '.25s'); await wait(220);
  }
  // Swipe: the finger drags up while the content follows, like a real scroll.
  const offs = new Map();
  async function swipe(view, el) {
    await think();
    const max = Math.max(0, view.scrollHeight - scr.clientHeight);
    const from = offs.get(view) || 0, to = Math.min(max, Math.max(0, el.offsetTop - 96));
    if (Math.abs(to - from) < 8) return;
    const d = to - from, x = scr.clientWidth * .62, y0 = scr.clientHeight * .66;
    place(x, y0, 1.2); finger(x, y0, 1, 1, '.15s'); await wait(150);
    view.style.transition = 'transform .75s cubic-bezier(.25, .8, .3, 1)';
    view.style.transform = `translateY(${-to}px)`; offs.set(view, to);
    finger(x, y0 - Math.max(-140, Math.min(140, d)), 0, 1, '.6s'); await wait(800);
  }
  const railAt = i => {
    rail.forEach((li, k) => { li.classList.toggle('on', k === i); li.classList.toggle('done', k < i); });
    scr.querySelectorAll('.u-prog i').forEach((e, k) => e.classList.toggle('on', k <= Math.min(i, 2)));
    const n = scr.querySelector('.u-n'); if (n) n.textContent = Math.min(i + 1, 3);
  };
  const option = i => {
    tabs.forEach((t, k) => t.classList.toggle('sel', k === i));
    bar.style.left = tabs[i].offsetLeft + 'px'; bar.style.width = tabs[i].offsetWidth + 'px';
    prices[i].forEach((v, k) => scr.querySelector(`[data-r="${k}"]`).textContent = usd(v));
    const total = prices[i].reduce((a, b) => a + b);
    scr.querySelector('[data-total]').textContent = usd(total);
    prices[i].forEach((v, k) => scr.querySelector(`[data-bar="${k}"]`).style.width = Math.round(v / total * 100) + '%');
  };
  const area = m => { const p = (m - 20) / 180 * 100; fill.style.width = p + '%'; knob.style.left = p + '%'; out.textContent = m + ' m²'; };
  // Open or close a step and wait until its height has settled before anything measures it.
  const openStep = async (st, on) => { st.classList.toggle('open', on); await wait(520 * SPEED); };

  function reset() {
    views.style.transition = 'none'; views.classList.remove('res'); void views.offsetWidth; views.style.transition = '';
    [form, res].forEach(v => { v.style.transition = 'none'; v.style.transform = ''; }); offs.clear();
    Object.values(steps).forEach(e => { e.classList.remove('open', 'filled'); e.querySelector('em').textContent = ''; });
    scr.querySelectorAll('.sel, .on').forEach(e => e.classList.remove('sel', 'on'));
    scr.querySelectorAll('.field').forEach(f => { f.classList.remove('typed'); f.textContent = f.dataset.ph || (f.dataset.ph = f.textContent); });
    btn.classList.remove('ready'); area(20); option(1); railAt(0); place(0, 0, 1);
  }
  async function type(f) {
    f.classList.add('typed'); f.textContent = '';
    for (const c of f.dataset.type) { f.textContent += c; await wait(55 + Math.random() * 70); }
  }
  // Instant fills, used when a viewer jumps ahead to a later stage.
  const prefill = [
    () => { steps.style.querySelector('[data-pick]').classList.add('sel'); steps.style.classList.add('filled'); steps.style.querySelector('em').textContent = 'Loft'; },
    () => { area(48); steps.home.querySelectorAll('[data-pick]').forEach(c => c.classList.add('sel')); steps.home.classList.add('filled'); steps.home.querySelector('em').textContent = '48 m² · Resale\nASAP · for tenants'; },
    () => { steps.bonus.querySelectorAll('.bonus').forEach(b => { b.classList.add('on'); const f = b.querySelector('.field'); f.classList.add('typed'); f.textContent = f.dataset.type; }); steps.bonus.classList.add('filled'); steps.bonus.querySelector('em').textContent = 'Both bonuses added'; btn.classList.add('ready'); },
  ];
  const stages = [
    async () => {
      await openStep(steps.style, true);
      const loft = steps.style.querySelector('[data-pick]');
      await press(loft, () => loft.classList.add('sel')); await wait(350);
      steps.style.classList.add('filled'); steps.style.querySelector('em').textContent = 'Loft';
      await openStep(steps.style, false); railAt(1);
    },
    async () => {
      await openStep(steps.home, true);
      await swipe(form, steps.home);
      let m = 20; await drag(knob, 14, () => area(m += 2));
      for (const c of steps.home.querySelectorAll('[data-pick]')) await press(c, () => c.classList.add('sel'));
      await wait(350);
      steps.home.classList.add('filled'); steps.home.querySelector('em').textContent = '48 m² · Resale\nASAP · for tenants';
      await openStep(steps.home, false); railAt(2);
    },
    async () => {
      await openStep(steps.bonus, true);
      await swipe(form, steps.bonus);
      for (const b of steps.bonus.querySelectorAll('.bonus')) {
        await press(b.querySelector('.box'), () => b.classList.add('on'));
        await press(b.querySelector('.field')); await type(b.querySelector('.field')); await wait(250);
      }
      steps.bonus.classList.add('filled'); steps.bonus.querySelector('em').textContent = 'Both bonuses added';
      btn.classList.add('ready'); await wait(500);
      await press(btn, () => btn.classList.add('press')); btn.classList.remove('press');
      views.classList.add('res'); railAt(3); await wait(1400);
    },
    async () => {
      await press(tabs[2], () => option(2)); await wait(1200);
      await press(tabs[0], () => option(0)); await wait(1200);
      await press(tabs[1], () => option(1)); await wait(600);
      await swipe(res, res.querySelector('.tl')); await wait(1800);
      railAt(4); await wait(1400);
    },
  ];
  // Set the screen straight to the start of a stage.
  function jumpTo(from) {
    reset();
    for (let i = 0; i < Math.min(from, 3); i++) prefill[i]();
    if (from >= 3) { views.style.transition = 'none'; views.classList.add('res'); void views.offsetWidth; views.style.transition = ''; }
    railAt(from);
  }
  async function play(from = 0) {
    jumpTo(from); await wait(from ? 500 : 900);
    for (let i = from; i < stages.length; i++) await stages[i]();
  }
  async function loop(from = 0) { const id = ++run; try { while (visible && id === run) { await play(from); from = 0; } } catch (e) {} }
  rail.forEach((li, i) => li.querySelector('button').addEventListener('click', () => { if (reduce) { jumpTo(i); return; } visible = true; loop(i); }));

  if (reduce) { jumpTo(3); return; }
  reset();
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !visible) { visible = true; loop(); }
    else if (!e.isIntersecting && visible) { visible = false; run++; }
  }, { threshold: .25 }).observe(stage);
})();
