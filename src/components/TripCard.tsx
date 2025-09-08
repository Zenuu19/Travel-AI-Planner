import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, MapPinIcon, PlaneIcon, HotelIcon, ActivityIcon, ClockIcon, TrashIcon } from 'lucide-react';
import { Trip } from '@/hooks/useTrips';

interface TripCardProps {
  trip: Trip;
  onDelete?: (tripId: string) => void;
}

export function TripCard({ trip, onDelete }: TripCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Upcoming</Badge>;
      case 'ongoing':
        return <Badge variant="default" className="bg-green-100 text-green-800">Ongoing</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDuration = () => {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{trip.title}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPinIcon className="h-4 w-4" />
              {trip.destination.name}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(trip.status)}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(trip._id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Date Range */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CalendarIcon className="h-4 w-4" />
          <span>{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span>
          <span className="text-gray-400">•</span>
          <ClockIcon className="h-4 w-4" />
          <span>{getDuration()}</span>
        </div>

        {/* Trip Stats */}
        <div className="flex gap-4 text-sm">
          {trip.flights && trip.flights.length > 0 && (
            <div className="flex items-center gap-1 text-gray-600">
              <PlaneIcon className="h-4 w-4" />
              <span>{trip.flights.length} flight{trip.flights.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          
          {trip.hotels && trip.hotels.length > 0 && (
            <div className="flex items-center gap-1 text-gray-600">
              <HotelIcon className="h-4 w-4" />
              <span>{trip.hotels.length} hotel{trip.hotels.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          
          {trip.activities && trip.activities.length > 0 && (
            <div className="flex items-center gap-1 text-gray-600">
              <ActivityIcon className="h-4 w-4" />
              <span>{trip.activities.length} activit{trip.activities.length !== 1 ? 'ies' : 'y'}</span>
            </div>
          )}
        </div>

        {/* Itinerary Preview */}
        {trip.itinerary && trip.itinerary.length > 0 && (
          <div className="bg-gray-50 rounded-md p-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Itinerary</h4>
            <div className="text-sm text-gray-600">
              {trip.itinerary.length} day{trip.itinerary.length !== 1 ? 's' : ''} planned
              {trip.status === 'upcoming' && (
                <span className="block text-xs text-gray-500 mt-1">
                  Saved to your Google Calendar
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
