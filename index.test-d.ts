import * as process from 'process';
import {
    relayPool,
    getBlankEvent,
    validateEvent,
    RelayPool,
    Event as NEvent
} from './index.js';
import { expectType } from 'tsd';

const pool = relayPool();
expectType<RelayPool>(pool);

const privkey = process.env.NOSTR_PRIVATE_KEY;
const pubkey = process.env.NOSTR_PUBLIC_KEY;

const message = {
    ...getBlankEvent(),
    kind: 1,
    content: `just saying hi from pid ${process.pid}`,
    pubkey,
};

const publishCb = (status: number, url: string) => {
    console.log({ status, url });
};

pool.setPrivateKey(privkey!);

const publishF = pool.publish(message, publishCb);
expectType<Promise<NEvent>>(publishF);

publishF.then((event) => {
    expectType<NEvent>(event);

    console.info({ event });

    if (!validateEvent(event)) {
        console.error(`event failed to validate!`);
        process.exit(1);
    }
});
