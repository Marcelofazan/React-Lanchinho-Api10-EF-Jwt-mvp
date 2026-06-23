import React from "react";
import { Modal, Form, Button, ButtonGroup, Alert } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import "../styles/Modal.css";

function ModalEntrega({
  show,
  onClose,
  onConfirm,
  dadosEntrega,
  handleInputChange,
  carregando = false,
}) {
  const { usuarioLogado } = useAuth();

  React.useEffect(() => {
    if (
      show &&
      usuarioLogado?.endereco &&
      !dadosEntrega.endereco &&
      dadosEntrega.tipoPedido === "ENTREGA"
    ) {
      console.log(
        "Preenchendo endereço automaticamente:",
        usuarioLogado.endereco
      );
      handleInputChange("endereco", usuarioLogado.endereco);
    }
  }, [
    show,
    usuarioLogado,
    dadosEntrega.endereco,
    dadosEntrega.tipoPedido,
    handleInputChange,
  ]);

  const handleSubmit = (e) => {
    e?.preventDefault();

    console.log("Dados antes de enviar:", dadosEntrega);
    console.log("Tipo de pedido atual:", dadosEntrega.tipoPedido);

    if (dadosEntrega.tipoPedido === "ENTREGA") {
      if (!dadosEntrega.endereco || dadosEntrega.endereco.trim() === "") {
        console.log("Erro: Endereço não informado");
        alert("Por favor, informe o endereço de entrega.");
        return;
      }
    } else {
      console.log("Tipo RETIRADA - Endereço não necessário");
    }

    if (!dadosEntrega.formaPagamento) {
      console.log("Erro: Forma de pagamento não selecionada");
      alert("Por favor, selecione a forma de pagamento.");
      return;
    }

    console.log("Validação OK! Tipo de pedido:", dadosEntrega.tipoPedido);
    console.log("Chamando onConfirm...");
    onConfirm();
  };

  const handleTipoPedidoChange = (tipo) => {
    console.log(`Mudando tipo de pedido para: ${tipo}`);
    handleInputChange("tipoPedido", tipo);

    if (tipo === "RETIRADA") {
      console.log("Limpando campo de endereço...");
      handleInputChange("endereco", "Cliente vai retirar no balcão!");
    }
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      backdrop="static"
      className="modal-entrega"
    >
      <Modal.Header closeButton>
        <Modal.Title>Finalizar Pedido</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit} noValidate>
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold">
              Tipo de Pedido <span className="text-danger">*</span>
            </Form.Label>
            <ButtonGroup className="w-100 tipo-pedido-group">
              <Button
                variant={
                  dadosEntrega.tipoPedido === "ENTREGA"
                    ? "success"
                    : "outline-success"
                }
                onClick={() => handleTipoPedidoChange("ENTREGA")}
                disabled={carregando}
                className="tipo-pedido-btn"
              >
                Entrega
              </Button>
              <Button
                variant={
                  dadosEntrega.tipoPedido === "RETIRADA"
                    ? "success"
                    : "outline-success"
                }
                onClick={() => handleTipoPedidoChange("RETIRADA")}
                disabled={carregando}
                className="tipo-pedido-btn"
              >
                Retirar no Local
              </Button>
            </ButtonGroup>
            <small className="d-block mt-1 tipo-pedido-info">
              Tipo selecionado: <strong>{dadosEntrega.tipoPedido}</strong>
            </small>
          </Form.Group>

          {dadosEntrega.tipoPedido === "ENTREGA" && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>
                  Endereço <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Rua, número, bairro..."
                  value={dadosEntrega.endereco || ""}
                  onChange={(e) =>
                    handleInputChange("endereco", e.target.value)
                  }
                  disabled={carregando}
                />
                <Form.Text className="text-muted">
                  {usuarioLogado?.endereco
                    ? "Este é o endereço cadastrado no seu perfil. Você pode alterá-lo se necessário."
                    : "Você ainda não cadastrou um endereço. Adicione um agora!"}
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Ponto de Referência</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ex: Próximo ao mercado, portão azul..."
                  value={dadosEntrega.pontoReferencia || ""}
                  onChange={(e) =>
                    handleInputChange("pontoReferencia", e.target.value)
                  }
                  disabled={carregando}
                />
              </Form.Group>
            </>
          )}

          {dadosEntrega.tipoPedido === "RETIRADA" && (
            <Alert variant="info" className="mb-3 retirada-info">
              <div className="d-flex align-items-start">
                <span className="me-2">📍</span>
                <div>
                  <strong>Endereço para retirada:</strong>
                  <p className="mb-0 mt-1">
                    Rua Teste, 123 - Bairro Exemplo, Cidade/UF
                  </p>
                  <small className="text-muted">
                    Seu pedido ficará pronto em aproximadamente 40 - 70 minutos.
                  </small>
                </div>
              </div>
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Observações</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder={
                dadosEntrega.tipoPedido === "RETIRADA"
                  ? "Ex: sem cebola, retirar às 19h, troco para R$ 50..."
                  : "Ex: sem cebola, entregar no portão, troco para R$ 50..."
              }
              value={dadosEntrega.observacoes || ""}
              onChange={(e) => handleInputChange("observacoes", e.target.value)}
              disabled={carregando}
              maxLength={500}
            />
            <Form.Text className="text-muted">
              {dadosEntrega.observacoes?.length || 0}/500 caracteres
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Forma de Pagamento <span className="text-danger">*</span>
            </Form.Label>
            <Form.Select
              value={dadosEntrega.formaPagamento || ""}
              onChange={(e) =>
                handleInputChange("formaPagamento", e.target.value)
              }
              disabled={carregando}
            >
              <option value="">Selecione...</option>
              <option value="PIX">PIX</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="CARTAO_DEBITO">Cartão de Débito</option>
              <option value="CARTAO_CREDITO">Cartão de Crédito</option>
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={carregando}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={
            carregando ||
            !dadosEntrega.tipoPedido ||
            (dadosEntrega.tipoPedido === "ENTREGA" && !dadosEntrega.endereco) ||
            !dadosEntrega.formaPagamento
          }
        >
          {carregando ? "Enviando..." : "Enviar Pedido"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ModalEntrega;
