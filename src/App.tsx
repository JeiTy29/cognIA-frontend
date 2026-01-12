import { Routes, Route } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import NuestroSistema from './pages/Inicio/NuestroSistema/NuestroSistema';
import SobreNosotros from './pages/Inicio/SobreNosotros/SobreNosotros';
import Trastornos from './pages/Inicio/Trastornos/Trastornos';

export default function App() {
    return (
        <>
            <Header />
            <Routes>
                <Route path="/" element={<NuestroSistema />} />
                <Route path="/sobre-nosotros" element={<SobreNosotros />} />
                <Route path="/trastornos" element={<Trastornos />} />
            </Routes>
            <Footer />
        </>
    );
}
