import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const queryRaw = jest.fn();
  let service: HealthService;

  beforeEach(async () => {
    queryRaw.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
      ],
    }).compile();

    service = moduleRef.get(HealthService);
  });

  it('reports ok when the database responds', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
  });

  it('reports error when the database is unreachable', async () => {
    queryRaw.mockRejectedValue(new Error('connection refused'));

    const result = await service.check();

    expect(result.status).toBe('error');
    expect(result.database).toBe('down');
  });
});
