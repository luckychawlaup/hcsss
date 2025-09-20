// For App Router: /app/api/imagekit-auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
    try {
        const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
        const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
        
        if (!privateKey || !publicKey) {
            console.error('Missing ImageKit credentials');
            return NextResponse.json(
                { error: 'Server configuration error' }, 
                { status: 500 }
            );
        }
        
        // Generate authentication parameters
        const token = crypto.randomUUID();
        const expire = Math.floor(Date.now() / 1000) + 2400; // 40 minutes from now
        
        // Create signature
        const stringToSign = token + expire;
        const signature = crypto
            .createHmac('sha1', privateKey)
            .update(stringToSign)
            .digest('hex');
        
        const authData = {
            token,
            expire,
            signature
        };
        
        console.log('Generated ImageKit auth token');
        
        return NextResponse.json(authData);
    } catch (error) {
        console.error('ImageKit auth error:', error);
        return NextResponse.json(
            { error: 'Authentication failed' }, 
            { status: 500 }
        );
    }
}
