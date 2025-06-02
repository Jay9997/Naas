'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useWalletLicenses } from './use-wallet-licenses';
import { useAccount, useDisconnect } from 'wagmi';
import type { Wallet } from '@/types/wallet';
import { toast } from 'sonner';
import {
  setSelectedWallet,
  setWallets,
  addWallet as addWalletToStore,
  updateWallet as updateWalletInStore,
  setLoading,
  setError,
} from '@/store/slices/walletSlice';
import type { RootState } from '@/types/store';

export function useWallets() {
  const dispatch = useDispatch();
  const { selectedWallet, wallets, isLoading, error } = useSelector(
    (state: RootState) => state.wallet
  );
  const { licenses, loading: licensesLoading } = useWalletLicenses(selectedWallet?.address);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Reset selected wallet when connection changes
  useEffect(() => {
    if (!isConnected) {
      dispatch(setSelectedWallet(null));
    }
  }, [isConnected, dispatch]);

  // Load wallets
  useEffect(() => {
    let mounted = true;

    async function fetchWallets() {
      dispatch(setLoading(true));
      try {
        const response = await fetch('/api/wallets', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch wallets');
        }

        const data = await response.json();
        
        if (!mounted) return;

        const walletsData = data.map((wallet: any) => ({
          address: wallet.address,
          label: wallet.label,
          hasLicenses: Boolean(wallet.has_licenses),
          createdAt: wallet.created_at,
          updatedAt: wallet.updated_at,
        }));

        dispatch(setWallets(walletsData));
        dispatch(setError(null));
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : 'Failed to load wallets';
        dispatch(setError(message));
        toast.error(message);
      } finally {
        if (mounted) {
          dispatch(setLoading(false));
        }
      }
    }

    fetchWallets();
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  // Update wallet license status whenever licenses change
  useEffect(() => {
    if (!selectedWallet || licensesLoading) return;

    const hasLicenses = licenses.length > 0;
    const currentWalletHasLicenses = wallets.find(
      w => w.address.toLowerCase() === selectedWallet.address.toLowerCase()
    )?.hasLicenses;

    // Only update if the license status has changed
    if (currentWalletHasLicenses !== hasLicenses) {
      updateWallet(selectedWallet.address, { hasLicenses });
    }
  }, [selectedWallet?.address, licenses, licensesLoading, wallets]);

  const addWallet = useCallback(async (wallet: Wallet) => {
    try {
      const response = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wallet),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add wallet');
      }

      const newWallet = await response.json();
      dispatch(addWalletToStore(newWallet));
      dispatch(setSelectedWallet(newWallet));
      toast.success('Wallet added successfully');
      
      return newWallet;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add wallet';
      toast.error(message);
      throw new Error(message);
    }
  }, [dispatch]);

  const updateWallet = useCallback(async (address: string, updates: Partial<Wallet>) => {
    try {
      const response = await fetch(`/api/wallets/${address}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update wallet');
      }

      const updatedWallet = await response.json();
      dispatch(updateWalletInStore(updatedWallet));
      // Removed the toast.success notification here
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update wallet';
      console.error('Error updating wallet:', message);
      // Removed the toast.error notification here too
    }
  }, [dispatch]);

  const handleSelectWallet = useCallback((wallet: Wallet | null) => {
    dispatch(setSelectedWallet(wallet));
  }, [dispatch]);

  return {
    wallets,
    selectedWallet,
    setSelectedWallet: handleSelectWallet,
    loading: isLoading,
    error,
    addWallet,
    updateWallet
  };
}