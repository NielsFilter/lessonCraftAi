import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LessonPlanProvider } from './contexts/LessonPlanContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { ChatPage } from './pages/ChatPage';
import { LessonPlansPage } from './pages/LessonPlansPage';

function App() {
  return (
    <AuthProvider>
      <LessonPlanProvider>
        <Router>
          <div className="min-h-screen bg-zinc-950">
            <Navbar />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/lesson-plans" element={
                <ProtectedRoute>
                  <LessonPlansPage />
                </ProtectedRoute>
              } />
              <Route path="/chat" element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              } />
              <Route path="/chat/:id" element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </Router>
      </LessonPlanProvider>
    </AuthProvider>
  );
}

export default App;