import Redis from "ioredis";
const redis = new Redis()
const getRateKey = (tenantId: string) => `rate: ${tenantId}`

export const checkRateLimit = async (tenantId: string, limit: number, windowMs: number) => {
    const key = getRateKey(tenantId);
    const now = Date.now()
    await redis.zremrangebyscore(key, 0, now - windowMs)
    const currentCount = await redis.zcard(key)
    if (currentCount >= limit) return false;
    await redis.zadd(key, now.toString(), now.toString())
    await redis.expire(key, Math.ceil(windowMs / 1000))
    return true;
}