"use client";

import React, { useState, useEffect, useRef } from "react";

interface RevenueTickerProps {
  value: number;
}

export default function RevenueTicker({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const start = displayed;
    const diff = value - start;
    
    // Duration is 600ms on initial mount/large jumps, 300ms on minor increments
    const duration = start === 0 ? 600 : 300;
    let startTime: number | null = null;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      
      // easeOutQuart easing
      const eased = 1 - Math.pow(1 - progress, 4);
      const nextValue = Math.floor(start + diff * eased);
      
      setDisplayed(nextValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayed(value);
      }
    };

    requestAnimationFrame(animate);
    prevValueRef.current = value;
  }, [value]);

  return (
    <div className="flex flex-col space-y-1.5 select-none">
      <span 
        className="font-mono text-5xl md:text-[56px] text-text-primary leading-none font-bold tracking-tight"
      >
        ₹{displayed.toLocaleString("en-IN")}
      </span>
      <span className="text-[10px] font-sans font-bold tracking-widest text-text-tertiary uppercase">
        REVENUE PROTECTED THIS MONTH
      </span>
    </div>
  );
}
