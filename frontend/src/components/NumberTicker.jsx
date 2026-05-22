import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function NumberTicker({ value, className = '', prefix = '', suffix = '' }) {
  const { currency } = useAuth();
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef(null);
  const startValue = useRef(displayValue);
  const endValue = useRef(value);
  const duration = 1000;

  useEffect(() => {
    startValue.current = displayValue;
    endValue.current = value;
    startTime.current = performance.now();

    const animate = (time) => {
      let timeFraction = (time - startTime.current) / duration;
      if (timeFraction > 1) timeFraction = 1;
      
      const progress = timeFraction === 1 ? 1 : 1 - Math.pow(2, -10 * timeFraction);
      
      const currentVal = startValue.current + (endValue.current - startValue.current) * progress;
      setDisplayValue(currentVal);

      if (timeFraction < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue.current);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  const locales = {
    'BRL': 'pt-BR',
    'USD': 'en-US',
    'CAD': 'en-CA',
    'EUR': 'de-DE',
    'GBP': 'en-GB'
  };

  const isCurrency = prefix && prefix.length > 0;
  const formatted = displayValue.toLocaleString(locales[currency] || 'pt-BR', {
    minimumFractionDigits: isCurrency || value % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: isCurrency || value % 1 !== 0 ? 2 : 0,
  });

  return (
    <span className={`inline-block whitespace-nowrap ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
