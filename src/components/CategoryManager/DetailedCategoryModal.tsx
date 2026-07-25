import React from 'react';
import { formatMoney, formatPercent, modernCard } from './categoryStyles';
import type { CategoriaAgrupada } from './types';

const badge: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 600,
  margin: '2px 4px'
};

interface DetailedCategoryModalProps {
  category: CategoriaAgrupada;
  onClose: () => void;
}

export default function DetailedCategoryModal({ category, onClose }: DetailedCategoryModalProps) {
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
    maxWidth: 1000,
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

  const detalleOrdenado = category.detalle.slice().sort((a, b) => b.monto_crc - a.monto_crc);

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: 28, fontWeight: 700 }}>{category.nombre}</h2>
              <div style={{ display: 'flex', gap: 16, opacity: 0.95, flexWrap: 'wrap' }}>
                <span>{category.lineas.toLocaleString()} líneas adjudicadas</span>
                <span>{formatMoney(category.montoCrc)}</span>
                <span>{formatPercent(category.participacionPct)} del total mostrado</span>
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
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <div
            style={{
              ...modernCard,
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              marginBottom: 24
            }}
          >
            <div style={{ fontSize: 14, color: '#1e3a8a', lineHeight: 1.6 }}>
              Esta categoría se calcula a partir de los agregados por objeto de gasto que expone el backend
              (<code>GET /v1/dashboard/categorias</code>). No se listan licitaciones individuales porque las
              tablas de detalle de carteles y líneas no están disponibles de forma confiable en el origen de
              datos.
              {category.tipo === 'manual' && (
                <>
                  {' '}
                  Los objetos de gasto listados abajo coinciden con la regla manual{' '}
                  <strong>"{category.nombre}"</strong> y fueron agrupados bajo este nombre.
                </>
              )}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                Objetos de gasto ({detalleOrdenado.length})
              </h3>
              <span
                style={{
                  ...badge,
                  background: category.tipo === 'manual' ? '#f3e8ff' : '#e0e7ff',
                  color: category.tipo === 'manual' ? '#7e22ce' : '#3730a3'
                }}
              >
                {category.tipo === 'manual' ? 'Regla manual' : 'Objeto de gasto'}
              </span>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {detalleOrdenado.map((d) => (
                <div
                  key={d.objeto_gasto}
                  style={{
                    background: '#ffffff',
                    border: '2px solid #e5e7eb',
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 14
                      }}
                    >
                      {d.objeto_gasto}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>{formatMoney(d.monto_crc)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#6b7280', flexWrap: 'wrap' }}>
                    <span>{d.lineas.toLocaleString()} líneas</span>
                    <span>{d.proveedores_distintos.toLocaleString()} proveedores distintos</span>
                    <span>{formatPercent(d.participacion_pct)} del total mostrado</span>
                    {d.monto_usd > 0 && <span>{formatMoney(d.monto_usd).replace('CRC', 'USD')} equivalentes</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: 24,
            borderTop: '2px solid #e5e7eb',
            background: '#f9fafb',
            borderRadius: '0 0 16px 16px',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
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
