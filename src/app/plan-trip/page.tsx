'use client';

import { useState } from 'react';
import { useSession, useUser } from '@descope/nextjs-sdk/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, MapPinIcon, PlaneIcon, HotelIcon, ActivityIcon, LoaderIcon, 
         InfoIcon, StarIcon, ClockIcon, DollarSignIcon, 
         NavigationIcon, BarChart3Icon, Globe2Icon } from 'lucide-react';
import { CurrencySelector } from '@/components/CurrencySelector';
import { PriceDisplay, PriceRangeDisplay } from '@/components/PriceDisplay';

// Helper function to safely render text that might be an object
const safeRenderText = (text: any, fallback: string = 'Information available'): string => {
  if (typeof text === 'string') return text;
  if (typeof text === 'object' && text && 'text' in text) return text.text;
  if (typeof text === 'object' && text && 'description' in text) return text.description;
  return fallback;
};

// Helper function to clean and display destination names
const getDisplayDestinationName = (destination: any): string => {
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
};

interface TripPlan {
  destination: {
    name: string;
    city?: string;
    coordinates: { latitude: number; longitude: number };
  };
  coordinates?: { latitude: number; longitude: number }; // Add separate coordinates field for debugging
  flights: Array<{
    id: string;
    price: any;
    duration: string;
    departure: any;
    arrival: any;
    carrier: string;
    stops: number;
    segments: any[];
    validatingAirlineCodes: string[];
    travelerPricings: any[];
  }>;
  flightInsights: {
    airlines?: any[];
    priceAnalysis?: any;
  };
  hotels: Array<{
    hotelId: string;
    name: string;
    rating: number;
    price: any;
    address: any;
    contact: any;
    amenities: string[];
    description: string;
    policies: any;
    category: string;
  }>;
  hotelInsights: {
    sentiments?: any[];
    nearbyHotels?: any[];
    alternativeHotels?: any[];
  };
  activities: Array<{
    id: string;
    name: string;
    description: string;
    price: any;
    rating: number;
    duration: string;
    category: string;
    pictures: any[];
    bookingLink: string;
    location: any;
  }>;
  travelInsights: {
    tripPurpose?: any;
    nearbyAirports?: any[];
    availableRoutes?: any[];
  };
  itinerary: Array<{
    day: number;
    date: string;
    activities: string[];
    suggestions: string;
  }>;
  calendarEventId?: string;
}

export default function PlanTripPage() {
  const { isAuthenticated, isSessionLoading } = useSession();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    destination: '',
    origin: '',
    departureDate: '',
    returnDate: '',
    travelers: 1,
    budget: '',
    travelStyle: '',
    interests: '',
    accommodationType: ''
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper function to show success messages
  const showSuccessMessage = (message: string, duration: number = 5000) => {
    setSuccessMessage(message);
    setError(null); // Clear any existing errors
    setTimeout(() => setSuccessMessage(null), duration);
  };

  // Helper function to show error messages
  const showErrorMessage = (message: string) => {
    setError(message);
    setSuccessMessage(null); // Clear any existing success messages
  };

  const planTrip = async () => {
    if (!formData.destination || !formData.origin || !formData.departureDate) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/plan-trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to plan trip');
      }

      const result = await response.json();
      setTripPlan(result.tripPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to plan trip');
    } finally {
      setIsLoading(false);
    }
  };

  const saveToCalendar = async () => {
    if (!tripPlan || !user) return;

    try {
      console.log('Saving trip to calendar for user:', user.userId || (user as any)?.sub);
      
      const response = await fetch('/api/calendar/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.userId || (user as any)?.sub,
          event: {
            title: `Trip to ${tripPlan.destination.name}`,
            description: `Planned trip including flights, accommodation, and activities`,
            startDateTime: formData.departureDate + 'T09:00:00',
            endDateTime: formData.returnDate + 'T18:00:00',
            location: tripPlan.destination.name,
            timeZone: 'UTC'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Calendar event created successfully:', result);
        setTripPlan(prev => prev ? { ...prev, calendarEventId: result.eventId } : null);
        showSuccessMessage('✅ Trip saved to Google Calendar successfully!');
      } else {
        const errorData = await response.json();
        console.error('Calendar API error:', response.status, errorData);
        
        // Handle specific error cases
        if (response.status === 401) {
          setError('Calendar authentication expired. Please reconnect your Google Calendar in the dashboard.');
        } else if (response.status === 403) {
          setError('Insufficient calendar permissions. Please reconnect your Google Calendar with proper permissions.');
        } else if (response.status === 404) {
          setError('Google Calendar not connected. Please connect your calendar in the dashboard first.');
        } else {
          setError(`Failed to save to calendar: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Failed to save to calendar:', error);
      setError('Failed to save to calendar. Please check your connection and try again.');
    }
  };

  const saveItineraryToCalendar = async () => {
    if (!tripPlan || !user || !tripPlan.itinerary?.length) return;

    try {
      console.log('Saving detailed itinerary to calendar for user:', user.userId || (user as any)?.sub);
      
      const response = await fetch('/api/calendar/create-itinerary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripPlan: {
            destination: tripPlan.destination,
            itinerary: tripPlan.itinerary,
            departureDate: formData.departureDate,
            returnDate: formData.returnDate
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Itinerary events created successfully:', result);
        showSuccessMessage(`🎉 ${result.message} - Created ${result.events.created.length} daily events and saved trip to your dashboard!`, 6000);
      } else {
        const errorData = await response.json();
        console.error('Itinerary calendar API error:', response.status, errorData);
        
        // Handle specific error cases
        if (response.status === 401) {
          showErrorMessage('Calendar authentication expired. Please reconnect your Google Calendar in the dashboard.');
        } else if (response.status === 403) {
          showErrorMessage('Insufficient calendar permissions. Please reconnect your Google Calendar with proper permissions.');
        } else if (response.status === 404) {
          showErrorMessage('Google Calendar not connected. Please connect your calendar in the dashboard first.');
        } else {
          showErrorMessage(`Failed to save itinerary to calendar: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Failed to save itinerary to calendar:', error);
      showErrorMessage('Failed to save itinerary to calendar. Please check your connection and try again.');
    }
  };

  if (isSessionLoading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (!isAuthenticated) {
    return <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Please Sign In</CardTitle>
          <CardDescription>You need to be signed in to plan trips</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/sign-in">
            <Button>Sign In to Continue</Button>
          </Link>
        </CardContent>
      </Card>
    </div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">AI Trip Planner</h1>
        <p className="text-gray-600">Let our AI create the perfect itinerary for your next adventure</p>
      </div>

      {!tripPlan ? (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Plan Your Trip</CardTitle>
            <CardDescription>Fill in your travel preferences and let AI do the rest</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origin">From (City/Airport Code)</Label>
                <Input
                  id="origin"
                  placeholder="e.g., NYC, LON, PAR"
                  value={formData.origin}
                  onChange={(e) => handleInputChange('origin', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">To (City/Airport Code)</Label>
                <Input
                  id="destination"
                  placeholder="e.g., NYC, LON, PAR"
                  value={formData.destination}
                  onChange={(e) => handleInputChange('destination', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="departureDate">Departure Date</Label>
                <Input
                  id="departureDate"
                  type="date"
                  value={formData.departureDate}
                  onChange={(e) => handleInputChange('departureDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="returnDate">Return Date</Label>
                <Input
                  id="returnDate"
                  type="date"
                  value={formData.returnDate}
                  onChange={(e) => handleInputChange('returnDate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="travelers">Number of Travelers</Label>
                <Select onValueChange={(value: string) => handleInputChange('travelers', parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select travelers" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num} Traveler{num > 1 ? 's' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget Range</Label>
                <Select onValueChange={(value: string) => handleInputChange('budget', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget">Budget ($0-$1000)</SelectItem>
                    <SelectItem value="mid-range">Mid-range ($1000-$3000)</SelectItem>
                    <SelectItem value="luxury">Luxury ($3000+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="travelStyle">Travel Style</Label>
                <Select onValueChange={(value: string) => handleInputChange('travelStyle', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adventure">Adventure</SelectItem>
                    <SelectItem value="relaxation">Relaxation</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="romantic">Romantic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accommodationType">Accommodation Type</Label>
                <Select onValueChange={(value: string) => handleInputChange('accommodationType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="resort">Resort</SelectItem>
                    <SelectItem value="boutique">Boutique</SelectItem>
                    <SelectItem value="business">Business Hotel</SelectItem>
                    <SelectItem value="any">Any</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interests">Interests & Preferences</Label>
                <Textarea
                  id="interests"
                  placeholder="e.g., museums, nightlife, outdoor activities, food tours, shopping..."
                  value={formData.interests}
                  onChange={(e) => handleInputChange('interests', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <CurrencySelector 
                  label="Preferred Currency"
                  showLabel={true}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">All prices will be displayed in your selected currency</p>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded border border-green-200">
                {successMessage}
              </div>
            )}

            <Button 
              onClick={planTrip} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <LoaderIcon className="animate-spin mr-2 h-4 w-4" />
                  Planning Your Trip...
                </>
              ) : (
                'Plan My Trip'
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Your Trip Plan to {getDisplayDestinationName(tripPlan.destination)}</h2>
              {tripPlan.destination.city && tripPlan.destination.city !== getDisplayDestinationName(tripPlan.destination) && (
                <p className="text-gray-600">in {tripPlan.destination.city}</p>
              )}
              {tripPlan.destination.coordinates && tripPlan.destination.coordinates.latitude !== 0 && (
                <div className="text-sm text-green-600 mt-1">
                  <p>✓ Found exact location coordinates for activities and attractions</p>
                  <p className="text-xs text-gray-500">
                    📍 {tripPlan.destination.coordinates.latitude.toFixed(4)}, {tripPlan.destination.coordinates.longitude.toFixed(4)}
                  </p>
                </div>
              )}
              {(!tripPlan.destination.coordinates || tripPlan.destination.coordinates.latitude === 0) && (
                <p className="text-sm text-amber-600 mt-1">
                  ⚠️ Using general location - activities may be limited
                </p>
              )}
              <div className="mt-2">
                <CurrencySelector 
                  label=""
                  showLabel={false}
                  size="sm"
                  className="w-48"
                />
              </div>
            </div>
            <div className="space-x-2">
              <Button onClick={saveToCalendar} variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Save Trip Overview
              </Button>
              {tripPlan.itinerary && tripPlan.itinerary.length > 0 && (
                <Button onClick={saveItineraryToCalendar} variant="default" className="bg-blue-600 hover:bg-blue-700">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  Save Daily Itinerary
                </Button>
              )}
              <Button onClick={() => setTripPlan(null)} variant="outline">
                Plan Another Trip
              </Button>
            </div>
          </div>

          {/* Success and Error Messages for Trip Actions */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="text-green-600 text-sm font-medium">
                  {successMessage}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="text-red-600 text-sm font-medium">
                  {error}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Flights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PlaneIcon className="mr-2 h-5 w-5" />
                  Flight Options
                </CardTitle>
                <CardDescription>
                  {tripPlan.flights.length} flights found
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tripPlan.flights.map((flight, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <p className="font-medium">{flight.carrier}</p>
                          <Badge variant={flight.stops === 0 ? "default" : "secondary"}>
                            {flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Departure</p>
                            <p className="font-medium">{flight.departure?.iataCode}</p>
                            <p>{new Date(flight.departure?.at).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Arrival</p>
                            <p className="font-medium">{flight.arrival?.iataCode}</p>
                            <p>{new Date(flight.arrival?.at).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <ClockIcon className="w-4 h-4 mr-1" />
                            {flight.duration}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <PriceDisplay 
                          amount={flight.price?.total || 0}
                          currency={flight.price?.currency || 'USD'}
                          className="font-bold text-lg"
                          showOriginal={true}
                        />
                        <p className="text-sm text-gray-600">
                          {flight.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'Economy'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Flight Insights */}
                {tripPlan.flightInsights && (
                  <div className="mt-6 space-y-4">
                    {/* Price Analysis */}
                    {tripPlan.flightInsights.priceAnalysis && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium flex items-center mb-2">
                          <BarChart3Icon className="w-4 h-4 mr-2" />
                          Price Analysis
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Quartile Ranking</p>
                            <p className="font-medium">{tripPlan.flightInsights.priceAnalysis.quartileRanking}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Price Category</p>
                            <p className="font-medium">{tripPlan.flightInsights.priceAnalysis.priceCategory}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hotels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HotelIcon className="mr-2 h-5 w-5" />
                  Hotel Options
                </CardTitle>
                <CardDescription>
                  {tripPlan.hotels.length} hotels found
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tripPlan.hotels.map((hotel, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <p className="font-medium">{hotel.name}</p>
                          {hotel.category && (
                            <Badge variant="outline" className="text-xs">
                              {hotel.category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {hotel.address?.lines?.[0]}, {hotel.address?.cityName}
                        </p>
                        {hotel.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {safeRenderText(hotel.description, 'Room description available')}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mb-2">
                          <div className="flex items-center">
                            <StarIcon className="w-4 h-4 text-yellow-500 mr-1" />
                            <span className="text-sm">{hotel.rating}/5</span>
                          </div>
                          {hotel.contact?.phone && (
                            <span className="text-xs text-gray-500">
                              📞 {hotel.contact.phone}
                            </span>
                          )}
                        </div>
                        {hotel.amenities && hotel.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {hotel.amenities.slice(0, 4).map((amenity, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {amenity}
                              </Badge>
                            ))}
                            {hotel.amenities.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{hotel.amenities.length - 4} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <PriceDisplay 
                          amount={hotel.price?.total || 0}
                          currency={hotel.price?.currency || 'USD'}
                          className="font-bold text-lg"
                          showOriginal={true}
                        />
                        <p className="text-sm text-gray-600">per night</p>
                        <p className="text-xs text-gray-500">
                          Total: <PriceDisplay 
                            amount={(parseFloat(hotel.price?.total || '0') * (tripPlan.itinerary?.length || 1))}
                            currency={hotel.price?.currency || 'USD'}
                            className="inline"
                          />
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Hotel Insights */}
                {tripPlan.hotelInsights && (
                  <div className="mt-6 space-y-4">
                    {/* Hotel Sentiments */}
                    {tripPlan.hotelInsights.sentiments && tripPlan.hotelInsights.sentiments.length > 0 && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium flex items-center mb-2">
                          <InfoIcon className="w-4 h-4 mr-2" />
                          Guest Reviews & Ratings
                        </h4>
                        <div className="space-y-2">
                          {tripPlan.hotelInsights.sentiments.slice(0, 2).map((sentiment: any, i: number) => (
                            <div key={i} className="text-sm">
                              <p className="font-medium">{sentiment.hotelId}</p>
                              <div className="flex items-center space-x-4">
                                <span>Overall: {sentiment.overallRating}/10</span>
                                <span>Sentiment: {sentiment.sentimentCategory}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Alternative Hotels */}
                    {tripPlan.hotelInsights.alternativeHotels && tripPlan.hotelInsights.alternativeHotels.length > 0 && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-medium flex items-center mb-2">
                          <HotelIcon className="w-4 h-4 mr-2" />
                          More Hotels in Area
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {tripPlan.hotelInsights.alternativeHotels.slice(0, 4).map((hotel: any, i: number) => (
                            <Badge key={i} variant="outline">
                              {hotel.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Activities - Full Width */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ActivityIcon className="mr-2 h-5 w-5" />
                  Tours & Activities
                </CardTitle>
                <CardDescription>
                  {tripPlan.activities.length} activities found
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tripPlan.activities.map((activity, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <p className="font-semibold text-lg">{activity.name}</p>
                          {activity.category && (
                            <Badge variant="outline" className="text-xs">
                              {safeRenderText(activity.category)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                          {safeRenderText(activity.description, 'Experience amazing tours and activities in your destination')}
                        </p>
                        <div className="flex items-center space-x-4 text-sm mb-3">
                          {activity.rating && activity.rating > 0 && (
                            <div className="flex items-center">
                              <StarIcon className="w-4 h-4 text-yellow-500 mr-1" />
                              <span className="font-medium">{activity.rating}/5</span>
                            </div>
                          )}
                          {activity.duration && (
                            <span className="flex items-center text-gray-600">
                              <ClockIcon className="w-4 h-4 mr-1" />
                              {safeRenderText(activity.duration)}
                            </span>
                          )}
                          {activity.location && activity.location.latitude && activity.location.longitude && (
                            <span className="flex items-center text-gray-600">
                              <NavigationIcon className="w-4 h-4 mr-1" />
                              <span className="text-xs">
                                {activity.location.latitude.toFixed(4)}, {activity.location.longitude.toFixed(4)}
                              </span>
                            </span>
                          )}
                        </div>
                        {activity.bookingLink && (
                          <a 
                            href={activity.bookingLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                          >
                            Book Now →
                          </a>
                        )}
                      </div>
                      {activity.price && (activity.price.amount || activity.price.total) && (
                        <div className="text-right ml-4">
                          <PriceDisplay 
                            amount={activity.price.amount || activity.price.total || 0}
                            currency={activity.price.currency || 'USD'}
                            className="font-bold text-lg text-green-600"
                            showOriginal={true}
                          />
                          <p className="text-xs text-gray-600">per person</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {tripPlan.activities.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <ActivityIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No activities found for this destination</p>
                    <p className="text-sm">Try searching for a different location or check back later</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Travel Insights */}
          {tripPlan.travelInsights && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trip Purpose */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <InfoIcon className="mr-2 h-5 w-5" />
                    Travel Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Trip Purpose */}
                  {tripPlan.travelInsights.tripPurpose && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Trip Purpose Prediction</h4>
                      <p className="text-sm text-gray-600">
                        Purpose: {tripPlan.travelInsights.tripPurpose.result || 'Unknown'}
                      </p>
                      {tripPlan.travelInsights.tripPurpose.probability && (
                        <p className="text-sm text-gray-600">
                          Confidence: {Math.round(tripPlan.travelInsights.tripPurpose.probability * 100)}%
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Airport & Route Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <NavigationIcon className="mr-2 h-5 w-5" />
                    Transportation Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Nearby Airports */}
                  {tripPlan.travelInsights.nearbyAirports && tripPlan.travelInsights.nearbyAirports.length > 0 && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Nearby Airports</h4>
                      <div className="space-y-1">
                        {tripPlan.travelInsights.nearbyAirports.slice(0, 3).map((airport: any, i: number) => (
                          <div key={i} className="text-sm">
                            <span className="font-medium">{airport.iataCode}</span> - {airport.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available Routes */}
                  {tripPlan.travelInsights.availableRoutes && tripPlan.travelInsights.availableRoutes.length > 0 && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Available Routes from {formData.origin}</h4>
                      <div className="flex flex-wrap gap-2">
                        {tripPlan.travelInsights.availableRoutes.slice(0, 6).map((route: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {route.destination}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          {tripPlan.travelInsights && Object.keys(tripPlan.travelInsights).length > 0 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Travel Insights</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trip Purpose */}
                {tripPlan.travelInsights.tripPurpose && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <InfoIcon className="mr-2 h-5 w-5" />
                        Trip Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Purpose</span>
                          <span className="font-medium">{tripPlan.travelInsights.tripPurpose.result}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Confidence</span>
                          <span className="font-medium">{(tripPlan.travelInsights.tripPurpose.probability * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Nearby Airports */}
                {tripPlan.travelInsights.nearbyAirports && tripPlan.travelInsights.nearbyAirports.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <PlaneIcon className="mr-2 h-5 w-5" />
                        Nearby Airports
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {tripPlan.travelInsights.nearbyAirports.slice(0, 3).map((airport: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="font-medium">{airport.iataCode}</span>
                            <span>{airport.name}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Itinerary */}
          {tripPlan.itinerary && tripPlan.itinerary.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Suggested Itinerary</CardTitle>
                  <Button onClick={saveItineraryToCalendar} size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Save to Calendar
                  </Button>
                </div>
                <CardDescription>
                  Daily breakdown of your trip with activities and suggestions. 
                  Click "Save to Calendar" to create individual events for each day.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tripPlan.itinerary.map((day, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-medium">Day {day.day} - {day.date}</h4>
                    <ul className="mt-2 space-y-1">
                      {day.activities.map((activity, i) => (
                        <li key={i} className="text-sm text-gray-600">• {activity}</li>
                      ))}
                    </ul>
                    <p className="text-sm text-gray-500 mt-2 italic">{day.suggestions}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {tripPlan.calendarEventId && (
            <div className="text-center text-green-600 font-medium">
              ✓ Trip saved to your Google Calendar!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
