import { api } from '../lib/api';

// Mock fetch
global.fetch = jest.fn();

describe('API Client', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('should make GET request', async () => {
    const mockData = { id: 1, name: 'Test' };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await api.get('/test');
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    );
  });

  it('should make POST request', async () => {
    const mockData = { success: true };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const body = { name: 'Test' };
    const result = await api.post('/test', body);
    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
        credentials: 'include',
      })
    );
  });

  it('should throw on error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Not found' }),
    });

    await expect(api.get('/nonexistent')).rejects.toThrow('Not found');
  });
});
