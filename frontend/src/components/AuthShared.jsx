import React, { useState, useRef, useEffect } from 'react';

/* ═══════════════════════════════════════════
   CANVAS PARTICLES — animated dot background
   ═══════════════════════════════════════════ */

export const ParticlesCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let w, h;
    const particles = [];
    const COUNT = 80;
    const CONNECT_DIST = 120;

    const resize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.r = Math.random() * 1.5 + 0.5;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > w) this.vx *= -1;
        if (this.y < 0 || this.y > h) this.vy *= -1;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fill();
      }
    }

    const init = () => {
      resize();
      particles.length = 0;
      for (let i = 0; i < COUNT; i++) particles.push(new Particle());
    };

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(207,38,38,${(1 - dist / CONNECT_DIST) * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    };

    const loop = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => { p.update(); p.draw(); });
      drawConnections();
      animId = requestAnimationFrame(loop);
    };

    init();
    loop();

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
};

/* ═══════════════════════════════════════════
   FLOATING LABEL INPUT
   ═══════════════════════════════════════════ */

export const FloatingInput = ({ id, label, type, value, onChange, autoComplete, autoFocus }) => {
  const [focused, setFocused] = useState(false);
  const isActive = focused || value.length > 0;

  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="
          peer block w-full h-12 px-4 rounded-xl text-sm
          border-2 bg-transparent
          transition-all duration-200 ease-out
          placeholder-transparent
          focus:outline-none
        "
        style={{
          color: 'var(--color-text)',
          borderColor: isActive ? '#cf2626' : focused ? '#cf2626' : 'var(--color-border)',
          boxShadow: isActive ? '0 0 0 3px rgba(207,38,38,0.08)' : 'none',
        }}
      />

      <label
        htmlFor={id}
        className={`
          absolute left-4 transition-all duration-200 ease-out pointer-events-none select-none
          ${isActive
            ? '-top-2.5 text-[11px] font-semibold px-1.5'
            : 'top-1/2 -translate-y-1/2 text-sm font-medium px-0'
          }
        `}
        style={{
          color: isActive ? '#cf2626' : 'var(--color-text-muted)',
          backgroundColor: isActive ? 'var(--color-bg-elevated)' : 'transparent',
        }}
      >
        {label}
      </label>
    </div>
  );
};

/* ═══════════════════════════════════════════
   VALUE PROP PILL — for the brand panel
   ═══════════════════════════════════════════ */

export const ValueProp = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-3 group">
    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-500/20 group-hover:border-primary-500/30 transition-all duration-300">
      <Icon className="h-4 w-4 text-primary-400" />
    </div>
    <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors duration-300">
      {text}
    </span>
  </div>
);
