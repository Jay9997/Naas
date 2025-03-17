'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPublicClient, http, getContract } from 'viem';
import { mawariTestnet } from '@/config/chains';
import type { License } from '@/types/license';
import { toast } from 'sonner';

const NFT_CONTRACT_ADDRESS = "0xf15a69e2733f03273c37551927dC68Fef71926bf";
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

class SecureLicenseCache {
  private static CACHE_KEY_PREFIX = 'mawari_licenses_secure_v2_';

  static getCacheKey(address: string) {
    return `${this.CACHE_KEY_PREFIX}${address.toLowerCase()}`;
  }

  static set(address: string, licenses: License[], totalCount: number) {
    try {
      const cacheKey = this.getCacheKey(address);
      const cacheData = {
        licenses,
        totalCount,
        timestamp: Date.now()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error setting license cache:', error);
    }
  }

  static get(address: string): { licenses: License[], totalCount: number, timestamp: number } | null {
    try {
      const cacheKey = this.getCacheKey(address);
      const cachedData = localStorage.getItem(cacheKey);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (error) {
      console.error('Error reading license cache:', error);
    }
    
    return null;
  }

  static clear(address?: string) {
    try {
      if (address) {
        const cacheKey = this.getCacheKey(address);
        localStorage.removeItem(cacheKey);
      } else {
        // Clear all licenses caches
        Object.keys(localStorage)
          .filter(key => key.startsWith(this.CACHE_KEY_PREFIX))
          .forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('Error clearing license cache:', error);
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
    // Check cache first - CRITICAL STEP
    const cachedData = SecureLicenseCache.get(ownerAddress);
    if (cachedData && cachedData.licenses.length > 0) {
      console.log('Loading from cache:', cachedData.licenses.length);
      setLicenses(cachedData.licenses);
      setTotalLicenseCount(cachedData.totalCount);
      setProgress(100);
      return;
    }

    setLoading(true);
    setError(undefined);
    setProgress(0);

    try {
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
        toast.info('No licenses found in this wallet');
        return;
      }

      // Batch fetching strategy for large number of licenses
      const BATCH_SIZE = 1000;
      const licenses: License[] = [];

      for (let i = 0; i < totalLicenses; i += BATCH_SIZE) {
        const batchPromises = [];
        const batchEnd = Math.min(i + BATCH_SIZE, totalLicenses);

        for (let j = i; j < batchEnd; j++) {
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

        const batchLicenses = await Promise.all(batchPromises);
        const validLicenses = batchLicenses.filter((license): license is License => 
          license !== null && ['available', 'delegated', 'expired'].includes(license.status)
        );
        
        licenses.push(...validLicenses);

        // Update progress
        const progress = Math.min(
          Math.round((licenses.length / totalLicenses) * 100),
          100
        );
        setProgress(progress);
        setLicenses(licenses);
      }

      // Cache the licenses
      SecureLicenseCache.set(ownerAddress, licenses, totalLicenses);

      toast.success(`Loaded ${licenses.length} of ${totalLicenses} licenses`);
    } catch (err) {
      console.error('Error fetching licenses:', err);
      const message = err instanceof Error 
        ? 'Failed to fetch licenses. Please try again.' 
        : 'Unexpected error fetching licenses';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    if (!address) {
      setLicenses([]);
      setLoading(false);
      return;
    }

    timeoutId = setTimeout(() => {
      if (mounted) {
        fetchLicenses(address);
      }
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [address, fetchLicenses]);

  // Expose methods to interact with cache
  const clearCache = useCallback(() => {
    if (address) {
      SecureLicenseCache.clear(address);
    }
  }, [address]);

  const clearAllCaches = useCallback(() => {
    SecureLicenseCache.clear();
  }, []);

  return { 
    licenses, 
    loading, 
    error, 
    progress, 
    totalLicenseCount,
    clearCache,
    clearAllCaches
  };
}