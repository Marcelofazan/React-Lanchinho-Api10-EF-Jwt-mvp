import React, { useEffect, useState } from "react";
import {
  Container,
  Card,
  Alert,
  Spinner,
  Badge,
  Row,
  Col,
  ListGroup,
  Collapse,
} from "react-bootstrap";
import "../styles/MeusPedidos.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  buscarMeusPedidos,
  buscarDetalhesPedido,
} from "../services/pedidoService";

export default function MeusPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [pedidosDetalhados, setPedidosDetalhados] = useState({});
  const [expandidos, setExpandidos] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingDetalhes, setLoadingDetalhes] = useState({});
  const [errosDetalhes, setErrosDetalhes] = useState({});
  const [erro, setErro] = useState("");
  const navigate = useNavigate();
  const { isLoggedIn, isInitialized } = useAuth();

  useEffect(() => {
    if (isInitialized && !isLoggedIn) {
      navigate("/login", { replace: true });
      return;
    }

    if (isLoggedIn) {
      const carregarPedidos = async () => {
        try {
          setLoading(true);
          setErro("");
          const pedidosData = await buscarMeusPedidos();
          console.log("Pedidos recebidos:", pedidosData);
          setPedidos(Array.isArray(pedidosData) ? pedidosData : []);
        } catch (err) {
          console.error("Erro ao carregar pedidos:", err);
          setErro(err.message || "Erro ao carregar pedidos.");
        } finally {
          setLoading(false);
        }
      };

      carregarPedidos();
    }
  }, [isLoggedIn, isInitialized, navigate]);

  const toggleDetalhes = async (pedidoId) => {
    // Se já está expandido, apenas fecha
    if (expandidos[pedidoId]) {
      setExpandidos((prev) => ({ ...prev, [pedidoId]: false }));
      return;
    }

    // Se já tentou carregar e deu erro, só expande para mostrar a mensagem
    if (errosDetalhes[pedidoId]) {
      setExpandidos((prev) => ({ ...prev, [pedidoId]: true }));
      return;
    }

    // Se já tem os detalhes carregados, só expande
    if (pedidosDetalhados[pedidoId]) {
      setExpandidos((prev) => ({ ...prev, [pedidoId]: true }));
      return;
    }

    // Buscar os detalhes
    setLoadingDetalhes((prev) => ({ ...prev, [pedidoId]: true }));
    setExpandidos((prev) => ({ ...prev, [pedidoId]: true }));

    try {
      const detalhes = await buscarDetalhesPedido(pedidoId);
      console.log(`Detalhes do pedido ${pedidoId}:`, detalhes);
      setPedidosDetalhados((prev) => ({ ...prev, [pedidoId]: detalhes }));
      setErrosDetalhes((prev) => ({ ...prev, [pedidoId]: null }));
    } catch (err) {
      console.error(` Erro ao carregar detalhes do pedido ${pedidoId}:`, err);
      setErrosDetalhes((prev) => ({
        ...prev,
        [pedidoId]: "Os itens deste pedido não estão disponíveis no momento.",
      }));
    } finally {
      setLoadingDetalhes((prev) => ({ ...prev, [pedidoId]: false }));
    }
  };

  const formatarData = (dataString) => {
    try {
      return new Date(dataString).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Data inválida";
    }
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor || 0);
  };

  if (!isInitialized || loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="success" />
        <p className="mt-3">Carregando pedidos...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-5 mb-5">
      <h2 className="text-center mb-4 fw-bold">Meus Pedidos</h2>

      {erro && (
        <Alert variant="danger" dismissible onClose={() => setErro("")}>
          <Alert.Heading>Erro</Alert.Heading>
          <p>{erro}</p>
        </Alert>
      )}

      {pedidos.length === 0 && !erro ? (
        <Alert variant="info" className="text-center">
          <Alert.Heading>Nenhum pedido encontrado</Alert.Heading>
          <p>
            Você ainda não fez nenhum pedido. Que tal dar uma olhada no nosso
            cardápio?
          </p>
          <button
            className="btn btn-success mt-2"
            onClick={() => navigate("/home")}
          >
            Ver Cardápio
          </button>
        </Alert>
      ) : (
        <Row>
          {pedidos.map((pedido) => {
            const detalhes = pedidosDetalhados[pedido.id];
            const isExpandido = expandidos[pedido.id];
            const isLoadingDetalhes = loadingDetalhes[pedido.id];
            const erroDetalhes = errosDetalhes[pedido.id];

            return (
              <Col key={pedido.id} xs={12} md={6} lg={4} className="mb-4">
                <Card className="h-100 shadow-sm border-0">
                  <Card.Header className="bg-white d-flex justify-content-between align-items-center py-3">
                    <div>
                      <h5 className="mb-0 fw-bold">Pedido #{pedido.id}</h5>
                      <small className="text-muted">
                        {formatarData(pedido.dataPedido)}
                      </small>
                    </div>
                    <Badge
                      bg="secondary"
                      className="px-3 py-2"
                      style={{ fontSize: "0.9rem" }}
                    >
                      {pedido.status === "Recebido"
                        ? "Recebido"
                        : pedido.status}
                    </Badge>
                  </Card.Header>

                  <Card.Body>
                    <div className="mb-3">
                      <small className="text-muted">Código do Pedido</small>
                      <div className="fw-semibold text-primary">
                        {pedido.codigo}
                      </div>
                    </div>

                    {pedido.subtotal && (
                      <div className="p-3 bg-light rounded mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">Valor Total</small>
                          <h4 className="mb-0 text-success fw-bold">
                            {formatarMoeda(pedido.subtotal)}
                          </h4>
                        </div>
                      </div>
                    )}

                    {pedido.nomeCliente && (
                      <div className="mb-3">
                        <small className="text-muted">Cliente</small>
                        <div className="fw-semibold">{pedido.nomeCliente}</div>
                      </div>
                    )}

                    <button
                      className="btn btn-outline-success btn-sm w-100"
                      onClick={() => toggleDetalhes(pedido.id)}
                      disabled={isLoadingDetalhes}
                    >
                      {isLoadingDetalhes ? (
                        <>
                          <Spinner
                            animation="border"
                            size="sm"
                            className="me-2"
                          />
                          Carregando...
                        </>
                      ) : isExpandido ? (
                        "Ocultar Itens"
                      ) : (
                        "Ver Itens do Pedido"
                      )}
                    </button>

                    <Collapse in={isExpandido}>
                      <div>
                        {erroDetalhes ? (
                          <Alert variant="warning" className="mt-3 mb-0 small">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            {erroDetalhes}
                          </Alert>
                        ) : isLoadingDetalhes ? (
                          <div className="mt-3 text-center">
                            <Spinner
                              animation="border"
                              size="sm"
                              variant="success"
                            />
                          </div>
                        ) : detalhes?.itens && detalhes.itens.length > 0 ? (
                          <div className="mt-3 border-top pt-3">
                            <h6 className="fw-bold mb-3">Itens do Pedido</h6>
                            <ListGroup variant="flush">
                              {detalhes.itens.map((item, index) => (
                                <ListGroup.Item
                                  key={item.id || index}
                                  className="px-0 d-flex justify-content-between align-items-start"
                                >
                                  <div className="flex-grow-1">
                                    <div className="fw-semibold">
                                      {item.produto?.nome ||
                                        item.produtoNome ||
                                        "Produto"}
                                    </div>
                                    {item.observacao && (
                                      <small className="text-muted d-block mt-1">
                                        Obs: {item.observacao}
                                      </small>
                                    )}
                                  </div>
                                  <div className="text-end ms-3">
                                    <Badge bg="secondary" className="mb-1">
                                      {item.quantidade}x
                                    </Badge>
                                  </div>
                                </ListGroup.Item>
                              ))}
                            </ListGroup>
                          </div>
                        ) : detalhes ? (
                          <Alert variant="info" className="mt-3 mb-0 small">
                            Nenhum item encontrado neste pedido
                          </Alert>
                        ) : null}
                      </div>
                    </Collapse>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </Container>
  );
}
