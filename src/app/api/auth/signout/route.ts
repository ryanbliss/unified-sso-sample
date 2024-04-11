import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers'

/**
 * Rudimentary signout endpoint. In production, you should revoke the old token as well.
 * @param req request
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
    cookies().delete('Authorization');
    return NextResponse.json({
        success: true,
    });;
}
