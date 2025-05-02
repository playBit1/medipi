import { useState, useEffect, useCallback } from 'react';
import { PatientWithDispenser } from '@/types/patient';
import { PaginatedResponse } from '@/types/common';

type UsePatientResult = {
  patients: PatientWithDispenser[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearch: (search: string) => void;
  deletePatient: (id: string) => Promise<boolean>;
  refetchPatients: () => void;
};

export default function usePatients(): UsePatientResult {
  const [patients, setPatients] = useState<PatientWithDispenser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const fetchPatients = useCallback(async () => {
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

      const response = await fetch(`/api/patients?${queryParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch patients');
      }

      const data: PaginatedResponse<PatientWithDispenser> =
        await response.json();

      setPatients(data.items);
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, search, refetchTrigger]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const refetchPatients = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  const deletePatient = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/patients/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete patient');
        }

        refetchPatients();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to delete patient'
        );
        return false;
      }
    },
    [refetchPatients]
  );

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return {
    patients,
    totalCount,
    currentPage,
    pageSize,
    totalPages,
    loading,
    error,
    setPage,
    setPageSize,
    setSearch,
    deletePatient,
    refetchPatients,
  };
}
