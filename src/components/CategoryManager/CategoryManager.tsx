import React, { useMemo, useState, useEffect, Suspense, lazy } from 'react';
import _ from 'lodash';
import { useSicop } from '../../context/SicopContext';
import { CategoryService } from '../../services/CategoryService';
import { ManualCategoryRule, CategoryGroup } from '../../types/categories';
import CategoryAnalysisView from './CategoryAnalysisView';

// Lazy load components that are heavy
const KeywordTestingPanel = lazy(() => import('./KeywordTestingPanel'));
const ManualCategoryEditorNew = lazy(() => import('./ManualCategoryEditorNew'));
const CategoryConfigView = lazy(() => import('./CategoryConfigView').then(module => ({ default: module.CategoryConfigView })));

const randomId = () => Math.random().toString(36).slice(2, 10);

export default function CategoryManager() {
  const { instituciones } = useSicop();
  const [rules, setRules] = useState<ManualCategoryRule[]>([]);
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [activeTab, setActiveTab] = useState<'analysis' | 'manual' | 'testing' | 'config'>('analysis');
  const [isLoading, setIsLoading] = useState(true);

  // Load data asynchronously to avoid blocking
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Use setTimeout to defer loading and avoid blocking UI
        await new Promise(resolve => setTimeout(resolve, 100));
        const loadedRules = CategoryService.getAllRules();
        const loadedGroups = CategoryService.getAllGroups();
        setRules(loadedRules);
        setGroups(loadedGroups);
      } catch (error) {
        console.error('[CategoryManager] Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

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
    
    // Disparar evento para actualizar análisis y dashboard
    window.dispatchEvent(new CustomEvent('manualCategoriesUpdated', { 
      detail: { 
        isNew: true, 
        category: newRule,
        timestamp: Date.now() 
      } 
    }));
    
    // Cambiar a la pestaña de categorías manuales
    setActiveTab('manual');
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '18px 36px',
    background: isActive 
      ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.9) 50%, rgba(79, 172, 254, 0.85) 100%)'
      : 'rgba(255, 255, 255, 0.05)',
    backdropFilter: isActive ? 'blur(20px) saturate(180%)' : 'blur(10px)',
    WebkitBackdropFilter: isActive ? 'blur(20px) saturate(180%)' : 'blur(10px)',
    color: isActive ? 'white' : 'rgba(255, 255, 255, 0.6)',
    border: isActive ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    borderRadius: '16px 16px 0 0',
    fontWeight: isActive ? 700 : 600,
    fontSize: 15,
    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    boxShadow: isActive 
      ? `
        0 -4px 20px rgba(102, 126, 234, 0.4),
        0 -2px 10px rgba(118, 75, 162, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.4),
        inset 0 -1px 0 rgba(0, 0, 0, 0.2)
      ` 
      : '0 2px 8px rgba(0, 0, 0, 0.1)',
    textShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.3)' : 'none',
    transform: isActive ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
    position: 'relative' as const,
    overflow: 'hidden',
    willChange: 'transform, background, box-shadow'
  });

  // Loading indicator component
  const LoadingSpinner = () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: '40px',
      minHeight: '200px'
    }}>
      <div className="spinner" style={{
        width: '40px',
        height: '40px',
        border: '4px solid #e5e7eb',
        borderTop: '4px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }}></div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 50%, #475569 75%, #64748b 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Particles */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.4
      }}>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${Math.random() * 6 + 2}px`,
              height: `${Math.random() * 6 + 2}px`,
              background: `radial-gradient(circle, ${['#667eea', '#764ba2', '#f093fb', '#4facfe'][i % 4]} 0%, transparent 70%)`,
              borderRadius: '50%',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `floatParticle${i % 4} ${15 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
              willChange: 'transform'
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes floatParticle0 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(100px, -100px) rotate(90deg); }
          50% { transform: translate(200px, 0) rotate(180deg); }
          75% { transform: translate(100px, 100px) rotate(270deg); }
        }
        @keyframes floatParticle1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(-80px, 120px) rotate(120deg) scale(1.2); }
          66% { transform: translate(80px, -80px) rotate(240deg) scale(0.8); }
        }
        @keyframes floatParticle2 {
          0%, 100% { transform: translate(0, 0) rotate(360deg); }
          50% { transform: translate(-150px, 150px) rotate(0deg); }
        }
        @keyframes floatParticle3 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          25% { transform: translate(120px, 60px) scale(1.3) rotate(90deg); }
          50% { transform: translate(-60px, 120px) scale(0.7) rotate(180deg); }
          75% { transform: translate(-120px, -60px) scale(1.1) rotate(270deg); }
        }
        @keyframes shimmerBorder {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulseGlow {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.4), 
                        0 0 40px rgba(118, 75, 162, 0.3),
                        0 0 60px rgba(240, 147, 251, 0.2),
                        inset 0 0 20px rgba(255, 255, 255, 0.1);
          }
          50% { 
            box-shadow: 0 0 30px rgba(102, 126, 234, 0.6), 
                        0 0 60px rgba(118, 75, 162, 0.5),
                        0 0 90px rgba(240, 147, 251, 0.3),
                        inset 0 0 30px rgba(255, 255, 255, 0.15);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px) translateZ(-50px);
          }
          to {
            opacity: 1;
            transform: translateY(0) translateZ(0);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9) rotateX(10deg);
          }
          to {
            opacity: 1;
            transform: scale(1) rotateX(0deg);
          }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg) scale(1); }
          50% { transform: rotate(3deg) scale(1.05); }
        }
      `}</style>

      {/* Header Principal con Glassmorphism */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 25%, rgba(79, 172, 254, 0.9) 50%, rgba(0, 242, 254, 0.85) 75%, rgba(102, 126, 234, 0.9) 100%)',
        backdropFilter: 'blur(25px) saturate(180%)',
        WebkitBackdropFilter: 'blur(25px) saturate(180%)',
        padding: '70px 80px',
        marginBottom: '40px',
        boxShadow: `
          0 20px 60px rgba(102, 126, 234, 0.4),
          0 10px 30px rgba(118, 75, 162, 0.3),
          0 5px 15px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.4),
          inset 0 -1px 0 rgba(0, 0, 0, 0.2)
        `,
        borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
        position: 'relative',
        overflow: 'hidden',
        perspective: '2000px',
        transformStyle: 'preserve-3d',
        animation: 'fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        willChange: 'transform, opacity'
      }}>
        {/* Shimmer Border Effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent)',
          backgroundSize: '200% 100%',
          animation: 'shimmerBorder 3s linear infinite',
          willChange: 'background-position'
        }} />

        {/* Multi-layer Gradient Background */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 30%, rgba(102, 126, 234, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 80% 60%, rgba(240, 147, 251, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(79, 172, 254, 0.35) 0%, transparent 50%),
            radial-gradient(circle at 60% 20%, rgba(118, 75, 162, 0.3) 0%, transparent 50%),
            linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(240, 147, 251, 0.1) 100%)
          `,
          pointerEvents: 'none',
          mixBlendMode: 'overlay',
          animation: 'pulseGlow 4s ease-in-out infinite',
          willChange: 'box-shadow'
        }} />

        <div style={{ 
          position: 'relative', 
          zIndex: 1, 
          textAlign: 'center',
          transform: 'translateZ(50px)',
          transformStyle: 'preserve-3d'
        }}>
          <h1 style={{ 
            margin: '0 0 16px 0', 
            color: 'white', 
            fontSize: '4.5em', 
            fontWeight: '900',
            textShadow: `
              0 2px 4px rgba(0, 0, 0, 0.3),
              0 4px 8px rgba(0, 0, 0, 0.2),
              0 8px 16px rgba(0, 0, 0, 0.1),
              0 0 40px rgba(255, 255, 255, 0.3)
            `,
            letterSpacing: '-2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            transform: 'translateZ(30px)',
            animation: 'scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both',
            willChange: 'transform'
          }}>
            <span 
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.2) rotate(10deg)';
                e.currentTarget.style.filter = 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.8))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                e.currentTarget.style.filter = 'none';
              }}
              style={{ 
                fontSize: '1.1em',
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                display: 'inline-block',
                animation: 'wiggle 3s ease-in-out infinite',
                willChange: 'transform'
              }}
            >
              🏷️
            </span>
            Gestión de Categorías
          </h1>
          <p style={{ 
            margin: 0, 
            color: 'rgba(255, 255, 255, 0.95)', 
            fontSize: '1.32em', 
            fontWeight: '600',
            textShadow: `
              0 1px 2px rgba(0, 0, 0, 0.3),
              0 2px 4px rgba(0, 0, 0, 0.2),
              0 0 20px rgba(255, 255, 255, 0.2)
            `,
            letterSpacing: '0.5px',
            transform: 'translateZ(20px)',
            animation: 'fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both',
            willChange: 'transform, opacity'
          }}>
            Sistema de clasificación y análisis de licitaciones
          </p>
        </div>
      </div>

      {/* Navigation Tabs con Glassmorphism */}
      <div style={{ 
        marginBottom: 40,
        borderBottom: '2px solid rgba(102, 126, 234, 0.2)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.5) 100%)',
        backdropFilter: 'blur(15px) saturate(150%)',
        WebkitBackdropFilter: 'blur(15px) saturate(150%)',
        boxShadow: `
          0 4px 16px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.1)
        `,
        padding: '0 80px',
        position: 'relative',
        zIndex: 10,
        perspective: '1500px',
        transformStyle: 'preserve-3d',
        animation: 'fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both',
        willChange: 'transform, opacity'
      }}>
        <button 
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px) scale(1.05) rotateX(5deg)';
            e.currentTarget.style.boxShadow = `
              0 -8px 30px rgba(102, 126, 234, 0.6),
              0 -4px 15px rgba(118, 75, 162, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.5)
            `;
          }}
          onMouseLeave={(e) => {
            const isActive = activeTab === 'analysis';
            e.currentTarget.style.transform = isActive ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = isActive 
              ? `0 -4px 20px rgba(102, 126, 234, 0.4), 0 -2px 10px rgba(118, 75, 162, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.2)` 
              : '0 2px 8px rgba(0, 0, 0, 0.1)';
          }} 
          style={tabStyle(activeTab === 'analysis')}
          onClick={() => setActiveTab('analysis')}
        >
          <span style={{ marginRight: '8px', fontSize: '1.1em' }}>📊</span> 
          Análisis del Sistema
        </button>
        <button 
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px) scale(1.05) rotateX(5deg)';
            e.currentTarget.style.boxShadow = `
              0 -8px 30px rgba(102, 126, 234, 0.6),
              0 -4px 15px rgba(118, 75, 162, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.5)
            `;
          }}
          onMouseLeave={(e) => {
            const isActive = activeTab === 'manual';
            e.currentTarget.style.transform = isActive ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = isActive 
              ? `0 -4px 20px rgba(102, 126, 234, 0.4), 0 -2px 10px rgba(118, 75, 162, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.2)` 
              : '0 2px 8px rgba(0, 0, 0, 0.1)';
          }}
          style={tabStyle(activeTab === 'manual')}
          onClick={() => setActiveTab('manual')}
        >
          <span style={{ marginRight: '8px', fontSize: '1.1em' }}>🏷️</span>
          Categorías Manuales
        </button>
        <button 
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px) scale(1.05) rotateX(5deg)';
            e.currentTarget.style.boxShadow = `
              0 -8px 30px rgba(102, 126, 234, 0.6),
              0 -4px 15px rgba(118, 75, 162, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.5)
            `;
          }}
          onMouseLeave={(e) => {
            const isActive = activeTab === 'testing';
            e.currentTarget.style.transform = isActive ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = isActive 
              ? `0 -4px 20px rgba(102, 126, 234, 0.4), 0 -2px 10px rgba(118, 75, 162, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.2)` 
              : '0 2px 8px rgba(0, 0, 0, 0.1)';
          }}
          style={tabStyle(activeTab === 'testing')}
          onClick={() => setActiveTab('testing')}
        >
          <span style={{ marginRight: '8px', fontSize: '1.1em' }}>🧪</span>
          Panel de Pruebas
        </button>
        <button 
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px) scale(1.05) rotateX(5deg)';
            e.currentTarget.style.boxShadow = `
              0 -8px 30px rgba(102, 126, 234, 0.6),
              0 -4px 15px rgba(118, 75, 162, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.5)
            `;
          }}
          onMouseLeave={(e) => {
            const isActive = activeTab === 'config';
            e.currentTarget.style.transform = isActive ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = isActive 
              ? `0 -4px 20px rgba(102, 126, 234, 0.4), 0 -2px 10px rgba(118, 75, 162, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.2)` 
              : '0 2px 8px rgba(0, 0, 0, 0.1)';
          }} 
          style={tabStyle(activeTab === 'config')}
          onClick={() => setActiveTab('config')}
        >
          <span style={{ marginRight: '8px', fontSize: '1.1em' }}>⚙️</span>
          Configuración
        </button>
      </div>

      {/* Tab Content con Max-width Full HD */}
      <div style={{ 
        padding: '0 80px 80px',
        maxWidth: '1800px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        {activeTab === 'analysis' && (
          <CategoryAnalysisView />
        )}

        {activeTab === 'manual' && (
          <Suspense fallback={<LoadingSpinner />}>
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
                
                // Disparar evento para actualizar análisis y dashboard
                window.dispatchEvent(new CustomEvent('manualCategoriesUpdated', { 
                  detail: { 
                    isNew, 
                    category: rule,
                    timestamp: Date.now() 
                  } 
                }));
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
          </Suspense>
        )}

        {activeTab === 'testing' && (
          <Suspense fallback={<LoadingSpinner />}>
            <KeywordTestingPanel onSaveCategory={addRuleFromTesting} />
          </Suspense>
        )}

        {activeTab === 'config' && (
          <Suspense fallback={<LoadingSpinner />}>
            <CategoryConfigView />
          </Suspense>
        )}
      </div>
    </div>
  );
}