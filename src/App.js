import React, { useState, useRef } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'text'
  const textAreaRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
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

    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Erro ao processar o documento');
      }
      
      const data = await response.json();
      setSummaries(data.summaries);
      
      // Definir o nome do paciente extraído automaticamente
      if (data.patientName) {
        setPatientName(data.patientName);
      }
    } catch (error) {
      console.error('Erro ao enviar o arquivo:', error);
      setError(error.message || 'Erro ao processar o documento. Tente novamente.');
    } finally {
      setLoading(false);
    }
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

  // Identifica se uma linha é um título de seção (como SÉRIE ERITROCITÁRIA)
  const isSectionTitle = (line) => {
    return line.match(/^SÉRIE|^HEMOGRAMA|^EXAMES/i) !== null;
  };

  // Função para formatar as linhas de resultados
  const formatResultLine = (line) => {
    // Se for um título de seção, renderize como título
    if (isSectionTitle(line)) {
      return <h4 className="section-title">{line}</h4>;
    }
    
    // Verifica se a linha tem o formato "Exame: Resultado | Referência: Valor"
    const parts = line.split('|');
    
    if (parts.length === 2) {
      // Separa o resultado do exame e a referência
      const resultPart = parts[0].trim();
      const referencePart = parts[1].trim();
      
      // Extrai o nome do exame e o valor
      const resultMatch = resultPart.match(/^(.+):\s*(.+)$/);
      
      if (resultMatch) {
        const examName = resultMatch[1].trim();
        const examValue = resultMatch[2].trim();
        
        // Verifica se o valor tem '/' indicando resultado duplo
        if (examValue.includes('/')) {
          const [percentValue, absoluteValue] = examValue.split('/').map(v => v.trim());
          
          return (
            <div className="exam-result">
              <span className="exam-name">{examName}:</span> 
              <span className="exam-value dual-value">
                <span className="percent-value">{percentValue}</span>
                <span className="divider">/</span>
                <span className="absolute-value">{absoluteValue}</span>
              </span>
              <span className="exam-reference"> | {referencePart}</span>
            </div>
          );
        } else {
          return (
            <div className="exam-result">
              <span className="exam-name">{examName}:</span> 
              <span className="exam-value">{examValue}</span>
              <span className="exam-reference"> | {referencePart}</span>
            </div>
          );
        }
      }
    }
    
    // Fallback para linhas que não têm o formato esperado
    return <div className="exam-result">{line}</div>;
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="institute-logo">
          <span className="logo-text">Instituto Paulo Godoi</span>
        </div>
        <h1>Extrator de Resultados de Exames</h1>
        <p className="subtitle">Sistema interno para processamento de laudos laboratoriais</p>
      </header>
      <main>
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
              disabled={!file}
            >
              Extrair Resultados
            </button>
          </form>
        </div>

        {loading && <p className="loading">Processando o documento, por favor aguarde...</p>}
        {error && <p className="error">Erro: {error}</p>}

        {summaries.length > 0 && (
          <div className="view-mode-toggle">
            <button 
              className={`toggle-button ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              Visualização em Cards
            </button>
            <button 
              className={`toggle-button ${viewMode === 'text' ? 'active' : ''}`}
              onClick={() => setViewMode('text')}
            >
              Visualização para Cópia
            </button>
          </div>
        )}

        <div className="summary-container">
          {summaries.length === 0 ? (
            <p className="empty-message">Os resultados dos exames aparecerão aqui.</p>
          ) : viewMode === 'cards' ? (
            <>
              {patientName && (
                <div className="patient-header">
                  <h3>Paciente: {patientName}</h3>
                </div>
              )}
              <h2>Resultados dos Exames</h2>
              <div className="summaries-list">
                {summaries.map((summary, index) => (
                  <div key={index} className="summary-card">
                    <div className="card-header">
                      <h3>Resultados</h3>
                    </div>
                    <div className="summary-content">
                      {summary.content.split("\n").map((line, i) => (
                        line.trim() ? (
                          <div key={i} className={`result-line ${isSectionTitle(line) ? 'section-header' : ''}`}>
                            {formatResultLine(line)}
                          </div>
                        ) : null
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="export-container">
                <button onClick={() => window.print()} className="export-button">
                  <i className="print-icon">🖨️</i> Imprimir Resultados
                </button>
              </div>
            </>
          ) : (
            <div className="text-view-container">
              <h2>Resultados para Cópia</h2>
              <p className="copy-instructions">Lista simples de resultados para copiar e colar:</p>
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
      </footer>
    </div>
  );
}

export default App;