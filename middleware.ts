import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Define protected routes that require authentication
const protectedRoutes = [
  '/admin-management',
  '/announcements',
  '/documents',
  '/guides',
  '/processes',
  '/resources',
  '/support',
  '/vote-proposals',
  '/chat',
  '/admin'
]

// Define public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/',
  '/api/auth/login'
]

// Define role-based route access
const roleBasedRoutes = {
  admin: ['/admin-management', '/admin'],
  reviewer: ['/announcements', '/documents', '/guides', '/processes', '/resources', '/support', '/vote-proposals', '/chat'],
  team_leader: ['/announcements', '/documents', '/guides', '/processes', '/resources', '/support', '/vote-proposals', '/chat']
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow access to public routes and API routes (except protected ones)
  if (publicRoutes.includes(pathname) || 
      pathname.startsWith('/_next') || 
      pathname.startsWith('/api/auth') ||
      pathname.includes('.')) {
    return NextResponse.next()
  }

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Get the token from cookies
  const token = request.cookies.get('token')?.value

  if (!token) {
    // Redirect to login if no token
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Verify the JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')
    const { payload } = await jwtVerify(token, secret)
    
    const userRole = payload.role as string
    const userId = payload.userId as string

    // Normalize reviewer roles (merge "Reviewer" and "reviewer" into "reviewer")
    const normalizedRole = userRole.toLowerCase() === 'reviewer' ? 'reviewer' : userRole

    // Check role-based access
    if (normalizedRole === 'admin') {
      // Admin has access to all routes
      return NextResponse.next()
    }

    // Check if user has access to the requested route based on their role
    const allowedRoutes = roleBasedRoutes[normalizedRole as keyof typeof roleBasedRoutes]
    const hasAccess = allowedRoutes?.some(route => pathname.startsWith(route))

    if (!hasAccess) {
      // Redirect to appropriate dashboard based on role
      let redirectPath = '/'
      if (normalizedRole === 'reviewer') {
        redirectPath = '/announcements'
      } else if (normalizedRole === 'team_leader') {
        redirectPath = '/announcements'
      }
      
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }

    // Add user info to headers for use in components
    const response = NextResponse.next()
    response.headers.set('x-user-id', userId)
    response.headers.set('x-user-role', normalizedRole)
    
    return response

  } catch (error) {
    console.error('JWT verification failed:', error)
    // Invalid token, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    
    // Clear the invalid token
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('token')
    
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}