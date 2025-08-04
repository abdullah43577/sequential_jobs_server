import IORedis from "ioredis";
const { REDIS_HOST, REDIS_PASS, REDIS_USERNAME, REDIS_PORT, NODE_ENV } = process.env;

const config = NODE_ENV === "development" ? { host: "localhost", port: 6379, maxRetriesPerRequest: null } : { host: REDIS_HOST, username: REDIS_USERNAME, password: REDIS_PASS, port: REDIS_PORT as unknown as number, maxRetriesPerRequest: null };

export const connection = new IORedis(config);
