import { useEffect, useRef, useState } from 'react';

export default function useCarousel(length, delay = 3600, idleResume = 8000) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const inactivityTimer = useRef();

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setActive(prev => (prev + 1) % length);
    }, delay);

    return () => clearInterval(interval);
  }, [paused, delay, length]);

  const userInteracted = () => {
    setPaused(true);

    clearTimeout(inactivityTimer.current);

    inactivityTimer.current = setTimeout(() => {
      setPaused(false);
    }, idleResume);
  };

  const next = () => {
    userInteracted();
    setActive(prev => (prev + 1) % length);
  };

  const prev = () => {
    userInteracted();
    setActive(prev => (prev - 1 + length) % length);
  };

  const goTo = index => {
    userInteracted();
    setActive(index);
  };

  const onMouseEnter = () => {
    setPaused(true);
  };

  const onMouseLeave = () => {
    clearTimeout(inactivityTimer.current);

    inactivityTimer.current = setTimeout(() => {
      setPaused(false);
    }, idleResume);
  };

  return {
    active,
    next,
    prev,
    goTo,
    onMouseEnter,
    onMouseLeave,
  };
}
