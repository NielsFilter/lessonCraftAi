import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    google: any;
  }
}

export const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading Google Sign-In...');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize Google Sign-In
    const initializeGoogleSignIn = () => {
      if (window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render the Google Sign-In button
          window.google.accounts.id.renderButton(
            document.getElementById('google-signin-button'),
            {
              theme: 'outline',
              size: 'large',
              width: '100%',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
            }
          );

          setGoogleLoaded(true);
          setLoadingMessage('');
        } catch (error) {
          console.error('Error initializing Google Sign-In:', error);
          setLoadingMessage('Failed to load Google Sign-In');
        }
      }
    };

    // Check if Google script is already loaded
    if (window.google) {
      initializeGoogleSignIn();
    } else {
      // Wait for Google script to load
      const checkGoogleLoaded = setInterval(() => {
        if (window.google) {
          initializeGoogleSignIn();
          clearInterval(checkGoogleLoaded);
        }
      }, 100);

      // Cleanup interval after 10 seconds and show fallback
      setTimeout(() => {
        clearInterval(checkGoogleLoaded);
        if (!googleLoaded) {
          setLoadingMessage('Google Sign-In unavailable');
        }
      }, 10000);
    }
  }, []);

  const handleGoogleResponse = async (response: any) => {
    setIsLoading(true);
    try {
      await login(response.credential);
      navigate('/');
    } catch (error) {
      console.error('Google login failed:', error);
      alert('Google login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFallbackGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // Fallback for when Google Sign-In doesn't load (demo mode)
      const mockJWT = btoa(JSON.stringify({
        email: 'demo@google.com',
        name: 'Demo User',
        picture: 'https://images.pexels.com/photos/3760263/pexels-photo-3760263.jpeg?auto=compress&cs=tinysrgb&w=400',
        sub: 'google-demo-user-' + Date.now()
      }));
      
      await login(mockJWT);
      navigate('/');
    } catch (error) {
      console.error('Demo login failed:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5"></div>
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 shadow-lg shadow-blue-500/25">
              <GraduationCap className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gradient">
            Welcome to LessonCraft AI
          </h2>
          <p className="mt-2 text-zinc-400">
            Create intelligent lesson plans powered by AI
          </p>
        </div>

        <div className="glass rounded-2xl shadow-2xl p-8">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-zinc-100 mb-2">
                Sign in to continue
              </h3>
              <p className="text-sm text-zinc-400">
                Use your Google account to access LessonCraft AI
              </p>
            </div>

            {/* Google Sign-In Button Container */}
            <div className="space-y-4">
              {googleLoaded ? (
                <div id="google-signin-button" className="w-full"></div>
              ) : loadingMessage ? (
                <div className="flex items-center justify-center py-3 px-4 border border-zinc-700 rounded-lg bg-zinc-800/50">
                  {loadingMessage === 'Loading Google Sign-In...' ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-blue-400 mr-3" />
                      <span className="text-zinc-400">{loadingMessage}</span>
                    </>
                  ) : (
                    <span className="text-zinc-400">{loadingMessage}</span>
                  )}
                </div>
              ) : null}

              {/* Fallback button for demo mode */}
              {!googleLoaded && !loadingMessage && (
                <button
                  type="button"
                  onClick={handleFallbackGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-zinc-700 rounded-lg shadow-lg bg-zinc-800/50 text-sm font-medium text-zinc-100 hover:bg-zinc-800 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Signing in...
                    </>
                  ) : (
                    'Continue with Google (Demo)'
                  )}
                </button>
              )}
            </div>

            {isLoading && (
              <div className="text-center">
                <div className="inline-flex items-center text-sm text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Authenticating...
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-500">
              {import.meta.env.VITE_GOOGLE_CLIENT_ID ? 
                'Sign in with your Google account to access all features' :
                'Demo Mode: Click the button above to sign in with demo credentials'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};