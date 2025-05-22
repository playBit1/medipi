/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DispenserLog,
  LiveDispenser,
  PaginatedResponse,
} from '@/types/dispenser';

export class NodeRedService {
  private baseUrl: string;
  private ws: WebSocket | null = null;
  private wsListeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnecting: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(
    baseUrl = process.env.NEXT_PUBLIC_NODE_RED_URL || 'http://localhost:1880'
  ) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get all discovered dispensers
   * @returns Promise with dispenser data
   */
  async getDispensers(): Promise<PaginatedResponse<LiveDispenser>> {
    const response = await fetch(`${this.baseUrl}/api/dispensers`);
    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to fetch dispensers: ${error}`);
    }
    return response.json();
  }

  /**
   * Send schedules to a specific dispenser
   * @param dispenserId Dispenser ID/serial number
   * @param schedules Array of schedule objects
   * @returns Promise with response data
   */
  async sendSchedules(dispenserId: string, schedules: any[]): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/api/dispensers/${dispenserId}/schedules`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedules),
      }
    );

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to send schedules: ${error}`);
    }

    return response.json();
  }

  /**
   * Get logs with optional pagination
   * @param page Page number (default: 1)
   * @param pageSize Items per page (default: 10)
   * @returns Promise with paginated log data
   */
  async getLogs(
    page = 1,
    pageSize = 10
  ): Promise<PaginatedResponse<DispenserLog>> {
    const response = await fetch(
      `${this.baseUrl}/api/logs?page=${page}&pageSize=${pageSize}`
    );

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to fetch logs: ${error}`);
    }

    return response.json();
  }

  /**
   * Trigger a scan for dispensers
   * @returns Promise with scan result
   */
  async scanForDispensers(): Promise<void> {
    fetch(`${this.baseUrl}/api/scan`, {
      method: 'POST',
    });
  }

  /**
   * Initialize WebSocket connection
   * Automatically reconnects if disconnected
   */
  connectWebSocket(): void {
    // Prevent multiple connection attempts
    if (this.ws || this.isConnecting) return;

    try {
      this.isConnecting = true;
      const wsUrl = `${this.baseUrl.replace(/^http/, 'ws')}/ws/dispensers`;
      console.log(`Connecting to WebSocket at: ${wsUrl}`);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected to Node-RED');
        this.isConnecting = false;

        // Clears any reconnect timeout
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data.type, data.data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.ws = null;
        this.isConnecting = false;

        // Reconnect after a delay
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.connectWebSocket();
            this.reconnectTimeout = null;
          }, 5000);
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.isConnecting = false;

      // Retry connection after a delay
      if (!this.reconnectTimeout) {
        this.reconnectTimeout = setTimeout(() => {
          this.connectWebSocket();
          this.reconnectTimeout = null;
        }, 5000);
      }
    }
  }

  /**
   * Add listener for specific event types
   * @param eventType Event type to listen for (e.g., 'dispensers')
   * @param callback Function to call when event occurs
   * @returns Unsubscribe function
   */
  subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.wsListeners.has(eventType)) {
      this.wsListeners.set(eventType, new Set());
    }
    this.wsListeners.get(eventType)?.add(callback);

    // Ensure WebSocket is connected
    this.connectWebSocket();

    // Return unsubscribe function
    return () => {
      this.wsListeners.get(eventType)?.delete(callback);
    };
  }

  async syncSchedules(dispenserId: string, schedules: any[]): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/dispensers/${dispenserId}/schedules`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schedules),
        }
      );

      if (!response.ok) {
        const error = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to sync schedules: ${error}`);
      }

      return response.json();
    } catch (error) {
      console.error('Schedule sync error:', error);
      throw error;
    }
  }

  /**
   * Notify all listeners of a specific event type
   * @param eventType Event type
   * @param data Event data
   */
  private notifyListeners(eventType: string, data: any): void {
    if (this.wsListeners.has(eventType)) {
      this.wsListeners.get(eventType)?.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Clear any reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}

// Export a singleton instance
export const nodeRedService = new NodeRedService();
export default nodeRedService;
