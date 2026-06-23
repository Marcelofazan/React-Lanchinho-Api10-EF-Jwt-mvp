import React, { useEffect, useState, useRef } from "react";
import {
  Container,
  Card,
  Button,
  Alert,
  Spinner,
  Row,
  Col,
} from "react-bootstrap";
import "../styles/Checkout.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ModalEntrega from "../components/Modal";
import { criarPedido } from "../services/pedidoService";

function Checkout() {
  const [carrinho, setCarrinho] = useState([]);
  const [total, setTotal] = useState(0);
  const [pedidoConfirmado, setPedidoConfirmado] = useState(false);
  const [carregandoCarrinho, setCarregandoCarrinho] = useState(true);
  const [confirmando, setConfirmando] = useState(false);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [dadosEntrega, setDadosEntrega] = useState({
    tipoPedido: "ENTREGA",
    endereco: "",
    pontoReferencia: "",
    observacoes: "",
    formaPagamento: "",
    troco: "",
  });

  // PROTEÇÃO CONTRA DUPLICATAS
  const pedidoEnviadoRef = useRef(false);
  const ultimoEnvioRef = useRef(0);

  const navigate = useNavigate();
  const {
    usuarioLogado,
    loading: authLoading,
    isLoggedIn,
    isInitialized,
  } = useAuth();

  useEffect(() => {
    if (isInitialized && !isLoggedIn) {
      navigate("/login", { replace: true });
      return;
    }

    if (usuarioLogado?.id) {
      try {
        const carrinhoKey = `carrinho_${usuarioLogado.id}`;
        const itensCarrinho = JSON.parse(
          localStorage.getItem(carrinhoKey) || "[]"
        );

        if (Array.isArray(itensCarrinho) && itensCarrinho.length > 0) {
          const itensValidos = itensCarrinho.filter(
            (item) =>
              item &&
              item.id &&
              item.nome &&
              typeof item.preco === "number" &&
              item.quantidade > 0
          );

          setCarrinho(itensValidos);
          const valorTotal = itensValidos.reduce(
            (acc, item) => acc + item.preco * item.quantidade,
            0
          );
          setTotal(valorTotal);
        } else {
          setCarrinho([]);
          setTotal(0);
        }
      } catch (error) {
        console.error("Erro ao carregar carrinho:", error);
        setCarrinho([]);
        setTotal(0);
      }
      setCarregandoCarrinho(false);
    }
  }, [usuarioLogado, isInitialized, isLoggedIn, navigate]);

  // Reset da flag quando o modal é fechado
  useEffect(() => {
    if (!mostrarModal) {
      pedidoEnviadoRef.current = false;
    }
  }, [mostrarModal]);

  const handleInputChange = (campo, valor) => {
    console.log(`✅ Alterando ${campo} para:`, valor);
    setDadosEntrega((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  const montarMensagemWhatsApp = () => {
    console.log("📝 Montando mensagem com dados:", dadosEntrega);

    let mensagem = "*NOVO PEDIDO - Lanchinho DELIVERY*\n\n";

    mensagem += `*Cliente:* ${usuarioLogado?.nome || "Cliente"}\n`;
    if (usuarioLogado?.telefone) {
      mensagem += `*Telefone:* ${usuarioLogado.telefone}\n`;
    }
    mensagem += "\n";

    mensagem += "*ITENS DO PEDIDO:*\n\n";
    carrinho.forEach((item) => {
      const subtotal = (item.preco * item.quantidade).toFixed(2);
      mensagem += `${item.quantidade}x *${item.nome}*\n`;
      mensagem += `  R$ ${item.preco.toFixed(2)} → R$ ${subtotal}\n\n`;
    });

    mensagem += "━━━━━━━━━━━━━━━━━━\n\n";
    mensagem += `*TOTAL: R$ ${total.toFixed(2)}*\n\n`;
    mensagem += "━━━━━━━━━━━━━━━━━━\n\n";

    if (dadosEntrega.tipoPedido === "RETIRADA") {
      mensagem += `*TIPO:* RETIRADA NO LOCAL\n\n`;
      mensagem += `*Cliente vai retirar em:*\nRua Teste, S/N - Bairro\nCidade - SP\n\n`;
      mensagem += `*Tempo estimado:* 30-40 minutos\n\n`;
    } else {
      mensagem += `*TIPO:* ENTREGA\n\n`;
      mensagem += `*Endereço de Entrega:*\n${
        dadosEntrega.endereco || "Não informado"
      }\n\n`;

      if (dadosEntrega.pontoReferencia) {
        mensagem += `*Ponto de Referência:*\n${dadosEntrega.pontoReferencia}\n\n`;
      }
    }

    mensagem += "\n";

    const formasPagamento = {
      PIX: "PIX",
      DINHEIRO: "Dinheiro",
      CARTAO_DEBITO: "Cartão de Débito",
      CARTAO_CREDITO: "Cartão de Crédito",
    };

    mensagem += `*Pagamento:* ${
      formasPagamento[dadosEntrega.formaPagamento] ||
      dadosEntrega.formaPagamento
    }\n\n`;

    if (dadosEntrega.formaPagamento === "DINHEIRO" && dadosEntrega.troco) {
      mensagem += `*Troco para:* ${dadosEntrega.troco}\n\n`;
    }

    if (dadosEntrega.observacoes) {
      mensagem += "━━━━━━━━━━━━━━━━━━\n\n";
      mensagem += `*Observações:*\n${dadosEntrega.observacoes}\n\n`;
    }

    mensagem += "━━━━━━━━━━━━━━━━━━\n\n";
    mensagem += "_Pedido enviado via sistema online_";

    return mensagem;
  };

  const enviarPedidoWhatsApp = () => {
    const mensagem = montarMensagemWhatsApp();
    console.log("📤 Enviando para WhatsApp:", mensagem);

    const numeroWhatsApp = "5521970754898";
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(
      mensagem
    )}`;
    window.open(urlWhatsApp, "_blank");
  };

  const handleConfirmarPedido = async () => {
    // PROTEÇÃO 1: Verificar se já está processando
    if (confirmando) {
      console.warn("🚫 BLOQUEADO: Pedido já está sendo processado");
      return;
    }

    // PROTEÇÃO 2: Verificar se já foi enviado
    if (pedidoEnviadoRef.current) {
      console.warn("🚫 BLOQUEADO: Pedido já foi enviado");
      alert("Este pedido já foi enviado! Verifique seus pedidos.");
      return;
    }

    // PROTEÇÃO 3: Debounce de 3 segundos
    const agora = Date.now();
    if (agora - ultimoEnvioRef.current < 3000) {
      console.warn("🚫 BLOQUEADO: Aguarde antes de enviar novamente");
      alert("Por favor, aguarde alguns segundos antes de tentar novamente.");
      return;
    }

    if (!usuarioLogado?.id || carrinho.length === 0) {
      alert("Erro: Usuário não autenticado ou carrinho vazio.");
      return;
    }

    console.log("✅ Confirmando pedido com dados:", dadosEntrega);
    setConfirmando(true);
    ultimoEnvioRef.current = Date.now();

    try {
      const dadosPedido = {
        clienteId: usuarioLogado.id,
        nomeCliente: usuarioLogado.nome,
        endereco:
          dadosEntrega.tipoPedido === "RETIRADA"
            ? "Cliente vai retirar no balcão!"
            : dadosEntrega.endereco,
        referencia: dadosEntrega.pontoReferencia || "",
        observacoes: dadosEntrega.observacoes || "",
        formaPagamento: dadosEntrega.formaPagamento,
        isRascunho: false,
        itens: carrinho.map((item) => ({
          produtoId: item.id,
          quantidade: item.quantidade,
        })),
      };

      console.log("📤 Enviando pedido para API:", dadosPedido);

      const pedidoCriado = await criarPedido(dadosPedido);

      // Marcar como enviado com sucesso
      pedidoEnviadoRef.current = true;

      console.log("✅ Pedido salvo no banco:", pedidoCriado);

      enviarPedidoWhatsApp();

      await new Promise((resolve) => setTimeout(resolve, 1500));
      localStorage.removeItem(`carrinho_${usuarioLogado.id}`);
      setPedidoConfirmado(true);
      setCarrinho([]);
      setTotal(0);
      setMostrarModal(false);

      setDadosEntrega({
        tipoPedido: "ENTREGA",
        endereco: "",
        pontoReferencia: "",
        observacoes: "",
        formaPagamento: "",
        troco: "",
      });

      setTimeout(() => navigate("/home"), 3000);
    } catch (error) {
      console.error("❌ Erro ao confirmar pedido:", error);

      // Resetar flag apenas em caso de erro
      pedidoEnviadoRef.current = false;

      if (error.response?.status === 409) {
        alert("Este pedido já foi registrado! Verifique seus pedidos.");
      } else {
        alert(
          `Erro ao confirmar pedido: ${error.message}\n\n` +
            `Por favor, tente novamente ou entre em contato conosco.`
        );
      }
    } finally {
      setConfirmando(false);
    }
  };

  if (!isInitialized || authLoading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="success" />
        <p className="mt-3">Verificando autenticação...</p>
      </Container>
    );
  }

  return (
    <>
      <Container className="mt-5 fade-in">
        <h2 className="text-center mb-4">🛒 Checkout - Finalizar Pedido</h2>

        {carregandoCarrinho ? (
          <div className="text-center my-5">
            <Spinner animation="border" variant="success" />
            <p className="mt-3">Carregando carrinho...</p>
          </div>
        ) : pedidoConfirmado ? (
          <Alert variant="success" className="text-center">
            <Alert.Heading>✅ Pedido Confirmado!</Alert.Heading>
            <p>
              Seu pedido foi enviado para a loja via WhatsApp e está sendo
              preparado.
            </p>
            <hr />
            <p className="mb-0">Redirecionando para o cardápio...</p>
          </Alert>
        ) : carrinho.length === 0 ? (
          <Alert variant="warning" className="text-center">
            <Alert.Heading>Carrinho Vazio</Alert.Heading>
            <p>Seu carrinho está vazio. Adicione alguns itens deliciosos!</p>
            <Button variant="success" onClick={() => navigate("/home")}>
              Ver Cardápio
            </Button>
          </Alert>
        ) : (
          <>
            <Row>
              <Col lg={8}>
                <h4 className="mb-3">Itens do Pedido</h4>
                {carrinho.map((item) => (
                  <Card key={`${item.id}-${item.quantidade}`} className="mb-3">
                    <Card.Body>
                      <Row className="align-items-center">
                        <Col xs={8}>
                          <Card.Title className="mb-1">{item.nome}</Card.Title>
                          <Card.Text className="text-muted">
                            Quantidade: {item.quantidade} | Preço unitário: R${" "}
                            {item.preco.toFixed(2)}
                          </Card.Text>
                        </Col>
                        <Col xs={4} className="text-end">
                          <strong>
                            R$ {(item.preco * item.quantidade).toFixed(2)}
                          </strong>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                ))}
              </Col>
              <Col lg={4}>
                <Card className="sticky-top">
                  <Card.Header>
                    <h5 className="mb-0">Resumo do Pedido</h5>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex justify-content-between mb-3">
                      <span>Subtotal:</span>
                      <span>R$ {total.toFixed(2)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-3">
                      <span>Taxa de entrega:</span>
                      <span>Grátis</span>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between mb-3">
                      <strong>Total:</strong>
                      <strong>R$ {total.toFixed(2)}</strong>
                    </div>
                    <Button
                      variant="success"
                      className="w-100"
                      size="lg"
                      onClick={() => setMostrarModal(true)}
                      disabled={carrinho.length === 0 || confirmando}
                    >
                      {confirmando ? "Enviando..." : "Continuar para Entrega"}
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Container>

      <ModalEntrega
        show={mostrarModal}
        onClose={() => setMostrarModal(false)}
        onConfirm={handleConfirmarPedido}
        dadosEntrega={dadosEntrega}
        handleInputChange={handleInputChange}
        carregando={confirmando}
      />
    </>
  );
}

export default Checkout;
