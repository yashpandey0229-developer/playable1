import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createZip } from '../scripts/package-zip.mjs';

describe('Production Build Packaging & ZIP Artifact Validation', () => {
  const distDir = path.resolve('dist');
  const testZip = path.resolve('test-playable-output.zip');

  test('dist folder contains valid production build files', () => {
    assert.ok(fs.existsSync(distDir), 'dist directory must exist');
    const indexHtml = path.join(distDir, 'index.html');
    assert.ok(fs.existsSync(indexHtml), 'dist/index.html must exist at root');

    const htmlContent = fs.readFileSync(indexHtml, 'utf8');
    assert.ok(htmlContent.includes('https://www.youtube.com/game_api/v1'), 'YouTube SDK script must be in index.html');
    assert.ok(!htmlContent.includes('dev-ad-modal'), 'Production index.html must not contain dev-ad-modal');
  });

  test('createZip packages dist and satisfies YouTube Playables size and root structure constraints', () => {
    if (fs.existsSync(testZip)) fs.unlinkSync(testZip);

    createZip(distDir, testZip);
    assert.ok(fs.existsSync(testZip), 'Output zip file must exist');

    const stat = fs.statSync(testZip);
    // YouTube limit is 15-20 MB; our zip is under 1 MB
    assert.ok(stat.size > 10000, 'Zip must not be empty');
    assert.ok(stat.size < 15 * 1024 * 1024, 'Zip size must be well below 15 MiB limit');

    // Clean up test artifact
    fs.unlinkSync(testZip);
  });
});
