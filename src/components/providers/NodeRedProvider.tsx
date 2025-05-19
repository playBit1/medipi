/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/providers/NodeRedProvider.tsx
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import nodeRedService, {
  Dispenser,
  DispenserLog,
  PaginatedResponse,
} from '@/lib/nodeRed';

// Define the context type
type NodeRedContextType = {
  dispensers: Dispenser[];
  logs: DispenserLog[];
  isLoading: boolean;
  error: string | null;
  refreshDispensers: () => Promise<void>;
  syncSchedules: (dispenserId: string, schedules: any[]) => Promise<any>;
  scanForDispensers: () => Promise<any>;
  getLogs: (
    page?: number,
    pageSize?: number
  ) => Promise<PaginatedResponse<DispenserLog>>;
};

// Create the context
const NodeRedContext = createContext<NodeRedContextType | undefined>(undefined);

// Custom hook to use the context
export const useNodeRed = () => {
  const context = useContext(NodeRedContext);
  if (!context) {
    throw new Error('useNodeRed must be used within a NodeRedProvider');
  }
  return context;
};

// Provider component
export const NodeRedProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [dispensers, setDispensers] = useState<Dispenser[]>([]);
  const [logs, setLogs] = useState<DispenserLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to refresh dispensers
  const refreshDispensers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await nodeRedService.getDispensers();
      setDispensers(data.items || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch dispensers'
      );
      console.error('Error fetching dispensers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Function to get logs with pagination
  const fetchLogs = useCallback(async (page = 1, pageSize = 10) => {
    try {
      setIsLoading(true);
      const data = await nodeRedService.getLogs(page, pageSize);
      setLogs(data.items || []);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      console.error('Error fetching logs:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize data and WebSocket connection
  useEffect(() => {
    // Fetch initial data
    refreshDispensers();
    fetchLogs(1, 10).catch(console.error);

    // Subscribe to WebSocket updates for dispensers
    const unsubscribe = nodeRedService.subscribe('dispensers', (data) => {
      if (Array.isArray(data)) {
        setDispensers(data);
      }
    });

    // Cleanup
    return () => {
      unsubscribe();
      nodeRedService.disconnectWebSocket();
    };
  }, [refreshDispensers, fetchLogs]);

  // Expose all functionality through context
  const contextValue: NodeRedContextType = {
    dispensers,
    logs,
    isLoading,
    error,
    refreshDispensers,
    // Add this method to the contextValue object in NodeRedProvider.tsx

    syncSchedules: async (
      dispenserId: string,
      schedules: any[]
    ): Promise<any> => {
      try {
        setIsLoading(true);
        return await nodeRedService.syncSchedules(dispenserId, schedules);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to sync schedules'
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    scanForDispensers: async () => {
      try {
        setIsLoading(true);
        const result = await nodeRedService.scanForDispensers();
        // After scanning, refresh the dispenser list
        setTimeout(() => refreshDispensers(), 2000);
        return result;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to scan for dispensers'
        );
        throw err;
      } finally {
        setIsLoading(false);
      }
    },

    getLogs: fetchLogs,
  };

  return (
    <NodeRedContext.Provider value={contextValue}>
      {children}
    </NodeRedContext.Provider>
  );
};

export default NodeRedProvider;
