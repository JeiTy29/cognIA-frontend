import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import NuestroSistema from './pages/Inicio/NuestroSistema/NuestroSistema';
import SobreNosotros from './pages/Inicio/SobreNosotros/SobreNosotros';
import Trastornos from './pages/Inicio/Trastornos/Trastornos';
import InicioSesion from './pages/Autenticacion/InicioSesion/InicioSesion';
import Registro from './pages/Autenticacion/Registro/Registro';
import ActivarCuenta from './pages/Autenticacion/ActivarCuenta/ActivarCuenta';
import Bienvenida from './pages/Autenticacion/Bienvenida/Bienvenida';
import Autenticacion from './pages/Autenticacion/Autenticacion';
import Privacy from './pages/Inicio/Privacy/Privacy';
import Terms from './pages/Inicio/Terms/Terms';
import SidebarLayout from './components/SidebarLayout/SidebarLayout';
import CuestionarioPadre from './pages/Plataforma/CuestionarioPadre/CuestionarioPadre';
import HistorialPadre from './pages/Plataforma/HistorialPadre/HistorialPadre';
import CuentaPadre from './pages/Plataforma/CuentaPadre/CuentaPadre';
import SoportePadre from './pages/Plataforma/SoportePadre/SoportePadre';
import CuestionarioPsicologo from './pages/Plataforma/CuestionarioPsicologo/CuestionarioPsicologo';
import HistorialPsicologo from './pages/Plataforma/HistorialPsicologo/HistorialPsicologo';
import SugerenciasPsicologo from './pages/Plataforma/SugerenciasPsicologo/SugerenciasPsicologo';
import CuentaPsicologo from './pages/Plataforma/CuentaPsicologo/CuentaPsicologo';
import SoportePsicologo from './pages/Plataforma/SoportePsicologo/SoportePsicologo';

export default function App() {
    return (
        <>
            <Routes>
                {/* Rutas con Header y Footer */}
                <Route path="/" element={
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
                <Route path="/privacy" element={
                    <>
                        <Header />
                        <Privacy />
                        <Footer />
                    </>
                } />
                <Route path="/terms" element={
                    <>
                        <Header />
                        <Terms />
                        <Footer />
                    </>
                } />

                {/* Rutas de autenticación sin Header y Footer */}
                <Route path="/inicio-sesion" element={<InicioSesion />} />
                <Route path="/registro" element={<Registro />} />
                <Route path="/activar-cuenta" element={<ActivarCuenta />} />
                <Route path="/bienvenida" element={<Bienvenida />} />
                <Route path="/autenticacion" element={<Autenticacion />} />

                {/* Rutas de plataforma con Sidebar */}
                <Route element={<SidebarLayout />}>
                    <Route path="/padre">
                        <Route index element={<Navigate to="/padre/cuestionario" replace />} />
                        <Route path="cuestionario" element={<CuestionarioPadre />} />
                        <Route path="historial" element={<HistorialPadre />} />
                        <Route path="cuenta" element={<CuentaPadre />} />
                        <Route path="soporte" element={<SoportePadre />} />
                    </Route>
                    <Route path="/psicologo">
                        <Route index element={<Navigate to="/psicologo/cuestionario" replace />} />
                        <Route path="cuestionario" element={<CuestionarioPsicologo />} />
                        <Route path="historial" element={<HistorialPsicologo />} />
                        <Route path="sugerencias" element={<SugerenciasPsicologo />} />
                        <Route path="cuenta" element={<CuentaPsicologo />} />
                        <Route path="soporte" element={<SoportePsicologo />} />
                    </Route>
                </Route>
            </Routes>
        </>
    );
}
