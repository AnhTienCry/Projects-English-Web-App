import bcrypt from 'bcryptjs';

export async function hashPassword(plain: string) {
  // bcrypt 10 rounds là đủ cho dev
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
