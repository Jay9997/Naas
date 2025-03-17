import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Wallet } from '@/types/wallet';

interface WalletState {
  selectedWallet: Wallet | null;
  wallets: Wallet[];
  isLoading: boolean;
  error: string | null;
}

const initialState: WalletState = {
  selectedWallet: null,
  wallets: [],
  isLoading: false,
  error: null,
};

export const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setSelectedWallet: (state, action: PayloadAction<Wallet | null>) => {
      state.selectedWallet = action.payload;
    },
    setWallets: (state, action: PayloadAction<Wallet[]>) => {
      state.wallets = action.payload;
    },
    addWallet: (state, action: PayloadAction<Wallet>) => {
      state.wallets.unshift(action.payload);
    },
    updateWallet: (state, action: PayloadAction<Wallet>) => {
      const index = state.wallets.findIndex(w => w.address.toLowerCase() === action.payload.address.toLowerCase());
      if (index !== -1) {
        state.wallets[index] = action.payload;
        if (state.selectedWallet?.address.toLowerCase() === action.payload.address.toLowerCase()) {
          state.selectedWallet = action.payload;
        }
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setSelectedWallet,
  setWallets,
  addWallet,
  updateWallet,
  setLoading,
  setError,
} = walletSlice.actions;

export const walletReducer = walletSlice.reducer;