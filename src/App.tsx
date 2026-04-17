import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import BienvenidaInicio from './pages/Inicio/Bienvenida/Bienvenida';
import NuestroSistema from './pages/Inicio/NuestroSistema/NuestroSistema';
import SobreNosotros from './pages/Inicio/SobreNosotros/SobreNosotros';
import Trastornos from './pages/Inicio/Trastornos/Trastornos';
import InicioSesion from './pages/Autenticacion/InicioSesion/InicioSesion';
import Registro from './pages/Autenticacion/Registro/Registro';
import ActivarCuenta from './pages/Autenticacion/ActivarCuenta/ActivarCuenta';
import BienvenidaAutenticacion from './pages/Autenticacion/Bienvenida/Bienvenida';
import MFA from './pages/Autenticacion/MFA/MFA';
import RestablecerContraseña from './pages/Autenticacion/RestablecerContraseña/RestablecerContraseña';
import SidebarLayout from './components/SidebarLayout/SidebarLayout';
import Cuestionario from './pages/Plataforma/Cuestionario/Cuestionario';
import HistorialPadre from './pages/Plataforma/HistorialPadre/HistorialPadre';
import MiCuenta from './pages/Plataforma/MiCuenta/MiCuenta';
import AyudaBase from './pages/Plataforma/Ayuda/AyudaBase';
import Reportes from './pages/Plataforma/Reportes/Reportes';
import HistorialPsicologo from './pages/Plataforma/HistorialPsicologo/HistorialPsicologo';
import SugerenciasPsicologo from './pages/Plataforma/SugerenciasPsicologo/SugerenciasPsicologo';
import Metricas from './pages/Administrador/Metricas/Metricas';
import Cuestionarios from './pages/Administrador/Cuestionarios/Cuestionarios';
import Evaluaciones from './pages/Administrador/Evaluaciones/Evaluaciones';
import Usuarios from './pages/Administrador/Usuarios/Usuarios';
import Psicologos from './pages/Administrador/Psicologos/Psicologos';
import Auditoria from './pages/Administrador/Auditoria/Auditoria';
import ReportesAdmin from './pages/Administrador/Reportes/Reportes';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import DevAuthBadge from './components/DevAuthBadge/DevAuthBadge';
import DevAuthToggle from './components/DevAuthToggle/DevAuthToggle';
import { useAuth } from './hooks/auth/useAuth';
import { getDefaultRouteForRoles } from './utils/auth/roles';

function FallbackRedirect() {
    const { isAuthenticated, roles } = useAuth();
    if (!isAuthenticated) return <Navigate to="/" replace />;
    return <Navigate to={getDefaultRouteForRoles(roles)} replace />;
}

export default function App() {
    return (
        <>
            <Routes>
                {/* Rutas con Header y Footer */}
                <Route path="/" element={<BienvenidaInicio />} />
                <Route path="/nuestro-sistema" element={
                    <>
                        <Header />
                        <NuestroSistema />
                        <Footer />
                    </>
                } />
                <Route path="/sobre-nosotros" element={
                    <>
                        <Header />
                        <SobreNosotros />
                        <Footer />
                    </>
                } />
                <Route path="/trastornos" element={
                    <>
                        <Header />
                        <Trastornos />
                        <Footer />
                    </>
                } />
                {/* Rutas de autenticación sin Header y Footer */}
                <Route path="/inicio-sesion" element={<InicioSesion />} />
                <Route path="/registro" element={<Registro />} />
                <Route path="/activar-cuenta" element={<ActivarCuenta />} />
                <Route path="/bienvenida" element={<BienvenidaAutenticacion />} />
                <Route path="/restablecer-contrasena" element={<RestablecerContraseña />} />
                <Route path="/mfa" element={<MFA />} />

                {/* Rutas de plataforma con Sidebar */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<SidebarLayout />}>
                        <Route path="/padre" element={<ProtectedRoute allowedRoles={['padre']} />}>
                            <Route index element={<Navigate to="/padre/cuestionario" replace />} />
                            <Route path="cuestionario" element={<Cuestionario />} />
                            <Route path="historial" element={<HistorialPadre />} />
                            <Route path="reportes" element={<Reportes role="padre" />} />
                            <Route path="cuenta" element={<MiCuenta />} />
                            <Route path="ayuda" element={<AyudaBase role="padre" />} />
                        </Route>
                        <Route path="/psicologo" element={<ProtectedRoute allowedRoles={['psicologo']} />}>
                            <Route index element={<Navigate to="/psicologo/cuestionario" replace />} />
                            <Route path="cuestionario" element={<Cuestionario />} />
                            <Route path="historial" element={<HistorialPsicologo />} />
                            <Route path="sugerencias" element={<SugerenciasPsicologo />} />
                            <Route path="reportes" element={<Reportes role="psicologo" />} />
                            <Route path="cuenta" element={<MiCuenta />} />
                            <Route path="ayuda" element={<AyudaBase role="psicologo" />} />
                        </Route>
                        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} />}>
                            <Route index element={<Navigate to="/admin/metricas" replace />} />
                            <Route path="metricas" element={<Metricas />} />
                            <Route path="cuestionarios" element={<Cuestionarios />} />
                            <Route path="evaluaciones" element={<Evaluaciones />} />
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
            <DevAuthBadge />
            <DevAuthToggle />
        </>
    );
}
