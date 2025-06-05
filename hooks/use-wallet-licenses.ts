'use client';

import { useState, useEffect } from 'react';
import { createPublicClient, http, getContract } from 'viem';
import { mawariTestnet } from '@/config/chains';
import type { License } from '@/types/license';

// NFT contract address where tokens actually exist
const NFT_CONTRACT_ADDRESS = "0xa0467e0d53B552F5A0D8d846207eF6C3a6933b3C";

// Simple ABI with only what we need
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
    if (!address) {
      setLicenses([]);
      setLoading(false);
      setError(undefined);
      return;
    }

    loadLicenses(address);
  }, [address]);

  const loadLicenses = async (walletAddress: string) => {
    setLoading(true);
    setError(undefined);
    setLicenses([]);

    try {
      console.log(`🔍 Loading licenses for wallet: ${walletAddress}`);

      const contract = getContract({
        address: NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: ABI,
        publicClient,
      });

      // Get total number of tokens owned
      const balance = await contract.read.balanceOf([walletAddress as `0x${string}`]);
      const tokenCount = Number(balance);
      
      console.log(`💰 Wallet owns ${tokenCount} tokens`);

      if (tokenCount === 0) {
        setLicenses([]);
        setLoading(false);
        return;
      }

      // Get all token IDs owned by this wallet
      const tokenPromises = [];
      for (let i = 0; i < tokenCount; i++) {
        tokenPromises.push(
          contract.read.tokenOfOwnerByIndex([walletAddress as `0x${string}`, BigInt(i)])
        );
      }

      console.log(`📦 Fetching ${tokenCount} token IDs...`);
      const tokenIds = await Promise.all(tokenPromises);

      // Convert to License objects
      const licenseList: License[] = tokenIds.map(tokenId => ({
        tokenId: tokenId.toString(),
        status: 'available' as const,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      }));

      console.log(`✅ Loaded ${licenseList.length} licenses:`);
      console.log(`Token IDs: [${licenseList.map(l => l.tokenId).join(', ')}]`);

      setLicenses(licenseList);

    } catch (err) {
      console.error('❌ Error loading licenses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load licenses');
    } finally {
      setLoading(false);
    }
  };

  return { 
    licenses, 
    loading, 
    error,
    totalLicenseCount: licenses.length
  };
}