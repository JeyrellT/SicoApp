import React, { useState } from 'react';

export interface ModoToggleProps {
	/** Modo inicial seleccionado para el análisis. */
	initialMode?: 'general' | 'detallado';
	/** Callback opcional que se dispara cuando cambia el modo. */
	onChange?: (mode: 'general' | 'detallado') => void;
	/** Etiquetas personalizadas para mostrar en el botón. */
	labels?: {
		general: string;
		detallado: string;
	};
}

const defaultLabels: Required<ModoToggleProps['labels']> = {
	general: 'Modo general',
	detallado: 'Modo detallado',
};

/**
 * Componente mínimo de alternancia entre modos de visualización.
 * Sirve como placeholder funcional mientras se implementa el módulo completo.
 */
export const ModoToggle: React.FC<ModoToggleProps> = ({
	initialMode = 'general',
	onChange,
	labels = defaultLabels,
}) => {
	const [modo, setModo] = useState<'general' | 'detallado'>(initialMode);

	const handleToggle = () => {
		const nextMode = modo === 'general' ? 'detallado' : 'general';
		setModo(nextMode);
		onChange?.(nextMode);
	};

	return (
		<button
			type="button"
			className={`modo-toggle modo-toggle--${modo}`}
			onClick={handleToggle}
		>
			{modo === 'general' ? labels.general : labels.detallado}
		</button>
	);
};

export default ModoToggle;
