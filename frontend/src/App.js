import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import StudyAssistant from './pages/StudyAssistant';
import KnowledgeManagement from './pages/KnowledgeManagement';
import KnowledgeMindMap from './pages/KnowledgeMindMap';
import LearningAnalysis from './pages/LearningAnalysis';
import AIQnA from './pages/AIQnA';
import QuestionGenerator from './pages/QuestionGenerator';
import ExerciseHistory from './pages/ExerciseHistory';
import LearningCommunity from './pages/LearningCommunity';
import PostDetail from './pages/PostDetail';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
import Layout from './components/Layout';

import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/profile" 
            element={localStorage.getItem('userId') ? (
              <Layout>
                <Profile />
              </Layout>
            ) : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/profile/:userId" 
            element={localStorage.getItem('userId') ? (
              <Layout>
                <Profile />
              </Layout>
            ) : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/study-assistant" 
            element={localStorage.getItem('userId') ? (
              <Layout>
                <StudyAssistant />
              </Layout>
            ) : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/knowledge-management" 
            element={localStorage.getItem('userId') ? (
              <Layout>
                <KnowledgeManagement />
              </Layout>
            ) : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/knowledge-mindmap" 
            element={localStorage.getItem('userId') ? (
              <Layout>
                <KnowledgeMindMap />
              </Layout>
            ) : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/learning-analysis" 
            element={localStorage.getItem('userId') ? (
              <Layout>
                <LearningAnalysis />
              </Layout>
            ) : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/ai-qna" 
            element={localStorage.getItem('userId') ? (
              <Layout>
                <AIQnA />
              </Layout>
            ) : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/question-generator" 
            element={localStorage.getItem('userId') ? (
              <Layout>
                <QuestionGenerator />
              </Layout>
            ) : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/exercise-history" 
            element={localStorage.getItem('userId') ? (
              <Layout>
                <ExerciseHistory />
              </Layout>
            ) : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/learning-community" 
            element={localStorage.getItem('userId') ? (
              <Layout>
                <LearningCommunity />
              </Layout>
            ) : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/post/:postId" 
            element={localStorage.getItem('userId') ? (
              <Layout>
                <PostDetail />
              </Layout>
            ) : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/settings" 
            element={localStorage.getItem('userId') ? (
              <Layout>
                <Settings />
              </Layout>
            ) : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/chat/:userId" 
            element={localStorage.getItem('userId') ? (
              <Layout>
                <Chat />
              </Layout>
            ) : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/notifications" 
            element={localStorage.getItem('userId') ? (
              <Layout>
                <Notifications />
              </Layout>
            ) : <Navigate to="/login" replace />} 
          />

        </Routes>
      </div>
    </Router>
  );
}

export default App;