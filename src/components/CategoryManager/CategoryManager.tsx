import React, { useMemo, useState } from 'react';
import _ from 'lodash';
import { useSicop } from '../../context/SicopContext';
import { CategoryService } from '../../services/CategoryService';
import { ManualCategoryRule, CategoryGroup } from '../../types/categories';
import CategoryAnalysisView from './CategoryAnalysisView';
import KeywordTestingPanel from './KeywordTestingPanel';
import ManualCategoryEditorNew from './ManualCategoryEditorNew';
import { CategoryConfigView } from './CategoryConfigView';

const randomId = () => Math.random().toString(36).slice(2, 10);

const pill: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 8px',
  background: '#eef2ff',
  color: '#3730a3',
  borderRadius: 8,
  margin: '2px 6px 2px 0',
  fontSize: 12
};

const btn = (primary = false): React.CSSProperties => ({
  background: primary ? '#2563eb' : '#e5e7eb',
  color: primary ? '#fff' : '#111827',
  border: 'none',
  borderRadius: 6,
  padding: '8px 12px',
  cursor: 'pointer',
  marginRight: 8
});

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
  padding: 16,
  marginBottom: 12
};

export default function CategoryManager() {
  const { instituciones } = useSicop();
  const [rules, setRules] = useState<ManualCategoryRule[]>(CategoryService.getAllRules());
  const [groups, setGroups] = useState<CategoryGroup[]>(CategoryService.getAllGroups());
  const [activeTab, setActiveTab] = useState<'analysis' | 'manual' | 'testing' | 'config'>('analysis');

  const institucionesOptions = useMemo(() => {
    return (instituciones || []).map(i => ({ value: i.codigoInstitucion, label: `${i.codigoInstitucion} - ${i.nombreInstitucion}` }));
  }, [instituciones]);

  const startNew = (): ManualCategoryRule => {
    return { id: randomId(), nombre: '', descripcion: '', palabrasClave: [], instituciones: [], activo: true, color: '#3b82f6' };
  };

  const removeRule = (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    CategoryService.saveRules(updated);
  };

  const addRuleToGroup = (groupId: string, ruleId: string) => {
    const updated = groups.map(g => g.id === groupId ? { ...g, categorias: _.uniq([...(g.categorias || []), ruleId]) } : g);
    setGroups(updated);
    CategoryService.saveGroups(updated);
  };

  const removeRuleFromGroup = (groupId: string, ruleId: string) => {
    const updated = groups.map(g => g.id === groupId ? { ...g, categorias: (g.categorias || []).filter(id => id !== ruleId) } : g);
    setGroups(updated);
    CategoryService.saveGroups(updated);
  };

  const addRuleFromTesting = (keywords: string[], name: string) => {
    const newRule: ManualCategoryRule = {
      id: randomId(),
      nombre: name,
      descripcion: `Categoría creada desde panel de pruebas con ${keywords.length} palabras clave`,
      palabrasClave: keywords,
      instituciones: [],
      activo: true,
      color: '#3b82f6'
    };
    
    const updated = [...rules, newRule];
    setRules(updated);
    CategoryService.saveRules(updated);
    
    // Cambiar a la pestaña de categorías manuales para ver el resultado
    setActiveTab('manual');
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '12px 24px',
    backgroundColor: isActive ? '#3b82f6' : 'transparent',
    color: isActive ? 'white' : '#6b7280',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '8px 8px 0 0',
    fontWeight: 600,
    fontSize: 14,
    transition: 'all 0.3s ease'
  });

  return (
    <div>
      {/* Navigation Tabs */}
      <div style={{ marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        <button 
          style={tabStyle(activeTab === 'analysis')}
          onClick={() => setActiveTab('analysis')}
        >
          📊 Análisis del Sistema
        </button>
        <button 
          style={tabStyle(activeTab === 'manual')}
          onClick={() => setActiveTab('manual')}
        >
          🏷️ Categorías Manuales
        </button>
        <button 
          style={tabStyle(activeTab === 'testing')}
          onClick={() => setActiveTab('testing')}
        >
          🧪 Panel de Pruebas
        </button>
        <button 
          style={tabStyle(activeTab === 'config')}
          onClick={() => setActiveTab('config')}
        >
          ⚙️ Configuración
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'analysis' && (
        <CategoryAnalysisView />
      )}

      {activeTab === 'manual' && (
        <ManualCategoryEditorNew
          rules={rules}
          groups={groups}
          institucionesOptions={institucionesOptions}
          onStartNew={startNew}
          onSaveRule={(rule) => {
            const isNew = !rules.find(r => r.id === rule.id);
            const updated = isNew ? [...rules, rule] : rules.map(r => r.id === rule.id ? rule : r);
            setRules(updated);
            CategoryService.saveRules(updated);
          }}
          onRemoveRule={removeRule}
          onCreateGroup={(name: string) => {
            const g: CategoryGroup = { id: randomId(), nombre: name || 'Nuevo grupo', categorias: [], descripcion: '' };
            const updated = [...groups, g];
            setGroups(updated);
            CategoryService.saveGroups(updated);
          }}
          onAddRuleToGroup={addRuleToGroup}
          onRemoveRuleFromGroup={removeRuleFromGroup}
        />
      )}

      {activeTab === 'testing' && (
        <KeywordTestingPanel onSaveCategory={addRuleFromTesting} />
      )}

      {activeTab === 'config' && (
        <CategoryConfigView />
      )}
    </div>
  );
}