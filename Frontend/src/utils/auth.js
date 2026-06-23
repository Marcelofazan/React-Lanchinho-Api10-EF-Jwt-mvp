import React from "react";
export const salvarUsuario = (novoUsuario) => {
  const lista = JSON.parse(localStorage.getItem("usuarios")) || [];
  const atualizados = [...lista, novoUsuario];
  localStorage.setItem("usuarios", JSON.stringify(atualizados));
};

export const verificarUsuarioExistente = (email) => {
  const lista = JSON.parse(localStorage.getItem("usuarios")) || [];
  return lista.find((user) => user.email === email);
};

export const validarLogin = (email, senha) => {
  const lista = JSON.parse(localStorage.getItem("usuarios")) || [];
  return lista.find((user) => user.email === email && user.senha === senha);
};
