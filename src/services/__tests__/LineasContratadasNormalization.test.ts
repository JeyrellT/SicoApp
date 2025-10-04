import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';
import { headerNormalizationService } from '../HeaderNormalizationService';

describe('LineasContratadas normalization', () => {
  it('maps required fields to canonical keys', () => {
    const csvPath = path.resolve(__dirname, '../../../public/cleaned/LineasContratadas.csv');
    const csvRaw = fs.readFileSync(csvPath, 'utf8');
    const { data } = Papa.parse<Record<string, string>>(csvRaw, {
      header: true,
      skipEmptyLines: true
    });

    expect(data.length).toBeGreaterThan(0);

    const sample = data.slice(0, 10);
    const normalized = headerNormalizationService.normalizeRecords(sample, 'LineasContratadas');

    normalized.forEach((record, index) => {
      expect(record.numeroCartel).toBeTruthy();
      expect(record.idContrato).toBeTruthy();
      expect(record.numeroLinea).not.toBeUndefined();
      expect(record.numeroLineaCartel).not.toBeUndefined();

      if (!record.numeroCartel || !record.idContrato) {
        // Help debugging if assertion fails
        // eslint-disable-next-line no-console
        console.error('Record missing required mapping', { index, record });
      }
    });
  });
});
