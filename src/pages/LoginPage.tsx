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
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize Google Sign-In
    const initializeGoogleSignIn = () => {
      if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render the Google Sign-In button
          const buttonElement = document.getElementById('google-signin-button');
          if (buttonElement) {
            window.google.accounts.id.renderButton(buttonElement, {
              theme: 'outline',
              size: 'large',
              width: '100%',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
            });
          }

          setGoogleLoaded(true);
        } catch (error) {
          console.error('Error initializing Google Sign-In:', error);
          setError('Failed to initialize Google Sign-In');
        }
      } else if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        setError('Google Client ID not configured');
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

      // Cleanup interval after 10 seconds
      setTimeout(() => {
        clearInterval(checkGoogleLoaded);
        if (!googleLoaded && !error) {
          setError('Google Sign-In failed to load');
        }
      }, 10000);

      return () => clearInterval(checkGoogleLoaded);
    }
  }, [googleLoaded, error]);

  const handleGoogleResponse = async (response: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await login(response.credential);
      navigate('/');
    } catch (error) {
      console.error('Google login failed:', error);
      setError('Authentication failed. Please try again.');
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

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400 text-center">{error}</p>
              </div>
            )}

            {/* Google Sign-In Button Container */}
            <div className="space-y-4">
              {!googleLoaded && !error && (
                <div className="flex items-center justify-center py-4 px-4 border border-zinc-700 rounded-lg bg-zinc-800/50">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400 mr-3" />
                  <span className="text-zinc-400">Loading Google Sign-In...</span>
                </div>
              )}

              {googleLoaded && (
                <div id="google-signin-button" className="w-full"></div>
              )}

              {error && !googleLoaded && (
                <div className="text-center py-4">
                  <button
                    onClick={() => window.location.reload()}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {isLoading && (
              <div className="text-center">
                <div className="inline-flex items-center text-sm text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Authenticating with Google...
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-500">
              Secure authentication powered by Google
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};