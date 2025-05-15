/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/providers/MqttProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import mqttService from '@/lib/mqtt';

interface MqttContextType {
  isConnected: boolean;
  discoveredDispensers: any[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  publish: (topic: string, message: string | object) => void;
  scanForDispensers: () => void;
}

const MqttContext = createContext<MqttContextType>({
  isConnected: false,
  discoveredDispensers: [],
  connect: async () => {},
  disconnect: async () => {},
  publish: () => {},
  scanForDispensers: () => {},
});

export const useMqtt = () => useContext(MqttContext);

export default function MqttProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [discoveredDispensers, setDiscoveredDispensers] = useState<any[]>([]);

  useEffect(() => {
    // Connect to MQTT broker on component mount
    const connectToMqtt = async () => {
      try {
        console.log('Attempting to connect to MQTT broker');
        await mqttService.connect();
        console.log('MQTT connection successful');
        setIsConnected(true);

        // Get any already discovered dispensers
        setDiscoveredDispensers(mqttService.getDiscoveredDispensers());
      } catch (error) {
        console.error('Failed to connect to MQTT broker:', error);
      }
    };

    // Set up event listeners
    mqttService.events.on('connected', () => {
      console.log('MQTT connected event received');
      setIsConnected(true);
    });

    mqttService.events.on('disconnected', () => {
      console.log('MQTT disconnected event received');
      setIsConnected(false);
    });

    mqttService.events.on('dispenser:discovered', (dispenser) => {
      console.log('Dispenser discovered:', dispenser);
      // Update the discovered dispensers list
      setDiscoveredDispensers(mqttService.getDiscoveredDispensers());
    });

    mqttService.events.on('dispenser:status', (statusUpdate) => {
      console.log('Dispenser status update:', statusUpdate);
      // Update the discovered dispensers list when status changes
      setDiscoveredDispensers(mqttService.getDiscoveredDispensers());
    });

    connectToMqtt();

    // Clean up event listeners on unmount
    return () => {
      mqttService.events.removeAllListeners();
      mqttService.disconnect().catch(console.error);
    };
  }, []);

  // MQTT context value
  const value = {
    isConnected,
    discoveredDispensers,
    connect: async () => {
      await mqttService.connect();
    },
    disconnect: async () => {
      await mqttService.disconnect();
    },
    publish: (topic: string, message: string | object) => {
      mqttService.publish(topic, message);
    },
    scanForDispensers: () => {
      console.log('Scanning for dispensers...');
      mqttService.triggerDiscoveryScan();
    },
  };

  return <MqttContext.Provider value={value}>{children}</MqttContext.Provider>;
}
