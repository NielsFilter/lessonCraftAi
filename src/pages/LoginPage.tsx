import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    console.log('Google login successful:', credentialResponse);
    setIsLoading(true);
    setError(null);
    
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }

      await login(credentialResponse.credential);
      navigate('/');
    } catch (error) {
      console.error('Google login failed:', error);
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error('Google login error');
    setError('Google authentication failed. Please try again.');
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
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Google Sign-In Button */}
            <div className="flex justify-center">
              {isLoading ? (
                <div className="flex items-center justify-center py-3 px-6 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-400 mr-3" />
                  <span className="text-zinc-400">Authenticating...</span>
                </div>
              ) : (
                <div className="w-full flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap={false}
                  />
                </div>
              )}
            </div>

            {/* Retry Button */}
            {error && !isLoading && (
              <div className="text-center">
                <button
                  onClick={() => setError(null)}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-500">
              Secure authentication powered by Google OAuth 2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};