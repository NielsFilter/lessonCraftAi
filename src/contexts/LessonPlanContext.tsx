import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  attachments?: string[];
}

export interface LessonPlan {
  id: string;
  title: string;
  subject: string;
  age_group: string;
  status: 'draft' | 'outline' | 'detailed' | 'completed';
  created_at: Date;
  updated_at: Date;
  outline?: string[];
  details?: Record<string, string>;
}

interface LessonPlanContextType {
  lessonPlans: LessonPlan[];
  activeLessonPlan: LessonPlan | null;
  messages: Message[];
  isLoading: boolean;
  createLessonPlan: (title: string, subject: string, ageGroup: string, description?: string) => Promise<string>;
  updateLessonPlan: (id: string, updates: Partial<LessonPlan>) => Promise<void>;
  deleteLessonPlan: (id: string) => Promise<void>;
  setActiveLessonPlan: (id: string | null) => Promise<void>;
  sendMessage: (message: string, attachments?: string[]) => Promise<void>;
  refreshLessonPlans: () => Promise<void>;
}

const LessonPlanContext = createContext<LessonPlanContextType | undefined>(undefined);

export const useLessonPlan = () => {
  const context = useContext(LessonPlanContext);
  if (context === undefined) {
    throw new Error('useLessonPlan must be used within a LessonPlanProvider');
  }
  return context;
};

export const LessonPlanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [activeLessonPlan, setActiveLessonPlanState] = useState<LessonPlan | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      refreshLessonPlans();
    }
  }, [user]);

  const refreshLessonPlans = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const plans = await apiService.getLessonPlans();
      setLessonPlans(plans.map((plan: any) => ({
        ...plan,
        created_at: new Date(plan.created_at),
        updated_at: new Date(plan.updated_at)
      })));
    } catch (error) {
      console.error('Failed to fetch lesson plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createLessonPlan = async (title: string, subject: string, ageGroup: string, description?: string): Promise<string> => {
    try {
      const newPlan = await apiService.createLessonPlan({
        title,
        subject,
        age_group: ageGroup,
        description
      });
      
      const formattedPlan = {
        ...newPlan,
        created_at: new Date(newPlan.created_at),
        updated_at: new Date(newPlan.updated_at)
      };
      
      setLessonPlans(prev => [formattedPlan, ...prev]);
      return newPlan.id;
    } catch (error) {
      console.error('Failed to create lesson plan:', error);
      throw error;
    }
  };

  const updateLessonPlan = async (id: string, updates: Partial<LessonPlan>) => {
    try {
      const updatedPlan = await apiService.updateLessonPlan(id, updates);
      const formattedPlan = {
        ...updatedPlan,
        created_at: new Date(updatedPlan.created_at),
        updated_at: new Date(updatedPlan.updated_at)
      };
      
      setLessonPlans(prev => prev.map(plan => 
        plan.id === id ? formattedPlan : plan
      ));
      
      if (activeLessonPlan?.id === id) {
        setActiveLessonPlanState(formattedPlan);
      }
    } catch (error) {
      console.error('Failed to update lesson plan:', error);
      throw error;
    }
  };

  const deleteLessonPlan = async (id: string) => {
    try {
      await apiService.deleteLessonPlan(id);
      setLessonPlans(prev => prev.filter(plan => plan.id !== id));
      
      if (activeLessonPlan?.id === id) {
        setActiveLessonPlanState(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete lesson plan:', error);
      throw error;
    }
  };

  const setActiveLessonPlan = async (id: string | null) => {
    if (!id) {
      setActiveLessonPlanState(null);
      setMessages([]);
      return;
    }

    try {
      const plan = await apiService.getLessonPlan(id);
      const formattedPlan = {
        ...plan,
        created_at: new Date(plan.created_at),
        updated_at: new Date(plan.updated_at)
      };
      
      setActiveLessonPlanState(formattedPlan);
      
      // Load messages
      const chatMessages = await apiService.getChatMessages(id);
      setMessages(chatMessages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })));
    } catch (error) {
      console.error('Failed to set active lesson plan:', error);
      throw error;
    }
  };

  const sendMessage = async (message: string, attachments?: string[]) => {
    if (!activeLessonPlan) return;

    try {
      // Add user message immediately
      const userMessage: Message = {
        id: Date.now().toString(),
        content: message,
        sender: 'user',
        timestamp: new Date(),
        attachments
      };
      
      setMessages(prev => [...prev, userMessage]);

      // Send to API
      const response = await apiService.sendMessage({
        message,
        lesson_plan_id: activeLessonPlan.id,
        attachments
      });

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);

      // Update lesson plan if it was modified
      if (response.lesson_plan_updated) {
        const updatedPlan = await apiService.getLessonPlan(activeLessonPlan.id);
        const formattedPlan = {
          ...updatedPlan,
          created_at: new Date(updatedPlan.created_at),
          updated_at: new Date(updatedPlan.updated_at)
        };
        
        setActiveLessonPlanState(formattedPlan);
        setLessonPlans(prev => prev.map(plan => 
          plan.id === activeLessonPlan.id ? formattedPlan : plan
        ));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  return (
    <LessonPlanContext.Provider value={{
      lessonPlans,
      activeLessonPlan,
      messages,
      isLoading,
      createLessonPlan,
      updateLessonPlan,
      deleteLessonPlan,
      setActiveLessonPlan,
      sendMessage,
      refreshLessonPlans
    }}>
      {children}
    </LessonPlanContext.Provider>
  );
};