'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from '@descope/nextjs-sdk/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { 
  Plane, 
  Calendar, 
  MapPin, 
  ArrowRight,
  Brain,
  Map
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const { isAuthenticated, isSessionLoading } = useSession();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isSessionLoading && isAuthenticated) {
      console.log('User is authenticated, redirecting to dashboard...');
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isSessionLoading, router]);

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is authenticated, show loading while redirecting
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Your{" "}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                AI-Powered
              </span>{" "}
              Travel Companion
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Plan your perfect trip with intelligent recommendations, seamless bookings, 
              and automated calendar integration. Let AI handle the complexity while you focus on the adventure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/sign-in">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-8 py-3">
                  Start Planning <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="https://youtu.be/w5utYQB2KbI" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="px-8 py-3">
                  Watch Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Perfect Travel
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powered by advanced AI and integrated with the world's best travel APIs
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Plane className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Smart Flight Search</CardTitle>
                <CardDescription>
                  AI-powered flight recommendations with real-time pricing and availability
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>AI Trip Planning</CardTitle>
                <CardDescription>
                  Intelligent itinerary generation with personalized recommendations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Calendar Integration</CardTitle>
                <CardDescription>
                  Seamless Google Calendar sync for automatic itinerary management
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Map className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>Activities & Tours</CardTitle>
                <CardDescription>
                  Discover local experiences and attractions with detailed information
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Travel Experience?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of travelers who trust TravelAI for their perfect trips
          </p>
          <Link href="/sign-in">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-8 py-3">
              Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Plane className="h-6 w-6 text-blue-400" />
              <span className="text-xl font-bold">TravelAI</span>
            </div>
            <p className="text-gray-400 mb-8">
              Your intelligent travel companion for perfect trips.
            </p>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 TravelAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
