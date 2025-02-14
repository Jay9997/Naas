'use client';

import { useState } from 'react';
import { useWalletClient, usePublicClient, useNetwork, useSwitchNetwork } from 'wagmi';
import { getContract } from 'viem';
import { useAccount } from 'wagmi';
import { mawariTestnet } from '@/config/chains';

const NFT_CONTRACT_ADDRESS = "0x3F1BD1Abc350eD6313Ff7Eaab561DCAbbcc61071";
const ABI = [
  {
    inputs: [
      { name: "delegatee", type: "address" },
      { name: "tokenId", type: "uint256" },    ],
    name: "delegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;


export function useDelegateLicense(selectedWalletAddress?: string) {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const {chain} = useNetwork();
  const {switchNetwork} = useSwitchNetwork();

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
      // Check if delegation exists 
      const contract = getContract({
        address: NFT_CONTRACT_ADDRESS as `0x${string}`,
        abi: [
          {
            inputs: [
              { name: "to", type: "address" },
              { name: "tokenId", type: "uint256" }
            ],
            name: "delegate",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function"
          }
        ] as const,
        publicClient,
      });

      // Simulate  tx first
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

  return { delegateLicense, isLoading, error };
}
