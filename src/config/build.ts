/**
 * Build Configuration
 * 
 * Two build variants:
 * - 'private': Jeff's personal build, connects to OpenClaw gateway
 * - 'public': Google Play build, uses OpenAI API directly
 * 
 * Switch by changing BUILD_VARIANT below before building.
 */

export type BuildVariant = 'private' | 'public';

// ================================================
// CHANGE THIS TO SWITCH BUILD VARIANTS
// ================================================
export const BUILD_VARIANT: BuildVariant = 'private';
// ================================================

// Jeff's gateway config (private build)
const PRIVATE_CONFIG = {
  // Local network
  gatewayLocalUrl: 'http://192.168.4.245:18789',
  // Tailscale (works from anywhere — primary default)
  gatewayTailscaleUrl: 'https://chucks-server.tailb484c2.ts.net:18789',
  // Auth token intentionally not committed; enter it in Settings
  gatewayToken: '',
  // Default gateway URL — Tailscale hostname so it works everywhere out of the box
  defaultGatewayUrl: 'https://chucks-server.tailb484c2.ts.net:18789',
};

// Public config (Google Play build)
const PUBLIC_CONFIG = {
  defaultModel: 'gpt-4o-mini',
};

export function isPrivateBuild(): boolean {
  return BUILD_VARIANT === 'private';
}

export function isPublicBuild(): boolean {
  return BUILD_VARIANT === 'public';
}

export function getPrivateConfig() {
  return PRIVATE_CONFIG;
}

export function getPublicConfig() {
  return PUBLIC_CONFIG;
}
