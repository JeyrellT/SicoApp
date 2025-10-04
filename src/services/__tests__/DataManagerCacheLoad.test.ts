import { dataManager } from '../../data/DataManager';

describe('DataManager.loadDataFromMemory', () => {
  afterEach(() => {
    dataManager.clearData();
  });

  it('normalizes dates, numbers and preserves metadata when loading from cache', async () => {
    await dataManager.loadDataFromMemory({
      Contratos: [
        {
          NRO_CONTRATO: 'CN-001',
          fecha_elaboracion: '10/05/2024',
          monto_contrato: '₡1.234,56',
          nro_sicop: '2024MEP-123',
          _YEAR: 2024,
          _MONTH: 5,
          _FILE_SOURCE: 'Contratos_2024_05.csv',
          _UPLOAD_DATE: '2024-06-01T00:00:00Z'
        }
      ],
      DetalleCarteles: []
    });

    const contratos = dataManager.obtenerDatos('Contratos');
    expect(contratos).toHaveLength(1);

    const contrato = contratos[0];
    expect(contrato.idContrato).toBe('CN-001');
    expect(contrato.numeroCartel).toBe('2024MEP-123');
    expect(contrato.fechaFirma).toBeInstanceOf(Date);
    expect(contrato.fechaFirma?.toISOString()).toBe('2024-05-10T00:00:00.000Z');
    expect(contrato.montoContrato).toBeCloseTo(1234.56, 2);

    expect(contrato._YEAR).toBe(2024);
    expect(contrato._MONTH).toBe(5);
    expect(contrato._FILE_SOURCE).toBe('Contratos_2024_05.csv');
  });
});
