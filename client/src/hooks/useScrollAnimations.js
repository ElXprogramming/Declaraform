import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll-driven entrance animations, scoped to `scopeRef`.
 *
 * - `[data-hero]`   elements animate in on page load (staggered).
 * - `[data-reveal]` elements fade in and slide up the first time they scroll into view.
 *   Elements that enter together are staggered as one batch.
 *
 * Animations are skipped entirely when the user prefers reduced motion,
 * so content is always visible for those users.
 */
export default function useScrollAnimations(scopeRef) {
  useLayoutEffect(() => {
    if (!scopeRef.current) return undefined;

    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Hero: plays immediately since it is already on screen.
      gsap.from('[data-hero]', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.15,
        clearProps: 'transform,opacity',
      });

      // Everything else: reveal on scroll.
      const revealEls = gsap.utils.toArray('[data-reveal]');
      gsap.set(revealEls, { opacity: 0, y: 40 });

      ScrollTrigger.batch(revealEls, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.12,
            overwrite: true,
            // Remove inline transforms afterwards so they can't interfere with
            // hover effects (e.g. hover:-translate-y-1) or layout.
            clearProps: 'transform,opacity',
          }),
      });
    }, scopeRef);

    return () => mm.revert();
  }, [scopeRef]);
}

/** Recalculate trigger positions, e.g. after content changes height. */
export function refreshScrollTriggers() {
  ScrollTrigger.refresh();
}
