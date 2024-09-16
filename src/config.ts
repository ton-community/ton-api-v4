export const config = {
    maxBlockHistory: !process.env.MAX_BLOCK_HISTORY ? 0 : parseInt(process.env.MAX_BLOCK_HISTORY, 10),
}