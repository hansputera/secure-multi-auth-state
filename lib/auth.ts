import { type AuthenticationCreds, type SignalDataSet, initAuthCreds, SignalDataTypeMap, useMultiFileAuthState, WAProto } from '@adiwajshing/baileys'
import { ok as isOkay } from 'node:assert'
import { createCipheriv, createDecipheriv } from 'node:crypto'
import { createReadStream, createWriteStream, unlink } from 'node:fs'
import { mkdir, stat } from 'node:fs/promises'
import { join as pathJoin } from 'node:path'
import { Readable } from 'node:stream'
import { type GeneratedKey } from './@types'
import { convertNumsRecordToUint8Array, decodetoBuffer } from './util'

type Action = 'write' | 'read' | 'remove';
const fixFileName = (file?: string) => file?.replace(/\//g, '__')?.replace(/:/g, '-')

export const useSafeMultiAuthState = async(key: GeneratedKey, folder: string): ReturnType<typeof useMultiFileAuthState> => {
	isOkay(key?.key instanceof Buffer)
	isOkay(key?.iv instanceof Buffer)

	const encoder = new TextEncoder(),
		  decoder = new TextDecoder()

	const action = async<V>(act: Action, file: string, data?: V): Promise<V> => {
		return await new Promise((resolve, reject) => {
			switch (act) {
			case 'read':
				try {
					let collected = Buffer.alloc(0)
					const decipher = createDecipheriv('aes-256-cbc', key.key, key.iv)
					const fdr = createReadStream(pathJoin(folder, fixFileName(file)!), {
						'autoClose': true,
					})

					fdr.on('error', (err: Error & { code: string }) => {
						if(err.code === 'ENOENT') {
							return resolve(undefined as V)
						} else {
							return reject(err)
						}
					})

					fdr.pipe(decipher).on('data', (ch) => {
						collected = Buffer.concat([collected, Buffer.from(ch)])
					}).on('end', async() => {
						const json = JSON.parse(
							decoder.decode(collected)
						)
						if(typeof json === 'object') {
							decodetoBuffer(json)
						}

						return resolve(json)
					}).on('error', reject)
				} catch{
					return resolve(undefined as V)
				}

				break
			case 'write':
				const cipher = createCipheriv('aes-256-cbc', key.key, key.iv)
				const fdw = createWriteStream(pathJoin(folder, fixFileName(file)!), {
					'autoClose': true,
				})

				Readable.from(
					Buffer.from(
						encoder
							.encode(JSON.stringify(data)),
					)
				).pipe(cipher).pipe(fdw)
					.on('error', reject).on('end', resolve).on('close', resolve)
				break
			case 'remove':
				unlink(pathJoin(folder, fixFileName(file)!), (err) => {
					if(err) {
						return reject(err)
					} else {
						return resolve(undefined as V)
					}
				})
			}
		})
	}

	const fileInfo = await stat(folder).catch(() => undefined)
	if(fileInfo && !fileInfo.isDirectory()) {
		throw new Error(`found something that is not a directory at ${folder}, either delete it or specify a different location`)
	} else {
		await mkdir(folder, { recursive: true })
	}

	const creds = await action<AuthenticationCreds>('read', 'creds.json') || initAuthCreds()

	return {
		state: {
			creds,
			keys: {
				get: async(type, ids) => {
					const data: { [key: string]: SignalDataTypeMap[typeof type] } = { }
					await Promise.all(
						ids.map(
							async id => {
								let retryCount = 0
								let value = await action<SignalDataTypeMap[typeof type] | WAProto.Message.AppStateSyncKeyData>('read', `${type}-${id}.json`)
									.catch((e: Error & { code: string }) => e?.code === 'ERR_OSSL_EVP_WRONG_FINAL_BLOCK_LENGTH')

								while(typeof value === 'boolean' && value && retryCount <= 5) {
									retryCount++
									value = await action<SignalDataTypeMap[typeof type] | WAProto.Message.AppStateSyncKeyData>('read', `${type}-${id}.json`)
										.catch((e: Error & { code: string }) => e?.code === 'ERR_OSSL_EVP_WRONG_FINAL_BLOCK_LENGTH')
								}

								// if(typeof value === 'boolean') { // retry count reached
								// 	data[id] = undefined
								// 	return
								// }

								if(type === 'app-state-sync-key' && value) {
									value = WAProto.Message.AppStateSyncKeyData.fromObject(value as Record<string, string>)
								}

								if(type === 'sender-key' || type === 'session' && value) {
									value = convertNumsRecordToUint8Array(value as Record<number, number>) as SignalDataTypeMap[typeof type]
								}

								data[id] = value as SignalDataTypeMap[typeof type]
							}
						)
					)

					return data
				},
				set: async(data) => {
					const tasks: Promise<unknown>[] = []
					for(const category in data) {
						for(const id in data[category as keyof SignalDataSet]) {
							const value = data[category as keyof SignalDataSet]![id]
							const file = `${category}-${id}.json`
							tasks.push(value ? action('write', file, value) : action('remove', file))
						}
					}

					await Promise.all(tasks)
				}
			},
		},
		saveCreds: async() => {
			await action('write', 'creds.json', creds)
			return
		}
	}
}
