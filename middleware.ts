import { NextResponse } from "next/server";

export function middleware(request) {
  // Retrieve the current response
  const res = NextResponse.next();

  // Add the CORS headers to the response
  res.headers.append('Access-Control-Allow-Credentials', "true");
  res.headers.append('Access-Control-Allow-Origin', '*'); // replace this your actual origin
  res.headers.append('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
  res.headers.append(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  return res;
}

// Specify the paths where this middleware should run
export const config = {
  matcher: '/api/:path*',
};
