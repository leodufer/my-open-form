import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await context.params

  if (!slug || slug.length === 0) {
    return NextResponse.redirect(new URL('/docs/index.html', request.url))
  }

  const docsRoot = path.resolve(process.cwd(), 'docs')
  const requestedPath = path.resolve(docsRoot, ...slug)

  if (requestedPath !== docsRoot && !requestedPath.startsWith(docsRoot + path.sep)) {
    return NextResponse.json({ error: 'Acceso no permitido' }, { status: 403 })
  }

  try {
    const fileStat = await stat(requestedPath)
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
    }

    const content = await readFile(requestedPath)
    const ext = path.extname(requestedPath).toLowerCase()
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
  }
}

