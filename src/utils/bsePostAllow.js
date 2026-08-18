function isExplicitFalse(value) {
  return value === false || value === 'false' || value === 0 || value === '0';
}

function isExplicitTrue(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function firstFlag(...values) {
  for (const value of values) {
    if (isExplicitFalse(value)) {
      return false;
    }
    if (isExplicitTrue(value)) {
      return true;
    }
  }
  return undefined;
}

/**
 * Read `bse_post_allow` from login/profile-style payloads.
 * Returns true/false when present, otherwise undefined.
 */
export function readBsePostAllowFlag(source) {
  if (source == null || typeof source !== 'object') {
    return undefined;
  }
  const nested = source.data && typeof source.data === 'object' ? source.data : null;
  return firstFlag(
    source.bse_post_allow,
    source.bsePostAllow,
    nested?.bse_post_allow,
    nested?.bsePostAllow,
    source.user?.bse_post_allow,
    nested?.user?.bse_post_allow,
  );
}

/** Posting to BSE is allowed unless the API flag is explicitly false. */
export function isBsePostAllowed(source) {
  return readBsePostAllowFlag(source) !== false;
}
