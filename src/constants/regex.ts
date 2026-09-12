/**
 * Username
 * - Lowercase letters
 * - Numbers
 * - Underscores
 */
export const USERNAME_REGEX = /^[a-z0-9_]+$/;

/**
 * Name
 * - Letters
 * - Allows spaces between words
 * - Supports common Unicode letters
 */
export const NAME_REGEX = /^[\p{L}]+(?:[\s'-][\p{L}]+)*$/u;

/**
 * Strong password
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 * - No whitespace
 */
export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z])\S+$/;

/**
 * Hexadecimal color
 * Supports #RGB, #RGBA, #RRGGBB and #RRGGBBAA
 */
export const HEX_COLOR_REGEX = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
