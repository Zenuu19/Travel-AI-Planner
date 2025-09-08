import { NextRequest } from 'next/server';
import { session } from '@descope/nextjs-sdk/server';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
const Amadeus = require('amadeus');

// Helper function to clean destination names for better display
function cleanDestinationName(name: string, city: string): string {
  // If the name is very long or contains Arabic/foreign text mixed with English
  if (name.length > 50 || /[\u0600-\u06FF]/.test(name)) {
    // Try to extract just the airport or city name
    if (name.toLowerCase().includes('airport') || name.toLowerCase().includes('international')) {
      // For airports, try to extract the airport name
      const airportMatch = name.match(/([^,]+?(?:airport|international))/i);
      if (airportMatch) {
        return airportMatch[1].trim();
      }
    }
    
    // For cities, prefer the cleaned city name
    if (city && city !== name) {
      return city;
    }
    
    // As last resort, try to get the first part before comma that contains English
    const parts = name.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      // Check if this part contains mostly English characters
      if (trimmed.length > 2 && /[a-zA-Z]/.test(trimmed) && trimmed.length < 30) {
        return trimmed;
      }
    }
  }
  
  return name;
}

// Simple geocoding function using OpenStreetMap Nominatim API
async function simpleGeocode(query: string): Promise<{ latitude: number; longitude: number; name: string; city: string } | null> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&addressdetails=1`);
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      const city = result.address?.city || result.address?.town || result.address?.village || query;
      const rawName = result.display_name || query;
      const cleanName = cleanDestinationName(rawName, city);
      
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        name: cleanName,
        city: city
      };
    }
  } catch (error) {
    console.log('Simple geocoding failed:', error);
  }
  return null;
}

// Helper function to safely extract text from objects and strip HTML tags
const safeExtractText = (value: any): string => {
  let text = '';
  
  if (typeof value === 'string') {
    text = value;
  } else if (typeof value === 'object' && value) {
    if (value.text) text = value.text;
    else if (value.description) text = value.description;
    else if (Array.isArray(value) && value.length > 0) text = safeExtractText(value[0]);
  }
  
  // Strip HTML tags using a simple regex
  if (text) {
    text = text.replace(/<[^>]*>/g, '').trim();
  }
  
  return text || '';
};

// Initialize Amadeus SDK
const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID!,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET!,
  hostname: 'test'
});

// Airport code to airport name mapping for better geocoding
const airportNames: Record<string, string> = {
  'DXB': 'Dubai International Airport, Dubai, UAE',
  'LHR': 'London Heathrow Airport, London, UK',
  'JFK': 'John F. Kennedy International Airport, New York, USA',
  'LAX': 'Los Angeles International Airport, Los Angeles, USA',
  'CDG': 'Charles de Gaulle Airport, Paris, France',
  'NRT': 'Narita International Airport, Tokyo, Japan',
  'SIN': 'Singapore Changi Airport, Singapore',
  'HKG': 'Hong Kong International Airport, Hong Kong',
  'SYD': 'Sydney Kingsford Smith Airport, Sydney, Australia',
  'BKK': 'Suvarnabhumi Airport, Bangkok, Thailand',
  'MAD': 'Madrid-Barajas Airport, Madrid, Spain',
  'FCO': 'Leonardo da Vinci International Airport, Rome, Italy',
  'AMS': 'Amsterdam Airport Schiphol, Amsterdam, Netherlands',
  'FRA': 'Frankfurt Airport, Frankfurt, Germany',
  'MUC': 'Munich Airport, Munich, Germany',
  'ZUR': 'Zurich Airport, Zurich, Switzerland',
  'VIE': 'Vienna International Airport, Vienna, Austria',
  'IST': 'Istanbul Airport, Istanbul, Turkey',
  'DOH': 'Hamad International Airport, Doha, Qatar',
  'DUB': 'Dublin Airport, Dublin, Ireland',
  'CPH': 'Copenhagen Airport, Copenhagen, Denmark',
  'ARN': 'Stockholm Arlanda Airport, Stockholm, Sweden',
  'OSL': 'Oslo Airport, Oslo, Norway',
  'HEL': 'Helsinki Airport, Helsinki, Finland',
  'YYZ': 'Toronto Pearson International Airport, Toronto, Canada',
  'YVR': 'Vancouver International Airport, Vancouver, Canada',
  'MEX': 'Mexico City International Airport, Mexico City, Mexico',
  'GRU': 'São Paulo–Guarulhos International Airport, São Paulo, Brazil',
  'BOG': 'El Dorado International Airport, Bogotá, Colombia',
  'LIM': 'Jorge Chávez International Airport, Lima, Peru',
  'SCL': 'Santiago International Airport, Santiago, Chile',
  'EZE': 'Ezeiza International Airport, Buenos Aires, Argentina',
  'JNB': 'O.R. Tambo International Airport, Johannesburg, South Africa',
  'CAI': 'Cairo International Airport, Cairo, Egypt',
  'ADD': 'Addis Ababa Bole International Airport, Addis Ababa, Ethiopia',
  'NBO': 'Jomo Kenyatta International Airport, Nairobi, Kenya',
  'LOS': 'Murtala Muhammed International Airport, Lagos, Nigeria',
  'CMN': 'Mohammed V International Airport, Casablanca, Morocco',
  'TUN': 'Tunis–Carthage International Airport, Tunis, Tunisia',
  'ALG': 'Houari Boumediene Airport, Algiers, Algeria',
  'DEL': 'Indira Gandhi International Airport, New Delhi, India',
  'BOM': 'Chhatrapati Shivaji Maharaj International Airport, Mumbai, India',
  'BLR': 'Kempegowda International Airport, Bangalore, India',
  'MAA': 'Chennai International Airport, Chennai, India',
  'CCU': 'Netaji Subhas Chandra Bose International Airport, Kolkata, India',
  'HYD': 'Rajiv Gandhi International Airport, Hyderabad, India',
  'AMD': 'Sardar Vallabhbhai Patel International Airport, Ahmedabad, India',
  'COK': 'Cochin International Airport, Kochi, India',
  'GOI': 'Goa Airport, Goa, India',
  'PNQ': 'Pune Airport, Pune, India',
  'ICN': 'Seoul Incheon International Airport, Seoul, South Korea',
  'TPE': 'Taiwan Taoyuan International Airport, Taipei, Taiwan',
  'MNL': 'Ninoy Aquino International Airport, Manila, Philippines',
  'KUL': 'Kuala Lumpur International Airport, Kuala Lumpur, Malaysia',
  'CGK': 'Soekarno–Hatta International Airport, Jakarta, Indonesia',
  'DPS': 'Ngurah Rai International Airport, Denpasar, Bali, Indonesia',
  'PEK': 'Beijing Capital International Airport, Beijing, China',
  'PVG': 'Shanghai Pudong International Airport, Shanghai, China',
  'CAN': 'Guangzhou Baiyun International Airport, Guangzhou, China',
  'SZX': 'Shenzhen Bao\'an International Airport, Shenzhen, China',
  'CTU': 'Chengdu Shuangliu International Airport, Chengdu, China',
  'XIY': 'Xi\'an Xianyang International Airport, Xi\'an, China',
  'KMG': 'Kunming Changshui International Airport, Kunming, China',
  'URC': 'Ürümqi Diwopu International Airport, Ürümqi, China',
  'CKG': 'Chongqing Jiangbei International Airport, Chongqing, China'
};

// Enhanced geocoding function with multiple fallback strategies
async function getDestinationCoordinates(destination: string): Promise<{ latitude: number; longitude: number; name: string; city: string }> {
  console.log(`Getting coordinates for destination: ${destination}`);
  
  // Strategy 1: Try Amadeus airport lookup first for 3-letter codes
  if (destination.length === 3) {
    try {
      const airportResponse = await amadeus.referenceData.location(destination.toUpperCase()).get();
      if (airportResponse.data && airportResponse.data.geoCode) {
        const coords = {
          latitude: parseFloat(airportResponse.data.geoCode.latitude),
          longitude: parseFloat(airportResponse.data.geoCode.longitude),
          name: airportResponse.data.name || destination,
          city: airportResponse.data.address?.cityName || destination
        };
        console.log(`Amadeus airport lookup success:`, coords);
        return coords;
      }
    } catch (error) {
      console.log('Amadeus airport lookup failed, trying geocoding...');
    }
  }

  // Strategy 2: Use airport name mapping for geocoding
  const airportCode = destination.toUpperCase();
  if (airportNames[airportCode]) {
    try {
      const geocodeResult = await simpleGeocode(airportNames[airportCode]);
      if (geocodeResult) {
        const coords = {
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude,
          name: airportNames[airportCode],
          city: geocodeResult.city || destination
        };
        console.log(`Airport name geocoding success:`, coords);
        return coords;
      }
    } catch (error) {
      console.log('Airport name geocoding failed:', error);
    }
  }

  // Strategy 3: Direct geocoding of destination + airport
  try {
    const geocodeResult = await simpleGeocode(`${destination} airport`);
    if (geocodeResult) {
      const coords = {
        latitude: geocodeResult.latitude,
        longitude: geocodeResult.longitude,
        name: cleanDestinationName(geocodeResult.name, geocodeResult.city) || `${destination} Airport`,
        city: geocodeResult.city || destination
      };
      console.log(`Direct airport geocoding success:`, coords);
      return coords;
    }
  } catch (error) {
    console.log('Direct airport geocoding failed:', error);
  }

  // Strategy 4: Try Amadeus city search
  try {
    const cityResponse = await amadeus.referenceData.locations.cities.get({
      keyword: destination
    });
    if (cityResponse.data && cityResponse.data.length > 0) {
      const city = cityResponse.data[0];
      const coords = {
        latitude: parseFloat(city.geoCode?.latitude || '0'),
        longitude: parseFloat(city.geoCode?.longitude || '0'),
        name: city.name,
        city: city.name
      };
      if (coords.latitude !== 0 && coords.longitude !== 0) {
        console.log(`Amadeus city search success:`, coords);
        return coords;
      }
    }
  } catch (error) {
    console.log('Amadeus city search failed:', error);
  }

  // Strategy 5: Direct city geocoding
  try {
    const geocodeResult = await simpleGeocode(destination);
    if (geocodeResult) {
      const coords = {
        latitude: geocodeResult.latitude,
        longitude: geocodeResult.longitude,
        name: cleanDestinationName(geocodeResult.name, geocodeResult.city) || destination,
        city: geocodeResult.city || destination
      };
      console.log(`Direct city geocoding success:`, coords);
      return coords;
    }
  } catch (error) {
    console.log('Direct city geocoding failed:', error);
  }

  // Strategy 6: Try Amadeus general location search
  try {
    const locationResponse = await amadeus.referenceData.locations.get({
      keyword: destination,
      subType: 'AIRPORT,CITY'
    });
    if (locationResponse.data && locationResponse.data.length > 0) {
      const location = locationResponse.data[0];
      const coords = {
        latitude: parseFloat(location.geoCode?.latitude || '0'),
        longitude: parseFloat(location.geoCode?.longitude || '0'),
        name: location.name || destination,
        city: location.address?.cityName || destination
      };
      if (coords.latitude !== 0 && coords.longitude !== 0) {
        console.log(`Amadeus general location search success:`, coords);
        return coords;
      }
    }
  } catch (error) {
    console.log('Amadeus general location search failed:', error);
  }

  // Fallback: return zero coordinates
  console.log(`All geocoding strategies failed for: ${destination}`);
  return {
    latitude: 0,
    longitude: 0,
    name: destination,
    city: destination
  };
}

const TripPlanSchema = z.object({
  destination: z.object({
    name: z.string(),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number()
    })
  }),
  flights: z.array(z.any()),
  hotels: z.array(z.any()),
  activities: z.array(z.any()),
  itinerary: z.array(z.object({
    day: z.number(),
    date: z.string(),
    activities: z.array(z.string()),
    suggestions: z.string()
  }))
});

export async function POST(req: NextRequest) {
  try {
    // Verify user session
    const sessionInfo = await session();
    if (!sessionInfo) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.json();
    const { 
      destination, 
      origin, 
      departureDate, 
      returnDate, 
      travelers, 
      budget, 
      travelStyle, 
      interests, 
      accommodationType 
    } = formData;

    // Step 1: Get destination information and coordinates using enhanced geocoding
    let destinationInfo: any = null;
    let destinationCoords = { latitude: 0, longitude: 0 };

    try {
      const geocodingResult = await getDestinationCoordinates(destination);
      destinationInfo = {
        name: geocodingResult.name,
        city: geocodingResult.city,
        coordinates: {
          latitude: geocodingResult.latitude,
          longitude: geocodingResult.longitude
        }
      };
      destinationCoords = destinationInfo.coordinates;
      
      console.log(`Final destination info:`, destinationInfo);
      console.log(`Using coordinates for search:`, destinationCoords);
    } catch (error) {
      console.error('Enhanced geocoding failed:', error);
      destinationInfo = {
        name: destination,
        city: destination,
        coordinates: { latitude: 0, longitude: 0 }
      };
      destinationCoords = destinationInfo.coordinates;
    }

    // Step 2: Comprehensive Flight Search
    let flights: any[] = [];
    let flightInsights: any = {};
    
    try {
      // Primary flight search
      const flightParams: any = {
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate,
        adults: travelers.toString(),
        max: 10
      };

      if (returnDate) {
        flightParams.returnDate = returnDate;
      }

      const flightResponse = await amadeus.shopping.flightOffersSearch.get(flightParams);
      
      flights = flightResponse.data?.slice(0, 5).map((offer: any) => ({
        id: offer.id,
        price: offer.price,
        duration: offer.itineraries[0]?.duration,
        departure: offer.itineraries[0]?.segments[0]?.departure,
        arrival: offer.itineraries[0]?.segments[offer.itineraries[0]?.segments.length - 1]?.arrival,
        carrier: offer.itineraries[0]?.segments[0]?.carrierCode,
        stops: offer.itineraries[0]?.segments.length - 1,
        segments: offer.itineraries[0]?.segments,
        validatingAirlineCodes: offer.validatingAirlineCodes,
        travelerPricings: offer.travelerPricings
      })) || [];

      // Get airline information
      if (flights.length > 0) {
        try {
          const airlineCodes = [...new Set(flights.map(f => f.carrier))];
          const airlineResponse = await amadeus.referenceData.airlines.get({
            airlineCodes: airlineCodes.join(',')
          });
          flightInsights.airlines = airlineResponse.data || [];
        } catch (error) {
          console.error('Airline info error:', error);
          flightInsights.airlines = [];
        }
      }

      // Get price analysis
      try {
        if (origin.length === 3 && destination.length === 3) {
          const priceAnalysisResponse = await amadeus.analytics.itineraryPriceMetrics.get({
            originIataCode: origin,
            destinationIataCode: destination,
            departureDate: departureDate
          });
          flightInsights.priceAnalysis = priceAnalysisResponse.data || {};
        }
      } catch (error) {
        console.error('Price analysis error:', error);
        flightInsights.priceAnalysis = {};
      }

    } catch (error) {
      console.error('Flight search error:', error);
      flights = [];
      flightInsights = {};
    }

    // Step 3: Comprehensive Hotel Search
    let hotels: any[] = [];
    let hotelInsights: any = {};
    
    try {
      // Search hotels by city code
      const hotelsListResponse = await amadeus.referenceData.locations.hotels.byCity.get({
        cityCode: destination
      });

      if (hotelsListResponse.data && hotelsListResponse.data.length > 0) {
        const hotelIds = hotelsListResponse.data.slice(0, 15).map((hotel: any) => hotel.hotelId);
        
        // Get hotel offers with pricing
        const hotelOffersResponse = await amadeus.shopping.hotelOffersSearch.get({
          hotelIds: hotelIds.join(','),
          adults: travelers.toString(),
          checkInDate: departureDate,
          checkOutDate: returnDate || departureDate
        });

        hotels = hotelOffersResponse.data?.slice(0, 6).map((offer: any) => ({
          hotelId: offer.hotel?.hotelId,
          name: safeExtractText(offer.hotel?.name),
          rating: offer.hotel?.rating,
          address: offer.hotel?.address,
          contact: offer.hotel?.contact,
          price: offer.offers?.[0]?.price,
          description: safeExtractText(offer.offers?.[0]?.room?.description),
          amenities: offer.hotel?.amenities || [],
          checkInDate: offer.offers?.[0]?.checkInDate,
          checkOutDate: offer.offers?.[0]?.checkOutDate,
          policies: offer.offers?.[0]?.policies,
          category: safeExtractText(offer.offers?.[0]?.category)
        })) || [];

        // Get hotel ratings and sentiments for top hotels
        try {
          const topHotelIds = hotels.slice(0, 3).map(h => h.hotelId).filter(Boolean);
          if (topHotelIds.length > 0) {
            const sentimentResponse = await amadeus.eReputation.hotelSentiments.get({
              hotelIds: topHotelIds.join(',')
            });
            hotelInsights.sentiments = sentimentResponse.data || [];
          }
        } catch (error) {
          console.error('Hotel sentiment error:', error);
        }
      }

      // Search hotels by coordinates if available
      if (destinationCoords.latitude !== 0 && destinationCoords.longitude !== 0) {
        try {
          const hotelsByGeoResponse = await amadeus.referenceData.locations.hotels.byGeocode.get({
            latitude: destinationCoords.latitude,
            longitude: destinationCoords.longitude
          });
          hotelInsights.nearbyHotels = hotelsByGeoResponse.data?.slice(0, 5) || [];
        } catch (error) {
          console.error('Hotels by geocode error:', error);
        }
      }

      // Hotel name autocomplete for alternative suggestions
      try {
        if (destination.length >= 3) {
          const hotelNameResponse = await amadeus.referenceData.locations.hotel.get({
            keyword: destination.substring(0, 4).toUpperCase(),
            subType: 'HOTEL_GDS'
          });
          hotelInsights.alternativeHotels = hotelNameResponse.data?.slice(0, 5) || [];
        }
      } catch (error) {
        console.error('Hotel autocomplete error:', error);
        hotelInsights.alternativeHotels = [];
      }

    } catch (error) {
      console.error('Hotel search error:', error);
      hotels = [];
      hotelInsights = {};
    }

    // Step 4: Comprehensive Activities & Travel Insights
    let activities: any[] = [];
    let travelInsights: any = {};

    console.log('Using coordinates for activities search:', destinationCoords);

    // If we still don't have valid coordinates, try one more geocoding attempt
    if (destinationCoords.latitude === 0 && destinationCoords.longitude === 0) {
      console.log('Zero coordinates detected, attempting emergency geocoding...');
      try {
        const emergencyGeocode = await simpleGeocode(`${destination} city center`);
        if (emergencyGeocode) {
          destinationCoords = {
            latitude: emergencyGeocode.latitude,
            longitude: emergencyGeocode.longitude
          };
          console.log('Emergency geocoding success:', destinationCoords);
          
          // Update destination info with new coordinates
          destinationInfo.coordinates = destinationCoords;
        }
      } catch (error) {
        console.log('Emergency geocoding failed:', error);
      }
    }

    if (destinationCoords.latitude !== 0 && destinationCoords.longitude !== 0) {
      // Get activities and tours with adaptive radius
      try {
        // Start with a larger radius for better coverage (50km)
        const activitiesResponse = await amadeus.shopping.activities.get({
          latitude: destinationCoords.latitude,
          longitude: destinationCoords.longitude,
          radius: 50
        });

        activities = activitiesResponse.data?.slice(0, 8).map((activity: any) => ({
          id: activity.id,
          name: safeExtractText(activity.name),
          description: safeExtractText(activity.shortDescription || activity.description),
          price: activity.price,
          rating: activity.rating,
          duration: safeExtractText(activity.duration),
          category: safeExtractText(activity.category),
          pictures: activity.pictures,
          bookingLink: activity.bookingLink,
          location: activity.geoCode
        })) || [];

        console.log(`Found ${activities.length} activities`);

        // Get activities by square area for more comprehensive coverage if we didn't get many results
        if (activities.length < 5) {
          try {
            const radius = 0.1; // ~10km radius
            const activitiesBySquareResponse = await amadeus.shopping.activities.bySquare.get({
              north: destinationCoords.latitude + radius,
              west: destinationCoords.longitude - radius,
              south: destinationCoords.latitude - radius,
              east: destinationCoords.longitude + radius
            });
            
            const additionalActivities = activitiesBySquareResponse.data?.slice(0, 8).map((activity: any) => ({
              id: activity.id,
              name: safeExtractText(activity.name),
              description: safeExtractText(activity.shortDescription || activity.description),
              price: activity.price,
              rating: activity.rating,
              duration: safeExtractText(activity.duration),
              category: safeExtractText(activity.category),
              pictures: activity.pictures,
              bookingLink: activity.bookingLink,
              location: activity.geoCode
            })) || [];
            
            // Merge and deduplicate activities
            const existingIds = new Set(activities.map((a: any) => a.id));
            const newActivities = additionalActivities.filter((a: any) => !existingIds.has(a.id));
            activities = [...activities, ...newActivities].slice(0, 10);
            console.log(`Total activities after square search: ${activities.length}`);
          } catch (error) {
            console.error('Activities by square error:', error);
          }
        }
      } catch (error) {
        console.error('Activities search error:', error);
      }
    }

    // Get trip purpose prediction
    if (returnDate) {
      try {
        if (origin.length === 3 && destination.length === 3) {
          const tripPurposeResponse = await amadeus.travel.predictions.tripPurpose.get({
            originLocationCode: origin,
            destinationLocationCode: destination,
            departureDate: departureDate,
            returnDate: returnDate
          });
          travelInsights.tripPurpose = tripPurposeResponse.data || {};
        }
      } catch (error) {
        console.error('Trip purpose prediction error:', error);
        travelInsights.tripPurpose = {};
      }
    }

    // Get airport information for destination
    try {
      if (destinationCoords.latitude !== 0 && destinationCoords.longitude !== 0) {
        const airportResponse = await amadeus.referenceData.locations.airports.get({
          latitude: destinationCoords.latitude,
          longitude: destinationCoords.longitude
        });
        travelInsights.nearbyAirports = airportResponse.data?.slice(0, 3) || [];
      }
    } catch (error) {
      console.error('Airport search error:', error);
      travelInsights.nearbyAirports = [];
    }

    // Get airline routes information
    try {
      if (origin.length === 3) {
        const routesResponse = await amadeus.airport.directDestinations.get({
          departureAirportCode: origin
        });
        travelInsights.availableRoutes = routesResponse.data?.slice(0, 10) || [];
      }
    } catch (error) {
      console.error('Routes search error:', error);
      travelInsights.availableRoutes = [];
    }

    // Step 5: Generate AI-powered itinerary
    let itinerary: any[] = [];
    
    try {
      const tripDurationDays = returnDate 
        ? Math.ceil((new Date(returnDate).getTime() - new Date(departureDate).getTime()) / (1000 * 60 * 60 * 24))
        : 3; // Default to 3 days if no return date

      const itineraryPrompt = `Create a detailed ${tripDurationDays}-day itinerary for a ${travelStyle} trip to ${destinationInfo.name} starting on ${departureDate}. 
      
      Traveler preferences:
      - Number of travelers: ${travelers}
      - Budget: ${budget}
      - Travel style: ${travelStyle}
      - Interests: ${interests}
      - Accommodation type: ${accommodationType}
      
      Available activities: ${activities.map(a => a.name).join(', ')}
      
      For each day, provide:
      - Day number and date
      - 3-4 specific activities/attractions to visit
      - Practical suggestions for that day (timing, transportation, dining recommendations)
      
      Consider the travel style and interests when planning activities.`;

      const aiResponse = await generateObject({
        model: google('gemini-2.0-flash-exp'),
        schema: z.object({
          itinerary: z.array(z.object({
            day: z.number(),
            date: z.string(),
            activities: z.array(z.string()),
            suggestions: z.string()
          }))
        }),
        prompt: itineraryPrompt
      });

      itinerary = aiResponse.object.itinerary;
    } catch (error) {
      console.error('AI itinerary generation error:', error);
      // Fallback basic itinerary
      const tripDurationDays = returnDate 
        ? Math.ceil((new Date(returnDate).getTime() - new Date(departureDate).getTime()) / (1000 * 60 * 60 * 24))
        : 3;

      itinerary = Array.from({ length: tripDurationDays }, (_, i) => {
        const currentDate = new Date(departureDate);
        currentDate.setDate(currentDate.getDate() + i);
        
        return {
          day: i + 1,
          date: currentDate.toISOString().split('T')[0],
          activities: activities.slice(0, 3).map(a => a.name),
          suggestions: `Explore ${destinationInfo.name} with a focus on ${travelStyle} activities.`
        };
      });
    }

    const tripPlan = {
      destination: destinationInfo,
      coordinates: destinationCoords, // Add coordinates info for debugging
      flights,
      flightInsights,
      hotels,
      hotelInsights,
      activities,
      travelInsights,
      itinerary
    };

    console.log(`Trip plan generated with ${activities.length} activities using coordinates:`, destinationCoords);

    return Response.json({ 
      success: true, 
      tripPlan 
    });

  } catch (error) {
    console.error('Trip planning error:', error);
    return Response.json(
      { error: 'Failed to plan trip. Please try again.' }, 
      { status: 500 }
    );
  }
}
