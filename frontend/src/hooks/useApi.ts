'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.get<T>(url);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

interface UseMutationResult<T, B> {
  mutate: (body: B) => Promise<T>;
  loading: boolean;
  error: string | null;
  data: T | null;
}

export function useMutation<T, B = unknown>(
  endpoint: string,
  method: 'POST' | 'DELETE' = 'POST'
): UseMutationResult<T, B> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const mutate = useCallback(
    async (body: B): Promise<T> => {
      try {
        setLoading(true);
        setError(null);
        const result = await api.post<T>(endpoint, body);
        setData(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, method]
  );

  return { mutate, loading, error, data };
}
