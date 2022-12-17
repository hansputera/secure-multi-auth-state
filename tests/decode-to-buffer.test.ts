import test from 'ava';
import { initAuthCreds } from '@adiwajshing/baileys';
import { Util } from '../lib';

test('should decode buffer json data to buffer instance', (t) => {
    const testJson = JSON.parse(JSON.stringify({
        privateKey: {
            type: 'Buffer',
            data: [12, 4, 8],
        },
    }));

    t.is(typeof testJson, 'object');
    t.deepEqual(testJson.privateKey, {type: 'Buffer', data: [12,4,8]});
    
    Util.decodetoBuffer(testJson);
    t.assert(testJson.privateKey instanceof Buffer);
});

test('should decode string auth correctly', async(t) => {
    const creds = initAuthCreds();

    const credsEncoded = JSON.parse(JSON.stringify(creds));
    t.notDeepEqual(credsEncoded.signedPreKey, creds.signedPreKey);

    Util.decodetoBuffer(credsEncoded);
    t.deepEqual(credsEncoded, creds);
});