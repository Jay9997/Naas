export interface Wallet {
  address: string;
  label: string;
  hasLicenses: boolean;
  verified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WalletCreate {
  address: string;
  label: string;
  hasLicenses?: boolean;
  verified?: boolean;
}