import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getUser, getToken, clearAuth, setAuth } from './api';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import PublicVerifyPage from './components/PublicVerifyPage';

export default function App() {
  const [user, setUser] = useState(getUser());
  const [loading, setLoading] = useState(false);

  const handleLogin = (token, userData) => {
    setAuth(token, userData);
    setUser(userData);
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
  };

  return (
    <Router>
      <Routes>
        {/* Public verification page - accessible without login */}
        <Route path="/verify/:token" element={<PublicVerifyPage />} />

        {/* Auth pages */}
        <Route
          path="/login"
          element={
            user
              ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />
              : <LoginPage onLogin={handleLogin} />
          }
        />
        <Route
          path="/register"
          element={
            user
              ? <Navigate to="/dashboard" replace />
              : <RegisterPage onLogin={handleLogin} />
          }
        />

        {/* Admin-only dashboard */}
        <Route
          path="/admin/*"
          element={
            !user
              ? <Navigate to="/login" replace />
              : user.role !== 'ADMIN'
              ? <Navigate to="/dashboard" replace />
              : <AdminDashboard user={user} onLogout={handleLogout} />
          }
        />

        {/* User/Staff dashboard */}
        <Route
          path="/dashboard"
          element={
            !user
              ? <Navigate to="/login" replace />
              : user.role === 'ADMIN'
              ? <Navigate to="/admin" replace />
              : <UserDashboard user={user} onLogout={handleLogout} />
          }
        />

        {/* Default redirect */}
        <Route
          path="/"
          element={
            !user
              ? <Navigate to="/login" replace />
              : user.role === 'ADMIN'
              ? <Navigate to="/admin" replace />
              : <Navigate to="/dashboard" replace />
          }
        />

        {/* Catch all */}
        <Route
          path="*"
          element={
            !user
              ? <Navigate to="/login" replace />
              : user.role === 'ADMIN'
              ? <Navigate to="/admin" replace />
              : <Navigate to="/dashboard" replace />
          }
        />
      </Routes>
    </Router>
  );
}
