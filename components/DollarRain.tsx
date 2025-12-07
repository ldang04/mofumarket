'use client';

import { useEffect, useRef } from 'react';

export default function DollarRain() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const dollarSigns: HTMLDivElement[] = [];

    const createDollarSign = () => {
      const dollar = document.createElement('div');
      dollar.textContent = '$';
      dollar.className = 'absolute text-green-500 font-bold pointer-events-none';
      dollar.style.fontSize = `${Math.random() * 20 + 15}px`;
      dollar.style.left = `${Math.random() * 100}%`;
      dollar.style.top = '-30px';
      dollar.style.opacity = '0.8';
      
      const duration = Math.random() * 3 + 2;
      const delay = Math.random() * 0.5;
      
      dollar.style.animation = `fall ${duration}s linear ${delay}s forwards`;
      
      container.appendChild(dollar);
      dollarSigns.push(dollar);

      // Remove after animation
      setTimeout(() => {
        if (dollar.parentNode) {
          dollar.parentNode.removeChild(dollar);
        }
        const index = dollarSigns.indexOf(dollar);
        if (index > -1) {
          dollarSigns.splice(index, 1);
        }
      }, (duration + delay) * 1000 + 100);
    };

    // Create initial dollar signs
    for (let i = 0; i < 20; i++) {
      setTimeout(() => createDollarSign(), i * 200);
    }

    // Continue creating new dollar signs
    const interval = setInterval(() => {
      if (dollarSigns.length < 30) {
        createDollarSign();
      }
    }, 300);

    return () => {
      clearInterval(interval);
      dollarSigns.forEach(dollar => {
        if (dollar.parentNode) {
          dollar.parentNode.removeChild(dollar);
        }
      });
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.8;
          }
          70% {
            opacity: 0.8;
          }
          85% {
            opacity: 0.3;
          }
          95% {
            opacity: 0.05;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
      <div
        ref={containerRef}
        className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      />
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, transparent 70%, rgba(255,255,255,0.3) 85%, rgba(255,255,255,0.7) 95%, white 100%)',
        }}
      />
    </>
  );
}

