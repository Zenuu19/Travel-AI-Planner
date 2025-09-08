import { NextRequest, NextResponse } from 'next/server';
import { session } from '@descope/nextjs-sdk/server';

export async function POST(request: NextRequest) {
  try {
    // Verify user session
    const sessionInfo = await session();
    if (!sessionInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, appId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const finalAppId = appId || 'google-calendar';

    // Get latest Google Calendar token from Descope
    const token = await getLatestOutboundToken(finalAppId, userId);
    
    if (!token) {
      return NextResponse.json({ 
        success: false,
        hasToken: false,
        error: 'No calendar connection found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      hasToken: true,
      token: token 
    });

  } catch (error) {
    console.error('Error in token endpoint:', error);
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

    console.log('Fetching latest token for:', { appId, userId });

    // Try to get the latest token first
    let response = await fetch('https://api.descope.com/v1/mgmt/outbound/app/user/token/latest', {
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
    
    // If latest token fails, try to get a fresh token
    if (!response.ok) {
      console.log('Latest token fetch failed, trying fresh token...');
      
      response = await fetch('https://api.descope.com/v1/mgmt/outbound/app/user/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${projectId}:${managementKey}`
        },
        body: JSON.stringify({
          appId,
          userId,
          scopes: ['https://www.googleapis.com/auth/calendar.app.created'],
          options: {
            withRefreshToken: false,
            forceRefresh: true
          }
        })
      });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token fetch failed:', response.status, errorText);
      return null;
    }
    
    const data = await response.json();
    console.log('Token fetch successful:', !!data.token);
    return data.token;
    
  } catch (error) {
    console.error('Error in getLatestOutboundToken:', error);
    return null;
  }
}
