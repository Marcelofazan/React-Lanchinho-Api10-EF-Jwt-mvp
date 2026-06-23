import React, { createContext, useContext, useState, useCallback } from 'react';

// Context para o sistema de toast
const ToastContext = createContext();

// Hook para usar o sistema de toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
};

// Provider do sistema de toast
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Função para adicionar um toast
  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type,
      duration,
      timestamp: new Date()
    };

    setToasts(prev => [...prev, toast]);

    // Auto remover toast após o tempo especificado
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  // Função para remover um toast específico
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Funções de conveniência para diferentes tipos
  const success = useCallback((message, duration = 4000) => 
    addToast(message, 'success', duration), [addToast]);

  const error = useCallback((message, duration = 6000) => 
    addToast(message, 'error', duration), [addToast]);

  const warning = useCallback((message, duration = 5000) => 
    addToast(message, 'warning', duration), [addToast]);

  const info = useCallback((message, duration = 4000) => 
    addToast(message, 'info', duration), [addToast]);

  // Limpar todos os toasts
  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Função para obter ícone baseado no tipo
  const getIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  // Função para obter cor de fundo baseado no tipo
  const getBackgroundColor = (type) => {
    switch (type) {
      case 'success': return '#d4edda';
      case 'error': return '#f8d7da';
      case 'warning': return '#fff3cd';
      case 'info': return '#d1ecf1';
      default: return '#f8f9fa';
    }
  };

  // Função para obter cor da borda baseado no tipo
  const getBorderColor = (type) => {
    switch (type) {
      case 'success': return '#c3e6cb';
      case 'error': return '#f5c6cb';
      case 'warning': return '#ffeaa7';
      case 'info': return '#bee5eb';
      default: return '#dee2e6';
    }
  };

  // Função para obter cor do texto baseado no tipo
  const getTextColor = (type) => {
    switch (type) {
      case 'success': return '#155724';
      case 'error': return '#721c24';
      case 'warning': return '#856404';
      case 'info': return '#0c5460';
      default: return '#495057';
    }
  };

  // Função para obter título baseado no tipo
  const getTitle = (type) => {
    switch (type) {
      case 'success': return 'Sucesso';
      case 'error': return 'Erro';
      case 'warning': return 'Aviso';
      case 'info': return 'Informação';
      default: return 'Notificação';
    }
  };

  const contextValue = {
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    clearAll,
    toasts
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Container dos toasts */}
      <div 
        style={{ 
          position: 'fixed', 
          top: '20px', 
          right: '20px', 
          zIndex: 9999,
          maxWidth: '400px',
          width: '100%'
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              minWidth: '320px',
              maxWidth: '400px',
              marginBottom: '10px',
              padding: '0',
              backgroundColor: getBackgroundColor(toast.type),
              border: `1px solid ${getBorderColor(toast.type)}`,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              animation: 'slideInRight 0.3s ease-out',
              overflow: 'hidden'
            }}
          >
            {/* Header do toast */}
            <div 
              style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: `1px solid ${getBorderColor(toast.type)}`,
                backgroundColor: 'rgba(255,255,255,0.3)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{getIcon(toast.type)}</span>
                <strong style={{ 
                  fontSize: '14px', 
                  color: getTextColor(toast.type),
                  fontWeight: '600'
                }}>
                  {getTitle(toast.type)}
                </strong>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <small style={{ 
                  color: getTextColor(toast.type),
                  opacity: 0.8,
                  fontSize: '12px'
                }}>
                  {toast.timestamp.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </small>
                
                <button
                  onClick={() => removeToast(toast.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    color: getTextColor(toast.type),
                    opacity: 0.7,
                    padding: '0',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.opacity = '1';
                    e.target.style.backgroundColor = 'rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.opacity = '0.7';
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Corpo do toast */}
            <div style={{ padding: '12px 16px' }}>
              <div style={{ 
                color: getTextColor(toast.type),
                fontSize: '14px',
                lineHeight: '1.4',
                wordWrap: 'break-word'
              }}>
                {toast.message}
              </div>
            </div>

            {/* Barra de progresso (opcional) */}
            {toast.duration > 0 && (
              <div
                style={{
                  height: '3px',
                  backgroundColor: getBorderColor(toast.type),
                  animation: `progressBar ${toast.duration}ms linear`,
                  transformOrigin: 'left'
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* CSS inline para animações */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes progressBar {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }

        @media (max-width: 480px) {
          .toast-container {
            left: 10px !important;
            right: 10px !important;
            maxWidth: none !important;
          }
          
          .toast {
            minWidth: auto !important;
            maxWidth: 100% !important;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

// Componente de exemplo para testar o sistema
export const ToastTester = () => {
  const { success, error, warning, info, clearAll } = useToast();

  return (
    <div style={{ 
      padding: '20px', 
      display: 'flex', 
      gap: '10px', 
      flexWrap: 'wrap',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      margin: '20px'
    }}>
      <h3 style={{ width: '100%', margin: '0 0 15px 0' }}>🧪 Teste do Sistema de Toast</h3>
      
      <button
        onClick={() => success('Operação realizada com sucesso!')}
        style={{
          padding: '8px 16px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        ✅ Sucesso
      </button>
      
      <button
        onClick={() => error('Erro ao processar a solicitação')}
        style={{
          padding: '8px 16px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        ❌ Erro
      </button>
      
      <button
        onClick={() => warning('Atenção: Esta ação não pode ser desfeita')}
        style={{
          padding: '8px 16px',
          backgroundColor: '#f0e4ef',
          color: '#212529',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        ⚠️ Aviso
      </button>
      
      <button
        onClick={() => info('Nova funcionalidade disponível!')}
        style={{
          padding: '8px 16px',
          backgroundColor: '#17a2b8',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        ℹ️ Info
      </button>
      
      <button
        onClick={clearAll}
        style={{
          padding: '8px 16px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        🗑️ Limpar Todos
      </button>
    </div>
  );
};

export default ToastProvider;