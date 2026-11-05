import { createCardSurfaces } from './why-work-surface.js?v=20261104-float2';
import { cardOrbitPose, cardPointerPose, cardFloatPose } from './why-work-orbit.js?v=20261105-gallery-exit';

(async () => {
  const section = document.querySelector('.why-work');
  if (!section || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const narrative = section.closest('.narrative');
  const scene = section.querySelector('.why-work__scene');
  const cards = [...section.querySelectorAll('.benefit-card')];
  await document.fonts.ready;
  // Decode before creating GPU textures; a failed asset leaves the normal image layout.
  try {
    await Promise.all(cards.map(card => card.querySelector('img')?.decode()));
  } catch { return; }
  const media = gsap.matchMedia();
  media.add('screen and (min-width: 1024px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)', () => {
    const surfaces = createCardSurfaces(scene, cards, () => media.revert());
    if (!surfaces) return;
    section.dataset.floating = '';
    section.dataset.curved = '';
    const heading = section.querySelector('.why-work__heading');
    // The homepage shares the opening paragraph's sticky viewport. Standalone
    // previews retain their own pin; never nest one pin inside another.
    if (narrative) narrative.dataset.gallery = 'active';
    if (narrative) gsap.fromTo(scene, { autoAlpha: 0 }, {
      autoAlpha: 1, ease: 'none',
      scrollTrigger: {
        trigger: narrative || section,
        start: narrative ? () => `top+=${innerHeight * .81} top` : 'top bottom',
        end: narrative ? () => `top+=${innerHeight * .96} top` : 'top 65%',
        scrub: .25, invalidateOnRefresh: true,
      },
    });
    const motion = window.SensumTextMotion;
    const headingMarkup = heading.innerHTML;
    const closingHeading = section.querySelector('.why-work__heading--closing');
    const closingMarkup = closingHeading.innerHTML;
    let paintHeadingFrame = () => {};
    if (motion) {
      const chars = motion.split(heading, 'text-reveal');
      const closingChars = motion.split(closingHeading, 'text-reveal');
      closingHeading.dataset.reveal = 'active';
      motion.paint(closingChars, 0);
      // distance = 0 is the final image's foreground position on the finite orbit.
      const finalCenter = (cards.length - 1 + 1.8) / (cards.length - 1 + 3.6);
      let closingCurrent = 0;
      const reveal = { progress: 0 };
      heading.dataset.reveal = 'active';
      // Match the preceding paragraph: narrow letter feather, 60vh sweep,
      // and the same exponential damping rather than the faster title preset.
      let current = 0;
      motion.paint(chars, current);
      paintHeadingFrame = (time, previousTime) => {
        current += (reveal.progress - current) * motion.damping(time, previousTime);
        if (Math.abs(reveal.progress - current) < motion.tokens.epsilon) current = reveal.progress;
        const exit = motion.clamp((orbit.progress - finalCenter) / .035);
        motion.paint(chars, current * (1 - exit));
        const closingTarget = motion.clamp((orbit.progress - finalCenter - .035) / (motion.tokens.viewportSpan / 6));
        closingCurrent += (closingTarget - closingCurrent) * motion.damping(time, previousTime);
        if (Math.abs(closingTarget - closingCurrent) < motion.tokens.epsilon) closingCurrent = closingTarget;
        motion.paint(closingChars, closingCurrent);
      };
      gsap.to(reveal, {
        progress: 1, ease: 'none',
        scrollTrigger: {
          trigger: narrative || section,
          start: narrative ? () => `top+=${innerHeight * .81} top` : 'top bottom',
          end: narrative ? () => `top+=${innerHeight * (.81 + motion.tokens.viewportSpan)} top` : 'top 5%',
          scrub: true, invalidateOnRefresh: true,
        },
      });
    }
    const orbit = { progress: 0 };
    const pointer = { x: 0, y: 0 };
    const lifts = cards.map(() => ({ amount: 0 }));
    let hovered = -1;
    const clamp = gsap.utils.clamp;
    let spacing, rise, active = true, visible = false;
    const measure = () => {
      spacing = scene.clientWidth * .60;
      rise = Math.max(340, Math.min(scene.clientWidth * .33, 600)) / 1.45 * .42;
      surfaces.resize(scene.clientWidth, scene.clientHeight);
    };
    measure();
    let frame = 0, elapsed = 0, lastTime = 0;
    const draw = () => {
      cards.forEach((card, index) => {
        const pose = cardOrbitPose(orbit.progress, index, cards.length, spacing, rise);
        const drift = cardFloatPose(elapsed, index, pose.opacity);
        for (const key of Object.keys(drift)) pose[key] += drift[key];
        surfaces.set(index, pose, cardPointerPose(pointer, pose.foreground, lifts[index].amount));
      });
      surfaces.draw();
    };
    // One visible-only loop composes scroll, hover, pointer and gentle idle drift.
    const render = () => {
      if (visible && !document.hidden && !frame) frame = requestAnimationFrame(time => {
        frame = 0;
        if (!visible || document.hidden) { lastTime = 0; return; }
        if (lastTime) elapsed += Math.min((time - lastTime) / 1000, .05);
        paintHeadingFrame(time, lastTime);
        lastTime = time;
        draw();
        render();
      });
    };
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) render();
      else { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
    });
    visibility.observe(scene);
    const tabVisibility = () => {
      cancelAnimationFrame(frame); frame = 0; lastTime = 0;
      if (!document.hidden) render();
    };
    document.addEventListener('visibilitychange', tabVisibility);
    const hover = index => {
      if (index === hovered) return;
      hovered = index;
      lifts.forEach((lift, i) => gsap.to(lift, { amount: i === index ? 1 : 0, duration: .35, ease: 'power2.out', overwrite: true, onUpdate: render }));
    };
    const move = event => {
      if (!active || event.pointerType === 'touch') return;
      const bounds = scene.getBoundingClientRect();
      hover(surfaces.hit((event.clientX - bounds.left) / bounds.width * 2 - 1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      gsap.to(pointer, {
        x: clamp(-1, 1, (event.clientX - bounds.left) / bounds.width * 2 - 1),
        y: clamp(-1, 1, (event.clientY - bounds.top) / bounds.height * 2 - 1),
        duration: .5, ease: 'power2.out', overwrite: true, onUpdate: render,
      });
    };
    const leave = () => { hover(-1); gsap.to(pointer, { x: 0, y: 0, duration: .5, overwrite: true, onUpdate: render }); };
    scene.addEventListener('pointermove', move);
    scene.addEventListener('pointerleave', leave);
    render();
    gsap.fromTo(orbit, { progress: 0 }, {
      progress: 1, ease: 'none', onUpdate: render,
      scrollTrigger: {
        trigger: narrative || section,
        start: narrative ? () => `top+=${innerHeight * .96} top` : 'top top',
        end: () => `+=${innerHeight * 6}`,
        pin: narrative ? false : scene, pinType: 'fixed', scrub: .25, invalidateOnRefresh: true,
        onRefresh: () => { measure(); render(); },
        onToggle: self => {
          active = self.isActive;
          if (!active) {
            gsap.killTweensOf([pointer, ...lifts]);
            hovered = -1;
            pointer.x = pointer.y = 0;
            lifts.forEach(lift => { lift.amount = 0; });
            render();
          }
        },
      },
    });
    ScrollTrigger.refresh();
    return () => {
      if (motion) {
        delete heading.dataset.reveal;
        heading.innerHTML = headingMarkup;
        delete closingHeading.dataset.reveal;
        closingHeading.innerHTML = closingMarkup;
      }
      if (narrative) delete narrative.dataset.gallery;
      delete section.dataset.floating;
      delete section.dataset.curved;
      scene.removeEventListener('pointermove', move);
      scene.removeEventListener('pointerleave', leave);
      gsap.killTweensOf([pointer, ...lifts]);
      visibility.disconnect();
      document.removeEventListener('visibilitychange', tabVisibility);
      cancelAnimationFrame(frame);
      surfaces.dispose();
    };
  });
})();
