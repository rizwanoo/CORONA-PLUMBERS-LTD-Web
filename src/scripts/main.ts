import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initScrollProgressBar(): void {
  const bar = document.getElementById('scrollProgressBar');
  if (!bar) return;

  const updateProgress = (): void => {
    const doc = document.documentElement;
    const maxScroll = doc.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
    bar.style.transform = `scaleX(${progress})`;
  };

  if (REDUCED_MOTION) {
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    return;
  }

  gsap.to(bar, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.15,
      invalidateOnRefresh: true,
    },
  });
}

function initStickyHeader(): void {
  const header = document.getElementById('siteHeader');
  if (!header) return;

  const updateScrollState = (): void => {
    if (window.scrollY > 44) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  };

  updateScrollState();
  window.addEventListener('scroll', updateScrollState, { passive: true });
}

function initDropdownNavigation(): void {
  const dropdown = document.querySelector<HTMLElement>('.nav-dropdown');
  const trigger = document.querySelector<HTMLButtonElement>('.nav-dropdown-trigger');
  if (!dropdown || !trigger) return;

  let closeTimer: number | undefined;

  const openMenu = (): void => {
    window.clearTimeout(closeTimer);
    dropdown.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
  };

  const scheduleClose = (): void => {
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      dropdown.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }, 180);
  };

  dropdown.addEventListener('mouseenter', openMenu);
  dropdown.addEventListener('mouseleave', scheduleClose);

  trigger.addEventListener('click', (event: MouseEvent) => {
    event.preventDefault();
    const isOpen = dropdown.classList.contains('is-open');
    if (isOpen) {
      dropdown.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    } else {
      openMenu();
    }
  });

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape' && dropdown.classList.contains('is-open')) {
      dropdown.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    }
  });

  document.addEventListener('click', (event: MouseEvent) => {
    if (!dropdown.contains(event.target as Node)) {
      dropdown.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });
}

function initMobileDrawer(): void {
  const openBtn = document.getElementById('mobileMenuOpen');
  const closeBtn = document.getElementById('mobileMenuClose');
  const drawer = document.getElementById('mobileDrawer');
  if (!openBtn || !closeBtn || !drawer) return;

  const toggleDrawer = (open: boolean): void => {
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    openBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      closeBtn.focus();
    } else {
      openBtn.focus();
    }
  };

  openBtn.addEventListener('click', () => toggleDrawer(true));
  closeBtn.addEventListener('click', () => toggleDrawer(false));

  drawer.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => toggleDrawer(false));
  });

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape' && drawer.classList.contains('is-open')) {
      toggleDrawer(false);
    }
  });
}

function initHomepageServicePreview(): void {
  const rows = document.querySelectorAll<HTMLElement>('[data-service-preview]');
  const previewImg = document.getElementById('homeServicePreviewImg') as HTMLImageElement | null;
  const previewCaption = document.getElementById('homeServicePreviewCaption');
  if (!rows.length || !previewImg) return;

  rows.forEach((row) => {
    const activate = (): void => {
      const nextSrc = row.dataset.serviceImg;
      const nextAlt = row.dataset.serviceAlt || '';
      const nextCaption = row.dataset.serviceCaption || '';
      if (!nextSrc || previewImg.getAttribute('src') === nextSrc) return;

      if (REDUCED_MOTION) {
        previewImg.src = nextSrc;
        previewImg.alt = nextAlt;
        if (previewCaption) previewCaption.textContent = nextCaption;
        return;
      }

      gsap.to(previewImg, {
        opacity: 0.35,
        duration: 0.16,
        onComplete: () => {
          previewImg.src = nextSrc;
          previewImg.alt = nextAlt;
          if (previewCaption) previewCaption.textContent = nextCaption;
          gsap.to(previewImg, { opacity: 1, duration: 0.28, ease: 'power2.out' });
        },
      });
    };

    row.addEventListener('mouseenter', activate);
    row.addEventListener('focusin', activate);
  });
}

function initGsapAnimations(): void {
  if (REDUCED_MOTION) return;

  // 1. Hero Entrance Choreography
  const heroItems = document.querySelectorAll('.gsap-hero-item');
  if (heroItems.length) {
    gsap.from(heroItems, {
      y: 28,
      opacity: 0,
      duration: 0.85,
      stagger: 0.11,
      ease: 'power3.out',
      clearProps: 'transform,opacity',
    });
  }

  // 2. Subtle Hero Parallax
  const heroBg = document.querySelector<HTMLElement>('.hero-media-img');
  const heroContainer = document.querySelector<HTMLElement>('.hero-cinematic, .hero-subpage');
  if (heroBg && heroContainer) {
    gsap.to(heroBg, {
      yPercent: 12,
      ease: 'none',
      scrollTrigger: {
        trigger: heroContainer,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }

  // 3. Editorial Typography & Section Reveals
  document.querySelectorAll<HTMLElement>('.gsap-reveal').forEach((el) => {
    gsap.from(el, {
      y: 26,
      opacity: 0,
      duration: 0.72,
      ease: 'power3.out',
      clearProps: 'transform,opacity',
      scrollTrigger: {
        trigger: el,
        start: 'top 86%',
        once: true,
      },
    });
  });

  // 4. Cinematic Photo Subtle Zoom Settle + Parallax
  document.querySelectorAll<HTMLElement>('.gsap-parallax-photo').forEach((img) => {
    gsap.fromTo(
      img,
      { scale: 1.08, yPercent: -4 },
      {
        scale: 1,
        yPercent: 4,
        ease: 'none',
        scrollTrigger: {
          trigger: img.parentElement || img,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      }
    );
  });

  // 5. Horizontal Editorial Showcase on Our Work Page (Desktop only)
  const horizontalSection = document.getElementById('horizontalGallerySection');
  const horizontalTrack = document.getElementById('horizontalGalleryTrack');
  if (horizontalSection && horizontalTrack) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 992px)', () => {
      const getScrollAmount = (): number => {
        return -(horizontalTrack.scrollWidth - window.innerWidth + 120);
      };
      if (horizontalTrack.scrollWidth > window.innerWidth) {
        gsap.to(horizontalTrack, {
          x: getScrollAmount,
          ease: 'none',
          scrollTrigger: {
            trigger: horizontalSection,
            start: 'top 14%',
            end: () => `+=${Math.abs(getScrollAmount())}`,
            pin: true,
            scrub: 0.9,
            invalidateOnRefresh: true,
          },
        });
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initScrollProgressBar();
  initStickyHeader();
  initDropdownNavigation();
  initMobileDrawer();
  initHomepageServicePreview();
  initGsapAnimations();
});
