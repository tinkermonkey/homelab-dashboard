import { useState, useEffect } from 'react';

const STORAGE_CHANGE_EVENT = 'persisted-state-change';

export const usePersistedState = <T,>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] => {
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    const handleChange = (e: Event) => {
      const { key: changedKey, value } = (e as CustomEvent<{ key: string; value: unknown }>).detail;
      if (changedKey === key) {
        setState(value as T);
      }
    };
    window.addEventListener(STORAGE_CHANGE_EVENT, handleChange);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, handleChange);
  }, [key]);

  const setPersisted = (value: T) => {
    setState(value);
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(
        new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key, value } })
      );
    } catch (error) {
      console.warn(`Error writing localStorage key "${key}":`, error);
    }
  };

  return [state, setPersisted];
};
