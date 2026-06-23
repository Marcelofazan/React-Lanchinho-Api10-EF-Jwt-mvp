import React from "react";
import { FaClock } from "react-icons/fa";
import "../styles/AlertaLojaFechada.css";

function AlertaLojaFechada({ status }) {
  if (status?.estaAberta) return null;

  return (
    <div className="alerta-loja-fechada">
      <div className="alerta-header">
        <div className="alerta-icon">
          <FaClock />
        </div>
        <h4 className="alerta-titulo">Loja Fechada</h4>
      </div>
      <p className="alerta-mensagem">
        {status?.mensagem || "Estamos fechados no momento."}
      </p>
      {status?.proximaAbertura && (
        <div className="alerta-info">
          <FaClock className="alerta-info-icon" />
          <span>Próxima abertura: {status.proximaAbertura}</span>
        </div>
      )}
      {status?.horarioHoje && !status.horarioHoje.fechado && (
        <div className="alerta-horario">
          Horário de hoje: {status.horarioHoje.abertura} -{" "}
          {status.horarioHoje.fechamento}
        </div>
      )}
    </div>
  );
}

export default AlertaLojaFechada;
