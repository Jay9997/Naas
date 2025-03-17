'use client';

import { useState, useEffect } from 'react';

export function usePersistentState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setState(JSON.parse(item));
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  const setValue = (value: T) => {
    try {
      setState(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [state, setValue, isLoading] as const;
}