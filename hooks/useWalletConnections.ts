// hooks/useWalletConnection.ts
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { toast } from '@/hooks/use-toast';

export function useWalletConnection() {
  const { address, isConnected } = useAccount();
  const [lastConnectedWallet, setLastConnectedWallet] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('lastConnectedWallet');
      if (saved && address?.toLowerCase() === saved.toLowerCase()) {
        setLastConnectedWallet(saved);
      }
    }
  }, [address]);

  const connectToWallet = async (walletAddress: string) => {
    if (!window.ethereum) {
      toast({
        title: "Error",
        description: "Please install MetaMask",
        variant: "destructive",
      });
      return false;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      if (accounts[0]?.toLowerCase() === walletAddress.toLowerCase()) {
        window.localStorage.setItem('lastConnectedWallet', walletAddress);
        return true;
      }
      
      toast({
        title: "Error",
        description: "Please switch to the correct wallet in MetaMask",
        variant: "destructive",
      });
      return false;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to wallet",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    lastConnectedWallet,
    connectToWallet,
    isConnected: isConnected && !!lastConnectedWallet
  };
}