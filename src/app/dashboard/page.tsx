'use client';

import { useSession, useUser, useDescope } from '@descope/nextjs-sdk/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plane, Calendar, MapPin, Plus, Globe, CheckCircle, LoaderIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTrips } from '@/hooks/useTrips';
import { TripCard } from '@/components/TripCard';

export default function DashboardPage() {
  const { isAuthenticated, isSessionLoading } = useSession();
  const { user, isUserLoading } = useUser();
  const sdk = useDescope();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConnectedToCalendar, setIsConnectedToCalendar] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [isDisconnectingCalendar, setIsDisconnectingCalendar] = useState(false);
  
  // Use trips hook
  const { trips, isLoading: isLoadingTrips, error: tripsError, deleteTrip } = useTrips();

  useEffect(() => {
    if (!isSessionLoading && !isAuthenticated) {
      router.push('/sign-in');
    }
  }, [isAuthenticated, isSessionLoading, router]);

  useEffect(() => {
    // Handle Descope OAuth callback results
    const handleOAuthCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      
      if (error) {
        console.error('OAuth error:', error);
        alert('Failed to connect Google Calendar. Please try again.');
        router.replace('/dashboard');
        return;
      }
      
      if (code && state) {
        console.log('Processing OAuth callback with code:', code.substring(0, 10) + '...');
        
        try {
          // The callback should be handled automatically by Descope
          // Just refresh the connection status
          const userId = user?.userId || (user as any)?.sub;
          if (userId) {
            setTimeout(async () => {
              await checkCalendarConnection();
              // Show success message if connected
              const response = await fetch('/api/calendar/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data.isConnected) {
                  alert('Google Calendar connected successfully!');
                  setIsConnectedToCalendar(true);
                }
              }
            }, 1000);
          }
        } catch (callbackError) {
          console.error('Error handling OAuth callback:', callbackError);
          alert('Failed to complete Google Calendar connection.');
        }
        
        // Clean up URL parameters
        router.replace('/dashboard');
      }
    };
    
    handleOAuthCallback();
  }, [searchParams, router, user]);

  const checkCalendarConnection = async () => {
    if (user?.userId || (user as any)?.sub) {
      const userId = user?.userId || (user as any)?.sub;
      console.log('Checking calendar connection for user:', userId);
      
      try {
        setIsCheckingConnection(true);
        const response = await fetch('/api/calendar/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Calendar status response:', data);
          setIsConnectedToCalendar(data.isConnected);
        } else {
          console.error('Calendar status check failed:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error checking calendar connection:', error);
      } finally {
        setIsCheckingConnection(false);
      }
    }
  };

  useEffect(() => {
    // Check if user has connected Google Calendar
    if (user) {
      console.log('User object:', user);
      checkCalendarConnection();
    }
  }, [user]);

  const connectToGoogleCalendar = async () => {
    const userId = user?.userId || (user as any)?.sub;
    console.log('Initiating Google Calendar connection through Descope outbound app for user:', userId);
    setIsConnectingCalendar(true);
    
    try {
      // Use Descope outbound app connection method
      const result = await sdk.outbound.connect('google-calendar', {
        redirectUrl: 'http://localhost:3000/dashboard',
        scopes: [
          'https://www.googleapis.com/auth/calendar.app.created',
          'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
        ]
      });
      
      console.log('Outbound connect result:', result);
      
      if (result.ok && result.data?.url) {
        console.log('Redirecting to Google OAuth URL:', result.data.url);
        // Redirect to the Google OAuth URL
        window.location.href = result.data.url;
      } else {
        console.error('Failed to get OAuth URL from Descope:', result);
        alert('Failed to initialize Google Calendar connection. Please try again.');
      }
      
    } catch (error) {
      console.error('Error connecting to Google Calendar via Descope outbound app:', error);
      alert('Failed to connect to Google Calendar. Please try again.');
    } finally {
      setIsConnectingCalendar(false);
    }
  };

  const disconnectFromGoogleCalendar = async () => {
    const userId = user?.userId || (user as any)?.sub;
    console.log('Disconnecting from Google Calendar for user:', userId);
    setIsDisconnectingCalendar(true);
    
    try {
      const response = await fetch('/api/calendar/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Successfully disconnected from Google Calendar:', data);
        setIsConnectedToCalendar(false);
        alert('Successfully disconnected from Google Calendar.');
      } else {
        const errorData = await response.json();
        console.error('Failed to disconnect from Google Calendar:', errorData);
        alert('Failed to disconnect from Google Calendar. Please try again.');
      }
    } catch (error) {
      console.error('Error disconnecting from Google Calendar:', error);
      alert('Failed to disconnect from Google Calendar. Please try again.');
    } finally {
      setIsDisconnectingCalendar(false);
    }
  };

  if (isSessionLoading || isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.picture} alt={user?.name || ''} />
            <AvatarFallback>
              {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name || 'Traveler'}!</h1>
            <p className="text-gray-600 mt-2">Plan and manage your trips with AI-powered recommendations</p>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="trips" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trips">My Trips</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="trips" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">Your Trips</h2>
                {trips.length > 0 && (
                  <p className="text-gray-600 mt-1">
                    {trips.filter(t => t.status === 'upcoming').length} upcoming, {' '}
                    {trips.filter(t => t.status === 'ongoing').length} ongoing, {' '}
                    {trips.filter(t => t.status === 'completed').length} completed
                  </p>
                )}
              </div>
              <Link href="/plan-trip">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Plan New Trip
                </Button>
              </Link>
            </div>
            
            {isLoadingTrips ? (
              <div className="flex items-center justify-center py-12">
                <LoaderIcon className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading your trips...</span>
              </div>
            ) : tripsError ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-red-500 mb-4">
                    <Globe className="h-12 w-12 mx-auto mb-2" />
                    <h3 className="text-lg font-semibold mb-2">Error loading trips</h3>
                    <p className="text-gray-600">{tripsError}</p>
                  </div>
                </CardContent>
              </Card>
            ) : trips.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No trips yet</h3>
                  <p className="text-gray-600 mb-4">
                    Start planning your first amazing trip with AI assistance. 
                    When you save a trip to Google Calendar, it will appear here automatically!
                  </p>
                  <Link href="/plan-trip">
                    <Button>Plan Your First Trip</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {trips.map((trip) => (
                  <TripCard 
                    key={trip._id} 
                    trip={trip} 
                    onDelete={deleteTrip}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <h2 className="text-2xl font-semibold">Calendar Integration</h2>
            <Card>
              <CardContent className="p-6 text-center">
                {isCheckingConnection ? (
                  <>
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                    <h3 className="text-lg font-semibold mb-2">Checking connection...</h3>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </>
                ) : isConnectedToCalendar ? (
                  <>
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-green-700">Google Calendar Connected</h3>
                    <p className="text-gray-600 mb-4">Your trips will automatically sync with Google Calendar</p>
                    <div className="space-y-2">
                      <Button variant="outline" disabled className="w-full">
                        ✓ Connected
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={disconnectFromGoogleCalendar}
                        disabled={isDisconnectingCalendar}
                        className="w-full"
                      >
                        {isDisconnectingCalendar ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Disconnecting...
                          </>
                        ) : (
                          'Disconnect Google Calendar'
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Connect Your Calendar</h3>
                    <p className="text-gray-600 mb-4">Sync your trips with Google Calendar for better organization</p>
                    <Button 
                      onClick={connectToGoogleCalendar}
                      disabled={isConnectingCalendar}
                      className="bg-blue-600 hover:bg-blue-700 w-full"
                    >
                      {isConnectingCalendar ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Connecting...
                        </>
                      ) : (
                        'Connect Google Calendar'
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <h2 className="text-2xl font-semibold">Profile Settings</h2>
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your account details and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <p className="text-gray-900">{user?.name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{user?.email}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
