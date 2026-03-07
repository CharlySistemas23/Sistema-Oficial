// Test básico de salud del servidor
import { describe, it, expect } from 'vitest';

describe('Health Check', () => {
  it('should return 200 OK', async () => {
    const response = await fetch('http://localhost:3000/health');
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('OK');
    expect(data.timestamp).toBeDefined();
  });
});
