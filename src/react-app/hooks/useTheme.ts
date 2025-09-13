import { useEffect, useState } from 'react';

interface ThemeColors {
  [variable: string]: string;
}

export function useTheme() {
  const [themeColors, setThemeColors] = useState<ThemeColors>({});
  const [isThemeApplied, setIsThemeApplied] = useState(false);

  useEffect(() => {
    // Load saved theme on mount
    const savedColors = localStorage.getItem('theme-colors');
    const appliedTheme = localStorage.getItem('theme-applied');
    
    if (appliedTheme === 'true' && savedColors) {
      try {
        const parsedColors = JSON.parse(savedColors);
        setThemeColors(parsedColors);
        setIsThemeApplied(true);
        
        // Apply the saved theme immediately
        Object.entries(parsedColors).forEach(([variable, value]) => {
          document.documentElement.style.setProperty(variable, value as string);
        });
      } catch (error) {
        console.error('Error loading saved theme:', error);
      }
    }

    // Listen for theme changes
    const handleThemeChange = (event: CustomEvent) => {
      const newColors = event.detail;
      setThemeColors(newColors);
      setIsThemeApplied(true);
    };

    window.addEventListener('themeChanged', handleThemeChange as EventListener);

    return () => {
      window.removeEventListener('themeChanged', handleThemeChange as EventListener);
    };
  }, []);

  const applyTheme = (colors: ThemeColors) => {
    // Apply theme to CSS variables
    Object.entries(colors).forEach(([variable, value]) => {
      document.documentElement.style.setProperty(variable, value);
    });
    
    // Save to localStorage
    localStorage.setItem('theme-colors', JSON.stringify(colors));
    localStorage.setItem('theme-applied', 'true');
    
    // Update state
    setThemeColors(colors);
    setIsThemeApplied(true);
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: colors }));
  };

  const resetTheme = () => {
    localStorage.removeItem('theme-colors');
    localStorage.removeItem('theme-applied');
    setThemeColors({});
    setIsThemeApplied(false);
    
    // Reset CSS variables to defaults
    const defaultColors = {
      '--color-primary-50': '#faf5ff',
      '--color-primary-100': '#f3e8ff',
      '--color-primary-500': '#8b5cf6',
      '--color-primary-600': '#7c3aed',
      '--color-primary-700': '#6d28d9',
      '--color-secondary-50': '#eff6ff',
      '--color-secondary-100': '#dbeafe',
      '--color-secondary-500': '#3b82f6',
      '--color-secondary-600': '#2563eb',
      '--color-secondary-700': '#1d4ed8',
    };
    
    Object.entries(defaultColors).forEach(([variable, value]) => {
      document.documentElement.style.setProperty(variable, value);
    });
    
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: defaultColors }));
  };

  return {
    themeColors,
    isThemeApplied,
    applyTheme,
    resetTheme
  };
}
