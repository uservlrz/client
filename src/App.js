// App.js - Versão Limpa e Otimizada
import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import ErrorHandler from './components/ErrorHandler';

// Configuração da API
const getApiUrl = () => {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:5000' : 'https://server-theta-murex.vercel.app';
};

const API_URL = getApiUrl();

// Utilitários
const isMobileDevice = () => window.innerWidth <= 768 || 'ontouchstart' in window;

const vibrate = (pattern) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

const scrollToElement = (selector, behavior = 'smooth') => {
  const element = document.querySelector(selector);
  if (element) {
    element.scrollIntoView({ behavior, block: 'center' });
  }
};

function App() {
  // Estados principais
  const [files, setFiles] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados de processamento
  const [apiStatus, setApiStatus] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [processingStage, setProcessingStage] = useState(null);
  const [currentProcessingFile, setCurrentProcessingFile] = useState(null);
  const [processedFiles, setProcessedFiles] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  
  // Estados de UI
  const [dragOver, setDragOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Refs
  const textAreaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Detectar dispositivo móvel
  useEffect(() => {
    const checkMobile = () => setIsMobile(isMobileDevice());
    checkMobile();
    
    const handleResize = () => checkMobile();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Verificar status da API
  useEffect(() => {
    const checkApiStatus = async () => {
      setApiStatus({ status: 'checking', message: 'Verificando conexão...' });
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${API_URL}/api/health`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          setApiStatus({ status: 'online', env: data.env });
        } else {
          setApiStatus({ status: 'error', message: `Erro ${response.status}` });
        }
      } catch (error) {
        const message = error.name === 'AbortError' ? 'Timeout' : 'Servidor indisponível';
        setApiStatus({ status: 'offline', message, error: error.message });
      }
    };

    checkApiStatus();
  }, []);

  // Função para reconectar
  const retryConnection = useCallback(() => {
    setApiStatus({ status: 'checking', message: 'Reconectando...' });
    setTimeout(async () => {
      try {
        const response = await fetch(`${API_URL}/api/health`);
        if (response.ok) {
          const data = await response.json();
          setApiStatus({ status: 'online', env: data.env });
          setError(null);
        } else {
          setApiStatus({ status: 'error', message: `Erro ${response.status}` });
        }
      } catch (error) {
        setApiStatus({ status: 'offline', message: 'Servidor indisponível' });
      }
    }, 1000);
  }, []);

  // Resetar estado
  const resetState = useCallback(() => {
    setSummaries([]);
    setPatientName('');
    setError(null);
    setFiles([]);
    setUploadStatus(null);
    setProcessingStage(null);
    setCurrentProcessingFile(null);
    setProcessedFiles(0);
    setTotalFiles(0);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    vibrate(30);
  }, [isMobile]);

  // Gerenciar erro temporário
  const showTempError = useCallback((message, duration = 3000) => {
    setError(message);
    setTimeout(() => setError(null), duration);
  }, []);

  // Handlers de drag and drop
  const handleDragOver = useCallback((e) => {
    if (isMobile) return;
    e.preventDefault();
    setDragOver(true);
  }, [isMobile]);

  const handleDragLeave = useCallback((e) => {
    if (isMobile) return;
    e.preventDefault();
    setDragOver(false);
  }, [isMobile]);

  const handleDrop = useCallback((e) => {
    if (isMobile) return;
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0 && droppedFiles.length > 0) {
      showTempError('Por favor, solte apenas arquivos PDF válidos.');
      return;
    }
    
    setFiles(prev => [...prev, ...pdfFiles]);
    setError(null);
    setUploadStatus(null);
    vibrate(50);
  }, [isMobile, showTempError]);

  // Handler de seleção de arquivos
  const handleFileChange = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0 && selectedFiles.length > 0) {
      showTempError('Por favor, selecione apenas arquivos PDF válidos.');
      return;
    }
    
    setFiles(prev => [...prev, ...pdfFiles]);
    setError(null);
    setUploadStatus(null);
    vibrate(50);
  }, [showTempError]);

  // Remover arquivo específico
  const removeFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    vibrate(30);
  }, []);

  // Limpar todos os arquivos
  const clearAllFiles = useCallback(() => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    vibrate([30, 50, 30]);
  }, []);

  // Função principal de upload
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (files.length === 0) {
      showTempError('Por favor, selecione pelo menos um arquivo PDF válido.');
      return;
    }

    // Configurar estado inicial
    setLoading(true);
    setError(null);
    setProcessingStage('upload');
    setTotalFiles(files.length);
    setProcessedFiles(0);
    
    setUploadStatus({
      stage: 'iniciando',
      message: 'Iniciando processamento...',
      timestamp: new Date().toLocaleTimeString()
    });

    // Scroll para progresso em mobile
    if (isMobile) {
      setTimeout(() => scrollToElement('.progress-bar-container'), 500);
    }

    // Configurar wake lock para mobile
    let wakeLock = null;
    if (isMobile && 'wakeLock' in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.log('Wake Lock não disponível:', err);
      }
    }

    const allSummaries = [];
    const fileErrors = [];

    // Processar cada arquivo
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileNumber = i + 1;
      setCurrentProcessingFile(file.name);
      
      try {
        // Preparar dados
        const formData = new FormData();
        formData.append('pdf', file);
        
        const shortName = file.name.length > (isMobile ? 20 : 30) 
          ? file.name.substring(0, isMobile ? 20 : 30) + '...' 
          : file.name;

        // Upload
        setUploadStatus({
          stage: 'enviando',
          message: `Enviando ${fileNumber}/${files.length}: ${shortName}`,
          timestamp: new Date().toLocaleTimeString()
        });
        
        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });
        
        // Processamento
        setProcessingStage('processing');
        setUploadStatus({
          stage: 'processando',
          message: `Processando ${fileNumber}/${files.length}: Extraindo dados...`,
          timestamp: new Date().toLocaleTimeString()
        });
        
        if (!response.ok) {
          let errorMessage = `Erro ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData.message) errorMessage = errorData.message;
          } catch (jsonError) {
            // Usar mensagem padrão
          }
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        if (!data.summaries || data.summaries.length === 0) {
          throw new Error('Não foi possível extrair informações do documento.');
        }
        
        // Processar resultados
        const fileSummaries = data.summaries.map(summary => ({
          ...summary,
          fileName: file.name,
          patientName: data.patientName,
          processedAt: new Date().toLocaleTimeString()
        }));
        
        allSummaries.push(...fileSummaries);
        
        if (i === 0 && data.patientName) {
          setPatientName(data.patientName);
        }
        
        setProcessedFiles(i + 1);
        vibrate(20);
        
      } catch (error) {
        console.error(`Erro ao processar ${file.name}:`, error);
        fileErrors.push({
          fileName: file.name,
          error: error.message,
          timestamp: new Date().toLocaleTimeString()
        });
        vibrate([100, 50, 100]);
      }
    }
    
    // Finalizar processamento
    setProcessingStage('complete');
    
    if (wakeLock) {
      wakeLock.release();
    }
    
    // Processar resultados finais
    if (allSummaries.length > 0) {
      setSummaries(allSummaries);
      
      if (fileErrors.length > 0) {
        setUploadStatus({
          stage: 'aviso',
          message: `Processados ${allSummaries.length} resultados de ${files.length - fileErrors.length}/${files.length} arquivos.`,
          details: `Concluído às ${new Date().toLocaleTimeString()}`,
          timestamp: new Date().toLocaleTimeString()
        });
        
        const errorMessage = fileErrors
          .map(err => `${err.fileName}: ${err.error}`)
          .join('\n');
        setError(`Alguns arquivos falharam:\n\n${errorMessage}`);
      } else {
        setUploadStatus({
          stage: 'sucesso',
          message: `Processamento concluído! ${allSummaries.length} resultados de ${files.length} arquivos.`,
          details: `Finalizado às ${new Date().toLocaleTimeString()}`,
          timestamp: new Date().toLocaleTimeString()
        });
        
        vibrate([200, 100, 200]);
        
        // Scroll para resultados
        if (isMobile) {
          setTimeout(() => scrollToElement('.text-view-container'), 1000);
        }
      }
    } else {
      setUploadStatus({
        stage: 'erro',
        message: 'Nenhum resultado foi extraído dos arquivos.',
        details: `Falha às ${new Date().toLocaleTimeString()}`,
        timestamp: new Date().toLocaleTimeString()
      });
      
      const errorMessage = fileErrors
        .map(err => `${err.fileName}: ${err.error}`)
        .join('\n');
      setError(`Falha em todos os arquivos:\n\n${errorMessage}`);
      
      vibrate([300, 100, 300, 100, 300]);
    }
    
    setLoading(false);
    setCurrentProcessingFile(null);
  };

  // Gerar texto para cópia
  const getFormattedText = useCallback(() => {
    if (summaries.length === 0) return '';
    
    const resultsByFile = {};
    
    summaries.forEach((summary) => {
      const fileName = summary.fileName || 'arquivo_desconhecido';
      
      if (!resultsByFile[fileName]) {
        resultsByFile[fileName] = {
          patientName: summary.patientName || patientName || "Paciente",
          results: [],
          processedAt: summary.processedAt
        };
      }
      
      const lines = summary.content.split('\n');
      lines.forEach((line) => {
        if (line.trim() && 
            !line.match(/^SÉRIE|^HEMOGRAMA|^EXAMES/i) && 
            !line.match(/^Paciente:/i)) {
          resultsByFile[fileName].results.push(line.trim());
        }
      });
    });
    
    let formattedText = '';
    let isFirstFile = true;
    
    Object.keys(resultsByFile).forEach((fileName) => {
      if (!isFirstFile) {
        formattedText += '\n\n═══════════════════════════════════════\n\n';
      } else {
        isFirstFile = false;
      }
      
      const fileData = resultsByFile[fileName];
      if (fileData.patientName) {
        formattedText += `PACIENTE: ${fileData.patientName}\n`;
        if (fileData.processedAt) {
          formattedText += `Processado às: ${fileData.processedAt}\n`;
        }
        formattedText += '\n';
      }
      
      const uniqueResults = [...new Set(fileData.results)];
      uniqueResults.forEach(result => {
        formattedText += `${result}\n`;
      });
    });
    
    return formattedText;
  }, [summaries, patientName]);

  // Copiar para clipboard
  const copyToClipboard = useCallback(async () => {
    if (!textAreaRef.current) return;
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textAreaRef.current.value);
      } else {
        textAreaRef.current.select();
        textAreaRef.current.setSelectionRange(0, 99999);
        document.execCommand('copy');
      }
      
      // Feedback visual
      const originalText = textAreaRef.current.value;
      textAreaRef.current.value = 'Resultados copiados com sucesso!';
      textAreaRef.current.style.background = '#f0fdf4';
      textAreaRef.current.style.color = '#166534';
      
      vibrate([50, 30, 50]);
      
      setTimeout(() => {
        textAreaRef.current.value = originalText;
        textAreaRef.current.style.background = '';
        textAreaRef.current.style.color = '';
      }, 2000);
      
    } catch (err) {
      console.error('Erro ao copiar:', err);
      
      const originalText = textAreaRef.current.value;
      textAreaRef.current.value = 'Erro ao copiar. Tente selecionar manualmente.';
      textAreaRef.current.style.background = '#fef2f2';
      textAreaRef.current.style.color = '#dc2626';
      
      vibrate([100, 50, 100]);
      
      setTimeout(() => {
        textAreaRef.current.value = originalText;
        textAreaRef.current.style.background = '';
        textAreaRef.current.style.color = '';
      }, 3000);
    }
  }, []);

  // Calcular progresso
  const getProgress = useCallback(() => {
    return totalFiles === 0 ? 0 : Math.round((processedFiles / totalFiles) * 100);
  }, [processedFiles, totalFiles]);

  // Truncar nome do arquivo
  const truncateFileName = useCallback((fileName) => {
    const maxLength = isMobile ? 25 : 40;
    return fileName.length > maxLength 
      ? fileName.substring(0, maxLength) + '...' 
      : fileName;
  }, [isMobile]);

  return (
    <div className="App">
      <header className="App-header">
        <div className="institute-logo">
          <span className="logo-text">Instituto Paulo Godoi</span>
        </div>
        <h1>Extrator de Resultados de Exames</h1>
        <p className="subtitle">
          {isMobile 
            ? 'Sistema para processamento de laudos' 
            : 'Sistema interno para processamento de laudos laboratoriais'
          }
        </p>
        
        {apiStatus && (
          <div className={`api-status ${apiStatus.status}`}>
            <span className="status-indicator"></span>
            {apiStatus.status === 'online' ? (
              <span>{isMobile ? 'Online' : `Conectado (${apiStatus.env})`}</span>
            ) : apiStatus.status === 'checking' ? (
              <span>Verificando...</span>
            ) : (
              <span>
                {isMobile ? 'Offline' : apiStatus.message}
                <button className="retry-button" onClick={retryConnection}>
                  {isMobile ? 'Reconectar' : 'Tentar novamente'}
                </button>
              </span>
            )}
          </div>
        )}
      </header>
      
      <main>
        {(apiStatus?.status === 'offline' || apiStatus?.status === 'error') && (
          <ErrorHandler 
            error={`Não foi possível conectar ao servidor. ${apiStatus.message}`}
            onRetry={retryConnection}
          />
        )}
        
        <div 
          className={`uploader-container ${dragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
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
              <label htmlFor="pdf-upload" className={`file-label ${dragOver ? 'drag-active' : ''}`}>
                {dragOver ? (
                  'Solte os arquivos PDF aqui'
                ) : files.length > 0 ? (
                  `${files.length} arquivo(s) selecionado(s)`
                ) : isMobile ? (
                  'Tocar para selecionar PDFs'
                ) : (
                  'Escolher arquivos PDF ou arrastar aqui'
                )}
              </label>
            </div>
            
            {files.length > 0 && (
              <div className="selected-files-container">
                <h3>Arquivos Selecionados</h3>
                <div className="files-actions">
                  <button 
                    type="button" 
                    className="clear-files-button" 
                    onClick={clearAllFiles}
                    disabled={loading}
                  >
                    {isMobile ? 'Limpar' : 'Remover todos'}
                  </button>
                </div>
                <ul className="selected-files-list">
                  {files.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="file-item">
                      <span className="file-name">
                        <span className="pdf-icon">📄</span>
                        {truncateFileName(file.name)}
                        <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                      </span>
                      <button 
                        type="button" 
                        className="remove-file-button" 
                        onClick={() => removeFile(index)}
                        disabled={loading}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <button 
              type="submit" 
              className={`upload-button ${loading ? 'loading' : ''}`}
              disabled={files.length === 0 || apiStatus?.status !== 'online' || loading}
            >
              {loading ? 'Processando...' : 'Extrair Resultados'}
            </button>
          </form>
          
          {(processingStage === 'upload' || processingStage === 'processing') && (
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-indicator" 
                  style={{ width: `${getProgress()}%` }}
                />
              </div>
              <div className="progress-status">
                {currentProcessingFile ? (
                  `${processingStage === 'upload' ? 'Enviando' : 'Processando'}: ${
                    truncateFileName(currentProcessingFile)
                  } (${processedFiles + 1}/${totalFiles})`
                ) : (
                  processingStage === 'upload' ? 'Enviando arquivo...' : 'Processando documento...'
                )}
              </div>
            </div>
          )}
          
          {uploadStatus && (
            <div className={`upload-status ${uploadStatus.stage}`}>
              <span className="status-icon">
                {uploadStatus.stage === 'sucesso' ? '✓' : 
                 uploadStatus.stage === 'erro' ? '✗' : 
                 uploadStatus.stage === 'aviso' ? '!' : '⟳'}
              </span>
              <div className="status-content">
                <div className="status-message">{uploadStatus.message}</div>
                {uploadStatus.details && !isMobile && (
                  <div className="status-details">{uploadStatus.details}</div>
                )}
                {uploadStatus.timestamp && !isMobile && (
                  <div className="status-timestamp">{uploadStatus.timestamp}</div>
                )}
              </div>
            </div>
          )}
          
          {uploadStatus?.stage === 'erro' && (
            <div className="pdf-tips">
              <h4>Possíveis soluções:</h4>
              <ul>
                <li>Verifique se os PDFs não estão protegidos por senha</li>
                <li>Tente salvar os PDFs novamente como novos arquivos</li>
                {!isMobile && (
                  <li>Entre em contato com o laboratório para versões alternativas</li>
                )}
              </ul>
            </div>
          )}
          
          {uploadStatus?.stage === 'aviso' && (
            <div className="processing-notice">
              <p>Alguns documentos foram processados com possíveis imprecisões.</p>
              {!isMobile && <p>Verifique os resultados antes de usar.</p>}
            </div>
          )}
        </div>

        {loading && !processingStage && (
          <p className="loading">Processando documentos, aguarde...</p>
        )}
        
        {error && !uploadStatus && (
          <p className="error">{error}</p>
        )}
        
        {error && uploadStatus && (
          <div className="file-errors">
            <details>
              <summary>Detalhes dos erros</summary>
              <pre className="error-details">{error}</pre>
            </details>
          </div>
        )}
        
        {summaries.length > 0 && (
          <div className="reset-button-container">
            <button 
              className="reset-button"
              onClick={resetState}
              disabled={loading}
            >
              {isMobile ? 'Novo processamento' : 'Processar novos documentos'}
            </button>
          </div>
        )}

        <div className="summary-container">
          {summaries.length === 0 ? (
            <div className="empty-message">
              <p>Os resultados dos exames aparecerão aqui.</p>
              {!isMobile && <p>Selecione arquivos PDF para começar.</p>}
            </div>
          ) : (
            <div className="text-view-container">
              <h2>Resultados Extraídos</h2>
              <div className="summary-info">
                <span className="file-count">{summaries.length} resultados extraídos</span>
                {files.length > 1 && (
                  <span className="multi-file-notice">de {files.length} arquivos</span>
                )}
                {!isMobile && (
                  <span className="extraction-time">às {new Date().toLocaleTimeString()}</span>
                )}
              </div>
              <p className="copy-instructions">
                {isMobile ? 'Resultados para copiar:' : 'Lista de resultados pronta para copiar:'}
              </p>
              <div className="text-area-container">
                <textarea
                  ref={textAreaRef}
                  className="results-text-area"
                  value={getFormattedText()}
                  readOnly
                  placeholder="Os resultados aparecerão aqui..."
                />
                <button 
                  onClick={copyToClipboard} 
                  className="copy-button"
                  disabled={summaries.length === 0}
                >
                  {isMobile ? 'Copiar Resultados' : 'Copiar para área de transferência'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer>
        <p>© 2025 - Instituto Paulo Godoi{!isMobile && ' - Sistema de Processamento de Exames'}</p>
        <p className="api-info">
          {isMobile 
            ? `${apiStatus?.env || 'Off'} | v2.0`
            : `Ambiente: ${apiStatus?.env || 'Desconectado'} | API: ${API_URL}`
          }
        </p>
      </footer>
    </div>
  );
}

export default App;