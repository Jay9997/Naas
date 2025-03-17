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
import { Toaster } from 'sonner';
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

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'demo';

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mawariTestnet],
  [publicProvider()]
);

const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: [
      metaMaskWallet({ 
        projectId, 
        chains,
        shimDisconnect: true,
        UNSTABLE_shimOnConnectSelectAccount: true
      }),
    ],
  },
  {
    groupName: 'Other',
    wallets: [
      coinbaseWallet({ appName: 'Mawari License Delegation', chains }),
      walletConnectWallet({ projectId, chains }),
      trustWallet({ projectId, chains }),
      braveWallet({ chains }),
      ledgerWallet({ projectId, chains }),
      rainbowWallet({ projectId, chains }),
    ],
  },
]);

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
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
            modalSize="compact"
            appInfo={{
              appName: 'Mawari License Delegation',
              learnMoreUrl: 'https://docs.mawari.io',
            }}
          >
            {mounted && children}
            <Toaster 
              position="top-right"
              toastOptions={{
                style: {
                  background: '#1A1525',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                },
              }}
            />
          </RainbowKitProvider>
        </WagmiConfig>
      </PersistGate>
    </ReduxProvider>
  );
}