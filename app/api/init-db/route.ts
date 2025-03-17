import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db-init';

export async function POST() {
  try {
    await initializeDatabase();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}

// Force dynamic to ensure the route is not statically optimized
export const dynamic = 'force-dynamic';