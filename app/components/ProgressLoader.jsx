"use client";
import { useEffect, useState } from "react";

export default function ProgressLoader({ active, offsetX = 0 }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(100);
      return;
    }
    
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        let increment = 1;
        if (prev > 80) increment = 0.5;
        if (prev > 90) increment = 0.2;
        if (prev > 95) increment = 0.1;
        if (prev >= 98.9 && prev < 99.5) increment = 0.05;
        
        let next = prev + increment;
        if (next >= 99.8) next = 99.8;
        return next;
      });
    }, 50);
    
    const timeout = setTimeout(() => {
      setProgress(99.9);
    }, 45000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [active]);

  if (!active && progress === 100) return null;

  return (
    <div style={{
      position: "fixed", 
      top: 0, 
      left: offsetX, 
      right: 0, 
      height: "4px",
      zIndex: 99999,
      background: "transparent",
      pointerEvents: "none"
    }}>
      <div style={{ 
        height: "100%", 
        width: `${progress}%`, 
        background: "linear-gradient(90deg, #10b981, #34d399)", 
        transition: "width 0.1s linear, opacity 0.3s ease",
        opacity: (!active && progress === 100) ? 0 : 1,
        borderTopRightRadius: "4px",
        borderBottomRightRadius: "4px",
        boxShadow: "0 0 10px rgba(16, 185, 129, 0.4)"
      }} />
    </div>
  );
}

