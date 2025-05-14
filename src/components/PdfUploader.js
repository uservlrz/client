// client/src/components/PdfUploader.js
import React, { useState, useEffect } from 'react';
import './PdfUploader.css';

const PdfUploader = ({ onSummariesUpdate, setLoading, setError, setPatientName }) => {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [apiUrl, setApiUrl] = useState('');
  const [processingStage, setProcessingStage] = useState(null);

  // Determinar a URL da API com base no ambiente
  useEffect(() => {
    // Em desenvolvimento (local), usa localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setApiUrl('http://localhost:5000');
    } else {
      // Em produção, usa o domínio do Vercel para o backend
      setApiUrl('https://server-theta-murex.vercel.app');
    }
  }, []);

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
      
      // Enviar o arquivo
      const uploadUrl = `${apiUrl}/api/upload`;
      console.log(`Enviando arquivo para ${uploadUrl}`);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      
      // Verificar respostas de erro HTTP
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
      
      setProcessingStage('processing');
      setUploadStatus({ stage: 'processando', message: 'Processando documento PDF...' });
      
      // Processar resposta
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
      
      // Atualizar dados
      onSummariesUpdate(data.summaries);
      
      // Definir o nome do paciente
      if (data.patientName) {
        setPatientName(data.patientName);
      }
    } catch (error) {
      console.error('Erro ao enviar ou processar o arquivo:', error);
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

  return (
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
            {file ? file.name : 'Escolher arquivo PDF'}
          </label>
        </div>
        
        <button 
          type="submit" 
          className="upload-button"
          disabled={!file || !apiUrl || processingStage === 'upload' || processingStage === 'processing'}
        >
          {processingStage === 'upload' || processingStage === 'processing' ? 
            'Processando...' : 'Processar Documento'}
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
      
      {/* Aviso quando o documento foi processado, mas com ajustes */}
      {uploadStatus && uploadStatus.stage === 'aviso' && (
        <div className="processing-notice">
          <p>O documento foi processado com sucesso, mas pode conter algumas imprecisões devido ao formato do arquivo original.</p>
          <p>Verifique cuidadosamente os resultados extraídos antes de usá-los.</p>
        </div>
      )}
    </div>
  );
};

export default PdfUploader;