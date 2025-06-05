'use client';

import { useState } from 'react';
import { useWalletClient, usePublicClient, useNetwork, useSwitchNetwork } from 'wagmi';
import { getContract, encodeFunctionData } from 'viem';
import { useAccount } from 'wagmi';
import { mawariTestnet } from '@/config/chains';

const NFT_CONTRACT_ADDRESS = "0xebD54bff71c779291280A73dD489b9Be44A626A3";

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

export interface OwnershipCheckResult {
  ownedTokens: string[];
  notOwnedTokens: string[];
  alreadyDelegatedTokens: string[];
}

export function useDelegateLicenses(selectedWalletAddress: string) {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<DelegationResult[]>([]);

  // Individual license delegation
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
        if (simError.message?.includes('Delegation exists') || 
            simError.cause?.message?.includes('Delegation exists')) {
          throw new Error(`License ${tokenId} is already delegated`);
        }
        throw simError;
      }

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

  // SINGLE MULTICALL - ALL 98 TOKENS IN ONE TRANSACTION WITH HIGH GAS LIMIT
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
      return { hash: null, successful: true, results: [] };
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

      const delegateContract = getContract({
        ...contract,
        walletClient,
      });

      console.log(`🚀 SINGLE TRANSACTION: Processing ALL ${tokenIds.length} tokens in ONE multicall`);
      console.log('Token IDs:', tokenIds);
      console.log('Delegatee address:', delegateeAddress);
      console.log('Sender address:', walletClient.account.address);

      // Encode ALL delegate calls into ONE multicall array
      const encodedCalls = tokenIds.map(tokenId => 
        encodeFunctionData({
          abi: ABI,
          functionName: 'delegate',
          args: [delegateeAddress as `0x${string}`, BigInt(tokenId)]
        })
      );

      console.log(`✅ Encoded ${encodedCalls.length} delegate calls for SINGLE multicall`);
      setProgress(25);

      // Estimate gas for the large multicall
      console.log('⛽ Estimating gas for large multicall...');
      let gasEstimate: bigint;
      try {
        gasEstimate = await contract.estimateGas.multicall([encodedCalls], {
          account: walletClient.account
        });
        console.log(`📊 Gas estimate: ${gasEstimate.toString()}`);
      } catch (gasError) {
        console.log('⚠️ Gas estimation failed, using high default gas limit');
        gasEstimate = BigInt(10000000); // 10M gas as fallback
      }

      // Add 50% buffer to gas estimate for safety
      const gasLimit = (gasEstimate * BigInt(150)) / BigInt(100);
      console.log(`⛽ Using gas limit: ${gasLimit.toString()} (with 50% buffer)`);

      // Simulate the multicall with ALL tokens
      console.log('🔍 Simulating SINGLE multicall with ALL tokens...');
      await contract.simulate.multicall([encodedCalls]);
      console.log('✅ SINGLE multicall simulation PASSED for ALL tokens');
      setProgress(50);

      // Execute ONE multicall with ALL tokens and high gas limit
      console.log('📤 Executing SINGLE multicall transaction with high gas limit...');
      const hash = await delegateContract.write.multicall([encodedCalls], {
        gas: gasLimit
      });
      console.log(`📝 SINGLE multicall transaction hash: ${hash}`);
      console.log(`⛽ Transaction submitted with gas limit: ${gasLimit.toString()}`);
      setProgress(75);

      // Wait for the ONE transaction with extended timeout
      console.log('⏳ Waiting for SINGLE transaction confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        timeout: 180000 // 3 minute timeout for large batch
      });
      
      console.log(`✅ SINGLE transaction confirmed: ${receipt.status}`);
      console.log(`⛽ Actual gas used: ${receipt.gasUsed.toString()}`);
      console.log(`💰 Effective gas price: ${receipt.effectiveGasPrice?.toString()}`);

      // ALL tokens succeed or fail together
      const allResults = tokenIds.map(tokenId => ({
        tokenId,
        success: receipt.status === 'success',
        hash: receipt.status === 'success' ? hash : undefined,
        error: receipt.status !== 'success' ? 'Transaction failed' : undefined
      }));

      setResults(allResults);
      setProgress(100);

      const successCount = receipt.status === 'success' ? tokenIds.length : 0;
      
      console.log(`🎉 SINGLE multicall result: ${successCount}/${tokenIds.length} successful`);
      console.log(`💸 Total transaction cost: ${receipt.gasUsed} gas at ${receipt.effectiveGasPrice} per gas`);

      return {
        hash,
        successful: receipt.status === 'success',
        results: allResults,
        totalSuccess: successCount,
        totalFailed: tokenIds.length - successCount,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.effectiveGasPrice?.toString()
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delegate licenses in single transaction';
      console.error('❌ SINGLE multicall failed:', err);
      
      // Check if it's a gas-related error
      if (errorMessage.includes('gas') || errorMessage.includes('out of gas')) {
        console.error('💸 Gas-related error - transaction may need higher gas limit');
      }
      
      setError(errorMessage);
      
      const failedResults = tokenIds.map(tokenId => ({
        tokenId,
        success: false,
        error: errorMessage
      }));
      
      setResults(failedResults);
      setProgress(100);
      
      throw err;
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