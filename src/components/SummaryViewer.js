import React from 'react';
import './SummaryViewer.css';

const SummaryViewer = ({ summaries }) => {
  if (!summaries || summaries.length === 0) {
    return (
      <div className="summary-container empty">
        <p>Os resumos das páginas do PDF aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="summary-container">
      <h2>Resumos do Documento</h2>
      <div className="summaries-list">
        {summaries.map((summary, index) => (
          <div key={index} className="summary-card">
            <h3>Página {summary.page}</h3>
            <div className="summary-content">
              {summary.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SummaryViewer;