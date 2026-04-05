const APP_BASE_URL = "https://linksnip-iota.vercel.app";

export function shortUrl(code) {
  return `${APP_BASE_URL}/${code}`;
}