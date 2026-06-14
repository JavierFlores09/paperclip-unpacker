import assert from 'assert';
import { loadBsdiff, loadBspatch } from '../dist/main.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



describe('nodefs test for nodejs', () => {
  before(async () => {
    await fs.mkdir(path.join(__dirname, 'out'), { recursive: true });
  });

  it('test create diff', async () => {
    const bsdiff = await loadBsdiff();
    mountNodeFS(bsdiff);
    const exitStatus = await bsdiff.callMain(['assets/egg_sushi.png', 'assets/tuna_sushi.png', 'out/egg_tuna.bsdiff']);
    assert.equal(exitStatus, 0, 'exitStatus === 0');
    const assetDiff = await fs.readFile(path.join(__dirname, 'assets/egg_tuna.bsdiff'));
    assert.notEqual(assetDiff.length, 0, 'assetDiff.length != 0');
    const outDiff = await fs.readFile(path.join(__dirname, 'out/egg_tuna.bsdiff'));
    assert.notEqual(outDiff.length, 0, 'outDiff.length != 0');
    assert.deepStrictEqual(assetDiff, outDiff, 'assetDiff === outDiff');
  });

  it('test apply patch', async () => {
    const bspatch = await loadBspatch();
    mountNodeFS(bspatch);
    const exitStatus = await bspatch.callMain(['assets/egg_sushi.png', 'out/tuna_sushi.png', 'assets/egg_tuna.bsdiff']);
    assert.equal(exitStatus, 0, 'exitStatus === 0');
    const assetPatched = await fs.readFile(path.join(__dirname, 'assets/tuna_sushi.png'));
    assert.notEqual(assetPatched.length, 0, 'assetPatched.length != 0');
    const outPatched = await fs.readFile(path.join(__dirname, 'out/tuna_sushi.png'));
    assert.notEqual(outPatched.length, 0, 'outPatched.length != 0');
    assert.deepStrictEqual(assetPatched, outPatched, 'assetPatched === outPatched');
  });

  function mountNodeFS(module) {
    const working = '/working';
    module.FS.mkdir(working);
    module.FS.mount(module.NODEFS, { root: __dirname }, working);
    module.FS.chdir(working);
  }
});

