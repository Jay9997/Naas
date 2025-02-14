'use client';

import { useState, useEffect } from 'react';
import { createPublicClient, http, getContract } from 'viem';
import { mawariTestnet } from '@/config/chains';
import type { License } from '@/types/license';

const NFT_CONTRACT_ADDRESS = "0xf15a69e2733f03273c37551927dC68Fef71926bf";
const ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" }
    ],
    name: "tokenOfOwnerByIndex",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
] as const;

const publicClient = createPublicClient({
  chain: mawariTestnet,
  transport: http()
});

export function useWalletLicenses(address: string | undefined) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    async function fetchLicenses() {
      if (!address) {
        if (mounted) {
          setLicenses([]);
          setLoading(false);
        }
        return;
      }
      
      if (mounted) {
        setLoading(true);
        setError(undefined);
      }
      
      try {
        const contract = getContract({
          address: NFT_CONTRACT_ADDRESS as `0x${string}`,
          abi: ABI,
          publicClient,
        });
        
        const balance = await contract.read.balanceOf([address as `0x${string}`]);
        
        if (balance === 0n) {
          if (mounted) {
            setLicenses([]);
            setLoading(false);
          }
          return;
        }
        
        const licensePromises = Array.from({ length: Number(balance) }, (_, i) => 
          contract.read.tokenOfOwnerByIndex([
            address as `0x${string}`,
            BigInt(i)
          ])
        );
        
        const tokenIds = await Promise.all(licensePromises);
        
        if (mounted) {
          const licenses = tokenIds.map(id => ({
            tokenId: id.toString(),
            status: 'available',
            expiryDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
          }));
          
          setLicenses(licenses);
        }
      } catch (err) {
        console.error('Error fetching licenses:', err);
        if (mounted) {
          setError('Failed to fetch licenses. Please try again.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    // Add a small delay before fetching to prevent rapid re-fetches
    timeoutId = setTimeout(fetchLicenses, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [address]);

  return { licenses, loading, error };
}


