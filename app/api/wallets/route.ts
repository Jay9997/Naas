import { NextResponse } from 'next/server';
import { getWallets, createWallet } from '@/lib/db';
import type { Wallet } from '@/types/wallet';

export async function GET() {
  try {
    const wallets = await getWallets();
    return NextResponse.json(wallets);
  } catch (error) {
    console.error('Failed to fetch wallets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallets' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const wallet = await request.json();
    
    // Validate wallet data
    if (!wallet.address || !wallet.label) {
      return NextResponse.json(
        { error: 'Address and label are required' },
        { status: 400 }
      );
    }

    const newWallet = await createWallet({
      address: wallet.address,
      label: wallet.label,
      has_licenses: wallet.hasLicenses || false
    });

    return NextResponse.json(newWallet);
  } catch (error) {
    console.error('Failed to create wallet:', error);
    return NextResponse.json(
      { error: 'Failed to create wallet' },
      { status: 500 }
    );
  }
}

// Force dynamic to ensure the route is not statically optimized
export const dynamic = 'force-dynamic';