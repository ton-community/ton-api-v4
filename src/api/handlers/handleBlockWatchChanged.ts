import { SocketStream } from "@fastify/websocket";
import { FastifyRequest } from "fastify";
import { LiteClient } from "ton-lite-client";
import { BlockSync } from "../../sync/BlockSync";

export function handleBlockWatchChanged(client: LiteClient, blockSync: BlockSync) {
    return (connection: SocketStream, request: FastifyRequest) => {
        if (blockSync.currentFull) {
            connection.socket.send(JSON.stringify(blockSync.currentFull));
        }
        let handler = (src: any) => connection.socket.send(JSON.stringify(src));
        blockSync.on('block_full', handler);
        connection.on('close', () => {
            blockSync.off('block_full', handler);
        });
    };
}