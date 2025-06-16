import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Key, Save, Eye, EyeOff, CheckCircle, AlertCircle, User } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    gemini: '',
    sunoai: '',
    mongodb: ''
  });
  const [showKeys, setShowKeys] = useState({
    openai: false,
    gemini: false,
    sunoai: false,
    mongodb: false
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    checkApiKeysStatus();
  }, []);

  const checkApiKeysStatus = async () => {
    try {
      const result = await apiService.checkApiKeysConfigured();
      setIsConfigured(result.configured);
    } catch (error) {
      console.error('Failed to check API keys status:', error);
    }
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    
    try {
      await apiService.updateApiKeys(apiKeys);
      setSaveStatus('saved');
      await checkApiKeysStatus();
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save API keys:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const toggleKeyVisibility = (key: keyof typeof showKeys) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleKeyChange = (key: keyof typeof apiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-100">Profile & Settings</h1>
          <p className="mt-2 text-zinc-400">
            Manage your profile information and API configuration
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-1">
            <div className="card-modern rounded-xl p-6">
              <div className="flex items-center mb-4">
                <User className="h-5 w-5 text-blue-400 mr-2" />
                <h2 className="text-lg font-semibold text-zinc-100">Profile Information</h2>
              </div>
              
              <div className="text-center">
                <div className="relative inline-block">
                  <img
                    src={user?.avatar}
                    alt={user?.name}
                    className="h-24 w-24 rounded-full mx-auto object-cover mb-4 ring-4 ring-blue-500/20"
                  />
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-emerald-500 rounded-full border-2 border-zinc-900"></div>
                </div>
                <h3 className="text-lg font-medium text-zinc-100">{user?.name}</h3>
                <p className="text-zinc-400">{user?.email}</p>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    className="input-modern w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:text-sm"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="input-modern w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:text-sm"
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>

          {/* API Configuration */}
          <div className="lg:col-span-2">
            <div className="card-modern rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Key className="h-5 w-5 text-blue-400 mr-2" />
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-100">API Configuration</h2>
                    <p className="text-sm text-zinc-400">Configure your API keys for AI services</p>
                  </div>
                </div>
                {isConfigured && (
                  <div className="flex items-center text-emerald-400">
                    <CheckCircle className="h-5 w-5 mr-1" />
                    <span className="text-sm font-medium">Configured</span>
                  </div>
                )}
              </div>

              {!isConfigured && (
                <div className="mb-6 p-4 glass-light rounded-xl border border-yellow-500/20 bg-yellow-500/5">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-yellow-400">API Keys Required</h3>
                      <p className="text-sm text-yellow-400/80 mt-1">
                        You need to configure all API keys before creating lesson plans with full AI assistance.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* OpenAI API Key */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    OpenAI API Key
                    <span className="text-red-400 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys.openai ? 'text' : 'password'}
                      value={apiKeys.openai}
                      onChange={(e) => handleKeyChange('openai', e.target.value)}
                      placeholder="sk-..."
                      className="input-modern block w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility('openai')}
                      className="absolute right-4 top-3.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showKeys.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Used for Sora video generation</p>
                </div>

                {/* Google Gemini API Key */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Google Gemini API Key
                    <span className="text-red-400 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys.gemini ? 'text' : 'password'}
                      value={apiKeys.gemini}
                      onChange={(e) => handleKeyChange('gemini', e.target.value)}
                      placeholder="AIza..."
                      className="input-modern block w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility('gemini')}
                      className="absolute right-4 top-3.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showKeys.gemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Primary LLM for lesson plan generation</p>
                </div>

                {/* Suno AI API Key */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Suno AI API Key
                    <span className="text-red-400 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys.sunoai ? 'text' : 'password'}
                      value={apiKeys.sunoai}
                      onChange={(e) => handleKeyChange('sunoai', e.target.value)}
                      placeholder="suno_..."
                      className="input-modern block w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility('sunoai')}
                      className="absolute right-4 top-3.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showKeys.sunoai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">For generating custom songs and music</p>
                </div>

                {/* MongoDB Atlas Connection String */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    MongoDB Atlas Connection String
                    <span className="text-red-400 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showKeys.mongodb ? 'text' : 'password'}
                      value={apiKeys.mongodb}
                      onChange={(e) => handleKeyChange('mongodb', e.target.value)}
                      placeholder="mongodb+srv://..."
                      className="input-modern block w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility('mongodb')}
                      className="absolute right-4 top-3.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {showKeys.mongodb ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Database for storing documents and vectors</p>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                  className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-lg text-white transition-all duration-200 ${
                    saveStatus === 'saved' 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : saveStatus === 'error'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'btn-primary'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                >
                  {saveStatus === 'saving' && (
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  )}
                  {saveStatus === 'saved' ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Saved
                    </>
                  ) : saveStatus === 'error' ? (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Error
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};