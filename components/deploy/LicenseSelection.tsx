'use client';

import { useState, useEffect } from 'react';
import { useWalletLicenses } from '@/hooks/use-wallet-licenses';
import type { License } from '@/types/license';
import { Loader2 } from 'lucide-react';

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
  const { licenses, loading, error, progress } = useWalletLicenses(walletAddress);
  const [localSelectedLicenses, setLocalSelectedLicenses] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const licensesPerPage = 50;

  // Quick select options
  const quickSelectOptions = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  // Filter out delegated licenses
  const availableLicenses = licenses.filter(license => license.status === 'available');

  const toggleLicense = (tokenId: string) => {
    const newSelected = new Set(localSelectedLicenses);
    if (newSelected.has(tokenId)) {
      newSelected.delete(tokenId);
    } else {
      newSelected.add(tokenId);
    }
    setLocalSelectedLicenses(newSelected);
  };

  const handleQuickSelect = (count: number) => {
    const newSelected = new Set<string>();
    
    // Sort available licenses by tokenId to ensure consistent selection
    const sortedLicenses = [...availableLicenses].sort((a, b) => 
      parseInt(a.tokenId) - parseInt(b.tokenId)
    );

    // Select first 'count' available licenses
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
        <p className="text-gray-400 mb-2">Loading licenses...</p>
        <div className="w-full max-w-md bg-[#2D2438] rounded-full h-2.5 mb-2">
          <div 
            className="bg-pink-400 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-500">{progress}% complete</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-400 text-center font-medium">{error}</p>
      </div>
    );
  }

  if (!availableLicenses.length) {
    return (
      <div className="mt-4 p-6 bg-[#1A1525] rounded-lg">
        <p className="text-red-400 text-center font-medium">No available licenses found in this wallet</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <span className="text-sm text-gray-400">Total Available Licenses: </span>
          <span className="font-semibold">{availableLicenses.length}</span>
        </div>
        <div>
          <span className="text-sm text-gray-400">Selected: </span>
          <span className="font-semibold">{localSelectedLicenses.size}</span>
        </div>
      </div>

      {/* Quick Select Section */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {quickSelectOptions.map((option) => (
          <button
            key={option}
            onClick={() => handleQuickSelect(option)}
            className="px-3 py-1 bg-[#2D2438] text-white rounded-lg hover:bg-pink-500/20 transition-colors text-sm"
          >
            Select {option}
          </button>
        ))}
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search available licenses..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-[#2D2438] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
        />
      </div>
      
      <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {paginatedLicenses.map((license) => (
            <div
              key={license.tokenId}
              className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-lg ${
                localSelectedLicenses.has(license.tokenId)
                  ? 'bg-[#2D2438] border-pink-400 shadow-pink-400/20'
                  : 'bg-[#1A1525] border-gray-700 hover:border-pink-400/50'
              }`}
              onClick={() => toggleLicense(license.tokenId)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-400">License ID</div>
                  <div className="font-mono">{license.tokenId}</div>
                </div>
                <div className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs">
                  Available
                </div>
              </div>
              {license.expiryDate && (
                <div className="mt-2">
                  <div className="text-sm text-gray-400">Expires</div>
                  <div>{new Date(license.expiryDate).toLocaleDateString()}</div>
                </div>
              )}
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
            className="px-3 py-1 bg-[#2D2438] rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-[#2D2438] rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
      
      {localSelectedLicenses.size > 0 && (
        <div className="sticky bottom-0 bg-[#0F0B1E] pt-4">
          <div className="flex flex-col gap-2 p-4 bg-[#2D2438] rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-400">Selected Licenses</div>
                <div className="text-lg font-semibold">{localSelectedLicenses.size}</div>
              </div>
              <button 
                onClick={handleContinue}
                className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
              >
                Continue to Delegation
              </button>
            </div>
            <div className="mt-2">
              <div className="text-sm text-gray-400 mb-1">Selected License IDs:</div>
              <div className="flex flex-wrap gap-2">
                {Array.from(localSelectedLicenses).slice(0, 5).map(licenseId => (
                  <div key={licenseId} className="px-3 py-1 bg-[#1A1525] rounded-lg text-sm font-mono">
                    {licenseId}
                  </div>
                ))}
                {localSelectedLicenses.size > 5 && (
                  <div className="px-3 py-1 bg-[#1A1525] rounded-lg text-sm">
                    +{localSelectedLicenses.size - 5} more
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