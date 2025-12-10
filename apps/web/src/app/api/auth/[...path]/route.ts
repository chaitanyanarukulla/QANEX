import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function proxyRequest(request: NextRequest, { params }: { params: { path: string[] } }) {
  const pathSegments = params.path || [];
  const path = pathSegments.join('/');
  const url = `${API_URL}/api/auth/${path}${request.nextUrl.search}`;

  console.log('[Proxy] Forwarding request to:', url);

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  });

  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.text()
        : undefined,
    });

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    const data = await response.text();

    console.log('[Proxy] Response status:', response.status);

    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to API', details: String(error) },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function OPTIONS(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}
