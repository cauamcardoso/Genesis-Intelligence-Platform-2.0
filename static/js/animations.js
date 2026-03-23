/* ═══ Animation System ═══ */

// ─── 1. NETWORK PARTICLE BACKGROUND ───
// A subtle, slow-moving network graph representing connections between researchers
function initNetworkBackground() {
  const canvas = document.getElementById('network-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, nodes = [], animId;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function createNodes() {
    nodes = [];
    const count = Math.floor((w * h) / 12000); // higher density
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.8,
        opacity: Math.random() * 0.5 + 0.15,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Draw connections
    const maxDist = 160;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.12;
          ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (const n of nodes) {
      ctx.fillStyle = `rgba(56, 189, 248, ${n.opacity})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Update positions
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }

    animId = requestAnimationFrame(draw);
  }

  resize();
  createNodes();
  draw();

  window.addEventListener('resize', () => {
    resize();
    createNodes();
  });
}


// ─── 2. SCROLL-TRIGGERED REVEALS ───
// Elements with [data-reveal] fade/slide in when they enter the viewport
function initScrollReveals() {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  function observe() {
    document.querySelectorAll('[data-reveal]:not(.revealed)').forEach(el => {
      // If element is already in viewport, reveal immediately with a tiny delay for visual effect
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        // Small stagger for elements already visible
        const delay = parseInt(el.style.transitionDelay) || 0;
        setTimeout(() => el.classList.add('revealed'), delay + 50);
      } else {
        observer.observe(el);
      }
    });
  }

  // Initial observe
  observe();

  // Re-observe after any DOM change in content area (tab switches, async loads)
  const content = document.getElementById('content');
  if (content) {
    const mo = new MutationObserver(() => {
      setTimeout(observe, 100);
      setTimeout(observe, 300); // second pass catches late renders
    });
    mo.observe(content, { childList: true, subtree: true });
  }

  // Also run on any scroll or resize
  let scrollTimer;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(observe, 50);
  }, { passive: true });
}


// ─── 3. ANIMATED COUNTERS ───
// Elements with [data-count-to="123"] animate from 0 to the target number
function initCounters() {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting && !entry.target.dataset.counted) {
        entry.target.dataset.counted = 'true';
        animateCounter(entry.target);
      }
    }
  }, { threshold: 0.3 });

  function observe() {
    document.querySelectorAll('[data-count-to]').forEach(el => {
      if (!el.dataset.counted) observer.observe(el);
    });
  }

  observe();
  const content = document.getElementById('content');
  if (content) {
    const mo = new MutationObserver(() => {
      requestAnimationFrame(observe);
    });
    mo.observe(content, { childList: true, subtree: true });
  }
}

function animateCounter(el) {
  const target = parseFloat(el.dataset.countTo);
  const suffix = el.dataset.countSuffix || '';
  const isPercent = suffix === '%';
  const duration = 1200;
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = target * ease;

    if (Number.isInteger(target)) {
      el.textContent = Math.round(current).toLocaleString() + suffix;
    } else {
      el.textContent = current.toFixed(0) + suffix;
    }

    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}


// ─── 4. BAR CHART ANIMATION ───
// Bars with [data-bar-width] animate their width on scroll
function initBarAnimations() {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const bars = entry.target.querySelectorAll('.bar-fill[data-bar-width]');
        bars.forEach((bar, i) => {
          setTimeout(() => {
            bar.style.width = bar.dataset.barWidth + '%';
          }, i * 30);
        });
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.15 });

  function observe() {
    document.querySelectorAll('.bar-chart-container:not(.bars-animated)').forEach(el => {
      el.classList.add('bars-animated');
      // Start all bars at 0 width
      el.querySelectorAll('.bar-fill[data-bar-width]').forEach(bar => {
        bar.style.width = '0%';
      });
      observer.observe(el);
    });
  }

  observe();
  const content = document.getElementById('content');
  if (content) {
    const mo = new MutationObserver(() => {
      requestAnimationFrame(observe);
    });
    mo.observe(content, { childList: true, subtree: true });
  }
}


// ─── 5. ABSTRACT HERO ANIMATION ───
// A flowing mesh gradient animation for the hero section
function initHeroAnimation() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, time = 0;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    w = canvas.width = rect.width;
    h = canvas.height = rect.height;
  }

  function draw() {
    time += 0.003;
    ctx.clearRect(0, 0, w, h);

    // Flowing gradient blobs
    const blobs = [
      { x: w * 0.15 + Math.sin(time * 0.7) * w * 0.12, y: h * 0.25 + Math.cos(time * 0.5) * h * 0.15, r: w * 0.45, color: 'rgba(29, 78, 216, 0.22)' },
      { x: w * 0.75 + Math.cos(time * 0.6) * w * 0.12, y: h * 0.65 + Math.sin(time * 0.8) * h * 0.15, r: w * 0.4, color: 'rgba(124, 58, 237, 0.16)' },
      { x: w * 0.5 + Math.sin(time * 0.9) * w * 0.1, y: h * 0.45 + Math.cos(time * 0.4) * h * 0.12, r: w * 0.35, color: 'rgba(255, 130, 0, 0.10)' },
    ];

    for (const b of blobs) {
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      grad.addColorStop(0, b.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener('resize', resize);
}


// ─── INIT ALL ───
document.addEventListener('DOMContentLoaded', () => {
  initNetworkBackground();
  initScrollReveals();
  initCounters();
  initBarAnimations();
  initHeroAnimation();
});
