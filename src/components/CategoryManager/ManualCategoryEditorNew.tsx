import React, { useState, useMemo } from 'react';
import { ManualCategoryRule, CategoryGroup, SubcategoryRule } from '../../types/categories';
import { CategoryService } from '../../services/CategoryService';
import _ from 'lodash';
import { SubcategoryEditor } from './SubcategoryEditor';

const modernCard: React.CSSProperties = {
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  borderRadius: 12,
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  border: '1px solid rgba(226, 232, 240, 0.8)',
  padding: 24,
  marginBottom: 20,
  transition: 'all 0.3s ease'
};

const btn = (variant: 'primary' | 'secondary' | 'danger' = 'secondary'): React.CSSProperties => ({
  background: variant === 'primary' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
             : variant === 'danger' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
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

const badge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 20,
  fontSize: 13,
  fontWeight: 600,
  margin: '4px 6px 4px 0'
};

interface Props {
  rules: ManualCategoryRule[];
  groups: CategoryGroup[];
  institucionesOptions: Array<{ value: string; label: string }>;
  onStartNew: () => ManualCategoryRule;
  onSaveRule: (rule: ManualCategoryRule) => void;
  onRemoveRule: (id: string) => void;
  onCreateGroup: (name: string) => void;
  onAddRuleToGroup: (groupId: string, ruleId: string) => void;
  onRemoveRuleFromGroup: (groupId: string, ruleId: string) => void;
}

export default function ManualCategoryEditorNew({
  rules,
  groups,
  institucionesOptions,
  onStartNew,
  onSaveRule,
  onRemoveRule,
  onCreateGroup,
  onAddRuleToGroup,
  onRemoveRuleFromGroup
}: Props) {
  const [search, setSearch] = useState('');
  const [editingRule, setEditingRule] = useState<ManualCategoryRule | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [previewSuggestions, setPreviewSuggestions] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [editingSubcategories, setEditingSubcategories] = useState<{
    categoryId: string;
    categoryName: string;
    subcategories: SubcategoryRule[];
  } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter(r =>
      r.nombre.toLowerCase().includes(q) ||
      (r.descripcion || '').toLowerCase().includes(q) ||
      r.palabrasClave.some(p => p.toLowerCase().includes(q))
    );
  }, [rules, search]);

  const startEdit = (rule?: ManualCategoryRule) => {
    if (rule) {
      setEditingRule({ ...rule });
    } else {
      setEditingRule(onStartNew());
    }
    setShowPreview(false);
    setPreviewSuggestions([]);
  };

  const cancelEdit = () => {
    setEditingRule(null);
    setShowPreview(false);
    setPreviewSuggestions([]);
  };

  const saveEdit = () => {
    if (!editingRule) return;
    
    if (!editingRule.nombre.trim()) {
      alert('El nombre de la categoría es obligatorio');
      return;
    }

    if (editingRule.palabrasClave.length === 0) {
      alert('Debes agregar al menos una palabra clave');
      return;
    }

    onSaveRule(editingRule);
    setEditingRule(null);
    setShowPreview(false);
    setPreviewSuggestions([]);
  };

  const runPreview = () => {
    if (!editingRule || editingRule.palabrasClave.length === 0) {
      alert('Agrega palabras clave para previsualizar');
      return;
    }

    const suggestions = CategoryService.sugerirDesdeKeywords({
      palabras: editingRule.palabrasClave,
      instituciones: editingRule.instituciones,
      limit: 30
    });

    setPreviewSuggestions(suggestions);
    setShowPreview(true);
  };

  return (
    <div>
      {/* Header con estadísticas */}
      <div style={{
        ...modernCard,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: 28, fontWeight: 700 }}>
              🏷️ Gestión de Categorías Manuales
            </h2>
            <div style={{ opacity: 0.95, fontSize: 16 }}>
              {rules.length} categorías creadas | {groups.length} grupos organizados
            </div>
          </div>
          <button
            onClick={() => startEdit()}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '2px solid white',
              borderRadius: 10,
              padding: '12px 24px',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 700,
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            ➕ Nueva Categoría
          </button>
        </div>
      </div>

      {/* Editor de categoría (si está abierto) */}
      {editingRule && (
        <CategoryEditor
          rule={editingRule}
          onChange={setEditingRule}
          onSave={saveEdit}
          onCancel={cancelEdit}
          onPreview={runPreview}
          showPreview={showPreview}
          previewSuggestions={previewSuggestions}
          institucionesOptions={institucionesOptions}
        />
      )}

      {/* Lista de categorías */}
      {!editingRule && (
        <>
          <div style={modernCard}>
            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                📋 Mis Categorías ({filtered.length})
              </h3>
              <input
                type="text"
                placeholder="🔍 Buscar categorías..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: 1,
                  maxWidth: 400,
                  marginLeft: 20,
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: 10,
                  fontSize: 15,
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              {filtered.map((rule) => (
                <CategoryCard
                  key={rule.id}
                  rule={rule}
                  onEdit={() => startEdit(rule)}
                  onDelete={() => onRemoveRule(rule.id)}
                  onEditSubcategories={() => {
                    setEditingSubcategories({
                      categoryId: rule.id,
                      categoryName: rule.nombre,
                      subcategories: rule.subcategorias || []
                    });
                  }}
                />
              ))}
              
              {filtered.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: 60,
                  color: '#9ca3af'
                }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>
                    {search ? 'No se encontraron categorías' : 'No hay categorías creadas'}
                  </div>
                  <div style={{ fontSize: 14, marginTop: 8 }}>
                    {search ? 'Intenta con otro término de búsqueda' : 'Haz clic en "Nueva Categoría" para comenzar'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Grupos */}
          <GroupsManager
            groups={groups}
            rules={rules}
            onCreateGroup={(name) => {
              onCreateGroup(name);
              setNewGroupName('');
            }}
            onAddRuleToGroup={onAddRuleToGroup}
            onRemoveRuleFromGroup={onRemoveRuleFromGroup}
            newGroupName={newGroupName}
            onSetNewGroupName={setNewGroupName}
          />
        </>
      )}

      {/* Modal de edición de subcategorías */}
      {editingSubcategories && (
        <SubcategoryEditor
          categoryName={editingSubcategories.categoryName}
          subcategories={editingSubcategories.subcategories}
          onSave={async (subcats) => {
            // Encontrar la regla y actualizar
            const rule = rules.find(r => r.id === editingSubcategories.categoryId);
            if (rule) {
              const updatedRule = { ...rule, subcategorias: subcats };
              onSaveRule(updatedRule);
            }
            setEditingSubcategories(null);
          }}
          onCancel={() => setEditingSubcategories(null)}
        />
      )}
    </div>
  );
}

// ========================================
// Componente de tarjeta de categoría
// ========================================
function CategoryCard({ rule, onEdit, onDelete, onEditSubcategories }: {
  rule: ManualCategoryRule;
  onEdit: () => void;
  onDelete: () => void;
  onEditSubcategories: () => void;
}) {
  return (
    <div style={{
      background: 'white',
      border: '2px solid #e5e7eb',
      borderRadius: 12,
      padding: 20,
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = rule.color || '#3b82f6';
      e.currentTarget.style.boxShadow = `0 4px 12px ${rule.color || '#3b82f6'}33`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '#e5e7eb';
      e.currentTarget.style.boxShadow = 'none';
    }}
    onClick={onEdit}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: rule.color || '#3b82f6',
              boxShadow: `0 0 10px ${rule.color || '#3b82f6'}66`
            }} />
            <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1f2937' }}>
              {rule.nombre}
            </h4>
            {!rule.activo && (
              <span style={{
                ...badge,
                background: '#fef2f2',
                color: '#991b1b',
                fontSize: 11
              }}>
                Inactiva
              </span>
            )}
          </div>
          {rule.descripcion && (
            <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 12 }}>
              {rule.descripcion}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onEdit}
            style={{
              ...btn('primary'),
              padding: '8px 16px',
              marginRight: 0
            }}
          >
            ✏️ Editar
          </button>
          <button
            onClick={onEditSubcategories}
            style={{
              ...btn('secondary'),
              padding: '8px 16px',
              marginRight: 0,
              fontSize: 12
            }}
          >
            📑 Subcategorías {rule.subcategorias && rule.subcategorias.length > 0 ? `(${rule.subcategorias.length})` : ''}
          </button>
          <button
            onClick={onDelete}
            style={{
              ...btn('danger'),
              padding: '8px 16px',
              marginRight: 0
            }}
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Palabras clave */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
          PALABRAS CLAVE ({rule.palabrasClave.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {rule.palabrasClave.slice(0, 10).map((kw) => (
            <span key={kw} style={{
              ...badge,
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              fontSize: 12,
              padding: '4px 12px',
              margin: 0
            }}>
              {kw}
            </span>
          ))}
          {rule.palabrasClave.length > 10 && (
            <span style={{
              ...badge,
              background: '#f3f4f6',
              color: '#6b7280',
              fontSize: 12,
              padding: '4px 12px',
              margin: 0
            }}>
              +{rule.palabrasClave.length - 10} más
            </span>
          )}
        </div>
      </div>

      {/* Instituciones */}
      {rule.instituciones && rule.instituciones.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
            INSTITUCIONES ({rule.instituciones.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {rule.instituciones.slice(0, 5).map((inst) => (
              <span key={inst} style={{
                ...badge,
                background: '#ecfeff',
                color: '#0e7490',
                fontSize: 11,
                padding: '4px 10px',
                margin: 0
              }}>
                {inst}
              </span>
            ))}
            {rule.instituciones.length > 5 && (
              <span style={{
                ...badge,
                background: '#f3f4f6',
                color: '#6b7280',
                fontSize: 11,
                padding: '4px 10px',
                margin: 0
              }}>
                +{rule.instituciones.length - 5} más
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// Editor de categoría (Continuará...)
// ========================================
function CategoryEditor({ rule, onChange, onSave, onCancel, onPreview, showPreview, previewSuggestions, institucionesOptions }: {
  rule: ManualCategoryRule;
  onChange: (rule: ManualCategoryRule) => void;
  onSave: () => void;
  onCancel: () => void;
  onPreview: () => void;
  showPreview: boolean;
  previewSuggestions: any[];
  institucionesOptions: Array<{ value: string; label: string }>;
}) {
  const [keywordInput, setKeywordInput] = useState('');
  const [instInput, setInstInput] = useState('');

  const addKeyword = () => {
    const kw = keywordInput.trim().toLowerCase();
    if (!kw) return;
    if (rule.palabrasClave.includes(kw)) {
      alert('Esta palabra clave ya existe');
      return;
    }
    onChange({ ...rule, palabrasClave: [...rule.palabrasClave, kw] });
    setKeywordInput('');
  };

  const removeKeyword = (kw: string) => {
    onChange({ ...rule, palabrasClave: rule.palabrasClave.filter(k => k !== kw) });
  };

  const toggleInstitution = () => {
    if (!instInput) return;
    const insts = rule.instituciones || [];
    const hasIt = insts.includes(instInput);
    
    onChange({
      ...rule,
      instituciones: hasIt
        ? insts.filter(i => i !== instInput)
        : [...insts, instInput]
    });
  };

  return (
    <div style={{
      ...modernCard,
      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      border: '2px solid #3b82f6',
      marginBottom: 24
    }}>
      {/* Header del editor */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 700, color: '#1e40af' }}>
          {rule.id.length > 10 ? '✏️ Editar Categoría' : '➕ Nueva Categoría'}
        </h3>
        <div style={{ color: '#3b82f6', fontSize: 14 }}>
          Completa los campos y haz clic en "Vista Previa" para ver ejemplos
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr', gap: 24 }}>
        {/* Formulario */}
        <div>
          {/* Nombre y color */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                Nombre de la Categoría *
              </label>
              <input
                type="text"
                value={rule.nombre}
                onChange={(e) => onChange({ ...rule, nombre: e.target.value })}
                placeholder="Ej: Equipo de Cómputo"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 600
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                Color
              </label>
              <input
                type="color"
                value={rule.color || '#3b82f6'}
                onChange={(e) => onChange({ ...rule, color: e.target.value })}
                style={{
                  width: 60,
                  height: 46,
                  border: '2px solid #e5e7eb',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>

          {/* Descripción */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
              Descripción (opcional)
            </label>
            <textarea
              value={rule.descripcion || ''}
              onChange={(e) => onChange({ ...rule, descripcion: e.target.value })}
              placeholder="Describe el propósito de esta categoría..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 14,
                resize: 'vertical'
              }}
            />
          </div>

          {/* Palabras clave */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
              Palabras Clave * ({rule.palabrasClave.length})
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                placeholder="Ej: computadora, laptop, pc..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: 14
                }}
              />
              <button onClick={addKeyword} style={btn('primary')}>
                ➕ Agregar
              </button>
            </div>
            
            <div style={{
              minHeight: 80,
              background: 'white',
              border: '2px dashed #d1d5db',
              borderRadius: 8,
              padding: 12,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignContent: 'flex-start'
            }}>
              {rule.palabrasClave.map((kw) => (
                <span key={kw} style={{
                  ...badge,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  margin: 0
                }}
                onClick={() => removeKeyword(kw)}>
                  {kw} <span style={{ marginLeft: 6 }}>×</span>
                </span>
              ))}
              {rule.palabrasClave.length === 0 && (
                <div style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
                  Agrega palabras clave para identificar esta categoría
                </div>
              )}
            </div>
          </div>

          {/* Instituciones */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
              Filtrar por Instituciones (opcional)
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <select
                value={instInput}
                onChange={(e) => setInstInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                <option value="">Selecciona una institución...</option>
                {institucionesOptions.slice(0, 100).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={toggleInstitution}
                disabled={!instInput}
                style={{
                  ...btn('primary'),
                  opacity: instInput ? 1 : 0.5,
                  cursor: instInput ? 'pointer' : 'not-allowed'
                }}
              >
                {rule.instituciones?.includes(instInput) ? '➖ Quitar' : '➕ Agregar'}
              </button>
            </div>

            {rule.instituciones && rule.instituciones.length > 0 && (
              <div style={{
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8
              }}>
                {rule.instituciones.map((inst) => (
                  <span key={inst} style={{
                    ...badge,
                    background: '#ecfeff',
                    color: '#0e7490',
                    cursor: 'pointer',
                    margin: 0
                  }}
                  onClick={() => onChange({ ...rule, instituciones: rule.instituciones!.filter(i => i !== inst) })}>
                    {inst} <span style={{ marginLeft: 6 }}>×</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Estado activo */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rule.activo}
                onChange={(e) => onChange({ ...rule, activo: e.target.checked })}
                style={{ width: 20, height: 20, cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600, color: '#374151' }}>
                Categoría activa
              </span>
            </label>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: 12, paddingTop: 20, borderTop: '2px solid #e5e7eb' }}>
            <button onClick={onSave} style={{ ...btn('primary'), flex: 1, padding: '14px' }}>
              💾 Guardar Categoría
            </button>
            <button onClick={onPreview} style={{ ...btn('secondary'), padding: '14px' }}>
              👁️ Vista Previa
            </button>
            <button onClick={onCancel} style={{ ...btn('secondary'), padding: '14px' }}>
              ❌ Cancelar
            </button>
          </div>
        </div>

        {/* Vista previa */}
        {showPreview && (
          <div>
            <h4 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: '#374151' }}>
              📋 Vista Previa ({previewSuggestions.length} resultados)
            </h4>
            <div style={{
              maxHeight: 600,
              overflow: 'auto',
              background: 'white',
              borderRadius: 8,
              border: '2px solid #e5e7eb',
              padding: 16
            }}>
              {previewSuggestions.slice(0, 20).map((sugg, i) => (
                <div key={i} style={{
                  padding: 12,
                  marginBottom: 12,
                  background: '#f9fafb',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: '#3b82f6' }}>
                    {sugg.numeroCartel}
                  </div>
                  <div style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>
                    {sugg.texto.slice(0, 150)}...
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {sugg.coincidencias.map((c: string) => (
                      <span key={c} style={{
                        ...badge,
                        background: '#22c55e',
                        color: 'white',
                        fontSize: 10,
                        padding: '2px 8px',
                        margin: 0
                      }}>
                        ✓ {c}
                      </span>
                    ))}
                    <span style={{
                      ...badge,
                      background: '#fef3c7',
                      color: '#92400e',
                      fontSize: 10,
                      padding: '2px 8px',
                      margin: 0
                    }}>
                      {(sugg.score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}

              {previewSuggestions.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                  <div>No se encontraron resultados con estas palabras clave</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// Gestor de grupos
// ========================================
function GroupsManager({ groups, rules, onCreateGroup, onAddRuleToGroup, onRemoveRuleFromGroup, newGroupName, onSetNewGroupName }: {
  groups: CategoryGroup[];
  rules: ManualCategoryRule[];
  onCreateGroup: (name: string) => void;
  onAddRuleToGroup: (groupId: string, ruleId: string) => void;
  onRemoveRuleFromGroup: (groupId: string, ruleId: string) => void;
  newGroupName: string;
  onSetNewGroupName: (name: string) => void;
}) {
  return (
    <div style={modernCard}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 700 }}>
        📁 Grupos de Categorías
      </h3>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => onSetNewGroupName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onCreateGroup(newGroupName)}
          placeholder="Nombre del nuevo grupo..."
          style={{
            flex: 1,
            padding: '12px 16px',
            border: '2px solid #e5e7eb',
            borderRadius: 8,
            fontSize: 14
          }}
        />
        <button
          onClick={() => onCreateGroup(newGroupName)}
          style={btn('primary')}
        >
          ➕ Crear Grupo
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {groups.map((group) => (
          <div key={group.id} style={{
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: 12,
            padding: 16
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#1f2937' }}>
              📁 {group.nombre}
            </h4>

            <div style={{ marginBottom: 12 }}>
              {(group.categorias || []).map((ruleId) => {
                const rule = rules.find(r => r.id === ruleId);
                if (!rule) return null;
                return (
                  <span key={ruleId} style={{
                    ...badge,
                    background: '#ecfccb',
                    color: '#3f6212',
                    cursor: 'pointer',
                    margin: '4px 4px 4px 0'
                  }}
                  onClick={() => onRemoveRuleFromGroup(group.id, ruleId)}>
                    {rule.nombre} <span style={{ marginLeft: 6 }}>×</span>
                  </span>
                );
              })}
              {(group.categorias || []).length === 0 && (
                <div style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
                  Sin categorías asignadas
                </div>
              )}
            </div>

            <select
              onChange={(e) => {
                if (e.target.value) {
                  onAddRuleToGroup(group.id, e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '2px solid #e5e7eb',
                borderRadius: 6,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              <option value="" disabled>➕ Añadir categoría...</option>
              {rules
                .filter(r => !(group.categorias || []).includes(r.id))
                .map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))
              }
            </select>
          </div>
        ))}

        {groups.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: 40,
            color: '#9ca3af'
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
            <div>No hay grupos creados</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              Crea grupos para organizar tus categorías
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
