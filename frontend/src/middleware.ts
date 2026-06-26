import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const backendUrl = process.env.BACKEND_PROXY_URL || 'http://localhost:3001/api';
  
  // Extract path and query params from the incoming /api request
  const path = request.nextUrl.pathname.replace(/^\/api/, '');
  const searchParams = request.nextUrl.search;
  
  // Build dynamic destination url using runtime environment variable
  const destination = `${backendUrl}${path}${searchParams}`;
  
  return NextResponse.rewrite(new URL(destination));
}

export const config = {
  matcher: '/api/:path*',
};
