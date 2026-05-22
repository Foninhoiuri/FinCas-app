import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function AnimatedThemeToggler() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // Inicializa verificando classe no html
    if (document.documentElement.classList.contains('light')) {
      setTheme('light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-14 h-8 rounded-full transition-colors duration-500 flex items-center px-1 ${
        theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
      }`}
    >
      <div
        className={`absolute w-6 h-6 rounded-full glass-accent flex items-center justify-center transition-transform duration-500 ${
          theme === 'dark' ? 'translate-x-6' : 'translate-x-0 bg-white'
        }`}
      >
        {theme === 'dark' ? (
          <Moon size={14} className="text-accent-light" />
        ) : (
          <Sun size={14} className="text-yellow-500" />
        )}
      </div>
    </button>
  );
}
