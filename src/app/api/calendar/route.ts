import { session } from '@descope/nextjs-sdk/server';
import { createSdk } from '@descope/nextjs-sdk/server';
import { NextRequest, NextResponse } from 'next/server';

// Create SDK instance with management key
const sdk = createSdk({
  projectId: process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!,
  managementKey: process.env.DESCOPE_MANAGEMENT_KEY!
});

export async function GET() {
  try {
    const sessionInfo = await session();

    if (!sessionInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has Google Calendar connected through Descope
    // This would typically involve checking the user's connected accounts
    // For now, we'll return a placeholder response
    
    return NextResponse.json({
      connected: false,
      connectionUrl: '/api/calendar/connect'
    });
  } catch (error) {
    console.error('Error checking calendar status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionInfo = await session();

    if (!sessionInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'connect') {
      // Initiate Google Calendar OAuth flow through Descope
      // This would typically redirect to Descope's OAuth endpoint
      
      return NextResponse.json({
        success: true,
        authUrl: `https://auth.descope.io/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID}&response_type=code&scope=calendar&redirect_uri=${encodeURIComponent(process.env.NEXTAUTH_URL + '/api/calendar/callback')}`
      });
    }

    if (action === 'disconnect') {
      // Disconnect Google Calendar
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error handling calendar action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
