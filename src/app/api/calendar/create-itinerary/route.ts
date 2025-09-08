import { NextRequest, NextResponse } from 'next/server';
import { session } from '@descope/nextjs-sdk/server';
import clientPromise from '@/lib/mongodb';

function getDisplayDestinationName(destination: any): string {
  if (!destination) return 'Unknown Destination';
  
  const name = destination.name || '';
  const city = destination.city || '';
  
  // If we have a clean city name and it's different from the long name, prefer it
  if (city && city !== name && city.length < 30 && !city.includes(',')) {
    return city;
  }
  
  // If the name is very long or contains Arabic/foreign characters mixed with English
  if (name.length > 50 || /[\u0600-\u06FF]/.test(name)) {
    // Try to extract airport name
    if (name.toLowerCase().includes('airport') || name.toLowerCase().includes('international')) {
      const airportMatch = name.match(/([^,]+?(?:airport|international))/i);
      if (airportMatch) {
        return airportMatch[1].trim();
      }
    }
    
    // Try to get a cleaner part before the comma
    const parts = name.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.length > 2 && /[a-zA-Z]/.test(trimmed) && trimmed.length < 30) {
        return trimmed;
      }
    }
    
    // Fall back to city if available
    if (city) return city;
  }
  
  return name || 'Unknown Destination';
}

interface ItineraryDay {
  day: number;
  date: string; // YYYY-MM-DD format
  activities: string[];
  suggestions: string;
}

interface TripPlan {
  destination: {
    name: string;
    city: string;
  };
  itinerary: ItineraryDay[];
  departureDate: string;
  returnDate?: string;
}

// Reuse the same helper functions from create-event
async function getOrCreateTravelCalendar(token: string): Promise<any> {
  try {
    console.log('Getting or creating travel calendar...');
    
    // First, try to get the calendar list with detailed error handling
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

export async function POST(request: NextRequest) {
  try {
    const sessionInfo = await session();
    if (!sessionInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripPlan } = await request.json();

    if (!tripPlan?.itinerary || !Array.isArray(tripPlan.itinerary)) {
      return NextResponse.json({ 
        error: 'Invalid trip plan - itinerary is required' 
      }, { status: 400 });
    }

    // Get user ID from session
    const userId = sessionInfo.token.sub;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
    }

    // Get Google Calendar token from Descope outbound app
    const token = await getOutboundAppToken('google-calendar', userId);
    if (!token) {
      return NextResponse.json({ 
        error: 'Google Calendar not connected. Please connect your Google Calendar first.',
        details: 'No valid token found',
        reconnectUrl: '/dashboard#calendar'
      }, { status: 401 });
    }

    // Validate token by making a test request
    const testResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!testResponse.ok) {
      return NextResponse.json({ 
        error: 'Google Calendar authentication failed. Please reconnect your Google Calendar.',
        details: `Token test failed: ${testResponse.status}`,
        reconnectUrl: '/dashboard#calendar'
      }, { status: 401 });
    }

    console.log('Token validation successful for itinerary creation');

    // Get or create travel calendar
    const travelCalendar = await getOrCreateTravelCalendar(token);
    if (!travelCalendar) {
      return NextResponse.json({ 
        error: 'Failed to create or access travel calendar. Please check your Google Calendar permissions.',
        reconnectUrl: '/dashboard#calendar'
      }, { status: 403 });
    }

    const createdEvents = [];
    const failedEvents = [];

    // Create calendar events for each day of the itinerary
    for (const itineraryDay of tripPlan.itinerary) {
      try {
        // Create event title and description
        const eventTitle = `Day ${itineraryDay.day}: ${tripPlan.destination.name}`;
        const activitiesList = itineraryDay.activities.length > 0 
          ? itineraryDay.activities.map((activity: string) => `• ${activity}`).join('\n')
          : 'No specific activities planned';
        
        const eventDescription = `🗓️ Day ${itineraryDay.day} of your trip to ${tripPlan.destination.name}

📅 Date: ${itineraryDay.date}

🎯 Planned Activities:
${activitiesList}

💡 Suggestions:
${itineraryDay.suggestions}

Generated by Travel AI Agent`;

        // Create all-day event for the itinerary day
        const eventData = {
          summary: eventTitle,
          description: eventDescription,
          start: {
            date: itineraryDay.date, // All-day event
            timeZone: 'UTC'
          },
          end: {
            date: itineraryDay.date, // All-day event
            timeZone: 'UTC'
          },
          location: tripPlan.destination.name,
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 }, // 1 day before
              { method: 'popup', minutes: 8 * 60 }, // 8 hours before (morning reminder)
            ],
          },
          colorId: '9', // Blue color for travel events
          transparency: 'transparent', // Show as free time since it's planning
        };

        console.log(`Creating calendar event for day ${itineraryDay.day}:`, eventTitle);

        const calendarResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${travelCalendar.id}/events`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        });

        if (calendarResponse.ok) {
          const createdEvent = await calendarResponse.json();
          createdEvents.push({
            day: itineraryDay.day,
            date: itineraryDay.date,
            eventId: createdEvent.id,
            title: eventTitle,
            activities: itineraryDay.activities.length
          });
          console.log(`Successfully created event for day ${itineraryDay.day}`);
        } else {
          const errorText = await calendarResponse.text();
          console.error(`Failed to create event for day ${itineraryDay.day}:`, calendarResponse.status, errorText);
          failedEvents.push({
            day: itineraryDay.day,
            date: itineraryDay.date,
            error: `HTTP ${calendarResponse.status}: ${errorText}`
          });
        }

      } catch (error) {
        console.error(`Error creating event for day ${itineraryDay.day}:`, error);
        failedEvents.push({
          day: itineraryDay.day,
          date: itineraryDay.date,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Save trip to database after successful calendar creation
    try {
      const client = await clientPromise;
      const db = client.db('travel-ai-agent');
      
      // Determine trip status based on dates
      const now = new Date();
      const start = new Date(tripPlan.departureDate);
      const end = new Date(tripPlan.returnDate || tripPlan.departureDate);
      
      let status: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
      if (now >= start && now <= end) {
        status = 'ongoing';
      } else if (now > end) {
        status = 'completed';
      }

      const cleanDestinationName = getDisplayDestinationName(tripPlan.destination);
      
      const trip = {
        userId,
        title: `Trip to ${cleanDestinationName}`,
        destination: {
          name: cleanDestinationName,
          city: tripPlan.destination.city || cleanDestinationName,
          coordinates: tripPlan.destination.coordinates
        },
        startDate: tripPlan.departureDate,
        endDate: tripPlan.returnDate || tripPlan.departureDate,
        status,
        calendarEventId: `itinerary-${Date.now()}`, // Unique identifier for this itinerary
        flights: [],
        hotels: [],
        activities: [],
        itinerary: tripPlan.itinerary || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection('trips').insertOne(trip);
      console.log('Trip saved to database successfully');
    } catch (dbError) {
      console.error('Error saving trip to database:', dbError);
      // Don't fail the request if database save fails
    }

    // Return summary of created events
    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdEvents.length} itinerary events in your Google Calendar`,
      calendar: {
        id: travelCalendar.id,
        name: travelCalendar.summary
      },
      events: {
        created: createdEvents,
        failed: failedEvents,
        total: tripPlan.itinerary.length
      }
    });

  } catch (error) {
    console.error('Error creating itinerary in calendar:', error);
    return NextResponse.json({ 
      error: 'Failed to create itinerary in calendar. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
