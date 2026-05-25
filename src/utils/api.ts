import { Capacitor } from '@capacitor/core';
import { useStore } from '../store/useStore';

const normalizeBackendUrl = (value: string) => value.trim().replace(/\/+$/, '');

export const getConfiguredBackendUrl = () => {
  const savedServerUrl = useStore.getState().serverUrl || '';
  const envServerUrl = import.meta.env.VITE_AFTERGLOW_BACKEND_URL || '';
  return normalizeBackendUrl(savedServerUrl || envServerUrl);
};

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const backendUrl = getConfiguredBackendUrl();
  return backendUrl ? `${backendUrl}${normalizedPath}` : normalizedPath;
};

export const isNativeRuntime = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return typeof window !== 'undefined' && window.location.protocol === 'capacitor:';
  }
};