'use client';

import { useState } from 'react';
import { useWalletClient, usePublicClient, useNetwork, useSwitchNetwork } from 'wagmi';
import { getContract, encodeFunctionData } from 'viem';
import { useAccount } from 'wagmi';
import { mawariTestnet } from '@/config/chains';

const NFT_CONTRACT_ADDRESS = "0xebD54bff71c779291280A73dD489b9Be44A626A3";

// Extended ABI with multicall function (ownerOf removed as it's in the wallet hook)
const ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" }
    ],
    name: "delegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "data", type: "bytes[]" }
    ],
    name: "multicall",
    outputs: [
      { name: "results", type: "bytes[]" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

export interface DelegationResult {
  tokenId: string;
  success: boolean;
  hash?: string;
  error?: string;
}

export interface OwnershipCheckResult {
  ownedTokens: string[];
  notOwnedTokens: string[];
  alreadyDelegatedTokens: string[];
}

export function useDelegateLicenses() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<DelegationResult[]>([]);

  // Individual license delegation (original implementation)
  const delegateLicense = async (tokenId: string, delegateeAddress: string) => {
    if (!walletClient) {
      setError('Wallet not connected');
      throw new Error('Wallet not connected');
    }

    if (chain?.id !== mawariTestnet.id) {
      try {
        await switchNetwork?.(mawariTestnet.id);
      } catch (err) {
        throw new Error('Please switch to Mawari Testnet network');
      }
    }

    // Check ownership first
    if (!walletClient) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const contract = getContract({
        address: NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: ABI,
        publicClient,
      });

      // Simulate tx first
      try {
        await contract.simulate.delegate([
          delegateeAddress as `0x${string}`,
          BigInt(tokenId)
        ]);
      } catch (simError: any) {
        // Check if the error message contains "Delegation exists"
        if (simError.message?.includes('Delegation exists') || 
            simError.cause?.message?.includes('Delegation exists')) {
          throw new Error(`License ${tokenId} is already delegated`);
        }
        throw simError;
      }

      // If simulation passes, proceed with actual delegation
      const delegateContract = getContract({
        ...contract,
        walletClient,
      });

      const hash = await delegateContract.write.delegate([
        delegateeAddress as `0x${string}`,
        BigInt(tokenId)
      ]);

      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delegate license';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Batch delegation using multicall ONLY
  const delegateLicensesBatch = async (tokenIds: string[], delegateeAddress: string) => {
    if (!walletClient) {
      setError('Wallet not connected');
      throw new Error('Wallet not connected');
    }

    if (chain?.id !== mawariTestnet.id) {
      try {
        await switchNetwork?.(mawariTestnet.id);
      } catch (err) {
        throw new Error('Please switch to Mawari Testnet network');
      }
    }

    if (tokenIds.length === 0) {
      return { hash: null, successful: true };
    }

    setIsLoading(true);
    setError(undefined);
    setProgress(0);
    setResults([]);

    try {
      const contract = getContract({
        address: NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: ABI,
        publicClient,
      });

      // Encode each delegate call
      const encodedCalls = tokenIds.map(tokenId => 
        encodeFunctionData({
          abi: ABI,
          functionName: 'delegate',
          args: [delegateeAddress as `0x${string}`, BigInt(tokenId)]
        })
      );

      console.log('Attempting multicall with tokens:', tokenIds);
      console.log('Delegatee address:', delegateeAddress);
      console.log('Sender address:', walletClient.account.address);

      // Simulate the multicall (REQUIRED - don't skip this)
      await contract.simulate.multicall([encodedCalls]);
      console.log('Multicall simulation passed');

      // If simulation passes, proceed with actual multicall
      const delegateContract = getContract({
        ...contract,
        walletClient,
      });

      const hash = await delegateContract.write.multicall([encodedCalls]);
      console.log('Multicall transaction hash:', hash);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Multicall transaction confirmed:', receipt.status);

      // Create success results for all tokens
      const batchResults = tokenIds.map(tokenId => ({
        tokenId,
        success: true,
        hash
      }));
      
      setResults(batchResults);
      setProgress(100);
      
      return { 
        hash, 
        successful: receipt.status === 'success',
        results: batchResults
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to batch delegate licenses';
      console.error('Multicall failed:', err);
      setError(errorMessage);
      throw err; // Re-throw the error instead of falling back
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    delegateLicense, 
    delegateLicensesBatch,
    isLoading, 
    error,
    progress,
    results
  };
}