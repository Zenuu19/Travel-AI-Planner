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

    const body = await request.json();
    console.log('Calendar request body:', body);
    
    const { userId, event } = body;
    
    if (!userId || !event) {
      console.error('Missing required fields:', { userId: !!userId, event: !!event });
      return NextResponse.json({ error: 'User ID and event data are required' }, { status: 400 });
    }

    if (!event.title || !event.startDateTime || !event.endDateTime) {
      console.error('Missing required event fields:', { 
        title: !!event.title, 
        startDateTime: !!event.startDateTime, 
        endDateTime: !!event.endDateTime 
      });
      return NextResponse.json({ error: 'Event title, start and end date/time are required' }, { status: 400 });
    }

    // Get Google Calendar token using Descope outbound app management
    console.log('Getting token for userId:', userId);
    const token = await getOutboundAppToken('google-calendar', userId);
    
    if (!token) {
      console.error('No calendar connection found for user:', userId);
      return NextResponse.json({ 
        error: 'No calendar connection found. Please reconnect your Google Calendar with proper permissions.',
        reconnectUrl: '/dashboard#calendar'
      }, { status: 401 });
    }

    console.log('Token retrieved successfully, length:', token.length);

    // Test the token by making a simple API call first
    console.log('Testing token with calendar list API...');
    const testResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!testResponse.ok) {
      const testError = await testResponse.text();
      console.error('Token validation failed:', testResponse.status, testError);
      return NextResponse.json({ 
        error: 'Calendar token is invalid or expired. Please reconnect your Google Calendar.',
        details: `Token test failed: ${testResponse.status}`,
        reconnectUrl: '/dashboard#calendar'
      }, { status: 401 });
    }

    console.log('Token validation successful');

    // First, ensure we have a travel calendar created by our app
    const travelCalendar = await getOrCreateTravelCalendar(token);
    if (!travelCalendar) {
      return NextResponse.json({ 
        error: 'Failed to create or access travel calendar. Please check your Google Calendar permissions.',
        reconnectUrl: '/dashboard#calendar'
      }, { status: 403 });
    }

    // Create calendar event using Google Calendar API in our travel calendar
    const calendarResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${travelCalendar.id}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.title || 'Travel Event',
        description: event.description || '',
        start: {
          dateTime: event.startDateTime,
          timeZone: event.timeZone || 'UTC',
        },
        end: {
          dateTime: event.endDateTime,
          timeZone: event.timeZone || 'UTC',
        },
        location: event.location || '',
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 }, // 30 minutes before
          ],
        },
      }),
    });

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error('Google Calendar API error:', calendarResponse.status, errorText);
      
      // Handle specific error cases
      if (calendarResponse.status === 401) {
        console.error('Authentication failed - token may be expired or invalid');
        return NextResponse.json({ 
          error: 'Calendar authentication failed. Please reconnect your Google Calendar.',
          details: 'Authentication token expired or invalid'
        }, { status: 401 });
      } else if (calendarResponse.status === 403) {
        console.error('Insufficient permissions for Google Calendar');
        return NextResponse.json({ 
          error: 'Insufficient permissions. Please reconnect with calendar permissions.',
          details: 'Calendar access permissions insufficient'
        }, { status: 403 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create calendar event',
        details: errorText 
      }, { status: calendarResponse.status });
    }

    const calendarEvent = await calendarResponse.json();
    
    return NextResponse.json({ 
      success: true,
      event: calendarEvent,
      eventId: calendarEvent.id,
      eventLink: calendarEvent.htmlLink
    });

  } catch (error) {
    console.error('Error creating calendar event:', error);
    
    // Check if it's a token-related error
    if (error instanceof Error && error.message.includes('Failed to fetch token')) {
      return NextResponse.json({ 
        error: 'Calendar connection error. Please reconnect your Google Calendar.',
        details: error.message
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to create calendar event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getOrCreateTravelCalendar(token: string) {
  try {
    console.log('Attempting to access calendar list...');
    // First, check if our travel calendar already exists
    const calendarsResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Handle authentication errors for calendar list
    if (!calendarsResponse.ok) {
      const errorText = await calendarsResponse.text();
      console.error('Failed to access calendar list:', calendarsResponse.status, errorText);
      
      if (calendarsResponse.status === 401 || calendarsResponse.status === 403) {
        console.error('Authentication/permission error - using calendar.app.created scope, which is appropriate for our use case');
      }
      return null;
    }

    console.log('Successfully accessed calendar list');
    const calendarsData = await calendarsResponse.json();
    // With calendar.app.created scope, look for calendars created by our app
    const travelCalendar = calendarsData.items?.find((cal: any) => 
      cal.summary === 'Travel Plans' && 
      (cal.accessRole === 'owner' || cal.accessRole === 'writer')
    );

    if (travelCalendar) {
      console.log('Found existing travel calendar:', travelCalendar.id);
      return travelCalendar;
    }

    // Create a new travel calendar
    console.log('Creating new travel calendar...');
    const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: 'Travel Plans',
        description: 'Calendar for travel events created by Travel AI Agent. This calendar is managed by the Travel AI app and contains your planned trips and itineraries.',
        timeZone: 'UTC',
        // Mark this calendar as created by our app
        backgroundColor: '#4285f4', // Google blue to identify our app
      }),
    });

    // Handle authentication errors for calendar creation
    if (!createResponse.ok) {
      const createError = await createResponse.text();
      console.error('Failed to create calendar:', createResponse.status, createError);
      
      if (createResponse.status === 401 || createResponse.status === 403) {
        console.error('Insufficient permissions to create calendar - this should work with calendar.app.created scope');
      }
      return null;
    }

    const newCalendar = await createResponse.json();
    console.log('Created new travel calendar:', newCalendar.id);
    return newCalendar;
  } catch (error) {
    console.error('Error in getOrCreateTravelCalendar:', error);
    return null;
  }
}

async function getOutboundAppToken(appId: string, userId: string): Promise<string | null> {
  try {
    console.log('Fetching latest outbound app token for:', { appId, userId });

    const projectId = process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID;
    const managementKey = process.env.DESCOPE_MANAGEMENT_KEY;
    
    if (!projectId || !managementKey) {
      console.error('Missing Descope configuration');
      return null;
    }

    // First, try to get the latest token
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
    
    // If getting latest token fails, try to force refresh
    if (!response.ok) {
      console.log('Latest token fetch failed, attempting force refresh...');
      
      response = await fetch('https://api.descope.com/v1/mgmt/outbound/app/user/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${projectId}:${managementKey}`
        },
        body: JSON.stringify({
          appId,
          userId,
          scopes: [
            'https://www.googleapis.com/auth/calendar.app.created',
            'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
          ],
          options: {
            withRefreshToken: false,
            forceRefresh: true // Force refresh to get a fresh token
          }
        })
      });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token fetch failed:', response.status, errorText);
      
      // Check if it's an authentication/authorization error
      if (response.status === 401 || response.status === 403) {
        console.error('Authentication error - user may need to reconnect to Google Calendar');
      } else if (response.status === 404) {
        console.error('User not connected to Google Calendar outbound app');
      }
      
      return null;
    }
    
    const data = await response.json();
    console.log('Token fetch successful:', !!data.token);
    console.log('Token type:', typeof data.token, 'Token data:', data);
    
    // Validate token exists and is not empty
    if (!data.token) {
      console.error('No token received from Descope');
      return null;
    }
    
    // Handle different token formats - sometimes it's a string, sometimes an object
    let tokenValue = data.token;
    if (!data.token) {
      console.error('No token received from Descope');
      return null;
    }
    
    if (typeof data.token === 'object') {
      // Handle different object formats
      if (data.token.accessToken) {
        // Descope outbound app format
        tokenValue = data.token.accessToken;
        console.log('Using accessToken from Descope outbound app format');
      } else if (data.token.access_token) {
        // Standard OAuth format
        tokenValue = data.token.access_token;
        console.log('Using access_token from standard OAuth format');
      } else {
        console.error('Token object does not contain accessToken or access_token:', data.token);
        return null;
      }
    } else if (typeof data.token === 'string') {
      // If token is already a string, use it directly
      tokenValue = data.token;
      console.log('Using token as string');
    } else {
      console.error('Received token in unexpected format:', typeof data.token, data.token);
      return null;
    }
    
    // Validate the final token value
    if (!tokenValue || (typeof tokenValue === 'string' && tokenValue.trim() === '')) {
      console.error('Received empty or invalid token from Descope');
      return null;
    }
    
    console.log('Successfully extracted token, length:', tokenValue.length);
    return tokenValue;
    
  } catch (error) {
    console.error('Error in getOutboundAppToken:', error);
    return null;
  }
}
