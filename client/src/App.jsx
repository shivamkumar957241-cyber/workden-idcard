import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getUser, clearAuth, setAuth } from './api';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import AdminDashboard from './components/AdminDashboard';
import MemberDashboard from './components/MemberDashboard';
import StaffDashboard from './components/StaffDashboard';
import PublicVerifyPage from './components/PublicVerifyPage';
import PublicCardAccessPage from './components/PublicCardAccessPage';

export default function App() {
  const [user, setUser] = useState(getUser());

  const handleLogin = (token, userData) => {
    setAuth(token, userData);
    setUser(userData);
  };

  const handleLogout = () => {
    clearAuth();
    setUser(null);
  };

  // Helper to determine destination by role
  const getRoleDestination = (u) => {
    if (!u) return '/';
    if (u.role === 'ADMIN') return '/admin';
    if (u.role === 'STAFF') return '/staff';
    return '/member';
  };

  return (
    <Router>
      <Routes>
        {/* Public QR Verification & Direct Card Access Pages */}
        <Route path="/verify/:token" element={<PublicVerifyPage />} />
        <Route path="/card-access/:token" element={<PublicCardAccessPage />} />

        {/* Landing Page (Public Home) */}
        <Route
          path="/"
          element={
            user ? <Navigate to={getRoleDestination(user)} replace /> : <LandingPage />
          }
        />

        {/* Dedicated Authentication Pages */}
        <Route
          path="/member/login"
          element={
            user ? <Navigate to={getRoleDestination(user)} replace /> : <LoginPage fixedType="member" onLogin={handleLogin} />
          }
        />
        <Route
          path="/staff/login"
          element={
            user ? <Navigate to={getRoleDestination(user)} replace /> : <LoginPage fixedType="staff" onLogin={handleLogin} />
          }
        />
        <Route
          path="/admin/login"
          element={
            user ? <Navigate to={getRoleDestination(user)} replace /> : <LoginPage fixedType="admin" onLogin={handleLogin} />
          }
        />
        <Route
          path="/login"
          element={
            user ? <Navigate to={getRoleDestination(user)} replace /> : <LoginPage onLogin={handleLogin} />
          }
        />
        <Route
          path="/member/register"
          element={
            user ? <Navigate to={getRoleDestination(user)} replace /> : <RegisterPage fixedType="member" onLogin={handleLogin} />
          }
        />
        <Route
          path="/staff/register"
          element={
            user ? <Navigate to={getRoleDestination(user)} replace /> : <RegisterPage fixedType="staff" onLogin={handleLogin} />
          }
        />
        <Route
          path="/register"
          element={
            user ? <Navigate to={getRoleDestination(user)} replace /> : <RegisterPage onLogin={handleLogin} />
          }
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin/*"
          element={
            !user ? (
              <Navigate to="/admin/login" replace />
            ) : user.role !== 'ADMIN' ? (
              <Navigate to={getRoleDestination(user)} replace />
            ) : (
              <AdminDashboard user={user} onLogout={handleLogout} />
            )
          }
        />

        {/* Member Portal */}
        <Route
          path="/member/*"
          element={
            !user ? (
              <Navigate to="/member/login" replace />
            ) : user.role === 'ADMIN' ? (
              <Navigate to="/admin" replace />
            ) : user.role === 'STAFF' ? (
              <Navigate to="/staff" replace />
            ) : (
              <MemberDashboard user={user} onLogout={handleLogout} />
            )
          }
        />

        {/* Staff Portal */}
        <Route
          path="/staff/*"
          element={
            !user ? (
              <Navigate to="/staff/login" replace />
            ) : user.role === 'ADMIN' ? (
              <Navigate to="/admin" replace />
            ) : user.role !== 'STAFF' ? (
              <Navigate to="/member" replace />
            ) : (
              <StaffDashboard user={user} onLogout={handleLogout} />
            )
          }
        />

        {/* Legacy /dashboard redirect based on role */}
        <Route
          path="/dashboard"
          element={
            !user ? <Navigate to="/login" replace /> : <Navigate to={getRoleDestination(user)} replace />
          }
        />

        {/* Fallback Catch-all */}
        <Route
          path="*"
          element={
            !user ? <Navigate to="/" replace /> : <Navigate to={getRoleDestination(user)} replace />
          }
        />
      </Routes>
    </Router>
  );
}
