const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { chromium } = require('playwright');
const cheerio = require('cheerio');
const mime = require('mime-types');

const START_URL = 'https://naturallytiwaskincare.com/';
const ROOT = new URL(START_URL);
const OUTPUT_DIR = path.resolve('/workspace/clone-baseline');
const FALLBACK_DIR = path.join(OUTPUT_DIR, '_fallbacks');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

const SKIP_PREFIXES = [
  '/cart',
  '/checkout',
  '/search',
  '/account',
  '/customer_authentication',
  '/challenge',
  '/tools/',
  '/cdn/',
  '/apps/',
  '/collections/vendors',
  '/collections/types',
];

const ALLOWED_PREFIXES = ['/', '/collections/', '/products/', '/pages/', '/blogs/', '/a/'];
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
  queued: new Set(),
  crawled: new Set(),
  pageRecords: [],
  pageFailures: [],
  assetFailures: [],
  resourcePromises: new Map(),
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

function normalizeDiscoveredUrl(rawUrl, baseUrl) {
  try {
    const absolute = new URL(rawUrl, baseUrl);
    absolute.hash = '';
    if (!/^https?:$/.test(absolute.protocol)) {
      return null;
    }
    if (absolute.hostname !== ROOT.hostname) {
      return absolute;
    }
    if (absolute.pathname.endsWith('/')) {
      absolute.pathname = absolute.pathname.replace(/\/+$/, '/') || '/';
    }
    const collectionProductMatch = absolute.pathname.match(/^\/collections\/[^/]+\/products\/([^/]+)$/);
    if (collectionProductMatch) {
      absolute.pathname = `/products/${collectionProductMatch[1]}`;
    }
    return absolute;
  } catch {
    return null;
  }
}

function shouldCrawlPage(url) {
  if (!url || url.hostname !== ROOT.hostname) {
    return false;
  }
  const pathname = url.pathname || '/';
  if (/^\/[a-z]{2}(\/|$)/.test(pathname)) {
    return false;
  }
  if (pathname.startsWith('/blogs/') && pathname !== '/blogs/blog' && pathname !== '/blogs/blog/') {
    return false;
  }
  if (pathname.match(/\.[a-zA-Z0-9]{1,6}$/)) {
    return false;
  }
  if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }
  if (!ALLOWED_PREFIXES.some((prefix) => prefix === '/' ? pathname === '/' : pathname.startsWith(prefix))) {
    return false;
  }
  if (url.search && !pathname.startsWith('/a/')) {
    return false;
  }
  return true;
}

function pageKey(url) {
  return url.toString();
}

function pageRelPath(url) {
  const parts = url.pathname
    .split('/')
    .filter(Boolean)
    .map((part) => sanitizeSegment(decodeURIComponent(part)));
  if (parts.length === 0) {
    return 'index.html';
  }
  const last = parts[parts.length - 1];
  if (url.search) {
    parts[parts.length - 1] = `${last}__${hash(url.search)}`;
  }
  return path.join(...parts, 'index.html');
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
  const rel = path.relative(fromDir, targetAbs);
  return toPosix(rel || path.basename(targetAbs));
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

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
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
    return !url.pathname.startsWith('/checkouts/');
  }
  return EXTERNAL_ASSET_HOSTS.has(url.hostname);
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
    let absolute;
    try {
      absolute = new URL(rawUrl, baseUrl);
    } catch {
      continue;
    }
    const relFile = await downloadResource(absolute, '.css');
    if (!relFile) {
      continue;
    }
    const local = relativeHref(currentFileAbs, relFile);
    rewritten = rewritten.replace(original, `@import url("${local}")`);
  }

  const urlPattern = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
  const urlMatches = [...rewritten.matchAll(urlPattern)];
  for (const match of urlMatches) {
    const original = match[0];
    const rawUrl = match[2];
    if (isSkippableResource(rawUrl)) {
      continue;
    }
    let absolute;
    try {
      absolute = new URL(rawUrl, baseUrl);
    } catch {
      continue;
    }
    const relFile = await downloadResource(absolute);
    if (!relFile) {
      continue;
    }
    const local = relativeHref(currentFileAbs, relFile);
    rewritten = rewritten.replace(original, `url("${local}")`);
  }

  return rewritten;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(FALLBACK_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

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
        const response = await context.request.get(key, {
          headers: { 'User-Agent': UA },
          maxRedirects: 5,
          failOnStatusCode: false,
          timeout: 20000,
        });
        if (!response.ok()) {
          throw new Error(`HTTP ${response.status()}`);
        }

        const contentType = response.headers()['content-type'] || '';
        const relFile = assetRelPath(absoluteUrl, contentType, extensionHint);
        const absFile = path.join(OUTPUT_DIR, relFile);
        await ensureDir(absFile);

        if (contentType.includes('text/css') || relFile.endsWith('.css')) {
          const css = await response.text();
          const rewritten = await rewriteCssUrls(css, absoluteUrl, absFile, downloadResource);
          await fs.writeFile(absFile, rewritten, 'utf8');
        } else {
          const body = Buffer.from(await response.body());
          await fs.writeFile(absFile, body);
        }
        return relFile;
      } catch (error) {
        STATE.assetFailures.push({
          url: key,
          error: String(error.message || error),
        });
        return null;
      }
    })();

    STATE.resourcePromises.set(key, promise);
    return promise;
  };

  const enqueue = (url) => {
    if (!shouldCrawlPage(url)) {
      return;
    }
    const key = pageKey(url);
    if (STATE.queued.has(key) || STATE.crawled.has(key)) {
      return;
    }
    STATE.queued.add(key);
  };

  enqueue(new URL(START_URL));

  while (STATE.queued.size > 0) {
    const currentKey = STATE.queued.values().next().value;
    STATE.queued.delete(currentKey);
    if (STATE.crawled.has(currentKey)) {
      continue;
    }

    const targetUrl = new URL(currentKey);
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    try {
      await page.goto(targetUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2500);
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let stagnant = 0;
          let lastHeight = 0;
          const timer = setInterval(() => {
            window.scrollBy(0, Math.max(800, Math.floor(window.innerHeight * 0.9)));
            const height = document.body.scrollHeight;
            const atBottom = window.scrollY + window.innerHeight >= height - 8;
            if (atBottom) {
              stagnant = height === lastHeight ? stagnant + 1 : 0;
              lastHeight = height;
              if (stagnant >= 2) {
                clearInterval(timer);
                setTimeout(resolve, 800);
              }
            }
          }, 250);
        });
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(750);

      const html = await page.content();
      const finalUrl = new URL(page.url());
      finalUrl.hash = '';

      const relHtml = pageRelPath(finalUrl);
      const absHtml = path.join(OUTPUT_DIR, relHtml);
      await ensureDir(absHtml);
      console.log(`Saving ${finalUrl.toString()} -> ${relHtml}`);

      const $ = cheerio.load(html, { decodeEntities: false });
      const discoveredUrls = [];

      const rewritePageHref = (rawHref) => {
        if (!rawHref || rawHref.startsWith('#')) {
          return rawHref;
        }
        let fragment = '';
        try {
          fragment = new URL(rawHref, finalUrl).hash || '';
        } catch {
          fragment = '';
        }
        const absolute = normalizeDiscoveredUrl(rawHref, finalUrl);
        if (!absolute) {
          return rawHref;
        }
        if (absolute.hostname !== ROOT.hostname) {
          return absolute.toString() + fragment;
        }
        if (!shouldCrawlPage(absolute)) {
          return absolute.toString() + fragment;
        }
        discoveredUrls.push(absolute);
        const local = relativeHref(absHtml, pageRelPath(absolute));
        return `${local}${fragment}`;
      };

      $('a[href]').each((_, el) => {
        const current = $(el).attr('href');
        const rewritten = rewritePageHref(current);
        if (rewritten) {
          $(el).attr('href', rewritten);
        }
      });

      const linkPromises = [];
      $('link[href]').each((_, el) => {
        linkPromises.push(
          (async () => {
            const current = $(el).attr('href');
            if (!current || current.startsWith('#')) {
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
            const absolute = new URL(current, finalUrl);
            const hint = rel.includes('stylesheet') ? '.css' : '';
            const relFile = await downloadResource(absolute, hint);
            if (relFile) {
              $(el).attr('href', relativeHref(absHtml, relFile));
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
          linkPromises.push(
            (async () => {
              const current = $(el).attr(attr);
              if (isSkippableResource(current)) {
                return;
              }
              const absolute = new URL(current, finalUrl);
              const relFile = await downloadResource(absolute, hint);
              if (relFile) {
                $(el).attr(attr, relativeHref(absHtml, relFile));
              }
            })()
          );
        });
      }

      ['img[srcset]', 'source[srcset]'].forEach((selector) => {
        $(selector).each((_, el) => {
          linkPromises.push(
            (async () => {
              const current = $(el).attr('srcset');
              if (!current) {
                return;
              }
              const best = pickBestSrcsetCandidate(current);
              if (!best || isSkippableResource(best.url)) {
                return;
              }
              const absolute = new URL(best.url, finalUrl);
              const relFile = await downloadResource(absolute);
              if (!relFile) {
                return;
              }
              const local = relativeHref(absHtml, relFile);
              $(el).attr('srcset', best.descriptor ? `${local} ${best.descriptor}` : local);
              if ($(el).is('img')) {
                $(el).attr('src', local);
              }
            })()
          );
        });
      });

      $('style').each((_, el) => {
        linkPromises.push(
          (async () => {
            const css = $(el).html();
            if (!css) {
              return;
            }
            const rewritten = await rewriteCssUrls(css, finalUrl, absHtml, downloadResource);
            $(el).text(rewritten);
          })()
        );
      });

      $('[style]').each((_, el) => {
        linkPromises.push(
          (async () => {
            const css = $(el).attr('style');
            if (!css) {
              return;
            }
            const rewritten = await rewriteCssUrls(css, finalUrl, absHtml, downloadResource);
            $(el).attr('style', rewritten);
          })()
        );
      });

      await Promise.all(linkPromises);
      await fs.writeFile(absHtml, $.html(), 'utf8');

      STATE.crawled.add(currentKey);
      STATE.pageRecords.push({
        sourceUrl: targetUrl.toString(),
        finalUrl: finalUrl.toString(),
        title: $('title').text().trim(),
        localPath: relHtml,
      });

      for (const discovered of discoveredUrls) {
        enqueue(discovered);
      }
    } catch (error) {
      const safeName = sanitizeSegment(targetUrl.pathname.replace(/\//g, '-')) || 'home';
      const screenshotRel = path.join('_fallbacks', `${safeName}__${hash(targetUrl.toString())}.png`);
      const screenshotAbs = path.join(OUTPUT_DIR, screenshotRel);
      await ensureDir(screenshotAbs);
      try {
        await page.screenshot({ path: screenshotAbs, fullPage: true });
      } catch {
        // Best effort only.
      }
      STATE.crawled.add(currentKey);
      STATE.pageFailures.push({
        url: targetUrl.toString(),
        error: String(error.message || error),
        screenshot: screenshotRel,
      });
    } finally {
      await page.close();
    }
  }

  const manifest = {
    startUrl: START_URL,
    generatedAt: new Date().toISOString(),
    pageCount: STATE.pageRecords.length,
    failedPageCount: STATE.pageFailures.length,
    assetFailureCount: STATE.assetFailures.length,
    pages: STATE.pageRecords.sort((a, b) => a.finalUrl.localeCompare(b.finalUrl)),
    failedPages: STATE.pageFailures,
    assetFailures: STATE.assetFailures,
  };

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  await browser.close();

  console.log(JSON.stringify({
    pageCount: manifest.pageCount,
    failedPageCount: manifest.failedPageCount,
    assetFailureCount: manifest.assetFailureCount,
    manifest: MANIFEST_PATH,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
