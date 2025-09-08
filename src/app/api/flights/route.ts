import { session } from '@descope/nextjs-sdk/server';
import { NextRequest, NextResponse } from 'next/server';
// import Amadeus from 'amadeus';

// Note: Uncomment and configure Amadeus when you have API credentials
// const amadeus = new Amadeus({
//   clientId: process.env.AMADEUS_CLIENT_ID!,
//   clientSecret: process.env.AMADEUS_CLIENT_SECRET!,
//   hostname: 'production' // or 'test' for testing
// });

export async function GET(request: NextRequest) {
  try {
    const sessionInfo = await session();

    if (!sessionInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const departureDate = searchParams.get('departureDate');
    const returnDate = searchParams.get('returnDate');
    const adults = searchParams.get('adults') || '1';

    if (!origin || !destination || !departureDate) {
      return NextResponse.json({ 
        error: 'Missing required parameters: origin, destination, departureDate' 
      }, { status: 400 });
    }

    // For now, return mock data until Amadeus is configured
    const mockFlights = [
      {
        id: '1',
        price: { total: '450.00', currency: 'USD' },
        itineraries: [
          {
            duration: 'PT5H30M',
            segments: [
              {
                departure: {
                  iataCode: origin,
                  at: departureDate + 'T08:00:00'
                },
                arrival: {
                  iataCode: destination,
                  at: departureDate + 'T13:30:00'
                },
                carrierCode: 'AA',
                number: '123',
                aircraft: { code: '320' }
              }
            ]
          }
        ]
      },
      {
        id: '2',
        price: { total: '520.00', currency: 'USD' },
        itineraries: [
          {
            duration: 'PT6H15M',
            segments: [
              {
                departure: {
                  iataCode: origin,
                  at: departureDate + 'T14:00:00'
                },
                arrival: {
                  iataCode: destination,
                  at: departureDate + 'T20:15:00'
                },
                carrierCode: 'DL',
                number: '456',
                aircraft: { code: '737' }
              }
            ]
          }
        ]
      }
    ];

    // Real Amadeus API call would look like this:
    // const response = await amadeus.shopping.flightOffersSearch.get({
    //   originLocationCode: origin,
    //   destinationLocationCode: destination,
    //   departureDate: departureDate,
    //   returnDate: returnDate,
    //   adults: adults
    // });

    return NextResponse.json({
      flights: mockFlights,
      meta: {
        count: mockFlights.length,
        searchParams: {
          origin,
          destination,
          departureDate,
          returnDate,
          adults
        }
      }
    });
  } catch (error) {
    console.error('Error searching flights:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionInfo = await session();

    if (!sessionInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { flightId, passengers } = await request.json();

    if (!flightId || !passengers) {
      return NextResponse.json({ 
        error: 'Missing required parameters: flightId, passengers' 
      }, { status: 400 });
    }

    // Mock booking response
    const mockBooking = {
      id: 'BOOKING_' + Date.now(),
      status: 'CONFIRMED',
      flightId,
      passengers,
      totalPrice: '450.00',
      currency: 'USD',
      bookingReference: 'ABC123',
      createdAt: new Date().toISOString()
    };

    // Real Amadeus booking would involve:
    // 1. Flight price confirmation
    // 2. Flight booking creation
    // 3. Payment processing

    return NextResponse.json({
      booking: mockBooking,
      message: 'Flight booked successfully'
    });
  } catch (error) {
    console.error('Error booking flight:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
