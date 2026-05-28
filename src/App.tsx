import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Footer from './components/Footer/Footer';
import Header from './components/Header/Header';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import SidebarLayout from './components/SidebarLayout/SidebarLayout';
import AppLoadingScreen from './components/AppLoadingScreen/AppLoadingScreen';
import AppErrorBoundary from './components/ErrorBoundary/AppErrorBoundary';
import { useAuth } from './hooks/auth/useAuth';
import BienvenidaInicio from './pages/Inicio/Bienvenida/Bienvenida';
import { assertApiClientConfig } from './services/api/url';
import { getDefaultRouteForRoles } from './utils/auth/roles';

const NuestroSistema = lazy(() => import('./pages/Inicio/NuestroSistema/NuestroSistema'));
const SobreNosotros = lazy(() => import('./pages/Inicio/SobreNosotros/SobreNosotros'));
const Trastornos = lazy(() => import('./pages/Inicio/Trastornos/Trastornos'));
const InicioSesion = lazy(() => import('./pages/Autenticacion/InicioSesion/InicioSesion'));
const Registro = lazy(() => import('./pages/Autenticacion/Registro/Registro'));
const BienvenidaAutenticacion = lazy(() => import('./pages/Autenticacion/Bienvenida/Bienvenida'));
const MfaPage = lazy(() => import('./pages/Autenticacion/MFA/MFA'));
const RestablecerContrasena = lazy(() => import('./pages/Autenticacion/RestablecerContraseña/RestablecerContraseña'));
const Cuestionario = lazy(() => import('./pages/Plataforma/Cuestionario/Cuestionario'));
const HistorialPadre = lazy(() => import('./pages/Plataforma/HistorialPadre/HistorialPadre'));
const MiCuenta = lazy(() => import('./pages/Plataforma/MiCuenta/MiCuenta'));
const AyudaBase = lazy(() => import('./pages/Plataforma/Ayuda/AyudaBase'));
const HistorialPsicologo = lazy(() => import('./pages/Plataforma/HistorialPsicologo/HistorialPsicologo'));
const SeguimientoGuardian = lazy(() => import('./pages/Plataforma/SeguimientoGuardian/SeguimientoGuardian'));
const EvaluacionesCompartidas = lazy(() => import('./pages/Plataforma/EvaluacionesCompartidas/EvaluacionesCompartidas'));
const SolicitudesRevisionPsicologo = lazy(() => import('./pages/Plataforma/SolicitudesRevisionPsicologo/SolicitudesRevisionPsicologo'));
const SugerenciasPsicologo = lazy(() => import('./pages/Plataforma/SugerenciasPsicologo/SugerenciasPsicologo'));
const Metricas = lazy(() => import('./pages/Administrador/Metricas/Metricas'));
const Cuestionarios = lazy(() => import('./pages/Administrador/Cuestionarios/Cuestionarios'));
const PreguntasCuestionario = lazy(() => import('./pages/Administrador/Cuestionarios/PreguntasCuestionario'));
const Usuarios = lazy(() => import('./pages/Administrador/Usuarios/Usuarios'));
const Psicologos = lazy(() => import('./pages/Administrador/Psicologos/Psicologos'));
const Auditoria = lazy(() => import('./pages/Administrador/Auditoria/Auditoria'));
const ReportesAdmin = lazy(() => import('./pages/Administrador/Reportes/Reportes'));
const CuestionarioCompartido = lazy(() => import('./pages/Plataforma/CuestionarioCompartido/CuestionarioCompartido'));

const DevAuthBadge = import.meta.env.DEV
    ? lazy(() => import('./components/DevAuthBadge/DevAuthBadge'))
    : null;
const DevAuthToggle = import.meta.env.DEV
    ? lazy(() => import('./components/DevAuthToggle/DevAuthToggle'))
    : null;

function FallbackRedirect() {
    const { isAuthenticated, roles } = useAuth();
    if (!isAuthenticated) return <Navigate to="/" replace />;
    return <Navigate to={getDefaultRouteForRoles(roles)} replace />;
}

function ApiClientConfigBanner() {
    const assertion = assertApiClientConfig();
    if (assertion.ok) return null;

    return (
        <div className="app-config-banner" role="alert">
            No fue posible inicializar la conexión con el backend. Revisa la variable de entorno del API y vuelve a desplegar esta compilación.
        </div>
    );
}

function RouteLoadingFallback() {
    return (
        <AppLoadingScreen
            compact
            title="Cargando vista"
            message="Estamos preparando los componentes de esta sección."
            timedOutMessage="La vista tarda más de lo esperado. Puedes reintentar sin refrescar manualmente."
            onRetry={() => window.location.reload()}
        />
    );
}

function WithChrome({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <>
            <Header />
            {children}
            <Footer />
        </>
    );
}

export default function App() {
    return (
        <AppErrorBoundary>
            <ApiClientConfigBanner />
            <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                    <Route path="/" element={<BienvenidaInicio />} />
                    <Route
                        path="/nuestro-sistema"
                        element={
                            <WithChrome>
                                <NuestroSistema />
                            </WithChrome>
                        }
                    />
                    <Route
                        path="/sobre-nosotros"
                        element={
                            <WithChrome>
                                <SobreNosotros />
                            </WithChrome>
                        }
                    />
                    <Route
                        path="/trastornos"
                        element={
                            <WithChrome>
                                <Trastornos />
                            </WithChrome>
                        }
                    />

                    <Route path="/inicio-sesion" element={<InicioSesion />} />
                    <Route path="/registro" element={<Registro />} />
                    <Route path="/bienvenida" element={<BienvenidaAutenticacion />} />
                    <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
                    <Route path="/mfa" element={<MfaPage />} />
                    <Route path="/cuestionario/compartido/:questionnaireId/:shareCode" element={<CuestionarioCompartido />} />

                    <Route element={<ProtectedRoute preserveShell />}>
                        <Route element={<SidebarLayout />}>
                            <Route path="/padre" element={<ProtectedRoute allowedRoles={['padre']} />}>
                                <Route path="cuestionario" element={<Cuestionario />} />
                                <Route index element={<Navigate to="/padre/cuestionario" replace />} />
                                <Route path="casos" element={<SeguimientoGuardian />} />
                                <Route path="seguimiento" element={<Navigate to="/padre/casos" replace />} />
                                <Route path="historial" element={<HistorialPadre />} />
                                <Route path="cuenta" element={<MiCuenta />} />
                                <Route path="ayuda" element={<AyudaBase role="padre" />} />
                            </Route>
                            <Route path="/psicologo" element={<ProtectedRoute allowedRoles={['psicologo']} />}>
                                <Route index element={<Navigate to="/psicologo/evaluaciones" replace />} />
                                <Route path="evaluaciones" element={<EvaluacionesCompartidas />} />
                                <Route path="solicitudes" element={<SolicitudesRevisionPsicologo />} />
                                <Route path="cuestionario" element={<Cuestionario />} />
                                <Route path="historial" element={<HistorialPsicologo />} />
                                <Route path="sugerencias" element={<SugerenciasPsicologo />} />
                                <Route path="cuenta" element={<MiCuenta />} />
                                <Route path="ayuda" element={<AyudaBase role="psicologo" />} />
                            </Route>
                            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} />}>
                                <Route index element={<Navigate to="/admin/metricas" replace />} />
                                <Route path="metricas" element={<Metricas />} />
                                <Route path="dashboard" element={<Navigate to="/admin/metricas" replace />} />
                                <Route path="cuestionarios" element={<Cuestionarios />} />
                                <Route path="cuestionarios/:templateId/preguntas" element={<PreguntasCuestionario />} />
                                <Route path="evaluaciones" element={<Navigate to="/admin/dashboard" replace />} />
                                <Route path="usuarios" element={<Usuarios />} />
                                <Route path="psicologos" element={<Psicologos />} />
                                <Route path="auditoria" element={<Auditoria />} />
                                <Route path="reportes" element={<ReportesAdmin />} />
                                <Route path="cuenta" element={<MiCuenta />} />
                            </Route>
                        </Route>
                    </Route>
                    <Route path="*" element={<FallbackRedirect />} />
                </Routes>
            </Suspense>
            {DevAuthBadge ? (
                <Suspense fallback={null}>
                    <DevAuthBadge />
                </Suspense>
            ) : null}
            {DevAuthToggle ? (
                <Suspense fallback={null}>
                    <DevAuthToggle />
                </Suspense>
            ) : null}
        </AppErrorBoundary>
    );
}
