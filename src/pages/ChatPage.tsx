import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLessonPlan } from '../contexts/LessonPlanContext';
import { apiService } from '../services/api';
import { Send, Paperclip, X, FileText, Image, Loader2, Settings, BookOpen, Sparkles } from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    activeLessonPlan, 
    messages, 
    setActiveLessonPlan, 
    sendMessage, 
    createLessonPlan 
  } = useLessonPlan();
  
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showNewLessonModal, setShowNewLessonModal] = useState(false);
  const [newLessonData, setNewLessonData] = useState({
    title: '',
    subject: '',
    ageGroup: '',
    description: ''
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      setActiveLessonPlan(id).catch(() => {
        navigate('/');
      });
    } else if (!activeLessonPlan) {
      setShowNewLessonModal(true);
    }
  }, [id, activeLessonPlan, setActiveLessonPlan, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() && attachments.length === 0) return;
    if (!activeLessonPlan) return;

    // Upload files first if any
    const uploadedFileNames: string[] = [];
    for (const file of attachments) {
      try {
        const result = await apiService.uploadFile(file, activeLessonPlan.id);
        uploadedFileNames.push(result.filename);
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }

    setIsTyping(true);
    
    try {
      await sendMessage(message, uploadedFileNames.length > 0 ? uploadedFileNames : undefined);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setMessage('');
      setAttachments([]);
      setIsTyping(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateNewLesson = async () => {
    if (!newLessonData.title || !newLessonData.subject || !newLessonData.ageGroup) {
      return;
    }

    try {
      const newId = await createLessonPlan(
        newLessonData.title, 
        newLessonData.subject, 
        newLessonData.ageGroup,
        newLessonData.description
      );
      
      await setActiveLessonPlan(newId);
      setShowNewLessonModal(false);
      setNewLessonData({ title: '', subject: '', ageGroup: '', description: '' });
      navigate(`/chat/${newId}`);
    } catch (error) {
      console.error('Failed to create lesson plan:', error);
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  if (showNewLessonModal) {
    return (
      <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="glass rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-zinc-100">Create New Lesson Plan</h2>
            <button
              onClick={() => {
                setShowNewLessonModal(false);
                navigate('/');
              }}
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Lesson Title
              </label>
              <input
                type="text"
                value={newLessonData.title}
                onChange={(e) => setNewLessonData(prev => ({ ...prev, title: e.target.value }))}
                className="input-modern w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="e.g., Introduction to Fractions"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Subject
              </label>
              <select
                value={newLessonData.subject}
                onChange={(e) => setNewLessonData(prev => ({ ...prev, subject: e.target.value }))}
                className="input-modern w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="">Select a subject</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Science">Science</option>
                <option value="English">English</option>
                <option value="History">History</option>
                <option value="Geography">Geography</option>
                <option value="Art">Art</option>
                <option value="Music">Music</option>
                <option value="Physical Education">Physical Education</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Age Group
              </label>
              <select
                value={newLessonData.ageGroup}
                onChange={(e) => setNewLessonData(prev => ({ ...prev, ageGroup: e.target.value }))}
                className="input-modern w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="">Select age group</option>
                <option value="5-7 years">5-7 years (Kindergarten - 1st Grade)</option>
                <option value="7-9 years">7-9 years (2nd - 3rd Grade)</option>
                <option value="9-11 years">9-11 years (4th - 5th Grade)</option>
                <option value="11-13 years">11-13 years (6th - 7th Grade)</option>
                <option value="13-15 years">13-15 years (8th - 9th Grade)</option>
                <option value="15-18 years">15-18 years (10th - 12th Grade)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={newLessonData.description}
                onChange={(e) => setNewLessonData(prev => ({ ...prev, description: e.target.value }))}
                className="input-modern w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                rows={3}
                placeholder="Brief description of the lesson objectives..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowNewLessonModal(false);
                navigate('/');
              }}
              className="btn-secondary px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateNewLesson}
              disabled={!newLessonData.title || !newLessonData.subject || !newLessonData.ageGroup}
              className="btn-primary px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-colors"
            >
              Create Lesson Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeLessonPlan) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <BookOpen className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-100 mb-2">No lesson plan selected</h3>
            <p className="text-zinc-400">Please select a lesson plan to continue the conversation.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-zinc-950">
      {/* Header */}
      <div className="glass-light border-b border-zinc-800/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">{activeLessonPlan.title}</h1>
            <p className="text-sm text-zinc-400">
              {activeLessonPlan.subject} • {activeLessonPlan.age_group}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
              activeLessonPlan.status === 'completed' ? 'status-completed' :
              activeLessonPlan.status === 'detailed' ? 'status-detailed' :
              activeLessonPlan.status === 'outline' ? 'status-outline' :
              'status-draft'
            }`}>
              {activeLessonPlan.status}
            </span>
            <button className="p-2 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800/50 transition-colors">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="glass-light rounded-2xl p-8 max-w-2xl mx-auto border border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-violet-500/5">
              <div className="flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gradient mb-4">
                Ready to create your lesson plan?
              </h3>
              <p className="text-zinc-400 mb-6">
                I'll help you create a comprehensive lesson plan. You can start by describing your learning objectives, uploading relevant documents, or asking specific questions about your lesson.
              </p>
              <div className="text-sm text-zinc-400 text-left">
                <p className="font-medium text-blue-400 mb-2">Pro Tips:</p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    Upload curriculum documents or reference materials
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    Ask me to create an outline for your lesson
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    Request detailed content for specific sections
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    Ask about assessment methods or differentiation strategies
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl px-4 py-3 rounded-2xl ${
                msg.sender === 'user' 
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white' 
                  : 'glass-light text-zinc-100'
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {msg.attachments.map((filename, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm opacity-80">
                        {getFileIcon(filename)}
                        <span className="truncate">{filename}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className={`text-xs mt-2 ${msg.sender === 'user' ? 'text-blue-100' : 'text-zinc-500'}`}>
                  {formatTimestamp(msg.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="glass-light px-4 py-3 rounded-2xl flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
              <span className="text-zinc-400">AI is typing...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-6 py-3 glass-light border-t border-zinc-800/50">
          <div className="flex items-center space-x-2 flex-wrap">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center space-x-2 bg-zinc-800/50 px-3 py-2 rounded-lg border border-zinc-700/50">
                {getFileIcon(file.name)}
                <span className="text-sm text-zinc-100 truncate max-w-32">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="glass-light border-t border-zinc-800/50 px-6 py-4">
        <div className="flex items-end space-x-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800/50 transition-colors"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          
          <div className="flex-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your message about the lesson plan..."
              className="input-modern w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={(!message.trim() && attachments.length === 0) || isTyping}
            className="btn-primary p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};