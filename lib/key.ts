import { ok as isOkay } from 'node:assert'
import { type BinaryLike } from 'node:crypto'
import * as scryptPbkdf from 'scrypt-pbkdf'
import { type GeneratedKey } from './@types'

const scryptPromise = async(pwd: BinaryLike, salt: BinaryLike, keyLen: number): Promise<Buffer> => {
	const pbkdf = await scryptPbkdf.scrypt(pwd, salt, keyLen)

	return Buffer.from(pbkdf)
}

/**
 * Generate key for encrypt, and decrypt
 * @param {Buffer | string} key A Password to encrypt/decrypt
 * @param {Buffer | string} salt A salt for your password
 * @return {Promise<GeneratedKey>} a key
 */
export const generateKey = async(key: Buffer | string, salt: Buffer | string): Promise<GeneratedKey> => {
	isOkay(key instanceof Buffer || typeof key === 'string', 'Invalid key')
	isOkay(salt instanceof Buffer || typeof salt === 'string', 'Invalid salt')

	const keyResult = await scryptPromise(key, salt, 32),
		  iv = await scryptPromise(key, salt, 16)

	return {
		key: keyResult,
		iv,
	}
}
