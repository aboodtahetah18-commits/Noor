import { createHash } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const DRIVE_DOWNLOAD = (id) => `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;

// Source of truth: Google Drive / Namaa_Design_OS_v1.2_PRODUCTION_READY_REFINED.
// Do not change an ID or digest without an approved identity release.
const ASSETS = [
  {
    key: 'namaa-logo-official',
    driveId: '1ZOm0xC79_utrqT5QkEzNEePjt78yU6U8',
    output: 'public/brand/ndos/namaa-logo-official.png',
    sha256: '8a33c0cf87ab536f393be496f25ee415ae337d54d3bb6a0cc68da737da997821',
  },
  {
    key: 'namaa-central-bank',
    driveId: '1hQKvOxxJwKZsNL4vUmTezGYTteXRYI2J',
    output: 'public/brand/ndos/banks/namaa-central-bank.png',
    sha256: '5ec6718ff167232e65eb4a1574920261ad8302c792ca5c97f868d3e2e817e0a3',
  },
  {
    key: 'hilal-bank',
    driveId: '13ScLgY2DhtYjaPP2tmptXMHX6hrB5QL2',
    output: 'public/brand/ndos/banks/hilal-bank.png',
    sha256: 'c984e24cb35081ba482ee5210f806c8cf5b4c7a04581045234d01b0989d266e8',
  },
  {
    key: 'malaa-bank',
    driveId: '1A1jhaxIuyr1S7crQO2ujaaa-I5xTcl1V',
    output: 'public/brand/ndos/banks/malaa-bank.png',
    sha256: 'a647dea7bca8225adc08b89b1b59a961631f64c4c0ac7e8ee6d9880d49c2edbe',
  },
  {
    key: 'investment-assets-bank',
    driveId: '1qaae53YMPoDIsuK5HM7pSmVIpgxBLdtn',
    output: 'public/brand/ndos/banks/investment-assets-bank.png',
    sha256: '8f0cc194968fca5843d029b13a8e34ca44b8a6c0dd73cb2bc0e03cc5fc2979b9',
  },
  {
    key: 'namaa-algorithmic-personas',
    driveId: '1u08y5cT-SbUPUhOY4Wj6pfJyvkQbeABj',
    output: 'public/brand/ndos/personas/namaa-algorithmic-personas.png',
    sha256: 'c374521369a186d5f62922c3e1ea213c2e516d834d167a346a9f9e60627d84be',
  },
];

function digest(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function fetchApprovedAsset(asset) {
  const response = await fetch(DRIVE_DOWNLOAD(asset.driveId), {
    redirect: 'follow',
    headers: { 'User-Agent': 'Namaa-NDOS-Sync/1.2' },
  });

  if (!response.ok) {
    throw new Error(`NDOS_ASSET_DOWNLOAD_FAILED key=${asset.key} status=${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('image/png') && !contentType.includes('application/octet-stream')) {
    throw new Error(`NDOS_ASSET_UNEXPECTED_CONTENT key=${asset.key} contentType=${contentType}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const actual = digest(buffer);
  if (actual !== asset.sha256) {
    throw new Error(`NDOS_ASSET_DIGEST_MISMATCH key=${asset.key} expected=${asset.sha256} actual=${actual}`);
  }
  return buffer;
}

for (const asset of ASSETS) {
  const target = join(ROOT, asset.output);
  const temporary = `${target}.ndos-tmp`;
  await mkdir(dirname(target), { recursive: true });
  try {
    const buffer = await fetchApprovedAsset(asset);
    await writeFile(temporary, buffer);
    await rename(temporary, target);
    console.log(`NDOS-ASSET-SYNC-PASS ${asset.key} sha256=${asset.sha256}`);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

console.log(`NDOS-ASSET-SYNC-PASS total=${ASSETS.length} version=1.2-FINAL`);
