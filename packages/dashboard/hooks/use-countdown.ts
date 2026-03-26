"use client";

import { useEffect, useState } from "react";

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  isUrgent: boolean;
}

function calc(deadline: string): CountdownResult {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, isUrgent: false };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  const totalHours = days * 24 + hours;
  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    isUrgent: totalHours < 24,
  };
}

export function useCountdown(deadline: string): CountdownResult {
  const [result, setResult] = useState(() => calc(deadline));

  useEffect(() => {
    setResult(calc(deadline));
    const id = setInterval(() => setResult(calc(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return result;
}
