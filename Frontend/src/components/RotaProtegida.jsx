import { Navigate } from "react-router-dom";

function RotaProtegida({ children }) {
  const clienteLogado = JSON.parse(localStorage.getItem("clienteLogado"));
  return clienteLogado ? children : <Navigate to="/login" replace />;
}

export default RotaProtegida;
