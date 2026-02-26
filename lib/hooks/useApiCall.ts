import { useCallback, useState } from 'react';

interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  retries?: number;
  retryDelay?: number;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  retryCount: number;
}

/**
 * Hook for API calls with retry logic and error handling
 */
export function useApiCall<T = unknown>() {
  const [response, setResponse] = useState<ApiResponse<T>>({
    data: null,
    error: null,
    loading: false,
    retryCount: 0,
  });

  const call = useCallback(
    async (
      url: string,
      options: ApiCallOptions = {}
    ): Promise<{ data: T | null; error: string | null; success: boolean }> => {
      const {
        method = 'GET',
        body,
        retries = 3,
        retryDelay = 1000,
      } = options;

      setResponse({
        data: null,
        error: null,
        loading: true,
        retryCount: 0,
      });

      let lastError: string | null = null;
      let attemptCount = 0;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          attemptCount = attempt;
          const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

          const fetchOptions: RequestInit = {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          };

          if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
            fetchOptions.body = JSON.stringify(body);
          }

          const res = await fetch(url, fetchOptions);

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            lastError = errorData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;

            // Don't retry on 4xx errors (except 429 - rate limit)
            if (res.status >= 400 && res.status < 500 && res.status !== 429) {
              throw new Error(lastError ?? undefined);
            }

            // Retry on 5xx or 429
            if (attempt < retries) {
              await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
              continue;
            }
            throw new Error(lastError);
          }

          const data = await res.json();
          const result = data.data || data;

          setResponse({
            data: result as T,
            error: null,
            loading: false,
            retryCount: attempt,
          });

          return { data: result as T, error: null, success: true };
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error occurred';

          if (attempt < retries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
            continue;
          }

          setResponse({
            data: null,
            error: lastError,
            loading: false,
            retryCount: attempt,
          });

          return { data: null, error: lastError, success: false };
        }
      }

      setResponse({
        data: null,
        error: lastError || 'Maximum retries exceeded',
        loading: false,
        retryCount: attemptCount,
      });

      return { data: null, error: lastError || 'Maximum retries exceeded', success: false };
    },
    []
  );

  const retry = useCallback(async (
    url: string,
    options?: ApiCallOptions
  ) => {
    return call(url, options);
  }, [call]);

  return {
    ...response,
    call,
    retry,
  };
}
