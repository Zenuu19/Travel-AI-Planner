import { NextRequest, NextResponse } from 'next/server';
import { session } from '@descope/nextjs-sdk/server';

export async function POST(request: NextRequest) {
  try {
    // Verify user session
    const sessionInfo = await session();
    if (!sessionInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log('Generating Descope outbound app connection URL for user:', userId);

    // For Descope outbound apps, we need to generate the connection URL
    // This will be handled on the frontend using the SDK's outbound.connect method
    // The backend just needs to confirm the user is authenticated
    
    return NextResponse.json({ 
      success: true,
      message: 'User authenticated, proceed with outbound app connection on frontend',
      userId: userId,
      appId: 'google-calendar',
      redirectUrl: 'http://localhost:3000/dashboard',
      scopes: ['https://www.googleapis.com/auth/calendar.app.created']
    });

  } catch (error) {
    console.error('Error in auth-url endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
