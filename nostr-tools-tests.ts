import { relayPool } from '.';

const pool = relayPool();

const evt = await pool.publish({}, (status: number, url: string) => {
    console.log({ status, url });
});

console.log(evt);
