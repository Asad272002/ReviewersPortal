import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { User } from '@/app/types/auth'
import { supabaseService } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    // Robust parsing to avoid JSON.parse errors on empty/invalid body
    const raw = await request.text()
    let data: any = {}
    if (raw) {
      try {
        data = JSON.parse(raw)
      } catch (e) {
        return NextResponse.json(
          { success: false, message: 'Invalid JSON body' },
          { status: 400 }
        )
      }
    }

    const rawUsername = data?.username
    const rawPassword = data?.password

    const trimmedUsername = String(rawUsername || '').trim()
    if (!trimmedUsername || !rawPassword) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Validate against Supabase user_app
    const dbUser = await supabaseService.validateUserCredentials(trimmedUsername, String(rawPassword))
    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const normalizedRole = dbUser.role?.toLowerCase() === 'reviewer' ? 'reviewer' : dbUser.role

    const secretKey = process.env.JWT_SECRET || 'your-secret-key'
    const secret = new TextEncoder().encode(secretKey)

    const token = await new SignJWT({
      userId: dbUser.id,
      username: dbUser.username,
      role: normalizedRole,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret)

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: { id: dbUser.id, username: dbUser.username, name: dbUser.name, role: normalizedRole as User['role'] },
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
      sameSite: 'lax',
    })

    return response
  } catch (error) {
    console.error('Error during Supabase authentication:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}