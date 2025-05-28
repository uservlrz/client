// App.js - Versão com Divisor de PDF Integrado (Múltiplos Arquivos)
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
  
  // Estados para o divisor de PDF (modificados para múltiplos arquivos)
  const [activeTab, setActiveTab] = useState('extractor'); // 'extractor' ou 'splitter'
  const [selectedFilesForSplit, setSelectedFilesForSplit] = useState([]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitError, setSplitError] = useState(null);
  const [splitSuccess, setSplitSuccess] = useState(null);
  const [splitFiles, setSplitFiles] = useState([]);
  const [dragOverSplitter, setDragOverSplitter] = useState(false);
  const [splittingProgress, setSplittingProgress] = useState({ current: 0, total: 0, fileName: '' });
  
  const textAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  const splitFileInputRef = useRef(null);

  // Função para carregar PDF-lib dinamicamente
  const loadPDFLib = useCallback(async () => {
    if (window.PDFLib) return window.PDFLib;
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
    document.head.appendChild(script);
    
    return new Promise((resolve, reject) => {
      script.onload = () => {
        if (window.PDFLib) {
          resolve(window.PDFLib);
        } else {
          reject(new Error('Falha ao carregar PDF-lib'));
        }
      };
      script.onerror = () => reject(new Error('Erro ao carregar PDF-lib'));
    });
  }, []);

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
          setApiStatus({ status: 'online', env: data.env, url: API_URL });
          setError(null);
        } else {
          setApiStatus({ status: 'error', message: `Erro ${response.status}`, url: API_URL });
        }
      } catch (error) {
        setApiStatus({ status: 'offline', message: 'Servidor indisponível', url: API_URL });
      }
    }, 1000);
  }, []);

  // Função para resetar o estado do extrator
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

  // Função para resetar o estado do divisor
  const resetSplitter = useCallback(() => {
    setSelectedFilesForSplit([]);
    setSplitFiles([]);
    setSplitError(null);
    setSplitSuccess(null);
    setSplittingProgress({ current: 0, total: 0, fileName: '' });
    if (splitFileInputRef.current) {
      splitFileInputRef.current.value = '';
    }
  }, []);

  // Handlers para drag and drop do extrator
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

  // Handlers para drag and drop do divisor (modificados para múltiplos arquivos)
  const handleSplitterDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOverSplitter(true);
  }, []);

  const handleSplitterDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOverSplitter(false);
  }, []);

  const handleSplitterDrop = useCallback((e) => {
    e.preventDefault();
    setDragOverSplitter(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length > 0) {
      setSelectedFilesForSplit(prevFiles => [...prevFiles, ...pdfFiles]);
      setSplitError(null);
      setSplitFiles([]);
      setSplitSuccess(null);
    } else if (droppedFiles.length > 0) {
      setSplitError('Por favor, solte apenas arquivos PDF válidos.');
      setTimeout(() => setSplitError(null), 3000);
    }
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

  // Modificado para múltiplos arquivos
  const handleSplitFileChange = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length > 0) {
      setSelectedFilesForSplit(prevFiles => [...prevFiles, ...pdfFiles]);
      setSplitError(null);
      setSplitFiles([]);
      setSplitSuccess(null);
    } else if (selectedFiles.length > 0) {
      setSplitError('Por favor, selecione apenas arquivos PDF válidos.');
      setTimeout(() => setSplitError(null), 3000);
    }
  }, []);

  // Função para remover arquivo do extrator
  const removeFile = useCallback((index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  }, []);

  // Função para remover arquivo do divisor
  const removeSplitFile = useCallback((index) => {
    setSelectedFilesForSplit(prevFiles => prevFiles.filter((_, i) => i !== index));
  }, []);

  // Função para limpar todos os arquivos do extrator
  const clearAllFiles = useCallback(() => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Função para limpar todos os arquivos do divisor
  const clearAllSplitFiles = useCallback(() => {
    setSelectedFilesForSplit([]);
    if (splitFileInputRef.current) {
      splitFileInputRef.current.value = '';
    }
  }, []);

  // Função para dividir um único PDF
  const splitSinglePDF = useCallback(async (file, PDFLib) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    
    const totalPages = pdfDoc.getPageCount();
    
    if (totalPages < 2) {
      throw new Error(`O PDF "${file.name}" deve ter pelo menos 2 páginas para ser dividido.`);
    }

    const middlePage = Math.ceil(totalPages / 2);

    // Criar primeiro PDF (primeira metade)
    const firstPdf = await PDFLib.PDFDocument.create();
    const firstHalfPages = await firstPdf.copyPages(pdfDoc, Array.from({ length: middlePage }, (_, i) => i));
    firstHalfPages.forEach(page => firstPdf.addPage(page));

    // Criar segundo PDF (segunda metade)
    const secondPdf = await PDFLib.PDFDocument.create();
    const secondHalfPages = await secondPdf.copyPages(pdfDoc, Array.from({ length: totalPages - middlePage }, (_, i) => i + middlePage));
    secondHalfPages.forEach(page => secondPdf.addPage(page));

    // Gerar os PDFs como bytes
    const firstPdfBytes = await firstPdf.save();
    const secondPdfBytes = await secondPdf.save();

    // Criar nomes para os arquivos
    const originalName = file.name.replace('.pdf', '');
    const firstName = `${originalName}_parte1.pdf`;
    const secondName = `${originalName}_parte2.pdf`;

    return [
      {
        name: firstName,
        bytes: firstPdfBytes,
        pages: middlePage,
        blob: new Blob([firstPdfBytes], { type: 'application/pdf' }),
        originalFile: file.name
      },
      {
        name: secondName,
        bytes: secondPdfBytes,
        pages: totalPages - middlePage,
        blob: new Blob([secondPdfBytes], { type: 'application/pdf' }),
        originalFile: file.name
      }
    ];
  }, []);

  // Função principal para dividir PDFs (modificada para múltiplos arquivos)
  const splitPDFs = useCallback(async () => {
    if (selectedFilesForSplit.length === 0) {
      setSplitError('Por favor, selecione pelo menos um arquivo PDF primeiro.');
      return;
    }

    setIsSplitting(true);
    setSplitError(null);
    setSplitSuccess(null);
    setSplitFiles([]);
    setSplittingProgress({ current: 0, total: selectedFilesForSplit.length, fileName: '' });

    try {
      const PDFLib = await loadPDFLib();
      const allSplitFiles = [];
      const errors = [];

      for (let i = 0; i < selectedFilesForSplit.length; i++) {
        const file = selectedFilesForSplit[i];
        setSplittingProgress({ 
          current: i + 1, 
          total: selectedFilesForSplit.length, 
          fileName: file.name 
        });

        try {
          const splitResults = await splitSinglePDF(file, PDFLib);
          allSplitFiles.push(...splitResults);
        } catch (error) {
          console.error(`Erro ao dividir ${file.name}:`, error);
          errors.push({ fileName: file.name, error: error.message });
        }
      }

      setSplitFiles(allSplitFiles);

      if (errors.length === 0) {
        setSplitSuccess(
          `Todos os ${selectedFilesForSplit.length} PDFs foram divididos com sucesso! ` +
          `Total de ${allSplitFiles.length} arquivos gerados.`
        );
      } else if (allSplitFiles.length > 0) {
        setSplitSuccess(
          `${selectedFilesForSplit.length - errors.length} de ${selectedFilesForSplit.length} PDFs foram divididos com sucesso. ` +
          `Total de ${allSplitFiles.length} arquivos gerados.`
        );
        setSplitError(
          `Alguns arquivos não puderam ser processados:\n${errors.map(e => `• ${e.fileName}: ${e.error}`).join('\n')}`
        );
      } else {
        setSplitError(
          `Nenhum arquivo pôde ser processado:\n${errors.map(e => `• ${e.fileName}: ${e.error}`).join('\n')}`
        );
      }

    } catch (error) {
      console.error('Erro ao carregar PDF-lib:', error);
      setSplitError('Erro ao carregar a biblioteca de processamento de PDF. Tente recarregar a página.');
    } finally {
      setIsSplitting(false);
      setSplittingProgress({ current: 0, total: 0, fileName: '' });
    }
  }, [selectedFilesForSplit, loadPDFLib, splitSinglePDF]);

  // Função para download de arquivo
  const downloadFile = useCallback((fileData) => {
    const url = URL.createObjectURL(fileData.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileData.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // Função para download de todos os arquivos
  const downloadAll = useCallback(() => {
    splitFiles.forEach((fileData, index) => {
      setTimeout(() => downloadFile(fileData), index * 100);
    });
  }, [splitFiles, downloadFile]);

  // Função principal de upload e processamento (existente)
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
      setCurrentProcessingFile(file.name);
      
      try {
        const formData = new FormData();
        formData.append('pdf', file);
        
        setUploadStatus({ 
          stage: 'enviando', 
          message: `Enviando ${fileNumber}/${files.length}: ${file.name.substring(0, 30)}${file.name.length > 30 ? '...' : ''}`,
          timestamp: new Date().toLocaleTimeString()
        });
        
        const response = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });
        
        setProcessingStage('processing');
        setUploadStatus({ 
          stage: 'processando', 
          message: `Processando ${fileNumber}/${files.length}: Extraindo dados...`,
          timestamp: new Date().toLocaleTimeString()
        });
        
        if (!response.ok) {
          let errorMessage = `Erro ${response.status}: ${response.statusText}`;
          try {
            const errorData = await response.json();
            if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch (jsonError) {

          }
          throw new Error(`Erro no arquivo ${file.name}: ${errorMessage}`);
        }
        
        const data = await response.json();
        
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
          processedAt: new Date().toLocaleTimeString()
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
        <h1>Sistema de Processamento de Documentos</h1>
        <p className="subtitle">Extração de resultados e ferramentas para PDFs laboratoriais</p>
        
        {/* Status da API */}
        {apiStatus && (
          <div className={`api-status ${apiStatus.status}`}>
            <span className="status-indicator"></span>
            {apiStatus.status === 'online' ? (
              <span>Conectado ({apiStatus.env})</span>
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
        {(apiStatus?.status === 'offline' || apiStatus?.status === 'error') && activeTab === 'extractor' && (
          <ErrorHandler 
            error={`Não foi possível conectar ao servidor. ${apiStatus.message}`}
            onRetry={retryApiConnection}
          />
        )}

        {/* Navegação por Abas */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'extractor' ? 'active' : ''}`}
            onClick={() => setActiveTab('extractor')}
          >
            <span className="tab-icon">📋</span>
            Extrator de Resultados
          </button>
          <button 
            className={`tab-button ${activeTab === 'splitter' ? 'active' : ''}`}
            onClick={() => setActiveTab('splitter')}
          >
            <span className="tab-icon">✂️</span>
            Divisor de PDF
          </button>
        </div>

        {/* Conteúdo da aba Extrator */}
        {activeTab === 'extractor' && (
          <>
            {/* Aviso sobre limite de tamanho */}
            <div className="size-warning-card">
              <div className="warning-header">
                <span className="warning-icon">⚠️</span>
                <h3>Limite de Tamanho para Extração</h3>
              </div>
              <div className="warning-content">
                <p>
                  <strong>PDFs com mais de 4MB precisam ser divididos antes da extração.</strong>
                </p>
                <p>
                  Use a aba <button 
                    className="tab-link-button" 
                    onClick={() => setActiveTab('splitter')}
                  >
                    ✂️ Divisor de PDF
                  </button> para cortar arquivos grandes em partes menores.
                </p>
              </div>
            </div>

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
                        const fileSizeMB = file.size / 1024 / 1024;
                        const isOverLimit = fileSizeMB > 4;
                        return (
                          <li key={`${file.name}-${index}`} className={`file-item ${isOverLimit ? 'file-over-limit' : ''}`}>
                            <span className="file-name">
                              <span className="pdf-icon">📄</span>
                              {file.name}
                              <span className={`file-size ${isOverLimit ? 'size-warning' : ''}`}>
                                ({fileSizeMB.toFixed(1)} MB)
                                {isOverLimit && <span className="size-alert">⚠️ Muito grande</span>}
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
                    {files.some(file => file.size / 1024 / 1024 > 4) && (
                      <div className="file-size-alert">
                        <span className="alert-icon">⚠️</span>
                        <div className="alert-content">
                          <strong>Arquivos muito grandes detectados!</strong>
                          <p>PDFs com mais de 4MB podem falhar na extração. 
                             <button 
                               className="alert-link-button" 
                               onClick={() => setActiveTab('splitter')}
                             >
                               Clique aqui para dividir os arquivos grandes
                             </button> antes de extrair os resultados.
                          </p>
                        </div>
                      </div>
                    )}
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
          </>
        )}

        {/* Conteúdo da aba Divisor de PDF */}
        {activeTab === 'splitter' && (
          <div className="pdf-splitter-section">
            <div className="splitter-intro">
              <h2>
                <span className="section-icon">✂️</span>
                Divisor de PDF
              </h2>
              <p className="section-description">
                <strong>Divida múltiplos PDFs grandes em partes menores para extração.</strong> 
                Arquivos com mais de 4MB devem ser divididos antes de usar o extrator de resultados.
              </p>
              <div className="splitter-benefits">
                <div className="benefit-item">
                  <span className="benefit-icon">🎯</span>
                  <span>Processe vários PDFs de uma só vez</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">🔒</span>
                  <span>Processamento 100% local e seguro</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">⚡</span>
                  <span>Divisão rápida e automática</span>
                </div>
              </div>
            </div>

            <div 
              className={`splitter-uploader-container ${dragOverSplitter ? 'drag-over' : ''}`}
              onDragOver={handleSplitterDragOver}
              onDragLeave={handleSplitterDragLeave}
              onDrop={handleSplitterDrop}
            >
              <input
                type="file"
                id="pdf-split-upload"
                ref={splitFileInputRef}
                onChange={handleSplitFileChange}
                accept="application/pdf"
                multiple
                style={{ display: 'none' }}
              />
              
              <label htmlFor="pdf-split-upload" className={`splitter-file-label ${dragOverSplitter ? 'drag-active' : ''}`}>
                <div className="splitter-upload-content">
                  <span className="splitter-upload-icon">
                    {selectedFilesForSplit.length > 0 ? '✓' : '📎'}
                  </span>
                  {selectedFilesForSplit.length > 0 ? (
                    <div className="selected-files-info">
                      <p className="selected-files-count">
                        {selectedFilesForSplit.length} arquivo{selectedFilesForSplit.length > 1 ? 's' : ''} selecionado{selectedFilesForSplit.length > 1 ? 's' : ''}
                      </p>
                      <p className="selected-files-size">
                        Total: {(selectedFilesForSplit.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  ) : dragOverSplitter ? (
                    <div className="drag-message">
                      <p>Solte os arquivos PDF aqui</p>
                    </div>
                  ) : (
                    <div className="upload-message">
                      <p>Selecione ou arraste arquivos PDF</p>
                      <span className="upload-hint">Clique aqui ou arraste e solte seus PDFs</span>
                    </div>
                  )}
                </div>
              </label>

              {/* Lista de arquivos selecionados para dividir */}
              {selectedFilesForSplit.length > 0 && (
                <div className="selected-split-files-container">
                  <h3>Arquivos para Dividir</h3>
                  <div className="split-files-actions">
                    <button 
                      type="button" 
                      className="clear-split-files-button" 
                      onClick={clearAllSplitFiles}
                      disabled={isSplitting}
                    >
                      Remover todos
                    </button>
                  </div>
                  <ul className="selected-split-files-list">
                    {selectedFilesForSplit.map((file, index) => {
                      const fileSizeMB = file.size / 1024 / 1024;
                      return (
                        <li key={`split-${file.name}-${index}`} className="split-file-item">
                          <span className="split-file-name">
                            <span className="pdf-icon">📄</span>
                            {file.name}
                            <span className="split-file-size">
                              ({fileSizeMB.toFixed(1)} MB)
                            </span>
                          </span>
                          <button 
                            type="button" 
                            className="remove-split-file-button" 
                            onClick={() => removeSplitFile(index)}
                            disabled={isSplitting}
                          >
                            ×
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="splitter-actions">
                <button
                  onClick={splitPDFs}
                  disabled={selectedFilesForSplit.length === 0 || isSplitting}
                  className={`split-button ${isSplitting ? 'loading' : ''}`}
                >
                  <span className="button-icon">✂️</span>
                  {isSplitting ? (
                    `Dividindo ${splittingProgress.current}/${splittingProgress.total}...`
                  ) : (
                    `Dividir ${selectedFilesForSplit.length} PDF${selectedFilesForSplit.length > 1 ? 's' : ''}`
                  )}
                </button>

                {selectedFilesForSplit.length > 0 && (
                  <button
                    onClick={resetSplitter}
                    className="reset-splitter-button"
                    disabled={isSplitting}
                  >
                    Limpar Seleção
                  </button>
                )}
              </div>
            </div>

            {/* Indicador de processamento com progresso */}
            {isSplitting && (
              <div className="split-processing">
                <div className="processing-spinner"></div>
                <div className="processing-info">
                  <span className="processing-text">
                    Processando: {splittingProgress.fileName}
                  </span>
                  <div className="processing-progress">
                    {splittingProgress.current} de {splittingProgress.total} arquivos
                  </div>
                </div>
              </div>
            )}

            {/* Mensagens de erro para divisor */}
            {splitError && (
              <div className="split-error">
                <span className="error-icon">✗</span>
                <pre className="error-text">{splitError}</pre>
              </div>
            )}

            {/* Mensagem de sucesso para divisor */}
            {splitSuccess && (
              <div className="split-success">
                <span className="success-icon">✓</span>
                <span className="success-text">{splitSuccess}</span>
              </div>
            )}

            {/* Resultados da divisão */}
            {splitFiles.length > 0 && (
              <div className="split-results">
                <div className="split-results-header">
                  <h3>
                    <span className="results-icon">📁</span>
                    Arquivos Gerados ({splitFiles.length})
                  </h3>
                  <button
                    onClick={downloadAll}
                    className="download-all-button"
                  >
                    <span className="button-icon">⬇</span>
                    Baixar Todos
                  </button>
                </div>

                <div className="split-files-grid">
                  {splitFiles.map((file, index) => (
                    <div key={index} className="split-file-card">
                      <div className="file-card-header">
                        <span className="file-card-icon">📄</span>
                        <div className="file-card-info">
                          <h4 className="file-card-name">{file.name}</h4>
                          <span className="file-card-pages">{file.pages} páginas</span>
                          <span className="file-card-original">De: {file.originalFile}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadFile(file)}
                        className="download-file-button"
                      >
                        <span className="button-icon">⬇</span>
                        Download
                      </button>
                    </div>
                  ))}
                </div>

                <div className="split-actions-footer">
                  <button
                    onClick={resetSplitter}
                    className="new-split-button"
                  >
                    Dividir outros PDFs
                  </button>
                </div>
              </div>
            )}

            {/* Informações sobre a ferramenta */}
            <div className="splitter-info">
              <h4>Como funciona:</h4>
              <ul>
                <li>Selecione um ou mais arquivos PDF com pelo menos 2 páginas cada</li>
                <li>Cada PDF será dividido automaticamente pela metade</li>
                <li>Se o PDF tiver número ímpar de páginas, a primeira parte terá uma página a mais</li>
                <li>Os arquivos são processados localmente no seu navegador (sem upload para servidor)</li>
                <li>Seus dados permanecem seguros e privados</li>
                <li>Processe múltiplos arquivos de uma vez para economizar tempo</li>
              </ul>
            </div>
          </div>
        )}
      </main>
      
      <footer>
        <p>© 2025 - Instituto Paulo Godoi - Sistema de Processamento de Exames</p>
        <p className="api-info">
          Ambiente: {apiStatus?.env || 'Desconectado'} | API: {API_URL}
        </p>
      </footer>
    </div>
  );
}

export default App;