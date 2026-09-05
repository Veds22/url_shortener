"""
Thin wrapper around a local GeoLite2 City database for click geolocation.

Design choices:
- The .mmdb file is loaded lazily and cached at module level, so the cost
  of opening it is paid once per worker process, not per lookup.
- If the file is missing (e.g. it hasn't been downloaded yet, see
  geoip/README.md), lookups return all-None fields rather than raising.
  This keeps the app fully functional without geo data rather than
  crashing the Celery worker on import.
- Private/reserved/loopback IPs (common in local dev, and possibly
  Cloud Run's internal networking) don't have a real-world location.
  These are treated the same as "not found" rather than as errors.
"""
import os
import logging
import ipaddress

import geoip2.database
import geoip2.errors

logger = logging.getLogger("app.core.geoip")

GEOIP_DB_PATH = os.getenv(
    "GEOIP_DB_PATH",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "geoip", "GeoLite2-City.mmdb"),
)

_reader = None
_warned_missing = False


def _get_reader():
    global _reader, _warned_missing

    if _reader is not None:
        return _reader

    if not os.path.exists(GEOIP_DB_PATH):
        if not _warned_missing:
            logger.warning(
                "GeoLite2 database not found at %s — click geolocation will be "
                "skipped until it's added. See geoip/README.md.",
                GEOIP_DB_PATH,
            )
            _warned_missing = True
        return None

    _reader = geoip2.database.Reader(GEOIP_DB_PATH)
    logger.info("Loaded GeoLite2 database from %s", GEOIP_DB_PATH)
    return _reader


def lookup_ip(ip: str) -> dict:
    """Resolve an IP to {country_code, region, city}, any of which may be
    None if the database is unavailable, the IP can't be resolved (private/
    reserved ranges), or the specific field isn't present for that IP.
    """
    empty = {"country_code": None, "region": None, "city": None}

    if not ip:
        return empty

    try:
        if ipaddress.ip_address(ip).is_private:
            return empty
    except ValueError:
        # Not a parseable IP at all (shouldn't normally happen, but don't
        # let a malformed X-Forwarded-For value break enrichment)
        return empty

    reader = _get_reader()
    if reader is None:
        return empty

    try:
        response = reader.city(ip)
    except geoip2.errors.AddressNotFoundError:
        return empty
    except Exception:
        logger.exception("Unexpected error during GeoLite2 lookup for IP %s", ip)
        return empty

    return {
        "country_code": response.country.iso_code,
        "region": response.subdivisions.most_specific.name,
        "city": response.city.name,
    }