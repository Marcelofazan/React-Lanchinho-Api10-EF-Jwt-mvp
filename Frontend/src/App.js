import { Routes, Route } from "react-router-dom";
// Páginas
import Home from "./pages/Home";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Perfil from "./pages/Perfil";
import StatusLojaADM from "./pages/StatusLojaADM";
import EditarPerfil from "./pages/EditarPerfil";
import Checkout from "./pages/Checkout";
import RecuperarSenha from "./pages/RecuperarSenha";
import MeusPedidos from "./pages/MeusPedidos";

// Componentes
import { AuthProvider } from "./context/AuthContext";
import AlterarSenha from "./components/AlterarSenha";
import CadastroProdutoADM from "./components/CadastroProdutoADM";
import DebugProjeto from "./components/DebugProjeto";
import RotaPrivada from "./components/RotaPrivada";
import EditarProduto from "./components/EditarProduto";
import SiteNavbar from "./components/SiteNavbar";

import "./styles/animations.css";
import "./styles/ForcaTitulosDourados.css";
import "./styles/CorrecaoSafariCss.css";

function App() {
  return (
    <AuthProvider>
      <SiteNavbar />
      <div style={{ paddingTop: "70px" }}>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/esqueci-senha" element={<RecuperarSenha />} />
          <Route path="/alterar-senha/:token" element={<AlterarSenha />} />
          <Route path="/debug" element={<DebugProjeto />} />

          {/* Rotas Privadas (login obrigatório) */}
          <Route
            path="/perfil"
            element={
              <RotaPrivada>
                <Perfil />
              </RotaPrivada>
            }
          />
          <Route
            path="/editar-perfil"
            element={
              <RotaPrivada>
                <EditarPerfil />
              </RotaPrivada>
            }
          />
          <Route
            path="/meus-pedidos"
            element={
              <RotaPrivada>
                <MeusPedidos />
              </RotaPrivada>
            }
          />
          <Route
            path="/checkout"
            element={
              <RotaPrivada>
                <Checkout />
              </RotaPrivada>
            }
          />

          {/* Rotas de Admin (também protegidas) */}
          <Route
            path="/admin/cadastro-produto"
            element={
              <RotaPrivada>
                <CadastroProdutoADM />
              </RotaPrivada>
            }
          />
          <Route path="/admin/loja" element={<StatusLojaADM />} />

          <Route
            path="/admin/produtos/editar/:id"
            element={
              <RotaPrivada>
                <EditarProduto />
              </RotaPrivada>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
