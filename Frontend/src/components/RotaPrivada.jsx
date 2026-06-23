import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner, Container } from 'react-bootstrap';

function RotaPrivada({ children }) {
  const { usuarioLogado, loading } = useAuth();
  const location = useLocation();

  // 1. Enquanto o contexto verifica o login, exibe um spinner
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <Spinner animation="border" variant="success" role="status">
          <span className="visually-hidden">Carregando...</span>
        </Spinner>
      </Container>
    );
  }

  // 2. Após a verificação, se não houver usuário, redireciona para a página de login
  if (!usuarioLogado) {
    // Salva a página que o usuário tentava acessar, para redirecioná-lo de volta depois
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Se houver usuário, exibe a página protegida
  return children;
}

export default RotaPrivada;