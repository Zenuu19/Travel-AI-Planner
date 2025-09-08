import { useState, useEffect } from 'react';

export interface Trip {
  _id: string;
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
  createdAt: string;
  updatedAt: string;
}

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/trips');
      
      if (!response.ok) {
        throw new Error('Failed to fetch trips');
      }
      
      const data = await response.json();
      setTrips(data.trips || []);
    } catch (err) {
      console.error('Error fetching trips:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trips');
    } finally {
      setIsLoading(false);
    }
  };

  const createTrip = async (tripData: Omit<Trip, '_id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tripData),
      });

      if (!response.ok) {
        throw new Error('Failed to create trip');
      }

      const result = await response.json();
      
      // Refresh trips list
      await fetchTrips();
      
      return result;
    } catch (err) {
      console.error('Error creating trip:', err);
      throw err;
    }
  };

  const updateTrip = async (tripId: string, updateData: Partial<Trip>) => {
    try {
      const response = await fetch('/api/trips', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tripId, ...updateData }),
      });

      if (!response.ok) {
        throw new Error('Failed to update trip');
      }

      // Refresh trips list
      await fetchTrips();
    } catch (err) {
      console.error('Error updating trip:', err);
      throw err;
    }
  };

  const deleteTrip = async (tripId: string) => {
    try {
      const response = await fetch(`/api/trips?tripId=${tripId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete trip');
      }

      // Refresh trips list
      await fetchTrips();
    } catch (err) {
      console.error('Error deleting trip:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  return {
    trips,
    isLoading,
    error,
    fetchTrips,
    createTrip,
    updateTrip,
    deleteTrip,
  };
}
