const WITHDRAWAL_PATH = "/a/withdrawal";

// Rewrite a merchant menu link to /a/withdrawal into the current locale's URL
// context — {root}/a/withdrawal?locale={locale} — so it matches the app's button
// blocks. Keeping the link locale-prefixed (e.g. /de/a/withdrawal) lets the
// theme's native language selector re-localize the path on the form page, and the
// ?locale= tells Rails which translation to render (Shopify strips the path locale
// before it reaches the app, so the query is the only locale signal the app gets).
function localize(href, locale, root) {
  if (typeof href !== "string") return href;

  const hashIndex = href.indexOf("#");
  const hash = hashIndex === -1 ? "" : href.slice(hashIndex);
  const noHash = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const path = noHash.split("?")[0];

  if (!isWithdrawalPath(path)) return href;

  const originMatch = path.match(/^(https?:\/\/[^/]+)/i);
  const origin = originMatch ? originMatch[1] : "";
  const query = locale ? `?locale=${encodeURIComponent(locale)}` : "";

  return `${origin}${root}${WITHDRAWAL_PATH}${query}${hash}`;
}

function isWithdrawalPath(path) {
  return /^([a-z][a-z0-9+.-]*:\/\/[^/]+)?(\/[a-z]{2}(-[a-z]{2,4})?)?\/a\/withdrawal\/?$/i.test(path);
}

function rewriteAll(locale, root) {
  document.querySelectorAll(`a[href*="${WITHDRAWAL_PATH}"]`).forEach((a) => {
    a.setAttribute("href", localize(a.getAttribute("href"), locale, root));
  });
}

if (typeof document !== "undefined") {
  const script = document.querySelector("script[data-anv-withdrawal-locale]");
  const locale = script && script.dataset.anvWithdrawalLocale;
  // root_url is "/" for the primary language; normalize to "" so we never emit a
  // double slash, and strip any trailing slash on localized roots ("/de/" -> "/de").
  const root = ((script && script.dataset.anvWithdrawalRoot) || "").replace(/\/+$/, "");
  if (locale) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => rewriteAll(locale, root));
    } else {
      rewriteAll(locale, root);
    }
    document.addEventListener(
      "click",
      (e) => {
        const a = e.target.closest && e.target.closest(`a[href*="${WITHDRAWAL_PATH}"]`);
        if (a) a.setAttribute("href", localize(a.getAttribute("href"), locale, root));
      },
      true
    );
  }
}
