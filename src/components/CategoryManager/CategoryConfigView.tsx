import React, { useState, useEffect } from 'react';
import { CategoryService } from '../../services/CategoryService';
import { CategoryConfigEntry, SubcategoryRule } from '../../types/categories';
import { 
  Settings, 
  ToggleLeft, 
  ToggleRight, 
  CheckCircle2, 
  XCircle,
  Search,
  Filter,
  Power,
  PowerOff,
  Tag,
  Layers,
  AlertCircle,
  Edit3
} from 'lucide-react';
import { SubcategoryEditor } from './SubcategoryEditor';

export const CategoryConfigView: React.FC = () => {
  const [categories, setCategories] = useState<CategoryConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sistema' | 'manual'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingSubcategories, setEditingSubcategories] = useState<{
    categoryId: string;
    categoryName: string;
    subcategories: SubcategoryRule[];
  } | null>(null);

  // Cargar categorías
  const loadCategories = async () => {
    setLoading(true);
    try {
      const cats = await CategoryService.getAllCategoriesWithConfig();
      setCategories(cats);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Toggle categoría individual
  const handleToggleCategory = async (categoryId: string, currentState: boolean) => {
    try {
      await CategoryService.toggleCategory(categoryId, !currentState);
      // Recargar categorías
      await loadCategories();
    } catch (error) {
      console.error('Error al cambiar estado de categoría:', error);
    }
  };

  // Activar todas
  const handleActivateAll = async () => {
    try {
      await CategoryService.activateAllCategories();
      await loadCategories();
    } catch (error) {
      console.error('Error al activar todas:', error);
    }
  };

  // Desactivar todas
  const handleDeactivateAll = async () => {
    try {
      await CategoryService.deactivateAllCategories();
      await loadCategories();
    } catch (error) {
      console.error('Error al desactivar todas:', error);
    }
  };

  // Abrir editor de subcategorías
  const handleEditSubcategories = async (categoryId: string, categoryName: string) => {
    try {
      const subcats = await CategoryService.getSubcategoriesForCategory(categoryId);
      setEditingSubcategories({
        categoryId,
        categoryName,
        subcategories: subcats
      });
    } catch (error) {
      console.error('Error cargando subcategorías:', error);
    }
  };

  // Guardar subcategorías
  const handleSaveSubcategories = async (subcategories: SubcategoryRule[]) => {
    if (!editingSubcategories) return;
    
    try {
      await CategoryService.updateSubcategories(
        editingSubcategories.categoryId,
        subcategories
      );
      setEditingSubcategories(null);
      await loadCategories();
    } catch (error) {
      console.error('Error guardando subcategorías:', error);
      alert('Error al guardar las subcategorías');
    }
  };

  // Filtrar categorías
  const filteredCategories = categories.filter(cat => {
    // Filtro de búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchName = cat.nombre.toLowerCase().includes(query);
      const matchKeywords = cat.palabrasClave?.some(k => k.toLowerCase().includes(query));
      if (!matchName && !matchKeywords) return false;
    }

    // Filtro por tipo
    if (filterType !== 'all' && cat.tipo !== filterType) return false;

    // Filtro por estado
    if (filterStatus === 'active' && !cat.activa) return false;
    if (filterStatus === 'inactive' && cat.activa) return false;

    return true;
  });

  // Estadísticas
  const stats = {
    total: categories.length,
    sistema: categories.filter(c => c.tipo === 'sistema').length,
    manual: categories.filter(c => c.tipo === 'manual').length,
    activas: categories.filter(c => c.activa).length,
    inactivas: categories.filter(c => !c.activa).length
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '0',
      maxWidth: '1800px', 
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      {/* Header Premium con Glassmorphism */}
      <div style={{ 
        marginBottom: '48px',
        background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.98) 0%, rgba(29, 78, 216, 0.95) 50%, rgba(37, 99, 235, 0.92) 100%)',
        backdropFilter: 'blur(25px) saturate(180%)',
        WebkitBackdropFilter: 'blur(25px) saturate(180%)',
        padding: '48px 60px',
        boxShadow: `
          0 20px 60px rgba(30, 58, 138, 0.5),
          0 10px 30px rgba(29, 78, 216, 0.4),
          0 5px 15px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.5),
          inset 0 -1px 0 rgba(0, 0, 0, 0.3)
        `,
        borderBottom: '3px solid rgba(255, 255, 255, 0.4)',
        position: 'relative',
        overflow: 'hidden',
        perspective: '1500px',
        transformStyle: 'preserve-3d',
        animation: 'fadeInDown 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        willChange: 'transform, opacity'
      }}>
        {/* Shimmer Effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 3s linear infinite',
          willChange: 'background-position'
        }} />

        {/* Gradient Background Layers */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 60%, rgba(96, 165, 250, 0.25) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.2) 0%, transparent 60%)
          `,
          pointerEvents: 'none',
          mixBlendMode: 'overlay',
          animation: 'pulseGlow 4s ease-in-out infinite',
          willChange: 'opacity'
        }} />

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '20px', 
          marginBottom: '16px',
          position: 'relative',
          zIndex: 1,
          transform: 'translateZ(30px)'
        }}>
          <div
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.2) rotate(10deg)';
              e.currentTarget.style.filter = 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.8))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
              e.currentTarget.style.filter = 'none';
            }}
            style={{
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              willChange: 'transform'
            }}
          >
            <Settings size={48} color="white" strokeWidth={2.5} />
          </div>
          <h2 style={{ 
            margin: 0, 
            fontSize: '3.2em', 
            fontWeight: 900,
            color: 'white',
            textShadow: `
              0 2px 4px rgba(0, 0, 0, 0.3),
              0 4px 8px rgba(0, 0, 0, 0.2),
              0 8px 16px rgba(0, 0, 0, 0.1),
              0 0 40px rgba(255, 255, 255, 0.3)
            `,
            letterSpacing: '-1.5px',
            animation: 'scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both',
            willChange: 'transform'
          }}>
            Configuración de Categorías
          </h2>
        </div>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.95)', 
          fontSize: '1.2em', 
          margin: 0,
          fontWeight: 600,
          textShadow: `
            0 1px 2px rgba(0, 0, 0, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.2),
            0 0 20px rgba(255, 255, 255, 0.2)
          `,
          letterSpacing: '0.3px',
          position: 'relative',
          zIndex: 1,
          transform: 'translateZ(20px)',
          animation: 'fadeInUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both',
          willChange: 'transform, opacity'
        }}>
          Active o desactive categorías para controlar cómo se clasifican los carteles.
          Los cambios afectarán todos los dashboards y análisis.
        </p>

        <style>{`
          @keyframes fadeInDown {
            from {
              opacity: 0;
              transform: translateY(-30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          @keyframes pulseGlow {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 0.9; }
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
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>

      <div style={{ padding: '0 60px 60px' }}>
      {/* Alert de advertencia con Glassmorphism */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(180, 83, 9, 0.95) 0%, rgba(217, 119, 6, 0.92) 50%, rgba(245, 158, 11, 0.9) 100%)',
        backdropFilter: 'blur(25px) saturate(180%)',
        WebkitBackdropFilter: 'blur(25px) saturate(180%)',
        border: '3px solid rgba(255, 255, 255, 0.4)',
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '32px',
        display: 'flex',
        gap: '16px',
        alignItems: 'start',
        boxShadow: `
          0 20px 60px rgba(180, 83, 9, 0.35),
          0 8px 16px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.3),
          inset 0 -1px 0 rgba(0, 0, 0, 0.2)
        `,
        animation: 'fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both',
        willChange: 'transform, opacity'
      }}>
        <AlertCircle size={28} color="white" strokeWidth={2.5} />
        <div>
          <div style={{ 
            fontWeight: 700, 
            marginBottom: '8px', 
            color: 'white',
            fontSize: '1.1em',
            letterSpacing: '0.02em',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.5)'
          }}>
            ⚠️ Impacto en Dashboards
          </div>
          <div style={{ 
            fontSize: '0.95em', 
            color: 'rgba(255, 255, 255, 0.95)', 
            lineHeight: 1.6,
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.3)'
          }}>
            Al desactivar una categoría, los carteles que pertenecían a ella se reclasificarán 
            automáticamente. Esto afectará gráficos, estadísticas y filtros en todo el sistema.
          </div>
        </div>
      </div>

      {/* Estadísticas con Glassmorphism */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
        animation: 'fadeInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both',
        willChange: 'transform, opacity'
      }}>
        <div 
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px) scale(1.03) rotateX(5deg)';
            e.currentTarget.style.boxShadow = `
              0 16px 40px rgba(44, 62, 80, 0.25),
              0 8px 20px rgba(0, 0, 0, 0.15),
              inset 0 1px 0 rgba(255, 255, 255, 0.5)
            `;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1) rotateX(0)';
            e.currentTarget.style.boxShadow = `
              0 8px 24px rgba(44, 62, 80, 0.15),
              inset 0 1px 0 rgba(255, 255, 255, 0.3)
            `;
          }}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 249, 250, 0.9) 100%)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            padding: '28px',
            borderRadius: '16px',
            border: '1px solid rgba(44, 62, 80, 0.15)',
            boxShadow: `
              0 8px 24px rgba(44, 62, 80, 0.15),
              inset 0 1px 0 rgba(255, 255, 255, 0.3)
            `,
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            willChange: 'transform, box-shadow'
          }}>
          <div style={{ 
            fontSize: '0.85em', 
            color: '#1e293b', 
            marginBottom: '12px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>Total Categorías</div>
          <div style={{ 
            fontSize: '2.8em', 
            fontWeight: 800, 
            color: '#2c3e50',
            letterSpacing: '-1px',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>{stats.total}</div>
        </div>

        <div
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px) scale(1.03) rotateX(5deg)';
            e.currentTarget.style.boxShadow = `
              0 16px 40px rgba(30, 58, 138, 0.35),
              0 8px 20px rgba(59, 130, 246, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.5)
            `;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1) rotateX(0)';
            e.currentTarget.style.boxShadow = `
              0 8px 24px rgba(30, 58, 138, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3)
            `;
          }}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(239, 246, 255, 0.92) 100%)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            padding: '28px',
            borderRadius: '16px',
            border: '2px solid rgba(59, 130, 246, 0.3)',
            boxShadow: `
              0 8px 24px rgba(30, 58, 138, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3)
            `,
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            willChange: 'transform, box-shadow'
          }}>
          <div style={{ 
            fontSize: '0.85em', 
            color: '#1e293b', 
            marginBottom: '12px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>Del Sistema</div>
          <div style={{ 
            fontSize: '2.8em', 
            fontWeight: 800, 
            color: '#3498db',
            letterSpacing: '-1px',
            textShadow: '0 2px 4px rgba(52, 152, 219, 0.2)'
          }}>{stats.sistema}</div>
        </div>

        <div
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px) scale(1.03) rotateX(5deg)';
            e.currentTarget.style.boxShadow = `
              0 16px 40px rgba(126, 34, 206, 0.35),
              0 8px 20px rgba(147, 51, 234, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.5)
            `;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1) rotateX(0)';
            e.currentTarget.style.boxShadow = `
              0 8px 24px rgba(126, 34, 206, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3)
            `;
          }}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 245, 255, 0.92) 100%)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            padding: '28px',
            borderRadius: '16px',
            border: '2px solid rgba(147, 51, 234, 0.3)',
            boxShadow: `
              0 8px 24px rgba(126, 34, 206, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3)
            `,
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            willChange: 'transform, box-shadow'
          }}>
          <div style={{ 
            fontSize: '0.85em', 
            color: '#1e293b', 
            marginBottom: '12px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>Manuales</div>
          <div style={{ 
            fontSize: '2.8em', 
            fontWeight: 800, 
            color: '#7e22ce',
            letterSpacing: '-1px',
            textShadow: '0 2px 4px rgba(126, 34, 206, 0.2)'
          }}>{stats.manual}</div>
        </div>

        <div
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px) scale(1.03) rotateX(5deg)';
            e.currentTarget.style.boxShadow = `
              0 16px 40px rgba(22, 163, 74, 0.35),
              0 8px 20px rgba(34, 197, 94, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.5)
            `;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1) rotateX(0)';
            e.currentTarget.style.boxShadow = `
              0 8px 24px rgba(22, 163, 74, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3)
            `;
          }}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 253, 244, 0.92) 100%)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            padding: '28px',
            borderRadius: '16px',
            border: '2px solid rgba(34, 197, 94, 0.3)',
            boxShadow: `
              0 8px 24px rgba(22, 163, 74, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3)
            `,
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            willChange: 'transform, box-shadow'
          }}>
          <div style={{ 
            fontSize: '0.85em', 
            color: '#1e293b', 
            marginBottom: '12px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>Activas</div>
          <div style={{ 
            fontSize: '2.8em', 
            fontWeight: 800, 
            color: '#16a34a',
            letterSpacing: '-1px',
            textShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
          }}>{stats.activas}</div>
        </div>

        <div
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px) scale(1.03) rotateX(5deg)';
            e.currentTarget.style.boxShadow = `
              0 16px 40px rgba(220, 38, 38, 0.35),
              0 8px 20px rgba(239, 68, 68, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.5)
            `;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1) rotateX(0)';
            e.currentTarget.style.boxShadow = `
              0 8px 24px rgba(220, 38, 38, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3)
            `;
          }}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(254, 242, 242, 0.92) 100%)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            padding: '28px',
            borderRadius: '16px',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            boxShadow: `
              0 8px 24px rgba(220, 38, 38, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3)
            `,
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            willChange: 'transform, box-shadow'
          }}>
          <div style={{ 
            fontSize: '0.85em', 
            color: '#1e293b', 
            marginBottom: '12px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>Inactivas</div>
          <div style={{ 
            fontSize: '2.8em', 
            fontWeight: 800, 
            color: '#dc2626',
            letterSpacing: '-1px',
            textShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
          }}>{stats.inactivas}</div>
        </div>
      </div>

      {/* Controles superiores */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        marginBottom: '24px'
      }}>
        {/* Búsqueda */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={20}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}
            />
            <input
              type="text"
              placeholder="Buscar categoría por nombre o palabras clave..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 44px',
                border: '2px solid rgba(30, 58, 138, 0.3)',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Filtros y acciones */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Filtro por tipo */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Filter size={18} color="#666" />
            <span style={{ fontSize: '14px', color: '#666' }}>Tipo:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              style={{
                padding: '8px 12px',
                border: '2px solid rgba(30, 58, 138, 0.3)',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                color: '#1e293b'
              }}
            >
              <option value="all">Todas</option>
              <option value="sistema">Sistema</option>
              <option value="manual">Manuales</option>
            </select>
          </div>

          {/* Filtro por estado */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>Estado:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              style={{
                padding: '8px 12px',
                border: '2px solid rgba(30, 58, 138, 0.3)',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                color: '#1e293b'
              }}
            >
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
            </select>
          </div>

          <div style={{ flex: 1 }} />

          {/* Botones de acción masiva */}
          <button
            onClick={handleActivateAll}
            style={{
              padding: '10px 16px',
              background: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#229954'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#27ae60'}
          >
            <Power size={18} />
            Activar Todas
          </button>

          <button
            onClick={handleDeactivateAll}
            style={{
              padding: '10px 16px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#c0392b'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#e74c3c'}
          >
            <PowerOff size={18} />
            Desactivar Todas
          </button>
        </div>
      </div>

      {/* Lista de categorías */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        overflow: 'hidden'
      }}>
        {/* Header de tabla */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 120px 200px 120px 100px',
          gap: '16px',
          padding: '16px 20px',
          background: '#f8f9fa',
          borderBottom: '1px solid #e0e0e0',
          fontSize: '14px',
          fontWeight: 600,
          color: '#666'
        }}>
          <div>Estado</div>
          <div>Categoría</div>
          <div>Tipo</div>
          <div>Palabras Clave</div>
          <div style={{ textAlign: 'center' }}>Subcategorías</div>
          <div style={{ textAlign: 'center' }}>Acción</div>
        </div>

        {/* Filas */}
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          {filteredCategories.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              <Search size={48} color="#ddd" style={{ marginBottom: '16px' }} />
              <div>No se encontraron categorías con los filtros aplicados</div>
            </div>
          ) : (
            filteredCategories.map((cat, idx) => (
              <div
                key={cat.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 120px 200px 120px 100px',
                  gap: '16px',
                  padding: '16px 20px',
                  borderBottom: idx < filteredCategories.length - 1 ? '1px solid #f0f0f0' : 'none',
                  alignItems: 'center',
                  transition: 'background 0.15s',
                  background: cat.activa ? 'white' : '#f8f9fa'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = cat.activa ? '#f8f9fa' : '#ecf0f1'}
                onMouseLeave={(e) => e.currentTarget.style.background = cat.activa ? 'white' : '#f8f9fa'}
              >
                {/* Estado */}
                <div>
                  {cat.activa ? (
                    <CheckCircle2 size={24} color="#27ae60" />
                  ) : (
                    <XCircle size={24} color="#e74c3c" />
                  )}
                </div>

                {/* Nombre */}
                <div>
                  <div style={{ 
                    fontWeight: 600, 
                    fontSize: '15px',
                    color: cat.activa ? '#2c3e50' : '#95a5a6',
                    marginBottom: '4px'
                  }}>
                    {cat.nombre}
                  </div>
                  {cat.descripcion && (
                    <div style={{ fontSize: '13px', color: '#999' }}>
                      {cat.descripcion}
                    </div>
                  )}
                </div>

                {/* Tipo */}
                <div>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: cat.tipo === 'sistema' ? '#e3f2fd' : '#f3e5f5',
                    color: cat.tipo === 'sistema' ? '#1976d2' : '#7b1fa2'
                  }}>
                    {cat.tipo === 'sistema' ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Layers size={14} />
                        Sistema
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Tag size={14} />
                        Manual
                      </span>
                    )}
                  </span>
                </div>

                {/* Palabras clave */}
                <div>
                  {cat.palabrasClave && cat.palabrasClave.length > 0 ? (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#666',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px'
                    }}>
                      {cat.palabrasClave.slice(0, 3).map((kw, i) => (
                        <span
                          key={i}
                          style={{
                            background: '#e0e0e0',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}
                        >
                          {kw}
                        </span>
                      ))}
                      {cat.palabrasClave.length > 3 && (
                        <span style={{ fontSize: '11px', color: '#999' }}>
                          +{cat.palabrasClave.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#999' }}>-</span>
                  )}
                </div>

                {/* Subcategorías */}
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => handleEditSubcategories(cat.id, cat.nombre)}
                    style={{
                      background: '#f0f0f0',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#666',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e0e0e0';
                      e.currentTarget.style.borderColor = '#bbb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f0f0f0';
                      e.currentTarget.style.borderColor = '#ddd';
                    }}
                  >
                    <Edit3 size={14} />
                    {cat.subcategorias && cat.subcategorias.length > 0 
                      ? `${cat.subcategorias.length} sub`
                      : 'Editar'
                    }
                  </button>
                </div>

                {/* Toggle */}
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => handleToggleCategory(cat.id, cat.activa)}
                    style={{
                      background: cat.activa ? '#27ae60' : '#95a5a6',
                      border: 'none',
                      borderRadius: '24px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.background = cat.activa ? '#229954' : '#7f8c8d';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.background = cat.activa ? '#27ae60' : '#95a5a6';
                    }}
                  >
                    {cat.activa ? (
                      <>
                        <ToggleRight size={16} />
                        ON
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={16} />
                        OFF
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer info */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#f8f9fa',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#666',
        display: 'flex',
        gap: '8px',
        alignItems: 'start'
      }}>
        <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
        <div>
          <strong>Nota:</strong> Los cambios se aplican inmediatamente. Las categorías desactivadas 
          no aparecerán en filtros ni gráficos. Los carteles que pertenecían a categorías desactivadas 
          se reclasificarán según las categorías activas restantes, o aparecerán en "Otros" si no coinciden 
          con ninguna categoría activa.
        </div>
      </div>

      {/* Modal de edición de subcategorías */}
      {editingSubcategories && (
        <SubcategoryEditor
          categoryName={editingSubcategories.categoryName}
          subcategories={editingSubcategories.subcategories}
          onSave={handleSaveSubcategories}
          onCancel={() => setEditingSubcategories(null)}
        />
      )}
      </div>
    </div>
  );
};
