'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import type { Wallet } from '@/types/wallet';
import { useDispatch } from 'react-redux';
import { setSelectedWallet } from '@/store/slices/walletSlice';

export function useWalletPersistence() {
  const { address, isConnected } = useAccount();
  const dispatch = useDispatch();

  // Restore wallet selection from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedWallet = localStorage.getItem('selectedWallet');
    const lastConnected = localStorage.getItem('lastConnectedWallet');

    if (savedWallet && lastConnected && isConnected && address) {
      const wallet = JSON.parse(savedWallet) as Wallet;
      if (address.toLowerCase() === lastConnected.toLowerCase() &&
          address.toLowerCase() === wallet.address.toLowerCase()) {
        dispatch(setSelectedWallet(wallet));
      } else {
        localStorage.removeItem('selectedWallet');
        localStorage.removeItem('lastConnectedWallet');
      }
    }
  }, [isConnected, address, dispatch]);

  // Save wallet selection to localStorage
  const persistWalletSelection = (wallet: Wallet | null) => {
    if (wallet && isConnected && address) {
      localStorage.setItem('selectedWallet', JSON.stringify(wallet));
      localStorage.setItem('lastConnectedWallet', address.toLowerCase());
    } else {
      localStorage.removeItem('selectedWallet');
      localStorage.removeItem('lastConnectedWallet');
    }
  };

  return { persistWalletSelection };
}