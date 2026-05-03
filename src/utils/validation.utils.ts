import validator from 'validator';
import { parsePhoneNumberWithError } from 'libphonenumber-js';
import axios from 'axios';
import crypto from 'crypto';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

// IANA TLD cache (fetched at first use)
let ianaTlds: Set<string> | null = null;

const fetchIanaTlds = async (): Promise<Set<string>> => {
  try {
    const response = await axios.get('https://data.iana.org/TLD/tlds-alpha-by-domain.txt', {
      timeout: 5000
    });
    const lines: string[] = response.data.split('\n');
    const tlds = new Set<string>();
    for (const line of lines) {
      const trimmed = line.trim().toUpperCase();
      if (trimmed && !trimmed.startsWith('#')) {
        tlds.add(trimmed);
      }
    }
    return tlds;
  } catch {
    // Fallback to common TLDs if IANA is unreachable
    return new Set([
      'COM', 'NET', 'ORG', 'EDU', 'GOV', 'IO', 'CO', 'INFO', 'BIZ',
      'DE', 'UK', 'FR', 'IT', 'ES', 'NL', 'PL', 'RU', 'BR', 'AU',
      'CA', 'JP', 'CN', 'IN', 'MX', 'BA', 'HR', 'RS', 'ME', 'SI'
    ]);
  }
};

export const getIanaTlds = async (): Promise<Set<string>> => {
  if (!ianaTlds) {
    ianaTlds = await fetchIanaTlds();
  }
  return ianaTlds;
};

// Known disposable email providers
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de',
  'guerrillamail.net', 'guerrillamail.org', 'spam4.me', 'trashmail.com',
  'trashmail.me', 'trashmail.net', 'dispostable.com', 'maildrop.cc',
  'fakeinbox.com', 'mailnull.com', 'spamgourmet.com', 'trashmail.at',
  'discard.email', 'spamspot.com', 'tempr.email', 'zetmail.com',
  'mohmal.com', 'tempinbox.com', 'throwam.com', 'spamherelots.com'
]);

export const validateFullName = (fullName: string): string | null => {
  if (!fullName || fullName.trim().length < 3) {
    return 'Full name must be at least 3 characters long';
  }
  if (fullName.trim().length > 100) {
    return 'Full name must not exceed 100 characters';
  }
  if (/<[^>]+>|javascript:/i.test(fullName)) {
    return 'Full name contains invalid characters';
  }
  return null;
};

export const validateUsername = (username: string, reservedList?: string[]): string | null => {
  if (!username || username.length <= 3) {
    return 'Username must be longer than 3 characters';
  }
  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    return 'Username must contain only letters and numbers';
  }
  // Check against DB reserved list if provided, otherwise use built-in list
  const reserved = reservedList || [
    'admin', 'root', 'system', 'support', 'administrator',
    'moderator', 'mod', 'help', 'info', 'contact', 'webmaster',
    'postmaster', 'hostmaster', 'api', 'www', 'mail', 'ftp',
    'user', 'test', 'guest', 'superuser', 'sysadmin', 'noreply',
    'security', 'abuse'
  ];
  if (reserved.map(r => r.toLowerCase()).includes(username.toLowerCase())) {
    return 'This username is reserved and cannot be used';
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least 1 lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least 1 number';
  if (!/[!@#$%^&*()_+\-={};':"\\|,.<>/?`~]/.test(password)) {
    return 'Password must contain at least 1 special character';
  }
  return null;
};

export const checkPasswordPwned = async (password: string): Promise<boolean> => {
  try {
    const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);
    const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`, {
      timeout: 5000
    });
    const lines: string[] = response.data.split('\n');
    for (const line of lines) {
      const [hashSuffix] = line.split(':');
      if (hashSuffix.trim() === suffix) return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const validateEmail = async (email: string): Promise<string | null> => {
  if (!validator.isEmail(email)) {
    return 'Invalid email format';
  }

  const parts = email.split('@');
  const domain = parts[1].toLowerCase();

  // Check disposable email
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return 'Disposable email addresses are not allowed';
  }

  // IANA TLD validation
  const tld = domain.split('.').pop()?.toUpperCase() || '';
  const validTlds = await getIanaTlds();
  if (!validTlds.has(tld)) {
    return `Invalid top-level domain: .${tld.toLowerCase()}`;
  }

  // MX record validation
  try {
    const mxRecords = await resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return 'Email domain does not have valid MX records';
    }
  } catch {
    return 'Email domain is not valid or does not exist';
  }

  return null;
};

export const validatePhone = (phone: string): string | null => {
  try {
    const phoneNumber = parsePhoneNumberWithError(phone);
    if (!phoneNumber || !phoneNumber.isValid()) {
      return 'Phone number is not valid';
    }
    const type = phoneNumber.getType();
    if (type !== undefined && type !== 'MOBILE' && type !== 'FIXED_LINE_OR_MOBILE') {
      return 'Phone number must be a mobile number';
    }
    return null;
  } catch {
    return 'Invalid phone number format. Use international format: +38761XXXXXXX';
  }
};
