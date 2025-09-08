'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// Important: Use dynamic import with SSR disabled
const Descope = dynamic(
  () => import('@descope/nextjs-sdk').then(mod => mod.Descope),
  { ssr: false }
);

export default function SignInPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Welcome to TravelAI</h2>
          <p className="mt-2 text-gray-600">Sign in to start planning your perfect trip</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <Descope
            projectId={process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!}
            flowId="sign-up-or-in"
            onSuccess={() => {
              console.log('Authentication successful');
              router.push('/dashboard');
            }}
            onError={(error: any) => {
              console.error('Authentication error:', error);
            }}
            theme="light"
          />
        </div>

        <div className="text-center text-sm text-gray-600">
          <p>Secure authentication powered by Descope</p>
        </div>
      </div>
    </div>
  );
}
