/**
 * SICOP Analytics - Skeleton Screens
 * Componentes de carga optimizados para lazy loading
 * 
 * @copyright 2025 Saenz Fallas S.A.
 * HQ Analytics™
 */

import React from 'react';
import './SkeletonScreens.css';

/**
 * Skeleton Screen para DemoPanel (Dashboard principal)
 */
export const DemoPanelSkeleton: React.FC = () => {
  return (
    <div className="skeleton-screen">
      <div className="skeleton-container">
        {/* Header */}
        <div className="skeleton-header">
          <div className="skeleton-title skeleton-shimmer" />
          <div className="skeleton-subtitle skeleton-shimmer" />
        </div>

        {/* KPI Cards Grid */}
        <div className="skeleton-kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-kpi-card">
              <div className="skeleton-kpi-icon skeleton-shimmer" />
              <div className="skeleton-kpi-value skeleton-shimmer" />
              <div className="skeleton-kpi-label skeleton-shimmer" />
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="skeleton-charts-grid">
          <div className="skeleton-chart-large">
            <div className="skeleton-chart-header skeleton-shimmer" />
            <div className="skeleton-chart-content skeleton-shimmer" />
          </div>
          <div className="skeleton-chart-medium">
            <div className="skeleton-chart-header skeleton-shimmer" />
            <div className="skeleton-chart-content skeleton-shimmer" />
          </div>
        </div>

        {/* Table Section */}
        <div className="skeleton-table">
          <div className="skeleton-table-header skeleton-shimmer" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-table-row skeleton-shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton Screen para DataManagementHub
 */
export const DataManagementSkeleton: React.FC = () => {
  return (
    <div className="skeleton-screen">
      <div className="skeleton-container">
        {/* Header */}
        <div className="skeleton-header">
          <div className="skeleton-title skeleton-shimmer" />
          <div className="skeleton-subtitle skeleton-shimmer" />
        </div>

        {/* Upload Area */}
        <div className="skeleton-upload-area">
          <div className="skeleton-upload-icon skeleton-shimmer" />
          <div className="skeleton-upload-text skeleton-shimmer" />
          <div className="skeleton-upload-button skeleton-shimmer" />
        </div>

        {/* Files List */}
        <div className="skeleton-files-section">
          <div className="skeleton-section-title skeleton-shimmer" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-file-item">
              <div className="skeleton-file-icon skeleton-shimmer" />
              <div className="skeleton-file-info">
                <div className="skeleton-file-name skeleton-shimmer" />
                <div className="skeleton-file-meta skeleton-shimmer" />
              </div>
              <div className="skeleton-file-actions skeleton-shimmer" />
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="skeleton-actions">
          <div className="skeleton-action-button skeleton-shimmer" />
          <div className="skeleton-action-button skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton Screen para WelcomeScreenModern
 */
export const WelcomeSkeleton: React.FC = () => {
  return (
    <div className="skeleton-screen skeleton-welcome">
      <div className="skeleton-welcome-container">
        {/* Hero Section */}
        <div className="skeleton-hero">
          <div className="skeleton-logo-large skeleton-shimmer" />
          <div className="skeleton-hero-title skeleton-shimmer" />
          <div className="skeleton-hero-subtitle skeleton-shimmer" />
        </div>

        {/* Features Grid */}
        <div className="skeleton-features-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton-feature-card">
              <div className="skeleton-feature-icon skeleton-shimmer" />
              <div className="skeleton-feature-title skeleton-shimmer" />
              <div className="skeleton-feature-text skeleton-shimmer" />
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="skeleton-cta">
          <div className="skeleton-cta-button skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton Screen genérico (fallback)
 */
export const GenericSkeleton: React.FC = () => {
  return (
    <div className="skeleton-screen">
      <div className="skeleton-container">
        <div className="skeleton-generic-content">
          <div className="skeleton-spinner" />
          <div className="skeleton-loading-text">Cargando...</div>
        </div>
      </div>
    </div>
  );
};

const SkeletonScreens = {
  DemoPanelSkeleton,
  DataManagementSkeleton,
  WelcomeSkeleton,
  GenericSkeleton,
};

export default SkeletonScreens;
