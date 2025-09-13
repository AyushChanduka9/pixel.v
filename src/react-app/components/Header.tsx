import { Link, useLocation } from 'react-router';
import { useAuth } from '@getmocha/users-service/react';
import { Camera, User, Upload, Image, Folder, LogOut, Settings, Palette } from 'lucide-react';
import { useState } from 'react';
import UserSettings from './UserSettings';
import ThemeEditor from './ThemeEditor';

export default function Header() {
  const { user, logout, redirectToLogin } = useAuth();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  
  const navigation = [
    { name: 'Home', href: '/', icon: Camera, current: location.pathname === '/' },
    { name: 'Gallery', href: '/gallery', icon: Image, current: location.pathname === '/gallery' },
    { name: 'Upload', href: '/upload', icon: Upload, current: location.pathname === '/upload' },
    { name: 'Albums', href: '/albums', icon: Folder, current: location.pathname === '/albums' },
  ];

  return (
    <header className="bg-black/90 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black font-mono text-white tracking-wider">
              PIXELVAULT
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium font-mono tracking-wide transition-all duration-200 ${
                    item.current
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="uppercase">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
                      {user.google_user_data?.picture ? (
                        <img
                          src={user.google_user_data.picture}
                          alt={user.google_user_data.name || user.email}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className="text-gray-300 font-mono text-sm hidden sm:block">
                      {user.google_user_data?.name || user.email.split('@')[0]}
                    </span>
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-700">
                      <p className="text-sm font-medium text-white font-mono">
                        {user.google_user_data?.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        {user.email}
                      </p>
                    </div>
                    
                    <div className="py-2">
                      <button 
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowSettings(true);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors font-mono"
                      >
                        <Settings className="w-4 h-4 mr-3" />
                        SETTINGS
                      </button>
                      <button 
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowThemeEditor(true);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors font-mono"
                      >
                        <Palette className="w-4 h-4 mr-3" />
                        THEMES
                      </button>
                      <hr className="my-2 border-gray-700" />
                      <button
                        onClick={logout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors font-mono"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        LOGOUT
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/gallery"
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors font-mono text-sm uppercase tracking-wide"
                >
                  Browse
                </Link>
                <button
                  onClick={() => {
                    redirectToLogin();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all duration-200 font-mono text-sm uppercase tracking-wide shadow-lg hover:shadow-xl"
                >
                  Login
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Close user menu when clicking outside */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <UserSettings onClose={() => setShowSettings(false)} />
      )}

      {/* Theme Editor Modal */}
      {showThemeEditor && (
        <ThemeEditor onClose={() => setShowThemeEditor(false)} />
      )}
    </header>
  );
}
