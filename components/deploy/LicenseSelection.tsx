'use client';

import { useState, useEffect } from 'react';
import { useWalletLicenses } from '@/hooks/use-wallet-licenses';
import type { License } from '@/types/license';
import { Loader2, RefreshCw } from 'lucide-react';

interface LicenseSelectionProps {
  walletAddress: string;
  onLicenseSelect: (licenses: Set<string>) => void;
  selectedLicenses: Set<string>;
}

export function LicenseSelection({
  walletAddress,
  onLicenseSelect,
  selectedLicenses: initialSelectedLicenses
}: LicenseSelectionProps) {
  const { 
    licenses, 
    loading, 
    error,
    totalLicenseCount
  } = useWalletLicenses(walletAddress);
  
  const [localSelectedLicenses, setLocalSelectedLicenses] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [forceRefresh, setForceRefresh] = useState(0);
  const licensesPerPage = 50;

  // Reset selection when wallet address changes
  useEffect(() => {
    setLocalSelectedLicenses(new Set());
    setCurrentPage(1);
    setSearchTerm('');
  }, [walletAddress]);

  // Log token IDs for debugging
  useEffect(() => {
    if (licenses.length > 0) {
      console.log("✅ Loaded licenses:", licenses.length);
      console.log("First 5 token IDs:", licenses.slice(0, 5).map(l => l.tokenId));
      console.log("Last 5 token IDs:", licenses.slice(-5).map(l => l.tokenId));
    }
  }, [licenses]);

  // Quick select options
  const quickSelectOptions = [10, 20, 30, 40, 50, 60, 70, 80, 90, 98];

  // All licenses are available (simplified - no delegation status checking)
  const availableLicenses = licenses;

  const handleRefresh = () => {
    setForceRefresh(prev => prev + 1);
  };

  const toggleLicense = (tokenId: string) => {
    const newSelected = new Set(localSelectedLicenses);
    if (newSelected.has(tokenId)) {
      newSelected.delete(tokenId);
    } else {
      newSelected.add(tokenId);
    }
    setLocalSelectedLicenses(newSelected);
  };

  const handleSelectAll = () => {
    const allTokenIds = new Set(availableLicenses.map(license => license.tokenId));
    setLocalSelectedLicenses(allTokenIds);
  };

  const handleClearAll = () => {
    setLocalSelectedLicenses(new Set());
  };

  const handleQuickSelect = (count: number) => {
    const newSelected = new Set<string>();
    
    // Sort licenses by tokenId (highest first, matching your actual token order)
    const sortedLicenses = [...availableLicenses].sort((a, b) => 
      parseInt(b.tokenId) - parseInt(a.tokenId) // Descending order (299308, 299307, etc.)
    );

    // Select first 'count' licenses
    for (let i = 0; i < Math.min(count, sortedLicenses.length); i++) {
      newSelected.add(sortedLicenses[i].tokenId);
    }

    setLocalSelectedLicenses(newSelected);
  };

  const handleContinue = () => {
    onLicenseSelect(localSelectedLicenses);
  };

  // Filter and paginate available licenses
  const filteredLicenses = availableLicenses.filter(license =>
    license.tokenId.includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredLicenses.length / licensesPerPage);
  const paginatedLicenses = filteredLicenses.slice(
    (currentPage - 1) * licensesPerPage,
    currentPage * licensesPerPage
  );

  if (loading) {
    return (
      <div className="mt-4 flex flex-col items-center justify-center p-8 bg-[#1A1525] rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-pink-400 mb-4" />
        <p className="text-gray-400 mb-2">Loading your licenses...</p>
        <p className="text-sm text-gray-500">Fetching token IDs from contract</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-400 text-center font-medium">{error}</p>
        <button 
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center mx-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  if (!availableLicenses.length) {
    return (
      <div className="mt-4 p-6 bg-[#1A1525] rounded-lg">
        <p className="text-red-400 text-center font-medium">No licenses found in this wallet</p>
        <p className="text-gray-400 text-center text-sm mt-2">
          Make sure you're connected to the correct wallet
        </p>
        <button 
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-[#2D2438] text-white rounded-lg hover:bg-pink-500/20 transition-colors flex items-center justify-center mx-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-sm text-gray-400">Total Licenses: </span>
            <span className="font-semibold text-green-400">{availableLicenses.length}</span>
          </div>
          <button 
            onClick={handleRefresh}
            className="p-1 text-gray-400 hover:text-pink-400 transition-colors"
            title="Refresh licenses"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div>
          <span className="text-sm text-gray-400">Selected: </span>
          <span className="font-semibold text-pink-400">{localSelectedLicenses.size}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-2 justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          {quickSelectOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleQuickSelect(option)}
              disabled={option > availableLicenses.length}
              className="px-3 py-1 bg-[#2D2438] text-white rounded-lg hover:bg-pink-500/20 transition-colors text-sm disabled:opacity-50"
            >
              Select {option}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
          >
            Select All ({availableLicenses.length})
          </button>
          <button
            onClick={handleClearAll}
            className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search licenses by token ID..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-[#2D2438] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
        />
      </div>
      
      {/* License Grid */}
      <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {paginatedLicenses.map((license) => (
            <div
              key={license.tokenId}
              className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-lg ${
                localSelectedLicenses.has(license.tokenId)
                  ? 'bg-pink-500/20 border-pink-400 shadow-pink-400/20'
                  : 'bg-[#1A1525] border-gray-700 hover:border-pink-400/50'
              }`}
              onClick={() => toggleLicense(license.tokenId)}
            >
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Token</div>
                <div className="font-mono text-sm font-semibold">#{license.tokenId}</div>
                <div className="mt-2">
                  <div className={`px-2 py-1 rounded text-xs ${
                    localSelectedLicenses.has(license.tokenId)
                      ? 'bg-pink-400/20 text-pink-300'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {localSelectedLicenses.has(license.tokenId) ? 'Selected' : 'Available'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-[#2D2438] rounded-lg disabled:opacity-50 hover:bg-pink-500/20 transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-400 px-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-[#2D2438] rounded-lg disabled:opacity-50 hover:bg-pink-500/20 transition-colors"
          >
            Next
          </button>
        </div>
      )}
      
      {/* Continue Button */}
      {localSelectedLicenses.size > 0 && (
        <div className="sticky bottom-0 bg-[#0F0B1E] pt-4">
          <div className="flex flex-col gap-3 p-4 bg-[#2D2438] rounded-lg border border-pink-400/20">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-400">Ready for Delegation</div>
                <div className="text-lg font-semibold text-pink-400">{localSelectedLicenses.size} licenses</div>
              </div>
              <button 
                onClick={handleContinue}
                className="px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium"
              >
                Continue to Delegation →
              </button>
            </div>
            <div className="mt-2">
              <div className="text-sm text-gray-400 mb-2">Selected Token IDs:</div>
              <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                {Array.from(localSelectedLicenses).slice(0, 10).map(licenseId => (
                  <div key={licenseId} className="px-2 py-1 bg-[#1A1525] rounded text-xs font-mono">
                    #{licenseId}
                  </div>
                ))}
                {localSelectedLicenses.size > 10 && (
                  <div className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">
                    +{localSelectedLicenses.size - 10} more
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}