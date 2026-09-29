import { Test, TestingModule } from '@nestjs/testing';
import { ScannerController } from './scanner.controller.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { HttpException, HttpStatus } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('ScannerController', () => {
  let controller: ScannerController;
  let supabaseServiceMock: any;

  beforeEach(async () => {
    supabaseServiceMock = {
      client: {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        gte: vi.fn()
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScannerController],
      providers: [
        {
          provide: SupabaseService,
          useValue: supabaseServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ScannerController>(ScannerController);
  });

  it('returns sorted and formatted setups (covers AC-4, AC-5)', async () => {
    // Mock the DB response
    const mockData = [
      {
        id: '1',
        direction: 'LONG',
        setup_family: 'Breakout',
        status: 'ACTIVE',
        entry_low: 100,
        entry_high: 102,
        target_1: 110,
        created_at: new Date().toISOString(),
        snapshot_json: {
          symbol: 'RELIANCE',
          confidence: 80,
          confidence_band: 'HIGH',
          reference_entry: 101,
          stop: { level: 95 },
          metrics: { relativeVolume: "2x" }
        }
      },
      {
        id: '2',
        direction: 'SHORT',
        setup_family: 'MeanReversion',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        snapshot_json: {
          symbol: 'INFY',
          confidence: 90, // Higher confidence, should be sorted first
          confidence_band: 'HIGH',
          reference_entry: 1500,
          stop: { level: 1550 },
          metrics: { relativeVolume: "1.5x" }
        }
      }
    ];

    supabaseServiceMock.client.gte.mockResolvedValue({ data: mockData, error: null });

    const result = await controller.getTopSetups();

    expect(result.data).toHaveLength(2);
    // Assert sorting by confidence descending
    expect(result.data[0].symbol).toBe('INFY');
    expect(result.data[1].symbol).toBe('RELIANCE');
    
    // Assert formatting mapping
    expect(result.data[0].setup).toBe('MeanReversion');
    expect(result.data[0].confidence).toBe(90);
    expect(result.data[0].entryZone).toEqual({ low: 1499.25, high: 1500.75 }); // Derived from reference_entry * 0.9995 / 1.0005
    expect(result.data[0].stop).toBe(1550);
  });

  it('handles database errors gracefully', async () => {
    supabaseServiceMock.client.gte.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

    await expect(controller.getTopSetups()).rejects.toThrow(HttpException);
    await expect(controller.getTopSetups()).rejects.toThrow('DB Error');
  });

  it('throws when database is not configured', async () => {
    supabaseServiceMock.client = null;
    
    await expect(controller.getTopSetups()).rejects.toThrow(HttpException);
    await expect(controller.getTopSetups()).rejects.toThrow('Database not configured');
  });
});
