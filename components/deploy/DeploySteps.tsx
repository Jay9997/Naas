'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch } from 'react-redux';
import type { Wallet, WalletCreate } from '@/types/wallet';
import { WalletSetup } from './WalletSetup';
import { LicenseSelection } from './LicenseSelection';
import { DelegateLicenses } from './DelegateLicenses';
import { deploySteps } from '@/config/deploy-steps';
import { useWalletLicenses } from '@/hooks/use-wallet-licenses';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { 
  setSelectedWallet as setReduxWallet,
  setCurrentStep,
  setSelectedLicenses,
} from '@/store/slices/deploymentSlice';

interface DeployStepsProps {
  isAddingWallet: boolean;
  selectedWallet: Wallet | null;
  connectedWallets: Wallet[];
  isDropdownOpen: boolean;
  onAddWallet: () => void;
  onWalletSelect: (wallet: Wallet) => void;
  onDropdownToggle: (e: React.MouseEvent) => void;
  onCancel: () => void;
  onSaveWallet: (wallet: WalletCreate) => void;
  existingWallets: Wallet[];
}

export function DeploySteps({
  isAddingWallet,
  selectedWallet,
  connectedWallets,
  isDropdownOpen,
  onAddWallet,
  onWalletSelect,
  onDropdownToggle,
  onCancel,
  onSaveWallet,
  existingWallets,
}: DeployStepsProps) {
  const dispatch = useDispatch();
  const [selectedLicenses, setLocalSelectedLicenses] = useState<Set<string>>(new Set());
  const [currentStep, setLocalCurrentStep] = useState(0);
  const [showLicenseSelection, setShowLicenseSelection] = useState(false);
  
  const { address, isConnected } = useAccount();
  const { licenses: selectedWalletLicenses, loading: selectedWalletLoading } = useWalletLicenses(selectedWallet?.address);
  
  // Initialize from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStep = localStorage.getItem('currentStep');
      const savedLicenses = localStorage.getItem('selectedLicenses');
      const savedWallet = localStorage.getItem('selectedWallet');
      
      if (savedStep) {
        const step = parseInt(savedStep);
        setLocalCurrentStep(step);
        dispatch(setCurrentStep(step));
      }
      
      if (savedLicenses) {
        try {
          const parsedLicenses = JSON.parse(savedLicenses);
          if (Array.isArray(parsedLicenses) && parsedLicenses.every(item => typeof item === 'string')) {
            const licenses = new Set(parsedLicenses);
            setLocalSelectedLicenses(licenses);
            dispatch(setSelectedLicenses(Array.from(licenses)));
          }
        } catch (error) {
          console.error('Error parsing saved licenses:', error);
          localStorage.removeItem('selectedLicenses');
        }
      }
      
      if (savedWallet) {
        try {
          const wallet = JSON.parse(savedWallet);
          if (wallet && typeof wallet === 'object' && 'address' in wallet) {
            dispatch(setReduxWallet(wallet));
            setShowLicenseSelection(currentStep === 1);
          }
        } catch (error) {
          console.error('Error parsing saved wallet:', error);
          localStorage.removeItem('selectedWallet');
        }
      }
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentStep', currentStep.toString());
      localStorage.setItem('selectedLicenses', JSON.stringify(Array.from(selectedLicenses)));
      if (selectedWallet) {
        localStorage.setItem('selectedWallet', JSON.stringify(selectedWallet));
      }
    }
  }, [currentStep, selectedLicenses, selectedWallet]);

  const handleWalletSelect = useCallback((wallet: Wallet) => {
    onWalletSelect(wallet);
    setShowLicenseSelection(true);
    setLocalCurrentStep(1);
    dispatch(setCurrentStep(1));
  }, [onWalletSelect, dispatch]);

  const handleLicenseSelect = useCallback((licenses: Set<string>) => {
    setLocalSelectedLicenses(licenses);
    if (licenses.size > 0) {
      setLocalCurrentStep(2);
      setShowLicenseSelection(false);
      dispatch(setCurrentStep(2));
      dispatch(setSelectedLicenses(Array.from(licenses)));
    }
  }, [dispatch]);

  const handleDelegationComplete = useCallback(() => {
    setLocalCurrentStep(3);
    dispatch(setCurrentStep(3));
  }, [dispatch]);

  const handleBackToLicenses = useCallback(() => {
    setLocalCurrentStep(1);
    setShowLicenseSelection(true);
    dispatch(setCurrentStep(1));
  }, [dispatch]);

  return (
    <div className="space-y-8">
      {deploySteps.map((step, index) => (
        <div key={step.id} className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              index === currentStep ? 'bg-pink-400' :
              index < currentStep ? 'bg-green-500' : 'bg-gray-700'
            }`}>
              {index < currentStep ? (
                <div className="text-white text-sm">✓</div>
              ) : index === currentStep ? (
                <div className="w-3 h-3 rounded-full bg-white"></div>
              ) : (
                <div className="text-white text-sm">{index + 1}</div>
              )}
            </div>
            {index < deploySteps.length - 1 && (
              <div className="w-0.5 h-16 bg-gray-700" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-gray-400 text-sm">{step.description}</p>
            
            {/* Wallet Selection */}
            {index === 0 && !isAddingWallet && (
              <div className="mt-4 flex gap-4 items-center">
                <div className="relative flex-1 wallet-dropdown">
                  <button
                    onClick={onDropdownToggle}
                    className="w-full px-4 py-3 bg-[#1A1525] rounded-lg border border-gray-700 flex items-center justify-between hover:border-pink-500/50 transition-colors"
                  >
                    <span className="text-gray-300">
                      {selectedWallet ? selectedWallet.label : 'Select wallet with licenses'}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                      isDropdownOpen ? 'transform rotate-180' : ''
                    }`} />
                  </button>
                  
                  {isDropdownOpen && connectedWallets.length > 0 && (
                    <div className="absolute w-full mt-2 bg-[#1A1525] border border-gray-700 rounded-lg shadow-xl z-10">
                      <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                        {connectedWallets.map((wallet, idx) => (
                          <button
                            key={wallet.address}
                            onClick={() => handleWalletSelect(wallet)}
                            className={`w-full px-4 py-3 text-left hover:bg-[#2D2438] flex items-center justify-between group ${
                              idx !== connectedWallets.length - 1 ? 'border-b border-gray-700/50' : ''
                            }`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-white group-hover:text-pink-400 transition-colors">
                                {wallet.label}
                              </span>
                              <span className="text-xs text-gray-500">
                                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                              </span>
                            </div>
                            <span className={`text-sm px-3 py-1 rounded-full ${
                              wallet.hasLicenses 
                                ? 'text-emerald-400 bg-emerald-400/10' 
                                : 'text-gray-400 bg-gray-400/10'
                            }`}>
                              {wallet.hasLicenses ? 'Has Licenses' : 'Select Wallet'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={onAddWallet}
                  className="flex items-center gap-2 text-pink-400 hover:text-pink-300 transition-colors px-4 py-2 border border-transparent hover:border-pink-500/20 rounded-lg"
                >
                  + Add Wallet
                </button>
              </div>
            )}
            
            {/* Wallet Setup */}
            {index === 0 && isAddingWallet && (
              <WalletSetup 
                onCancel={onCancel} 
                onSaveWallet={onSaveWallet} 
                existingWallets={existingWallets} 
              />
            )}
            
            {/* License Selection */}
            {index === 1 && selectedWallet && showLicenseSelection && (
              <LicenseSelection 
                walletAddress={selectedWallet.address} 
                onLicenseSelect={handleLicenseSelect}
                selectedLicenses={selectedLicenses}
              />
            )}

            {/* License Delegation */}
            {index === 2 && currentStep === 2 && selectedLicenses.size > 0 && selectedWallet && (
              <>
                <button
                  onClick={handleBackToLicenses}
                  className="mt-4 text-pink-400 hover:text-pink-300 transition-colors"
                >
                  ← Back to License Selection
                </button>
                <DelegateLicenses
                  selectedLicenses={selectedLicenses}
                  onDelegationComplete={handleDelegationComplete}
                  selectedWalletAddress={selectedWallet.address}
                />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}