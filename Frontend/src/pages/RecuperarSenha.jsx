import React, { useState } from "react";
import { Container, Form, Button, Alert, Spinner, Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import axiosConfig from "../services/axiosConfig";
import "../styles/RecuperarSenha.css";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [validationError, setValidationError] = useState("");

  const validateEmail = (email) => {
    if (!email.trim()) return "Email é obrigatório";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !emailRegex.test(email) ? "Formato de email inválido" : "";
  };

  const handleInputChange = (e) => {
    const value = e.target.value.toLowerCase().trim();
    setEmail(value);

    if (validationError) setValidationError("");
    if (erro) setErro("");
  };

  async function handleSubmit(e) {
    e.preventDefault();

    const emailError = validateEmail(email);
    if (emailError) {
      setValidationError(emailError);
      return;
    }

    setErro("");
    setCarregando(true);

    try {
      console.log(" Enviando solicitação de recuperação para:", email);

      const response = await axiosConfig.post("/auth/forgot-password", {
        email: email.trim(),
      });

      console.log(" Resposta do servidor:", response.data);

      setEnviado(true);
    } catch (err) {
      console.error("Erro ao solicitar recuperação de senha:", err);
      console.error("Status:", err.response?.status);
      console.error("Dados:", err.response?.data);

      let mensagem =
        "Não foi possível processar a solicitação. Tente novamente.";

      if (err.response?.status === 404) {
        mensagem = "Email não encontrado em nossa base de dados.";
      } else if (err.response?.status === 429) {
        mensagem =
          "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
      } else if (err.response?.status >= 500) {
        mensagem = "Erro no servidor. Tente novamente mais tarde.";
      } else if (!err.response) {
        mensagem = "Erro de conexão. Verifique sua internet.";
      } else if (err.response?.data?.message) {
        mensagem = err.response.data.message;
      } else if (typeof err.response?.data === "string") {
        mensagem = err.response.data;
      }

      setErro(mensagem);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Container
      className="mt-5 login-container fade-in"
      style={{ maxWidth: "500px" }}
    >
      <Card className="shadow">
        <Card.Header as="h4" className="text-center bg-success text-white">
          Recuperar Senha
        </Card.Header>
        <Card.Body className="p-4">
          {enviado ? (
            <Alert variant="success" className="text-center">
              <Alert.Heading>Solicitação Enviada!</Alert.Heading>
              <p className="mb-3">
                Se o e-mail <strong>{email}</strong> existir em nossa base de
                dados, um link de recuperação será enviado em breve.
              </p>
              <p className="small text-muted mb-3">
                <strong>Importante:</strong> Verifique sua caixa de entrada e
                também a pasta de spam/lixo eletrônico.
              </p>
              <hr />
              <Link to="/login" className="btn btn-success">
                Voltar ao Login
              </Link>
            </Alert>
          ) : (
            <>
              <p className="text-center text-muted mb-4">
                Digite seu e-mail cadastrado para receber um link de recuperação
                de senha.
              </p>

              <Form onSubmit={handleSubmit} noValidate>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Email <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={handleInputChange}
                    required
                    isInvalid={!!validationError}
                    disabled={carregando}
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck="false"
                    autoFocus
                  />
                  <Form.Control.Feedback type="invalid">
                    {validationError}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Insira o e-mail que você usou no cadastro.
                  </Form.Text>
                </Form.Group>

                {erro && (
                  <Alert
                    variant="danger"
                    dismissible
                    onClose={() => setErro("")}
                  >
                    <Alert.Heading>Erro</Alert.Heading>
                    <p className="mb-0">{erro}</p>
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="success"
                  size="lg"
                  className="w-100 mb-3"
                  disabled={carregando || !email.trim()}
                >
                  {carregando ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        className="me-2"
                      />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Link de Recuperação"
                  )}
                </Button>

                <div className="text-center">
                  <hr />
                  <p className="mb-0">
                    Lembrou sua senha?{" "}
                    <Link
                      to="/login"
                      className="text-decoration-none fw-bold"
                      tabIndex={carregando ? -1 : 0}
                    >
                      Voltar para Login
                    </Link>
                  </p>
                </div>
              </Form>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}
