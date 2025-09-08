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

    console.log('Checking Google Calendar connection status for user:', userId);
    
    // Try to get the latest token to check if user is connected
    const token = await getLatestOutboundToken('google-calendar', userId);
    
    if (token) {
      console.log('User has valid Google Calendar connection');
      return NextResponse.json({ 
        isConnected: true,
        hasToken: true,
        message: 'Google Calendar is connected'
      });
    } else {
      console.log('User does not have Google Calendar connection');
      return NextResponse.json({ 
        isConnected: false,
        hasToken: false,
        message: 'Google Calendar not connected'
      });
    }

  } catch (error) {
    console.error('Error checking calendar status:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Function to get latest outbound app token using Descope management API
async function getLatestOutboundToken(appId: string, userId: string): Promise<string | null> {
  try {
    const projectId = process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID;
    const managementKey = process.env.DESCOPE_MANAGEMENT_KEY;
    
    if (!projectId || !managementKey) {
      console.error('Missing Descope configuration');
      return null;
    }

    // Try to get the latest token first
    const response = await fetch('https://api.descope.com/v1/mgmt/outbound/app/user/token/latest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${projectId}:${managementKey}`
      },
      body: JSON.stringify({
        appId,
        userId,
        options: {
          withRefreshToken: false,
          forceRefresh: false
        }
      })
    });
    
    if (!response.ok) {
      // If latest token API fails, this likely means user is not connected
      return null;
    }
    
    const data = await response.json();
    return data.token || null;
    
  } catch (error) {
    console.error('Error checking outbound token:', error);
    return null;
  }
}
