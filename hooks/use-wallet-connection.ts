'use client';

import { useEffect } from 'react';
import { useAccount, useNetwork, useDisconnect } from 'wagmi';
import { toast } from 'sonner';
import { useDispatch, useSelector } from 'react-redux';
import { 
  setSelectedWallet, 
  setWallets,
  setLoading,
  setError,
} from '@/store/slices/walletSlice';
import type { RootState } from '@/types/store';

export function useWalletConnection() {
  const dispatch = useDispatch();
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { disconnect } = useDisconnect();
  const { selectedWallet } = useSelector((state: RootState) => state.wallet);

  // Handle wallet connection and persistence
  useEffect(() => {
    if (!isConnected || !address) {
      // Clear selected wallet when disconnected
      dispatch(setSelectedWallet(null));
      window.localStorage.removeItem('selectedWallet');
      window.localStorage.removeItem('lastConnectedWallet');
      return;
    }

    const savedWallet = window.localStorage.getItem('selectedWallet');
    const lastConnected = window.localStorage.getItem('lastConnectedWallet');

    if (savedWallet && lastConnected) {
      const wallet = JSON.parse(savedWallet);
      if (address.toLowerCase() === lastConnected.toLowerCase() &&
          address.toLowerCase() === wallet.address.toLowerCase()) {
        // Restore saved wallet selection
        dispatch(setSelectedWallet(wallet));
      } else {
        // Clear invalid saved data
        window.localStorage.removeItem('selectedWallet');
        window.localStorage.removeItem('lastConnectedWallet');
      }
    }
  }, [isConnected, address, dispatch]);

  // Handle MetaMask account changes
  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
        dispatch(setSelectedWallet(null));
        return;
      }

      const newAddress = accounts[0].toLowerCase();
      if (selectedWallet && newAddress !== selectedWallet.address.toLowerCase()) {
        disconnect();
        dispatch(setSelectedWallet(null));
        toast.error('Please switch back to the selected wallet or choose a different one');
      }
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, [selectedWallet, disconnect, dispatch]);

  const connectToWallet = async (walletAddress: string) => {
    if (!window.ethereum) {
      toast.error("Please install MetaMask");
      return false;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const currentAddress = accounts[0].toLowerCase();
      
      if (currentAddress !== walletAddress.toLowerCase()) {
        // Request account switch
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
        
        // Check if the switch was successful
        const newAccounts = await window.ethereum.request({
          method: 'eth_accounts'
        });
        
        if (newAccounts[0]?.toLowerCase() !== walletAddress.toLowerCase()) {
          toast.error("Please switch to the correct wallet address");
          return false;
        }
      }
      
      window.localStorage.setItem('lastConnectedWallet', walletAddress.toLowerCase());
      return true;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast.error("Failed to connect to wallet");
      return false;
    }
  };

  return {
    address,
    isConnected,
    selectedWallet,
    connectToWallet,
  };
}