import { session } from '@descope/nextjs-sdk/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const sessionInfo = await session();

    if (!sessionInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cityCode = searchParams.get('cityCode');
    const checkInDate = searchParams.get('checkInDate');
    const checkOutDate = searchParams.get('checkOutDate');
    const adults = searchParams.get('adults') || '1';

    if (!cityCode || !checkInDate || !checkOutDate) {
      return NextResponse.json({ 
        error: 'Missing required parameters: cityCode, checkInDate, checkOutDate' 
      }, { status: 400 });
    }

    // Mock hotel data
    const mockHotels = [
      {
        id: 'HOTEL_1',
        name: 'Grand Plaza Hotel',
        rating: 4.5,
        location: {
          latitude: 40.7589,
          longitude: -73.9851,
          address: '123 Main St, New York, NY'
        },
        amenities: ['WiFi', 'Pool', 'Gym', 'Restaurant', 'Room Service'],
        images: [
          'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
          'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800'
        ],
        offers: [
          {
            id: 'OFFER_1',
            roomType: 'Standard Room',
            price: {
              total: '189.00',
              currency: 'USD',
              perNight: '189.00'
            },
            description: 'Comfortable room with city view',
            policies: {
              cancellation: 'Free cancellation until 24 hours before check-in'
            }
          },
          {
            id: 'OFFER_2',
            roomType: 'Deluxe Suite',
            price: {
              total: '299.00',
              currency: 'USD',
              perNight: '299.00'
            },
            description: 'Spacious suite with premium amenities',
            policies: {
              cancellation: 'Free cancellation until 48 hours before check-in'
            }
          }
        ]
      },
      {
        id: 'HOTEL_2',
        name: 'Boutique Inn Downtown',
        rating: 4.2,
        location: {
          latitude: 40.7505,
          longitude: -73.9934,
          address: '456 Broadway, New York, NY'
        },
        amenities: ['WiFi', 'Business Center', 'Concierge', 'Pet Friendly'],
        images: [
          'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
          'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800'
        ],
        offers: [
          {
            id: 'OFFER_3',
            roomType: 'King Room',
            price: {
              total: '159.00',
              currency: 'USD',
              perNight: '159.00'
            },
            description: 'Modern room in the heart of downtown',
            policies: {
              cancellation: 'Free cancellation until 24 hours before check-in'
            }
          }
        ]
      }
    ];

    // Real Amadeus API call would look like this:
    // const response = await amadeus.shopping.hotelOffers.get({
    //   cityCode: cityCode,
    //   checkInDate: checkInDate,
    //   checkOutDate: checkOutDate,
    //   adults: adults
    // });

    return NextResponse.json({
      hotels: mockHotels,
      meta: {
        count: mockHotels.length,
        searchParams: {
          cityCode,
          checkInDate,
          checkOutDate,
          adults
        }
      }
    });
  } catch (error) {
    console.error('Error searching hotels:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionInfo = await session();

    if (!sessionInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { hotelId, offerId, guests } = await request.json();

    if (!hotelId || !offerId || !guests) {
      return NextResponse.json({ 
        error: 'Missing required parameters: hotelId, offerId, guests' 
      }, { status: 400 });
    }

    // Mock booking response
    const mockBooking = {
      id: 'HOTEL_BOOKING_' + Date.now(),
      status: 'CONFIRMED',
      hotelId,
      offerId,
      guests,
      totalPrice: '189.00',
      currency: 'USD',
      confirmationNumber: 'HTL789',
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      booking: mockBooking,
      message: 'Hotel booked successfully'
    });
  } catch (error) {
    console.error('Error booking hotel:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
