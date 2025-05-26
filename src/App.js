// App.js - Versão Minimalista e Elegante com Suporte ao Vercel Blob
import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import ErrorHandler from './components/ErrorHandler';

// Função para determinar a URL da API baseada no ambiente
function getApiUrl() {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  return 'https://server-theta-murex.vercel.app';
}

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
  const [dragOver, setDragOver] = useState(false);
  const textAreaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Verificar status da API ao carregar
  useEffect(() => {
    const checkApiStatus = async () => {
      setApiStatus({ status: 'checking', message: 'Verificando conexão...', url: API_URL });
      
      try {
        const response = await fetch(`${API_URL}/api/health`);
        if (response.ok) {
          const data = await response.json();
          setApiStatus({
            status: 'online',
            env: data.env,
            blobSupport: data.blobSupport,
            limits: data.limits,
            url: API_URL
          });
        } else {
          setApiStatus({
            status: 'error',
            message: `Erro ${response.status}`,
            url: API_URL
          });
        }
      } catch (error) {
        setApiStatus({
          status: 'offline',
          message: 'Servidor indisponível',
          error: error.message,
          url: API_URL
        });
      }
    };

    checkApiStatus();
  }, []);

  // Função para reconectar com a API
  const retryApiConnection = useCallback(() => {
    setApiStatus({ status: 'checking', message: 'Reconectando...', url: API_URL });
    setTimeout(async () => {
      try {
        const response = await fetch(`${API_URL}/api/health`);
        if (response.ok) {
          const data = await response.json();
          setApiStatus({ 
            status: 'online', 
            env: data.env, 
            blobSupport: data.blobSupport,
            limits: data.limits,
            url: API_URL 
          });
          setError(null);
        } else {
          setApiStatus({ status: 'error', message: `Erro ${response.status}`, url: API_URL });
        }
      } catch (error) {
        setApiStatus({ status: 'offline', message: 'Servidor indisponível', url: API_URL });
      }
    }, 1000);
  }, []);

  // Função para resetar o estado
  const handleReset = useCallback(() => {
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
  }, []);

  // Handlers para drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0 && droppedFiles.length > 0) {
      setError('Por favor, solte apenas arquivos PDF válidos.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setFiles(prevFiles => [...prevFiles, ...pdfFiles]);
    setError(null);
    setUploadStatus(null);
    setProcessingStage(null);
  }, []);

  const handleFileChange = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    setUploadStatus(null);
    setProcessingStage(null);
    
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0 && selectedFiles.length > 0) {
      setError('Por favor, selecione apenas arquivos PDF válidos.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setFiles(prevFiles => [...prevFiles, ...pdfFiles]);
    setError(null);
  }, []);

  // Função para remover arquivo
  const removeFile = useCallback((index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  }, []);

  // Função para limpar todos os arquivos
  const clearAllFiles = useCallback(() => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // NOVA FUNÇÃO: Converter arquivo para base64
  const fileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // Remove o prefixo data:...
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }, []);

  // NOVA FUNÇÃO: Upload para arquivos grandes via Vercel Blob
  const uploadLargeFile = useCallback(async (file) => {
    try {
      const MAX_SIZE = 100 * 1024 * 1024; // 100MB
      
      if (file.size > MAX_SIZE) {
        throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo: 100MB`);
      }
      
      setUploadStatus({ 
        stage: 'convertendo', 
        message: 'Preparando arquivo grande...',
        timestamp: new Date().toLocaleTimeString()
      });
      
      // Converter arquivo para base64
      const base64Data = await fileToBase64(file);
      
      setUploadStatus({ 
        stage: 'enviando', 
        message: 'Enviando arquivo grande via Blob...',
        timestamp: new Date().toLocaleTimeString()
      });
      
      // Enviar para rota especial de arquivos grandes
      const response = await fetch(`${API_URL}/api/upload-large`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          fileData: base64Data
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Erro no upload de arquivo grande:', error);
      throw error;
    }
  }, [fileToBase64]);

  // NOVA FUNÇÃO: Upload para arquivos pequenos (método original)
  const uploadSmallFile = useCallback(async (file) => {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        let errorMessage = `Erro ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
          
          // Se o erro for 413 e sugerir upload large, tentar automaticamente
          if (response.status === 413 && errorData.shouldUseLargeUpload) {
            console.log('Arquivo muito grande para upload direto, tentando via Blob...');
            return await uploadLargeFile(file);
          }
        } catch (jsonError) {
          // Continuar com mensagem padrão
        }
        throw new Error(errorMessage);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error('Erro no upload de arquivo pequeno:', error);
      throw error;
    }
  }, [uploadLargeFile]);

  // NOVA FUNÇÃO: Determinar método de upload baseado no tamanho
  const processFile = useCallback(async (file) => {
  const fileSizeMB = file.size / (1024 * 1024);
  const LARGE_FILE_THRESHOLD = 4.5; // 4.5MB
  
  console.log(`Processando arquivo: ${file.name} (${fileSizeMB.toFixed(2)}MB)`);
  
  if (fileSizeMB > LARGE_FILE_THRESHOLD) {
    console.log('Usando método de upload para arquivo grande (Vercel Blob)');
    return await uploadLargeFile(file);
  } else {
    console.log('Usando método de upload direto');
    return await uploadSmallFile(file);
  }
  }, [uploadLargeFile, uploadSmallFile]);

  // FUNÇÃO ATUALIZADA: Upload e processamento principal
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Por favor, selecione pelo menos um arquivo PDF válido.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);
    setUploadStatus({ 
      stage: 'iniciando', 
      message: 'Iniciando processamento...',
      timestamp: new Date().toLocaleTimeString()
    });
    setProcessingStage('upload');
    setTotalFiles(files.length);
    setProcessedFiles(0);

    const allSummaries = [];
    const fileErrors = [];
    const patientNames = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileNumber = i + 1;
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
      setCurrentProcessingFile(file.name);
      
      try {
        // Determinar método de upload
        const isLargeFile = file.size > 4.5 * 1024 * 1024;
        const uploadMethod = isLargeFile ? 'Blob' : 'Direto';
        
        setUploadStatus({ 
          stage: 'enviando', 
          message: `${uploadMethod} ${fileNumber}/${files.length}: ${file.name.substring(0, 30)}${file.name.length > 30 ? '...' : ''} (${fileSizeMB}MB)`,
          timestamp: new Date().toLocaleTimeString()
        });
        
        setProcessingStage('processing');
        setUploadStatus({ 
          stage: 'processando', 
          message: `Processando ${fileNumber}/${files.length}: Extraindo dados...`,
          timestamp: new Date().toLocaleTimeString()
        });
        
        // Usar a nova função que determina automaticamente o método
        const data = await processFile(file);
        
        if (!data.summaries || data.summaries.length === 0) {
          throw new Error(`Não foi possível extrair informações do documento ${file.name}.`);
        }
        
        if (data.patientName) {
          patientNames[file.name] = data.patientName;
        }
        
        const fileSummaries = data.summaries.map(summary => ({
          ...summary,
          fileName: file.name,
          patientName: data.patientName,
          processedAt: new Date().toLocaleTimeString(),
          uploadMethod: data.uploadMethod || 'unknown'
        }));
        
        allSummaries.push(...fileSummaries);
        
        if (i === 0 && data.patientName) {
          setPatientName(data.patientName);
        }
        
        setProcessedFiles(i + 1);
        
      } catch (error) {
        console.error(`Erro ao processar ${file.name}:`, error);
        fileErrors.push({ 
          fileName: file.name, 
          error: error.message,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }
    
    setProcessingStage('complete');
    
    if (allSummaries.length > 0) {
      setSummaries(allSummaries);
      
      if (fileErrors.length > 0) {
        setUploadStatus({ 
          stage: 'aviso', 
          message: `Processados ${allSummaries.length} resultados de ${files.length - fileErrors.length}/${files.length} arquivos.`,
          details: `Concluído às ${new Date().toLocaleTimeString()}`,
          timestamp: new Date().toLocaleTimeString()
        });
        
        const errorMessage = fileErrors.map(err => 
          `${err.fileName}: ${err.error}`
        ).join('\n');
        setError(`Alguns arquivos não puderam ser processados:\n\n${errorMessage}`);
      } else {
        setUploadStatus({ 
          stage: 'sucesso', 
          message: `Processamento concluído! ${allSummaries.length} resultados de ${files.length} arquivos.`,
          details: `Finalizado às ${new Date().toLocaleTimeString()}`,
          timestamp: new Date().toLocaleTimeString()
        });
        setError(null);
      }
    } else {
      setUploadStatus({ 
        stage: 'erro', 
        message: 'Nenhum resultado foi extraído dos arquivos.',
        details: `Falha às ${new Date().toLocaleTimeString()}`,
        timestamp: new Date().toLocaleTimeString()
      });
      
      const errorMessage = fileErrors.map(err => 
        `${err.fileName}: ${err.error}`
      ).join('\n');
      setError(`Falha ao processar todos os arquivos:\n\n${errorMessage}`);
    }
    
    setLoading(false);
    setCurrentProcessingFile(null);
  };

  // Gerar texto formatado para cópia
  const getSimplifiedTextForCopy = useCallback(() => {
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

  // Função para copiar texto
  const copyToClipboard = useCallback(async () => {
    if (textAreaRef.current) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(textAreaRef.current.value);
        } else {
          textAreaRef.current.select();
          document.execCommand('copy');
        }
        
        const originalText = textAreaRef.current.value;
        textAreaRef.current.value = 'Resultados copiados com sucesso!';
        textAreaRef.current.style.background = '#f0fdf4';
        textAreaRef.current.style.color = '#166534';
        
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
        
        setTimeout(() => {
          textAreaRef.current.value = originalText;
          textAreaRef.current.style.background = '';
          textAreaRef.current.style.color = '';
        }, 3000);
      }
    }
  }, []);

  // Calcular progresso
  const calculateProgress = useCallback(() => {
    if (totalFiles === 0) return 0;
    return Math.round((processedFiles / totalFiles) * 100);
  }, [processedFiles, totalFiles]);

  return (
    <div className="App">
      <header className="App-header">
        <div className="institute-logo">
          <span className="logo-text">Instituto Paulo Godoi</span>
        </div>
        <h1>Extrator de Resultados de Exames</h1>
        <p className="subtitle">Sistema interno para processamento de laudos laboratoriais</p>
        
        {/* Status da API */}
        {apiStatus && (
          <div className={`api-status ${apiStatus.status}`}>
            <span className="status-indicator"></span>
            {apiStatus.status === 'online' ? (
              <span>
                Conectado ({apiStatus.env})
                {apiStatus.blobSupport && <span className="blob-support"> • Blob ativo</span>}
              </span>
            ) : apiStatus.status === 'checking' ? (
              <span>Verificando...</span>
            ) : (
              <span>{apiStatus.message}
                <button className="retry-button" onClick={retryApiConnection}>
                  Tentar novamente
                </button>
              </span>
            )}
          </div>
        )}
      </header>
      
      <main>
        {/* Error Handler para problemas de API */}
        {(apiStatus?.status === 'offline' || apiStatus?.status === 'error') && (
          <ErrorHandler 
            error={`Não foi possível conectar ao servidor. ${apiStatus.message}`}
            onRetry={retryApiConnection}
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
                ) : (
                  'Escolher arquivos PDF ou arrastar aqui'
                )}
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
                    disabled={loading}
                  >
                    Remover todos
                  </button>
                </div>
                <ul className="selected-files-list">
                  {files.map((file, index) => {
                    const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
                    const isLargeFile = file.size > 4.5 * 1024 * 1024;
                    return (
                      <li key={`${file.name}-${index}`} className="file-item">
                        <span className="file-name">
                          <span className="pdf-icon">📄</span>
                          {file.name}
                          <span className={`file-size ${isLargeFile ? 'large-file' : ''}`}>
                            ({fileSizeMB} MB) {isLargeFile && '• Via Blob'}
                          </span>
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
                    );
                  })}
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
          
          {/* Barra de progresso */}
          {(processingStage === 'upload' || processingStage === 'processing') && (
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-indicator" 
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
              </div>
              <div className="progress-status">
                {currentProcessingFile ? (
                  `${processingStage === 'upload' ? 'Enviando' : 'Processando'}: ${
                    currentProcessingFile.length > 30 ? 
                    currentProcessingFile.substring(0, 30) + '...' : 
                    currentProcessingFile
                  } (${processedFiles + 1}/${totalFiles})`
                ) : (
                  processingStage === 'upload' ? 'Enviando arquivo...' : 'Processando documento...'
                )}
              </div>
            </div>
          )}
          
          {/* Status de upload */}
          {uploadStatus && (
            <div className={`upload-status ${uploadStatus.stage}`}>
              <span className="status-icon">
                {uploadStatus.stage === 'sucesso' ? '✓' : 
                uploadStatus.stage === 'erro' ? '✗' : 
                uploadStatus.stage === 'aviso' ? '!' : '⟳'}
              </span>
              <div className="status-content">
                <div className="status-message">{uploadStatus.message}</div>
                {uploadStatus.details && (
                  <div className="status-details">{uploadStatus.details}</div>
                )}
                {uploadStatus.timestamp && (
                  <div className="status-timestamp">{uploadStatus.timestamp}</div>
                )}
              </div>
            </div>
          )}
          
          {/* Dicas para PDFs problemáticos */}
          {uploadStatus && uploadStatus.stage === 'erro' && (
            <div className="pdf-tips">
              <h4>Possíveis soluções:</h4>
              <ul>
                <li>Verifique se os PDFs não estão protegidos por senha</li>
                <li>Tente salvar os PDFs novamente usando "Salvar como"</li>
                <li>Se possível, imprima os documentos para novos PDFs</li>
                <li>Entre em contato com o laboratório para versões alternativas</li>
              </ul>
            </div>
          )}
          
          {/* Aviso para processamento parcial */}
          {uploadStatus && uploadStatus.stage === 'aviso' && (
            <div className="processing-notice">
              <p>Os documentos foram processados, mas alguns podem conter imprecisões.</p>
              <p>Verifique os resultados antes de usar.</p>
            </div>
          )}
        </div>

        {loading && !processingStage && (
          <p className="loading">Processando documentos, aguarde...</p>
        )}
        
        {error && !uploadStatus && (
          <p className="error">{error}</p>
        )}
        
        {/* Detalhes de erros */}
        {error && uploadStatus && (
          <div className="file-errors">
            <details>
              <summary>Detalhes dos erros</summary>
              <pre className="error-details">{error}</pre>
            </details>
          </div>
        )}
        
        {/* Botão de reset */}
        {summaries.length > 0 && (
          <div className="reset-button-container">
            <button 
              className="reset-button"
              onClick={handleReset}
              disabled={loading}
            >
              Processar novos documentos
            </button>
          </div>
        )}

        <div className="summary-container">
          {summaries.length === 0 ? (
            <div className="empty-message">
              <p>Os resultados dos exames aparecerão aqui.</p>
              <p>Selecione arquivos PDF para começar.</p>
              {apiStatus?.blobSupport && (
                <p className="blob-info">✨ Suporte a arquivos grandes ativado (até 100MB)</p>
              )}
            </div>
          ) : (
            <div className="text-view-container">
              <h2>Resultados Extraídos</h2>
              {summaries.length > 0 && (
                <div className="summary-info">
                  <span className="file-count">{summaries.length} resultados extraídos</span>
                  {files.length > 1 && (
                    <span className="multi-file-notice">de {files.length} arquivos</span>
                  )}
                  <span className="extraction-time">às {new Date().toLocaleTimeString()}</span>
                </div>
              )}
              <p className="copy-instructions">Lista de resultados pronta para copiar:</p>
              <div className="text-area-container">
                <textarea
                  ref={textAreaRef}
                  className="results-text-area"
                  value={getSimplifiedTextForCopy()}
                  readOnly
                  placeholder="Os resultados aparecerão aqui..."
                />
                <button 
                  onClick={copyToClipboard} 
                  className="copy-button"
                  disabled={summaries.length === 0}
                >
                  Copiar para área de transferência
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer>
        <p>© 2025 - Instituto Paulo Godoi - Sistema de Processamento de Exames</p>
        <p className="api-info">
          Ambiente: {apiStatus?.env || 'Desconectado'} | API: {API_URL}
          {apiStatus?.blobSupport && <span className="blob-support"> • Blob</span>}
        </p>
      </footer>
    </div>
  );
}

export default App;