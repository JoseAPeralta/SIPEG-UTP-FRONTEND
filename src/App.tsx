import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router";

import { AppLayout, StatusPanel } from "@/components/appShell";
import {
  resolveAuthLandingPath,
  useAuthSessionBootstrap,
  useProactiveTokenRenewal,
} from "@/features/auth/session";
import { useSessionStore } from "@/store/session";

const ActivityCatalogPage = lazy(() => import("@pages/ActivityCatalogPage"));
const AdminLayout = lazy(() =>
  import("@/components/adminShell").then(({ AdminLayout: Component }) => ({ default: Component })),
);
const AttendancePage = lazy(() => import("@pages/AttendancePage"));
const CertificatesPage = lazy(() => import("@pages/CertificatesPage"));
const CareersPage = lazy(() => import("@pages/CareersPage"));
const ChangePasswordPage = lazy(() => import("@pages/ChangePasswordPage"));
const ClassroomsPage = lazy(() => import("@pages/ClassroomsPage"));
const ClassroomDetailPage = lazy(() => import("@pages/ClassroomDetailPage"));
const DashboardPage = lazy(() => import("@pages/DashboardPage"));
const ForgotPasswordPage = lazy(() => import("@pages/ForgotPasswordPage"));
const LandingPage = lazy(() => import("@pages/LandingPage"));
const LoginPage = lazy(() => import("@pages/LoginPage"));
const LogoutPage = lazy(() => import("@pages/LogoutPage"));
const OrganizationalUnitDetailPage = lazy(() => import("@pages/OrganizationalUnitDetailPage"));
const OrganizationalUnitsPage = lazy(() => import("@pages/OrganizationalUnitsPage"));
const PersonalActivitiesPage = lazy(() => import("@pages/PersonalActivitiesPage"));
const PersonalCertificatesPage = lazy(() => import("@pages/PersonalCertificatesPage"));
const PersonalAreaLayout = lazy(() =>
  import("@/features/auth/personalArea").then(({ PersonalAreaLayout: Component }) => ({
    default: Component,
  })),
);
const ProfilePage = lazy(() => import("@pages/ProfilePage"));
const ReportsPage = lazy(() => import("@pages/ReportsPage"));
const RegisterPage = lazy(() => import("@pages/RegisterPage"));
const ResetPasswordPage = lazy(() => import("@pages/ResetPasswordPage"));
const SpeakersPage = lazy(() => import("@pages/SpeakersPage"));
const UserDetailPage = lazy(() => import("@pages/UserDetailPage"));
const UsersPage = lazy(() => import("@pages/UsersPage"));
const VerifyEmailPage = lazy(() => import("@pages/VerifyEmailPage"));

function RouteFallback() {
  return <StatusPanel>Cargando modulo SIPEG...</StatusPanel>;
}

function renderRoute(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

/**
 * Espera a que la sesion se restaure antes de decidir si la ruta es valida.
 *
 * Sin esta espera, una pestana que ya tiene cookie redirigiria a `/login` y
 * volveria atras cuando `POST /auth/refresh` terminara. Solo las rutas que
 * exigen identidad la necesitan: las publicas pintan de inmediato, y por eso la
 * agenda no espera un viaje de red para mostrar su primer contenido.
 */
function useSessionIsSettling() {
  const status = useSessionStore((state) => state.status);

  return status === "restoring";
}

function RestoreGate() {
  return useSessionIsSettling() ? <RouteFallback /> : <Outlet />;
}

function RequireSession() {
  const currentUser = useSessionStore((state) => state.currentUser);

  if (!currentUser) {
    return <Navigate replace to="/login" />;
  }

  return <Outlet />;
}

function RequireAdminSession() {
  const currentUser = useSessionStore((state) => state.currentUser);

  if (!currentUser) {
    return <Navigate replace to="/login" />;
  }

  if (currentUser.globalRole !== "ADMIN") {
    return <Navigate replace to={resolveAuthLandingPath(currentUser.globalRole)} />;
  }

  return <Outlet />;
}

function RedirectToAdminRoute({ path }: { path: string }) {
  return <Navigate to={`/admin/${path}`} replace />;
}

export function App() {
  // El arranque restaura la sesion una vez, al cargar. La renovacion es otra
  // cosa: corre cada vez que se acerca el vencimiento del access token, y por
  // eso va en su propio hook.
  useAuthSessionBootstrap();
  useProactiveTokenRenewal();

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={renderRoute(<LandingPage />)} />
        <Route path="login" element={renderRoute(<LoginPage />)} />
        <Route path="registro" element={renderRoute(<RegisterPage />)} />
        <Route path="forgot-password" element={renderRoute(<ForgotPasswordPage />)} />
        <Route path="reset-password" element={renderRoute(<ResetPasswordPage />)} />
        <Route path="verify-email" element={renderRoute(<VerifyEmailPage />)} />
        <Route path="logout" element={renderRoute(<LogoutPage />)} />
        <Route element={<RestoreGate />}>
          <Route element={<RequireSession />}>
            <Route
              path="cambiar-contrasena"
              element={<Navigate replace to="/perfil/seguridad" />}
            />
            <Route path="perfil" element={renderRoute(<PersonalAreaLayout />)}>
              <Route index element={<Navigate replace to="/perfil/datos" />} />
              <Route path="datos" element={renderRoute(<ProfilePage />)} />
              <Route path="seguridad" element={renderRoute(<ChangePasswordPage />)} />
              <Route path="actividades" element={renderRoute(<PersonalActivitiesPage />)} />
              <Route path="certificados" element={renderRoute(<PersonalCertificatesPage />)} />
            </Route>
          </Route>
          <Route element={<RequireAdminSession />}>
            <Route path="eventos" element={<RedirectToAdminRoute path="eventos" />} />
            <Route path="asistencia" element={<RedirectToAdminRoute path="asistencia" />} />
            <Route path="certificados" element={<RedirectToAdminRoute path="certificados" />} />
            <Route path="aulas" element={<RedirectToAdminRoute path="aulas" />} />
            <Route path="ponentes" element={<RedirectToAdminRoute path="ponentes" />} />
            <Route path="reportes" element={<RedirectToAdminRoute path="reportes" />} />
            <Route path="usuarios" element={<RedirectToAdminRoute path="usuarios" />} />
            <Route path="unidades" element={<RedirectToAdminRoute path="unidades" />} />
            <Route path="carreras" element={<RedirectToAdminRoute path="carreras" />} />
          </Route>
        </Route>
      </Route>
      <Route element={<RestoreGate />}>
        <Route element={<RequireAdminSession />}>
          <Route path="admin" element={renderRoute(<AdminLayout />)}>
            <Route index element={renderRoute(<DashboardPage />)} />
            <Route path="eventos" element={renderRoute(<ActivityCatalogPage />)} />
            <Route path="aulas" element={renderRoute(<ClassroomsPage />)} />
            <Route path="aulas/:classroomId" element={renderRoute(<ClassroomDetailPage />)} />
            <Route path="ponentes" element={renderRoute(<SpeakersPage />)} />
            <Route path="usuarios" element={renderRoute(<UsersPage />)} />
            <Route path="usuarios/:userId" element={renderRoute(<UserDetailPage />)} />
            <Route path="unidades" element={renderRoute(<OrganizationalUnitsPage />)} />
            <Route
              path="unidades/:unitId"
              element={renderRoute(<OrganizationalUnitDetailPage />)}
            />
            <Route path="carreras" element={renderRoute(<CareersPage />)} />
            <Route path="asistencia" element={renderRoute(<AttendancePage />)} />
            <Route path="certificados" element={renderRoute(<CertificatesPage />)} />
            <Route path="reportes" element={renderRoute(<ReportsPage />)} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
