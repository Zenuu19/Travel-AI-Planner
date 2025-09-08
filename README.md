# Travel AI Planner

## 🌟 Project Overview

Travel AI Planner is an intelligent travel planning application that helps users create personalized itineraries with the power of AI. Simply tell us your destination and preferences, and our AI will create a detailed travel plan complete with activities, schedules, and automatic calendar integration.

## 👥 Team: Venture Vultures

- **Zenith Shah**
- **Mitali Prajapati** 
- **Kaushik Pathak**

## 🎯 Hackathon Theme: Theme 1

### Problem We Solve

Planning a trip can be overwhelming and time-consuming. Travelers often struggle with:
- Researching destinations and activities
- Creating detailed day-by-day itineraries
- Managing trip schedules and remembering activities
- Converting prices to their preferred currency
- Keeping track of planned trips

Our Travel AI Planner solves these challenges by providing an intelligent, automated solution that creates personalized itineraries in minutes and seamlessly integrates with your calendar for easy trip management.

## 🚀 What We've Built

### Core Features
- **AI-Powered Trip Planning**: Enter your destination, travel dates, and preferences to get a complete itinerary
- **Smart Itinerary Generation**: Detailed day-by-day plans with activities, timings, and descriptions
- **Google Calendar Integration**: Automatically save your trip itinerary to Google Calendar
- **Multi-Currency Support**: View prices in 40+ currencies with real-time exchange rates
- **Trip Management Dashboard**: Save, view, and manage all your planned trips
- **Secure Authentication**: User authentication powered by Descope
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### Key Capabilities
- Generate detailed travel itineraries for any destination
- Create individual calendar events for each day's activities
- Convert prices to preferred currency automatically
- Track and manage multiple trips in one dashboard
- Secure user authentication and data protection

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Modern UI component library
- **Lucide React** - Icon library

### Backend
- **Next.js API Routes** - Server-side API endpoints
- **Descope SDK** - Authentication and user management
- **Google Calendar API** - Calendar integration
- **Exchange Rate API** - Real-time currency conversion
- **Node.js** - Runtime environment

### Database & APIs
- **MongoDB** - Document database for trip storage
- **Descope Authentication API** - User authentication
- **Google Calendar API** - Calendar integration
- **Exchange Rate API** - Currency conversion
- **OpenAI/Gemini API** - AI-powered itinerary generation

## 🎬 Demo Video

🎥 **Watch our demo**: [https://youtu.be/w5utYQB2KbI](https://youtu.be/w5utYQB2KbI)

## ⚙️ Setup and Installation

### Prerequisites
- Node.js 18+ installed
- MongoDB database (local or cloud)
- Descope account and project
- Google Cloud Console project with Calendar API enabled
- API keys for currency conversion

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Zenuu19/Travel-AI-Planner.git
   cd Travel-AI-Planner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   # Descope Configuration
   NEXT_PUBLIC_DESCOPE_PROJECT_ID=your_descope_project_id
   DESCOPE_MANAGEMENT_KEY=your_descope_management_key

   # Google Calendar API
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Database
   MONGODB_URI=your_mongodb_connection_string

   # AI API (OpenAI/Gemini)
   OPENAI_API_KEY=your_openai_api_key
   # OR
   GEMINI_API_KEY=your_gemini_api_key

   # Currency API
   EXCHANGE_RATE_API_KEY=your_exchange_rate_api_key
   ```

4. **Database Setup**
   - Set up MongoDB database (local or MongoDB Atlas)
   - Update the connection string in your `.env.local` file

5. **Descope Configuration**
   - Create a Descope project
   - Configure Google OAuth as an outbound app in Descope
   - Add required scopes: `calendar.app.created`, `calendarlist.readonly`
   - Copy project ID and management key to `.env.local`

6. **Google Calendar API Setup**
   - Enable Google Calendar API in Google Cloud Console
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs for Descope
   - Copy client ID and secret to `.env.local`

7. **Run the development server**
   ```bash
   npm run dev
   ```

8. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔄 How to Use

1. **Sign Up/Login**: Create an account or login using the authentication system
2. **Plan a Trip**: Enter your destination, travel dates, and preferences
3. **Review Itinerary**: Check the AI-generated detailed itinerary
4. **Save to Calendar**: Connect your Google Calendar and save the trip
5. **Manage Trips**: View and manage all your saved trips in the dashboard
6. **Currency Conversion**: Prices automatically convert to your preferred currency

## 🚀 Future Enhancements

In the remaining development time, we plan to implement:

- **Flight Booking Integration**: Search and book flights directly through the platform
- **Hotel Booking System**: Find and reserve accommodations with real-time availability
- **Cab/Transportation Booking**: Book local transportation and transfers
- **Flight Seat Map**: Interactive seat selection for flight bookings
- **Various Trip Types**: Specialized planning for business travel, family trips, adventure travel, etc.
- **Rewards & Loyalty Program**: Earn points for bookings and get exclusive benefits
- **Advanced Trip Customization**: More detailed preferences and activity filters
- **Social Features**: Share itineraries and get recommendations from other travelers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## 📞 Contact

For questions or support, please reach out to the Venture Vultures team.

---

**Built with ❤️ by Team Venture Vultures**
