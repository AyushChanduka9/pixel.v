import { useState, useEffect } from 'react';
import { Palette, Save, RefreshCw, Eye, Download, Upload, Check, X } from 'lucide-react';

interface ColorVariable {
  name: string;
  variable: string;
  value: string;
  category: string;
}

interface Theme {
  id: string;
  name: string;
  colors: Record<string, string>;
  createdAt: Date;
  isDefault?: boolean;
}

interface ThemeEditorProps {
  onClose: () => void;
}

const defaultColorVariables: ColorVariable[] = [
  // Primary Colors
  { name: 'Primary 50', variable: '--color-primary-50', value: '#1a1a2e', category: 'Primary' },
  { name: 'Primary 100', variable: '--color-primary-100', value: '#16213e', category: 'Primary' },
  { name: 'Primary 500', variable: '--color-primary-500', value: '#8b5cf6', category: 'Primary' },
  { name: 'Primary 600', variable: '--color-primary-600', value: '#7c3aed', category: 'Primary' },
  { name: 'Primary 700', variable: '--color-primary-700', value: '#6d28d9', category: 'Primary' },
  
  // Secondary Colors
  { name: 'Secondary 50', variable: '--color-secondary-50', value: '#0f172a', category: 'Secondary' },
  { name: 'Secondary 100', variable: '--color-secondary-100', value: '#1e293b', category: 'Secondary' },
  { name: 'Secondary 500', variable: '--color-secondary-500', value: '#3b82f6', category: 'Secondary' },
  { name: 'Secondary 600', variable: '--color-secondary-600', value: '#2563eb', category: 'Secondary' },
  { name: 'Secondary 700', variable: '--color-secondary-700', value: '#1d4ed8', category: 'Secondary' },
  
  // Background Colors
  { name: 'Background Light', variable: '--color-bg-light', value: '#000000', category: 'Background' },
  { name: 'Background Mild', variable: '--color-bg-mild', value: '#111111', category: 'Background' },
  { name: 'Background Soft', variable: '--color-bg-soft', value: '#1a1a1a', category: 'Background' },
  
  // Gray Colors
  { name: 'Gray 50', variable: '--color-gray-50', value: '#f8fafc', category: 'Neutral' },
  { name: 'Gray 100', variable: '--color-gray-100', value: '#f1f5f9', category: 'Neutral' },
  { name: 'Gray 200', variable: '--color-gray-200', value: '#e2e8f0', category: 'Neutral' },
  { name: 'Gray 300', variable: '--color-gray-300', value: '#cbd5e1', category: 'Neutral' },
  { name: 'Gray 400', variable: '--color-gray-400', value: '#94a3b8', category: 'Neutral' },
  { name: 'Gray 500', variable: '--color-gray-500', value: '#64748b', category: 'Neutral' },
  { name: 'Gray 600', variable: '--color-gray-600', value: '#475569', category: 'Neutral' },
  { name: 'Gray 700', variable: '--color-gray-700', value: '#334155', category: 'Neutral' },
  { name: 'Gray 800', variable: '--color-gray-800', value: '#1e293b', category: 'Neutral' },
  { name: 'Gray 900', variable: '--color-gray-900', value: '#0f172a', category: 'Neutral' },
  
  // Success Colors
  { name: 'Success 50', variable: '--color-success-50', value: '#f0fdf4', category: 'Status' },
  { name: 'Success 500', variable: '--color-success-500', value: '#22c55e', category: 'Status' },
  { name: 'Success 600', variable: '--color-success-600', value: '#16a34a', category: 'Status' },
  
  // Warning Colors
  { name: 'Warning 50', variable: '--color-warning-50', value: '#fffbeb', category: 'Status' },
  { name: 'Warning 500', variable: '--color-warning-500', value: '#f59e0b', category: 'Status' },
  { name: 'Warning 600', variable: '--color-warning-600', value: '#d97706', category: 'Status' },
  
  // Error Colors
  { name: 'Error 50', variable: '--color-error-50', value: '#fef2f2', category: 'Status' },
  { name: 'Error 500', variable: '--color-error-500', value: '#ef4444', category: 'Status' },
  { name: 'Error 600', variable: '--color-error-600', value: '#dc2626', category: 'Status' },
];

const presetThemes: Theme[] = [
  {
    id: 'default',
    name: 'Dark Tech Theme',
    colors: Object.fromEntries(defaultColorVariables.map(cv => [cv.variable, cv.value])),
    createdAt: new Date(),
    isDefault: true
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    colors: {
      '--color-primary-50': '#f0f9ff',
      '--color-primary-100': '#e0f2fe',
      '--color-primary-500': '#0ea5e9',
      '--color-primary-600': '#0284c7',
      '--color-primary-700': '#0369a1',
      '--color-secondary-50': '#ecfeff',
      '--color-secondary-100': '#cffafe',
      '--color-secondary-500': '#06b6d4',
      '--color-secondary-600': '#0891b2',
      '--color-secondary-700': '#0e7490',
      '--color-bg-light': '#f0f9ff',
      '--color-bg-mild': '#e0f2fe',
      '--color-bg-soft': '#bae6fd',
    },
    createdAt: new Date()
  },
  {
    id: 'forest',
    name: 'Forest Green',
    colors: {
      '--color-primary-50': '#f0fdf4',
      '--color-primary-100': '#dcfce7',
      '--color-primary-500': '#22c55e',
      '--color-primary-600': '#16a34a',
      '--color-primary-700': '#15803d',
      '--color-secondary-50': '#f7fee7',
      '--color-secondary-100': '#ecfccb',
      '--color-secondary-500': '#84cc16',
      '--color-secondary-600': '#65a30d',
      '--color-secondary-700': '#4d7c0f',
      '--color-bg-light': '#f0fdf4',
      '--color-bg-mild': '#dcfce7',
      '--color-bg-soft': '#bbf7d0',
    },
    createdAt: new Date()
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    colors: {
      '--color-primary-50': '#fff7ed',
      '--color-primary-100': '#ffedd5',
      '--color-primary-500': '#f97316',
      '--color-primary-600': '#ea580c',
      '--color-primary-700': '#c2410c',
      '--color-secondary-50': '#fef2f2',
      '--color-secondary-100': '#fee2e2',
      '--color-secondary-500': '#ef4444',
      '--color-secondary-600': '#dc2626',
      '--color-secondary-700': '#b91c1c',
      '--color-bg-light': '#fff7ed',
      '--color-bg-mild': '#ffedd5',
      '--color-bg-soft': '#fed7aa',
    },
    createdAt: new Date()
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    colors: {
      '--color-primary-50': '#1a1a2e',
      '--color-primary-100': '#16213e',
      '--color-primary-500': '#8b5cf6',
      '--color-primary-600': '#7c3aed',
      '--color-primary-700': '#6d28d9',
      '--color-secondary-50': '#0f172a',
      '--color-secondary-100': '#1e293b',
      '--color-secondary-500': '#64748b',
      '--color-secondary-600': '#475569',
      '--color-secondary-700': '#334155',
      '--color-bg-light': '#1e293b',
      '--color-bg-mild': '#0f172a',
      '--color-bg-soft': '#020617',
      '--color-gray-50': '#f8fafc',
      '--color-gray-100': '#f1f5f9',
      '--color-gray-200': '#e2e8f0',
      '--color-gray-300': '#cbd5e1',
      '--color-gray-400': '#94a3b8',
      '--color-gray-500': '#64748b',
      '--color-gray-600': '#475569',
      '--color-gray-700': '#334155',
      '--color-gray-800': '#1e293b',
      '--color-gray-900': '#0f172a',
    },
    createdAt: new Date()
  }
];

export default function ThemeEditor({ onClose }: ThemeEditorProps) {
  const [currentColors, setCurrentColors] = useState<Record<string, string>>(
    Object.fromEntries(defaultColorVariables.map(cv => [cv.variable, cv.value]))
  );
  const [themes, setThemes] = useState<Theme[]>(presetThemes);
  const [selectedTheme, setSelectedTheme] = useState<string>('default');
  const [previewMode, setPreviewMode] = useState(false);
  const [showContrast, setShowContrast] = useState(false);
  const [customThemeName, setCustomThemeName] = useState('');

  // Apply theme to CSS variables and background
  useEffect(() => {
    Object.entries(currentColors).forEach(([variable, value]) => {
      document.documentElement.style.setProperty(variable, value);
    });
    
    // Apply background color to body
    if (currentColors['--color-bg-light']) {
      document.body.style.backgroundColor = currentColors['--color-bg-light'];
    }
    
    // Apply comprehensive theme styling
    const rootElement = document.documentElement;
    
    // Apply Tailwind CSS custom properties
    if (currentColors['--color-primary-500']) {
      rootElement.style.setProperty('--tw-color-primary-500', currentColors['--color-primary-500']);
    }
    if (currentColors['--color-secondary-500']) {
      rootElement.style.setProperty('--tw-color-secondary-500', currentColors['--color-secondary-500']);
    }
    
    // Update button and interactive element colors
    const style = document.createElement('style');
    style.id = 'theme-override-styles';
    
    // Remove existing override styles
    const existingStyle = document.getElementById('theme-override-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    style.textContent = `
      /* Background Colors */
      body { 
        background-color: ${currentColors['--color-bg-light'] || '#ffffff'} !important;
        transition: background-color 0.3s ease;
      }
      
      .bg-gray-50 { 
        background-color: ${currentColors['--color-bg-mild'] || '#f9fafb'} !important; 
      }
      
      .bg-white { 
        background-color: ${currentColors['--color-bg-light'] || '#ffffff'} !important; 
      }
      
      /* Primary Colors */
      .bg-purple-600, .bg-gradient-to-r.from-purple-600 { 
        background: ${currentColors['--color-primary-600'] || '#7c3aed'} !important; 
      }
      
      .bg-purple-700, .hover\\:bg-purple-700:hover { 
        background: ${currentColors['--color-primary-700'] || '#6d28d9'} !important; 
      }
      
      .text-purple-600 { 
        color: ${currentColors['--color-primary-600'] || '#7c3aed'} !important; 
      }
      
      .text-purple-700 { 
        color: ${currentColors['--color-primary-700'] || '#6d28d9'} !important; 
      }
      
      .border-purple-500 { 
        border-color: ${currentColors['--color-primary-500'] || '#8b5cf6'} !important; 
      }
      
      /* Secondary Colors */
      .bg-blue-600, .bg-gradient-to-r.to-blue-500 { 
        background: ${currentColors['--color-secondary-600'] || '#2563eb'} !important; 
      }
      
      .bg-blue-700, .hover\\:bg-blue-700:hover { 
        background: ${currentColors['--color-secondary-700'] || '#1d4ed8'} !important; 
      }
      
      /* Gradients */
      .bg-gradient-to-r.from-purple-600.to-blue-500 {
        background: linear-gradient(to right, ${currentColors['--color-primary-600'] || '#7c3aed'}, ${currentColors['--color-secondary-500'] || '#3b82f6'}) !important;
      }
      
      .bg-gradient-to-br.from-purple-50.via-white.to-blue-50 {
        background: linear-gradient(to bottom right, ${currentColors['--color-primary-50'] || '#faf5ff'}, ${currentColors['--color-bg-light'] || '#ffffff'}, ${currentColors['--color-secondary-50'] || '#eff6ff'}) !important;
      }
      
      /* Enhanced Gray Colors */
      .bg-gray-100 { background-color: ${currentColors['--color-gray-100'] || '#f3f4f6'} !important; }
      .bg-gray-200 { background-color: ${currentColors['--color-gray-200'] || '#e5e7eb'} !important; }
      .bg-gray-300 { background-color: ${currentColors['--color-gray-300'] || '#d1d5db'} !important; }
      .text-gray-600 { color: ${currentColors['--color-gray-600'] || '#4b5563'} !important; }
      .text-gray-700 { color: ${currentColors['--color-gray-700'] || '#374151'} !important; }
      .text-gray-800 { color: ${currentColors['--color-gray-800'] || '#1f2937'} !important; }
      .text-gray-900 { color: ${currentColors['--color-gray-900'] || '#111827'} !important; }
      .border-gray-200 { border-color: ${currentColors['--color-gray-200'] || '#e5e7eb'} !important; }
      .border-gray-300 { border-color: ${currentColors['--color-gray-300'] || '#d1d5db'} !important; }
      
      /* Interactive States */
      .hover\\:bg-gray-50:hover { 
        background-color: ${currentColors['--color-bg-mild'] || '#f9fafb'} !important; 
      }
      
      .hover\\:bg-gray-100:hover { 
        background-color: ${currentColors['--color-gray-100'] || '#f3f4f6'} !important; 
      }
      
      /* Focus States */
      .focus\\:ring-purple-500:focus { 
        --tw-ring-color: ${currentColors['--color-primary-500'] || '#8b5cf6'} !important; 
      }
      
      /* Status Colors */
      .bg-green-600 { background-color: ${currentColors['--color-success-600'] || '#16a34a'} !important; }
      .bg-red-600 { background-color: ${currentColors['--color-error-600'] || '#dc2626'} !important; }
      .bg-yellow-600 { background-color: ${currentColors['--color-warning-600'] || '#d97706'} !important; }
      
      /* Card and Surface Colors */
      .shadow-sm, .shadow-lg, .shadow-xl {
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
      }
      
      /* Custom scrollbar theming */
      ::-webkit-scrollbar-track {
        background: ${currentColors['--color-bg-mild'] || '#f9fafb'};
      }
      
      ::-webkit-scrollbar-thumb {
        background: ${currentColors['--color-gray-300'] || '#d1d5db'};
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: ${currentColors['--color-gray-400'] || '#9ca3af'};
      }
    `;
    
    document.head.appendChild(style);
  }, [currentColors]);

  // Load applied theme on component mount
  useEffect(() => {
    const appliedTheme = localStorage.getItem('theme-applied');
    const savedColors = localStorage.getItem('theme-colors');
    
    if (appliedTheme === 'true' && savedColors) {
      try {
        const parsedColors = JSON.parse(savedColors);
        setCurrentColors({ ...defaultColorVariables.reduce((acc, cv) => ({ ...acc, [cv.variable]: cv.value }), {}), ...parsedColors });
      } catch (error) {
        console.error('Error loading saved theme:', error);
      }
    }
  }, []);

  const loadTheme = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      setCurrentColors({ ...defaultColorVariables.reduce((acc, cv) => ({ ...acc, [cv.variable]: cv.value }), {}), ...theme.colors });
      setSelectedTheme(themeId);
    }
  };

  const saveCustomTheme = () => {
    if (!customThemeName.trim()) return;

    const newTheme: Theme = {
      id: crypto.randomUUID(),
      name: customThemeName.trim(),
      colors: { ...currentColors },
      createdAt: new Date()
    };

    setThemes(prev => [...prev, newTheme]);
    setCustomThemeName('');
    setSelectedTheme(newTheme.id);
  };

  const exportTheme = () => {
    const themeData = {
      name: themes.find(t => t.id === selectedTheme)?.name || 'Custom Theme',
      colors: currentColors,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `theme-${themeData.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const themeData = JSON.parse(e.target?.result as string);
        if (themeData.colors) {
          const newTheme: Theme = {
            id: crypto.randomUUID(),
            name: themeData.name || 'Imported Theme',
            colors: themeData.colors,
            createdAt: new Date()
          };
          setThemes(prev => [...prev, newTheme]);
          loadTheme(newTheme.id);
        }
      } catch (error) {
        alert('Invalid theme file');
      }
    };
    reader.readAsText(file);
  };

  const updateColor = (variable: string, value: string) => {
    setCurrentColors(prev => ({ ...prev, [variable]: value }));
  };

  const resetToDefault = () => {
    loadTheme('default');
  };

  const applyTheme = () => {
    console.log('Applying comprehensive theme with colors:', currentColors);
    
    // Apply theme permanently to document root and body
    Object.entries(currentColors).forEach(([variable, value]) => {
      document.documentElement.style.setProperty(variable, value);
      console.log(`Applied CSS variable ${variable}: ${value}`);
    });
    
    // Apply body background
    if (currentColors['--color-bg-light']) {
      document.body.style.backgroundColor = currentColors['--color-bg-light'];
      console.log('Applied body background:', currentColors['--color-bg-light']);
    }
    
    // Save to localStorage for persistence
    localStorage.setItem('theme-colors', JSON.stringify(currentColors));
    localStorage.setItem('theme-applied', 'true');
    
    // Force a comprehensive style refresh
    const styleSheets = document.styleSheets;
    for (let i = 0; i < styleSheets.length; i++) {
      try {
        const sheet = styleSheets[i] as CSSStyleSheet;
        sheet.disabled = true;
        sheet.disabled = false;
      } catch (e) {
        // Ignore cross-origin stylesheet errors
      }
    }
    
    // Force DOM reflow
    document.body.style.display = 'none';
    document.body.offsetHeight; // Trigger reflow
    document.body.style.display = '';
    
    // Dispatch a custom event to notify components of theme change
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: currentColors }));
    
    // Create and show success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300';
    notification.innerHTML = '✅ Theme applied successfully! Changes will persist across page refreshes.';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
    
    onClose(); // Close the theme editor after applying
  };

  const getContrastRatio = (color1: string, color2: string): number => {
    // Simplified contrast calculation
    const getLuminance = (hex: string) => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
  };

  const groupedColors = defaultColorVariables.reduce((acc, colorVar) => {
    if (!acc[colorVar.category]) {
      acc[colorVar.category] = [];
    }
    acc[colorVar.category].push(colorVar);
    return acc;
  }, {} as Record<string, ColorVariable[]>);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Advanced Theme Editor</h2>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                previewMode 
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>{previewMode ? 'Preview On' : 'Preview Off'}</span>
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Theme Selection */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Preset Themes</h3>
              <div className="space-y-2">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => loadTheme(theme.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTheme === theme.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{theme.name}</div>
                    <div className="flex space-x-1 mt-2">
                      {Object.values(theme.colors).slice(0, 5).map((color, index) => (
                        <div
                          key={index}
                          className="w-4 h-4 rounded border border-gray-200"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Theme Creation */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Custom Theme</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Theme name"
                  value={customThemeName}
                  onChange={(e) => setCustomThemeName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={saveCustomTheme}
                  disabled={!customThemeName.trim()}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Theme</span>
                </button>
              </div>
            </div>

            {/* Import/Export */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Import/Export</h3>
              <div className="space-y-2">
                <button
                  onClick={exportTheme}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Theme</span>
                </button>
                
                <label className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Import Theme</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importTheme}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Accessibility */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Accessibility</h3>
              <button
                onClick={() => setShowContrast(!showContrast)}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  showContrast 
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Check Contrast</span>
              </button>
            </div>
          </div>

          {/* Color Editor */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(groupedColors).map(([category, colors]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{category} Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {colors.map((colorVar) => (
                    <div key={colorVar.variable} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {colorVar.name}
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="color"
                          value={currentColors[colorVar.variable] || colorVar.value}
                          onChange={(e) => updateColor(colorVar.variable, e.target.value)}
                          className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={currentColors[colorVar.variable] || colorVar.value}
                          onChange={(e) => updateColor(colorVar.variable, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                        />
                      </div>
                      
                      {showContrast && category === 'Primary' && (
                        <div className="text-xs text-gray-500">
                          Contrast with white: {getContrastRatio(currentColors[colorVar.variable] || colorVar.value, '#ffffff').toFixed(2)}:1
                          {getContrastRatio(currentColors[colorVar.variable] || colorVar.value, '#ffffff') >= 4.5 ? ' ✓' : ' ⚠️'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            <button
              onClick={resetToDefault}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset to Default</span>
            </button>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  localStorage.removeItem('theme-colors');
                  localStorage.removeItem('theme-applied');
                  resetToDefault();
                  
                  // Reset body background
                  document.body.style.backgroundColor = '';
                  
                  // Remove override styles
                  const existingStyle = document.getElementById('theme-override-styles');
                  if (existingStyle) {
                    existingStyle.remove();
                  }
                  
                  const notification = document.createElement('div');
                  notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                  notification.textContent = 'Theme reset to default!';
                  document.body.appendChild(notification);
                  setTimeout(() => notification.remove(), 3000);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Clear Applied Theme
              </button>
              <button
                onClick={applyTheme}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Apply Theme Globally
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
