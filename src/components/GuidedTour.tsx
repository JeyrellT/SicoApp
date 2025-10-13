/**
 * SICOP Analytics - Tour Guiado Interactivo
 * 
 * @copyright 2025 Saenz Fallas S.A. - Todos los derechos reservados
 * @author Saenz Fallas S.A.
 * @company Saenz Fallas S.A.
 * 
 * HQ Analytics™ - High Technology Quality Analytics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import './GuidedTour.css';

export interface TourStep {
  id: string;
  title: string;
  description?: string;
  content?: React.ReactNode; // Permite contenido JSX enriquecido
  target?: string; // CSS selector (opcional - para pasos centrados)
  targetSelector?: string; // Alias para target
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => Promise<void>;
  onEnter?: () => void; // Callback al entrar al paso
  highlightPulse?: boolean;
}

interface GuidedTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
  autoStart?: boolean;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ 
  steps, 
  onComplete, 
  onSkip,
  autoStart = false 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(autoStart);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Activar tour cuando autoStart cambia a true
  useEffect(() => {
    if (autoStart) {
      setIsActive(true);
      setCurrentStep(0);
    }
  }, [autoStart]);

  useEffect(() => {
    const step = steps[currentStep];
    const selector = step?.targetSelector || step?.target;
    
    if (isActive && selector) {
      updateTargetPosition();
      window.addEventListener('resize', updateTargetPosition);
      return () => window.removeEventListener('resize', updateTargetPosition);
    } else {
      setTargetRect(null);
    }
    
    // Ejecutar callback onEnter si existe
    if (isActive && step?.onEnter) {
      step.onEnter();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, isActive]);

  const updateTargetPosition = useCallback(() => {
    const step = steps[currentStep];
    const selector = step?.targetSelector || step?.target;
    
    if (selector) {
      const element = document.querySelector(selector);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
    } else {
      setTargetRect(null);
    }
  }, [steps, currentStep]);

  const handleNext = async () => {
    const step = steps[currentStep];
    if (step.action) {
      await step.action();
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    onComplete();
  };

  const handleSkipTour = () => {
    setIsActive(false);
    onSkip();
  };

  if (!isActive) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="guided-tour-overlay">
      {/* Spotlight/Highlight */}
      {targetRect && (
        <>
          <div 
            className="tour-spotlight"
            style={{
              top: targetRect.top - 10,
              left: targetRect.left - 10,
              width: targetRect.width + 20,
              height: targetRect.height + 20,
            }}
          />
          {step.highlightPulse && (
            <div 
              className="tour-pulse"
              style={{
                top: targetRect.top - 10,
                left: targetRect.left - 10,
                width: targetRect.width + 20,
                height: targetRect.height + 20,
              }}
            />
          )}
        </>
      )}

      {/* Tour Card */}
      <div 
        className={`tour-card ${(targetRect && step.position !== 'center') ? `tour-card-${step.position || 'bottom'}` : 'tour-card-center'}`}
        style={(targetRect && step.position !== 'center') ? {
          top: step.position === 'bottom' ? targetRect.bottom + 20 : 
               step.position === 'top' ? targetRect.top - 220 :
               targetRect.top + (targetRect.height / 2) - 100,
          left: step.position === 'right' ? targetRect.right + 20 :
                step.position === 'left' ? targetRect.left - 420 :
                targetRect.left + (targetRect.width / 2) - 200,
        } : {}}
      >
        <div className="tour-card-header">
          <div className="tour-step-info">
            <span className="tour-step-badge">Paso {currentStep + 1} de {steps.length}</span>
            <h3 className="tour-title">{step.title}</h3>
          </div>
          <button className="tour-close-btn" onClick={handleSkipTour}>
            <X size={20} />
          </button>
        </div>

        <div className="tour-card-body">
          {step.content ? (
            <div className="tour-content">{step.content}</div>
          ) : (
            <p className="tour-description">{step.description}</p>
          )}
        </div>

        <div className="tour-card-footer">
          <div className="tour-progress">
            <div className="tour-progress-bar" style={{ width: `${progress}%` }} />
          </div>

          <div className="tour-buttons">
            <button 
              className="tour-btn tour-btn-secondary"
              onClick={handleSkipTour}
            >
              Saltar Tour
            </button>

            <div className="tour-nav-buttons">
              {currentStep > 0 && (
                <button 
                  className="tour-btn tour-btn-outline"
                  onClick={handlePrevious}
                >
                  <ChevronLeft size={18} />
                  Anterior
                </button>
              )}

              <button 
                className="tour-btn tour-btn-primary"
                onClick={handleNext}
              >
                {currentStep === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
                {currentStep < steps.length - 1 && <ChevronRight size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;
