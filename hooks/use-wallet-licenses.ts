'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http, getContract } from 'viem';
import { mawariTestnet } from '@/config/chains';
import type { License } from '@/types/license';

// This will be the NFT contract address
const NFT_CONTRACT_ADDRESS = "0xa0467e0d53B552F5A0D8d846207eF6C3a6933b3C";

const ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const publicClient = createPublicClient({
  chain: mawariTestnet,
  transport: http()
});

// Simple cache implementation
class SimpleCache {
  private static CACHE_KEY = 'mawari_licenses_cache';

  static get(address: string): License[] | null {
    try {
      const cache = localStorage.getItem(this.CACHE_KEY);
      if (cache) {
        const data = JSON.parse(cache);
        return data[address] || null;
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
    return null;
  }

  static set(address: string, licenses: License[]) {
    try {
      const cache = localStorage.getItem(this.CACHE_KEY);
      const data = cache ? JSON.parse(cache) : {};
      data[address] = licenses;
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }
}

export function useWalletLicenses(address: string | undefined) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState(0);
  const [totalLicenseCount, setTotalLicenseCount] = useState(0);

  const fetchLicenses = useCallback(async (ownerAddress: string) => {
    setLoading(true);
    setError(undefined);
    setProgress(0);

    try {
      // Check cache first for instant response
      const cachedLicenses = SimpleCache.get(ownerAddress);
      if (cachedLicenses && cachedLicenses.length > 0) {
        setLicenses(cachedLicenses);
        setTotalLicenseCount(cachedLicenses.length);
        setProgress(100);
        setLoading(false);
        return;
      }

      // Get contract
      const contract = getContract({
        address: NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: ABI,
        publicClient,
      });

      // Get balance of owner
      const balance = await contract.read.balanceOf([ownerAddress as `0x${string}`]);
      const totalLicenses = Number(balance);
      setTotalLicenseCount(totalLicenses);

      if (totalLicenses === 0) {
        setLicenses([]);
        setLoading(false);
        return;
      }

      // Two-phase loading: first 50 licenses quickly, then the rest
      const INITIAL_BATCH_SIZE = 50;
      
      // First batch - load and show immediately
      const firstBatchLicenses = await loadBatch(ownerAddress, 0, Math.min(INITIAL_BATCH_SIZE, totalLicenses));
      setLicenses(firstBatchLicenses);
      setLoading(false); // Make UI responsive with first batch
      setProgress(Math.round((firstBatchLicenses.length / totalLicenses) * 100));

      // If there are more, load them in background
      if (totalLicenses > INITIAL_BATCH_SIZE) {
        // Load remaining batches in background
        loadRemainingLicenses(ownerAddress, INITIAL_BATCH_SIZE, totalLicenses, firstBatchLicenses);
      } else {
        // Save to cache
        SimpleCache.set(ownerAddress, firstBatchLicenses);
      }
    } catch (err) {
      console.error('Error fetching licenses:', err);
      setError('Failed to fetch licenses. Please try again.');
      setLoading(false);
    }
  }, []);

  // Helper function to load a batch of licenses
  const loadBatch = async (ownerAddress: string, start: number, end: number): Promise<License[]> => {
    const batchPromises = [];
    
    for (let j = start; j < end; j++) {
      batchPromises.push(
        publicClient.readContract({
          address: NFT_CONTRACT_ADDRESS as `0x${string}`,
          abi: [
            {
              "inputs": [
                {
                  "internalType": "address",
                  "name": "owner",
                  "type": "address"
                },
                {
                  "internalType": "uint256",
                  "name": "index",
                  "type": "uint256"
                }
              ],
              "name": "tokenOfOwnerByIndex",
              "outputs": [
                {
                  "internalType": "uint256",
                  "name": "",
                  "type": "uint256"
                }
              ],
              "stateMutability": "view",
              "type": "function"
            }
          ],
          functionName: 'tokenOfOwnerByIndex',
          args: [ownerAddress as `0x${string}`, BigInt(j)]
        }).then(tokenId => ({
          tokenId: tokenId.toString(),
          status: 'available' as const,
          expiryDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        })).catch(() => null)
      );
    }

    const results = await Promise.all(batchPromises);
    return results.filter((license): license is License => license !== null);
  };

  // Function to load the remaining licenses in the background
  const loadRemainingLicenses = async (
    ownerAddress: string, 
    startIndex: number, 
    totalLicenses: number, 
    initialLicenses: License[]
  ) => {
    let allLicenses = [...initialLicenses];
    const BATCH_SIZE = 200; // Larger batches for background loading
    
    try {
      for (let i = startIndex; i < totalLicenses; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE, totalLicenses);
        const batchLicenses = await loadBatch(ownerAddress, i, batchEnd);
        
        allLicenses = [...allLicenses, ...batchLicenses];
        setLicenses([...allLicenses]);
        setProgress(Math.round((allLicenses.length / totalLicenses) * 100));
      }
      
      // Save to cache when complete
      SimpleCache.set(ownerAddress, allLicenses);
    } catch (error) {
      console.error('Background loading error:', error);
      // We already have some licenses loaded, so no UI error needed
    }
  };

  useEffect(() => {
    if (address) {
      fetchLicenses(address);
    } else {
      setLicenses([]);
      setLoading(false);
    }
  }, [address, fetchLicenses]);

  return { 
    licenses, 
    loading, 
    error, 
    progress, 
    totalLicenseCount
  };
}