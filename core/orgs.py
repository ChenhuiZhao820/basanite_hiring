"""
Org-domain utilities.

The auto-join feature lets an org owner say "anyone who signs up with an
@maxwellbond.com email becomes a member of this org automatically". For
that to be safe we have to refuse to honour any auto-join lookup against
free email providers — otherwise the first hirer to set
auto_join_domain='gmail.com' would silently absorb every Gmail-based
signup on the platform.

The blocklist is intentionally generous; we'd rather reject a domain
that turned out to be a real corporate one (the owner can email us)
than admit a free provider.
"""

from __future__ import annotations


# Common free webmail providers. Lowercase, stripped of any subdomain.
FREE_EMAIL_DOMAINS: frozenset[str] = frozenset({
    "gmail.com",
    "googlemail.com",
    "outlook.com",
    "outlook.co.uk",
    "hotmail.com",
    "hotmail.co.uk",
    "live.com",
    "live.co.uk",
    "msn.com",
    "yahoo.com",
    "yahoo.co.uk",
    "ymail.com",
    "rocketmail.com",
    "icloud.com",
    "me.com",
    "mac.com",
    "proton.me",
    "protonmail.com",
    "pm.me",
    "fastmail.com",
    "fastmail.fm",
    "yandex.com",
    "yandex.ru",
    "aol.com",
    "aim.com",
    "zoho.com",
    "tutanota.com",
    "gmx.com",
    "gmx.de",
    "mail.com",
})


def extract_email_domain(email: str | None) -> str | None:
    """Return the lower-cased domain part of an email, or None if malformed."""
    if not email or "@" not in email:
        return None
    domain = email.rsplit("@", 1)[-1].strip().lower()
    return domain or None


def is_free_email_domain(email_or_domain: str | None) -> bool:
    """True if the provided email or bare domain is in the blocklist."""
    if not email_or_domain:
        return False
    domain = (
        extract_email_domain(email_or_domain)
        if "@" in email_or_domain
        else email_or_domain.strip().lower()
    )
    return bool(domain) and domain in FREE_EMAIL_DOMAINS
