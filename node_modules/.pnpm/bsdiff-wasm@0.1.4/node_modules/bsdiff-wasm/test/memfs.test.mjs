import assert from 'assert';
import { loadBsdiff, loadBspatch } from '../dist/main.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('memfs test for browser', function () {
  const port = 3000;
  const sockets = new Set();
  let server;

  before(done => {
    server = http.createServer((req, res) => {
      const filename = path.join(__dirname, req.url);
      fs.readFile(filename).then(data => {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.end(data)
      });
    }).listen(3000, done);
    server.on('connection', (socket) => {
      sockets.add(socket);
      socket.on('close', () => {
        sockets.delete(socket);
      });
    });
  });

  after(done => {
    sockets.forEach(socket => socket.destroy());
    server.close(done);
  });

  it('test create diff', async () => {
    const bsdiff = await loadBsdiff();
    await writeFiles(bsdiff);
    const exitStatus = await bsdiff.callMain(['assets/egg_sushi.png', 'assets/tuna_sushi.png', 'out/egg_tuna.bsdiff']);
    assert.equal(exitStatus, 0, 'exitStatus === 0');
    const assetDiff = await fs.readFile(path.join(__dirname, 'assets/egg_tuna.bsdiff'));
    assert.notEqual(assetDiff.length, 0, 'assetDiff.length != 0');
    const outDiff = Buffer.from(bsdiff.FS.readFile('out/egg_tuna.bsdiff'));
    assert.notEqual(outDiff.length, 0, 'outDiff.length != 0');
    assert.deepStrictEqual(assetDiff, outDiff, 'assetDiff === outDiff');
  });

  it('test apply patch', async () => {
    const bspatch = await loadBspatch();
    await writeFiles(bspatch);
    const exitStatus = await bspatch.callMain(['assets/egg_sushi.png', 'out/tuna_sushi.png', 'assets/egg_tuna.bsdiff']);
    assert.equal(exitStatus, 0, 'exitStatus === 0');
    const assetPatched = await fs.readFile(path.join(__dirname, 'assets/tuna_sushi.png'));
    assert.notEqual(assetPatched.length, 0, 'assetPatched.length != 0');
    const outPatched = Buffer.from(bspatch.FS.readFile('out/tuna_sushi.png'));
    assert.notEqual(outPatched.length, 0, 'outPatched.length != 0');
    assert.deepStrictEqual(assetPatched, outPatched, 'assetPatched === outPatched');
  });

  async function writeFiles(module) {
    module.FS.mkdir('/working');
    module.FS.mkdir('/working/assets');
    module.FS.mkdir('/working/out');
    module.FS.chdir('/working');
    for (const filename of ['assets/egg_sushi.png', 'assets/tuna_sushi.png', 'assets/egg_tuna.bsdiff']) {
      const fileurl = path.join(`http://localhost:${port}/`, filename);
      const arrayBuffer = await fetch(fileurl).then(response => response.arrayBuffer());
      const uint8Array = new Uint8Array(arrayBuffer);
      module.FS.writeFile(filename, uint8Array);
    }
  }
});
