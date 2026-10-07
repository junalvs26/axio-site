import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join } from 'node:path';

const root = process.env.ROOT ?? 'dist-e2e';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.mp4': 'video/mp4', '.json': 'application/json', '.avif': 'image/avif' };

createServer(async (req, res) => {
  let path = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try { if ((await stat(path)).isDirectory()) path = join(path, 'index.html'); } catch { res.writeHead(404).end(); return; }
  const type = types[extname(path)] ?? 'application/octet-stream';
  const range = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
  if (range) {
    // Lê só o trecho pedido: o vídeo tem dezenas de MB e o leitor de quadros pede um segmento por vez.
    const size = (await stat(path)).size;
    const start = Number(range[1]); const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    createReadStream(path, { start, end }).pipe(res); return;
  }
  const body = await readFile(path);
  res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': body.length }).end(body);
}).listen(Number(process.env.PORT ?? 4322));
