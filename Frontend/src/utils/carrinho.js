import React from "react";
export const adicionarAoCarrinho = (item) => {
  const carrinhoAtual = JSON.parse(localStorage.getItem("carrinho")) || [];

  // Se o item já existe, atualiza a quantidade
  const carrinhoAtualizado = (() => {
    const existente = carrinhoAtual.find((p) => p.id === item.id);
    if (existente) {
      return carrinhoAtual.map((p) =>
        p.id === item.id ? { ...p, quantidade: p.quantidade + 1 } : p
      );
    } else {
      return [...carrinhoAtual, { ...item, quantidade: 1 }];
    }
  })();

  localStorage.setItem("carrinho", JSON.stringify(carrinhoAtualizado));
};
