import React, { useEffect, useRef } from 'react';

export const InteractiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;

    // Configuration
    const connectionDistance = 150;
    const mouseInteractionDistance = 200;
    
    const resize = () => {
      // Handle DPI for crisp rendering
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      
      initParticles();
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;

      constructor() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        // Slow, drifting movement
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.size = Math.random() * 2 + 0.5;
        // Theme colors: Blue and Purple
        this.color = Math.random() > 0.5 ? '#00f3ff' : '#bc13fe';
      }

      update(mouse: { x: number, y: number }) {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around screen edges for continuous flow
        if (this.x < 0) this.x = window.innerWidth;
        if (this.x > window.innerWidth) this.x = 0;
        if (this.y < 0) this.y = window.innerHeight;
        if (this.y > window.innerHeight) this.y = 0;

        // Mouse interaction (Gentle repulsion)
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < mouseInteractionDistance) {
          const force = (mouseInteractionDistance - distance) / mouseInteractionDistance;
          const angle = Math.atan2(dy, dx);
          const pushStrength = 0.5;
          
          this.vx -= Math.cos(angle) * force * pushStrength;
          this.vy -= Math.sin(angle) * force * pushStrength;
        }

        // Friction to prevent infinite acceleration from mouse
        this.vx *= 0.99;
        this.vy *= 0.99;
      }

      draw() {
        if(!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.6;
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      // Density calculation
      const count = Math.floor((window.innerWidth * window.innerHeight) / 12000);
      for (let i = 0; i < Math.min(count, 150); i++) {
        particles.push(new Particle());
      }
    };

    let mouse = { x: -9999, y: -9999 };

    const animate = () => {
      if(!ctx) return;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      
      particles.forEach((p, index) => {
        p.update(mouse);
        p.draw();

        // Draw connections
        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            ctx.beginPath();
            // Gradient line based on distance
            const opacity = 1 - (distance / connectionDistance);
            ctx.strokeStyle = `rgba(100, 100, 150, ${opacity * 0.15})`;
            ctx.lineWidth = 1;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
      }
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
};