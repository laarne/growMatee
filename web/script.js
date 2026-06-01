/* GrowMate Landing Page — script.js */
(function () {
  'use strict';

  /* ── Hamburger menu ─────────────────────────────────────── */
  const hamburger  = document.getElementById('hamburger');
  const mobileNav  = document.getElementById('mobile-nav');

  function closeMenu() {
    if (!hamburger || !mobileNav) return;
    hamburger.classList.remove('open');
    mobileNav.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open navigation menu');
  }

  // expose globally for inline onclick handlers
  window.closeMenu = closeMenu;

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      hamburger.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
        closeMenu();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ── Nav scroll blur ────────────────────────────────────── */
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  document.querySelectorAll('.phone img, .pw-phone-frame img, .card-plant img, .card-avatar').forEach((img) => {
    const holder = img.parentElement;
    if (!holder) return;

    holder.classList.add('media-skeleton');
    const markLoaded = () => {
      holder.classList.add('media-loaded');
      holder.classList.remove('media-skeleton');
    };

    if (img.complete && img.naturalWidth > 0) {
      markLoaded();
    } else {
      img.addEventListener('load', markLoaded, { once: true });
      img.addEventListener('error', markLoaded, { once: true });
    }
  });

  /* ── Hero phone parallax (desktop only) ─────────────────── */
  const heroPhones = document.getElementById('hero-phones');
  if (heroPhones && window.matchMedia('(min-width: 1024px)').matches) {
    document.addEventListener('mousemove', (e) => {
      const xPct = (e.clientX / window.innerWidth - 0.5) * 10;
      const yPct = (e.clientY / window.innerHeight - 0.5) * 8;
      heroPhones.style.transform = `rotateY(${xPct}deg) rotateX(${-yPct}deg)`;
    }, { passive: true });
  }

  /* ── Leafy AI Playground ─────────────────────────────────── */
  const PLANTS = {
    monstera: {
      name: 'Monstera deliciosa',
      common: 'Swiss Cheese Plant',
      badge: '✅ Safe to sell',
      warn: false,
      tags: ['🌤️ Indirect light', '💧 7 days', '🌡️ 18–27°C'],
      tip: 'Thrives in bright indirect light. Wipe leaves monthly to keep them glossy. Mildly toxic to pets — disclose when selling.',
      img: '/plants/monstera-real.jpg',
    },
    orchid: {
      name: 'Phalaenopsis amabilis',
      common: 'Moth Orchid',
      badge: '✅ Safe to sell',
      warn: false,
      tags: ['🌤️ Bright indirect', '💧 10 days', '🌡️ 16–24°C'],
      tip: 'Water by soaking the pot for 10 minutes then draining fully. Keep away from cold drafts. Non-toxic — great for all buyers.',
      img: '/plants/orchid-real.jpg',
    },
    pothos: {
      name: 'Epipremnum aureum',
      common: 'Golden Pothos',
      badge: '⚠️ Disclose toxicity',
      warn: true,
      tags: ['🌑 Low to bright', '💧 7–10 days', '🌡️ 15–29°C'],
      tip: 'Almost indestructible — perfect for beginners. Toxic if ingested by pets or children. Always disclose this in your listing.',
      img: '/plants/pothos-real.jpg',
    },
    succulent: {
      name: 'Echeveria elegans',
      common: 'Mexican Snowball',
      badge: '✅ Safe to sell',
      warn: false,
      tags: ['☀️ Full to partial', '💧 14 days', '🌡️ 10–27°C'],
      tip: 'Drought-tolerant and compact. Water deeply then let soil dry completely. Ideal for gifting — non-toxic and low maintenance.',
      img: '/plants/succulent-real.jpg',
    },
  };

  const demoPlants   = document.querySelectorAll('.demo-plant');
  const demoMainImg  = document.getElementById('demo-main-img');
  const scanOverlay  = document.getElementById('scan-overlay');
  const scanLine     = document.getElementById('scan-line');
  const scanBtn      = document.getElementById('scan-btn');
  const scanIdle     = document.getElementById('scan-idle');
  const scanResult   = document.getElementById('scan-result');
  const resultName   = document.getElementById('result-name');
  const resultCommon = document.getElementById('result-common');
  const resultBadge  = document.getElementById('result-badge');
  const resultTags   = document.getElementById('result-tags');
  const resultTip    = document.getElementById('result-tip');
  const resultReset  = document.getElementById('result-reset');

  let currentPlant = 'monstera';
  let scanning = false;

  function selectPlant(key) {
    if (scanning) return;
    currentPlant = key;
    const data = PLANTS[key];

    demoPlants.forEach((btn) => {
      const isActive = btn.dataset.plant === key;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    if (demoMainImg) {
      demoMainImg.src = data.img;
      demoMainImg.alt = data.common;
    }

    // Reset state
    if (scanResult) scanResult.hidden = true;
    if (scanIdle)   scanIdle.style.display = '';
    if (scanOverlay) scanOverlay.classList.remove('active');
    if (scanLine)    scanLine.classList.remove('scanning');
  }

  demoPlants.forEach((btn) => {
    btn.addEventListener('click', () => selectPlant(btn.dataset.plant));
  });

  function runScan() {
    if (scanning) return;
    scanning = true;

    const data = PLANTS[currentPlant];

    // Hide idle button
    if (scanIdle) scanIdle.style.display = 'none';

    // Show overlay + animate scan line
    if (scanOverlay) scanOverlay.classList.add('active');
    if (scanLine) {
      scanLine.classList.remove('scanning');
      // Force reflow
      void scanLine.offsetWidth;
      scanLine.classList.add('scanning');
    }

    // After scan completes, show result
    setTimeout(() => {
      if (scanOverlay) scanOverlay.classList.remove('active');

      if (resultName)   resultName.textContent  = data.name;
      if (resultCommon) resultCommon.textContent = data.common;
      if (resultBadge) {
        resultBadge.textContent = data.badge;
        resultBadge.classList.toggle('warn', data.warn);
      }
      if (resultTags) {
        resultTags.innerHTML = data.tags
          .map((t) => `<span>${t}</span>`)
          .join('');
      }
      if (resultTip) resultTip.textContent = data.tip;

      if (scanResult) scanResult.hidden = false;
      scanning = false;
    }, 1600);
  }

  if (scanBtn) scanBtn.addEventListener('click', runScan);

  if (resultReset) {
    resultReset.addEventListener('click', () => {
      if (scanResult) scanResult.hidden = true;
      if (scanIdle)   scanIdle.style.display = '';
      if (scanOverlay) scanOverlay.classList.remove('active');
      if (scanLine)    scanLine.classList.remove('scanning');
    });
  }

  /* ── Social proof swiper ─────────────────────────────────── */
  const track    = document.getElementById('cards-track');
  const dotsEl   = document.getElementById('card-dots');
  const viewport = document.getElementById('cards-viewport');

  if (track && dotsEl && viewport) {
    const cards = track.querySelectorAll('.proof-card');
    const dots  = dotsEl.querySelectorAll('.dot');
    let current = 0;
    let touchStartX = 0;
    let autoTimer;

    function goTo(idx) {
      current = Math.max(0, Math.min(idx, cards.length - 1));

      // On mobile, show one card; on wider, show all (CSS handles layout)
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        const cardW = cards[0].offsetWidth + 24;
        track.style.transform = `translateX(-${current * cardW}px)`;
      } else {
        track.style.transform = '';
      }

      dots.forEach((d, i) => {
        d.classList.toggle('active', i === current);
        d.setAttribute('aria-selected', String(i === current));
      });
    }

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        clearInterval(autoTimer);
        goTo(Number(dot.dataset.idx));
        startAuto();
      });
    });

    // Touch swipe
    viewport.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
      const delta = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(delta) > 40) {
        clearInterval(autoTimer);
        goTo(delta > 0 ? current + 1 : current - 1);
        startAuto();
      }
    }, { passive: true });

    function startAuto() {
      autoTimer = setInterval(() => {
        goTo((current + 1) % cards.length);
      }, 5000);
    }

    startAuto();
    window.addEventListener('resize', () => goTo(current), { passive: true });
  }

  /* ── Stats counter (IntersectionObserver) ────────────────── */
  const statEls = document.querySelectorAll('.stat-number');

  function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }

  function animateStat(el) {
    const target  = parseInt(el.dataset.target, 10);
    const prefix  = el.dataset.prefix  || '';
    const suffix  = el.dataset.suffix  || '';
    const duration = 1800;
    const start    = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const val = Math.round(easeOutQuart(progress) * target);
      el.textContent = prefix + val.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window && statEls.length) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateStat(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    statEls.forEach((el) => obs.observe(el));
  } else {
    // Fallback: set final values immediately
    statEls.forEach((el) => {
      el.textContent =
        (el.dataset.prefix || '') +
        parseInt(el.dataset.target, 10).toLocaleString() +
        (el.dataset.suffix || '');
    });
  }

  /* ── Pathway hover — swap phone image ────────────────────── */
  const gardenPath = document.getElementById('pw-gardener');
  const sellerPath = document.getElementById('pw-seller');
  const gardenImg  = document.getElementById('pw-gardener-img');
  const sellerImg  = document.getElementById('pw-seller-img');

  function swapImg(el, src) {
    if (!el || el.src.endsWith(src.replace('/', ''))) return;
    el.style.opacity = '0';
    el.style.transition = 'opacity 200ms';
    setTimeout(() => {
      el.src = src;
      el.style.opacity = '1';
    }, 200);
  }

  if (gardenPath && gardenImg) {
    gardenPath.addEventListener('mouseenter', () => swapImg(gardenImg, '/landing-garden.png'));
    gardenPath.addEventListener('focusin',    () => swapImg(gardenImg, '/landing-garden.png'));
  }

  if (sellerPath && sellerImg) {
    sellerPath.addEventListener('mouseenter', () => swapImg(sellerImg, '/landing-market.png'));
    sellerPath.addEventListener('focusin',    () => swapImg(sellerImg, '/landing-market.png'));
  }

  /* ── Smooth section reveal on scroll ─────────────────────── */
  const revealEls = document.querySelectorAll(
    '.proof-card, .strip-chip, .pathway, .stat-item'
  );

  if ('IntersectionObserver' in window && revealEls.length) {
    const style = document.createElement('style');
    style.textContent = `
      .reveal-ready { opacity: 0; transform: translateY(24px); transition: opacity 500ms ease, transform 500ms ease; }
      .reveal-ready.revealed { opacity: 1; transform: translateY(0); }
    `;
    document.head.appendChild(style);

    revealEls.forEach((el, i) => {
      el.classList.add('reveal-ready');
      el.style.transitionDelay = `${(i % 4) * 80}ms`;
    });

    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    revealEls.forEach((el) => revealObs.observe(el));
  }

})();
