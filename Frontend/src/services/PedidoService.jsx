import axiosConfig from "./axiosConfig";

export async function buscarMeusPedidos() {
  try {
    const response = await axiosConfig.get("/pedido/meus");
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar meus pedidos:", error);

    throw error;
  }
}
