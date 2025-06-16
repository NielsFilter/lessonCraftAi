import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLessonPlan } from '../contexts/LessonPlanContext';
import { Plus, Search, Filter, Calendar, BookOpen, Trash2, Eye, Edit3 } from 'lucide-react';

export const LessonPlansPage: React.FC = () => {
  const { lessonPlans, deleteLessonPlan, refreshLessonPlans } = useLessonPlan();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');

  useEffect(() => {
    refreshLessonPlans();
  }, []);

  const filteredPlans = lessonPlans.filter(plan => {
    const matchesSearch = plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || plan.status === filterStatus;
    const matchesSubject = filterSubject === 'all' || plan.subject === filterSubject;
    return matchesSearch && matchesStatus && matchesSubject;
  });

  const subjects = [...new Set(lessonPlans.map(plan => plan.subject))];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteLessonPlan(id);
      } catch (error) {
        console.error('Failed to delete lesson plan:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">Lesson Plans</h1>
            <p className="mt-2 text-zinc-400">
              Manage and organize your AI-generated lesson plans
            </p>
          </div>
          <Link
            to="/chat"
            className="btn-primary mt-4 sm:mt-0 inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Lesson Plan
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="card-modern rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="h-5 w-5 text-zinc-500 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="Search lesson plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-modern pl-10 block w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:text-sm"
              />
            </div>

            <div className="relative">
              <Filter className="h-5 w-5 text-zinc-500 absolute left-3 top-3.5" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-modern pl-10 block w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:text-sm"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="outline">Outline</option>
                <option value="detailed">Detailed</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="relative">
              <BookOpen className="h-5 w-5 text-zinc-500 absolute left-3 top-3.5" />
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="input-modern pl-10 block w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:text-sm"
              >
                <option value="all">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lesson Plans Grid */}
        {filteredPlans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => (
              <div key={plan.id} className="card-glow rounded-xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-zinc-100 mb-2">{plan.title}</h3>
                      <p className="text-sm text-zinc-400 mb-1">{plan.subject}</p>
                      <p className="text-sm text-zinc-500">{plan.age_group}</p>
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

                  <div className="flex items-center text-sm text-zinc-500 mb-6">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Created {formatDate(plan.created_at)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <Link
                        to={`/chat/${plan.id}`}
                        className="inline-flex items-center px-3 py-2 border border-zinc-700 text-sm font-medium rounded-lg text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                      <Link
                        to={`/chat/${plan.id}`}
                        className="inline-flex items-center px-3 py-2 border border-zinc-700 text-sm font-medium rounded-lg text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Link>
                    </div>
                    <button
                      onClick={() => handleDelete(plan.id, plan.title)}
                      className="inline-flex items-center px-3 py-2 border border-red-500/30 text-sm font-medium rounded-lg text-red-400 bg-red-500/5 hover:bg-red-500/10 hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-100 mb-2">No lesson plans found</h3>
            <p className="text-zinc-400 mb-6">
              {searchTerm || filterStatus !== 'all' || filterSubject !== 'all' 
                ? 'Try adjusting your search or filters.' 
                : 'Get started by creating your first lesson plan.'}
            </p>
            <Link
              to="/chat"
              className="btn-primary inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Lesson Plan
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};