/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/mqtt.ts
import mqtt from 'mqtt';
import { EventEmitter } from 'events';

class MqttService {
  private static instance: MqttService;
  private client: mqtt.MqttClient | null = null;
  private isConnected = false;
  private brokerUrl =
    process.env.NEXT_PUBLIC_MQTT_BROKER_URL || 'ws://localhost:9001';
  public events = new EventEmitter();

  // Store discovered dispensers
  private discoveredDispensers: Map<string, any> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): MqttService {
    if (!MqttService.instance) {
      MqttService.instance = new MqttService();
    }
    return MqttService.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      console.log(`Connecting to MQTT broker at ${this.brokerUrl}`);

      // Use the standard mqtt.connect instead of async-mqtt for browser compatibility
      this.client = mqtt.connect(this.brokerUrl, {
        clientId: `medipi-hub-${Math.random().toString(16).substring(2, 10)}`,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 5000,
      });

      // Set up event handlers
      this.client.on('connect', () => {
        console.log('Connected to MQTT broker');
        this.isConnected = true;
        this.events.emit('connected');

        // Subscribe to central topics
        this.subscribe('medipi/discovery/#');
        this.subscribe('medipi/dispensers/#');
      });

      this.client.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      this.client.on('disconnect', () => {
        this.isConnected = false;
        this.events.emit('disconnected');
        console.log('Disconnected from MQTT broker');
      });

      this.client.on('error', (error) => {
        console.error('MQTT error:', error);
        this.events.emit('error', error);
      });

      // Return a promise that resolves when connected or rejects on error
      return new Promise((resolve, reject) => {
        this.client!.on('connect', () => resolve());
        this.client!.on('error', (err) => reject(err));
      });
    } catch (error) {
      console.error('MQTT connection error:', error);
      this.isConnected = false;
      this.events.emit('error', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.client || !this.isConnected) return;

    return new Promise((resolve, reject) => {
      this.client!.end(false, {}, (err) => {
        if (err) {
          reject(err);
        } else {
          this.isConnected = false;
          this.events.emit('disconnected');
          console.log('Disconnected from MQTT broker');
          resolve();
        }
      });
    });
  }

  public publish(topic: string, message: string | object): void {
    if (!this.client || !this.isConnected) {
      console.error('MQTT client not connected');
      return;
    }

    try {
      const payload =
        typeof message === 'string' ? message : JSON.stringify(message);

      this.client.publish(topic, payload);
    } catch (error) {
      console.error(`Error publishing to ${topic}:`, error);
      this.events.emit('error', error);
    }
  }

  public subscribe(topic: string): void {
    if (!this.client || !this.isConnected) {
      console.error('MQTT client not connected');
      return;
    }

    try {
      this.client.subscribe(topic, (err) => {
        if (err) {
          console.error(`Error subscribing to ${topic}:`, err);
          this.events.emit('error', err);
        } else {
          console.log(`Subscribed to ${topic}`);
        }
      });
    } catch (error) {
      console.error(`Error subscribing to ${topic}:`, error);
      this.events.emit('error', error);
    }
  }

  private handleMessage(topic: string, message: Buffer): void {
    try {
      const payload = message.toString();
      let parsedMessage;

      try {
        // Try to parse as JSON if possible
        parsedMessage = JSON.parse(payload);
      } catch {
        // Otherwise use the raw payload
        parsedMessage = payload;
      }

      // Emit event with topic and message
      this.events.emit('message', topic, parsedMessage);

      // Also emit specific topic event
      this.events.emit(topic, parsedMessage);

      // Handle specific topic types
      if (
        topic.startsWith('medipi/discovery/') &&
        topic !== 'medipi/discovery/broadcast'
      ) {
        this.handleDiscovery(topic, parsedMessage);
      } else if (topic.startsWith('medipi/dispensers/')) {
        this.handleDispenserMessage(topic, parsedMessage);
      }
    } catch (error) {
      console.error('Error handling MQTT message:', error);
    }
  }

  private handleDiscovery(topic: string, message: any): void {
    // Handle discovery messages
    const dispenserId = topic.split('/')[2]; // medipi/discovery/{dispenserId}

    if (message.action === 'announce') {
      // Store or update dispenser in discovered list
      this.discoveredDispensers.set(dispenserId, {
        ...message,
        lastAnnounced: new Date().toISOString(),
      });

      // Emit event
      this.events.emit('dispenser:discovered', message);
    }
  }

  private handleDispenserMessage(topic: string, message: any): void {
    // Handle dispenser messages
    const parts = topic.split('/');
    const dispenserId = parts[2]; // medipi/dispensers/{dispenserId}/...

    if (parts.length > 3) {
      const messageType = parts[3];

      if (messageType === 'status') {
        // Update last seen status for the dispenser
        const dispenser = this.discoveredDispensers.get(dispenserId);
        if (dispenser) {
          this.discoveredDispensers.set(dispenserId, {
            ...dispenser,
            status: message.status,
            lastSeen: new Date().toISOString(),
          });
        }

        this.events.emit('dispenser:status', {
          id: dispenserId,
          ...message,
        });
      } else if (messageType === 'logs') {
        this.events.emit('dispenser:logs', {
          id: dispenserId,
          logs: message,
        });
      }
    }
  }

  public getDiscoveredDispensers(): any[] {
    return Array.from(this.discoveredDispensers.values());
  }

  public triggerDiscoveryScan(): void {
    this.publish('medipi/discovery/broadcast', {
      action: 'scan',
      from: 'hub-web',
      timestamp: new Date().toISOString(),
    });
  }

  public isClientConnected(): boolean {
    return this.isConnected;
  }
}

export const mqttService = MqttService.getInstance();
export default mqttService;
