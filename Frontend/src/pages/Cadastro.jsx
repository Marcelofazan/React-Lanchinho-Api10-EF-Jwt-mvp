import React, { useState, useEffect } from "react";
import {
  Container,
  Form,
  Button,
  Alert,
  Spinner,
  Card,
  Row,
  Col,
} from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Cadastro.css";

function Cadastro() {
  const navigate = useNavigate();
  const { register, isLoggedIn, isInitialized } = useAuth();

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    endereco: "",
    senha: "",
    confirmarSenha: "",
  });

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (isInitialized && isLoggedIn) {
      navigate("/home", { replace: true });
    }
  }, [isLoggedIn, isInitialized, navigate]);

  const formatarTelefone = (value) => {
    const numbers = value.replace(/\D/g, "");

    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "telefone") {
      const formatted = formatarTelefone(value);
      setFormData((prev) => ({ ...prev, [name]: formatted }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Limpar erros ao digitar
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (erro) setErro("");
  };

  const validateField = (name, value) => {
    switch (name) {
      case "nome":
        if (!value.trim()) return "Nome é obrigatório";
        return value.trim().length < 2
          ? "Nome deve ter pelo menos 2 caracteres"
          : "";

      case "email":
        if (!value.trim()) return "Email é obrigatório";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value) ? "Email inválido" : "";

      case "telefone":
        if (!value) return "Telefone é obrigatório";
        const phoneNumbers = value.replace(/\D/g, "");
        if (phoneNumbers.length < 10)
          return "Telefone deve ter pelo menos 10 dígitos";
        if (phoneNumbers.length > 11)
          return "Telefone deve ter no máximo 11 dígitos";
        const ddd = parseInt(phoneNumbers.slice(0, 2));
        if (ddd < 11 || ddd > 99) return "DDD inválido";
        if (phoneNumbers.length === 11 && phoneNumbers[2] !== "9") {
          return "Celular deve começar com 9 após o DDD";
        }
        return "";

      case "endereco":
        if (!value.trim()) return "Endereço é obrigatório";
        return value.trim().length < 5
          ? "Endereço deve ter pelo menos 5 caracteres"
          : "";

      case "senha":
        if (!value) return "Senha é obrigatória";
        return value.length < 6 ? "Senha deve ter pelo menos 6 caracteres" : "";

      case "confirmarSenha":
        if (!value) return "Confirmação de senha é obrigatória";
        return value !== formData.senha ? "Senhas não coincidem" : "";

      default:
        return "";
    }
  };

  const validateForm = () => {
    const errors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) errors[key] = error;
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setSucesso("");

    console.log("=== INICIANDO CADASTRO ===");
    console.log("Dados do formulário:", {
      ...formData,
      senha: "***",
      confirmarSenha: "***",
    });

    if (!validateForm()) {
      setErro("Por favor, corrija os erros no formulário.");
      return;
    }

    setLoading(true);

    try {
      const userData = {
        nome: formData.nome.trim(),
        email: formData.email.trim().toLowerCase(),
        telefone: formData.telefone.replace(/\D/g, ""),
        endereco: formData.endereco.trim(),
        senha: formData.senha,
      };

      console.log("Enviando dados:", { ...userData, senha: "***" });

      const response = await register(userData);
      console.log("Cadastro bem-sucedido:", response);

      setSucesso("Cadastro realizado com sucesso! Redirecionando...");

      setTimeout(() => {
        navigate("/home");
      }, 1500);
    } catch (error) {
      console.error("Erro detalhado no cadastro:", error);

      let mensagemErro = "Erro ao realizar cadastro. Tente novamente.";

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        console.log("Status do erro:", status);
        console.log("Dados do erro:", data);

        if (status === 409) {
          mensagemErro = "Email ou telefone já cadastrado.";
        } else if (status === 400) {
          if (data?.errors) {
            const errorList = Array.isArray(data.errors)
              ? data.errors
              : Object.values(data.errors).flat();
            mensagemErro = errorList.join(". ");
          } else {
            mensagemErro = data?.message || "Dados inválidos.";
          }
        } else if (status >= 500) {
          mensagemErro = "Erro no servidor. Tente novamente mais tarde.";
        } else if (data?.message) {
          mensagemErro = data.message;
        }
      } else if (error.request) {
        mensagemErro = "Erro de conexão. Verifique sua internet.";
      } else if (error.message) {
        mensagemErro = error.message;
      }

      setErro(mensagemErro);
    } finally {
      setLoading(false);
    }
  };

  const senhasCoincident =
    formData.senha &&
    formData.confirmarSenha &&
    formData.senha === formData.confirmarSenha;

  if (!isInitialized) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="success" />
        <p className="mt-3">Carregando...</p>
      </Container>
    );
  }

  return (
    <Container className="cadastro-container mt-5">
      <Card className="shadow-sm">
        <Card.Body className="p-4">
          <h2 className="text-center mb-4">
            📝 Criar Conta - Lanchinho Delivery
          </h2>

          {erro && (
            <Alert variant="danger" dismissible onClose={() => setErro("")}>
              {erro}
            </Alert>
          )}

          {sucesso && <Alert variant="success">{sucesso}</Alert>}

          <Form onSubmit={handleSubmit} noValidate>
            <Form.Group className="mb-3">
              <Form.Label>Nome Completo</Form.Label>
              <Form.Control
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                placeholder="Digite seu nome completo"
                required
                isInvalid={!!validationErrors.nome}
                disabled={loading}
                autoComplete="name"
              />
              <Form.Control.Feedback type="invalid">
                {validationErrors.nome}
              </Form.Control.Feedback>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>E-mail</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="seu@email.com"
                    required
                    isInvalid={!!validationErrors.email}
                    disabled={loading}
                    autoComplete="email"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.email}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Telefone</Form.Label>
                  <Form.Control
                    type="tel"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    placeholder="(21) 99999-9999"
                    required
                    maxLength={15}
                    isInvalid={!!validationErrors.telefone}
                    disabled={loading}
                    autoComplete="tel"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.telefone}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Endereço</Form.Label>
              <Form.Control
                type="text"
                name="endereco"
                value={formData.endereco}
                onChange={handleInputChange}
                placeholder="Rua, número, bairro, cidade"
                required
                isInvalid={!!validationErrors.endereco}
                disabled={loading}
                autoComplete="street-address"
              />
              <Form.Control.Feedback type="invalid">
                {validationErrors.endereco}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                Este endereço será usado para suas entregas
              </Form.Text>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Senha</Form.Label>
                  <Form.Control
                    type="password"
                    name="senha"
                    value={formData.senha}
                    onChange={handleInputChange}
                    placeholder="Mínimo 6 caracteres"
                    required
                    isInvalid={!!validationErrors.senha}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.senha}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Confirmar Senha</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmarSenha"
                    value={formData.confirmarSenha}
                    onChange={handleInputChange}
                    placeholder="Digite a senha novamente"
                    required
                    isInvalid={!!validationErrors.confirmarSenha}
                    isValid={senhasCoincident}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationErrors.confirmarSenha}
                  </Form.Control.Feedback>
                  <Form.Control.Feedback type="valid">
                    Senhas coincidem ✓
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Button
              variant="success"
              type="submit"
              size="lg"
              className="w-100 mb-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Criando conta...
                </>
              ) : (
                "Criar Conta"
              )}
            </Button>

            <div className="text-center">
              <p className="mb-0">
                Já tem uma conta?{" "}
                <Link
                  to="/login"
                  className="text-decoration-none fw-bold text-success"
                >
                  Faça login aqui
                </Link>
              </p>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Cadastro;
