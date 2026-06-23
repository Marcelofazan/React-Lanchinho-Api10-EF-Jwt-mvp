import { Navbar, Nav, Container, NavDropdown, Spinner } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/SiteNavBar.css";

function SiteNavbar() {
  const { usuarioLogado, logout, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isAdmin = usuarioLogado?.tipo === "ADM";

  if (loading) {
    return (
      <Navbar bg="dark" variant="dark" expand="md" fixed="top">
        <Container>
          <Navbar.Brand as={Link} to="/home">
            Lanchinho Delivery
          </Navbar.Brand>
          <Nav className="ms-auto">
            <Spinner animation="border" size="sm" variant="light" />
          </Nav>
        </Container>
      </Navbar>
    );
  }

  return (
    <Navbar
      bg="dark"
      variant="dark"
      expand="md"
      fixed="top"
      className="custom-navbar"
    >
      <Container>
        <Navbar.Brand as={Link} to="/home" className="brand-logo">
          Lanchinho Delivery
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />

        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            <Nav.Link as={Link} to="/home" className="nav-link-custom">
              Início
            </Nav.Link>

            {isAdmin && (
              <>
                <Nav.Link
                  as={Link}
                  to="/admin/cadastro-produto"
                  className="nav-link-custom admin-link"
                >
                  Cadastrar Produto
                </Nav.Link>
              </>
            )}
            {isAdmin && (
              <Nav.Link as={Link} to="/admin/loja">
                Gerenciar Loja
              </Nav.Link>
            )}

            {usuarioLogado ? (
              <NavDropdown
                title={
                  <span className="user-dropdown-title">
                    {usuarioLogado.nome}
                    {isAdmin && <span className="admin-badge"> ADM</span>}
                  </span>
                }
                id="perfil-dropdown"
                className="user-dropdown"
              >
                <NavDropdown.Item as={Link} to="/perfil">
                  Ver Perfil
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/editar-perfil">
                  Editar Conta
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/meus-pedidos">
                  Meus Pedidos
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item
                  onClick={handleLogout}
                  className="logout-item"
                >
                  Sair
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <Nav.Link
                as={Link}
                to="/login"
                className="nav-link-custom login-link"
              >
                Login
              </Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default SiteNavbar;
