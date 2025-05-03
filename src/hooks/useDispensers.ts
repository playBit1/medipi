import { useState, useEffect, useCallback } from 'react';
import { DispenserWithPatient, DispenserFilterStatus } from '@/types/dispenser';
import { PaginatedResponse } from '@/types/common';

type UseDispensersResult = {
  dispensers: DispenserWithPatient[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearch: (search: string) => void;
  setStatusFilter: (status: DispenserFilterStatus) => void;
  deleteDispenser: (id: string) => Promise<boolean>;
  assignPatient: (dispenserId: string, patientId: string) => Promise<boolean>;
  unassignPatient: (dispenserId: string) => Promise<boolean>;
  refetchDispensers: () => void;
};
export default function useDispensers(): UseDispensersResult {
  const [dispensers, setDispensers] = useState<DispenserWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<DispenserFilterStatus>('all');
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const fetchDispensers = useCallback(async () => {
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

      if (statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }

      const response = await fetch(`/api/dispensers?${queryParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch dispensers');
      }

      const data: PaginatedResponse<DispenserWithPatient> =
        await response.json();

      setDispensers(data.items);
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching dispensers:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, search, statusFilter, refetchTrigger]);

  useEffect(() => {
    fetchDispensers();
  }, [fetchDispensers]);

  const refetchDispensers = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  const deleteDispenser = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/dispensers/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete dispenser');
        }

        refetchDispensers();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to delete dispenser'
        );
        return false;
      }
    },
    [refetchDispensers]
  );

  const assignPatient = useCallback(
    async (dispenserId: string, patientId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/dispensers/${dispenserId}/patient`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ patientId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to assign patient');
        }

        refetchDispensers();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to assign patient'
        );
        return false;
      }
    },
    [refetchDispensers]
  );

  const unassignPatient = useCallback(
    async (dispenserId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/dispensers/${dispenserId}/patient`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to unassign patient');
        }

        refetchDispensers();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to unassign patient'
        );
        return false;
      }
    },
    [refetchDispensers]
  );

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return {
    dispensers,
    totalCount,
    currentPage,
    pageSize,
    totalPages,
    loading,
    error,
    setPage,
    setPageSize,
    setSearch,
    setStatusFilter,
    deleteDispenser,
    assignPatient,
    unassignPatient,
    refetchDispensers,
  };
}
