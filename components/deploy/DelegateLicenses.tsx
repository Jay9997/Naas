'use client';

import { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useDelegateLicenses } from '@/hooks/use-delegate-license';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { toast } from 'sonner';

interface DelegateLicensesProps {
  selectedLicenses: Set<string>;
  onDelegationComplete: () => void;
  selectedWalletAddress: string;
  onBack?: () => void;
}

function DelegateLicenses({ 
  selectedLicenses, 
  onDelegationComplete,
  selectedWalletAddress,
  onBack 
}: DelegateLicensesProps) {
  const [delegateeAddress, setDelegateeAddress] = useState('');
  const [isDelegationStarted, setIsDelegationStarted] = useState(false);
  const [delegationComplete, setDelegationComplete] = useState(false);
  const [finalStats, setFinalStats] = useState<{
    successful: number;
    failed: number;
    total: number;
  } | null>(null);

  const { 
    delegateLicensesBatch, 
    isLoading, 
    error,
    progress,
    results
  } = useDelegateLicenses(selectedWalletAddress);
  const { address: connectedAddress, isConnected } = useAccount();

  // Check if delegation is complete based on results
  useEffect(() => {
    if (isDelegationStarted && !isLoading) {
      const totalCount = selectedLicenses.size;
      const resultCount = results.length;
      
      // Check if we have results for all tokens (either success or failure)
      if (resultCount === totalCount) {
        const successCount = results.filter(r => r.success).length;
        const failedCount = totalCount - successCount;
        
        setDelegationComplete(true);
        setFinalStats({
          successful: successCount,
          failed: failedCount,
          total: totalCount
        });
        
        if (successCount === totalCount) {
          toast.success(`🎉 Successfully delegated all ${totalCount} licenses!`);
        } else if (successCount > 0) {
          toast.success(`✅ Successfully delegated ${successCount} out of ${totalCount} licenses`);
          if (failedCount > 0) {
            toast.error(`❌ ${failedCount} license${failedCount > 1 ? 's' : ''} failed to delegate`);
          }
        } else {
          toast.error(`❌ All ${totalCount} licenses failed to delegate`);
        }
      }
    }
  }, [results, selectedLicenses.size, isLoading, isDelegationStarted]);

  const handleDelegation = async () => {
    if (!delegateeAddress || !/^0x[a-fA-F0-9]{40}$/.test(delegateeAddress)) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }

    if (connectedAddress?.toLowerCase() !== selectedWalletAddress.toLowerCase()) {
      toast.error('Please switch to the wallet that owns these licenses');
      return;
    }

    setIsDelegationStarted(true);
    setDelegationComplete(false);
    setFinalStats(null);
    
    const licenses = Array.from(selectedLicenses);
    
    // Show initial toast for large batches
    if (licenses.length > 50) {
      toast.info(`🚀 Starting SINGLE multicall transaction for ${licenses.length} licenses. This may take a few minutes...`);
    }
    
    try {
      const result = await delegateLicensesBatch(licenses, delegateeAddress);
      console.log('Delegation batch completed:', result);
    } catch (err) {
      console.error('Delegation process failed:', err);
      if (!isDelegationStarted || results.length === 0) {
        toast.error('Failed to start delegation process');
        setIsDelegationStarted(false);
      }
    }
  };

  // Show connect wallet state if not connected
  if (!isConnected) {
    return (
      <div className="mt-4 space-y-4">
        <div className="p-6 bg-[#1A1525] rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Connect Wallet</h3>
          <p className="text-gray-400 mb-6">
            Please connect the wallet that holds the licenses.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  const isWrongWallet = connectedAddress?.toLowerCase() !== selectedWalletAddress.toLowerCase();
  
  const getSuccessCount = () => {
    return results.filter(r => r.success).length;
  };

  const getFailedCount = () => {
    return results.filter(r => !r.success).length;
  };

  const getProgressColor = () => {
    if (!isDelegationStarted) return 'bg-gray-600';
    if (delegationComplete && finalStats) {
      if (finalStats.successful === finalStats.total) return 'bg-green-500';
      if (finalStats.successful > 0) return 'bg-yellow-500';
      return 'bg-red-500';
    }
    return 'bg-pink-500';
  };

  const getStatusSummary = () => {
    if (!isDelegationStarted) return null;
    
    const successCount = getSuccessCount();
    const failedCount = getFailedCount();
    const totalCount = selectedLicenses.size;
    
    if (delegationComplete && finalStats) {
      if (finalStats.successful === finalStats.total) {
        return { type: 'success', message: `All ${totalCount} licenses delegated successfully!` };
      } else if (finalStats.successful > 0) {
        return { type: 'partial', message: `${finalStats.successful} successful, ${finalStats.failed} failed` };
      } else {
        return { type: 'error', message: `All ${totalCount} licenses failed to delegate` };
      }
    }
    
    return { type: 'progress', message: `Processing ${totalCount} licenses...` };
  };

  const statusSummary = getStatusSummary();

  return (
    <div className="mt-4 space-y-6">
      {onBack && !isDelegationStarted && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-pink-400 hover:text-pink-300 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to License Selection
        </button>
      )}

      <div className="bg-[#1A1525] p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Delegate Licenses</h3>
        
        {isWrongWallet && (
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-400">
              Please switch to the wallet address that owns these licenses:
              <span className="block mt-1 font-mono text-sm break-all">{selectedWalletAddress}</span>
            </p>
            <div className="mt-4">
              <ConnectButton />
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {!isDelegationStarted && (
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
          )}

          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">Progress</div>
              {selectedLicenses.size > 50 && isDelegationStarted && !delegationComplete && (
                <div className="text-xs text-blue-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Single transaction - {selectedLicenses.size} licenses
                </div>
              )}
            </div>
            <div className="bg-[#2D2438] rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getProgressColor()}`}
                style={{ width: `${isDelegationStarted ? progress : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                {getSuccessCount()} of {selectedLicenses.size} licenses delegated
                {getFailedCount() > 0 && ` (${getFailedCount()} failed)`}
              </span>
              {isDelegationStarted && (
                <span className={`font-medium ${
                  delegationComplete 
                    ? finalStats?.successful === selectedLicenses.size 
                      ? 'text-green-400' 
                      : finalStats?.successful === 0
                      ? 'text-red-400'
                      : 'text-yellow-400'
                    : 'text-pink-400'
                }`}>
                  {progress}%
                </span>
              )}
            </div>
          </div>

          {/* Status Summary */}
          {statusSummary && (
            <div className={`p-3 rounded-lg border ${
              statusSummary.type === 'success' 
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : statusSummary.type === 'partial'
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                : statusSummary.type === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              <div className="flex items-center gap-2">
                {statusSummary.type === 'success' && <CheckCircle className="w-4 h-4" />}
                {statusSummary.type === 'partial' && <AlertTriangle className="w-4 h-4" />}
                {statusSummary.type === 'error' && <XCircle className="w-4 h-4" />}
                {statusSummary.type === 'progress' && <Loader2 className="w-4 h-4 animate-spin" />}
                <span className="text-sm font-medium">{statusSummary.message}</span>
              </div>
            </div>
          )}

          {/* Detailed Results */}
          {results.length > 0 && (
            <div className="mt-4 bg-[#2D2438] rounded-lg p-4 max-h-[300px] overflow-y-auto">
              <h4 className="text-sm font-medium mb-3 sticky top-0 bg-[#2D2438] py-1 flex items-center justify-between">
                <span>Delegation Status</span>
                <span className="text-xs text-gray-400">
                  {results.length}/{selectedLicenses.size} processed
                </span>
              </h4>
              <div className="space-y-2">
                {Array.from(selectedLicenses).map((tokenId) => {
                  const result = results.find(r => r.tokenId === tokenId);
                  return (
                    <div 
                      key={tokenId} 
                      className="flex items-center justify-between text-sm p-2 rounded bg-[#1A1525]"
                    >
                      <div className="flex items-center gap-2">
                        {result ? (
                          result.success ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )
                        ) : (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        )}
                        <span className="font-mono">Token #{tokenId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          result
                            ? result.success
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-red-500/10 text-red-400'
                            : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {result
                            ? result.success
                              ? 'Success'
                              : 'Failed'
                            : 'Pending'
                          }
                        </span>
                        {result?.error && (
                          <span className="text-xs text-red-400 max-w-[100px] truncate" title={result.error}>
                            {result.error}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                <span className="font-medium">Error:</span>
              </div>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        {!isDelegationStarted ? (
          <button
            onClick={handleDelegation}
            disabled={isLoading || !delegateeAddress || isWrongWallet}
            className="px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Preparing...
              </>
            ) : (
              `Delegate ${selectedLicenses.size} License${selectedLicenses.size > 1 ? 's' : ''}`
            )}
          </button>
        ) : (
          <button
            onClick={onDelegationComplete}
            disabled={isLoading || !delegationComplete}
            className={`px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium ${
              finalStats?.successful === selectedLicenses.size
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : finalStats?.successful === 0
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-yellow-500 hover:bg-yellow-600 text-white'
            }`}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Complete'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default DelegateLicenses;