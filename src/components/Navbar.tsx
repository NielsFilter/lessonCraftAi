import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, User, MessageSquare, FileText, LogOut, Settings } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="glass border-b border-zinc-800/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="p-1 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 group-hover:from-blue-500 group-hover:to-violet-500 transition-all duration-200">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">LessonCraft AI</span>
            </Link>
          </div>

          <div className="flex items-center space-x-1">
            <Link
              to="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive('/') 
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/lesson-plans"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                isActive('/lesson-plans') 
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              <FileText className="h-4 w-4 mr-1" />
              Lesson Plans
            </Link>
            <Link
              to="/chat"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                isActive('/chat') 
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat
            </Link>

            <div className="relative group ml-4">
              <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-zinc-800/50 transition-all duration-200">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-zinc-700"
                />
                <span className="text-sm font-medium text-zinc-100 hidden sm:block">{user.name}</span>
              </button>
              
              <div className="absolute right-0 mt-2 w-48 glass rounded-lg shadow-xl py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <Link
                  to="/profile"
                  className="flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Profile & Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100 transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};