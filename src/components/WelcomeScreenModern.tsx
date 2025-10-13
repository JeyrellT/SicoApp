/**
 * SICOP Analytics - Sistema de Análisis de Contrataciones Públicas
 * Componente de Pantalla de Bienvenida Moderna
 * 
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 * @author Saenz Fallas S.A.
 * @company Saenz Fallas S.A.
 * @license Propiedad de Saenz Fallas S.A.
 * 
 * HQ Analytics™ - High Technology Quality Analytics
 */

import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Database, 
  BarChart3, 
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  PlayCircle,
  Settings,
  Check,
  Compass
} from 'lucide-react';
import { dataLoaderService } from '../services/DataLoaderService';
import { InstallCard } from './InstallPrompt';

export const WelcomeScreenModern: React.FC<{ 
  onManageData: () => void;
  onLaunchApp: () => void;
  onStartTour?: () => void;
}> = ({ onManageData, onLaunchApp, onStartTour }) => {
  const [hasCache, setHasCache] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    checkCache();
  }, []);

  const checkCache = async () => {
    try {
      const hasData = await dataLoaderService.hasDataInCache();
      setHasCache(hasData);
      
      if (hasData) {
        const stats = await dataLoaderService.getCacheStats();
        setCacheStats(stats);
      }
    } catch (error) {
      console.error('Error checking cache:', error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="modern-welcome">
      <style>{`
        /* Animaciones Modernas Full HD */
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(40px);
            filter: blur(10px);
          }
          to { 
            opacity: 1; 
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) translateZ(0);
          }
          50% { 
            transform: translateY(-20px) translateZ(10px);
          }
        }

        @keyframes shimmer {
          0% { 
            background-position: -1200px 0; 
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% { 
            background-position: 1200px 0; 
            opacity: 0;
          }
        }

        @keyframes pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
            filter: brightness(1);
          }
          50% { 
            opacity: 0.92; 
            transform: scale(1.03);
            filter: brightness(1.1);
          }
        }

        @keyframes slideUp {
          from { 
            opacity: 0; 
            transform: translateY(60px) scale(0.95);
            filter: blur(8px);
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes scaleIn {
          from { 
            opacity: 0; 
            transform: scale(0.88) rotateX(8deg);
            filter: blur(12px);
          }
          to { 
            opacity: 1; 
            transform: scale(1) rotateX(0);
            filter: blur(0);
          }
        }

        @keyframes particleFloat {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0.2;
          }
          25% {
            transform: translate(100px, -100px) rotate(90deg);
            opacity: 0.4;
          }
          50% {
            transform: translate(200px, -50px) rotate(180deg);
            opacity: 0.6;
          }
          75% {
            transform: translate(100px, 50px) rotate(270deg);
            opacity: 0.4;
          }
        }

        @keyframes rotate3D {
          from {
            transform: perspective(1000px) rotateY(0deg);
          }
          to {
            transform: perspective(1000px) rotateY(360deg);
          }
        }

        @keyframes glowPulse {
          0%, 100% {
            box-shadow: 
              0 0 20px rgba(102, 126, 234, 0.3),
              0 0 40px rgba(102, 126, 234, 0.2),
              0 0 60px rgba(102, 126, 234, 0.1);
          }
          50% {
            box-shadow: 
              0 0 30px rgba(102, 126, 234, 0.5),
              0 0 60px rgba(102, 126, 234, 0.3),
              0 0 90px rgba(102, 126, 234, 0.2);
          }
        }

        /* Contenedor Principal - Optimizado Full HD */
        .modern-welcome {
          min-height: 100vh;
          background: 
            radial-gradient(circle at 20% 50%, rgba(30, 58, 138, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(12, 74, 110, 0.15) 0%, transparent 50%),
            linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #0c4a6e 50%, #075985 75%, #0369a1 100%);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          perspective: 1500px;
        }

        /* Partículas de fondo animadas */
        .modern-welcome::before {
          content: '';
          position: absolute;
          top: -10%;
          left: -10%;
          right: -10%;
          bottom: -10%;
          background-image: 
            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.08) 0%, transparent 3%),
            radial-gradient(circle at 60% 70%, rgba(255, 255, 255, 0.08) 0%, transparent 3%),
            radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 3%),
            radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.08) 0%, transparent 3%);
          background-size: 300px 300px, 400px 400px, 250px 250px, 350px 350px;
          animation: particleFloat 30s linear infinite;
          pointer-events: none;
        }

        /* Efecto de brillo superior */
        .modern-welcome::after {
          content: '';
          position: absolute;
          top: -50%;
          left: 50%;
          transform: translateX(-50%);
          width: 150%;
          height: 200%;
          background: radial-gradient(
            ellipse at center,
            rgba(255, 255, 255, 0.12) 0%,
            rgba(255, 255, 255, 0.05) 25%,
            transparent 60%
          );
          animation: pulse 10s ease-in-out infinite;
          pointer-events: none;
        }

        /* Contenedor con glassmorphism Full HD */
        .modern-container {
          max-width: 1800px;
          width: 100%;
          background: 
            linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%);
          border-radius: 40px;
          padding: 70px 80px;
          box-shadow: 
            0 50px 150px rgba(0, 0, 0, 0.45),
            0 20px 60px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            inset 0 -1px 0 rgba(0, 0, 0, 0.05);
          position: relative;
          z-index: 1;
          animation: scaleIn 1s cubic-bezier(0.165, 0.84, 0.44, 1);
          backdrop-filter: blur(25px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.25);
          transform-style: preserve-3d;
        }

        /* Borde brillante animado */
        .modern-container::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 40px;
          padding: 2px;
          background: linear-gradient(
            135deg,
            rgba(102, 126, 234, 0.4),
            rgba(118, 75, 162, 0.4),
            rgba(102, 126, 234, 0.4)
          );
          -webkit-mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: shimmer 3s linear infinite;
          pointer-events: none;
        }


        /* Header Logo - Full HD Premium */
        .logo-section {
          text-align: center;
          margin-bottom: 60px;
          padding-bottom: 50px;
          position: relative;
          animation: fadeIn 1s cubic-bezier(0.165, 0.84, 0.44, 1);
        }

        .logo-section::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 400px;
          height: 4px;
          background: linear-gradient(
            90deg, 
            transparent, 
            rgba(102, 126, 234, 0.3),
            rgba(102, 126, 234, 0.8),
            rgba(118, 75, 162, 0.8),
            rgba(102, 126, 234, 0.8),
            rgba(102, 126, 234, 0.3),
            transparent
          );
          animation: shimmer 3s ease-in-out infinite;
        }

        .logo-section img {
          max-width: 260px;
          height: auto;
          display: block;
          margin: 0 auto 30px;
          animation: float 5s ease-in-out infinite;
          filter: 
            drop-shadow(0 20px 40px rgba(102, 126, 234, 0.4))
            drop-shadow(0 10px 20px rgba(118, 75, 162, 0.3));
          transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.6s ease;
          transform-style: preserve-3d;
          transform: translateZ(0);
          will-change: transform, filter;
          backface-visibility: hidden;
        }

        .logo-section img:hover {
          transform: scale(1.12) rotateY(5deg) rotateX(-5deg) translateZ(20px);
          filter: 
            drop-shadow(0 30px 60px rgba(102, 126, 234, 0.6))
            drop-shadow(0 15px 30px rgba(118, 75, 162, 0.5))
            brightness(1.1);
        }

        .copyright-badge {
          display: inline-block;
          padding: 14px 32px;
          background: 
            linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08)),
            linear-gradient(to right, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.6));
          border-radius: 60px;
          font-size: 1em;
          color: #1e293b;
          font-weight: 700;
          margin-bottom: 12px;
          border: 2px solid rgba(102, 126, 234, 0.25);
          animation: fadeIn 1.2s cubic-bezier(0.165, 0.84, 0.44, 1) 0.3s both;
          box-shadow: 
            0 8px 24px rgba(102, 126, 234, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease, border-color 0.3s ease;
          transform: translateZ(0);
          will-change: transform;
          backface-visibility: hidden;
        }

        .copyright-badge:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 
            0 12px 32px rgba(102, 126, 234, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 1);
          border-color: rgba(102, 126, 234, 0.4);
        }

        .copyright-badge strong {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hq-brand {
          font-size: 0.92em;
          color: #64748b;
          margin-top: 10px;
          font-weight: 600;
          letter-spacing: 0.5px;
          animation: fadeIn 1.4s cubic-bezier(0.165, 0.84, 0.44, 1) 0.5s both;
        }

        /* Hero Section - Full HD Premium */
        .hero-section {
          text-align: center;
          margin-bottom: 70px;
          animation: fadeIn 1.2s cubic-bezier(0.165, 0.84, 0.44, 1) 0.4s both;
        }

        .hero-icon-group {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin-bottom: 40px;
          perspective: 1000px;
        }

        .hero-icon {
          animation: float 4s ease-in-out infinite;
          filter: 
            drop-shadow(0 12px 24px rgba(102, 126, 234, 0.5))
            drop-shadow(0 6px 12px rgba(118, 75, 162, 0.3));
          transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.5s ease;
          cursor: pointer;
          transform-style: preserve-3d;
          transform: translateZ(0);
          will-change: transform, filter;
          backface-visibility: hidden;
        }

        .hero-icon:hover {
          transform: scale(1.2) rotateY(15deg) translateZ(30px);
          filter: 
            drop-shadow(0 20px 40px rgba(102, 126, 234, 0.7))
            drop-shadow(0 10px 20px rgba(118, 75, 162, 0.5))
            brightness(1.2);
        }

        .hero-icon:nth-child(2) {
          animation-delay: 0.3s;
        }

        .hero-icon:nth-child(3) {
          animation-delay: 0.6s;
        }

        .hero-title {
          font-size: 4.5em;
          font-weight: 900;
          margin: 0 0 25px 0;
          background: linear-gradient(
            135deg, 
            #667eea 0%, 
            #764ba2 25%,
            #667eea 50%,
            #764ba2 75%,
            #667eea 100%
          );
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -3px;
          line-height: 1.1;
          text-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
          animation: shimmer 5s linear infinite;
        }

        .hero-subtitle {
          font-size: 1.65em;
          color: #475569;
          margin: 0;
          line-height: 1.7;
          font-weight: 500;
          letter-spacing: 0.3px;
        }

        /* Action Cards - Full HD Premium con transiciones 3D */
        .action-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 35px;
          margin-bottom: 70px;
          animation: slideUp 1.2s cubic-bezier(0.165, 0.84, 0.44, 1) 0.6s both;
          perspective: 2000px;
        }

        .action-card-modern {
          background: 
            linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
          border-radius: 30px;
          padding: 55px 45px;
          text-align: center;
          cursor: pointer;
          transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease, border-color 0.3s ease;
          position: relative;
          overflow: hidden;
          border: 2px solid rgba(102, 126, 234, 0.15);
          box-shadow: 
            0 20px 50px rgba(0, 0, 0, 0.12),
            0 10px 25px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          transform-style: preserve-3d;
          backdrop-filter: blur(10px);
          transform: translateZ(0);
          will-change: transform;
          backface-visibility: hidden;
        }

        /* Efecto de brillo al hover */
        .action-card-modern::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -150%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            120deg,
            transparent,
            rgba(102, 126, 234, 0.25) 40%,
            rgba(118, 75, 162, 0.25) 60%,
            transparent
          );
          transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform: translateX(0) rotate(25deg) translateZ(0);
          will-change: transform;
        }

        .action-card-modern:hover::before {
          transform: translateX(300%) rotate(25deg) translateZ(0);
        }

        /* Borde brillante animado */
        .action-card-modern::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 30px;
          padding: 2px;
          background: linear-gradient(
            135deg,
            rgba(102, 126, 234, 0),
            rgba(102, 126, 234, 0.5),
            rgba(118, 75, 162, 0.5),
            rgba(102, 126, 234, 0)
          );
          -webkit-mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.6s ease;
        }

        .action-card-modern:hover::after {
          opacity: 1;
          animation: shimmer 2s linear infinite;
        }

        .action-card-modern:hover {
          transform: translateY(-20px) scale(1.05) rotateX(5deg);
          box-shadow: 
            0 40px 100px rgba(102, 126, 234, 0.35),
            0 20px 50px rgba(118, 75, 162, 0.25),
            0 0 0 1px rgba(102, 126, 234, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 1);
          border-color: rgba(102, 126, 234, 0.4);
        }

        .action-card-modern.disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          border-color: rgba(0, 0, 0, 0.1);
        }

        .action-card-modern.disabled:hover {
          transform: none;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
          border-color: rgba(0, 0, 0, 0.1);
        }

        .action-card-modern.disabled::before,
        .action-card-modern.disabled::after {
          display: none;
        }

        .action-icon-wrapper {
          width: 110px;
          height: 110px;
          margin: 0 auto 30px;
          background: linear-gradient(
            135deg, 
            rgba(102, 126, 234, 0.12), 
            rgba(118, 75, 162, 0.12)
          );
          border-radius: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: float 4s ease-in-out infinite;
          transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
          box-shadow: 
            0 10px 30px rgba(102, 126, 234, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
          transform-style: preserve-3d;
        }

        .action-icon-wrapper::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 30px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          opacity: 0;
          transition: opacity 0.5s ease;
          z-index: -1;
        }

        .action-card-modern:hover .action-icon-wrapper {
          background: linear-gradient(135deg, #667eea, #764ba2);
          transform: rotate(12deg) scale(1.15) translateZ(30px);
          box-shadow: 
            0 20px 50px rgba(102, 126, 234, 0.5),
            0 10px 25px rgba(118, 75, 162, 0.3);
        }

        .action-card-modern:hover .action-icon-wrapper::before {
          opacity: 1;
          animation: glowPulse 2s ease-in-out infinite;
        }

        .action-card-modern:hover .action-icon-wrapper svg {
          color: white !important;
          filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.8));
        }

        .action-card-modern.disabled .action-icon-wrapper {
          background: #dee2e6;
          box-shadow: none;
        }

        .card-title {
          font-size: 2.2em;
          font-weight: 800;
          margin: 0 0 18px 0;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -1px;
          transition: all 0.4s ease;
        }

        .action-card-modern:hover .card-title {
          letter-spacing: 0.5px;
        }

        .action-card-modern.disabled .card-title {
          background: #adb5bd;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .card-description {
          color: #64748b;
          line-height: 1.9;
          margin: 0 0 35px 0;
          font-size: 1.15em;
          font-weight: 500;
        }

        .card-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 20px 50px;
          border-radius: 60px;
          font-size: 1.2em;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 14px;
          transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease;
          box-shadow: 
            0 15px 40px rgba(102, 126, 234, 0.45),
            0 5px 15px rgba(118, 75, 162, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
          position: relative;
          overflow: hidden;
          letter-spacing: 0.5px;
          transform: translateZ(0);
          will-change: transform;
          backface-visibility: hidden;
        }

        .card-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.35);
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(0) translateZ(0);
          transition: transform 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          will-change: transform;
        }

        .card-button:hover::before {
          transform: translate(-50%, -50%) scale(50) translateZ(0);
        }

        .card-button:hover {
          transform: scale(1.12) translateY(-3px);
          box-shadow: 
            0 25px 60px rgba(102, 126, 234, 0.7),
            0 10px 25px rgba(118, 75, 162, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }

        .card-button:active {
          transform: scale(1.05) translateY(-1px);
        }

        .action-card-modern.disabled .card-button {
          background: linear-gradient(135deg, #adb5bd, #868e96);
          cursor: not-allowed;
          box-shadow: none;
        }

        .action-card-modern.disabled .card-button:hover {
          transform: none;
        }

        /* Tour Card - Estilos Premium Especiales */
        .action-card-tour {
          background: linear-gradient(
            135deg, 
            rgba(255, 245, 245, 0.98) 0%, 
            rgba(255, 255, 255, 0.95) 100%
          );
          border: 2px solid rgba(255, 107, 107, 0.3) !important;
          box-shadow: 
            0 20px 50px rgba(255, 107, 107, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
        }

        .action-card-tour:hover {
          box-shadow: 
            0 40px 100px rgba(255, 107, 107, 0.4),
            0 20px 50px rgba(255, 107, 107, 0.3),
            0 0 0 1px rgba(255, 107, 107, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 1) !important;
          border-color: rgba(255, 107, 107, 0.6) !important;
        }

        .card-button-tour {
          background: linear-gradient(135deg, #FF6B6B 0%, #FF8787 100%) !important;
          box-shadow: 
            0 15px 40px rgba(255, 107, 107, 0.5),
            0 5px 15px rgba(255, 135, 135, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
          animation: tourButtonPulse 2.5s ease-in-out infinite;
        }

        @keyframes tourButtonPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 
              0 15px 40px rgba(255, 107, 107, 0.5),
              0 5px 15px rgba(255, 135, 135, 0.3);
          }
          50% {
            transform: scale(1.08);
            box-shadow: 
              0 20px 50px rgba(255, 107, 107, 0.7),
              0 10px 25px rgba(255, 135, 135, 0.5);
          }
        }

        .card-button-tour:hover {
          box-shadow: 
            0 25px 60px rgba(255, 107, 107, 0.8),
            0 10px 25px rgba(255, 135, 135, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.5) !important;
        }

        .tour-badge {
          position: absolute;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #FFD93D 0%, #FFA500 100%);
          color: #1e293b;
          font-size: 0.85em;
          font-weight: 800;
          padding: 8px 18px;
          border-radius: 25px;
          box-shadow: 
            0 8px 20px rgba(255, 165, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          animation: badgeWiggle 3s ease-in-out infinite;
          letter-spacing: 0.5px;
        }

        @keyframes badgeWiggle {
          0%, 100% {
            transform: rotate(0deg) scale(1);
          }
          10% {
            transform: rotate(-8deg) scale(1.05);
          }
          20% {
            transform: rotate(8deg) scale(1.05);
          }
          30% {
            transform: rotate(-8deg) scale(1.05);
          }
          40% {
            transform: rotate(0deg) scale(1);
          }
        }

        /* Cache Status - Mejorado */
        .cache-status {
          margin-top: 28px;
          padding: 24px;
          background: linear-gradient(
            135deg, 
            rgba(76, 175, 80, 0.12), 
            rgba(67, 160, 71, 0.08)
          );
          border-radius: 18px;
          border-left: 6px solid #4CAF50;
          animation: fadeIn 0.8s cubic-bezier(0.165, 0.84, 0.44, 1);
          box-shadow: 
            0 8px 20px rgba(76, 175, 80, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          transition: all 0.4s ease;
        }

        .cache-status:hover {
          transform: translateX(5px);
          box-shadow: 
            0 12px 30px rgba(76, 175, 80, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .cache-status strong {
          color: #2E7D32;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          font-size: 1.05em;
        }

        .cache-details {
          color: #388E3C;
          font-size: 1em;
          line-height: 1.7;
          font-weight: 500;
        }

        /* Features Grid - Full HD Premium */
        .features-showcase {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 35px;
          margin-bottom: 60px;
          animation: slideUp 1.4s cubic-bezier(0.165, 0.84, 0.44, 1) 0.8s both;
        }

        .feature-item {
          background: linear-gradient(
            135deg, 
            rgba(248, 249, 255, 0.95) 0%, 
            rgba(255, 255, 255, 0.9) 100%
          );
          padding: 40px 30px;
          border-radius: 25px;
          text-align: center;
          border: 2px solid rgba(102, 126, 234, 0.15);
          transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease, border-color 0.3s ease;
          box-shadow: 
            0 10px 30px rgba(102, 126, 234, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(10px);
          transform: translateZ(0);
          will-change: transform;
          backface-visibility: hidden;
        }

        .feature-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(102, 126, 234, 0.1),
            transparent
          );
          transition: transform 0.7s ease;
          transform: translateX(-100%) translateZ(0);
          will-change: transform;
        }

        .feature-item:hover::before {
          transform: translateX(100%) translateZ(0);
        }

        .feature-item:hover {
          transform: translateY(-12px) scale(1.03);
          box-shadow: 
            0 25px 60px rgba(102, 126, 234, 0.25),
            0 10px 30px rgba(118, 75, 162, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 1);
          border-color: rgba(102, 126, 234, 0.4);
        }

        .feature-icon-circle {
          width: 80px;
          height: 80px;
          margin: 0 auto 25px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: float 5s ease-in-out infinite;
          box-shadow: 
            0 12px 30px rgba(102, 126, 234, 0.4),
            0 6px 15px rgba(118, 75, 162, 0.3),
            inset 0 2px 0 rgba(255, 255, 255, 0.3);
          transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
          transform: translateZ(0);
          will-change: transform;
          backface-visibility: hidden;
        }

        .feature-icon-circle::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          opacity: 0;
          filter: blur(10px);
          transition: opacity 0.5s ease;
        }

        .feature-item:hover .feature-icon-circle {
          transform: scale(1.15) rotate(10deg);
          box-shadow: 
            0 18px 45px rgba(102, 126, 234, 0.6),
            0 9px 22px rgba(118, 75, 162, 0.5),
            inset 0 2px 0 rgba(255, 255, 255, 0.5);
        }

        .feature-item:hover .feature-icon-circle::before {
          opacity: 1;
          animation: glowPulse 1.5s ease-in-out infinite;
        }

        .feature-item:nth-child(2) .feature-icon-circle {
          animation-delay: 0.3s;
        }

        .feature-item:nth-child(3) .feature-icon-circle {
          animation-delay: 0.6s;
        }

        .feature-name {
          font-size: 1.4em;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 12px 0;
          letter-spacing: -0.3px;
        }

        .feature-desc {
          color: #64748b;
          font-size: 1em;
          line-height: 1.7;
          font-weight: 500;
        }

        /* Footer - Full HD Premium */
        .footer-section {
          text-align: center;
          padding-top: 50px;
          border-top: 2px solid rgba(102, 126, 234, 0.15);
          animation: fadeIn 1.6s cubic-bezier(0.165, 0.84, 0.44, 1) 1s both;
        }

        .footer-text {
          color: #64748b;
          font-size: 1em;
          line-height: 1.9;
          font-weight: 500;
        }

        .footer-text strong {
          color: #1e293b;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 700;
        }

        .footer-brand {
          margin-top: 14px;
          font-size: 0.95em;
          color: #94a3b8;
          font-style: italic;
          font-weight: 500;
        }

        /* Responsive Full HD Optimizado */
        @media (max-width: 1600px) {
          .modern-container {
            max-width: 1400px;
            padding: 60px 70px;
          }

          .hero-title {
            font-size: 4em;
          }
        }

        @media (max-width: 1400px) {
          .modern-container {
            max-width: 1200px;
            padding: 50px 60px;
          }

          .hero-title {
            font-size: 3.5em;
          }

          .action-icon-wrapper {
            width: 100px;
            height: 100px;
          }
        }

        @media (max-width: 1200px) {
          .action-grid,
          .features-showcase {
            grid-template-columns: 1fr;
            gap: 30px;
          }

          .modern-container {
            padding: 45px 50px;
          }

          .hero-title {
            font-size: 3.2em;
          }
        }

        @media (max-width: 1024px) {
          .hero-title {
            font-size: 2.8em;
            letter-spacing: -2px;
          }

          .hero-subtitle {
            font-size: 1.4em;
          }

          .card-title {
            font-size: 2em;
          }
        }

        @media (max-width: 768px) {
          .modern-container {
            padding: 40px 35px;
            border-radius: 30px;
          }

          .hero-title {
            font-size: 2.5em;
            letter-spacing: -1.5px;
          }

          .hero-subtitle {
            font-size: 1.25em;
          }

          .logo-section img {
            max-width: 200px;
          }

          .action-icon-wrapper {
            width: 90px;
            height: 90px;
          }

          .card-title {
            font-size: 1.8em;
          }

          .card-button {
            padding: 16px 40px;
            font-size: 1.1em;
          }

          .tour-badge {
            font-size: 0.75em;
            padding: 6px 14px;
          }

          .feature-icon-circle {
            width: 70px;
            height: 70px;
          }
        }

        @media (max-width: 480px) {
          .modern-container {
            padding: 30px 25px;
          }

          .hero-icon-group {
            gap: 20px;
          }

          .hero-icon {
            width: 50px;
            height: 50px;
          }
        }

        /* ========================================
           ACCESIBILIDAD - REDUCED MOTION
           ======================================== */
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }

          .logo-section img,
          .hero-icon,
          .action-card-modern,
          .feature-item,
          .feature-icon-circle,
          .card-button {
            animation: none;
          }

          .action-card-modern:hover,
          .feature-item:hover,
          .card-button:hover,
          .hero-icon:hover,
          .logo-section img:hover {
            transform: none;
          }
        }
      `}</style>

      <div className="modern-container">
        {/* Logo y Copyright */}
        <div className="logo-section">
          {!logoError ? (
            <img 
              src={`${process.env.PUBLIC_URL}/logo-hq-analytics.png`}
              alt="HQ Analytics - High Technology Quality" 
              onError={() => {
                console.error('Error loading logo');
                setLogoError(true);
              }}
              loading="eager"
              style={{ willChange: 'transform' }}
            />
          ) : (
            <div style={{
              width: '260px',
              height: '260px',
              margin: '0 auto 30px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: 'white',
              padding: '40px',
              boxShadow: '0 20px 60px rgba(102, 126, 234, 0.5)',
              animation: 'float 5s ease-in-out infinite'
            }}>
              <div style={{ 
                fontSize: '2.5em', 
                fontWeight: 'bold', 
                marginBottom: '15px',
                letterSpacing: '2px'
              }}>HQ</div>
              <div style={{ 
                fontSize: '1em', 
                textAlign: 'center',
                lineHeight: '1.5',
                fontWeight: '500'
              }}>High Technology Quality Analytics</div>
            </div>
          )}
          
          <div className="copyright-badge">
            <strong>© 2025 Saenz Fallas S.A.</strong> - Todos los derechos reservados
          </div>
          <div className="hq-brand">
            HQ Analytics™ - High Technology Quality Analytics
          </div>
        </div>

        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-icon-group">
            <Database 
              size={70} 
              className="hero-icon" 
              style={{ 
                color: '#667eea',
                willChange: 'transform'
              }} 
            />
            <BarChart3 
              size={70} 
              className="hero-icon" 
              style={{ 
                color: '#764ba2',
                willChange: 'transform'
              }} 
            />
            <TrendingUp 
              size={70} 
              className="hero-icon" 
              style={{ 
                color: '#667eea',
                willChange: 'transform'
              }} 
            />
          </div>
          <h1 className="hero-title" style={{ willChange: 'transform' }}>
            Sistema de Análisis SICOP
          </h1>
          <p className="hero-subtitle">
            Plataforma integral para gestión inteligente y análisis avanzado de licitaciones públicas
          </p>
        </div>

        {/* Action Cards */}
        <div className="action-grid">
          {/* Card 1: Tour Guiado */}
          <div 
            className="action-card-modern action-card-tour" 
            onClick={onStartTour}
            style={{ willChange: 'transform' }}
          >
            <div className="action-icon-wrapper">
              <Compass size={55} style={{ color: '#FF6B6B' }} />
            </div>
            <h3 className="card-title" style={{ 
              background: 'linear-gradient(135deg, #FF6B6B, #FF8787)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Tour Guiado
            </h3>
            <p className="card-description">
              Aprende paso a paso cómo cargar, revisar y exportar tus datos con un recorrido interactivo diseñado para ti.
            </p>
            <button className="card-button card-button-tour">
              <PlayCircle size={24} />
              <span>Iniciar Tour</span>
            </button>
            <div className="tour-badge">
              🎓 Tutorial Interactivo
            </div>
          </div>

          {/* Card 2: Gestionar Datos */}
          <div 
            className="action-card-modern" 
            onClick={onManageData}
            style={{ willChange: 'transform' }}
          >
            <div className="action-icon-wrapper">
              <Settings size={55} style={{ color: '#667eea' }} />
            </div>
            <h3 className="card-title">Gestionar Datos</h3>
            <p className="card-description">
              Carga, organiza y consolida archivos CSV por año y mes. 
              Mantén tus datos siempre actualizados con nuestra gestión inteligente.
            </p>
            <button className="card-button">
              <Upload size={24} />
              <span>Ir a Gestión de Datos</span>
            </button>
          </div>

          {/* Card 3: Ir a Aplicación */}
          <div 
            className={`action-card-modern ${!hasCache ? 'disabled' : ''}`}
            onClick={hasCache ? onLaunchApp : undefined}
            style={{ willChange: 'transform' }}
          >
            <div className="action-icon-wrapper">
              <PlayCircle size={55} style={{ color: hasCache ? '#667eea' : '#999' }} />
            </div>
            <h3 className="card-title">Ir a Aplicación</h3>
            <p className="card-description">
              Accede a la aplicación principal con análisis en tiempo real, 
              visualizaciones interactivas y reportes detallados.
            </p>
            <button className="card-button">
              <BarChart3 size={24} />
              <span>{hasCache ? 'Lanzar Aplicación' : 'Requiere Datos'}</span>
            </button>
            
            {hasCache && !checking && cacheStats && (
              <div className="cache-status">
                <strong>
                  <Check size={20} />
                  Sistema Listo
                </strong>
                <div className="cache-details">
                  {cacheStats.totalRecords?.toLocaleString()} registros disponibles
                  {cacheStats.lastUpdated && ` • Actualizado: ${new Date(cacheStats.lastUpdated).toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Opción de Instalación PWA */}
        <InstallCard />

        {/* Features */}
        <div className="features-showcase">
          <div className="feature-item" style={{ willChange: 'transform' }}>
            <div className="feature-icon-circle">
              <Sparkles size={40} style={{ color: 'white' }} />
            </div>
            <h4 className="feature-name">Análisis Inteligente</h4>
            <p className="feature-desc">
              Algoritmos avanzados de última generación para detectar patrones, tendencias y anomalías en tus datos
            </p>
          </div>

          <div className="feature-item" style={{ willChange: 'transform' }}>
            <div className="feature-icon-circle">
              <Zap size={40} style={{ color: 'white' }} />
            </div>
            <h4 className="feature-name">Alto Rendimiento</h4>
            <p className="feature-desc">
              Procesamiento ultrarrápido optimizado para grandes volúmenes de información en tiempo real
            </p>
          </div>

          <div className="feature-item" style={{ willChange: 'transform' }}>
            <div className="feature-icon-circle">
              <Shield size={40} style={{ color: 'white' }} />
            </div>
            <h4 className="feature-name">Datos Seguros</h4>
            <p className="feature-desc">
              Máxima seguridad con cifrado de nivel empresarial y privacidad absoluta en el manejo de tu información
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="footer-section">
          <p className="footer-text">
            Desarrollado con excelencia tecnológica por <strong>Saenz Fallas S.A.</strong>
          </p>
          <p className="footer-text">
            HQ Analytics™ - Sistema de análisis de alta calidad tecnológica para el sector público
          </p>
          <p className="footer-brand">
            Software de uso exclusivo • Todos los derechos reservados © 2025
          </p>
        </div>
      </div>
    </div>
  );
};

// Export default para lazy loading
export default WelcomeScreenModern;
