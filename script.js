/**
 * MAXIMUS | High-Performance Pre-Workout — Master JavaScript
 * 100% Vanilla JS • Zero-Lag • Instant Frame Rendering • Native Sticky Scroll
 */

(function () {
  'use strict';

  // Constants
  const TOTAL_FRAMES = 160;
  const FRAME_WIDTH = 1280;
  const FRAME_HEIGHT = 720;

  // DOM Elements
  const canvas = document.getElementById('heroCanvas');
  const heroTrack = document.getElementById('heroTrack');
  const siteNav = document.getElementById('siteNav');
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const frameCounterEl = document.getElementById('frameCounter');

  // HUD Elements
  const phasePills = document.querySelectorAll('.phase-pill');
  const hudPhase1 = document.getElementById('hudPhase1');
  const hudPhase2 = document.getElementById('hudPhase2');
  const hudPhase3 = document.getElementById('hudPhase3');
  const hudPhase4 = document.getElementById('hudPhase4');

  if (!canvas || !heroTrack) return;
  const ctx = canvas.getContext('2d', { alpha: false });

  // Native Frame Resolution (Direct 1:1 hardware blit, zero CPU scaling)
  canvas.width = FRAME_WIDTH;   // 1280
  canvas.height = FRAME_HEIGHT; // 720

  // Frame Cache & Dual-Queue Streamer State
  const frames = new Array(TOTAL_FRAMES);
  const loadingStatus = new Uint8Array(TOTAL_FRAMES); // 0 = idle, 1 = in-flight, 2 = loaded, 3 = error
  let currentFrame = 0;
  let lastDrawnFrame = -1;
  let lastActivePhase = -1;
  let loadedCount = 0;

  // Helper to format frame path (Ultra-compressed WebP 6.2MB vs 79MB PNG)
  function getFramePath(idx) {
    const pad = String(idx + 1).padStart(3, '0');
    return `public/frames/ezgif-frame-${pad}.webp`;
  }

  // Concurrency-controlled dual-priority queue (Max 2 connections ensures rest of website loads instantly)
  const MAX_CONCURRENT = 2;
  let activeDownloads = 0;
  const highPriorityQueue = [];
  const lowPriorityQueue = [];

  function enqueueFrame(idx, highPriority = false) {
    if (idx < 0 || idx >= TOTAL_FRAMES) return;
    if (loadingStatus[idx] !== 0) return;
    loadingStatus[idx] = 1;

    if (highPriority) {
      highPriorityQueue.unshift(idx);
    } else {
      lowPriorityQueue.push(idx);
    }
    pumpQueue();
  }

  // Preload window around scroll position (Scroll ke aas-paas next frames cache)
  function cacheSurroundingFrames(centerIdx, velocity = 0) {
    const isForward = velocity >= 0;
    const windowAhead = 10;
    const windowBehind = 3;

    if (isForward) {
      for (let i = 0; i <= windowAhead; i++) {
        const target = centerIdx + i;
        if (target < TOTAL_FRAMES) enqueueFrame(target, true);
      }
      for (let i = 1; i <= windowBehind; i++) {
        const target = centerIdx - i;
        if (target >= 0) enqueueFrame(target, true);
      }
    } else {
      for (let i = 0; i <= windowAhead; i++) {
        const target = centerIdx - i;
        if (target >= 0) enqueueFrame(target, true);
      }
      for (let i = 1; i <= windowBehind; i++) {
        const target = centerIdx + i;
        if (target < TOTAL_FRAMES) enqueueFrame(target, true);
      }
    }
  }

  function pumpQueue() {
    while (activeDownloads < MAX_CONCURRENT && (highPriorityQueue.length > 0 || lowPriorityQueue.length > 0)) {
      const idx = highPriorityQueue.length > 0 ? highPriorityQueue.shift() : lowPriorityQueue.shift();
      activeDownloads++;

      const img = new Image();
      img.src = getFramePath(idx);
      img.onload = () => {
        frames[idx] = img;
        loadingStatus[idx] = 2;
        loadedCount++;
        activeDownloads--;

        // If this is initial frame 0 or currently active frame, render immediately
        if (idx === 0 && lastDrawnFrame === -1) {
          renderCanvas(0);
        } else if (idx === currentFrame) {
          ctx.drawImage(img, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
          lastDrawnFrame = idx;
        }

        updateFrameCounter();
        pumpQueue();
      };
      img.onerror = () => {
        loadingStatus[idx] = 3;
        activeDownloads--;
        pumpQueue();
      };
    }
  }

  function updateFrameCounter() {
    if (!frameCounterEl) return;
    if (loadedCount < TOTAL_FRAMES) {
      const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
      frameCounterEl.textContent = `BUFFER: [${pct}%] • FRAME: [${String(currentFrame + 1).padStart(3, '0')}/160]`;
    } else {
      frameCounterEl.textContent = `FRAME: [${String(currentFrame + 1).padStart(3, '0')}/160]`;
    }
  }

  // 1. Initial Page Load: Hero + First Frames Only (Website Instantly Visible)
  function initProgressivePreloader() {
    // Only first 4 frames load on startup so website is instantly visible without bandwidth choke
    for (let i = 0; i <= 3; i++) {
      enqueueFrame(i, true);
    }

    // Dynamic background preload kicks in smoothly after initial render
    const startBackgroundPreload = () => {
      // Step A: Preload keyframes (every 4th frame) so any scrub point has immediate visuals
      for (let i = 4; i < TOTAL_FRAMES; i += 4) {
        enqueueFrame(i, false);
      }

      // Step B: Progressively fill remaining frames during browser idle cycles
      const fillRemaining = () => {
        for (let i = 0; i < TOTAL_FRAMES; i++) {
          if (loadingStatus[i] === 0) {
            enqueueFrame(i, false);
          }
        }
      };

      if (window.requestIdleCallback) {
        window.requestIdleCallback(fillRemaining, { timeout: 3000 });
      } else {
        setTimeout(fillRemaining, 1200);
      }
    };

    if (document.readyState === 'complete') {
      setTimeout(startBackgroundPreload, 400);
      setTimeout(preloadOpenTubFormulationAssets, 600);
    } else {
      window.addEventListener('load', () => {
        setTimeout(startBackgroundPreload, 400);
        setTimeout(preloadOpenTubFormulationAssets, 600);
      }, { once: true });
    }
  }

  // Preload Open Tub assets early so scrolling to formulation & deck has zero GPU texture stalls
  function preloadOpenTubFormulationAssets() {
    const openTubSrcs = [
      'public/open/blue-raspberry-open.webp',
      'public/open/grape-open.webp',
      'public/open/orange-blast-open.webp',
      'public/open/sour-apple-open.webp'
    ];
    openTubSrcs.forEach((src) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
    });
  }

  initProgressivePreloader();

  // 2. Ultra-Fast Canvas Draw Function with Adaptive Fallback
  function renderCanvas(targetIndex) {
    if (!ctx) return;
    const idx = Math.min(Math.max(0, Math.round(targetIndex)), TOTAL_FRAMES - 1);
    if (idx === lastDrawnFrame) return;

    let img = frames[idx];
    if (!img) {
      if (loadingStatus[idx] === 0) {
        enqueueFrame(idx, true);
      }

      // Find nearest loaded frame for zero-blackout instant render
      for (let s = 1; s < 30; s++) {
        if (idx - s >= 0 && frames[idx - s]) {
          img = frames[idx - s];
          break;
        }
        if (idx + s < TOTAL_FRAMES && frames[idx + s]) {
          img = frames[idx + s];
          break;
        }
      }
    }

    if (img) {
      ctx.drawImage(img, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
      lastDrawnFrame = idx;
    }
  }

  // 3. Butter-Smooth Kinetic Scroll Sync Loop (120 FPS / Zero-Lag)
  let targetProgress = 0;
  let currentProgress = 0;
  let isTicking = false;

  let heroTrackTop = 0;
  let heroTrackHeight = 0;
  function measureHeroTrack() {
    if (!heroTrack) return;
    const rect = heroTrack.getBoundingClientRect();
    heroTrackTop = rect.top + window.pageYOffset;
    heroTrackHeight = heroTrack.offsetHeight - window.innerHeight;
  }
  measureHeroTrack();
  window.addEventListener('resize', measureHeroTrack, { passive: true });

  function onScroll() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Navbar blur toggle
    if (siteNav) {
      if (scrollY > 50) {
        siteNav.classList.add('scrolled');
      } else {
        siteNav.classList.remove('scrolled');
      }
    }

    // Zero layout-thrashing: use cached measurements
    if (heroTrackHeight > 0) {
      const scrolled = scrollY - heroTrackTop;
      targetProgress = Math.min(Math.max(0, scrolled / heroTrackHeight), 1);

      if (!isTicking) {
        isTicking = true;
        requestAnimationFrame(updateScrollPhysics);
      }
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  function updateScrollPhysics() {
    // Pure butter-smooth 0.16 fluid momentum interpolation
    const diff = targetProgress - currentProgress;
    if (Math.abs(diff) > 0.0002) {
      currentProgress += diff * 0.16;
      isTicking = true;
      requestAnimationFrame(updateScrollPhysics);
    } else {
      currentProgress = targetProgress;
      isTicking = false;
    }

    currentFrame = Math.min(Math.floor(currentProgress * (TOTAL_FRAMES - 1)), TOTAL_FRAMES - 1);
    cacheSurroundingFrames(currentFrame, diff);
    renderCanvas(currentFrame);

    if (frameCounterEl && loadedCount >= TOTAL_FRAMES) {
      frameCounterEl.textContent = `FRAME: [${String(currentFrame + 1).padStart(3, '0')}/160]`;
    }

    updateHeroHUD(currentProgress);
  }

  // Smooth scroll for all hash links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href && href.length > 1) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // Initial calculation
  onScroll();

  function updateHeroHUD(progress) {
    let activePhase = 1;
    if (progress >= 0.82) activePhase = 4;
    else if (progress >= 0.54) activePhase = 3;
    else if (progress >= 0.22) activePhase = 2;

    // Only touch DOM if phase changes (prevents DOM thrashing on scroll)
    if (activePhase !== lastActivePhase) {
      lastActivePhase = activePhase;

      // Update Pills
      phasePills.forEach((pill) => {
        const p = parseInt(pill.getAttribute('data-phase'), 10);
        if (p === activePhase) {
          pill.classList.add('active');
        } else {
          pill.classList.remove('active');
        }
      });

      // Animate Phase 1
      if (hudPhase1) {
        if (activePhase === 1) {
          hudPhase1.style.opacity = '1';
          hudPhase1.style.transform = 'translateY(-50%) translateX(0)';
          hudPhase1.style.pointerEvents = 'auto';
        } else {
          hudPhase1.style.opacity = '0';
          hudPhase1.style.transform = 'translateY(-50%) translateX(-25px)';
          hudPhase1.style.pointerEvents = 'none';
        }
      }

      // Animate Phase 2 (Ingredients: Citrulline & Beta-Alanine)
      if (hudPhase2) {
        if (activePhase === 2) {
          hudPhase2.style.opacity = '1';
          hudPhase2.style.pointerEvents = 'auto';
        } else {
          hudPhase2.style.opacity = '0';
          hudPhase2.style.pointerEvents = 'none';
        }
      }

      // Animate Phase 3 (Energy: Caffeine & Alpha-GPC)
      if (hudPhase3) {
        if (activePhase === 3) {
          hudPhase3.style.opacity = '1';
          hudPhase3.style.pointerEvents = 'auto';
        } else {
          hudPhase3.style.opacity = '0';
          hudPhase3.style.pointerEvents = 'none';
        }
      }

      // Animate Phase 4 (Final Lockup & Handoff CTA)
      if (hudPhase4) {
        if (activePhase === 4) {
          hudPhase4.style.opacity = '1';
          hudPhase4.style.transform = 'translateX(-50%) translateY(0)';
          hudPhase4.style.pointerEvents = 'auto';
        } else {
          hudPhase4.style.opacity = '0';
          hudPhase4.style.transform = 'translateX(-50%) translateY(20px)';
          hudPhase4.style.pointerEvents = 'none';
        }
      }
    }
  }

  // 6. Interactive Phase Pill Click-to-Scroll
  phasePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const targetPhase = parseInt(pill.getAttribute('data-phase'), 10);
      const trackHeight = heroTrack.offsetHeight - window.innerHeight;
      let targetProgress = 0;

      if (targetPhase === 1) targetProgress = 0.02;
      else if (targetPhase === 2) targetProgress = 0.35;
      else if (targetPhase === 3) targetProgress = 0.65;
      else if (targetPhase === 4) targetProgress = 0.92;

      const targetScroll = heroTrack.offsetTop + targetProgress * trackHeight;
      window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    });
  });

  // Mobile Menu Toggle
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileMenu.classList.toggle('active');
    });

    document.querySelectorAll('.mobile-nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
      });
    });
  }

  // ==========================================================================
  // PRODUCT SHOWCASE: JACKET-MASTERS REFERENCE CAROUSEL (Upward Flight Motion)
  // ==========================================================================
  const PRODUCTS = [
    {
      id: "01",
      name: "ADDICTED",
      series: "ULTRA HIGH STIM",
      flavor: "BLUE RASPBERRY",
      tagline: "Maximum intensity for athletes demanding pure kinetic propulsion.",
      image: "public/products/blue-raspberry.webp",
      accent: "#00d2ff",
      bgGradient: "radial-gradient(circle at 50% 45%, #054563 0%, #032333 55%, #02111a 100%)",
      price: "$49",
      origPrice: "$59",
      benefits: [
        "Explosive Kinetic Energy",
        "Laser-Sharp Mental Focus",
        "Vascular Nitric Oxide Pump",
        "Zero Crash & Zero Sugar",
      ],
      keyIngredients: "350mg Caffeine • 6000mg L-Citrulline • 3200mg Beta-Alanine",
    },
    {
      id: "02",
      name: "ADDICTED",
      series: "NEURO MATRIX",
      flavor: "MIDNIGHT GRAPE",
      tagline: "Unrivaled mind-muscle synapse velocity for deep cognitive flow.",
      image: "public/products/grape.webp",
      accent: "#b026ff",
      bgGradient: "radial-gradient(circle at 50% 45%, #440e69 0%, #220636 55%, #0f0217 100%)",
      price: "$49",
      origPrice: "$59",
      benefits: [
        "Synaptic Transmission Boost",
        "Neurological Drive & Speed",
        "Total Dialed-In Tunnel Focus",
        "Euphoric Athletic Flow State",
      ],
      keyIngredients: "600mg Alpha-GPC • 350mg Caffeine • 200mcg Huperzine A",
    },
    {
      id: "03",
      name: "ADDICTED",
      series: "THERMOGENIC DRIVE",
      flavor: "ORANGE BLAST",
      tagline: "Metabolic acceleration coupled with crystalline mental clarity.",
      image: "public/products/watermelon.webp",
      accent: "#ff7700",
      bgGradient: "radial-gradient(circle at 50% 45%, #733105 0%, #3d1901 55%, #1a0a00 100%)",
      price: "$49",
      origPrice: "$59",
      benefits: [
        "Thermogenic Core Activation",
        "Sustained Mental Flow",
        "Zero Jitters Or Tachycardia",
        "Cellular Electrolyte Matrix",
      ],
      keyIngredients: "300mg Caffeine • 500mg L-Tyrosine • 100mg CognatiQ®",
    },
    {
      id: "04",
      name: "ADDICTED",
      series: "RAW INTENSITY",
      flavor: "SOUR APPLE",
      tagline: "Savage cell hydration and massive blood-flow saturation.",
      image: "public/products/sour-apple.webp",
      accent: "#22e566",
      bgGradient: "radial-gradient(circle at 50% 45%, #0e4c22 0%, #072912 55%, #021208 100%)",
      price: "$49",
      origPrice: "$59",
      benefits: [
        "Savage Muscle Fullness",
        "Rapid Cellular Hydration",
        "Intense Arterial Vascularity",
        "Peak Output Endurance",
      ],
      keyIngredients: "400mg Caffeine • 8000mg L-Citrulline • 2500mg Betaine",
    },
  ];

  // DOM Selectors
  const flavorTabs = document.querySelectorAll('.flavor-tab');
  const variantCircleBtns = document.querySelectorAll('.variant-circle-btn');
  const prodPrevBtn = document.getElementById('prodPrevBtn');
  const prodNextBtn = document.getElementById('prodNextBtn');
  const nextFlavorCard = document.getElementById('nextFlavorCard');
  const nextCardTitle = document.getElementById('nextCardTitle');
  const nextCardThumb = document.getElementById('nextCardThumb');

  const prodImgEl = document.getElementById('prodImg');
  const prodGroundShadow = document.getElementById('prodGroundShadow');
  const prodSeriesEl = document.getElementById('prodSeries');
  const prodTaglineEl = document.getElementById('prodTagline');
  const prodBenefitsEl = document.getElementById('prodBenefits');
  const prodBuyBtnEl = document.getElementById('prodBuyBtn');
  const prodPriceMain = document.getElementById('prodPriceMain');
  const prodPriceOrig = document.getElementById('prodPriceOrig');
  const prodActivesEl = document.getElementById('prodActives');
  const prodBgAmbient = document.getElementById('prodBgAmbient');
  const prodWatermark = document.getElementById('prodWatermark');
  const prodHeaderGradient = document.getElementById('prodHeaderGradient');
  const prodCountBadge = document.getElementById('prodCountBadge');
  const prodGlowBacking = document.getElementById('prodGlowBacking');
  const productsTrack = document.getElementById('productsTrack');

  let activeProductIndex = -1;
  let productTransitionTl = null;
  let idleFloatTween = null;

  // Idle floating breathing animation
  function startIdleFloat() {
    if (!prodImgEl || !prodGroundShadow || !window.gsap) return;
    if (idleFloatTween) idleFloatTween.kill();
    idleFloatTween = gsap.timeline({ repeat: -1, yoyo: true });
    idleFloatTween.to(prodImgEl, {
      y: -14,
      rotation: 1.2,
      duration: 2.8,
      ease: 'sine.inOut'
    }, 0);
    idleFloatTween.to(prodGroundShadow, {
      scaleX: 0.88,
      opacity: 0.45,
      duration: 2.8,
      ease: 'sine.inOut'
    }, 0);
  }

  function setProduct(index, isAnimated = true) {
    if (index === activeProductIndex) return;
    const p = PRODUCTS[index];
    if (!p) return;

    const prevIndex = activeProductIndex;
    activeProductIndex = index;

    // 1. Highlight top tabs & circular flavor selectors immediately
    flavorTabs.forEach((tab, i) => {
      if (i === index) tab.classList.add('active');
      else tab.classList.remove('active');
    });

    variantCircleBtns.forEach((btn, i) => {
      if (i === index) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    if (prodCountBadge) {
      prodCountBadge.textContent = `${p.id} // 04`;
    }

    // Compute Next Product for Bottom-Right Preview Card
    const nextIdx = (index + 1) % PRODUCTS.length;
    const nextProd = PRODUCTS[nextIdx];

    // Left and Right text containers for orchestrated slide
    const leftTextNodes = document.querySelectorAll('.prod-col-left > *');
    const rightTextNodes = document.querySelectorAll('.prod-col-right > *');

    // Initial render without animation: set all values instantly
    if (!isAnimated || !window.gsap || prevIndex === -1) {
      if (prodImgEl) {
        prodImgEl.src = p.image;
        prodImgEl.alt = `MAXIMUS ${p.name} ${p.flavor} Complete Packaging Box and Tub`;
        gsap.set(prodImgEl, { x: 0, y: 0, opacity: 1, scale: 1, rotation: 0 });
      }
      if (prodGroundShadow) {
        gsap.set(prodGroundShadow, { scaleX: 1, opacity: 0.6 });
      }
      if (prodWatermark) {
        prodWatermark.textContent = p.flavor;
        gsap.set(prodWatermark, { x: 0, opacity: 0.038 });
      }
      if (prodBgAmbient) {
        prodBgAmbient.style.background = p.bgGradient;
      }
      if (prodGlowBacking) {
        prodGlowBacking.style.background = `radial-gradient(circle, ${p.accent}42 0%, transparent 70%)`;
        gsap.set(prodGlowBacking, { scale: 1, opacity: 1 });
      }

      if (prodSeriesEl) prodSeriesEl.textContent = `${p.id} — ${p.series}`;
      if (prodHeaderGradient) {
        prodHeaderGradient.style.background = `linear-gradient(90deg, #ffffff 0%, ${p.accent} 100%)`;
        prodHeaderGradient.style.webkitBackgroundClip = 'text';
        prodHeaderGradient.style.webkitTextFillColor = 'transparent';
      }
      if (prodTaglineEl) prodTaglineEl.textContent = p.tagline;
      if (prodActivesEl) prodActivesEl.textContent = p.keyIngredients;
      if (prodPriceMain) prodPriceMain.textContent = p.price;
      if (prodPriceOrig) prodPriceOrig.textContent = p.origPrice;

      if (prodBenefitsEl) {
        prodBenefitsEl.innerHTML = p.benefits
          .map(
            (b) => `
          <li class="prod-benefit-item">
            <span class="prod-benefit-bullet" style="background: ${p.accent}20; color: ${p.accent}; border: 1px solid ${p.accent}">✓</span>
            <span>${b}</span>
          </li>
        `
          )
          .join('');
      }

      if (prodBuyBtnEl) {
        prodBuyBtnEl.innerHTML = `<span>Get The Flavor</span><span>›</span>`;
        prodBuyBtnEl.style.backgroundColor = p.accent;
        prodBuyBtnEl.style.color = (index === 0 || index === 3) ? '#08080a' : '#ffffff';
        prodBuyBtnEl.onclick = () => alert(`Added MAXIMUS ${p.flavor} (${p.price}) to cart!`);
      }

      if (nextCardTitle) nextCardTitle.textContent = nextProd.flavor;
      if (nextCardThumb) nextCardThumb.src = nextProd.image;

      gsap.set([...leftTextNodes, ...rightTextNodes], { y: 0, opacity: 1 });
      startIdleFloat();
      return;
    }

    // Direction calculation:
    // User reference style: Outgoing product flies UPWARD and out!
    const dir = index < prevIndex ? -1 : 1;

    // Interrupt any active transition
    if (idleFloatTween) idleFloatTween.kill();
    if (productTransitionTl) productTransitionTl.kill();
    gsap.killTweensOf([prodImgEl, prodGroundShadow, prodWatermark, prodGlowBacking, ...leftTextNodes, ...rightTextNodes]);

    // Build Master Exit -> Entrance Timeline
    productTransitionTl = gsap.timeline({
      onComplete: () => {
        startIdleFloat();
      }
    });

    // ------------------------------------------------------------------------
    // PHASE 1: CHOREOGRAPHED UPWARD FLIGHT EXIT (Reference Image 2 style)
    // The current product floats UPWARD & OUT to the top-left, shadow shrinks
    // ------------------------------------------------------------------------
    if (prodImgEl) {
      productTransitionTl.to(prodImgEl, {
        y: -170,
        x: -75 * dir,
        rotation: -10 * dir,
        scale: 0.84,
        opacity: 0,
        duration: 0.42,
        ease: 'power2.in',
      }, 0);
    }

    if (prodGroundShadow) {
      productTransitionTl.to(prodGroundShadow, {
        scaleX: 0.3,
        opacity: 0,
        duration: 0.35,
        ease: 'power2.in',
      }, 0);
    }

    if (prodGlowBacking) {
      productTransitionTl.to(prodGlowBacking, {
        scale: 0.65,
        opacity: 0.15,
        duration: 0.35,
        ease: 'power2.in',
      }, 0);
    }

    if (prodWatermark) {
      productTransitionTl.to(prodWatermark, {
        x: -80 * dir,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
      }, 0);
    }

    // Stagger slide-up exit for left and right text blocks
    if (leftTextNodes.length) {
      productTransitionTl.to(leftTextNodes, {
        y: -25,
        opacity: 0,
        duration: 0.26,
        stagger: 0.02,
        ease: 'power2.in',
      }, 0);
    }

    if (rightTextNodes.length) {
      productTransitionTl.to(rightTextNodes, {
        y: -25,
        opacity: 0,
        duration: 0.26,
        stagger: 0.02,
        ease: 'power2.in',
      }, 0);
    }

    // ------------------------------------------------------------------------
    // PHASE 2: IN-BETWEEN DOM SWAP & INCOMING POSITION STAGING
    // ------------------------------------------------------------------------
    productTransitionTl.add(() => {
      // 1. Swap product image & stage at bottom-right entrance
      if (prodImgEl) {
        prodImgEl.src = p.image;
        prodImgEl.alt = `MAXIMUS ${p.name} ${p.flavor} Complete Packaging Box and Tub`;
        gsap.set(prodImgEl, {
          y: 160,
          x: 75 * dir,
          rotation: 9 * dir,
          scale: 0.84,
          opacity: 0,
        });
      }

      if (prodGroundShadow) {
        gsap.set(prodGroundShadow, { scaleX: 0.3, opacity: 0 });
      }

      // 2. Full-bleed background color shift to new flavor theme
      if (prodBgAmbient) {
        prodBgAmbient.style.background = p.bgGradient;
      }
      if (prodGlowBacking) {
        prodGlowBacking.style.background = `radial-gradient(circle, ${p.accent}42 0%, transparent 70%)`;
        gsap.set(prodGlowBacking, { scale: 0.7, opacity: 0.2 });
      }
      if (prodWatermark) {
        prodWatermark.textContent = p.flavor;
        gsap.set(prodWatermark, { x: 80 * dir, opacity: 0 });
      }

      // 3. Update left headline, tagline, benefits
      if (prodSeriesEl) prodSeriesEl.textContent = `${p.id} — ${p.series}`;
      if (prodHeaderGradient) {
        prodHeaderGradient.style.background = `linear-gradient(90deg, #ffffff 0%, ${p.accent} 100%)`;
        prodHeaderGradient.style.webkitBackgroundClip = 'text';
        prodHeaderGradient.style.webkitTextFillColor = 'transparent';
      }
      if (prodTaglineEl) prodTaglineEl.textContent = p.tagline;

      if (prodBenefitsEl) {
        prodBenefitsEl.innerHTML = p.benefits
          .map(
            (b) => `
          <li class="prod-benefit-item">
            <span class="prod-benefit-bullet" style="background: ${p.accent}20; color: ${p.accent}; border: 1px solid ${p.accent}">✓</span>
            <span>${b}</span>
          </li>
        `
          )
          .join('');
      }

      if (prodBuyBtnEl) {
        prodBuyBtnEl.innerHTML = `<span>Get The Flavor</span><span>›</span>`;
        prodBuyBtnEl.style.backgroundColor = p.accent;
        prodBuyBtnEl.style.color = (index === 0 || index === 3) ? '#08080a' : '#ffffff';
        prodBuyBtnEl.onclick = () => alert(`Added MAXIMUS ${p.flavor} (${p.price}) to cart!`);
      }

      // 4. Update right column prices and actives
      if (prodPriceMain) prodPriceMain.textContent = p.price;
      if (prodPriceOrig) prodPriceOrig.textContent = p.origPrice;
      if (prodActivesEl) prodActivesEl.textContent = p.keyIngredients;

      // 5. Update next preview thumbnail
      if (nextCardTitle) nextCardTitle.textContent = nextProd.flavor;
      if (nextCardThumb) nextCardThumb.src = nextProd.image;

      // Stage text nodes below for upward cascade
      gsap.set([...leftTextNodes, ...rightTextNodes], { y: 30, opacity: 0 });
    });

    // ------------------------------------------------------------------------
    // PHASE 3: HEROIC ENTRANCE (New product swoops into center, text cascades in)
    // ------------------------------------------------------------------------
    if (prodImgEl) {
      productTransitionTl.to(prodImgEl, {
        y: 0,
        x: 0,
        rotation: 0,
        scale: 1,
        opacity: 1,
        duration: 0.65,
        ease: 'back.out(1.18)',
      });
    }

    if (prodGroundShadow) {
      productTransitionTl.to(prodGroundShadow, {
        scaleX: 1,
        opacity: 0.6,
        duration: 0.6,
        ease: 'power2.out',
      }, '<0.05');
    }

    if (prodGlowBacking) {
      productTransitionTl.to(prodGlowBacking, {
        scale: 1.15,
        opacity: 1,
        duration: 0.6,
        ease: 'power2.out',
      }, '<');
    }

    if (prodWatermark) {
      productTransitionTl.to(prodWatermark, {
        x: 0,
        opacity: 0.038,
        duration: 0.55,
        ease: 'power3.out',
      }, '<');
    }

    // Cascade in left & right text blocks
    if (leftTextNodes.length) {
      productTransitionTl.to(leftTextNodes, {
        y: 0,
        opacity: 1,
        duration: 0.48,
        stagger: 0.04,
        ease: 'power3.out',
      }, '<0.08');
    }

    if (rightTextNodes.length) {
      productTransitionTl.to(rightTextNodes, {
        y: 0,
        opacity: 1,
        duration: 0.48,
        stagger: 0.04,
        ease: 'power3.out',
      }, '<0.08');
    }

    // Micro-bounce on next flavor thumbnail card
    if (nextFlavorCard) {
      productTransitionTl.fromTo(nextFlavorCard,
        { scale: 0.94, opacity: 0.7 },
        { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.5)' },
        '<0.1'
      );
    }
  }

  // Quick navigation helpers
  function nextProduct() {
    const targetIdx = (activeProductIndex + 1) % PRODUCTS.length;
    setProduct(targetIdx, true);
    syncScrollToProduct(targetIdx);
  }

  function prevProduct() {
    const targetIdx = (activeProductIndex - 1 + PRODUCTS.length) % PRODUCTS.length;
    setProduct(targetIdx, true);
    syncScrollToProduct(targetIdx);
  }

  function syncScrollToProduct(idx) {
    if (!productsTrack) return;
    const trackTop = productsTrack.offsetTop;
    const trackHeight = productsTrack.offsetHeight - window.innerHeight;
    const targetProgress = (idx + 0.12) / PRODUCTS.length;
    const targetY = trackTop + targetProgress * trackHeight;
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  }

  // Bind Next / Prev buttons
  if (prodNextBtn) {
    prodNextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      nextProduct();
    });
  }

  if (prodPrevBtn) {
    prodPrevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      prevProduct();
    });
  }

  // Bind Bottom-Right Next Product Preview Card Click
  if (nextFlavorCard) {
    nextFlavorCard.addEventListener('click', (e) => {
      e.preventDefault();
      nextProduct();
    });
  }

  // Bind Circular Variant Pills (01, 02, 03, 04, 05)
  variantCircleBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      setProduct(idx, true);
      syncScrollToProduct(idx);
    });
  });

  // Bind Top Flavor Tabs
  flavorTabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const idx = parseInt(tab.getAttribute('data-index'), 10);
      setProduct(idx, true);
      syncScrollToProduct(idx);
    });
  });

  // Initialize first product immediately
  setProduct(0, false);

  // Scroll-Driven Pinned Engine for Products Track
  function initProductsScroll() {
    if (!productsTrack) return;

    let productsTrackTop = 0;
    let productsTrackHeight = 0;

    function measureProductsTrack() {
      if (!productsTrack) return;
      const rect = productsTrack.getBoundingClientRect();
      productsTrackTop = rect.top + window.pageYOffset;
      productsTrackHeight = productsTrack.offsetHeight - window.innerHeight;
    }
    measureProductsTrack();
    window.addEventListener('resize', measureProductsTrack, { passive: true });

    window.addEventListener('scroll', () => {
      if (productsTrackHeight <= 0) return;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const scrolled = scrollY - productsTrackTop;
      if (scrolled >= 0 && scrolled <= productsTrackHeight) {
        const progress = Math.min(Math.max(0, scrolled / productsTrackHeight), 1);
        const targetIndex = Math.min(Math.floor(progress * PRODUCTS.length), PRODUCTS.length - 1);
        if (targetIndex !== activeProductIndex) {
          setProduct(targetIndex, true);
        }
      }
    }, { passive: true });
  }
  initProductsScroll();

  // ==========================================================================
  // NEXT-LEVEL GSAP & SCROLLTRIGGER ENGINE (Awwwards-Grade Cinematic Motion)
  // ==========================================================================
  function initGlobalGsapAnimations() {
    if (!window.gsap) return;
    if (window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }

    // ------------------------------------------------------------------------
    // 1. PHILOSOPHY SECTION: 3D REVEAL, DYNAMIC COUNTERS & MAGNETIC CARDS
    // ------------------------------------------------------------------------
    const philosophyHeadline = document.querySelector('.section-philosophy .editorial-headline');
    if (philosophyHeadline) {
      gsap.fromTo(philosophyHeadline, 
        { y: 50, opacity: 0 },
        {
          scrollTrigger: {
            trigger: '.section-philosophy',
            start: 'top 80%',
          },
          y: 0,
          opacity: 1,
          duration: 1.1,
          ease: 'power3.out',
        }
      );
    }

    // Staggered 3D Flip-In for Spec Cards
    const specCards = document.querySelectorAll('.spec-card');
    if (specCards.length) {
      gsap.fromTo(specCards,
        { y: 60, opacity: 0, rotationX: 20, scale: 0.94 },
        {
          scrollTrigger: {
            trigger: '.specs-ledger',
            start: 'top 85%',
          },
          y: 0,
          opacity: 1,
          rotationX: 0,
          scale: 1,
          duration: 0.85,
          stagger: 0.12,
          ease: 'power3.out',
          onComplete: () => {
            // Animate Numeric Counters
            document.querySelectorAll('.counter-val').forEach((counter) => {
              const target = parseInt(counter.getAttribute('data-target'), 10) || 0;
              const obj = { val: 0 };
              gsap.to(obj, {
                val: target,
                duration: 1.6,
                ease: 'power2.out',
                onUpdate: () => {
                  counter.textContent = Math.round(obj.val);
                }
              });
            });
          }
        }
      );

      // Interactive 3D Tilt on Spec Cards
      specCards.forEach((card) => {
        const glow = card.querySelector('.spec-glow-overlay');
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = -((y - centerY) / centerY) * 12;
          const rotateY = ((x - centerX) / centerX) * 12;

          gsap.to(card, {
            rotationX: rotateX,
            rotationY: rotateY,
            scale: 1.02,
            duration: 0.3,
            ease: 'power2.out',
            transformPerspective: 800,
          });

          if (glow) {
            glow.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255, 44, 44, 0.22) 0%, transparent 60%)`;
            glow.style.opacity = '1';
          }
        });

        card.addEventListener('mouseleave', () => {
          gsap.to(card, {
            rotationX: 0,
            rotationY: 0,
            scale: 1,
            duration: 0.6,
            ease: 'elastic.out(1, 0.4)',
          });
          if (glow) {
            glow.style.opacity = '0';
          }
        });
      });
    }

    // ------------------------------------------------------------------------
    // 1.5. FORMULATION SCIENCE: CINEMATIC KINETIC EDITORIAL ENTRANCE
    // ------------------------------------------------------------------------
    const formulationSection = document.querySelector('.formulation-section') || document.querySelector('#performance');
    if (formulationSection) {
      const badge = document.getElementById('formulationBadge');
      const badgeBorder = badge ? badge.querySelector('.badge-border-line') : null;
      const badgeScan = badge ? badge.querySelector('.badge-scan-highlight') : null;
      const headline = document.querySelector('.formulation-headline');
      const formulatedWord = document.getElementById('wordFormulated');
      const forWrap = document.getElementById('wordForWrap');
      const forStreak = document.getElementById('forStreak');
      const intensityWord = document.getElementById('wordIntensity');
      const intensityBgGlow = document.getElementById('intensityBgGlow');
      const trail1 = document.querySelector('.intensity-trail.trail-1');
      const trail2 = document.querySelector('.intensity-trail.trail-2');
      const descLines = document.querySelectorAll('.formulation-copy .desc-line');

      // Helper to split text into individual character spans
      function splitTextToChars(el) {
        if (!el) return [];
        const str = el.textContent.trim();
        el.innerHTML = '';
        const charElements = [];
        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          const span = document.createElement('span');
          span.className = 'char-span';
          span.textContent = char;
          el.appendChild(span);
          charElements.push(span);
        }
        return charElements;
      }

      const formulatedChars = splitTextToChars(formulatedWord);
      const intensityChars = splitTextToChars(intensityWord);

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        gsap.set([badge, headline, descLines, formulatedWord, forWrap, intensityWord], {
          opacity: 1,
          visibility: 'visible',
          filter: 'none',
          transform: 'none',
          clipPath: 'none'
        });
      } else {
        // Initial States (purely hardware-accelerated transforms - no heavy filter: blur)
        gsap.set(badge, { opacity: 0, x: -20, scaleX: 0.85 });
        if (badgeBorder) gsap.set(badgeBorder, { scaleX: 0 });
        if (badgeScan) gsap.set(badgeScan, { x: -60 });

        gsap.set(formulatedChars, {
          yPercent: 100,
          opacity: 0,
          scale: 0.96
        });

        gsap.set(forWrap, {
          clipPath: 'inset(0 100% 0 0)',
          x: -30
        });
        if (forStreak) gsap.set(forStreak, { xPercent: -120, opacity: 0 });

        gsap.set(intensityChars, {
          yPercent: 100,
          opacity: 0,
          scale: 0.96
        });

        if (intensityBgGlow) gsap.set(intensityBgGlow, { xPercent: -20, opacity: 0 });

        gsap.set(descLines, {
          yPercent: 100,
          opacity: 0
        });

        // Master Entrance Timeline (plays buttery-smooth once when scrolled into view)
        const entranceTl = gsap.timeline({
          scrollTrigger: {
            trigger: formulationSection,
            start: 'top 80%',
            once: true
          },
          onComplete: () => {
            // Free GPU layer memory once entrance settles
            gsap.set([badge, headline, formulatedWord, forWrap, intensityWord, ...formulatedChars, ...intensityChars, ...descLines], {
              clearProps: 'willChange'
            });
          }
        });

        // 0.00 Badge entrance
        entranceTl.to(badge, {
          opacity: 1,
          x: 0,
          scaleX: 1,
          duration: 0.5,
          ease: 'power3.out'
        }, 0.00);

        if (badgeBorder) {
          entranceTl.to(badgeBorder, {
            scaleX: 1,
            duration: 0.45,
            ease: 'power3.out'
          }, 0.08);
        }

        if (badgeScan) {
          entranceTl.fromTo(badgeScan,
            { x: -50 },
            { x: 300, duration: 0.6, ease: 'power2.inOut' },
            0.15
          );
        }

        // 0.15 "FORMULATED" characters rise cleanly
        entranceTl.to(formulatedChars, {
          yPercent: 0,
          opacity: 1,
          scale: 1,
          duration: 0.65,
          ease: 'power4.out',
          stagger: {
            each: 0.018,
            from: 'center'
          }
        }, 0.15);

        // FORMULATED subtle settle
        entranceTl.fromTo(formulatedWord,
          { scale: 0.96 },
          { scale: 1, duration: 0.25, ease: 'back.out(1.5)' },
          0.45
        );

        // 0.28 "FOR" red slide reveal
        entranceTl.to(forWrap, {
          clipPath: 'inset(0 0% 0 0)',
          x: 0,
          duration: 0.5,
          ease: 'power3.out'
        }, 0.28);

        if (forStreak) {
          entranceTl.fromTo(forStreak,
            { xPercent: -130, opacity: 0 },
            { 
              xPercent: 150, 
              opacity: 0.85, 
              duration: 0.45, 
              ease: 'power2.inOut',
              onComplete: () => {
                gsap.set(forStreak, { opacity: 0 });
              }
            },
            0.5
          );
        }

        // 0.38 "INTENSITY." characters rise cleanly
        entranceTl.to(intensityChars, {
          yPercent: 0,
          opacity: 1,
          scale: 1,
          duration: 0.65,
          ease: 'power4.out',
          stagger: {
            each: 0.018,
            from: 'center'
          }
        }, 0.38);

        // INTENSITY settle punch
        entranceTl.fromTo(intensityWord,
          { scale: 0.96 },
          { scale: 1, duration: 0.25, ease: 'back.out(1.5)' },
          0.62
        );

        // 0.55 Description lines reveal cleanly via overflow mask
        entranceTl.to(descLines, {
          yPercent: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out'
        }, 0.55);

        // Subtle background glow
        if (intensityBgGlow) {
          entranceTl.fromTo(intensityBgGlow,
            { xPercent: -20, opacity: 0 },
            { xPercent: 5, opacity: 0.2, duration: 0.45, ease: 'power2.out' },
            0.65
          );
          entranceTl.to(intensityBgGlow, {
            xPercent: 25,
            opacity: 0,
            duration: 0.4,
            ease: 'power2.in'
          }, 1.05);
        }
      }
    }

    // ------------------------------------------------------------------------
    // 2. PERFORMANCE PILLARS: ALTERNATING LEFT & RIGHT DUAL-DIRECTION (FAST & WIDE)
    // ------------------------------------------------------------------------
    const pillarRows = document.querySelectorAll('.pillar-row');
    if (pillarRows.length) {
      const isMobile = window.innerWidth < 768;
      const initialShift = isMobile ? 220 : 420; // Starts from further back as requested

      // Set initial states: Odd rows from far LEFT (-x), Even rows from far RIGHT (+x)
      pillarRows.forEach((row, idx) => {
        const fill = row.querySelector('.pillar-gauge-fill');
        const num = row.querySelector('.pillar-num');
        const valEl = row.querySelector('.gauge-val');
        const startX = (idx % 2 === 0) ? -initialShift : initialShift;

        gsap.set(row, { x: startX, opacity: 0 });
        if (num) gsap.set(num, { scale: 0.75, opacity: 0 });
        if (fill) gsap.set(fill, { scaleX: 0 });
        if (valEl) valEl.textContent = '0.0% PEAK';
      });

      function animateSinglePillarRow(row, idx) {
        if (row.dataset.hasAnimated === 'true') return;
        row.dataset.hasAnimated = 'true';

        const fill = row.querySelector('.pillar-gauge-fill');
        const num = row.querySelector('.pillar-num');
        const valEl = row.querySelector('.gauge-val');
        const scanline = row.querySelector('.pillar-laser-scan');
        const targetPercent = fill ? (parseFloat(fill.getAttribute('data-progress')) || 99.4) : 99.4;
        const progressTarget = targetPercent / 100;

        const rowTl = gsap.timeline({
          onComplete: () => {
            gsap.set(row, { clearProps: 'willChange' });
          }
        });

        // 1. Fast & snappy entrance sweep from Left / Right (0.28s power4.out)
        rowTl.to(row, {
          x: 0,
          opacity: 1,
          duration: 0.28,
          ease: 'power4.out'
        }, 0);

        // 2. Large Number punch pop (fast 0.18s)
        if (num) {
          rowTl.to(num, {
            scale: 1,
            opacity: 1,
            duration: 0.18,
            ease: 'back.out(2.5)'
          }, 0.03);
        }

        // 3. Fast laser scanline sweep (0.25s)
        if (scanline) {
          rowTl.fromTo(scanline,
            { y: 0, opacity: 0 },
            {
              y: 200,
              opacity: 0.95,
              duration: 0.25,
              ease: 'power2.inOut',
              onComplete: () => {
                gsap.set(scanline, { opacity: 0 });
              }
            },
            0.05
          );
        }

        // 4. Snappy Telemetry Gauge Fill expansion (fast 0.32s)
        if (fill) {
          rowTl.to(fill, {
            scaleX: progressTarget,
            duration: 0.32,
            ease: 'power2.out'
          }, 0.06);
        }

        // 5. Fast live counter count-up (fast 0.32s)
        if (valEl) {
          const counterObj = { val: 0 };
          rowTl.to(counterObj, {
            val: targetPercent,
            duration: 0.32,
            ease: 'power2.out',
            onUpdate: () => {
              valEl.textContent = `${counterObj.val.toFixed(1)}% PEAK`;
            }
          }, 0.06);
        }
      }

      // Primary: Native IntersectionObserver (triggers swiftly on entrance without scroll fight)
      if ('IntersectionObserver' in window) {
        const pillarObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const idx = Array.from(pillarRows).indexOf(entry.target);
              animateSinglePillarRow(entry.target, idx);
            }
          });
        }, { threshold: 0.05 });

        pillarRows.forEach((row) => pillarObserver.observe(row));
      } else {
        pillarRows.forEach((row, idx) => animateSinglePillarRow(row, idx));
      }

      // Interactive 3D Tilt & Dynamic Cursor Spotlight
      pillarRows.forEach((row) => {
        const ambientGlow = row.querySelector('.pillar-ambient-glow');
        const rotateXTilt = gsap.quickTo(row, 'rotateX', { duration: 0.4, ease: 'power2.out' });
        const rotateYTilt = gsap.quickTo(row, 'rotateY', { duration: 0.4, ease: 'power2.out' });

        row.addEventListener('mousemove', (e) => {
          const rect = row.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const xPercent = (x / rect.width) - 0.5;
          const yPercent = (y / rect.height) - 0.5;

          rotateXTilt(-yPercent * 6);
          rotateYTilt(xPercent * 5);

          if (ambientGlow) {
            ambientGlow.style.left = `${x}px`;
            ambientGlow.style.top = `${y}px`;
            ambientGlow.style.opacity = '1';
          }
        });

        row.addEventListener('mouseleave', () => {
          rotateXTilt(0);
          rotateYTilt(0);
          if (ambientGlow) {
            ambientGlow.style.opacity = '0';
          }
        });
      });
    }

    // ------------------------------------------------------------------------
    // 3. INSIDE THE FORMULA: AWWWARDS-GRADE 3D TELEMETRY & SCROLL CHOREOGRAPHY
    // (Every-time scroll reactive • Reversible • Deep 3D Levitation • Live Scrub Parallax)
    // ------------------------------------------------------------------------
    const formulaSection = document.getElementById('formula');
    const formulaPill = document.getElementById('formulaPill');
    const formulaHeadline = document.getElementById('formulaHeadline');
    const formulaCopy = document.getElementById('formulaCopy');
    const formulaTabs = document.querySelectorAll('.open-tub-tab');
    const formulaFeatures = document.querySelectorAll('.formula-feature-item');
    const openTubStage = document.getElementById('openTubStage');
    const openTubLayers = document.getElementById('openTubLayers');
    const openTubGlow = document.getElementById('openTubGlow');
    const radarRings = document.querySelectorAll('.formula-radar-ring');
    const hudPinLeft = document.getElementById('hudPinLeft');
    const hudPinRight = document.getElementById('hudPinRight');
    const deckSection = document.querySelector('.open-tubs-gallery-wrap');
    const deckHeader = document.querySelector('.gallery-header-row');
    const deckCards = document.querySelectorAll('.open-tub-card');

    if (formulaSection && openTubStage) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        gsap.set([formulaPill, formulaHeadline, formulaCopy, openTubLayers, ...formulaTabs, ...formulaFeatures, ...deckCards], {
          opacity: 1,
          visibility: 'visible',
          transform: 'none',
        });
      } else {
        // ------------------------        // --------------------------------------------------------------------
        // A. FORMULA STAGE MASTER ENTRANCE (Runs smoothly on first scroll into view)
        // --------------------------------------------------------------------
        const formulaEntranceTl = gsap.timeline({
          scrollTrigger: {
            trigger: formulaSection,
            start: 'top 80%',
            once: true,
          },
          onComplete: () => {
            gsap.set([openTubLayers, openTubGlow, hudPinLeft, hudPinRight], { clearProps: 'willChange' });
          }
        });

        // 1. Left Column: Pill + 3D Masked Headline + Copy
        if (formulaPill) {
          formulaEntranceTl.fromTo(formulaPill,
            { x: -50, opacity: 0, scale: 0.88 },
            { x: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' },
            0
          );
        }

        if (formulaHeadline) {
          formulaEntranceTl.fromTo(formulaHeadline,
            { y: 65, opacity: 0, rotationX: 25 },
            { y: 0, opacity: 1, rotationX: 0, duration: 0.85, ease: 'power4.out' },
            0.06
          );
        }

        if (formulaCopy) {
          formulaEntranceTl.fromTo(formulaCopy,
            { y: 35, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out' },
            0.14
          );
        }

        // 2. Flavor Switcher Tabs Stagger
        if (formulaTabs.length) {
          formulaEntranceTl.fromTo(formulaTabs,
            { y: 25, scale: 0.85, opacity: 0 },
            { y: 0, scale: 1, opacity: 1, duration: 0.5, stagger: 0.07, ease: 'back.out(2)' },
            0.2
          );
        }

        // 3. Clinical Feature Checkmark Bullets Cascade
        if (formulaFeatures.length) {
          formulaEntranceTl.fromTo(formulaFeatures,
            { x: -35, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.55, stagger: 0.08, ease: 'power3.out' },
            0.28
          );
        }

        // 4. Right Stage: Radar Rings Supersonic Expansion
        if (radarRings.length) {
          formulaEntranceTl.fromTo(radarRings,
            { scale: 0.25, opacity: 0, rotation: -90 },
            { scale: 1, opacity: 1, rotation: 0, duration: 1.1, stagger: 0.18, ease: 'power3.out' },
            0.1
          );
        }

        // 5. Open Tub Multi-Layer 3D Levitation Drop
        if (openTubLayers) {
          formulaEntranceTl.fromTo(openTubLayers,
            { y: -80, scale: 0.8, opacity: 0 },
            { y: 0, scale: 1, opacity: 1, duration: 0.85, ease: 'back.out(1.4)' },
            0.18
          );
        }

        // 6. Holographic Ambient Stage Glow Burst
        if (openTubGlow) {
          formulaEntranceTl.fromTo(openTubGlow,
            { scale: 0.35, opacity: 0 },
            { scale: 1.25, opacity: 0.85, duration: 0.7, ease: 'power2.out' },
            0.25
          );
          formulaEntranceTl.to(openTubGlow, { scale: 1, opacity: 0.5, duration: 0.5, ease: 'power1.inOut' }, 0.95);
        }

        // 7. Tactical HUD Pins Cross-Shoot
        if (hudPinLeft) {
          formulaEntranceTl.fromTo(hudPinLeft,
            { x: -70, y: -30, scale: 0.75, opacity: 0 },
            { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.65, ease: 'back.out(1.8)' },
            0.35
          );
        }
        if (hudPinRight) {
          formulaEntranceTl.fromTo(hudPinRight,
            { x: 70, y: 30, scale: 0.75, opacity: 0 },
            { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.65, ease: 'back.out(1.8)' },
            0.4
          );
        }

        // Continuous subtle idle floating on HUD pins
        gsap.to('.pin-top-left', { y: -9, rotation: -1.5, duration: 2.7, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        gsap.to('.pin-bottom-right', { y: 9, rotation: 1.5, duration: 3.1, repeat: -1, yoyo: true, ease: 'sine.inOut' });

        // --------------------------------------------------------------------
        // C. ALL 4 OPEN TUBS DECK GALLERY (Smooth, Non-blocking 3D Stagger Entrance)
        // --------------------------------------------------------------------
        if (deckSection && deckCards.length) {
          const deckEntranceTl = gsap.timeline({
            scrollTrigger: {
              trigger: deckSection,
              start: 'top 85%',
              once: true,
            },
            onComplete: () => {
              gsap.set(deckCards, { clearProps: 'willChange' });
            }
          });

          if (deckHeader) {
            deckEntranceTl.fromTo(deckHeader,
              { y: 40, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out' },
              0
            );
          }

          // 4 Open Tub Deck Cards: 3D fan cascade from deep space
          deckCards.forEach((card, idx) => {
            const tubImg = card.querySelector('.card-img-wrap img');
            const pill = card.querySelector('.card-status-pill');
            const glow = card.querySelector('.card-glow');
            const cardAngles = [
              { x: -35, rotY: 12, rotZ: -2 },
              { x: -10, rotY: 4, rotZ: -1 },
              { x: 10, rotY: -4, rotZ: 1 },
              { x: 35, rotY: -12, rotZ: 2 }
            ];
            const cfg = cardAngles[idx] || { x: 0, rotY: 0, rotZ: 0 };
            const dDelay = 0.1 + (idx * 0.08);

            deckEntranceTl.fromTo(card,
              {
                x: cfg.x,
                y: 80,
                rotationY: cfg.rotY,
                rotationX: 15,
                rotationZ: cfg.rotZ,
                scale: 0.9,
                opacity: 0,
              },
              {
                x: 0,
                y: 0,
                rotationY: 0,
                rotationX: 0,
                rotationZ: 0,
                scale: 1,
                opacity: 1,
                duration: 0.75,
                ease: 'power3.out',
              },
              dDelay
            );

            if (tubImg) {
              deckEntranceTl.fromTo(tubImg,
                { y: -25, scale: 0.85, opacity: 0 },
                { y: 0, scale: 1, opacity: 1, duration: 0.65, ease: 'back.out(1.5)' },
                dDelay + 0.08
              );
            }

            if (glow) {
              deckEntranceTl.fromTo(glow,
                { opacity: 0, scale: 0.5 },
                { opacity: 0.8, scale: 1, duration: 0.4, ease: 'power2.out' },
                dDelay + 0.12
              );
            }

            if (pill) {
              deckEntranceTl.fromTo(pill,
                { scale: 0.7, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' },
                dDelay + 0.15
              );
            }
          });
        }              }
            );
          });

          // Interactive 3D Cursor Gyro Tilt on Deck Cards
          deckCards.forEach((card) => {
            const cardImg = card.querySelector('.card-img-wrap img');
            const rotX = gsap.quickTo(card, 'rotationX', { duration: 0.35, ease: 'power2.out' });
            const rotY = gsap.quickTo(card, 'rotationY', { duration: 0.35, ease: 'power2.out' });
            const imgX = cardImg ? gsap.quickTo(cardImg, 'x', { duration: 0.4, ease: 'power2.out' }) : null;
            const imgY = cardImg ? gsap.quickTo(cardImg, 'y', { duration: 0.4, ease: 'power2.out' }) : null;

            card.addEventListener('mousemove', (e) => {
              const rect = card.getBoundingClientRect();
              const xPercent = (e.clientX - rect.left) / rect.width - 0.5;
              const yPercent = (e.clientY - rect.top) / rect.height - 0.5;

              rotX(-yPercent * 14);
              rotY(xPercent * 14);

              if (imgX && imgY) {
                imgX(xPercent * 15);
                imgY(yPercent * 15);
              }
            });

            card.addEventListener('mouseleave', () => {
              rotX(0);
              rotY(0);
              if (imgX && imgY) {
                imgX(0);
                imgY(0);
              }
              gsap.to(card, {
                rotationX: 0,
                rotationY: 0,
                duration: 0.7,
                ease: 'elastic.out(1, 0.4)',
              });
            });
          });
        }

        // --------------------------------------------------------------------
        // D. INTERACTIVE 3D TELEMETRY TUBE ROTATION (Cursor on Stage)
        // --------------------------------------------------------------------
        const rotateXTilt = gsap.quickTo(openTubLayers, 'rotationX', { duration: 0.5, ease: 'power2.out' });
        const rotateYTilt = gsap.quickTo(openTubLayers, 'rotationY', { duration: 0.5, ease: 'power2.out' });
        const levitateYTilt = gsap.quickTo(openTubLayers, 'y', { duration: 0.5, ease: 'power2.out' });

        openTubStage.addEventListener('mousemove', (e) => {
          const rect = openTubStage.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;

          rotateYTilt(x * 24);
          rotateXTilt(-y * 18);
          levitateYTilt(y * 12);
        });

        openTubStage.addEventListener('mouseleave', () => {
          rotateXTilt(0);
          rotateYTilt(0);
          levitateYTilt(0);
        });
      }
    }

    // ------------------------------------------------------------------------
    // 3.5. COMPLETE PRODUCT ARSENAL: AWWWARDS-GRADE 3D SCROLL CHOREOGRAPHY
    // (Every-time scroll reactive • Reversible • Deep 3D Space • Scrubbed Parallax)
    // ------------------------------------------------------------------------
    const arsenalSection = document.getElementById('arsenal');
    const arsenalGrid = document.getElementById('arsenalGrid');
    const arsenalCards = document.querySelectorAll('.arsenal-card');
    const arsenalBadge = document.querySelector('.section-arsenal .section-badge');
    const arsenalHeadline = document.querySelector('.arsenal-headline');
    const arsenalSubcopy = document.querySelector('.arsenal-subcopy');
    const arsenalGuar = document.querySelector('.arsenal-guarantee-pill');
    const arsenalFooter = document.getElementById('arsenalFooterAction');
    const arsenalAmbientBg = document.querySelector('.arsenal-ambient-bg');

    if (arsenalSection && arsenalCards.length) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        gsap.set([arsenalBadge, arsenalHeadline, arsenalSubcopy, arsenalGuar, arsenalFooter, ...arsenalCards], {
          opacity: 1,
          visibility: 'visible',
          transform: 'none',
        });
      } else {
        // 1. MASTER ENTRANCE & RE-TRIGGERABLE TIMELINE (Runs every single time scrolled into view)
        const arsenalEntranceTl = gsap.timeline({
          scrollTrigger: {
            trigger: arsenalSection,
            start: 'top 82%',
            end: 'bottom 15%',
            toggleActions: 'play reverse play reverse', // Re-triggers every time you scroll!
          }
        });

        // Header: Badge + Headline + Subcopy + Guarantee
        if (arsenalBadge) {
          arsenalEntranceTl.fromTo(arsenalBadge,
            { x: -50, opacity: 0, scale: 0.85 },
            { x: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' },
            0
          );
        }

        if (arsenalHeadline) {
          arsenalEntranceTl.fromTo(arsenalHeadline,
            { y: 60, opacity: 0, rotationX: 25 },
            { y: 0, opacity: 1, rotationX: 0, duration: 0.8, ease: 'power4.out' },
            0.05
          );
        }

        if (arsenalSubcopy) {
          arsenalEntranceTl.fromTo(arsenalSubcopy,
            { y: 35, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out' },
            0.12
          );
        }

        if (arsenalGuar) {
          arsenalEntranceTl.fromTo(arsenalGuar,
            { x: 45, opacity: 0, scale: 0.88 },
            { x: 0, opacity: 1, scale: 1, duration: 0.65, ease: 'back.out(1.6)' },
            0.15
          );
        }

        // 4 Cards Deep 3D Fan Entrance: Staggered from deep Z-space
        arsenalCards.forEach((card, idx) => {
          const tub = card.querySelector('.arsenal-img-closed');
          const shadow = card.querySelector('.arsenal-shadow');
          const scanline = card.querySelector('.arsenal-card-scanline');
          const glow = card.querySelector('.arsenal-card-glow');
          const tagStim = card.querySelector('.arsenal-tag-stim');
          const addBtn = card.querySelector('.arsenal-add-btn');

          // Dynamic 3D Fan angles
          const angles = [
            { x: -65, rotY: 22, rotZ: -3 },
            { x: -20, rotY: 8, rotZ: -1 },
            { x: 20, rotY: -8, rotZ: 1 },
            { x: 65, rotY: -22, rotZ: 3 }
          ];
          const cfg = angles[idx] || { x: 0, rotY: 0, rotZ: 0 };
          const cardDelay = 0.18 + (idx * 0.12);

          // Card Body arrival
          arsenalEntranceTl.fromTo(card,
            {
              x: cfg.x,
              y: 150,
              z: -180,
              rotationY: cfg.rotY,
              rotationX: 26,
              rotationZ: cfg.rotZ,
              scale: 0.82,
              opacity: 0,
              transformPerspective: 1200,
            },
            {
              x: 0,
              y: 0,
              z: 0,
              rotationY: 0,
              rotationX: 0,
              rotationZ: 0,
              scale: 1,
              opacity: 1,
              duration: 0.95,
              ease: 'power3.out',
            },
            cardDelay
          );

          // Tub Levitation Drop with Elastic Spring
          if (tub) {
            arsenalEntranceTl.fromTo(tub,
              { y: -70, scale: 0.72, opacity: 0, rotationZ: (idx % 2 === 0 ? -6 : 6) },
              {
                y: 0,
                scale: 1,
                opacity: 1,
                rotationZ: 0,
                duration: 0.85,
                ease: 'back.out(1.7)',
              },
              cardDelay + 0.08
            );
          }

          // Ground Shadow dynamic expansion
          if (shadow) {
            arsenalEntranceTl.fromTo(shadow,
              { scaleX: 0.2, opacity: 0 },
              { scaleX: 1, opacity: 0.75, duration: 0.75, ease: 'power2.out' },
              cardDelay + 0.12
            );
          }

          // Cyber Laser Scanline Sweep down the card
          if (scanline) {
            arsenalEntranceTl.fromTo(scanline,
              { y: -10, opacity: 0 },
              {
                y: 460,
                opacity: 1,
                duration: 0.7,
                ease: 'power2.inOut',
                onComplete: () => gsap.set(scanline, { opacity: 0 }),
              },
              cardDelay + 0.1
            );
          }

          // Ambient Glow Pulse on entrance
          if (glow) {
            arsenalEntranceTl.fromTo(glow,
              { opacity: 0, scale: 0.7 },
              {
                opacity: 0.85,
                scale: 1.1,
                duration: 0.38,
                yoyo: true,
                repeat: 1,
                ease: 'power2.inOut',
              },
              cardDelay + 0.15
            );
          }

          // Micro-stagger on internal badge & CTA
          if (tagStim) {
            arsenalEntranceTl.fromTo(tagStim,
              { scale: 0.7, opacity: 0 },
              { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' },
              cardDelay + 0.25
            );
          }
          if (addBtn) {
            arsenalEntranceTl.fromTo(addBtn,
              { y: 15, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' },
              cardDelay + 0.3
            );
          }
        });

        // Show All Products Button entrance
        if (arsenalFooter) {
          arsenalEntranceTl.fromTo(arsenalFooter,
            { y: 50, opacity: 0, scale: 0.88 },
            { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.5)' },
            0.75
          );
        }

        // 2. CONTINUOUS AWARD-WINNING SCROLL SCRUB (Active every time user scrolls)
        // Tub Parallax Float Wave + Card 3D Depth tilt synced directly to scroll wheel
        arsenalCards.forEach((card, idx) => {
          const tub = card.querySelector('.arsenal-img-closed');
          const shadow = card.querySelector('.arsenal-shadow');
          const scrubLift = (idx % 2 === 0) ? -42 : -68;
          const tiltShift = (idx % 2 === 0) ? -4 : 4;

          // Card 3D tilt reacts dynamically as you scroll through the section
          gsap.fromTo(card,
            { rotationX: 3 },
            {
              scrollTrigger: {
                trigger: arsenalSection,
                start: 'top 60%',
                end: 'bottom 20%',
                scrub: 1.2,
              },
              rotationX: -4,
              rotationY: tiltShift,
              y: -15,
              ease: 'none',
            }
          );

          // Tub floating levitation scrubs with scroll wheel
          if (tub) {
            gsap.fromTo(tub,
              { y: 10 },
              {
                scrollTrigger: {
                  trigger: arsenalSection,
                  start: 'top 60%',
                  end: 'bottom 10%',
                  scrub: 1.4,
                },
                y: scrubLift,
                ease: 'none',
              }
            );
          }

          if (shadow) {
            gsap.fromTo(shadow,
              { scaleX: 1.05, opacity: 0.8 },
              {
                scrollTrigger: {
                  trigger: arsenalSection,
                  start: 'top 60%',
                  end: 'bottom 10%',
                  scrub: 1.4,
                },
                scaleX: 0.82,
                opacity: 0.45,
                ease: 'none',
              }
            );
          }
        });

        // Ambient background aura breath & scrub
        if (arsenalAmbientBg) {
          gsap.fromTo(arsenalAmbientBg,
            { y: 40, scale: 0.9, opacity: 0.05 },
            {
              scrollTrigger: {
                trigger: arsenalSection,
                start: 'top 90%',
                end: 'bottom 10%',
                scrub: 1.5,
              },
              y: -120,
              scale: 1.35,
              opacity: 0.18,
              ease: 'none',
            }
          );
        }

        // 3. INTERACTIVE 3D GYRO MAGNETIC TILT & CURSOR SPOTLIGHT
        arsenalCards.forEach((card) => {
          const glow = card.querySelector('.arsenal-card-glow');
          const img = card.querySelector('.arsenal-img-closed');
          const rotateX = gsap.quickTo(card, 'rotationX', { duration: 0.35, ease: 'power2.out' });
          const rotateY = gsap.quickTo(card, 'rotationY', { duration: 0.35, ease: 'power2.out' });
          const imgShiftX = img ? gsap.quickTo(img, 'x', { duration: 0.4, ease: 'power2.out' }) : null;
          const imgShiftY = img ? gsap.quickTo(img, 'y', { duration: 0.4, ease: 'power2.out' }) : null;

          card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const xPercent = (x / rect.width) - 0.5;
            const yPercent = (y / rect.height) - 0.5;

            rotateX(-yPercent * 15);
            rotateY(xPercent * 15);

            if (imgShiftX && imgShiftY) {
              imgShiftX(xPercent * 18);
              imgShiftY(yPercent * 18);
            }

            if (glow) {
              glow.style.background = `radial-gradient(circle 260px at ${x}px ${y}px, var(--prod-glow) 0%, transparent 70%)`;
              glow.style.opacity = '1';
            }
          });

          card.addEventListener('mouseleave', () => {
            rotateX(0);
            rotateY(0);
            if (imgShiftX && imgShiftY) {
              imgShiftX(0);
              imgShiftY(0);
            }
            gsap.to(card, {
              rotationX: 0,
              rotationY: 0,
              duration: 0.75,
              ease: 'elastic.out(1, 0.4)',
            });
            if (glow) {
              glow.style.opacity = '0';
            }
          });
        });
      }
    }

    // ------------------------------------------------------------------------
    // 4. MANTRA STATEMENT: DUAL-DIRECTION SCRUB PARALLAX & LASER EXPANSION
    // ------------------------------------------------------------------------
    const mantraLine1 = document.getElementById('mantraLine1');
    const mantraLine2 = document.getElementById('mantraLine2');
    const mantraLaser = document.getElementById('mantraLaser');
    const mantraSub = document.querySelector('.mantra-sub');
    const sectionMantra = document.querySelector('.section-mantra');

    if (sectionMantra && mantraLine1 && mantraLine2) {
      // Wide travel distance so text sweeps noticeably further across the screen
      const getMantraShift = () => (window.innerWidth < 768 ? 180 : Math.min(440, Math.round(window.innerWidth * 0.3)));

      // Line 1 moves Left on Scroll Scrub (starts from right, sweeps far to left)
      gsap.fromTo(mantraLine1,
        { x: () => getMantraShift() },
        {
          scrollTrigger: {
            trigger: sectionMantra,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
            invalidateOnRefresh: true,
          },
          x: () => -getMantraShift(),
          ease: 'none',
        }
      );

      // Line 2 moves Right on Scroll Scrub (starts from left, sweeps far to right)
      gsap.fromTo(mantraLine2,
        { x: () => -getMantraShift() },
        {
          scrollTrigger: {
            trigger: sectionMantra,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
            invalidateOnRefresh: true,
          },
          x: () => getMantraShift(),
          ease: 'none',
        }
      );

      // Laser Line expands across and glows
      if (mantraLaser) {
        gsap.fromTo(mantraLaser,
          { width: '0%', opacity: 0 },
          {
            scrollTrigger: {
              trigger: sectionMantra,
              start: 'top 75%',
              end: 'center center',
              scrub: 0.8,
            },
            width: '100%',
            opacity: 1,
            ease: 'power2.out',
          }
        );
      }

      // Mantra Subtext: expanding letter-spacing reveal
      if (mantraSub) {
        gsap.fromTo(mantraSub,
          { opacity: 0, y: 25, letterSpacing: '0.15em' },
          {
            scrollTrigger: {
              trigger: sectionMantra,
              start: 'top 70%',
              end: 'center center',
              scrub: 0.8,
            },
            opacity: 1,
            y: 0,
            letterSpacing: '0.35em',
            ease: 'power2.out',
          }
        );
      }
    }

    // ------------------------------------------------------------------------
    // 5. FINAL CTA: AWARD-WINNING 3D LEVITATION, DUAL-DIRECTION SCRUB & PARALLAX
    // ------------------------------------------------------------------------
    const ctaSection = document.getElementById('cta');
    const ctaStage = document.getElementById('ctaStage');
    const ctaPill = document.getElementById('ctaPill');
    const ctaLineTop = document.getElementById('ctaLineTop');
    const ctaLineBottom = document.getElementById('ctaLineBottom');
    const ctaCopy = document.getElementById('ctaCopy');
    const ctaProductWrapper = document.getElementById('ctaProductWrapper');
    const finalCtaImg = document.getElementById('finalCtaImg');
    const ctaGroundShadow = document.getElementById('ctaGroundShadow');
    const ctaStageAura = document.getElementById('ctaStageAura');
    const chipLeft = document.getElementById('chipLeft');
    const chipRight = document.getElementById('chipRight');
    const finalCtaBtn = document.getElementById('finalCtaBtn');
    const ctaGuarantee = document.getElementById('ctaGuarantee');

    if (ctaSection && ctaStage) {
      // Responsive shift distances
      const getTextShift = () => (window.innerWidth < 768 ? 120 : 280);
      const getChipShift = () => (window.innerWidth < 768 ? 90 : 220);

      // ----------------------------------------------------------------------
      // 1. TEXT SCROLL SCRUB (Directly tied to user's scroll wheel / touch)
      // ----------------------------------------------------------------------

      // Pill drops and scales with user's scroll
      if (ctaPill) {
        gsap.fromTo(ctaPill,
          { y: -45, opacity: 0.1, scale: 0.8 },
          {
            scrollTrigger: {
              trigger: ctaSection,
              start: 'top 85%',
              end: 'top 45%',
              scrub: 1,
            },
            y: 0,
            opacity: 1,
            scale: 1,
            ease: 'none',
          }
        );
      }

      // "Ready To" scrubs in from LEFT directly with user scroll
      if (ctaLineTop) {
        gsap.fromTo(ctaLineTop,
          { x: () => -getTextShift(), opacity: 0.1 },
          {
            scrollTrigger: {
              trigger: ctaSection,
              start: 'top 85%',
              end: 'top 40%',
              scrub: 1,
              invalidateOnRefresh: true,
            },
            x: 0,
            opacity: 1,
            ease: 'none',
          }
        );
      }

      // "Go Further?" scrubs in from RIGHT directly with user scroll
      if (ctaLineBottom) {
        gsap.fromTo(ctaLineBottom,
          { x: () => getTextShift(), scale: 0.86, opacity: 0.1 },
          {
            scrollTrigger: {
              trigger: ctaSection,
              start: 'top 85%',
              end: 'top 40%',
              scrub: 1,
              invalidateOnRefresh: true,
            },
            x: 0,
            scale: 1,
            opacity: 1,
            ease: 'none',
          }
        );
      }

      // Sub-copy unfolds with user scroll
      if (ctaCopy) {
        gsap.fromTo(ctaCopy,
          { y: 50, opacity: 0 },
          {
            scrollTrigger: {
              trigger: ctaSection,
              start: 'top 75%',
              end: 'top 35%',
              scrub: 1,
            },
            y: 0,
            opacity: 1,
            ease: 'none',
          }
        );
      }

      // ----------------------------------------------------------------------
      // 2. TACTICAL BADGES: Scrub in from Left & Right with user scroll
      // ----------------------------------------------------------------------
      if (chipLeft) {
        gsap.fromTo(chipLeft,
          { x: () => -getChipShift(), rotation: -20, opacity: 0, scale: 0.7 },
          {
            scrollTrigger: {
              trigger: ctaStage,
              start: 'top 92%',
              end: 'center 50%',
              scrub: 1.2,
              invalidateOnRefresh: true,
            },
            x: 0,
            rotation: 0,
            opacity: 1,
            scale: 1,
            ease: 'none',
          }
        );

        // Continuous subtle anti-gravity float
        gsap.to(chipLeft, {
          y: -9,
          rotation: -1.5,
          duration: 2.6,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      if (chipRight) {
        gsap.fromTo(chipRight,
          { x: () => getChipShift(), rotation: 20, opacity: 0, scale: 0.7 },
          {
            scrollTrigger: {
              trigger: ctaStage,
              start: 'top 92%',
              end: 'center 50%',
              scrub: 1.2,
              invalidateOnRefresh: true,
            },
            x: 0,
            rotation: 0,
            opacity: 1,
            scale: 1,
            ease: 'none',
          }
        );

        // Continuous subtle anti-gravity float
        gsap.to(chipRight, {
          y: 9,
          rotation: 1.5,
          duration: 2.9,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      }

      // ----------------------------------------------------------------------
      // 3. 3D PACKAGING LEVITATION: Rises directly with user scroll
      // ----------------------------------------------------------------------
      if (ctaProductWrapper) {
        gsap.fromTo(ctaProductWrapper,
          { y: 150, scale: 0.84, rotationX: 16, opacity: 0.2 },
          {
            scrollTrigger: {
              trigger: ctaStage,
              start: 'top 95%',
              end: 'center 45%',
              scrub: 1.2,
            },
            y: 0,
            scale: 1,
            rotationX: 0,
            opacity: 1,
            ease: 'none',
          }
        );

        if (ctaGroundShadow) {
          gsap.fromTo(ctaGroundShadow,
            { scaleX: 0.3, opacity: 0.1 },
            {
              scrollTrigger: {
                trigger: ctaStage,
                start: 'top 95%',
                end: 'center 45%',
                scrub: 1.2,
              },
              scaleX: 1,
              opacity: 0.85,
              ease: 'none',
            }
          );
        }

        if (ctaStageAura) {
          gsap.fromTo(ctaStageAura,
            { scale: 0.5, opacity: 0.15 },
            {
              scrollTrigger: {
                trigger: ctaStage,
                start: 'top 95%',
                end: 'center 45%',
                scrub: 1.2,
              },
              scale: 1.15,
              opacity: 0.9,
              ease: 'none',
            }
          );
        }

        // Parallax lift as user scrolls through to footer
        gsap.to(ctaProductWrapper, {
          scrollTrigger: {
            trigger: ctaStage,
            start: 'center 45%',
            end: 'bottom top',
            scrub: 1.5,
          },
          y: -60,
          rotationZ: -2,
          ease: 'none',
        });

        // Continuous subtle levitation idle hover
        ScrollTrigger.create({
          trigger: ctaStage,
          start: 'top 70%',
          once: true,
          onEnter: () => {
            gsap.to(finalCtaImg, {
              y: -14,
              rotation: 1.8,
              duration: 3.2,
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
            });

            if (ctaGroundShadow) {
              gsap.to(ctaGroundShadow, {
                scaleX: 0.88,
                opacity: 0.65,
                duration: 3.2,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
              });
            }
          }
        });
      }

      // Discover CTA Button & Guarantee text scroll scrub
      if (finalCtaBtn) {
        gsap.fromTo(finalCtaBtn,
          { y: 35, opacity: 0, scale: 0.9 },
          {
            scrollTrigger: {
              trigger: ctaStage,
              start: 'center 55%',
              end: 'bottom 75%',
              scrub: 1,
            },
            y: 0,
            opacity: 1,
            scale: 1,
            ease: 'none',
          }
        );
      }

      // 4. Concentric Shockwave Pulse & Cyber Dash
      const shockwaves = document.querySelectorAll('.cta-shockwave');
      if (shockwaves.length) {
        gsap.to(shockwaves, {
          scale: 1.38,
          opacity: 0,
          duration: 3,
          repeat: -1,
          stagger: 0.95,
          ease: 'power1.out',
        });
      }

      // 5. Interactive 3D Cursor Tilt with Dynamic Light Flare
      const tiltWrapperX = gsap.quickTo(ctaProductWrapper, 'rotationY', { duration: 0.5, ease: 'power2.out' });
      const tiltWrapperY = gsap.quickTo(ctaProductWrapper, 'rotationX', { duration: 0.5, ease: 'power2.out' });
      const auraShiftX = ctaStageAura ? gsap.quickTo(ctaStageAura, 'x', { duration: 0.6, ease: 'power2.out' }) : null;
      const auraShiftY = ctaStageAura ? gsap.quickTo(ctaStageAura, 'y', { duration: 0.6, ease: 'power2.out' }) : null;

      ctaStage.addEventListener('mousemove', (e) => {
        const rect = ctaStage.getBoundingClientRect();
        const xPercent = (e.clientX - rect.left) / rect.width - 0.5;
        const yPercent = (e.clientY - rect.top) / rect.height - 0.5;

        tiltWrapperX(xPercent * 22);
        tiltWrapperY(-yPercent * 16);

        if (auraShiftX && auraShiftY) {
          auraShiftX(xPercent * 30);
          auraShiftY(yPercent * 24);
        }

        if (chipLeft) gsap.to(chipLeft, { x: -xPercent * 18, y: -yPercent * 14, duration: 0.4, ease: 'power1.out' });
        if (chipRight) gsap.to(chipRight, { x: -xPercent * 18, y: -yPercent * 14, duration: 0.4, ease: 'power1.out' });
      });

      ctaStage.addEventListener('mouseleave', () => {
        tiltWrapperX(0);
        tiltWrapperY(0);
        if (auraShiftX && auraShiftY) {
          auraShiftX(0);
          auraShiftY(0);
        }
        if (chipLeft) gsap.to(chipLeft, { x: 0, y: 0, duration: 0.6, ease: 'power2.out' });
        if (chipRight) gsap.to(chipRight, { x: 0, y: 0, duration: 0.6, ease: 'power2.out' });
      });

      // 6. Guarantee Bar Entrance
      if (ctaGuarantee) {
        gsap.fromTo(ctaGuarantee,
          { opacity: 0, y: 20 },
          {
            scrollTrigger: { trigger: ctaGuarantee, start: 'top 92%', once: true },
            opacity: 0.85,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
          }
        );
      }
    }

    // Magnetic Button Interaction with Elastic Snap
    document.querySelectorAll('.btn-magnetic').forEach((btn) => {
      const btnX = gsap.quickTo(btn, 'x', { duration: 0.35, ease: 'power2.out' });
      const btnY = gsap.quickTo(btn, 'y', { duration: 0.35, ease: 'power2.out' });

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const offsetX = e.clientX - (rect.left + rect.width / 2);
        const offsetY = e.clientY - (rect.top + rect.height / 2);
        btnX(offsetX * 0.38);
        btnY(offsetY * 0.38);
      });

      btn.addEventListener('mouseleave', () => {
        btnX(0);
        btnY(0);
      });
    });

    // ------------------------------------------------------------------------
    // 6. FOOTER & TRUST SIGNALS: STAGGERED REVEALS
    // ------------------------------------------------------------------------
    const trustItems = document.querySelectorAll('.trust-item');
    if (trustItems.length) {
      gsap.fromTo(trustItems,
        { y: 30, opacity: 0 },
        {
          scrollTrigger: { trigger: '.footer-trust', start: 'top 90%' },
          y: 0,
          opacity: 1,
          duration: 0.65,
          stagger: 0.12,
          ease: 'power2.out',
        }
      );
    }

    // ------------------------------------------------------------------------
    // 7. AMBIENT LUXURY SPOTLIGHT CURSOR FOLLOWER
    // ------------------------------------------------------------------------
    const spotlightCursor = document.getElementById('customSpotlightCursor');
    if (spotlightCursor && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const cursorX = gsap.quickTo(spotlightCursor, 'x', { duration: 0.35, ease: 'power3.out' });
      const cursorY = gsap.quickTo(spotlightCursor, 'y', { duration: 0.35, ease: 'power3.out' });

      window.addEventListener('mousemove', (e) => {
        if (!spotlightCursor.classList.contains('active')) {
          spotlightCursor.classList.add('active');
        }
        cursorX(e.clientX);
        cursorY(e.clientY);
      }, { passive: true });

      document.addEventListener('mouseleave', () => {
        spotlightCursor.classList.remove('active');
      });
    }
  }

  // Initialize GSAP reveals
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalGsapAnimations);
  } else {
    initGlobalGsapAnimations();
  }

  // ==========================================================================
  // OPEN TUB FORMULATION INSPECTION
  // ==========================================================================
  const OPEN_VARIANTS = [
    {
      flavor: "BLUE RASPBERRY",
      accent: "#00d2ff",
      bioactive: "Organic Spirulina Extract (Cyan)",
      solubility: "Zero Shaker Residue • < 1.8s"
    },
    {
      flavor: "MIDNIGHT GRAPE",
      accent: "#b026ff",
      bioactive: "Organic Beet & Anthocyanins (Purple)",
      solubility: "Zero Shaker Residue • < 1.9s"
    },
    {
      flavor: "ORANGE BLAST",
      accent: "#ff7700",
      bioactive: "Natural Beta-Carotene (Orange)",
      solubility: "Zero Shaker Residue • < 1.7s"
    },
    {
      flavor: "SOUR APPLE",
      accent: "#22e566",
      bioactive: "Pure Chlorophyll Complex (Green)",
      solubility: "Zero Shaker Residue • < 1.8s"
    },
  ];

  const openTabs = document.querySelectorAll('.open-tub-tab');
  const openCards = document.querySelectorAll('.open-tub-card');
  const openTubImages = document.querySelectorAll('.open-tub-layers .open-tub-img');
  const openTubGlow = document.getElementById('openTubGlow');
  const hudPinLeftTag = document.getElementById('hudPinLeftTag');
  const hudPinLeftText = document.getElementById('hudPinLeftText');
  const hudPinLeftDot = document.getElementById('hudPinLeftDot');
  const hudPinRightText = document.getElementById('hudPinRightText');
  const hudPinRightDot = document.getElementById('hudPinRightDot');

  function selectOpenTubVariant(idx) {
    const v = OPEN_VARIANTS[idx];
    if (!v) return;

    // 1. Synchronize Top Flavor Tabs
    openTabs.forEach((tab) => {
      const tabIdx = parseInt(tab.getAttribute('data-open-index'), 10);
      tab.classList.toggle('active', tabIdx === idx);
    });

    // 2. Synchronize All 4 Formulation Deck Cards
    openCards.forEach((card) => {
      const cardIdx = parseInt(card.getAttribute('data-deck-index'), 10);
      const isCardActive = cardIdx === idx;
      card.classList.toggle('active', isCardActive);
      const statusText = card.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = isCardActive ? 'INSPECTING' : 'SELECT';
      }
    });

    // 3. Butter-Smooth GPU Layer Crossfade (Preloaded, Zero Pop, No Network Latency)
    openTubImages.forEach((img) => {
      const imgIdx = parseInt(img.getAttribute('data-open-idx'), 10);
      img.classList.toggle('active', imgIdx === idx);
    });

    // 4. Update Ambient Color Aura Glow
    if (openTubGlow) {
      openTubGlow.style.backgroundColor = `${v.accent}24`;
    }

    // 5. Update Interactive HUD Telemetry Pins
    if (hudPinLeftTag) hudPinLeftTag.style.color = v.accent;
    if (hudPinLeftDot) {
      hudPinLeftDot.style.background = v.accent;
      hudPinLeftDot.style.boxShadow = `0 0 10px ${v.accent}`;
    }
    if (hudPinLeftText) hudPinLeftText.textContent = v.bioactive;
    if (hudPinRightText) hudPinRightText.textContent = v.solubility;
    if (hudPinRightDot) {
      hudPinRightDot.style.background = v.accent;
      hudPinRightDot.style.boxShadow = `0 0 10px ${v.accent}`;
    }

    // 6. Pulse Concentric Radar Rings
    if (window.gsap) {
      gsap.fromTo('.formula-radar-ring',
        { scale: 0.95 },
        { scale: 1, duration: 0.5, ease: 'back.out(1.5)' }
      );
    }
  }

  // Attach click listeners to top tabs
  openTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const idx = parseInt(tab.getAttribute('data-open-index'), 10);
      selectOpenTubVariant(idx);
    });
  });

  // Attach click listeners to all 4 gallery cards
  openCards.forEach((card) => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.getAttribute('data-deck-index'), 10);
      selectOpenTubVariant(idx);
    });
  });

  // Newsletter Submit
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Thank you for subscribing to MAXIMUS limited batch drops!');
      newsletterForm.reset();
    });
  }

  // ==========================================================================
  // UNIFIED CART COMMERCE ENGINE & DRAWER INTERACTION
  // ==========================================================================
  const ARSENAL_PRODUCTS = [
    {
      id: 0,
      name: "Blue Raspberry",
      series: "SERIES // 01 · ULTRA HIGH STIM",
      price: 49.00,
      img: "public/products/blue-raspberry.webp"
    },
    {
      id: 1,
      name: "Midnight Grape",
      series: "SERIES // 02 · NEURO MATRIX",
      price: 49.00,
      img: "public/products/grape.webp"
    },
    {
      id: 2,
      name: "Orange Blast",
      series: "SERIES // 03 · THERMOGENIC DRIVE",
      price: 49.00,
      img: "public/products/watermelon.webp"
    },
    {
      id: 3,
      name: "Sour Apple",
      series: "SERIES // 04 · RAW INTENSITY",
      price: 49.00,
      img: "public/products/sour-apple.webp"
    },
    {
      id: 4,
      name: "Blue Razz System",
      series: "SERIES // 05 · COMPLETE SYSTEM",
      price: 59.00,
      img: "public/products/blue-razz-box.webp"
    },
    {
      id: 5,
      name: "Red Rush System",
      series: "SERIES // 06 · THERMAL RED SYSTEM",
      price: 59.00,
      img: "public/products/red-rush-box.webp"
    }
  ];

  let cart = JSON.parse(localStorage.getItem('maximus_cart') || '[]');

  const navCartBtn = document.getElementById('navCartBtn');
  const cartBadge = document.getElementById('cartBadge');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartDrawerClose = document.getElementById('cartDrawerClose');
  const cartDrawerCount = document.getElementById('cartDrawerCount');
  const cartItemsContainer = document.getElementById('cartItemsContainer');
  const cartSubtotal = document.getElementById('cartSubtotal');
  const cartTotal = document.getElementById('cartTotal');
  const cartCheckoutBtn = document.getElementById('cartCheckoutBtn');
  const cartHudToast = document.getElementById('cartHudToast');
  const toastViewCart = document.getElementById('toastViewCart');

  function openCartDrawer() {
    if (cartDrawer) cartDrawer.classList.add('active');
    if (cartOverlay) cartOverlay.classList.add('active');
  }

  function closeCartDrawer() {
    if (cartDrawer) cartDrawer.classList.remove('active');
    if (cartOverlay) cartOverlay.classList.remove('active');
  }

  function saveAndRenderCart() {
    localStorage.setItem('maximus_cart', JSON.stringify(cart));
    renderCartUI();
  }

  function renderCartUI() {
    const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);
    if (cartBadge) cartBadge.textContent = totalQty;
    if (cartDrawerCount) cartDrawerCount.textContent = `(${totalQty})`;

    if (!cartItemsContainer) return;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div class="cart-empty-state">
          <p style="color:#aaa; font-size:0.95rem;">Your arsenal cart is empty.</p>
          <span style="color:#666; font-size:0.75rem; margin-top:0.3rem;">Select any formulation below to add.</span>
        </div>
      `;
      if (cartSubtotal) cartSubtotal.textContent = '$0.00';
      if (cartTotal) cartTotal.textContent = '$0.00';
      return;
    }

    let subtotal = 0;
    cartItemsContainer.innerHTML = cart.map((item, idx) => {
      subtotal += item.price * item.qty;
      return `
        <div class="cart-item">
          <div class="cart-item-img-wrap">
            <img src="${item.img}" alt="${item.name}">
          </div>
          <div class="cart-item-info">
            <div class="cart-item-header">
              <div>
                <h4 class="cart-item-name">${item.name}</h4>
                <span class="cart-item-series">${item.series}</span>
              </div>
              <button class="cart-item-remove-btn" onclick="window.removeCartItem(${idx})" title="Remove item">&times;</button>
            </div>
            <div class="cart-item-bottom">
              <div class="cart-qty-control">
                <button class="qty-btn" onclick="window.updateCartQty(${idx}, -1)">-</button>
                <span style="font-size:0.85rem; font-weight:700; padding:0 0.5rem; color:#fff;">${item.qty}</span>
                <button class="qty-btn" onclick="window.updateCartQty(${idx}, 1)">+</button>
              </div>
              <span class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (cartSubtotal) cartSubtotal.textContent = '$' + subtotal.toFixed(2);
    if (cartTotal) cartTotal.textContent = '$' + subtotal.toFixed(2);
  }

  window.updateCartQty = function(idx, delta) {
    if (!cart[idx]) return;
    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) {
      cart.splice(idx, 1);
    }
    saveAndRenderCart();
  };

  window.removeCartItem = function(idx) {
    cart.splice(idx, 1);
    saveAndRenderCart();
  };

  function addProductToCart(productIndex) {
    const p = ARSENAL_PRODUCTS[productIndex];
    if (!p) return;
    const existing = cart.find(item => item.id === p.id);
    if (existing) {
      existing.qty++;
    } else {
      cart.push({
        id: p.id,
        name: p.name,
        series: p.series,
        price: p.price,
        img: p.img,
        qty: 1
      });
    }
    saveAndRenderCart();
    openCartDrawer();
  }

  // Bind Navbar Cart Button
  if (navCartBtn) navCartBtn.addEventListener('click', openCartDrawer);
  if (cartDrawerClose) cartDrawerClose.addEventListener('click', closeCartDrawer);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);

  // Bind all Add to Cart buttons in the Arsenal
  document.querySelectorAll('.arsenal-add-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pIdx = parseInt(btn.getAttribute('data-product-index'), 10);
      addProductToCart(pIdx);

      // Temporary button feedback
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="btn-text" style="color:#00ff88;">ADDED ✓</span>';
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 1200);
    });
  });

  if (cartCheckoutBtn) {
    cartCheckoutBtn.addEventListener('click', () => {
      alert('Secure Checkout initiated! Total: ' + (cartTotal ? cartTotal.textContent : '$0.00'));
    });
  }

  // Initial cart render
  renderCartUI();

})();
