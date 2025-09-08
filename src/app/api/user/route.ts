import { session } from '@descope/nextjs-sdk/server';
import { createSdk } from '@descope/nextjs-sdk/server';
import { NextRequest, NextResponse } from 'next/server';

// Create SDK instance with management key for backend operations
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

    // Return user information from the session
    return NextResponse.json({
      user: {
        id: sessionInfo.token.sub,
        email: sessionInfo.token.email,
        name: sessionInfo.token.name,
        permissions: sessionInfo.token.permissions || [],
        roles: sessionInfo.token.roles || []
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sessionInfo = await session();

    if (!sessionInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, preferences } = await request.json();

    // Update user profile using Descope Management API
    const userId = sessionInfo.token.sub;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const { ok, data, error } = await sdk.management.user.update(
      userId,
      undefined, // email
      undefined, // phone
      name, // displayName
      undefined, // roles
      undefined, // userTenants
      { // customAttributes
        travelPreferences: preferences
      }
    );

    if (!ok) {
      return NextResponse.json({ error: error?.errorMessage || 'Failed to update user' }, { status: 400 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
