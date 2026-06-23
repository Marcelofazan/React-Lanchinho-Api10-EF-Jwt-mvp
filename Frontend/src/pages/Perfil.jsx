import { Container, Card, Spinner, Alert, Button } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import "../styles/Perfil.css";
function Perfil() {
  const { usuarioLogado, loading } = useAuth();

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="success" />
        <p className="mt-2">Carregando seus dados...</p>
      </Container>
    );
  }

  if (!usuarioLogado) {
    return (
      <Container className="mt-5 text-center">
        <Alert variant="warning">
          Você precisa estar logado para acessar esta página.
        </Alert>
        <Link to="/login" className="btn btn-primary">
          Ir para Login
        </Link>
      </Container>
    );
  }

  return (
    <Container className="mt-5 fade-in">
      <h2 className="text-center mb-4">👤 Seus Dados</h2>
      <Card>
        <Card.Body>
          <div className="row">
            <div className="col-12 mb-3">
              <strong>Nome:</strong>
              <p className="mb-1">{usuarioLogado.nome || "Não informado"}</p>
            </div>
            <div className="col-12 mb-3">
              <strong>E-mail:</strong>
              <p className="mb-1">{usuarioLogado.email || "Não informado"}</p>
            </div>
            <div className="col-12 mb-3">
              <strong>Telefone:</strong>
              <p className="mb-1">
                {usuarioLogado.telefone || "Não informado"}
              </p>
            </div>
          </div>
          <div className="col-12 mb-3">
            <strong>Endereço:</strong>
            <p className="mb-1">{usuarioLogado.endereco || "Não informado"}</p>
          </div>
          <hr />
          <Button as={Link} to="/editar-perfil" variant="success">
            ✏️ Editar Perfil
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Perfil;
