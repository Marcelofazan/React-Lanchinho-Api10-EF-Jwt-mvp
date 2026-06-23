import { useState, useEffect } from "react";
import {
  Container,
  Card,
  Button,
  Alert,
  Spinner,
  Form,
  Row,
  Col,
  Badge,
} from "react-bootstrap";
import "../styles/StatusLojaADM.css";
import { useAuth } from "../context/AuthContext";
import axiosConfig from "../services/axiosConfig";

function StatusLojaADM() {
  const { usuarioLogado } = useAuth();
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [configRes, statusRes] = await Promise.all([
        axiosConfig.get("/configuracaoLoja"),
        axiosConfig.get("/configuracaoLoja/status"),
      ]);

      setConfig(configRes.data);
      setStatus(statusRes.data);
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
      setErro("Erro ao carregar configuração da loja.");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async () => {
    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      const novoStatus = !config.lojaAberta;

      await axiosConfig.put("/configuracaoLoja/toggle", novoStatus, {
        headers: { "Content-Type": "application/json" },
      });

      setSucesso(
        novoStatus
          ? "🟢 Loja ABERTA com sucesso!"
          : "🔴 Loja FECHADA com sucesso!"
      );

      await carregarDados();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      setErro("Erro ao alterar status da loja.");
    } finally {
      setSalvando(false);
    }
  };

  const handleHorarioChange = (dia, campo, valor) => {
    setConfig((prev) => ({
      ...prev,
      horarios: {
        ...prev.horarios,
        [dia]: {
          ...prev.horarios[dia],
          [campo]: valor,
        },
      },
    }));
  };

  const salvarHorarios = async () => {
    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      await axiosConfig.put("/configuracaoLoja", config);

      setSucesso("Horários atualizados com sucesso!");
      await carregarDados();
    } catch (error) {
      console.error("Erro ao salvar horários:", error);
      setErro("Erro ao salvar horários.");
    } finally {
      setSalvando(false);
    }
  };

  if (usuarioLogado?.tipo?.toUpperCase() !== "ADM") {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          Acesso negado: apenas administradores podem gerenciar a loja.
        </Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="success" />
        <p className="mt-3">Carregando configurações...</p>
      </Container>
    );
  }

  const diasSemana = [
    { key: "segunda", nome: "Segunda-feira" },
    { key: "terca", nome: "Terça-feira" },
    { key: "quarta", nome: "Quarta-feira" },
    { key: "quinta", nome: "Quinta-feira" },
    { key: "sexta", nome: "Sexta-feira" },
    { key: "sabado", nome: "Sábado" },
    { key: "domingo", nome: "Domingo" },
  ];

  return (
    <Container className="mt-5 mb-5">
      <h2 className="text-center mb-4">Gerenciar Loja</h2>

      {erro && (
        <Alert variant="danger" dismissible onClose={() => setErro("")}>
          {erro}
        </Alert>
      )}

      {sucesso && (
        <Alert variant="success" dismissible onClose={() => setSucesso("")}>
          {sucesso}
        </Alert>
      )}

      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-dark text-white">
          <h5 className="mb-0">Status Atual</h5>
        </Card.Header>
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6}>
              <div className="d-flex align-items-center gap-3">
                <div>
                  {status?.estaAberta ? (
                    <Badge bg="success" className="fs-4 px-4 py-2">
                      🟢 ABERTA
                    </Badge>
                  ) : (
                    <Badge bg="danger" className="fs-4 px-4 py-2">
                      🔴 FECHADA
                    </Badge>
                  )}
                </div>
                <div>
                  <h6 className="mb-0">{status?.mensagem}</h6>
                  {status?.proximaAbertura && (
                    <small className="text-muted">
                      Próxima abertura: {status.proximaAbertura}
                    </small>
                  )}
                </div>
              </div>
            </Col>
            <Col md={6} className="text-md-end mt-3 mt-md-0">
              <Button
                variant={config?.lojaAberta ? "danger" : "success"}
                size="lg"
                onClick={toggleStatus}
                disabled={salvando}
                className="px-5"
              >
                {salvando ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Processando...
                  </>
                ) : config?.lojaAberta ? (
                  "🔴 FECHAR LOJA"
                ) : (
                  "🟢 ABRIR LOJA"
                )}
              </Button>
            </Col>
          </Row>

          {config?.horarioHoje && (
            <Alert variant="info" className="mt-3 mb-0">
              <strong>Horário de hoje:</strong>{" "}
              {config.horarioHoje.fechado
                ? "Fechado"
                : `${config.horarioHoje.abertura} - ${config.horarioHoje.fechamento}`}
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* HORÁRIOS DE FUNCIONAMENTO */}
      <Card className="shadow-sm">
        <Card.Header className="bg-dark text-white">
          <h5 className="mb-0">🕐 Horários de Funcionamento</h5>
        </Card.Header>
        <Card.Body>
          {diasSemana.map(({ key, nome }) => (
            <Row
              key={key}
              className="mb-3 align-items-center border-bottom pb-3"
            >
              <Col md={3}>
                <strong>{nome}</strong>
              </Col>
              <Col md={3}>
                <Form.Check
                  type="switch"
                  id={`fechado-${key}`}
                  label="Fechado"
                  checked={config?.horarios[key]?.fechado || false}
                  onChange={(e) =>
                    handleHorarioChange(key, "fechado", e.target.checked)
                  }
                  disabled={salvando}
                />
              </Col>
              {!config?.horarios[key]?.fechado && (
                <>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="small">Abertura</Form.Label>
                      <Form.Control
                        type="time"
                        value={config?.horarios[key]?.abertura || ""}
                        onChange={(e) =>
                          handleHorarioChange(key, "abertura", e.target.value)
                        }
                        disabled={salvando}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="small">Fechamento</Form.Label>
                      <Form.Control
                        type="time"
                        value={config?.horarios[key]?.fechamento || ""}
                        onChange={(e) =>
                          handleHorarioChange(key, "fechamento", e.target.value)
                        }
                        disabled={salvando}
                      />
                    </Form.Group>
                  </Col>
                </>
              )}
            </Row>
          ))}

          <Form.Group className="mt-4 mb-3">
            <Form.Label>Mensagem de Fechamento</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={config?.mensagemFechamento || ""}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  mensagemFechamento: e.target.value,
                }))
              }
              placeholder="Ex: Estamos fechados no momento. Voltamos em breve!"
              disabled={salvando}
            />
          </Form.Group>

          <div className="d-grid">
            <Button
              variant="primary"
              size="lg"
              onClick={salvarHorarios}
              disabled={salvando}
            >
              {salvando ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Salvando...
                </>
              ) : (
                "💾 Salvar Horários"
              )}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default StatusLojaADM;
