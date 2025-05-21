// App.js melhorado - Suporta múltiplos arquivos com design refinado
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
  const [files, setFiles] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [processingStage, setProcessingStage] = useState(null);
  const [currentProcessingFile, setCurrentProcessingFile] = useState(null);
  const [processedFiles, setProcessedFiles] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const textAreaRef = useRef(null);
  const fileInputRef = useRef(null);

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
    setFiles([]);
    setUploadStatus(null);
    setProcessingStage(null);
    setCurrentProcessingFile(null);
    setProcessedFiles(0);
    setTotalFiles(0);
    
    // Resetar o input de arquivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setUploadStatus(null);
    setProcessingStage(null);
    
    // Filtrar apenas arquivos PDF
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0 && selectedFiles.length > 0) {
      setError('Por favor, selecione apenas arquivos PDF válidos.');
      return;
    }
    
    // Adicionar aos arquivos existentes
    setFiles(prevFiles => [...prevFiles, ...pdfFiles]);
    setError(null);
  };

  // Função para remover um arquivo da lista
  const removeFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  // Função para limpar todos os arquivos
  const clearAllFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Por favor, selecione pelo menos um arquivo PDF válido.');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadStatus({ stage: 'iniciando', message: 'Iniciando processamento...' });
    setProcessingStage('upload');
    setTotalFiles(files.length);
    setProcessedFiles(0);

    // Processar arquivos um por um
    const allSummaries = [];
    const fileErrors = [];
    const patientNames = {}; // Para armazenar nomes de pacientes por arquivo

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentProcessingFile(file.name);
      
      try {
        const formData = new FormData();
        formData.append('pdf', file);
        
        // Atualizar status para o arquivo atual
        setUploadStatus({ 
          stage: 'enviando', 
          message: `Enviando arquivo ${i+1}/${files.length}: ${file.name}`
        });
        
        console.log(`Enviando arquivo ${file.name} para ${API_URL}/api/upload`);
        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });
        
        setProcessingStage('processing');
        setUploadStatus({ 
          stage: 'processando', 
          message: `Processando arquivo ${i+1}/${files.length}: ${file.name}`
        });
        
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
          
          throw new Error(`Erro no arquivo ${file.name}: ${errorMessage}`);
        }
        
        const data = await response.json();
        
        // Verificar se temos resultados válidos
        if (!data.summaries || data.summaries.length === 0) {
          throw new Error(`Não foi possível extrair informações do documento ${file.name}.`);
        }
        
        // Armazenar o nome do paciente para este arquivo
        if (data.patientName) {
          patientNames[file.name] = data.patientName;
        }
        
        // Adicionar informação do nome do arquivo e paciente aos resultados
        const fileSummaries = data.summaries.map(summary => ({
          ...summary,
          fileName: file.name,
          patientName: data.patientName // Incluir o nome do paciente em cada resumo
        }));
        
        // Acumular os resultados
        allSummaries.push(...fileSummaries);
        
        // Se for o primeiro arquivo processado com sucesso, usar seu nome de paciente
        // apenas para exibição na interface
        if (i === 0 && data.patientName) {
          setPatientName(data.patientName);
        }
        
        // Atualizar contador de arquivos processados
        setProcessedFiles(i + 1);
        
      } catch (error) {
        console.error(`Erro ao processar o arquivo ${file.name}:`, error);
        fileErrors.push({ fileName: file.name, error: error.message });
        // Continuar para o próximo arquivo, mas registrar o erro
      }
    }
    
    // Definir o processamento como concluído
    setProcessingStage('complete');
    
    if (allSummaries.length > 0) {
      setSummaries(allSummaries);
      
      if (fileErrors.length > 0) {
        // Alguns arquivos foram processados com sucesso, mas outros falharam
        setUploadStatus({ 
          stage: 'aviso', 
          message: `Processados ${allSummaries.length} resultados de ${files.length - fileErrors.length}/${files.length} arquivos.`
        });
        
        // Definir mensagens de erro para os arquivos que falharam
        const errorMessage = fileErrors.map(err => `${err.fileName}: ${err.error}`).join('\n');
        setError(`Alguns arquivos não puderam ser processados:\n${errorMessage}`);
      } else {
        // Todos os arquivos foram processados com sucesso
        setUploadStatus({ 
          stage: 'sucesso', 
          message: `Processamento concluído: ${allSummaries.length} resultados de ${files.length} arquivos.`
        });
        setError(null);
      }
    } else {
      // Nenhum arquivo foi processado com sucesso
      setUploadStatus({ 
        stage: 'erro', 
        message: 'Nenhum resultado foi extraído dos arquivos.'
      });
      
      // Definir mensagens de erro para todos os arquivos
      const errorMessage = fileErrors.map(err => `${err.fileName}: ${err.error}`).join('\n');
      setError(`Falha ao processar todos os arquivos:\n${errorMessage}`);
    }
    
    setLoading(false);
    setCurrentProcessingFile(null);
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
        // Filtrar linhas que começam com SÉRIE, HEMOGRAMA, EXAMES ou Paciente:
        if (line.trim() && 
            !line.match(/^SÉRIE|^HEMOGRAMA|^EXAMES/i) && 
            !line.match(/^Paciente:/i)) {
          // Adicionar o nome do arquivo como prefixo se houver múltiplos arquivos
          if (files.length > 1 && summary.fileName) {
            allExams.push(`[${summary.fileName}] ${line.trim()}`);
          } else {
            allExams.push(line.trim());
          }
        }
      });
    });
    
    // Remover duplicatas
    allExams = [...new Set(allExams)];
    
    return allExams;
  };

  // Gerar texto formatado simplificado para cópia
  const getSimplifiedTextForCopy = () => {
    if (summaries.length === 0) return '';
    
    // Agrupar resultados por arquivo
    const resultsByFile = {};
    
    // Primeiro, vamos agrupar os resultados por arquivo
    summaries.forEach((summary) => {
      const fileName = summary.fileName || 'arquivo_desconhecido';
      
      if (!resultsByFile[fileName]) {
        resultsByFile[fileName] = {
          patientName: summary.patientName || patientName || "Paciente",
          results: []
        };
      }
      
      // Adicionar linhas de resultado deste arquivo
      const lines = summary.content.split('\n');
      lines.forEach((line) => {
        // Ignorar linhas vazias, cabeçalhos padrão e linhas com "Paciente:"
        if (line.trim() && 
            !line.match(/^SÉRIE|^HEMOGRAMA|^EXAMES/i) && 
            !line.match(/^Paciente:/i)) {
          resultsByFile[fileName].results.push(line.trim());
        }
      });
    });
    
    // Para fins de diagnóstico
    console.log("Arquivos e pacientes:", resultsByFile);
    
    // Montar o texto final com separadores entre arquivos
    let formattedText = '';
    let isFirstFile = true;
    
    Object.keys(resultsByFile).forEach((fileName) => {
      // Não adicionar separador antes do primeiro arquivo
      if (!isFirstFile) {
        formattedText += '\n\n///////////////////////////////////////\n\n';
      } else {
        isFirstFile = false;
      }
      
      // Adicionar o nome do paciente deste arquivo (se disponível)
      const fileData = resultsByFile[fileName];
      if (fileData.patientName) {
        formattedText += `PACIENTE: ${fileData.patientName}\n\n`;
      }
      
      // Adicionar resultados deste arquivo (removendo duplicações)
      const uniqueResults = [...new Set(fileData.results)];
      uniqueResults.forEach(result => {
        formattedText += `${result}\n`;
      });
    });
    
    return formattedText;
  };

  // Função para copiar texto para a área de transferência
  const copyToClipboard = () => {
    if (textAreaRef.current) {
      textAreaRef.current.select();
      document.execCommand('copy');
      
      // Mostrar uma mensagem de sucesso temporária
      const originalText = textAreaRef.current.value;
      textAreaRef.current.value = '✓ Resultados copiados com sucesso!';
      
      setTimeout(() => {
        textAreaRef.current.value = originalText;
      }, 1500);
    }
  };

  // Calcular o progresso total do processamento
  const calculateProgress = () => {
    if (totalFiles === 0) return 0;
    return Math.round((processedFiles / totalFiles) * 100);
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
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="application/pdf"
                multiple
              />
              <label htmlFor="pdf-upload" className="file-label">
                {files.length > 0 
                  ? `${files.length} arquivo(s) selecionado(s)` 
                  : 'Escolher arquivos PDF de exames'}
              </label>
            </div>
            
            {/* Lista de arquivos selecionados */}
            {files.length > 0 && (
              <div className="selected-files-container">
                <h3>Arquivos Selecionados</h3>
                <div className="files-actions">
                  <button 
                    type="button" 
                    className="clear-files-button" 
                    onClick={clearAllFiles}
                  >
                    Remover Todos
                  </button>
                </div>
                <ul className="selected-files-list">
                  {files.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="file-item">
                      <span className="file-name">
                        <i className="pdf-icon">📄</i> {file.name} 
                        <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                      </span>
                      <button 
                        type="button" 
                        className="remove-file-button" 
                        onClick={() => removeFile(index)}
                        aria-label={`Remover ${file.name}`}
                      >
                        ✖
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <button 
              type="submit" 
              className="upload-button"
              disabled={files.length === 0 || apiStatus?.status !== 'online' || processingStage === 'upload' || processingStage === 'processing'}
            >
              {processingStage === 'upload' || processingStage === 'processing' ? 
                'Processando...' : 'Extrair Resultados'}
            </button>
          </form>
          
          {/* Indicador de progresso com barra de progresso visual */}
          {(processingStage === 'upload' || processingStage === 'processing') && (
            <div className="progress-bar-container">
              <div className={`progress-bar ${processingStage}`}>
                <div 
                  className="progress-indicator" 
                  style={{
                    width: `${calculateProgress()}%`,
                    animation: 'none'
                  }}
                ></div>
              </div>
              <div className="progress-status">
                {currentProcessingFile ? 
                  `${processingStage === 'upload' ? 'Enviando' : 'Processando'}: ${currentProcessingFile} (${processedFiles}/${totalFiles})` :
                  processingStage === 'upload' ? 'Enviando arquivo...' : 'Processando documento...'}
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
                <li>Verifique se os PDFs não estão protegidos por senha</li>
                <li>Tente salvar os PDFs novamente usando "Salvar como" no Adobe Reader</li>
                <li>Se possível, tente imprimir os documentos para novos PDFs</li>
                <li>Entre em contato com o laboratório para obter versões digitais alternativas</li>
                <li>Se o problema persistir, use uma ferramenta online para converter os PDFs para outro formato</li>
              </ul>
            </div>
          )}
          
          {/* Aviso quando o documento foi processado com ajustes */}
          {uploadStatus && uploadStatus.stage === 'aviso' && (
            <div className="processing-notice">
              <p>Os documentos foram processados com sucesso, mas podem conter algumas imprecisões devido ao formato dos arquivos originais.</p>
              <p>Verifique cuidadosamente os resultados extraídos antes de usá-los.</p>
            </div>
          )}
        </div>

        {loading && !processingStage && <p className="loading">Processando os documentos, por favor aguarde...</p>}
        {error && !uploadStatus && <p className="error">Erro: {error}</p>}
        
        {/* Mensagens de erro específicas para cada arquivo */}
        {error && uploadStatus && (
          <div className="file-errors">
            <details>
              <summary>Detalhes dos erros</summary>
              <pre className="error-details">{error}</pre>
            </details>
          </div>
        )}
        
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
              <h2>RESULTADOS</h2>
              {summaries.length > 0 && (
                <div className="summary-info">
                  <span className="file-count">{summaries.length} resultados extraídos</span>
                  {files.length > 1 && (
                    <span className="multi-file-notice">Exibindo dados de {files.length} arquivos</span>
                  )}
                </div>
              )}
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