'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useDelegateLicense } from '@/hooks/use-delegate-license';
import { useAccount } from 'wagmi';

interface DelegateLicensesProps {
  selectedLicenses: Set<string>;
  onDelegationComplete: () => void;
  selectedWalletAddress: string;
}

export function DelegateLicenses({ 
  selectedLicenses, 
  onDelegationComplete,
  selectedWalletAddress 
}: DelegateLicensesProps) {
  const [delegateeAddress, setDelegateeAddress] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [delegatedLicenses, setDelegatedLicenses] = useState<string[]>([]);
  const { delegateLicense, isLoading, error } = useDelegateLicense(selectedWalletAddress);
  const { address: connectedAddress } = useAccount();

  const handleDelegation = async () => {
    if (!delegateeAddress || !/^0x[a-fA-F0-9]{40}$/.test(delegateeAddress)) {
      alert('Please enter a valid address');
      return;
    }

    // Check if the connected address matches the selected wallet
    if (connectedAddress?.toLowerCase() !== selectedWalletAddress.toLowerCase()) {
      alert('Please switch to the wallet that owns these licenses');
      return;
    }

    const licenses = Array.from(selectedLicenses);
    
    for (const tokenId of licenses) {
      try {
        await delegateLicense(tokenId, delegateeAddress);
        setDelegatedLicenses(prev => [...prev, tokenId]);
        setCurrentStep(prev => prev + 1);
      } catch (err) {
        break;
      }
    }

    if (delegatedLicenses.length === selectedLicenses.size) {
      onDelegationComplete();
    }
  };

  const isWrongWallet = connectedAddress?.toLowerCase() !== selectedWalletAddress.toLowerCase();

  return (
    <div className="mt-4 space-y-6">
      <div className="bg-[#1A1525] p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Delegate Licenses</h3>
        
        {isWrongWallet && (
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-400">
              Please switch to the wallet address that owns these licenses:
              <span className="block mt-1 font-mono">{selectedWalletAddress}</span>
            </p>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Delegate to Address
            </label>
            <input
              type="text"
              value={delegateeAddress}
              onChange={(e) => setDelegateeAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-[#2D2438] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm text-gray-400">Progress</div>
            <div className="bg-[#2D2438] rounded-full h-2 overflow-hidden">
              <div 
                className="bg-pink-400 h-full transition-all duration-500"
                style={{ width: `${(delegatedLicenses.length / selectedLicenses.size) * 100}%` }}
              />
            </div>
            <div className="text-sm text-gray-400">
              {delegatedLicenses.length} of {selectedLicenses.size} licenses delegated
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleDelegation}
          disabled={isLoading || !delegateeAddress || delegatedLicenses.length === selectedLicenses.size || isWrongWallet}
          className="px-6 py-2 bg-pink-400 text-white rounded-lg hover:bg-pink-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? 'Delegating...' : 'Delegate Licenses'}
        </button>
      </div>
    </div>
  );
}