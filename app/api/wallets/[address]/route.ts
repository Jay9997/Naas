import { NextResponse } from 'next/server';
import { getWalletByAddress, updateWallet } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const updates = await request.json();
    const { address } = params;

    // Validate updates
    if (!updates || (updates.label === undefined && updates.hasLicenses === undefined)) {
      return NextResponse.json(
        { error: 'No valid update parameters provided' },
        { status: 400 }
      );
    }

    // Check if wallet exists
    const existingWallet = await getWalletByAddress(address);
    if (!existingWallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // Update wallet
    const updatedWallet = await updateWallet(address, {
      label: updates.label,
      hasLicenses: updates.hasLicenses
    });

    return NextResponse.json(updatedWallet);
  } catch (error) {
    console.error('Failed to update wallet:', error);
    return NextResponse.json(
      { error: 'Failed to update wallet' },
      { status: 500 }
    );
  }
}

// Force dynamic to ensure the route is not statically optimized
export const dynamic = 'force-dynamic';