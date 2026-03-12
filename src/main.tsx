import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import {AuthProvider} from './contexts/AuthContext';
import App from './App.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SignupPage from './pages/SignupPage.tsx';
import EditorPage from './pages/EditorPage.tsx';
import HistoryPage from './pages/HistoryPage.tsx';
import AdminPage from './pages/AdminPage.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />

          {/* Protected routes (logged-in users) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<App />}>
              <Route index element={<EditorPage />} />
              <Route path="history" element={<HistoryPage />} />
            </Route>
          </Route>

          {/* Admin-only routes */}
          <Route element={<ProtectedRoute adminOnly />}>
            <Route element={<App />}>
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
