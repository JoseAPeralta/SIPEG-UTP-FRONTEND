import { Box, Text } from "@chakra-ui/react";
import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router";

import { AppLayout } from "@components/Layout/AppLayout";
import { useSessionStore } from "@/store/session";

const AttendancePage = lazy(() => import("@pages/AttendancePage"));
const CertificatesPage = lazy(() => import("@pages/CertificatesPage"));
const ClassroomsPage = lazy(() => import("@pages/ClassroomsPage"));
const DashboardPage = lazy(() => import("@pages/DashboardPage"));
const EventsPage = lazy(() => import("@pages/EventsPage"));
const LandingPage = lazy(() => import("@pages/LandingPage"));
const LoginPage = lazy(() => import("@pages/LoginPage"));
const LogoutPage = lazy(() => import("@pages/LogoutPage"));
const ReportsPage = lazy(() => import("@pages/ReportsPage"));
const SpeakersPage = lazy(() => import("@pages/SpeakersPage"));
const UsersPage = lazy(() => import("@pages/UsersPage"));

function RouteFallback() {
  return (
    <Box
      bg="surface.raised"
      borderColor="border.subtle"
      borderWidth="1px"
      p={6}
      rounded="3xl"
      role="status"
    >
      <Text color="text.muted" fontWeight="800">
        Cargando modulo SIPEG...
      </Text>
    </Box>
  );
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

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={renderRoute(<LandingPage />)} />
        <Route path="login" element={renderRoute(<LoginPage />)} />
        <Route path="logout" element={renderRoute(<LogoutPage />)} />
        <Route element={<RequireSession />}>
          <Route path="dashboard" element={renderRoute(<DashboardPage />)} />
          <Route path="eventos" element={renderRoute(<EventsPage />)} />
          <Route path="asistencia" element={renderRoute(<AttendancePage />)} />
          <Route path="certificados" element={renderRoute(<CertificatesPage />)} />
          <Route path="aulas" element={renderRoute(<ClassroomsPage />)} />
          <Route path="ponentes" element={renderRoute(<SpeakersPage />)} />
          <Route path="reportes" element={renderRoute(<ReportsPage />)} />
          <Route path="usuarios" element={renderRoute(<UsersPage />)} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
