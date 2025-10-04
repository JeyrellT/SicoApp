import React, { useState } from 'react';
import { SubcategoryRule } from '../../types/categories';
import { Plus, Trash2, Save, X, ToggleLeft, ToggleRight } from 'lucide-react';

interface SubcategoryEditorProps {
  categoryName: string;
  subcategories: SubcategoryRule[];
  onSave: (subcategories: SubcategoryRule[]) => void;
  onCancel: () => void;
}

export const SubcategoryEditor: React.FC<SubcategoryEditorProps> = ({
  categoryName,
  subcategories: initialSubcategories,
  onSave,
  onCancel
}) => {
  const [subcategories, setSubcategories] = useState<SubcategoryRule[]>(
    initialSubcategories.length > 0
      ? initialSubcategories
      : []
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  const generateId = () => `subcat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const handleAddSubcategory = () => {
    const newSubcat: SubcategoryRule = {
      id: generateId(),
      nombre: '',
      palabrasClave: [],
      activa: true
    };
    setSubcategories([...subcategories, newSubcat]);
    setEditingId(newSubcat.id);
  };

  const handleUpdateSubcategory = (id: string, updates: Partial<SubcategoryRule>) => {
    setSubcategories(subcategories.map(sub =>
      sub.id === id ? { ...sub, ...updates } : sub
    ));
  };

  const handleDeleteSubcategory = (id: string) => {
    setSubcategories(subcategories.filter(sub => sub.id !== id));
  };

  const handleToggleActive = (id: string) => {
    setSubcategories(subcategories.map(sub =>
      sub.id === id ? { ...sub, activa: !sub.activa } : sub
    ));
  };

  const handleSave = () => {
    // Validar que todas las subcategorías tengan nombre
    const valid = subcategories.every(sub => sub.nombre.trim() !== '');
    if (!valid) {
      alert('Todas las subcategorías deben tener un nombre');
      return;
    }
    onSave(subcategories);
  };

  const handleKeywordsChange = (id: string, value: string) => {
    const keywords = value
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
    handleUpdateSubcategory(id, { palabrasClave: keywords });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
              Editar Subcategorías
            </h2>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              Categoría: <strong>{categoryName}</strong>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            <X size={24} color="#666" />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px'
        }}>
          {/* Instrucciones */}
          <div style={{
            background: '#e3f2fd',
            border: '1px solid #2196f3',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            fontSize: '14px'
          }}>
            <strong>💡 Subcategorías:</strong> Permiten una clasificación más detallada dentro de esta categoría.
            Define palabras clave específicas para cada subcategoría.
          </div>

          {/* Botón agregar */}
          <button
            onClick={handleAddSubcategory}
            style={{
              width: '100%',
              padding: '12px',
              background: '#f0f0f0',
              border: '2px dashed #ccc',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: '#666',
              fontWeight: 600,
              marginBottom: '16px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e0e0e0';
              e.currentTarget.style.borderColor = '#999';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f0f0f0';
              e.currentTarget.style.borderColor = '#ccc';
            }}
          >
            <Plus size={20} />
            Agregar Subcategoría
          </button>

          {/* Lista de subcategorías */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {subcategories.length === 0 ? (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#999',
                fontSize: '14px'
              }}>
                No hay subcategorías definidas. Haz clic en "Agregar Subcategoría" para crear una.
              </div>
            ) : (
              subcategories.map((subcat) => (
                <div
                  key={subcat.id}
                  style={{
                    background: subcat.activa ? 'white' : '#f8f9fa',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '16px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                    {/* Toggle activa/inactiva */}
                    <button
                      onClick={() => handleToggleActive(subcat.id)}
                      style={{
                        background: subcat.activa ? '#27ae60' : '#95a5a6',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0
                      }}
                    >
                      {subcat.activa ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      {subcat.activa ? 'ON' : 'OFF'}
                    </button>

                    {/* Contenido */}
                    <div style={{ flex: 1 }}>
                      {/* Nombre */}
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#666',
                          marginBottom: '4px'
                        }}>
                          Nombre de Subcategoría
                        </label>
                        <input
                          type="text"
                          value={subcat.nombre}
                          onChange={(e) => handleUpdateSubcategory(subcat.id, { nombre: e.target.value })}
                          placeholder="Ej: Software de Oficina"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>

                      {/* Palabras clave */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#666',
                          marginBottom: '4px'
                        }}>
                          Palabras Clave (separadas por comas)
                        </label>
                        <input
                          type="text"
                          value={subcat.palabrasClave.join(', ')}
                          onChange={(e) => handleKeywordsChange(subcat.id, e.target.value)}
                          placeholder="office, word, excel, powerpoint"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                        {subcat.palabrasClave.length > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {subcat.palabrasClave.map((kw, i) => (
                              <span
                                key={i}
                                style={{
                                  background: '#e0e0e0',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  color: '#333'
                                }}
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botón eliminar */}
                    <button
                      onClick={() => handleDeleteSubcategory(subcat.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#e74c3c',
                        padding: '8px',
                        flexShrink: 0
                      }}
                      title="Eliminar subcategoría"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '24px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              background: '#e0e0e0',
              color: '#333',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <X size={18} />
            Cancelar
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              background: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Save size={18} />
            Guardar Subcategorías
          </button>
        </div>
      </div>
    </div>
  );
};
