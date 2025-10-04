// ================================
// REPORTE DE OPORTUNIDADES DE NEGOCIO
// ================================
// Identificación de oportunidades y nichos de mercado

import React, { useMemo } from 'react';
import { dataManager } from '../../data/DataManager';
import _ from 'lodash';

interface OpportunitiesReportProps {
  filters: {
    periodo: { inicio: Date; fin: Date };
    sectores: string[];
    incluirOportunidades: boolean;
  };
}

interface Oportunidad {
  tipo: 'nicho' | 'crecimiento' | 'poca_competencia' | 'alta_demanda' | 'emergente';
  titulo: string;
  descripcion: string;
  potencial: 'Alto' | 'Medio' | 'Bajo';
  montoEstimado: number;
  metricas: {
    label: string;
    value: string;
  }[];
  recomendaciones: string[];
}

const OpportunitiesReport: React.FC<OpportunitiesReportProps> = ({ filters }) => {
  
  // Identificar oportunidades
  const oportunidades = useMemo<Oportunidad[]>(() => {
    const carteles = dataManager.obtenerDatos('DetalleCarteles')
      .filter(c => c.fechaPublicacion && c.fechaPublicacion >= filters.periodo.inicio && c.fechaPublicacion <= filters.periodo.fin);
    
    const contratos = dataManager.obtenerDatos('Contratos')
      .filter(c => c.fechaFirma && c.fechaFirma >= filters.periodo.inicio && c.fechaFirma <= filters.periodo.fin);
    
    const lineasAdjudicadas = dataManager.obtenerDatos('LineasAdjudicadas');
    const lineasRecibidas = dataManager.obtenerDatos('LineasRecibidas');
    const instituciones = dataManager.obtenerDatos('InstitucionesRegistradas');

    const oportunidadesEncontradas: Oportunidad[] = [];

    // 1. NICHOS CON POCA COMPETENCIA
    const lineasConPocaCompetencia = lineasRecibidas.filter(lr => 
      lr.cantidadOfertasRecibidas <= 3 && lr.cantidadOfertasRecibidas > 0
    );

    if (lineasConPocaCompetencia.length > 0) {
      const montoEstimado = _.sumBy(
        lineasConPocaCompetencia
          .map(lr => lineasAdjudicadas.find(la => 
            la.numeroCartel === lr.numeroCartel && la.numeroLinea === lr.numeroLinea
          ))
          .filter(Boolean),
        'precioAdjudicado'
      ) || 0;

      oportunidadesEncontradas.push({
        tipo: 'poca_competencia',
        titulo: 'Nichos con Baja Competencia',
        descripcion: `Se identificaron ${lineasConPocaCompetencia.length} líneas con 3 o menos oferentes, indicando oportunidades con poca competencia`,
        potencial: 'Alto',
        montoEstimado,
        metricas: [
          { label: 'Líneas identificadas', value: lineasConPocaCompetencia.length.toString() },
          { label: 'Competencia promedio', value: `${_.meanBy(lineasConPocaCompetencia, 'cantidadOfertasRecibidas').toFixed(1)} ofertas` },
          { label: 'Monto estimado', value: `₡${(montoEstimado / 1000000).toFixed(1)}M` }
        ],
        recomendaciones: [
          'Analizar especificaciones técnicas de estas líneas para evaluar viabilidad de entrada',
          'Menor competencia puede significar requisitos especializados o barreras técnicas',
          'Considerar alianzas estratégicas para cumplir requisitos complejos'
        ]
      });
    }

    // 2. SECTORES EN CRECIMIENTO
    const sectoresAnalizar = ['medicamentos', 'tecnología', 'construcción', 'servicios', 'educación'];
    
    sectoresAnalizar.forEach(sector => {
      const cartelesDelSector = carteles.filter(c => {
        const texto = `${c.nombreCartel || ''} ${c.descripcionCartel || ''}`.toLowerCase();
        return texto.includes(sector.toLowerCase());
      });

      // Comparar con año anterior
      const inicioAnterior = new Date(filters.periodo.inicio);
      inicioAnterior.setFullYear(inicioAnterior.getFullYear() - 1);
      const finAnterior = new Date(filters.periodo.fin);
      finAnterior.setFullYear(finAnterior.getFullYear() - 1);

      const cartelesAñoAnterior = dataManager.obtenerDatos('DetalleCarteles')
        .filter(c => c.fechaPublicacion && c.fechaPublicacion >= inicioAnterior && c.fechaPublicacion <= finAnterior)
        .filter(c => {
          const texto = `${c.nombreCartel || ''} ${c.descripcionCartel || ''}`.toLowerCase();
          return texto.includes(sector.toLowerCase());
        });

      const crecimiento = cartelesAñoAnterior.length > 0 
        ? ((cartelesDelSector.length - cartelesAñoAnterior.length) / cartelesAñoAnterior.length) * 100
        : 0;

      if (crecimiento > 20) {
        const contratosDelSector = contratos.filter(contrato => {
          const lineasContratadas = dataManager.obtenerDatos('LineasContratadas')
            .filter(lc => lc.idContrato === contrato.idContrato);
          
          return lineasContratadas.some(lc => {
            const lineaCartel = dataManager.obtenerDatos('DetalleLineaCartel')
              .find(dlc => dlc.numeroCartel === lc.numeroCartel && dlc.numeroLinea === lc.numeroLinea);
            
            if (!lineaCartel) return false;
            return lineaCartel.descripcionLinea.toLowerCase().includes(sector.toLowerCase());
          });
        });

        const montoEstimado = _.sumBy(contratosDelSector, 'montoContrato') || 0;

        oportunidadesEncontradas.push({
          tipo: 'crecimiento',
          titulo: `Sector ${sector.toUpperCase()} en Expansión`,
          descripcion: `El sector ${sector} muestra un crecimiento de ${crecimiento.toFixed(1)}% interanual, indicando demanda creciente`,
          potencial: crecimiento > 50 ? 'Alto' : 'Medio',
          montoEstimado,
          metricas: [
            { label: 'Crecimiento', value: `${crecimiento.toFixed(1)}%` },
            { label: 'Licitaciones actuales', value: cartelesDelSector.length.toString() },
            { label: 'Monto de mercado', value: `₡${(montoEstimado / 1000000).toFixed(1)}M` }
          ],
          recomendaciones: [
            'Sector con demanda creciente - considerar entrada o expansión',
            'Preparar capacidades técnicas para aprovechar la tendencia',
            'Monitorear requisitos y especificaciones recurrentes'
          ]
        });
      }
    });

    // 3. INSTITUCIONES CON ALTA ACTIVIDAD
    const actividadPorInstitucion = _.groupBy(carteles, 'codigoInstitucion');
    const institucionesActivas = _.map(actividadPorInstitucion, (cartelesInst, codigo) => {
      const institucion = instituciones.find(i => i.codigoInstitucion === codigo);
      const contratosInst = contratos.filter(c => c.codigoInstitucion === codigo);
      
      return {
        codigo,
        nombre: institucion?.nombreInstitucion || 'Desconocida',
        cantidadCarteles: cartelesInst.length,
        montoTotal: _.sumBy(contratosInst, 'montoContrato') || 0
      };
    })
    .filter(inst => inst.cantidadCarteles >= 10)
    .sort((a, b) => b.montoTotal - a.montoTotal)
    .slice(0, 5);

    if (institucionesActivas.length > 0) {
      oportunidadesEncontradas.push({
        tipo: 'alta_demanda',
        titulo: 'Clientes Institucionales de Alto Valor',
        descripcion: `Se identificaron ${institucionesActivas.length} instituciones con alta actividad y presupuesto significativo`,
        potencial: 'Alto',
        montoEstimado: _.sumBy(institucionesActivas, 'montoTotal'),
        metricas: [
          { label: 'Instituciones clave', value: institucionesActivas.length.toString() },
          { label: 'Licitaciones totales', value: _.sumBy(institucionesActivas, 'cantidadCarteles').toString() },
          { label: 'Presupuesto combinado', value: `₡${(_.sumBy(institucionesActivas, 'montoTotal') / 1000000).toFixed(1)}M` }
        ],
        recomendaciones: [
          `Priorizar relaciones con: ${institucionesActivas.slice(0, 3).map(i => i.nombre).join(', ')}`,
          'Analizar historial de compras para identificar necesidades recurrentes',
          'Desarrollar propuestas especializadas para estas instituciones'
        ]
      });
    }

    // 4. PRODUCTOS/SERVICIOS EMERGENTES
    const palabrasEmergentes = [
      'digital', 'cloud', 'remoto', 'virtual', 'sostenible', 
      'renovable', 'inteligencia artificial', 'ciberseguridad'
    ];

    palabrasEmergentes.forEach(palabra => {
      const cartelesEmergentes = carteles.filter(c => {
        const texto = `${c.nombreCartel || ''} ${c.descripcionCartel || ''}`.toLowerCase();
        return texto.includes(palabra.toLowerCase());
      });

      if (cartelesEmergentes.length >= 5) {
        const contratosEmergentes = contratos.filter(c => {
          const cartel = carteles.find(cart => cart.numeroCartel === c.numeroCartel);
          if (!cartel) return false;
          const texto = `${cartel.nombreCartel || ''} ${cartel.descripcionCartel || ''}`.toLowerCase();
          return texto.includes(palabra.toLowerCase());
        });

        const montoEstimado = _.sumBy(contratosEmergentes, 'montoContrato') || 0;

        oportunidadesEncontradas.push({
          tipo: 'emergente',
          titulo: `Tecnología Emergente: ${palabra.toUpperCase()}`,
          descripcion: `Tendencia emergente con ${cartelesEmergentes.length} licitaciones relacionadas con ${palabra}`,
          potencial: 'Medio',
          montoEstimado,
          metricas: [
            { label: 'Licitaciones', value: cartelesEmergentes.length.toString() },
            { label: 'Contratos', value: contratosEmergentes.length.toString() },
            { label: 'Monto estimado', value: `₡${(montoEstimado / 1000000).toFixed(1)}M` }
          ],
          recomendaciones: [
            'Sector emergente - posible ventana de oportunidad para early adopters',
            'Considerar desarrollo de capacidades en esta área',
            'Monitorear evolución de requisitos técnicos'
          ]
        });
      }
    });

    // Ordenar por potencial y monto
    return _.orderBy(oportunidadesEncontradas, 
      [o => o.potencial === 'Alto' ? 3 : o.potencial === 'Medio' ? 2 : 1, 'montoEstimado'],
      ['desc', 'desc']
    ).slice(0, 10);
  }, [filters]);

  // Resumen de oportunidades
  const resumenOportunidades = useMemo(() => {
    return {
      total: oportunidades.length,
      altas: oportunidades.filter(o => o.potencial === 'Alto').length,
      medias: oportunidades.filter(o => o.potencial === 'Medio').length,
      bajas: oportunidades.filter(o => o.potencial === 'Bajo').length,
      montoTotal: _.sumBy(oportunidades, 'montoEstimado')
    };
  }, [oportunidades]);

  const getIconByType = (tipo: Oportunidad['tipo']) => {
    const icons = {
      'nicho': '🎯',
      'crecimiento': '📈',
      'poca_competencia': '🚀',
      'alta_demanda': '💼',
      'emergente': '⚡'
    };
    return icons[tipo] || '💡';
  };

  const getPotentialColor = (potencial: string) => {
    return potencial === 'Alto' ? 'high' : potencial === 'Medio' ? 'medium' : 'low';
  };

  return (
    <div className="opportunities-report">
      <h2 className="report-title">🎯 Identificación de Oportunidades de Negocio</h2>
      
      {/* Resumen */}
      <div className="opportunities-summary">
        <div className="summary-card total">
          <div className="summary-icon">💡</div>
          <div className="summary-content">
            <div className="summary-value">{resumenOportunidades.total}</div>
            <div className="summary-label">Oportunidades Identificadas</div>
          </div>
        </div>

        <div className="summary-card high">
          <div className="summary-icon">🔥</div>
          <div className="summary-content">
            <div className="summary-value">{resumenOportunidades.altas}</div>
            <div className="summary-label">Potencial Alto</div>
          </div>
        </div>

        <div className="summary-card medium">
          <div className="summary-icon">⭐</div>
          <div className="summary-content">
            <div className="summary-value">{resumenOportunidades.medias}</div>
            <div className="summary-label">Potencial Medio</div>
          </div>
        </div>

        <div className="summary-card value">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <div className="summary-value">₡{(resumenOportunidades.montoTotal / 1000000).toFixed(1)}M</div>
            <div className="summary-label">Valor Total Estimado</div>
          </div>
        </div>
      </div>

      {/* Lista de oportunidades */}
      <div className="opportunities-list">
        {oportunidades.map((oportunidad, index) => (
          <div key={index} className={`opportunity-card ${getPotentialColor(oportunidad.potencial)}`}>
            <div className="opportunity-header">
              <div className="opportunity-icon">{getIconByType(oportunidad.tipo)}</div>
              <div className="opportunity-title-section">
                <div className="opportunity-title">{oportunidad.titulo}</div>
                <div className="opportunity-type-badge">{oportunidad.tipo.replace('_', ' ').toUpperCase()}</div>
              </div>
              <div className={`opportunity-potential ${getPotentialColor(oportunidad.potencial)}`}>
                Potencial {oportunidad.potencial}
              </div>
            </div>

            <div className="opportunity-description">
              {oportunidad.descripcion}
            </div>

            <div className="opportunity-metrics">
              {oportunidad.metricas.map((metrica, idx) => (
                <div key={idx} className="opportunity-metric">
                  <div className="metric-label">{metrica.label}</div>
                  <div className="metric-value">{metrica.value}</div>
                </div>
              ))}
            </div>

            <div className="opportunity-recommendations">
              <div className="recommendations-title">💡 Acciones Recomendadas:</div>
              <ul>
                {oportunidad.recomendaciones.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {oportunidades.length === 0 && (
        <div className="no-opportunities">
          <div className="no-opportunities-icon">🔍</div>
          <div className="no-opportunities-text">
            No se identificaron oportunidades significativas en el período seleccionado.
            Intente ajustar los filtros o ampliar el rango de fechas.
          </div>
        </div>
      )}

      {/* Insights generales */}
      {oportunidades.length > 0 && (
        <div className="report-section insights">
          <h3>💡 Insights Estratégicos</h3>
          <div className="insights-grid">
            <div className="insight-card">
              <div className="insight-icon">🎯</div>
              <div className="insight-content">
                <div className="insight-title">Foco Estratégico</div>
                <div className="insight-text">
                  Priorizar las {resumenOportunidades.altas} oportunidades de alto potencial 
                  para maximizar retorno de inversión
                </div>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-icon">⏱️</div>
              <div className="insight-content">
                <div className="insight-title">Ventana de Oportunidad</div>
                <div className="insight-text">
                  Los sectores emergentes representan oportunidades tempranas antes de que aumente la competencia
                </div>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-icon">🤝</div>
              <div className="insight-content">
                <div className="insight-title">Alianzas Estratégicas</div>
                <div className="insight-text">
                  Para nichos especializados, considerar joint ventures o alianzas para cumplir requisitos complejos
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunitiesReport;
