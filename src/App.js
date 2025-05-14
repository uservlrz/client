// App.js modificado - Removendo visualização em cards
import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import ErrorHandler from './components/ErrorHandler';

// Função para determinar a URL da API baseada no ambiente
function getApiUrl() {
  // Em desenvolvimento (local), usa localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  
  // Em produção, usa o domínio do Vercel para o backend
  return 'https://server-theta-murex.vercel.app';
}

// URL da API - detecta automaticamente ambiente local ou produção
const API_URL = getApiUrl();

function App() {
  const [file, setFile] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null); // Novo: para mostrar estágios do upload
  const [processingStage, setProcessingStage] = useState(null); // Novo: para acompanhar o estágio de processamento
  const textAreaRef = useRef(null);

  // Verificar status da API ao carregar
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/health`);
        if (response.ok) {
          const data = await response.json();
          setApiStatus({
            status: 'online',
            env: data.env,
            url: API_URL
          });
          console.log(`API conectada: ${API_URL} (${data.env})`);
        } else {
          setApiStatus({
            status: 'error',
            message: `Erro ao conectar com a API: ${response.status}`,
            url: API_URL
          });
        }
      } catch (error) {
        setApiStatus({
          status: 'offline',
          message: 'Não foi possível conectar ao servidor',
          error: error.message,
          url: API_URL
        });
        console.error('Erro ao verificar status da API:', error);
      }
    };

    checkApiStatus();
  }, []);

  // Função para tentar reconectar com a API
  const retryApiConnection = () => {
    setApiStatus({
      status: 'checking',
      message: 'Verificando conexão...',
      url: API_URL
    });
    
    setTimeout(() => {
      checkApiStatus();
    }, 1000);
  };
  
  // Função para verificar status da API
  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      if (response.ok) {
        const data = await response.json();
        setApiStatus({
          status: 'online',
          env: data.env,
          url: API_URL
        });
        setError(null);
      } else {
        setApiStatus({
          status: 'error',
          message: `Erro ao conectar com a API: ${response.status}`,
          url: API_URL
        });
        setError(`Erro ao conectar com o servidor: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setApiStatus({
        status: 'offline',
        message: 'Não foi possível conectar ao servidor',
        error: error.message,
        url: API_URL
      });
      setError(`Falha de conexão com o servidor: ${error.message}`);
    }
  };

  // Função para limpar os resultados e resetar o estado
  const handleReset = () => {
    setSummaries([]);
    setPatientName('');
    setError(null);
    setFile(null);
    setUploadStatus(null);
    setProcessingStage(null);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setUploadStatus(null); // Limpar status anterior
    setProcessingStage(null);
    
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError('Por favor, selecione um arquivo PDF válido.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor, selecione um arquivo PDF válido.');
      return;
    }

    const formData = new FormData();
    formData.append('pdf', file);

    setLoading(true);
    setError(null);
    setUploadStatus({ stage: 'iniciando', message: 'Iniciando processamento...' });
    setProcessingStage('upload');

    try {
      // Informar progresso
      setUploadStatus({ stage: 'enviando', message: 'Enviando arquivo para o servidor...' });
      
      console.log(`Enviando arquivo para ${API_URL}/api/upload`);
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      
      setProcessingStage('processing');
      setUploadStatus({ stage: 'processando', message: 'Processando documento PDF...' });
      
      if (!response.ok) {
        let errorMessage = `Erro ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (jsonError) {
          // Continuar com a mensagem de erro padrão se não puder ler JSON
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Verificar se temos resultados válidos
      if (!data.summaries || data.summaries.length === 0) {
        throw new Error('Não foi possível extrair informações deste documento.');
      }
      
      // Verificar qual método de extração foi usado para decidir a mensagem de status
      setProcessingStage('complete');
      if (data.extractionMethod === 'falha') {
        setUploadStatus({ 
          stage: 'erro', 
          message: 'Não foi possível processar este PDF. Tente outro formato.'
        });
      } else if (['reparado', 'gs_reparado', 'desprotegido', 'partes'].includes(data.extractionMethod)) {
        setUploadStatus({ 
          stage: 'aviso', 
          message: `Documento processado com ajustes (${getMethodDescription(data.extractionMethod)}).`
        });
      } else {
        setUploadStatus({ 
          stage: 'sucesso', 
          message: 'Documento processado com sucesso!'
        });
      }
      
      setSummaries(data.summaries);
      
      // Definir o nome do paciente extraído automaticamente
      if (data.patientName) {
        setPatientName(data.patientName);
      }
    } catch (error) {
      console.error('Erro ao enviar o arquivo:', error);
      setProcessingStage('error');
      setUploadStatus({ 
        stage: 'erro', 
        message: 'Falha no processamento do documento.'
      });
      
      setError(error.message || 'Erro ao processar o documento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para obter descrição amigável do método de extração
  const getMethodDescription = (method) => {
    const descriptions = {
      'direto': 'processamento direto',
      'desprotegido': 'remoção de proteção',
      'reparado': 'reparo de estrutura',
      'gs_reparado': 'reparo avançado',
      'partes': 'processamento em partes',
      'falha': 'falha no processamento'
    };
    
    return descriptions[method] || method;
  };

  // Função para extrair apenas os exames sem seções ou formatação extra
  const extractOnlyExams = () => {
    let allExams = [];
    
    summaries.forEach((summary) => {
      const lines = summary.content.split('\n');
      
      lines.forEach((line) => {
        if (line.trim() && !line.match(/^SÉRIE|^HEMOGRAMA|^EXAMES/i)) {
          allExams.push(line.trim());
        }
      });
    });
    
    // Remover duplicatas
    allExams = [...new Set(allExams)];
    
    return allExams;
  };

  // Gerar texto formatado simplificado para cópia
  const getSimplifiedTextForCopy = () => {
    // Nome do paciente no topo
    let formattedText = patientName ? `PACIENTE: ${patientName}\n\n` : '';
    
    // Adicionar cada exame em uma linha
    const exams = extractOnlyExams();
    exams.forEach(exam => {
      formattedText += `${exam}\n`;
    });
    
    return formattedText;
  };

  // Função para copiar texto para a área de transferência
  const copyToClipboard = () => {
    if (textAreaRef.current) {
      textAreaRef.current.select();
      document.execCommand('copy');
      // Mostrar uma mensagem de sucesso
      alert('Resultados copiados para a área de transferência!');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="institute-logo">
          <span className="logo-text">Instituto Paulo Godoi</span>
        </div>
        <h1>Extrator de Resultados de Exames</h1>
        <p className="subtitle">Sistema interno para processamento de laudos laboratoriais</p>
        
        {/* Indicador de status da API */}
        {apiStatus && (
          <div className={`api-status ${apiStatus.status}`}>
            <span className="status-indicator"></span>
            {apiStatus.status === 'online' ? (
              <span>API conectada ({apiStatus.env})</span>
            ) : apiStatus.status === 'checking' ? (
              <span>Verificando conexão...</span>
            ) : (
              <span>Erro de conexão: {apiStatus.message} 
                <button className="retry-button" onClick={retryApiConnection}>
                  Reconectar
                </button>
              </span>
            )}
          </div>
        )}
      </header>
      <main>
        {/* Mostrar o manipulador de erros para erros de API */}
        {(apiStatus?.status === 'offline' || apiStatus?.status === 'error') && (
          <ErrorHandler 
            error={`Não foi possível conectar ao servidor. ${apiStatus.message}`}
            onRetry={retryApiConnection}
          />
        )}
        
        <div className="uploader-container">
          <form onSubmit={handleSubmit}>
            <div className="file-input-container">
              <input
                type="file"
                id="pdf-upload"
                onChange={handleFileChange}
                accept="application/pdf"
              />
              <label htmlFor="pdf-upload" className="file-label">
                {file ? file.name : 'Escolher arquivo PDF de exames'}
              </label>
            </div>
            <button 
              type="submit" 
              className="upload-button"
              disabled={!file || apiStatus?.status !== 'online' || processingStage === 'upload' || processingStage === 'processing'}
            >
              {processingStage === 'upload' || processingStage === 'processing' ? 
                'Processando...' : 'Extrair Resultados'}
            </button>
          </form>
          
          {/* Indicador de progresso */}
          {(processingStage === 'upload' || processingStage === 'processing') && (
            <div className="progress-bar-container">
              <div className={`progress-bar ${processingStage}`}>
                <div className="progress-indicator"></div>
              </div>
              <div className="progress-status">
                {processingStage === 'upload' ? 'Enviando arquivo...' : 'Processando documento...'}
              </div>
            </div>
          )}
          
          {/* Status de upload */}
          {uploadStatus && (
            <div className={`upload-status ${uploadStatus.stage}`}>
              <span className="status-icon">
                {uploadStatus.stage === 'sucesso' ? '✓' : 
                uploadStatus.stage === 'erro' ? '✗' : 
                uploadStatus.stage === 'aviso' ? '⚠️' : '⟳'}
              </span>
              <span className="status-message">{uploadStatus.message}</span>
            </div>
          )}
          
          {/* Dicas para PDFs problemáticos */}
          {uploadStatus && uploadStatus.stage === 'erro' && (
            <div className="pdf-tips">
              <h4>Possíveis soluções:</h4>
              <ul>
                <li>Verifique se o PDF não está protegido por senha</li>
                <li>Tente salvar o PDF novamente usando "Salvar como" no Adobe Reader</li>
                <li>Se possível, tente imprimir o documento para um novo PDF</li>
                <li>Entre em contato com o laboratório para obter uma versão digital alternativa</li>
                <li>Se o problema persistir, use uma ferramenta online para converter o PDF para outro formato</li>
              </ul>
            </div>
          )}
          
          {/* Aviso quando o documento foi processado com ajustes */}
          {uploadStatus && uploadStatus.stage === 'aviso' && (
            <div className="processing-notice">
              <p>O documento foi processado com sucesso, mas pode conter algumas imprecisões devido ao formato do arquivo original.</p>
              <p>Verifique cuidadosamente os resultados extraídos antes de usá-los.</p>
            </div>
          )}
        </div>

        {loading && !processingStage && <p className="loading">Processando o documento, por favor aguarde...</p>}
        {error && !uploadStatus && <p className="error">Erro: {error}</p>}
        
        {/* Botão para resetar (somente se tiver resultados) */}
        {summaries.length > 0 && (
          <div className="reset-button-container">
            <button 
              className="reset-button"
              onClick={handleReset}
            >
              Novo Documento
            </button>
          </div>
        )}

        <div className="summary-container">
          {summaries.length === 0 ? (
            <p className="empty-message">Os resultados dos exames aparecerão aqui.</p>
          ) : (
            <div className="text-view-container">
              <h2>Resultados - {patientName}</h2>
              <p className="copy-instructions">Lista de resultados para copiar e colar:</p>
              <div className="text-area-container">
                <textarea
                  ref={textAreaRef}
                  className="results-text-area"
                  value={getSimplifiedTextForCopy()}
                  readOnly
                />
                <button onClick={copyToClipboard} className="copy-button">
                  <i className="copy-icon">📋</i> Copiar para Área de Transferência
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <footer>
        <p>© 2025 - Instituto Paulo Godoi - Sistema de Processamento de Exames</p>
        <p className="api-info">Ambiente: {apiStatus?.env || 'Desconectado'} | API: {API_URL}</p>
      </footer>
    </div>
  );
}

export default App;