import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { NextRequest } from 'next/server';
import { session } from '@descope/nextjs-sdk/server';
const Amadeus = require('amadeus');

// Initialize Amadeus SDK
const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID!,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET!,
  hostname: 'test' // Use 'production' for live API
});

export async function POST(req: NextRequest) {
  try {
    // Verify user session
    const sessionInfo = await session();
    if (!sessionInfo) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages } = await req.json();

    const result = await streamText({
      model: google('gemini-2.0-flash-exp'),
      messages,
      system: `You are TravelAI, an intelligent travel planning assistant. You help users plan their perfect trips by providing personalized recommendations.

You have access to these functions that you can call when needed:
- Search flights between cities with dates and passenger count
- Find hotels in specific cities with check-in/out dates  
- Get destination information including points of interest and activities
- Search for cities by name
- Find nearby airports
- Create calendar events for travel plans

When users ask about travel:
1. Gather necessary information (dates, destinations, preferences)
2. Offer to search for specific options like flights or hotels
3. Present information in a clear, organized manner
4. Suggest creating calendar events for confirmed plans
5. Provide recommendations for activities and points of interest

Be conversational, helpful, and enthusiastic about travel. Ask follow-up questions to better assist users.

To search for flights, you'll need:
- Origin city/airport code (like NYC, LON, PAR)
- Destination city/airport code
- Departure date (YYYY-MM-DD format)
- Number of passengers
- Optional: return date, cabin class preference

To search for hotels, you'll need:
- City code (like PAR for Paris)
- Check-in date (YYYY-MM-DD format)  
- Check-out date (YYYY-MM-DD format)
- Number of guests

When you have this information, let me know and I can search for options for you!`
    });

    return result.toTextStreamResponse();

  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
