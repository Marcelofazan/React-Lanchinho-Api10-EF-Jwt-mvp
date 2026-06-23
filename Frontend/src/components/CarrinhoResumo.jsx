import React from 'react';
import { Container, Button } from 'react-bootstrap';

function CarrinhoResumo({ carrinho, atualizarQuantidade }) {
  const total = carrinho.reduce(
    (total, item) => total + item.preco * item.quantidade,
    0
  );

  return (
    <Container className="mb-4 p-3 border rounded bg-light">
      <h5 className="mb-3">🧾 Resumo do Pedido:</h5>
      {carrinho.map((item) => (
        <div
          key={item.id}
          className="d-flex justify-content-between align-items-center mb-2"
        >
          <div>
            <strong>{item.nome}</strong> <br />
            <small>R$ {item.preco.toFixed(2)} cada</small>
          </div>
          <div className="d-flex align-items-center">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => atualizarQuantidade(item.id, '-')}
            >
              –
            </Button>
            <span className="mx-2 fw-bold">{item.quantidade}</span>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => atualizarQuantidade(item.id, '+')}
            >
              +
            </Button>
          </div>
          <span className="fw-bold text-success">
            R$ {(item.preco * item.quantidade).toFixed(2)}
          </span>
        </div>
      ))}
      <hr />
      <div className="text-end">
        <strong>Total: R$ {total.toFixed(2)}</strong>
      </div>
    </Container>
  );
}

export default CarrinhoResumo;