/**
 * SICOP Analytics - Estilos y Utilidades Compartidas para CategoryManager
 * 
 * @copyright 2025 Saenz Fallas S.A.
 * HQ Analytics™ - High Technology Quality Analytics
 */

import React from 'react';

// ============================================
// UTILIDADES DE FORMATO
// ============================================

export const formatMoney = (amount: number): string => 
  new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(amount);

export const formatPercent = (value: number): string => 
  `${value.toFixed(1)}%`;

// ============================================
// ESTILOS COMPARTIDOS
// ============================================

export const modernCard: React.CSSProperties = {
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  borderRadius: 12,
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  border: '1px solid rgba(226, 232, 240, 0.8)',
  padding: 24,
  marginBottom: 20,
  transition: 'all 0.3s ease'
};

export const badge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 20,
  fontSize: 13,
  fontWeight: 600,
  margin: '4px 6px 4px 0'
};

export const btn = (variant: 'primary' | 'secondary' | 'danger' = 'secondary'): React.CSSProperties => ({
  background: variant === 'primary' 
    ? 'linear-gradient(135deg, #1e3a8a 0%, #0c4a6e 100%)' 
    : variant === 'danger' 
    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    : '#e5e7eb',
  color: variant !== 'secondary' ? '#fff' : '#111827',
  border: 'none',
  borderRadius: 8,
  padding: '10px 18px',
  cursor: 'pointer',
  marginRight: 10,
  fontWeight: 600,
  fontSize: 14,
  transition: 'all 0.3s ease',
  boxShadow: variant !== 'secondary' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none'
});

// ============================================
// FUNCIÓN PARA RESALTAR PALABRAS CLAVE
// ============================================

export const highlightKeywords = (text: string, keywords: string[]): Array<{ text: string; highlighted: boolean }> => {
  if (!keywords || keywords.length === 0) return [{ text, highlighted: false }];
  
  const parts: Array<{ text: string; highlighted: boolean }> = [];
  let lastIndex = 0;
  
  // Crear patrón regex con todas las palabras clave
  const pattern = new RegExp(
    `(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  );
  
  const matches = [...text.matchAll(pattern)];
  
  matches.forEach(match => {
    if (match.index !== undefined) {
      // Agregar texto antes del match
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), highlighted: false });
      }
      // Agregar el match resaltado
      parts.push({ text: match[0], highlighted: true });
      lastIndex = match.index + match[0].length;
    }
  });
  
  // Agregar texto restante
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlighted: false });
  }
  
  return parts.length > 0 ? parts : [{ text, highlighted: false }];
};
