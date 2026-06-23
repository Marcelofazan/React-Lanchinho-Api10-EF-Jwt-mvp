import React, { useState, useEffect } from "react";
import { Container, Form, Button, Alert, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "../styles/EditarPerfil.css";
import { useAuth } from "../context/AuthContext";
import axiosConfig from "../services/axiosConfig";

function EditarPerfil() {
  const navigate = useNavigate();
  const { usuarioLogado, atualizarUsuario, loading: authLoading } = useAuth();

  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    endereco: "",
  });
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (usuarioLogado) {
      setForm({
        nome: usuarioLogado.nome || "",
        email: usuarioLogado.email || "",
        telefone: usuarioLogado.telefone || "",
        endereco: usuarioLogado.endereco || "",
      });
    }
  }, [usuarioLogado]);

  const formatarTelefone = (value) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})\d+?$/, "$1");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((formAtual) => ({ ...formAtual, [name]: value }));
  };

  const handleTelefoneChange = (e) => {
    const valorFormatado = formatarTelefone(e.target.value);
    setForm((formAtual) => ({ ...formAtual, telefone: valorFormatado }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setSucesso(false);
    setCarregando(true);

    try {
      console.log(" Enviando atualização:", form);
      const response = await axiosConfig.put("/cliente/perfil", form);
      console.log(" Resposta do servidor:", response.data);

      const dadosAtualizados = response.data.user || response.data;

      const usuarioAtualizado = {
        ...usuarioLogado,
        nome: dadosAtualizados.nome,
        email: dadosAtualizados.email,
        telefone: dadosAtualizados.telefone,
        endereco: dadosAtualizados.endereco || form.endereco,
        role: dadosAtualizados.role || usuarioLogado.role,
      };

      console.log(" Atualizando usuário:", usuarioAtualizado);

      atualizarUsuario(usuarioAtualizado);

      setSucesso(true);
      setTimeout(() => navigate("/perfil"), 2000);
    } catch (err) {
      console.error(" Erro ao atualizar perfil:", err);
      console.error("Resposta do erro:", err.response?.data);

      const errorMsg =
        err.response?.data?.message ||
        err.response?.data ||
        "Erro ao atualizar os dados.";
      setErro(errorMsg);
    } finally {
      setCarregando(false);
    }
  };

  if (authLoading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" />
        <p>Carregando perfil...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-5 fade-in">
      <h2 className="text-center mb-4">✏️ Editar Conta</h2>
      {sucesso && (
        <Alert variant="success" className="text-center">
          Dados atualizados com sucesso! 🎉 Redirecionando...
        </Alert>
      )}
      {erro && (
        <Alert variant="danger" className="text-center">
          {erro}
        </Alert>
      )}
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Nome</Form.Label>
          <Form.Control
            type="text"
            name="nome"
            value={form.nome}
            onChange={handleChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>E-mail</Form.Label>
          <Form.Control
            type="email"
            value={form.email}
            name="email"
            onChange={handleChange}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Telefone</Form.Label>
          <Form.Control
            type="tel"
            name="telefone"
            placeholder="(21) 99999-9999"
            value={form.telefone}
            onChange={handleTelefoneChange}
            maxLength={15}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Endereço de Entrega</Form.Label>
          <Form.Control
            type="text"
            name="endereco"
            placeholder="Rua, número, bairro, cidade"
            value={form.endereco}
            onChange={handleChange}
            required
          />
          <Form.Text className="text-muted">
            Este endereço será usado automaticamente nos seus pedidos
          </Form.Text>
        </Form.Group>

        <Button
          type="submit"
          variant="success"
          className="w-100 mt-3"
          disabled={carregando}
        >
          {carregando ? (
            <Spinner as="span" animation="border" size="sm" />
          ) : (
            "💾 Salvar Alterações"
          )}
        </Button>
      </Form>
    </Container>
  );
}

export default EditarPerfil;
