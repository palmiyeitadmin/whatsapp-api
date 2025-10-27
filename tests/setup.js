// Test setup file for Vitest
import { vi } from 'vitest';

// Mock Cloudflare Workers environment
global.Request = Request;
global.Response = Response;
global.fetch = vi.fn();

// Mock crypto functions
global.crypto = {
  randomUUID: vi.fn(() => 'mock-uuid-1234'),
  subtle: {
    importKey: vi.fn(),
    sign: vi.fn(),
    verify: vi.fn()
  }
};

// Mock URL
global.URL = URL;

// Mock setTimeout/setInterval
global.setTimeout = vi.fn();
global.clearTimeout = vi.fn();
global.setInterval = vi.fn();
global.clearInterval = vi.fn();

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
};