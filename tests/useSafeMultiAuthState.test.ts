import test from 'ava'
import { randomBytes } from 'node:crypto'
import { resolve as pathResolve } from 'node:path'
import { generateKey, useSafeMultiAuthState } from '../lib'

let key!: Awaited<ReturnType<typeof generateKey>>
test.before('Declare key', async(t) => {
	key = await generateKey('adasdasd', 'asdsadsad')

	t.not(key, undefined)
})

test('init credentials', async(t) => {
	t.log('Initializing creds')
	await t.notThrowsAsync(useSafeMultiAuthState(key, pathResolve(__dirname, 'sessions')))
})

test('credentials change', async(t) => {
	t.log('Preparing state')
	const state = await useSafeMultiAuthState(key, pathResolve(__dirname, 'sessions'))
	t.not(state, undefined)

	state.state.creds.me = {
		'id': '628381928192',
		'name': 'John Doe',
	}

	state.state.creds.platform = 'iOS'

	await t.notThrowsAsync(state.saveCreds)
})

test('validate credentials change', async(t) => {
	t.log('Preparing state')
	const state = await useSafeMultiAuthState(key, pathResolve(__dirname, 'sessions'))
	t.not(state, undefined)

	t.log(state.state.creds)
	t.deepEqual(state.state.creds.me?.id, '628381928192')
	t.deepEqual(state.state.creds.me?.name, 'John Doe')
	t.is(state.state.creds.platform, 'iOS')
})

test('key set 123 -> hello', async(t) => {
	t.log('Preparing state')
	const state = await useSafeMultiAuthState(key, pathResolve(__dirname, 'sessions'))
	t.not(state, undefined)

	await t.notThrowsAsync(async() => state.state.keys.set({
		'session': {
			'123': new TextEncoder().encode('Hello World'),
		}
	}))
})

test('key get 123 -> hello', async(t) => {
	t.log('Preparing state')
	const state = await useSafeMultiAuthState(key, pathResolve(__dirname, 'sessions'))
	t.not(state, undefined)

	const res = await state.state.keys.get('session', ['123'])
	t.log(res)

	const testDecode = new TextDecoder().decode(res[123])
	t.is(testDecode, 'Hello World')
})

test('key sets data', async(t) => {
	t.log('Preparing state')
	const state = await useSafeMultiAuthState(key, pathResolve(__dirname, 'sessions'))
	t.not(state, undefined)

	const objects = {}
	let i = 0

	t.log('Previous sessions: ', await state.state.keys.get(
		'session',
		new Array(100).fill('')
			.map(() => Math.floor(Math.random() * 10_000).toString())
	))
	while(i < 10) {
		Reflect.set(objects, Math.floor(Math.random() * 10_000).toString(), {
			key: randomBytes(32),
		})
		i++
	}

	await state.state.keys.set({
		'session': objects,
	})
	t.log('done sets')
})
