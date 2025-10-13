/**
 * SICOP Analytics - Tooltip Component
 * Componente de tooltip interactivo para mostrar ayuda contextual
 * 
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 * @author Saenz Fallas S.A.
 * 
 * HQ Analytics™ - High Technology Quality Analytics
 */

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info, AlertCircle } from 'lucide-react';
import './Tooltip.css';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipType = 'info' | 'help' | 'warning';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: TooltipPosition;
  type?: TooltipType;
  maxWidth?: number;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  type = 'info',
  maxWidth = 250,
  delay = 200
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      adjustPosition();
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  const adjustPosition = () => {
    if (!tooltipRef.current || !triggerRef.current) return;

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newPosition = position;

    // Check if tooltip goes off-screen and adjust
    if (position === 'top' && tooltipRect.top < 0) {
      newPosition = 'bottom';
    } else if (position === 'bottom' && tooltipRect.bottom > viewportHeight) {
      newPosition = 'top';
    } else if (position === 'left' && tooltipRect.left < 0) {
      newPosition = 'right';
    } else if (position === 'right' && tooltipRect.right > viewportWidth) {
      newPosition = 'left';
    }

    setActualPosition(newPosition);
  };

  const getIcon = () => {
    switch (type) {
      case 'help':
        return <HelpCircle size={16} />;
      case 'warning':
        return <AlertCircle size={16} />;
      case 'info':
      default:
        return <Info size={16} />;
    }
  };

  return (
    <div 
      className="tooltip-wrapper"
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`tooltip-container tooltip-${actualPosition} tooltip-${type}`}
          style={{ maxWidth: `${maxWidth}px` }}
        >
          <div className="tooltip-icon">
            {getIcon()}
          </div>
          <div className="tooltip-content">
            {content}
          </div>
          <div className="tooltip-arrow" />
        </div>
      )}
    </div>
  );
};

/**
 * Componente de icono de ayuda con tooltip
 */
interface HelpIconProps {
  content: string | React.ReactNode;
  position?: TooltipPosition;
  size?: number;
}

export const HelpIcon: React.FC<HelpIconProps> = ({ 
  content, 
  position = 'top',
  size = 18 
}) => {
  return (
    <Tooltip content={content} position={position} type="help">
      <span className="help-icon-trigger">
        <HelpCircle size={size} />
      </span>
    </Tooltip>
  );
};

export default Tooltip;
