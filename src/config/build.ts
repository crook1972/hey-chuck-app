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
  // Tailscale (works from anywhere)
  gatewayTailscaleUrl: 'http://100.124.133.38:18789',
  // Pre-filled auth token
  gatewayToken: '24f4a709604098d908618aa1c8877baadc2b9a79a0d5787d',
  // Default gateway URL (Tailscale for remote access)
  defaultGatewayUrl: 'http://100.124.133.38:18789',
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
