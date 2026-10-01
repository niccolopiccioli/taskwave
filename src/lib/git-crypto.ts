import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ENCRYPTION_SECRET =
  process.env.GIT_ENCRYPTION_KEY ||
  process.env.WEBHOOK_INTERNAL_SECRET ||
  'taskwave-git-default-key';

function getKey(): Buffer {
  return scryptSync(ENCRYPTION_SECRET, 'taskwave-git-salt-2026', 32);
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptToken(encrypted: string): string {
  const [ivHex, dataHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', getKey(), iv);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
