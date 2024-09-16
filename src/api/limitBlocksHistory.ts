import { config } from '../config';
import { BlockSync } from '../sync/BlockSync';

export function limitBlocksHistory(blockSync: BlockSync, seqno: number) {
    if (config.maxBlockHistory === 0) {
        return false;
    }
    
    let lastSeqno = blockSync.current.last.seqno;
    if (lastSeqno - seqno > config.maxBlockHistory) {
        return true;
    }
    return false;
}