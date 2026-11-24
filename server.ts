import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = express();
const PORT = 3000;

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

let cachedCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  if (cachedCerts && Date.now() < cachedCerts.expiresAt) {
    return cachedCerts.certs;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error('Unable to fetch Firebase public certificates.');
  }
  const certs = (await resp.json()) as Record<string, string>;
  cachedCerts = { certs, expiresAt: Date.now() + 60 * 60 * 1000 };
  return certs;
}

async function verifyFirebaseIdToken(token: string): Promise<{ uid: string; email?: string }> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [headerB64, payloadB64, sigB64] = parts;

  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8')) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    email?: string;
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Invalid token algorithm');
  }
  if (payload.aud !== firebaseConfig.projectId) {
    throw new Error('Token audience mismatch');
  }
  if (payload.iss !== `https://securetoken.google.com/${firebaseConfig.projectId}`) {
    throw new Error('Token issuer mismatch');
  }
  if (!payload.sub || !payload.exp || payload.exp * 1000 <= Date.now()) {
    throw new Error('Token expired or missing subject');
  }

  const certs = await getFirebasePublicCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error('Unknown token signing key');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  const valid = verifier.verify(cert, Buffer.from(sigB64, 'base64url'));
  if (!valid) {
    throw new Error('Invalid token signature');
  }

  return { uid: payload.sub, email: payload.email };
}

function detectImageExtension(buffer: Buffer, mime: string): string | null {
  if (buffer.length < 12) return null;
  const cleanMime = mime.toLowerCase();
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isWebp =
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  if (isJpeg && (!cleanMime || cleanMime.includes('jpeg') || cleanMime.includes('jpg') || cleanMime === 'application/octet-stream')) return '.jpg';
  if (isPng && (!cleanMime || cleanMime.includes('png') || cleanMime === 'application/octet-stream')) return '.png';
  if (isWebp && (!cleanMime || cleanMime.includes('webp') || cleanMime === 'application/octet-stream')) return '.webp';
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.use(express.json({ limit: '1mb' }));

// Safe uploaded image serving with path traversal confinement
app.get('/uploads/:filename', (req: Request, res: Response) => {
  const rawName = String(req.params.filename || '');
  if (!/^[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(rawName)) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }
  const resolvedPath = path.resolve(uploadsDir, rawName);
  if (!resolvedPath.startsWith(uploadsDir + path.sep) || !fs.existsSync(resolvedPath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(resolvedPath);
});

// Authenticated image upload endpoint returning relative URL for Firestore item documents
app.post('/api/upload', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required to upload photographs.' });
    return;
  }

  try {
    await verifyFirebaseIdToken(authHeader.slice(7).trim());
  } catch {
    res.status(401).json({ error: 'Invalid or expired Firebase authentication token.' });
    return;
  }

  upload.single('image')(req, res, (uploadErr) => {
    if (uploadErr) {
      if (uploadErr instanceof multer.MulterError && uploadErr.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'Image file size must be 5 MB or smaller.' });
        return;
      }
      res.status(400).json({ error: 'Invalid image upload request.' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No image file provided.' });
      return;
    }

    const ext = detectImageExtension(req.file.buffer, req.file.mimetype);
    if (!ext) {
      res.status(400).json({ error: 'Only valid JPG, PNG, or WEBP photographs are allowed.' });
      return;
    }

    const safeFilename = `item_${crypto.randomUUID()}${ext}`;
    const targetPath = path.resolve(uploadsDir, safeFilename);
    if (!targetPath.startsWith(uploadsDir + path.sep)) {
      res.status(400).json({ error: 'Invalid upload path.' });
      return;
    }

    fs.writeFileSync(targetPath, req.file.buffer);
    res.status(201).json({ imageUrl: `/uploads/${safeFilename}` });
  });
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/')) {
    console.error('API error:', err);
    res.status(400).json({ error: 'Invalid request payload or server error.' });
    return;
  }
  next(err);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusFind server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
