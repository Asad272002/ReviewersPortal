import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { User } from '@/types/auth'
import { supabaseService } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    let username = ''
    let password = ''

    if (contentType.includes('application/json')) {
      const data = await request.json()
      username = String(data?.username || '').trim()
      password = String(data?.password || '')
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const raw = await request.text()
      const params = new URLSearchParams(raw)
      username = String(params.get('username') || '').trim()
      password = String(params.get('password') || '')
    } else if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      username = String(form.get('username') || '').trim()
      password = String(form.get('password') || '')
    } else {
      const raw = await request.text()
      try {
        const data = raw ? JSON.parse(raw) : {}
        username = String(data?.username || '').trim()
        password = String(data?.password || '')
      } catch (e) {
        return NextResponse.json(
          { success: false, message: 'Invalid request body' },
          { status: 400 }
        )
      }
    }

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      )
    }

    const dbUser = await supabaseService.validateUserCredentials(username, String(password))
    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const roleLower = String(dbUser.role || '').toLowerCase().replace(/\s+/g, '_')
    const normalizedRole = roleLower === 'admin' ? 'admin' : roleLower === 'team_leader' ? 'team' : roleLower === 'team' ? 'team' : 'reviewer'

    const secretKey = process.env.JWT_SECRET || 'your-secret-key'
    const secret = new TextEncoder().encode(secretKey)

    const token = await new SignJWT({
      userId: dbUser.id,
      username: dbUser.username,
      name: dbUser.name,
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
      maxAge: 60 * 60 * 24,
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