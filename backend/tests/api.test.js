// Tests básicos de API
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
let authToken = null;

beforeAll(async () => {
  // Login para obtener token
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'test_user',
      password: 'test_password'
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    authToken = data.token;
  }
});

describe('API Endpoints', () => {
  it('should require authentication', async () => {
    const response = await fetch(`${BASE_URL}/api/inventory`);
    expect(response.status).toBe(401);
  });

  it('should return inventory items when authenticated', async () => {
    if (!authToken) {
      console.warn('No auth token, skipping test');
      return;
    }

    const response = await fetch(`${BASE_URL}/api/inventory`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
