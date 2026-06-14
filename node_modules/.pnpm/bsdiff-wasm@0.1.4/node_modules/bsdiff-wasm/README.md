# bsdiff-wasm

`bsdiff/bspatch` compiled to WebAssembly.

This is a rebuild of [bsdiff (4.3-23)](https://packages.debian.org/en/bookworm/bsdiff) maintained by debian and is fully compatible.
The original was developed by Colin Percival. Please see http://www.daemonology.net/bsdiff/.

Demo: https://kairi003.github.io/bsdiff-wasm/

## Install

```sh
npm install bsdiff-wasm
```
or use any CDN service like https://unpkg.com/bsdiff-wasm

## Usage

Examples of an operation equivalent to `bsdiff old.bin new.bin patch.bsdiff`.

For more information, see [test](./test), [docs](./docs) or [demo page](https://kairi003.github.io/bsdiff-wasm/).

### browser

```html
<script type="module">
  import { loadBsdiff, loadBspatch } from 'https://unpkg.com/bsdiff-wasm';
  const bsdiff = await loadBsdiff();
  await fetch('./old.bin')
    .then(res => res.arrayBuffer())
    .then(buf => bsdiff.FS.writeFile('old.bin', new Uint8Array(buf)));
  await fetch('./new.bin')
    .then(res => res.arrayBuffer())
    .then(buf => bsdiff.FS.writeFile('new.bin', new Uint8Array(buf)));
  bsdiff.callMain(['old.bin', 'new.bin', 'patch.bsdiff']);
  const patch = bsdiff.FS.readFile('patch.bsdiff');
  console.log(patch);
</script>
```

### node.js

```js
import { loadBsdiff, loadBspatch } from 'bsdiff-wasm';
const bsdiff = await loadBsdiff();
const workdir = '/working';
bsdiff.FS.mkdir(workdir);
bsdiff.FS.mount(bsdiff.NODEFS, { root: process.cwd() }, workdir);
bsdiff.FS.chdir(workdir);
bsdiff.callMain(['old.bin', 'new.bin', 'patch.bsdiff']);
```

## Build

Some commands need to be modified for windows because it is designed for bash.

### shell

```sh
git submodule update --init --recursive
docker build -t bsdiff-wasm-build .
docker run --rm -v $PWD:/src -u $(id -u):$(id -g) -w /src bsdiff-wasm-build /bin/bash build.sh
bash postbuild.sh
```

### npm

```sh
git submodule update --init --recursive
npm install
```

## Test

Probably cross-platform.

```sh
npm test
```

