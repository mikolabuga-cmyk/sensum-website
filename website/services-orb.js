import { mountOrb } from './vendor/thinking-orbs/orb-core.js';
import { cube, tetrahedron, octahedron } from './vendor/thinking-orbs/shapes.js';

const visuals = [...document.querySelectorAll('.service-orb__visual')];
if (visuals.length) {
  const control = document.querySelector('.motion-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  const options = {
    state: 'using', speed: .35, density: 2.7,
    dotSize: .25, tilt: 31, size: 480
  };
  const states = new Map(visuals.map(svg => [svg, { visible: false, orb: null, hovered: false, focused: false }]));
  let pageActive = true;
  function sync() {
    for (const [svg, state] of states) {
      // Mount on first encounter; only visible rows run an animation loop.
      const engaged = !hover.matches || state.hovered || state.focused;
      if (state.visible && engaged && !state.orb) {
        state.orb = mountOrb(svg, svg.dataset.orbShape === 'cube'
          ? { ...options, state: 'searching', speed: .4, tilt: 22, shape: cube }
          : svg.dataset.orbShape === 'tetrahedron'
            ? { ...options, state: 'waiting', shape: tetrahedron }
            : svg.dataset.orbShape === 'octahedron'
              ? { ...options, state: 'compacting', shape: octahedron }
              : options);
        state.orb.pause();
      }
      if (state.visible && engaged && pageActive && !document.hidden &&
          !reduced.matches && !forced.matches && control?.dataset.paused !== 'true') state.orb?.play();
      else state.orb?.pause();
    }
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) states.get(entry.target.querySelector('.service-orb__visual')).visible = entry.isIntersecting;
    sync();
  });
  // Observe the sized HTML wrapper: an empty SVG has no painted bounds in WebKit.
  visuals.forEach(svg => observer.observe(svg.parentElement));
  visuals.forEach(svg => {
    const panel = svg.closest('.service-panel');
    const state = states.get(svg);
    panel.addEventListener('pointerenter', () => { state.hovered = true; sync(); });
    panel.addEventListener('pointerleave', () => { state.hovered = false; sync(); });
    panel.addEventListener('focusin', () => { state.focused = true; sync(); });
    panel.addEventListener('focusout', event => { state.focused = panel.contains(event.relatedTarget); sync(); });
  });
  hover.addEventListener('change', sync);
  if (control) new MutationObserver(sync).observe(control, { attributes: true, attributeFilter: ['data-paused'] });
  // The library reads this preference at mount, so refresh already-mounted orbs.
  reduced.addEventListener('change', () => {
    for (const state of states.values()) {
      state.orb?.destroy();
      state.orb = null;
    }
    sync();
  });
  forced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => { pageActive = false; sync(); });
  window.addEventListener('pageshow', () => { pageActive = true; sync(); });
}
