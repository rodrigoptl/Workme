import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

interface BetaContextType {
  sessionId: string;
  isTracking: boolean;
  trackEvent: (eventType: string, screenName?: string, actionName?: string, properties?: any) => void;
  submitFeedback: (feedback: FeedbackData) => Promise<boolean>;
  showFeedbackModal: (screenName: string) => void;
  isBetaEnvironment: boolean;
  betaEnvironmentInfo: BetaEnvironmentInfo | null;
}

interface FeedbackData {
  screen_name: string;
  feedback_type: string;
  rating?: number;
  message: string;
  screenshot_data?: string;
}

interface BetaEnvironmentInfo {
  environment: string;
  is_beta: boolean;
  beta_users_count: number;
  max_beta_users: number;
  beta_spots_remaining: number;
  version: string;
}

const BetaContext = createContext<BetaContextType | undefined>(undefined);

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export function BetaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string>('');
  const [isTracking, setIsTracking] = useState(true);
  const [isBetaEnvironment, setIsBetaEnvironment] = useState(false);
  const [betaEnvironmentInfo, setBetaEnvironmentInfo] = useState<BetaEnvironmentInfo | null>(null);

  useEffect(() => {
    initializeSession();
    fetchBetaEnvironment();
  }, []);

  useEffect(() => {
    if (user && sessionId) {
      trackEvent('app_open');
    }
  }, [user, sessionId]);

  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const initializeSession = async () => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    
    // Store session start time
    await AsyncStorage.setItem('session_start_time', Date.now().toString());
  };

  const fetchBetaEnvironment = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/beta/environment`);
      setBetaEnvironmentInfo(response.data);
      setIsBetaEnvironment(response.data.is_beta);
    } catch (error) {
      console.log('Beta environment check failed:', error);
    }
  };

  const getDeviceInfo = () => {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      device_name: Device.deviceName,
      device_type: Device.deviceType,
      brand: Device.brand,
      model_name: Device.modelName,
      os_version: Device.osVersion,
      is_device: Device.isDevice,
    };
  };

  const trackEvent = async (
    eventType: string, 
    screenName?: string, 
    actionName?: string, 
    properties: any = {}
  ) => {
    if (!isTracking || !user || !sessionId) return;

    try {
      await axios.post(`${API_BASE_URL}/beta/analytics/track`, {
        session_id: sessionId,
        event_type: eventType,
        screen_name: screenName,
        action_name: actionName,
        properties: {
          ...properties,
          device_info: getDeviceInfo(),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.log('Analytics tracking failed:', error);
    }
  };

  const submitFeedback = async (feedback: FeedbackData): Promise<boolean> => {
    if (!user) return false;

    try {
      await axios.post(`${API_BASE_URL}/beta/feedback/submit`, {
        ...feedback,
        device_info: getDeviceInfo(),
      });
      return true;
    } catch (error) {
      console.error('Feedback submission failed:', error);
      return false;
    }
  };

  const showFeedbackModal = (screenName: string) => {
    // This will be handled by the FeedbackModal component
    // We'll trigger it via events or state management
  };

  return (
    <BetaContext.Provider
      value={{
        sessionId,
        isTracking,
        trackEvent,
        submitFeedback,
        showFeedbackModal,
        isBetaEnvironment,
        betaEnvironmentInfo,
      }}
    >
      {children}
    </BetaContext.Provider>
  );
}

export function useBeta() {
  const context = useContext(BetaContext);
  if (context === undefined) {
    throw new Error('useBeta must be used within a BetaProvider');
  }
  return context;
}

// HOC to automatically track screen views
export function withScreenTracking(WrappedComponent: React.ComponentType<any>, screenName: string) {
  return function TrackedScreenComponent(props: any) {
    const { trackEvent } = useBeta();

    useEffect(() => {
      trackEvent('screen_view', screenName);
    }, []);

    return <WrappedComponent {...props} />;
  };
}