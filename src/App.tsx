import { Routes, Route } from 'react-router-dom';
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
            </Routes>
        </>
    );
}
