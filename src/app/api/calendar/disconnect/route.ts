import { NextRequest, NextResponse } from 'next/server';
import { session } from '@descope/nextjs-sdk/server';
import Descope from '@descope/node-sdk';

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

    // Create Descope Node.js SDK instance
    const descopeManagement = Descope({
      projectId: process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!,
      managementKey: process.env.DESCOPE_MANAGEMENT_KEY!
    });

    try {
      console.log('Disconnecting Google Calendar for user:', userId);
      
      // Use direct management API call since outbound app disconnect might not be in Node SDK
      const projectId = process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID;
      const managementKey = process.env.DESCOPE_MANAGEMENT_KEY;
      
      const response = await fetch('https://api.descope.com/v1/mgmt/outbound/app/user/token/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${projectId}:${managementKey}`
        },
        body: JSON.stringify({
          appId: 'google-calendar',
          userId: userId
        })
      });

      if (response.ok) {
        console.log('Successfully disconnected Google Calendar for user:', userId);
        return NextResponse.json({ 
          success: true,
          message: 'Successfully disconnected from Google Calendar'
        });
      } else if (response.status === 404) {
        // User was not connected anyway
        return NextResponse.json({ 
          success: true,
          message: 'User was not connected to Google Calendar'
        });
      } else {
        const errorText = await response.text();
        console.error('Failed to disconnect Google Calendar:', response.status, errorText);
        return NextResponse.json({ 
          error: 'Failed to disconnect from Google Calendar',
          details: errorText
        }, { status: response.status });
      }
    } catch (apiError) {
      console.error('Error calling Descope disconnect API:', apiError);
      return NextResponse.json({ 
        error: 'Failed to disconnect from Google Calendar',
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in disconnect endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
