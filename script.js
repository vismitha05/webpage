/**
 * GTG Perfumes — script.js
 * All modules: Header, Gallery, Cart, Expandable, Accordion, Stats, LazyLoad
 */

'use strict';

/* ================================================================
   MODULE: Header — scroll shadow + responsive hamburger
   ================================================================ */
const Header = (() => {
  const header    = document.getElementById('site-header');
  const hamburger = document.getElementById('hamburger');
  const nav       = document.getElementById('main-nav');

  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 8);
  }

  function toggleMenu() {
    const open = nav.classList.toggle('is-open');
    hamburger.classList.toggle('is-open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function closeMenu() {
    nav.classList.remove('is-open');
    hamburger.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function init() {
    if (!header) return;
    window.addEventListener('scroll', onScroll, { passive: true });
    hamburger.addEventListener('click', toggleMenu);
    document.addEventListener('click', e => {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !hamburger.contains(e.target)) closeMenu();
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 1024) closeMenu(); });
    onScroll();
  }

  return { init };
})();


/* ================================================================
   MODULE: Gallery — main image + thumbnails + dots + arrows + swipe
   ================================================================ */
const Gallery = (() => {
  // 8 slides: alternate between main and thumb with CSS filters for variety
  const slides = [
    { src: 'perfume-main.png',  alt: 'Rose — front view',    variant: 'none'   },
    { src: 'perfume-thumb.png', alt: 'Amber — angle view',   variant: 'amber'  },
    { src: 'perfume-main.png',  alt: 'Musk — bottle detail', variant: 'musk'   },
    { src: 'perfume-thumb.png', alt: 'Jasmine — cap detail', variant: 'jasmine'},
    { src: 'perfume-main.png',  alt: 'Coral — side view',    variant: 'coral'  },
    { src: 'perfume-thumb.png', alt: 'Violet — lifestyle',   variant: 'violet' },
    { src: 'perfume-main.png',  alt: 'Amber — close-up',     variant: 'orange' },
    { src: 'perfume-thumb.png', alt: 'Red — front detail',   variant: 'red'    },
  ];

  // CSS filter map for the main image display
  const filterMap = {
    none:    '',
    amber:   'hue-rotate(25deg) saturate(1.4) brightness(1.05)',
    musk:    'hue-rotate(200deg) saturate(0.8) brightness(0.82)',
    jasmine: 'hue-rotate(310deg) saturate(0.85) brightness(1.1)',
    coral:   'hue-rotate(160deg) saturate(1.2)',
    violet:  'hue-rotate(270deg) saturate(0.9)',
    orange:  'hue-rotate(40deg) saturate(1.4) brightness(1.05)',
    red:     'hue-rotate(185deg) saturate(1.1)',
  };

  let current = 0;
  let busy    = false;

  const mainImg   = document.getElementById('gallery-main-img');
  const prevBtn   = document.getElementById('gal-prev');
  const nextBtn   = document.getElementById('gal-next');
  const dotsEl    = document.getElementById('gallery-dots');
  const thumbsEl  = document.getElementById('gallery-thumbs');

  function buildUI() {
    slides.forEach((slide, i) => {
      // Thumbnail
      const btn = document.createElement('button');
      btn.className = `gallery__thumb${i === 0 ? ' is-active' : ''}`;
      btn.dataset.variant = slide.variant;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      btn.setAttribute('aria-label', slide.alt);
      btn.innerHTML = `<img src="${slide.src}" alt="${slide.alt}" loading="lazy" />`;
      btn.addEventListener('click', () => goTo(i));
      thumbsEl.appendChild(btn);

      // Dot
      const dot = document.createElement('button');
      dot.className = `gallery__dot${i === 0 ? ' is-active' : ''}`;
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(dot);
    });
  }

  function syncUI(idx) {
    thumbsEl.querySelectorAll('.gallery__thumb').forEach((t, i) => {
      t.classList.toggle('is-active', i === idx);
      t.setAttribute('aria-selected', String(i === idx));
    });
    dotsEl.querySelectorAll('.gallery__dot').forEach((d, i) => {
      d.classList.toggle('is-active', i === idx);
    });
  }

  function goTo(idx) {
    if (busy || idx === current) return;
    busy = true;

    mainImg.classList.add('is-fading');

    setTimeout(() => {
      const slide = slides[idx];
      mainImg.src    = slide.src;
      mainImg.alt    = slide.alt;
      mainImg.style.filter = filterMap[slide.variant] || '';
      current = idx;
      syncUI(idx);
      mainImg.classList.remove('is-fading');
      busy = false;
    }, 280);
  }

  // Swipe / touch
  let touchX = 0;
  function onTouchStart(e) { touchX = e.touches[0].clientX; }
  function onTouchEnd(e) {
    const dx = touchX - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 36) { dx > 0 ? goTo((current + 1) % slides.length) : goTo((current - 1 + slides.length) % slides.length); }
  }

  function init() {
    if (!mainImg || !thumbsEl) return;
    buildUI();
    prevBtn.addEventListener('click', () => goTo((current - 1 + slides.length) % slides.length));
    nextBtn.addEventListener('click', () => goTo((current + 1) % slides.length));

    const stage = document.querySelector('.gallery__stage');
    if (stage) {
      stage.addEventListener('touchstart', onTouchStart, { passive: true });
      stage.addEventListener('touchend',   onTouchEnd,   { passive: true });
    }

    // Arrow-key navigation when gallery is focused
    document.querySelector('.gallery').addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  goTo((current - 1 + slides.length) % slides.length);
      if (e.key === 'ArrowRight') goTo((current + 1) % slides.length);
    });
  }

  return { init };
})();


/* ================================================================
   MODULE: Cart — dynamic URL for all 9 fragrance × type combos
   ================================================================ */
const Cart = (() => {
  const cartBtn  = document.getElementById('add-to-cart-btn');

  function updateURL() {
    if (!cartBtn) return;
    const fragrance = document.querySelector('input[name="fragrance"]:checked');
    const ptype     = document.querySelector('input[name="ptype"]:checked');

    if (!fragrance || !ptype) {
      cartBtn.href = '/cart';
      return;
    }
    const p = new URLSearchParams({ fragrance: fragrance.value, type: ptype.value });
    cartBtn.href = `/cart?${p.toString()}`;
  }

  function init() {
    if (!cartBtn) return;
    document.querySelectorAll('input[name="fragrance"], input[name="ptype"]')
      .forEach(r => r.addEventListener('change', updateURL));
    updateURL();
  }

  return { init };
})();


/* ================================================================
   MODULE: Expandable — preview subscription + double subscription
   Each pair is independently toggled; mutual exclusion within same group
   ================================================================ */
const Expandable = (() => {
  function wire(triggerId, bodyId) {
    const trigger = document.querySelector(`#${triggerId} .expandable__trigger`) ||
                    document.querySelector(`[aria-controls="${bodyId}"]`);
    const body    = document.getElementById(bodyId);
    if (!trigger || !body) return;

    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!expanded));
      body.setAttribute('aria-hidden', String(expanded));
    });
  }

  function init() {
    wire('single-expandable', 'single-expandable-body');
    wire('double-expandable', 'double-expandable-body');
  }

  return { init };
})();


/* ================================================================
   MODULE: Accordion — Our Collection (one open at a time)
   ================================================================ */
const Accordion = (() => {
  function init() {
    const acc   = document.getElementById('accordion');
    if (!acc) return;
    const items = acc.querySelectorAll('.acc-item');

    // Open first by default
    const first = items[0];
    if (first) {
      first.querySelector('.acc-trigger').setAttribute('aria-expanded', 'true');
      const p = first.querySelector('.acc-panel');
      if (p) p.removeAttribute('hidden');
    }

    items.forEach(item => {
      const trigger = item.querySelector('.acc-trigger');
      const panel   = item.querySelector('.acc-panel');
      if (!trigger || !panel) return;

      trigger.addEventListener('click', () => {
        const isOpen = trigger.getAttribute('aria-expanded') === 'true';

        // Collapse all
        items.forEach(i => {
          i.querySelector('.acc-trigger').setAttribute('aria-expanded', 'false');
          const p = i.querySelector('.acc-panel');
          if (p) p.setAttribute('hidden', '');
        });

        // Toggle clicked
        if (!isOpen) {
          trigger.setAttribute('aria-expanded', 'true');
          panel.removeAttribute('hidden');
        }
      });
    });
  }

  return { init };
})();


/* ================================================================
   MODULE: Stats — IntersectionObserver counter animation
   ================================================================ */
const Stats = (() => {
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animateCount(el, target, duration) {
    let start = null;
    function frame(ts) {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / duration, 1);
      el.textContent = Math.floor(easeOutCubic(pct) * target);
      if (pct < 1) requestAnimationFrame(frame);
      else el.textContent = target;
    }
    requestAnimationFrame(frame);
  }

  function init() {
    const section = document.getElementById('stats-section');
    if (!section || !('IntersectionObserver' in window)) return;

    let fired = false;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !fired) {
        fired = true;
        section.querySelectorAll('.stat-card[data-target]').forEach((card, i) => {
          const target  = parseInt(card.dataset.target, 10);
          const countEl = card.querySelector('.stat-count');
          if (countEl && !isNaN(target)) {
            setTimeout(() => animateCount(countEl, target, 1600), i * 120);
          }
        });
        observer.disconnect();
      }
    }, { threshold: 0.25 });

    observer.observe(section);
  }

  return { init };
})();


/* ================================================================
   MODULE: LazyLoad — fade-in images as they enter viewport
   ================================================================ */
const LazyLoad = (() => {
  function init() {
    if (!('IntersectionObserver' in window)) return;
    const imgs = document.querySelectorAll('img[loading="lazy"]');

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '120px' });

    imgs.forEach(img => {
      img.style.cssText += '; opacity:0; transition: opacity 0.45s ease;';
      io.observe(img);
    });
  }

  return { init };
})();


/* ================================================================
   MODULE: Smooth scroll — offset for sticky header
   ================================================================ */
const SmoothScroll = (() => {
  function init() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const sel = a.getAttribute('href');
        if (sel === '#') return;
        const target = document.querySelector(sel);
        if (!target) return;
        e.preventDefault();
        const hh = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10) || 64;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - hh - 12, behavior: 'smooth' });
      });
    });
  }
  return { init };
})();


/* ================================================================
   BOOT
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  Header.init();
  Gallery.init();
  Cart.init();
  Expandable.init();
  Accordion.init();
  Stats.init();
  SmoothScroll.init();
  LazyLoad.init();
});