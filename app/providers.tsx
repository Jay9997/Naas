'use client';

import * as React from 'react';
import {
  RainbowKitProvider,
  connectorsForWallets,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { mawariTestnet } from '@/config/chains';
import { Toaster } from '@/components/ui/toaster';
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  trustWallet,
  rainbowWallet,
  braveWallet,
  ledgerWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/store';
import '@rainbow-me/rainbowkit/styles.css';

const { chains, publicClient } = configureChains(
  [mawariTestnet],
  [publicProvider()]
);

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

const connectors = connectorsForWallets([
  {
    groupName: 'Popular',
    wallets: [
      metaMaskWallet({ 
        projectId, 
        chains,
        shimDisconnect: true,
        UNSTABLE_shimOnConnectSelectAccount: true
      }),
      coinbaseWallet({ 
        appName: 'Mawari Operator', 
        chains 
      }),
      walletConnectWallet({ projectId, chains }),
    ],
  },
  {
    groupName: 'More',
    wallets: [
      rainbowWallet({ projectId, chains }),
      trustWallet({ projectId, chains }),
      braveWallet({ chains }),
      ledgerWallet({ projectId, chains }),
    ],
  },
]);

const wagmiConfig = createConfig({
  autoConnect: false,
  connectors,
  publicClient,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <WagmiConfig config={wagmiConfig}>
          <RainbowKitProvider 
            chains={chains}
            initialChain={mawariTestnet}
            theme={darkTheme({
              accentColor: '#EC4899',
              borderRadius: 'medium',
            })}
            modalSize="wide"
            showRecentTransactions={true}
            coolMode
          >
            {mounted && children}
            <Toaster            />
          </RainbowKitProvider>
        </WagmiConfig>
      </PersistGate>
    </ReduxProvider>
  );
}