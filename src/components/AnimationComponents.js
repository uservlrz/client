// Componentes de animação para o extrator de resultados
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Componente de confetti para comemorar processamento bem-sucedido
export const Confetti = ({ active }) => {
  const createParticles = () => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -20 - Math.random() * 80,
      size: 5 + Math.random() * 15,
      color: ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4'][Math.floor(Math.random() * 7)],
      rotation: Math.random() * 360,
      speed: 2 + Math.random() * 6
    }));
  };

  const particles = active ? createParticles() : [];

  return (
    <div className="confetti-container">
      {particles.map(particle => (
        <div 
          key={particle.id}
          className="confetti-particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size * 0.5}px`,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            animation: `fall ${particle.speed}s linear forwards`
          }}
        />
      ))}
    </div>
  );
};

// Componente de Loaders diferentes para diferentes estados
export const Loader = ({ type = 'default', text = 'Carregando...' }) => {
  const loaders = {
    default: (
      <div className="loader-default">
        <div className="spinner"></div>
        <p>{text}</p>
      </div>
    ),
    dots: (
      <div className="loader-dots">
        <div className="dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
        <p>{text}</p>
      </div>
    ),
    processing: (
      <div className="loader-processing">
        <div className="processing-icon">
          <div className="document"></div>
          <div className="scan-line"></div>
        </div>
        <p>{text}</p>
      </div>
    )
  };

  return (
    <motion.div 
      className="loader-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {loaders[type] || loaders.default}
    </motion.div>
  );
};

// Componente de toast para notificações
export const Toast = ({ message, type = 'info', visible, onClose }) => {
  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div 
          className={`toast-notification toast-${type}`}
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          transition={{ duration: 0.3 }}
        >
          <span className="toast-icon">{icons[type]}</span>
          <span className="toast-message">{message}</span>
          <button className="toast-close" onClick={onClose}>×</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Componente para animações de transição de página
export const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
};

// Componente de backdrop para foco em elementos importante
export const FocusBackdrop = ({ active, onClose, children }) => {
  return (
    <AnimatePresence>
      {active && (
        <motion.div 
          className="focus-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div 
            className="focus-content"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Componente de animação para upload de arquivos
export const FileUploadAnimation = ({ active }) => {
  return (
    <AnimatePresence>
      {active && (
        <motion.div 
          className="upload-animation"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 80, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="upload-animation-container">
            <div className="upload-animation-file"></div>
            <div className="upload-animation-arrow"></div>
            <div className="upload-animation-server"></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// CSS adicional para estes componentes
export const AnimationStyles = () => (
  <style jsx global>{`
    /* Loaders */
    .loader-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .loader-default .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(52, 152, 219, 0.3);
      border-top-color: #3498db;
      border-radius: 50%;
      animation: spin 1s infinite linear;
    }
    
    .loader-dots .dots {
      display: flex;
      gap: 8px;
    }
    
    .loader-dots .dot {
      width: 12px;
      height: 12px;
      background-color: #3498db;
      border-radius: 50%;
      animation: pulse 1.5s infinite ease-in-out;
    }
    
    .loader-dots .dot:nth-child(2) {
      animation-delay: 0.3s;
    }
    
    .loader-dots .dot:nth-child(3) {
      animation-delay: 0.6s;
    }
    
    .loader-processing .processing-icon {
      width: 50px;
      height: 60px;
      position: relative;
    }
    
    .loader-processing .document {
      width: 40px;
      height: 50px;
      background-color: #f5f5f5;
      border: 2px solid #3498db;
      border-radius: 5px;
      position: relative;
    }
    
    .loader-processing .scan-line {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background-color: #3498db;
      animation: scan 2s infinite;
    }
    
    @keyframes scan {
      0% { top: 5px; }
      50% { top: 45px; }
      100% { top: 5px; }
    }
    
    /* Toast */
    .toast-notification {
      position: fixed;
      left: 50%;
      bottom: 30px;
      background-color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      min-width: 300px;
      z-index: 1000;
    }
    
    .toast-success {
      border-left: 4px solid #2ecc71;
    }
    
    .toast-error {
      border-left: 4px solid #e74c3c;
    }
    
    .toast-warning {
      border-left: 4px solid #e67e22;
    }
    
    .toast-info {
      border-left: 4px solid #3498db;
    }
    
    .toast-icon {
      margin-right: 12px;
      font-size: 1.2rem;
    }
    
    .toast-message {
      flex: 1;
    }
    
    .toast-close {
      background: none;
      border: none;
      font-size: 1.2rem;
      cursor: pointer;
      color: #95a5a6;
      padding: 0 5px;
    }
    
    /* Focus Backdrop */
    .focus-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .focus-content {
      background-color: white;
      padding: 25px;
      border-radius: 8px;
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
    }
    
    /* File Upload Animation */
    .upload-animation {
      overflow: hidden;
    }
    
    .upload-animation-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 10px 0;
    }
    
    .upload-animation-file {
      width: 30px;
      height: 40px;
      background-color: #f5f5f5;
      border: 2px solid #3498db;
      border-radius: 3px;
      position: relative;
      animation: moveFile 2s infinite;
    }
    
    .upload-animation-file::before {
      content: "";
      position: absolute;
      top: 5px;
      left: 5px;
      width: 15px;
      height: 2px;
      background-color: #3498db;
      box-shadow: 0 5px 0 #3498db, 0 10px 0 #3498db;
    }
    
    .upload-animation-arrow {
      width: 80px;
      height: 2px;
      background-color: #3498db;
      margin: 0 15px;
      position: relative;
    }
    
    .upload-animation-arrow::after {
      content: "";
      position: absolute;
      right: 0;
      top: -4px;
      width: 10px;
      height: 10px;
      border-top: 2px solid #3498db;
      border-right: 2px solid #3498db;
      transform: rotate(45deg);
    }
    
    .upload-animation-server {
      width: 40px;
      height: 50px;
      background-color: #f5f5f5;
      border: 2px solid #3498db;
      border-radius: 5px;
      position: relative;
    }
    
    .upload-animation-server::before,
    .upload-animation-server::after {
      content: "";
      position: absolute;
      width: 10px;
      height: 2px;
      background-color: #3498db;
      left: 50%;
      transform: translateX(-50%);
    }
    
    .upload-animation-server::before {
      top: 10px;
      width: 15px;
    }
    
    .upload-animation-server::after {
      top: 15px;
      width: 20px;
    }
    
    @keyframes moveFile {
      0%, 100% { transform: translateX(0); }
      50% { transform: translateX(10px); }
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(0.5); opacity: 0.5; }
      50% { transform: scale(1); opacity: 1; }
    }
    
    @media (prefers-color-scheme: dark) {
      .loader-default .spinner {
        border-color: rgba(52, 152, 219, 0.2);
        border-top-color: #3498db;
      }
      
      .loader-processing .document {
        background-color: #34495e;
        border-color: #3498db;
      }
      
      .toast-notification {
        background-color: #2c3e50;
        color: #ecf0f1;
      }
      
      .focus-content {
        background-color: #2c3e50;
        color: #ecf0f1;
      }
      
      .upload-animation-file,
      .upload-animation-server {
        background-color: #34495e;
      }
    }
  `}</style>
);

export default {
  Confetti,
  Loader,
  Toast,
  PageTransition,
  FocusBackdrop,
  FileUploadAnimation,
  AnimationStyles
};