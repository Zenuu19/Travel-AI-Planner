import { session } from '@descope/nextjs-sdk/server';
import Descope from '@descope/node-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const sessionInfo = await session();

    if (!sessionInfo) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(new URL('/dashboard?calendar_error=true', request.url));
    }

    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(new URL('/dashboard?calendar_error=true', request.url));
    }

    // Create Descope Node.js SDK instance
    const descopeManagement = Descope({
      projectId: process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!,
      managementKey: process.env.DESCOPE_MANAGEMENT_KEY!
    });

    try {
      console.log('Exchanging OAuth code with Descope');
      
      // Exchange OAuth code using Descope
      // Based on documentation: sdk.oauth.exchange(code)
      const authResponse = await descopeManagement.oauth.exchange(code);
      
      console.log('Successfully exchanged OAuth code for tokens');
      
      // The authResponse should contain the user's session information
      // and the OAuth tokens are automatically managed by Descope
      
      return NextResponse.redirect(new URL('/dashboard?calendar_connected=true', request.url));
      
    } catch (exchangeError) {
      console.error('Error exchanging OAuth code:', exchangeError);
      return NextResponse.redirect(new URL('/dashboard?calendar_error=true', request.url));
    }

  } catch (error) {
    console.error('Error in calendar callback:', error);
    return NextResponse.redirect(new URL('/dashboard?calendar_error=true', request.url));
  }
}
