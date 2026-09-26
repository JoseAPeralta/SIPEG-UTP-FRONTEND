import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router";

import { AdminLayout, AppLayout, StatusPanel } from "@/components";
import { useSessionStore } from "@/store/session";

const ActivityCatalogPage = lazy(() => import("@pages/ActivityCatalogPage"));
const AttendancePage = lazy(() => import("@pages/AttendancePage"));
const CertificatesPage = lazy(() => import("@pages/CertificatesPage"));
const ClassroomsPage = lazy(() => import("@pages/ClassroomsPage"));
const DashboardPage = lazy(() => import("@pages/DashboardPage"));
const LandingPage = lazy(() => import("@pages/LandingPage"));
const LoginPage = lazy(() => import("@pages/LoginPage"));
const LogoutPage = lazy(() => import("@pages/LogoutPage"));
const ReportsPage = lazy(() => import("@pages/ReportsPage"));
const SpeakersPage = lazy(() => import("@pages/SpeakersPage"));
const UsersPage = lazy(() => import("@pages/UsersPage"));

function RouteFallback() {
  return <StatusPanel>Cargando modulo SIPEG...</StatusPanel>;
}

function renderRoute(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

function RequireSession() {
  const currentUser = useSessionStore((state) => state.currentUser);

  if (!currentUser) {
    return <Navigate replace to="/login" />;
  }

  return <Outlet />;
}

function RedirectToAdminRoute({ path }: { path: string }) {
  return <Navigate to={`/admin/${path}`} replace />;
}

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={renderRoute(<LandingPage />)} />
        <Route path="login" element={renderRoute(<LoginPage />)} />
        <Route path="logout" element={renderRoute(<LogoutPage />)} />
        <Route element={<RequireSession />}>
          <Route path="eventos" element={<RedirectToAdminRoute path="eventos" />} />
          <Route path="asistencia" element={<RedirectToAdminRoute path="asistencia" />} />
          <Route path="certificados" element={<RedirectToAdminRoute path="certificados" />} />
          <Route path="aulas" element={renderRoute(<ClassroomsPage />)} />
          <Route path="ponentes" element={renderRoute(<SpeakersPage />)} />
          <Route path="reportes" element={<RedirectToAdminRoute path="reportes" />} />
          <Route path="usuarios" element={renderRoute(<UsersPage />)} />
        </Route>
      </Route>
      <Route element={<RequireSession />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={renderRoute(<DashboardPage />)} />
          <Route path="eventos" element={renderRoute(<ActivityCatalogPage />)} />
          <Route path="asistencia" element={renderRoute(<AttendancePage />)} />
          <Route path="certificados" element={renderRoute(<CertificatesPage />)} />
          <Route path="reportes" element={renderRoute(<ReportsPage />)} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
