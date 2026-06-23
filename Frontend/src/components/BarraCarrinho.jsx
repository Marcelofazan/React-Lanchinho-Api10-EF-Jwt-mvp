import React, { useContext, useState, useEffect, useRef } from "react";
import { Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import axiosConfig from "../services/axiosConfig";
import "../styles/BarraCarrinho.css";
import ModalEntrega from "./Modal";

function BarraCarrinho({
  carrinho,
  atualizarQuantidade,
  limparCarrinho,
  onClose,
}) {
  const navigate = useNavigate();
  const { usuariologado } = useContext(AuthContext);
  const [showModal, setShowModal] = useState(false);
  const [dadosEntrega, setDadosEntrega] = useState({
    endereco: "",
    pontoReferencia: "",
    observacoes: "",
    formaPagamento: "",
  });
  const [observacoesItens, setObservacoesItens] = useState({});
  const [expandedItem, setExpandedItem] = useState(null);

  const [statusLoja, setStatusLoja] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const pedidoEnviadoRef = useRef(false);
  const ultimoEnvioRef = useRef(0);

  const NUMERO_WHATSAPP = "5517999999999";
  const total = carrinho.reduce(
    (soma, item) => soma + item.preco * item.quantidade,
    0
  );

  useEffect(() => {
    const carregarStatus = async () => {
      try {
        setLoadingStatus(true);
        const response = await axiosConfig.get("/configuracaoLoja/status");
        setStatusLoja(response.data);
      } catch (error) {
        console.error("Erro ao carregar status:", error);
      } finally {
        setLoadingStatus(false);
      }
    };

    carregarStatus();
  }, []);

  useEffect(() => {
    if (!showModal) {
      pedidoEnviadoRef.current = false;
    }
  }, [showModal]);

  if (carrinho.length === 0) return null;

  const gerarUrlWhatsApp = (mensagem) => {
    const mensagemCodificada = encodeURIComponent(mensagem);
    return `https://api.whatsapp.com/send?phone=${NUMERO_WHATSAPP}&text=${mensagemCodificada}`;
  };

  const handleFinalizarPedido = () => {
    if (!statusLoja?.estaAberta) {
      alert("Loja fechada! Não é possível finalizar pedidos no momento.");
      return;
    }

    if (usuariologado && usuariologado.id) {
      setShowModal(true);
    } else {
      navigate("/login");
    }
  };

  const enviarParaWhatsApp = async () => {
    if (enviandoPedido) {
      console.warn("BLOQUEADO: Pedido já está sendo processado");
      return;
    }

    if (pedidoEnviadoRef.current) {
      console.warn("BLOQUEADO: Pedido já foi enviado");
      alert("Este pedido já foi enviado! Verifique seu WhatsApp.");
      return;
    }

    const agora = Date.now();
    if (agora - ultimoEnvioRef.current < 3000) {
      console.warn("BLOQUEADO: Aguarde antes de enviar novamente");
      alert("Por favor, aguarde alguns segundos antes de tentar novamente.");
      return;
    }

    if (!statusLoja?.estaAberta) {
      alert("Loja fechada! Não é possível finalizar pedidos no momento.");
      setShowModal(false);
      return;
    }

    if (!dadosEntrega.endereco.trim()) {
      alert("Por favor, informe o endereço de entrega!");
      return;
    }
    if (!dadosEntrega.formaPagamento) {
      alert("Por favor, selecione a forma de pagamento!");
      return;
    }

    setEnviandoPedido(true);
    ultimoEnvioRef.current = Date.now();

    try {
      const pedidoDTO = {
        clienteId: usuariologado.id,
        nomeCliente: usuariologado.nome,
        endereco: dadosEntrega.endereco,
        referencia: dadosEntrega.pontoReferencia,
        observacoes: dadosEntrega.observacoes,
        formaPagamento: dadosEntrega.formaPagamento,
        isRascunho: false,
        itens: carrinho.map((item) => ({
          produtoId: item.id,
          quantidade: item.quantidade,
          observacoes: observacoesItens[item.id] || "",
        })),
      };

      const resposta = await axiosConfig.post("/pedido", pedidoDTO);
      pedidoEnviadoRef.current = true;

      const { codigo, subtotal } = resposta.data;

      const produtosList = carrinho
        .map((item) => {
          const observacaoItem = observacoesItens[item.id];
          let linha = `${item.quantidade}x ${item.nome} - R$ ${(
            item.preco * item.quantidade
          ).toFixed(2)}`;
          if (observacaoItem && observacaoItem.trim()) {
            linha += `\n   Obs: ${observacaoItem.trim()}`;
          }
          return linha;
        })
        .join("\n\n");

      const mensagem = [
        "*NOVO PEDIDO - Lanchinho DELIVERY*",
        "",
        `Pedido: #${codigo}`,
        `Data: ${new Date().toLocaleString("pt-BR")}`,
        "",
        `Cliente: ${usuariologado.nome}`,
        `Telefone: ${usuariologado.telefone}`,
        "",
        `Endereço: ${dadosEntrega.endereco}`,
        dadosEntrega.pontoReferencia
          ? `Referência: ${dadosEntrega.pontoReferencia}`
          : null,
        "",
        "*ITENS:*",
        produtosList,
        "",
        dadosEntrega.observacoes
          ? `Observações: ${dadosEntrega.observacoes}`
          : null,
        "",
        `Subtotal: R$ ${subtotal.toFixed(2)}`,
        `Forma de pagamento: ${dadosEntrega.formaPagamento}`,
      ]
        .filter(Boolean)
        .join("\n");

      const urlWhatsApp = gerarUrlWhatsApp(mensagem);
      window.location.href = urlWhatsApp;

      setTimeout(() => {
        limparCarrinho();
        setShowModal(false);
        setDadosEntrega({
          endereco: "",
          pontoReferencia: "",
          observacoes: "",
          formaPagamento: "",
        });
        setObservacoesItens({});
        setEnviandoPedido(false);
      }, 500);
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
      pedidoEnviadoRef.current = false;
      setEnviandoPedido(false);

      if (error.response?.status === 409) {
        alert("Este pedido já foi registrado! Verifique seus pedidos.");
      } else {
        alert("Não foi possível registrar o pedido. Tente novamente.");
      }
    }
  };

  const handleInputChange = (campo, valor) => {
    setDadosEntrega((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleObservacaoItemChange = (itemId, observacao) => {
    setObservacoesItens((prev) => ({ ...prev, [itemId]: observacao }));
  };

  return (
    <>
      <div className="carrinho-overlay" onClick={onClose}></div>

      <div className="carrinho-sidebar">
        <div className="carrinho-header">
          <h3>Meu Carrinho</h3>
          <button className="btn-fechar" onClick={onClose}>
            ×
          </button>
        </div>

        {!loadingStatus && statusLoja && !statusLoja.estaAberta && (
          <Alert variant="danger" className="m-3">
            <Alert.Heading className="h6">Loja Fechada</Alert.Heading>
            <p className="mb-1 small">{statusLoja.mensagem}</p>
            {statusLoja.proximaAbertura && (
              <small className="text-muted">
                Próxima abertura: {statusLoja.proximaAbertura}
              </small>
            )}
          </Alert>
        )}

        <div className="carrinho-itens">
          {carrinho.map((item) => (
            <div key={item.id} className="item-carrinho">
              <div className="item-principal">
                <div className="item-info-row">
                  <h4>{item.nome}</h4>
                  <span className="item-total">
                    R$ {(item.preco * item.quantidade).toFixed(2)}
                  </span>
                </div>
                <p className="item-preco-un">R$ {item.preco.toFixed(2)} un.</p>

                <div className="item-acoes">
                  <div className="qty-control">
                    <button onClick={() => atualizarQuantidade(item.id, "-")}>
                      −
                    </button>
                    <span>{item.quantidade}</span>
                    <button onClick={() => atualizarQuantidade(item.id, "+")}>
                      +
                    </button>
                  </div>

                  <button
                    className={`btn-obs ${
                      expandedItem === item.id ? "active" : ""
                    }`}
                    onClick={() =>
                      setExpandedItem(expandedItem === item.id ? null : item.id)
                    }
                  >
                    {observacoesItens[item.id] ? "✓ " : ""}Observações
                  </button>
                </div>
              </div>

              {expandedItem === item.id && (
                <div className="obs-expandida">
                  <textarea
                    placeholder="Ex: sem cebola, ponto da carne..."
                    value={observacoesItens[item.id] || ""}
                    onChange={(e) =>
                      handleObservacaoItemChange(item.id, e.target.value)
                    }
                    maxLength={150}
                    rows={3}
                  />
                  <small>{(observacoesItens[item.id] || "").length}/150</small>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="carrinho-footer">
          <div className="total-row">
            <span>Subtotal</span>
            <strong>R$ {total.toFixed(2)}</strong>
          </div>
          <small className="taxa-info">+ Taxa de entrega</small>

          <div className="footer-btns">
            <button className="btn-cancelar" onClick={limparCarrinho}>
              Limpar
            </button>
            <button
              className="btn-finalizar"
              onClick={handleFinalizarPedido}
              disabled={
                !statusLoja?.estaAberta || loadingStatus || enviandoPedido
              }
            >
              {loadingStatus
                ? "Carregando..."
                : enviandoPedido
                ? "Enviando..."
                : !statusLoja?.estaAberta
                ? "Loja Fechada"
                : "Finalizar Pedido"}
            </button>
          </div>
        </div>
      </div>

      <ModalEntrega
        show={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={enviarParaWhatsApp}
        dadosEntrega={dadosEntrega}
        handleInputChange={handleInputChange}
        enviando={enviandoPedido}
      />
    </>
  );
}

export default BarraCarrinho;
