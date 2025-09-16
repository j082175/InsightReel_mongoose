import { useCallback, useState } from 'react';

interface UseDeleteOptions<T> {
  apiEndpoint: (item: T) => string;
  onSuccess?: (item: T) => void;
  onError?: (error: Error, item: T) => void;
}

interface UseDeleteResult<T> {
  deleteItem: (item: T) => Promise<void>;
  isDeleting: boolean;
  error: string | null;
}

export const useDelete = <T>({
  apiEndpoint,
  onSuccess,
  onError,
}: UseDeleteOptions<T>): UseDeleteResult<T> => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteItem = useCallback(
    async (item: T) => {
      setIsDeleting(true);
      setError(null);

      try {
        const endpoint = apiEndpoint(item);

        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        console.log('✅ 삭제 성공:', endpoint);

        if (onSuccess) {
          onSuccess(item);
        }
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error('알 수 없는 오류가 발생했습니다');
        console.error('❌ 삭제 실패:', error);

        setError(error.message);

        if (onError) {
          onError(error, item);
        }

        throw error;
      } finally {
        setIsDeleting(false);
      }
    },
    [apiEndpoint, onSuccess, onError]
  );

  return {
    deleteItem,
    isDeleting,
    error,
  };
};

export default useDelete;
