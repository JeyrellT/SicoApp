import React, { useState } from 'react';
import { CategoryAnalysis } from '../../services/CategoryAnalysisService';

const formatMoney = (amount: number) => 
  new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(amount);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

// Función para resaltar palabras clave en verde
const highlightKeywords = (text: string, keywords: string[]) => {
  if (!keywords || keywords.length === 0) return [{ text, highlighted: false }];
  
  const parts: Array<{ text: string; highlighted: boolean }> = [];
  let lastIndex = 0;
  
  const pattern = new RegExp(
    `(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  );
  
  const matches = [...text.matchAll(pattern)];
  
  matches.forEach(match => {
    if (match.index !== undefined) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), highlighted: false });
      }
      parts.push({ text: match[0], highlighted: true });
      lastIndex = match.index + match[0].length;
    }
  });
  
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlighted: false });
  }
  
  return parts.length > 0 ? parts : [{ text, highlighted: false }];
};

const badge: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
  margin: '2px 4px'
};

const modernCard: React.CSSProperties = {
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  borderRadius: 12,
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  border: '1px solid rgba(226, 232, 240, 0.8)',
  padding: 24,
  marginBottom: 20,
  transition: 'all 0.3s ease'
};

interface DetailedCategoryModalProps {
  category: CategoryAnalysis;
  onClose: () => void;
}

export default function DetailedCategoryModal({ category, onClose }: DetailedCategoryModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(category.ejemplos.length / itemsPerPage);
  
  const currentExamples = category.ejemplos.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const modalOverlay: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 20
  };

  const modalContent: React.CSSProperties = {
    background: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 1200,
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    position: 'relative'
  };

  const headerStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    color: 'white',
    padding: 24,
    borderRadius: '16px 16px 0 0',
    position: 'sticky',
    top: 0,
    zIndex: 10
  };

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: 28, fontWeight: 700 }}>
                {category.categoria}
              </h2>
              <div style={{ display: 'flex', gap: 16, opacity: 0.95 }}>
                <span>📊 {category.totalLineas.toLocaleString()} licitaciones</span>
                <span>💰 {formatMoney(category.montoTotal)}</span>
                <span>📈 {formatPercent(category.porcentaje)} del total</span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                fontSize: 32,
                cursor: 'pointer',
                borderRadius: '50%',
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {/* Info de palabras clave */}
          <div style={{
            ...modernCard,
            background: 'linear-gradient(135deg, #ecfccb 0%, #d9f99d 100%)',
            marginBottom: 24
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 700, color: '#365314' }}>
              🔍 Palabras Clave que Definen esta Categoría
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Array.from(new Set(category.ejemplos.flatMap(e => e.palabrasCoincidentes))).map(palabra => (
                <span key={palabra} style={{
                  ...badge,
                  background: '#22c55e',
                  color: 'white',
                  fontSize: 14,
                  padding: '8px 16px',
                  fontWeight: 700,
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  {palabra}
                </span>
              ))}
            </div>
          </div>

          {/* Ejemplos con paginación */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                📋 Ejemplos de Licitaciones Clasificadas
              </h3>
              <div style={{ fontSize: 14, color: '#6b7280' }}>
                Mostrando {currentPage * itemsPerPage + 1} - {Math.min((currentPage + 1) * itemsPerPage, category.ejemplos.length)} de {category.ejemplos.length}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              {currentExamples.map((ejemplo, i) => (
                <div key={i} style={{
                  background: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 20,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 14
                      }}>
                        {ejemplo.numeroCartel}
                      </span>
                      <span style={{
                        background: '#f3f4f6',
                        color: '#374151',
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        {ejemplo.codigoInstitucion}
                      </span>
                    </div>
                    {ejemplo.presupuestoLinea && (
                      <span style={{
                        background: '#dcfce7',
                        color: '#166534',
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 14
                      }}>
                        {formatMoney(ejemplo.presupuestoLinea)}
                      </span>
                    )}
                  </div>

                  {/* Descripción con palabras resaltadas */}
                  <div style={{
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: '#1f2937',
                    marginBottom: 12,
                    background: '#f9fafb',
                    padding: 16,
                    borderRadius: 8,
                    borderLeft: '4px solid #22c55e'
                  }}>
                    {highlightKeywords(ejemplo.descripcionLinea, ejemplo.palabrasCoincidentes).map((part, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: part.highlighted ? '#22c55e' : 'transparent',
                          color: part.highlighted ? 'white' : '#1f2937',
                          fontWeight: part.highlighted ? 700 : 400,
                          padding: part.highlighted ? '2px 6px' : '0',
                          borderRadius: part.highlighted ? 4 : 0,
                          boxShadow: part.highlighted ? '0 2px 4px rgba(34, 197, 94, 0.3)' : 'none'
                        }}
                      >
                        {part.text}
                      </span>
                    ))}
                  </div>

                  {/* Palabras coincidentes */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                      Palabras clave detectadas:
                    </span>
                    {ejemplo.palabrasCoincidentes.map(palabra => (
                      <span key={palabra} style={{
                        ...badge,
                        background: '#22c55e',
                        color: 'white',
                        fontSize: 11,
                        padding: '4px 10px'
                      }}>
                        ✓ {palabra}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 12,
                marginTop: 24,
                padding: 20,
                background: '#f9fafb',
                borderRadius: 12
              }}>
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  style={{
                    background: currentPage === 0 ? '#e5e7eb' : '#3b82f6',
                    color: currentPage === 0 ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 14
                  }}
                >
                  ← Anterior
                </button>
                
                <div style={{ display: 'flex', gap: 6 }}>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i;
                    } else if (currentPage < 3) {
                      pageNum = i;
                    } else if (currentPage > totalPages - 4) {
                      pageNum = totalPages - 7 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          background: currentPage === pageNum ? '#3b82f6' : 'white',
                          color: currentPage === pageNum ? 'white' : '#374151',
                          border: currentPage === pageNum ? 'none' : '1px solid #d1d5db',
                          borderRadius: 8,
                          padding: '8px 14px',
                          cursor: 'pointer',
                          fontWeight: currentPage === pageNum ? 700 : 600,
                          fontSize: 14,
                          minWidth: 40
                        }}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  style={{
                    background: currentPage === totalPages - 1 ? '#e5e7eb' : '#3b82f6',
                    color: currentPage === totalPages - 1 ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 14
                  }}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: 24,
          borderTop: '2px solid #e5e7eb',
          background: '#f9fafb',
          borderRadius: '0 0 16px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: 14, color: '#6b7280' }}>
            💡 Las palabras en <span style={{
              background: '#22c55e',
              color: 'white',
              padding: '2px 8px',
              borderRadius: 4,
              fontWeight: 700
            }}>verde</span> son las que identificaron esta categoría
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 16
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
