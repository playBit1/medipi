import { useState, useEffect, useCallback } from 'react';
import { MedicationWithUsage } from '@/types/medication';
import { PaginatedResponse } from '@/types/common';

type UseMedicationsResult = {
  medications: MedicationWithUsage[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearch: (search: string) => void;
  setLowStockFilter: (lowStock: boolean) => void;
  deleteMedication: (id: string) => Promise<boolean>;
  adjustStock: (
    id: string,
    amount: number,
    reason: string,
    notes?: string
  ) => Promise<boolean>;
  refetchMedications: () => void;
};

export default function useMedications(): UseMedicationsResult {
  const [medications, setMedications] = useState<MedicationWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const fetchMedications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      });

      if (search) {
        queryParams.append('search', search);
      }

      if (lowStockFilter) {
        queryParams.append('lowStock', 'true');
      }

      const response = await fetch(
        `/api/medications?${queryParams.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch medications');
      }

      const data: PaginatedResponse<MedicationWithUsage> =
        await response.json();

      setMedications(data.items);
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching medications:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, search, lowStockFilter, refetchTrigger]);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const refetchMedications = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  const deleteMedication = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/medications/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete medication');
        }

        refetchMedications();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to delete medication'
        );
        return false;
      }
    },
    [refetchMedications]
  );

  const adjustStock = useCallback(
    async (
      id: string,
      amount: number,
      reason: string,
      notes?: string
    ): Promise<boolean> => {
      try {
        const response = await fetch(`/api/medications/${id}/stock`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            reason,
            notes,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to adjust stock');
        }

        refetchMedications();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to adjust stock');
        return false;
      }
    },
    [refetchMedications]
  );

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return {
    medications,
    totalCount,
    currentPage,
    pageSize,
    totalPages,
    loading,
    error,
    setPage,
    setPageSize,
    setSearch,
    setLowStockFilter,
    deleteMedication,
    adjustStock,
    refetchMedications,
  };
}
