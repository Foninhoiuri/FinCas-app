import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Spinner } from "@heroui/react";

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Bills = lazy(() => import('./pages/Bills'));
const CreditCards = lazy(() => import('./pages/CreditCards'));
const Goals = lazy(() => import('./pages/Goals'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Manage = lazy(() => import('./pages/Manage'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const HouseholdManage = lazy(() => import('./pages/HouseholdManage'));
const Setup = lazy(() => import('./pages/Setup'));

const EditProfile = lazy(() => import('./pages/EditProfile'));
const Docs = lazy(() => import('./pages/Docs'));

function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[9999]">
      <Spinner size="lg" color="primary" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function SetupGuard() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch('/api/setup/status')
      .then(r => r.json())
      .then(data => {
        if (data.setup_required) {
          navigate('/setup', { replace: true });
        }
        setChecked(true);
      })
      .catch(() => setChecked(true)); // Se API offline, deixa prosseguir
  }, []);

  if (!checked) return <Loading />;
  return null;
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <SetupGuard />
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/cards" element={<CreditCards />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/manage" element={<Manage />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/household" element={<HouseholdManage />} />

          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/docs" element={<Docs />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
