import { NextRequest, NextResponse } from 'next/server';
import { session } from '@descope/nextjs-sdk/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

export interface Trip {
  _id?: string;
  userId: string;
  title: string;
  destination: {
    name: string;
    city?: string;
    coordinates?: { latitude: number; longitude: number };
  };
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  calendarEventId?: string;
  flights?: any[];
  hotels?: any[];
  activities?: any[];
  itinerary?: any[];
  createdAt: Date;
  updatedAt: Date;
}

// GET - Fetch user's trips
export async function GET() {
  try {
    const sessionInfo = await session();
    if (!sessionInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = sessionInfo.token.sub;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }
    
    const client = await clientPromise;
    const db = client.db('travel-ai-agent');
    
    const trips = await db
      .collection('trips')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ trips });
  } catch (error) {
    console.error('Error fetching trips:', error);
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
  }
}

// POST - Create a new trip
export async function POST(request: NextRequest) {
  try {
    const sessionInfo = await session();
    if (!sessionInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = sessionInfo.token.sub;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }
    
    const body = await request.json();
    
    const { title, destination, startDate, endDate, calendarEventId, flights, hotels, activities, itinerary } = body;

    if (!title || !destination || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Determine trip status based on dates
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let status: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
    if (now >= start && now <= end) {
      status = 'ongoing';
    } else if (now > end) {
      status = 'completed';
    }

    const trip: Omit<Trip, '_id'> = {
      userId,
      title,
      destination,
      startDate,
      endDate,
      status,
      calendarEventId,
      flights: flights || [],
      hotels: hotels || [],
      activities: activities || [],
      itinerary: itinerary || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const client = await clientPromise;
    const db = client.db('travel-ai-agent');
    
    const result = await db.collection('trips').insertOne(trip);
    
    return NextResponse.json({ 
      success: true, 
      tripId: result.insertedId,
      trip: { ...trip, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating trip:', error);
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 });
  }
}

// PUT - Update a trip
export async function PUT(request: NextRequest) {
  try {
    const sessionInfo = await session();
    if (!sessionInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = sessionInfo.token.sub;
    const body = await request.json();
    
    const { tripId, ...updateData } = body;

    if (!tripId) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('travel-ai-agent');
    
    const result = await db.collection('trips').updateOne(
      { _id: tripId, userId }, // Ensure user owns the trip
      { 
        $set: { 
          ...updateData, 
          updatedAt: new Date() 
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating trip:', error);
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 });
  }
}

// DELETE - Delete a trip
export async function DELETE(request: NextRequest) {
  try {
    const sessionInfo = await session();
    if (!sessionInfo) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = sessionInfo.token.sub;
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');

    if (!tripId) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('travel-ai-agent');
    
    const result = await db.collection('trips').deleteOne({ 
      _id: new ObjectId(tripId), 
      userId 
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trip:', error);
    return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 });
  }
}
