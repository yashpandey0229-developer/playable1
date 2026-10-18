import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Pure Node.js zero-dependency cross-platform ZIP archiver for YouTube Playables.
 * Creates standard PKZIP 2.0 archives compatible with all extractors and YouTube ingestion.
 */

// CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

function calculateCrc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function collectFiles(dir, baseDir = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(collectFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      files.push({ fullPath, relPath });
    }
  }
  return files;
}

export function createZip(sourceDir, outputFile) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory "${sourceDir}" does not exist. Run "npm run build" first.`);
  }

  const files = collectFiles(sourceDir);
  if (files.length === 0) {
    throw new Error(`Source directory "${sourceDir}" is empty.`);
  }

  const fileEntries = [];
  const localHeaderChunks = [];
  let offset = 0;

  for (const file of files) {
    const data = fs.readFileSync(file.fullPath);
    const crc = calculateCrc32(data);
    const uncompressedSize = data.length;

    // Use deflateRaw (no zlib wrapper, RFC 1951)
    const compressedData = zlib.deflateRawSync(data, { level: 9 });
    const compressedSize = compressedData.length;

    const pathBytes = Buffer.from(file.relPath, 'utf8');

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + pathBytes.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4);         // Version needed to extract (2.0)
    localHeader.writeUInt16LE(0x0800, 6);     // General purpose bit flag (UTF-8)
    localHeader.writeUInt16LE(8, 8);          // Compression method (8 = Deflate)
    localHeader.writeUInt16LE(0, 10);         // Last mod file time
    localHeader.writeUInt16LE(0, 12);         // Last mod file date
    localHeader.writeUInt32LE(crc, 14);       // CRC-32
    localHeader.writeUInt32LE(compressedSize, 18); // Compressed size
    localHeader.writeUInt32LE(uncompressedSize, 22); // Uncompressed size
    localHeader.writeUInt16LE(pathBytes.length, 26); // Filename length
    localHeader.writeUInt16LE(0, 28);         // Extra field length
    pathBytes.copy(localHeader, 30);

    localHeaderChunks.push(localHeader, compressedData);

    fileEntries.push({
      relPath: file.relPath,
      pathBytes,
      crc,
      compressedSize,
      uncompressedSize,
      offset
    });

    offset += localHeader.length + compressedData.length;
  }

  // Central directory
  const centralDirChunks = [];
  let centralDirSize = 0;

  for (const entry of fileEntries) {
    const cdHeader = Buffer.alloc(46 + entry.pathBytes.length);
    cdHeader.writeUInt32LE(0x02014b50, 0); // Central directory header signature
    cdHeader.writeUInt16LE(20, 4);         // Version made by
    cdHeader.writeUInt16LE(20, 6);         // Version needed to extract
    cdHeader.writeUInt16LE(0x0800, 8);     // Flags (UTF-8)
    cdHeader.writeUInt16LE(8, 10);         // Compression method
    cdHeader.writeUInt16LE(0, 12);         // Mod time
    cdHeader.writeUInt16LE(0, 14);         // Mod date
    cdHeader.writeUInt32LE(entry.crc, 16); // CRC-32
    cdHeader.writeUInt32LE(entry.compressedSize, 20); // Compressed size
    cdHeader.writeUInt32LE(entry.uncompressedSize, 24); // Uncompressed size
    cdHeader.writeUInt16LE(entry.pathBytes.length, 28); // Filename length
    cdHeader.writeUInt16LE(0, 30);         // Extra field length
    cdHeader.writeUInt16LE(0, 32);         // File comment length
    cdHeader.writeUInt16LE(0, 34);         // Disk number start
    cdHeader.writeUInt16LE(0, 36);         // Internal file attributes
    cdHeader.writeUInt32LE(0, 38);         // External file attributes
    cdHeader.writeUInt32LE(entry.offset, 42); // Relative offset of local header
    entry.pathBytes.copy(cdHeader, 46);

    centralDirChunks.push(cdHeader);
    centralDirSize += cdHeader.length;
  }

  // End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);       // EOCD signature
  eocd.writeUInt16LE(0, 4);                // Number of this disk
  eocd.writeUInt16LE(0, 6);                // Disk with central directory
  eocd.writeUInt16LE(fileEntries.length, 8); // Total entries on this disk
  eocd.writeUInt16LE(fileEntries.length, 10); // Total entries
  eocd.writeUInt32LE(centralDirSize, 12);   // Central directory size
  eocd.writeUInt32LE(offset, 16);          // Offset of central directory
  eocd.writeUInt16LE(0, 20);               // Comment length

  const finalZipBuffer = Buffer.concat([...localHeaderChunks, ...centralDirChunks, eocd]);
  fs.writeFileSync(outputFile, finalZipBuffer);

  const stats = fs.statSync(outputFile);
  console.log(`[PackageZip] Created "${outputFile}" (${(stats.size / 1024).toFixed(1)} KB) containing ${fileEntries.length} files:`);
  fileEntries.forEach(f => console.log(`  - ${f.relPath} (${f.uncompressedSize} -> ${f.compressedSize} bytes)`));
}

// Run CLI if called directly
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('package-zip.mjs') || process.argv[1].endsWith('package-zip.js'));
if (isDirectRun) {
  const distDir = path.resolve('dist');
  const outFile = path.resolve('bottle-blast-playable.zip');
  createZip(distDir, outFile);
}
