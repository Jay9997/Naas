'use client';

import { useState } from 'react';
import { useWalletClient, usePublicClient, useNetwork, useSwitchNetwork } from 'wagmi';
import { getContract, encodeFunctionData } from 'viem';
import { useAccount } from 'wagmi';
import { mawariTestnet } from '@/config/chains';

const NFT_CONTRACT_ADDRESS = "0x3F1BD1Abc350eD6313Ff7Eaab561DCAbbcc61071";

// Extended ABI with multicall function
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

export function useDelegateLicenses(selectedWalletAddress?: string) {
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

  // Batch delegation using multicall
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

      // Check if the contract supports multicall by trying to simulate it
      const supportsMulticall = await checkMulticallSupport(contract, delegateeAddress, tokenIds[0]);

      if (!supportsMulticall) {
        // Fall back to individual delegations
        return await delegateLicensesIndividually(tokenIds, delegateeAddress);
      }

      // Try to simulate the multicall
      try {
        await contract.simulate.multicall([encodedCalls]);
      } catch (simError: any) {
        // If simulation fails, fall back to individual delegations
        console.warn('Multicall simulation failed, falling back to individual delegations:', simError);
        return await delegateLicensesIndividually(tokenIds, delegateeAddress);
      }

      // If simulation passes, proceed with actual multicall
      const delegateContract = getContract({
        ...contract,
        walletClient,
      });

      const hash = await delegateContract.write.multicall([encodedCalls]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

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
      setError(errorMessage);
      
      // If batch fails, try individual delegations
      console.warn('Batch delegation failed, falling back to individual delegations:', err);
      return await delegateLicensesIndividually(tokenIds, delegateeAddress);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to check if contract supports multicall
  const checkMulticallSupport = async (contract: any, delegateeAddress: string, sampleTokenId: string) => {
    try {
      const encodedCall = encodeFunctionData({
        abi: ABI,
        functionName: 'delegate',
        args: [delegateeAddress as `0x${string}`, BigInt(sampleTokenId)]
      });

      await contract.simulate.multicall([[encodedCall]]);
      return true;
    } catch (err: any) {
      // Check if the error is due to multicall not existing vs other errors
      if (err.message?.includes('method not found') || 
          err.cause?.message?.includes('method not found') ||
          err.message?.includes('function selector was not recognized') ||
          err.cause?.message?.includes('function selector was not recognized')) {
        return false;
      }
      // Other errors might just be with the specific delegation, not with multicall itself
      return true;
    }
  };

  // Individual delegations with progress tracking
  const delegateLicensesIndividually = async (tokenIds: string[], delegateeAddress: string) => {
    const results: DelegationResult[] = [];
    let successCount = 0;
    
    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];
      try {
        const hash = await delegateLicense(tokenId, delegateeAddress);
        results.push({ tokenId, success: true, hash });
        successCount++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        results.push({ tokenId, success: false, error: errorMessage });
      }
      
      // Update progress
      setProgress(Math.round((i + 1) / tokenIds.length * 100));
      setResults([...results]);
    }
    
    return { 
      hash: null, 
      successful: successCount > 0,
      results
    };
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