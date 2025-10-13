/**
 * SICOP Analytics - Componente de Instalación PWA (Versión Discreta)
 * 
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 * @author Saenz Fallas S.A.
 * @company Saenz Fallas S.A.
 * @license Propiedad de Saenz Fallas S.A.
 * 
 * HQ Analytics™ - High Technology Quality Analytics
 */

import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Componente discreto de instalación PWA
 * Solo exporta un hook y componentes integrados, sin pop-ups
 */

// Hook personalizado para gestionar la instalación
export const useInstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Verificar si ya está instalada
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };
    
    const installed = checkIfInstalled();

    // Capturar evento de instalación
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setCanInstall(true);
      console.log('📱 PWA lista para instalar');
    };

    // Listener para detectar cuando se instala la app
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      console.log('✅ PWA instalada exitosamente!');
    };

    if (!installed) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) {
      console.log('❌ No hay prompt de instalación disponible');
      return { success: false, error: 'No installation prompt available' };
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        console.log('✅ Usuario aceptó instalar la PWA');
        setDeferredPrompt(null);
        setCanInstall(false);
        return { success: true };
      } else {
        console.log('❌ Usuario rechazó instalar la PWA');
        return { success: false, dismissed: true };
      }
    } catch (error) {
      console.error('Error al intentar instalar PWA:', error);
      return { success: false, error };
    }
  };

  return {
    canInstall,
    isInstalled,
    install
  };
};

/**
 * Componente de botón discreto para instalar
 * Se integra naturalmente en la interfaz
 */
export const InstallButton: React.FC<{
  className?: string;
  style?: React.CSSProperties;
  variant?: 'primary' | 'secondary' | 'minimal';
}> = ({ className = '', style = {}, variant = 'primary' }) => {
  const { canInstall, isInstalled, install } = useInstallPWA();

  if (isInstalled || !canInstall) {
    return null;
  }

  const handleClick = async () => {
    const result = await install();
    if (result.success) {
      // Opcional: mostrar notificación de éxito
    }
  };

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: variant === 'minimal' ? '8px 12px' : '12px 20px',
    border: variant === 'secondary' ? '2px solid rgba(255, 255, 255, 0.3)' : 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: variant === 'minimal' ? 500 : 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: variant === 'primary' 
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : variant === 'secondary'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'transparent',
    color: 'white',
    ...style
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      style={baseStyles}
      title="Instalar SICOP Analytics como aplicación"
    >
      <span style={{ fontSize: '16px' }}>📱</span>
      <span>Instalar App</span>
    </button>
  );
};

/**
 * Componente visual de opción de instalación para pantalla de bienvenida
 * No es un pop-up, sino una tarjeta integrada
 */
export const InstallCard: React.FC = () => {
  const { canInstall, isInstalled, install } = useInstallPWA();
  const [installing, setInstalling] = useState(false);

  if (isInstalled || !canInstall) {
    return null;
  }

  const handleInstall = async () => {
    setInstalling(true);
    await install();
    setInstalling(false);
  };

  return (
    <>
      <style>{`
        .pwa-install-card {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          border: 2px solid rgba(102, 126, 234, 0.3);
          border-radius: 12px;
          padding: 20px;
          margin: 16px 0;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.3s ease;
        }

        .pwa-install-card:hover {
          border-color: rgba(102, 126, 234, 0.6);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }

        .pwa-install-icon {
          flex-shrink: 0;
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .pwa-install-content {
          flex: 1;
        }

        .pwa-install-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 6px 0;
          color: #333;
        }

        .pwa-install-description {
          font-size: 13px;
          color: #666;
          margin: 0;
          line-height: 1.4;
        }

        .pwa-install-btn {
          padding: 10px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .pwa-install-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .pwa-install-btn:active {
          transform: translateY(0);
        }

        .pwa-install-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .pwa-install-card {
            flex-direction: column;
            text-align: center;
          }

          .pwa-install-btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="pwa-install-card">
        <div className="pwa-install-icon">📱</div>
        <div className="pwa-install-content">
          <h4 className="pwa-install-title">Instalar como Aplicación</h4>
          <p className="pwa-install-description">
            Obtén acceso rápido desde tu escritorio y úsala sin conexión
          </p>
        </div>
        <button
          className="pwa-install-btn"
          onClick={handleInstall}
          disabled={installing}
        >
          {installing ? 'Instalando...' : 'Instalar'}
        </button>
      </div>
    </>
  );
};

/**
 * Componente principal - ya no es un pop-up
 * Ahora es solo un export del hook y componentes
 */
export const InstallPrompt: React.FC = () => {
  // Este componente ahora no renderiza nada
  // Se mantiene por compatibilidad pero no hace pop-ups
  return null;
};
