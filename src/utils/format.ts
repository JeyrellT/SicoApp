// Utilidades de formato para montos en CRC y números compactos

export function formatNumber(n: number | null | undefined): string {
  if (n == null || !isFinite(Number(n))) return '0';
  try {
    return Number(n).toLocaleString('es-CR');
  } catch {
    return String(Math.round(Number(n)));
  }
}

export function formatCRC(n: number | null | undefined): string {
  if (n == null || !isFinite(Number(n))) return '₡0';
  return `₡${formatNumber(Math.round(Number(n)))}`;
}

export function formatCRCCompact(n: number | null | undefined): string {
  const v = Number(n) || 0;
  if (!isFinite(v) || v === 0) return '₡0';
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) {
    return `₡${(v / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `₡${(v / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `₡${(v / 1_000).toFixed(1)}K`;
  }
  return `₡${v.toFixed(0)}`;
}

export function withTooltip(value: string, full: number | null | undefined): { text: string; title: string } {
  return { text: value, title: formatCRC(full ?? 0) };
}
