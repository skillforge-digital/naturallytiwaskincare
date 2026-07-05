const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const cheerio = require('cheerio');
const mime = require('mime-types');

const OUTPUT_DIR = path.resolve('/workspace/clone-baseline');
const ROOT = new URL('https://naturallytiwaskincare.com/');
const EXTERNAL_ASSET_HOSTS = new Set([
  'cdn.shopify.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'maxcdn.bootstrapcdn.com',
  'unpkg.com',
]);

const ASSET_LINK_RELS = new Set([
  'stylesheet',
  'icon',
  'shortcut icon',
  'apple-touch-icon',
  'apple-touch-startup-image',
  'mask-icon',
  'preload',
  'prefetch',
  'modulepreload',
  'manifest',
]);

const STATE = {
  resourcePromises: new Map(),
  assetFailures: [],
};

function hash(input) {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 10);
}

function sanitizeSegment(segment) {
  return segment
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'index';
}

function assetRelPath(url, contentType = '', extensionHint = '') {
  const host = sanitizeSegment(url.hostname);
  const rawSegments = url.pathname.split('/').filter(Boolean);
  const segments = rawSegments.map((part) => sanitizeSegment(decodeURIComponent(part)));
  let fileName = segments.pop() || 'index';
  const extFromName = path.extname(fileName);
  let ext = extFromName;
  if (!ext && extensionHint) {
    ext = extensionHint.startsWith('.') ? extensionHint : `.${extensionHint}`;
  }
  if (!ext && contentType) {
    const inferred = mime.extension(contentType.split(';')[0].trim());
    if (inferred) {
      ext = `.${inferred}`;
    }
  }
  if (!ext) {
    ext = '.bin';
  }
  const baseName = extFromName ? fileName.slice(0, -extFromName.length) : fileName;
  const querySuffix = url.search ? `__${hash(url.search)}` : '';
  fileName = `${baseName || 'index'}${querySuffix}${ext}`;
  return path.join('_assets', host, ...segments, fileName);
}

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function relativeHref(fromAbsFile, toRelFile) {
  const fromDir = path.dirname(fromAbsFile);
  const targetAbs = path.join(OUTPUT_DIR, toRelFile);
  return toPosix(path.relative(fromDir, targetAbs));
}

function parseSrcset(value) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^(.*?)(\s+\S+)?$/);
      return {
        url: match ? match[1].trim() : entry,
        descriptor: match && match[2] ? match[2].trim() : '',
      };
    });
}

function scoreSrcsetDescriptor(descriptor) {
  if (!descriptor) {
    return 0;
  }
  const numeric = parseFloat(descriptor);
  if (descriptor.endsWith('w')) {
    return numeric;
  }
  if (descriptor.endsWith('x')) {
    return numeric * 1000;
  }
  return numeric || 0;
}

function pickBestSrcsetCandidate(value) {
  const candidates = parseSrcset(value);
  if (candidates.length === 0) {
    return null;
  }
  return candidates.sort((a, b) => scoreSrcsetDescriptor(b.descriptor) - scoreSrcsetDescriptor(a.descriptor))[0];
}

function isSkippableResource(urlString) {
  return (
    !urlString ||
    urlString.startsWith('data:') ||
    urlString.startsWith('blob:') ||
    urlString.startsWith('javascript:') ||
    urlString === '#'
  );
}

function shouldDownloadAsset(url) {
  if (!url) {
    return false;
  }
  if (url.hostname === ROOT.hostname) {
    if (url.pathname.startsWith('/checkouts/')) {
      return false;
    }
    if (url.pathname.includes('/checkout-web/')) {
      return false;
    }
    if (url.pathname.includes('/portable-wallets/')) {
      return false;
    }
    return true;
  }
  return EXTERNAL_ASSET_HOSTS.has(url.hostname);
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function listFiles(dir, matcher, result = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await listFiles(full, matcher, result);
    } else if (matcher(full)) {
      result.push(full);
    }
  }
  return result;
}

async function rewriteCssUrls(cssText, baseUrl, currentFileAbs, downloadResource) {
  const importPattern = /@import\s+(?:url\(\s*)?(?:(['"])(.*?)\1|([^'"\s)]+))\s*\)?/gi;
  let rewritten = cssText;
  const importMatches = [...rewritten.matchAll(importPattern)];
  for (const match of importMatches) {
    const original = match[0];
    const rawUrl = match[2] || match[3];
    if (isSkippableResource(rawUrl)) {
      continue;
    }
    const absolute = new URL(rawUrl, baseUrl);
    const relFile = await downloadResource(absolute, '.css');
    if (!relFile) {
      continue;
    }
    rewritten = rewritten.replace(original, `@import url("${relativeHref(currentFileAbs, relFile)}")`);
  }

  const urlPattern = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
  const urlMatches = [...rewritten.matchAll(urlPattern)];
  for (const match of urlMatches) {
    const original = match[0];
    const rawUrl = match[2];
    if (isSkippableResource(rawUrl)) {
      continue;
    }
    const absolute = new URL(rawUrl, baseUrl);
    const relFile = await downloadResource(absolute);
    if (!relFile) {
      continue;
    }
    rewritten = rewritten.replace(original, `url("${relativeHref(currentFileAbs, relFile)}")`);
  }

  return rewritten;
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get('content-type') || '',
  };
}

async function main() {
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

  const downloadResource = async (absoluteUrl, extensionHint = '') => {
    const key = absoluteUrl.toString();
    if (!shouldDownloadAsset(absoluteUrl)) {
      return null;
    }
    if (STATE.resourcePromises.has(key)) {
      return STATE.resourcePromises.get(key);
    }

    const promise = (async () => {
      try {
        const { buffer, contentType } = await fetchBuffer(key);
        const relFile = assetRelPath(absoluteUrl, contentType, extensionHint);
        const absFile = path.join(OUTPUT_DIR, relFile);
        await ensureDir(absFile);
        if (contentType.includes('text/css') || relFile.endsWith('.css')) {
          const rewritten = await rewriteCssUrls(buffer.toString('utf8'), absoluteUrl, absFile, downloadResource);
          await fs.writeFile(absFile, rewritten, 'utf8');
        } else {
          await fs.writeFile(absFile, buffer);
        }
        return relFile;
      } catch (error) {
        STATE.assetFailures.push({ url: key, error: String(error.message || error) });
        return null;
      }
    })();

    STATE.resourcePromises.set(key, promise);
    return promise;
  };

  const htmlFiles = await listFiles(
    OUTPUT_DIR,
    (file) => file.endsWith('.html') && !file.includes(`${path.sep}_assets${path.sep}`) && !file.includes(`${path.sep}_fallbacks${path.sep}`)
  );

  for (const htmlFile of htmlFiles) {
    const html = await fs.readFile(htmlFile, 'utf8');
    const page = manifest.pages.find((entry) => path.join(OUTPUT_DIR, entry.localPath) === htmlFile);
    const baseUrl = new URL(page ? page.finalUrl : ROOT.toString());
    const $ = cheerio.load(html, { decodeEntities: false });
    const jobs = [];

    $('link[href]').each((_, el) => {
      jobs.push(
        (async () => {
          const current = $(el).attr('href');
          if (!current) {
            return;
          }
          const rel = (($(el).attr('rel') || '') + '')
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean)
            .join(' ');
          if (!ASSET_LINK_RELS.has(rel)) {
            return;
          }
          const absolute = new URL(current, baseUrl);
          if (!shouldDownloadAsset(absolute)) {
            return;
          }
          const hint = rel.includes('stylesheet') ? '.css' : '';
          const relFile = await downloadResource(absolute, hint);
          if (relFile) {
            $(el).attr('href', relativeHref(htmlFile, relFile));
          }
        })()
      );
    });

    const singleAssetAttributes = [
      ['script[src]', 'src', '.js'],
      ['img[src]', 'src', ''],
      ['source[src]', 'src', ''],
      ['video[src]', 'src', ''],
      ['audio[src]', 'src', ''],
      ['input[src]', 'src', ''],
      ['meta[property="og:image"][content]', 'content', ''],
      ['meta[name="twitter:image"][content]', 'content', ''],
      ['video[poster]', 'poster', ''],
    ];

    for (const [selector, attr, hint] of singleAssetAttributes) {
      $(selector).each((_, el) => {
        jobs.push(
          (async () => {
            const current = $(el).attr(attr);
            if (isSkippableResource(current)) {
              return;
            }
            const absolute = new URL(current, baseUrl);
            if (!shouldDownloadAsset(absolute)) {
              return;
            }
            const relFile = await downloadResource(absolute, hint);
            if (relFile) {
              $(el).attr(attr, relativeHref(htmlFile, relFile));
            }
          })()
        );
      });
    }

    ['img[srcset]', 'source[srcset]'].forEach((selector) => {
      $(selector).each((_, el) => {
        jobs.push(
          (async () => {
            const current = $(el).attr('srcset');
            if (!current) {
              return;
            }
            const best = pickBestSrcsetCandidate(current);
            if (!best || isSkippableResource(best.url)) {
              return;
            }
            const absolute = new URL(best.url, baseUrl);
            if (!shouldDownloadAsset(absolute)) {
              return;
            }
            const relFile = await downloadResource(absolute);
            if (!relFile) {
              return;
            }
            const local = relativeHref(htmlFile, relFile);
            $(el).attr('srcset', best.descriptor ? `${local} ${best.descriptor}` : local);
            if ($(el).is('img')) {
              $(el).attr('src', local);
            }
          })()
        );
      });
    });

    $('style').each((_, el) => {
      jobs.push(
        (async () => {
          const css = $(el).html();
          if (!css) {
            return;
          }
          $(el).text(await rewriteCssUrls(css, baseUrl, htmlFile, downloadResource));
        })()
      );
    });

    $('[style]').each((_, el) => {
      jobs.push(
        (async () => {
          const css = $(el).attr('style');
          if (!css) {
            return;
          }
          $(el).attr('style', await rewriteCssUrls(css, baseUrl, htmlFile, downloadResource));
        })()
      );
    });

    await Promise.all(jobs);
    await fs.writeFile(htmlFile, $.html(), 'utf8');
    console.log(`Localized ${path.relative(OUTPUT_DIR, htmlFile)}`);
  }

  manifest.generatedAt = new Date().toISOString();
  manifest.assetFailureCount = STATE.assetFailures.length;
  manifest.assetFailures = STATE.assetFailures;
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(
    JSON.stringify(
      {
        htmlFiles: htmlFiles.length,
        assetFailureCount: STATE.assetFailures.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
