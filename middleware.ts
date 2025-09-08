import { authMiddleware } from '@descope/nextjs-sdk/server';

export default authMiddleware({
  projectId: process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!,
  publicRoutes: [
    '/',
    '/sign-in',
    '/api/public/*'
  ],
  logLevel: 'info'
});

export const config = {
  matcher: ['/((?!api/public|_next/static|_next/image|favicon.ico|manifest.json).*)'],
};
