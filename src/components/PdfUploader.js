import React, { useState } from 'react';
import './PdfUploader.css';

const PdfUploader = ({ onSummariesUpdate, setLoading, setError }) => {
  const [file, setFile] = useState(null);

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
      onSummariesUpdate(data.summaries);
    } catch (error) {
      console.error('Erro ao enviar o arquivo:', error);
      setError(error.message || 'Erro ao processar o documento. Tente novamente.');
    } finally {
      setLoading(false);
    }
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
          disabled={!file}
        >
          Gerar Resumos
        </button>
      </form>
    </div>
  );
};

export default PdfUploader;