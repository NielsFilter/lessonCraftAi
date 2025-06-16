import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLessonPlan } from '../contexts/LessonPlanContext';
import { apiService } from '../services/api';
import { Plus, BookOpen, MessageCircle, Clock, CheckCircle2, FileText, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { lessonPlans, refreshLessonPlans } = useLessonPlan();
  const [apiKeysConfigured, setApiKeysConfigured] = useState(false);
  const [isCheckingKeys, setIsCheckingKeys] = useState(true);

  useEffect(() => {
    refreshLessonPlans();
    checkApiKeys();
  }, []);

  const checkApiKeys = async () => {
    try {
      const result = await apiService.checkApiKeysConfigured();
      setApiKeysConfigured(result.configured);
    } catch (error) {
      console.error('Failed to check API keys:', error);
    } finally {
      setIsCheckingKeys(false);
    }
  };

  const recentLessonPlans = lessonPlans.slice(0, 3);
  const completedPlans = lessonPlans.filter(plan => plan.status === 'completed').length;
  const draftPlans = lessonPlans.filter(plan => plan.status === 'draft').length;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-zinc-100 mb-2">
            Welcome back, <span className="text-gradient">{user?.name}</span>!
          </h1>
          <p className="text-zinc-400 text-lg">
            Ready to create amazing lesson plans with AI assistance?
          </p>
        </div>

        {/* API Keys Warning */}
        {!isCheckingKeys && !apiKeysConfigured && (
          <div className="mb-8 p-4 glass-light rounded-xl border border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-400">API Configuration Required</h3>
                <p className="text-sm text-yellow-400/80 mt-1">
                  To use the full AI-powered lesson planning features, please configure your API keys in your profile.
                </p>
                <Link
                  to="/profile"
                  className="mt-2 inline-flex items-center text-sm font-medium text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  Configure API Keys →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card-glow rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-zinc-400">Total Lessons</p>
                <p className="text-3xl font-bold text-zinc-100">{lessonPlans.length}</p>
              </div>
            </div>
          </div>

          <div className="card-glow rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-zinc-400">Completed</p>
                <p className="text-3xl font-bold text-zinc-100">{completedPlans}</p>
              </div>
            </div>
          </div>

          <div className="card-glow rounded-xl p-6">
            <div className="flex items-center">
              <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
                <Clock className="h-6 w-6 text-violet-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-zinc-400">In Progress</p>
                <p className="text-3xl font-bold text-zinc-100">{draftPlans}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="card-modern rounded-xl p-6">
            <h2 className="text-xl font-semibold text-zinc-100 mb-6 flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-blue-400" />
              Quick Actions
            </h2>
            <div className="space-y-4">
              <Link
                to="/chat"
                className="flex items-center p-4 bg-gradient-to-r from-blue-500/10 to-violet-500/10 rounded-xl hover:from-blue-500/20 hover:to-violet-500/20 transition-all duration-300 group border border-blue-500/20 hover:border-blue-500/40"
              >
                <div className="p-3 bg-gradient-to-r from-blue-600 to-violet-600 rounded-xl group-hover:scale-110 transition-transform duration-200">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-zinc-100">Create New Lesson Plan</p>
                  <p className="text-sm text-zinc-400">Start a new AI-powered lesson plan</p>
                </div>
              </Link>

              <Link
                to="/lesson-plans"
                className="flex items-center p-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl hover:from-emerald-500/20 hover:to-blue-500/20 transition-all duration-300 group border border-emerald-500/20 hover:border-emerald-500/40"
              >
                <div className="p-3 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-xl group-hover:scale-110 transition-transform duration-200">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-zinc-100">Browse Lesson Plans</p>
                  <p className="text-sm text-zinc-400">View and manage your lesson plans</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Lesson Plans */}
          <div className="card-modern rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-zinc-100">Recent Lesson Plans</h2>
              <Link to="/lesson-plans" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                View all
              </Link>
            </div>
            
            {recentLessonPlans.length > 0 ? (
              <div className="space-y-3">
                {recentLessonPlans.map((plan) => (
                  <Link
                    key={plan.id}
                    to={`/chat/${plan.id}`}
                    className="block border border-zinc-800/50 rounded-lg p-4 hover:bg-zinc-800/30 hover:border-zinc-700/50 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-zinc-100">{plan.title}</h3>
                        <p className="text-sm text-zinc-400">{plan.subject} • {plan.age_group}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
                        plan.status === 'completed' ? 'status-completed' :
                        plan.status === 'detailed' ? 'status-detailed' :
                        plan.status === 'outline' ? 'status-outline' :
                        'status-draft'
                      }`}>
                        {plan.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-500">
                  No lesson plans yet. Create your first one!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className="glass-light rounded-xl p-6 border border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-violet-500/5">
          <div className="flex items-start">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <TrendingUp className="h-6 w-6 text-blue-400" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-zinc-100 mb-2">Pro Tips for Better Lesson Plans</h3>
              <ul className="text-sm text-zinc-400 space-y-2">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  Upload relevant documents to provide context for the AI
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  Be specific about your students' age group and learning level
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  Ask the AI to create an outline first, then request detailed content
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  Include learning objectives and assessment criteria in your requests
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};