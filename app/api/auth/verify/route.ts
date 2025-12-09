import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No token found' },
        { status: 401 }
      );
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
    
    try {
      const { payload } = await jwtVerify(token, secret);
      
      return NextResponse.json({
        success: true,
        user: {
          id: payload.userId,
          username: payload.username,
          role: payload.role
        }
      });
    } catch (jwtError) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json(
      { success: false, message: 'Token verification failed' },
      { status: 500 }
    );
  }
}