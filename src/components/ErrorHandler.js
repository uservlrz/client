// client/src/components/ErrorHandler.js
import React from 'react';

const ErrorHandler = ({ error, onRetry }) => {
  // Se não há erro, não renderiza nada
  if (!error) return null;
  
  // Detectar tipo de erro para mostrar mensagens mais específicas
  const isPdfError = error.toLowerCase().includes('pdf') || 
                    error.toLowerCase().includes('documento') ||
                    error.toLowerCase().includes('arquivo');
  
  const isServerError = error.toLowerCase().includes('servidor') || 
                       error.toLowerCase().includes('500') ||
                       error.toLowerCase().includes('conexão');
  
  return (
    <div className="error-container">
      <div className="error-icon">
        {isPdfError ? '📄❌' : isServerError ? '🖥️❌' : '❌'}
      </div>
      
      <div className="error-content">
        <h3 className="error-title">
          {isPdfError 
            ? 'Problema com o documento PDF' 
            : isServerError 
              ? 'Erro de comunicação com o servidor' 
              : 'Erro no processamento'}
        </h3>
        
        <p className="error-message">{error}</p>
        
        {isPdfError && (
          <div className="error-help">
            <h4>Sugestões para resolver o problema:</h4>
            <ul>
              <li>Verifique se o PDF não está protegido ou criptografado</li>
              <li>Tente salvar o PDF novamente usando "Salvar como" no Adobe Reader</li>
              <li>Se possível, imprima o documento para um novo PDF</li>
              <li>Tente converter o PDF para outro formato e depois de volta para PDF</li>
            </ul>
          </div>
        )}
        
        {isServerError && (
          <div className="error-help">
            <h4>Sugestões para resolver o problema:</h4>
            <ul>
              <li>Verifique sua conexão com a internet</li>
              <li>O servidor pode estar temporariamente indisponível, tente novamente mais tarde</li>
              <li>Se o problema persistir, entre em contato com o suporte técnico</li>
            </ul>
          </div>
        )}
        
        {onRetry && (
          <button className="error-retry-button" onClick={onRetry}>
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorHandler;