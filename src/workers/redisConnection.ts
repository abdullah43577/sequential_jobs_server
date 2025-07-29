import Redis from "ioredis";
const { REDIS_HOST, REDIS_PASS, REDIS_USERNAME } = process.env;

export const connection = new Redis({ host: REDIS_HOST, username: REDIS_USERNAME, password: REDIS_PASS, port: 10180, maxRetriesPerRequest: null });
