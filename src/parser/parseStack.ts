import { Cell, Slice } from "ton";

// vm_stk_null#00 = VmStackValue;
// vm_stk_tinyint#01 value:int64 = VmStackValue;
// vm_stk_int#0201_ value:int257 = VmStackValue;
// vm_stk_nan#02ff = VmStackValue;
// vm_stk_cell#03 cell:^Cell = VmStackValue;

//_ cell:^Cell st_bits:(## 10) end_bits:(## 10) { st_bits <= end_bits }
//   st_ref:(#<= 4) end_ref:(#<= 4) { st_ref <= end_ref } = VmCellSlice;
// vm_stk_slice#04 _:VmCellSlice = VmStackValue;
// vm_stk_builder#05 cell:^Cell = VmStackValue;
// vm_stk_cont#06 cont:VmCont = VmStackValue;

// vm_tupref_nil$_ = VmTupleRef 0;
// vm_tupref_single$_ entry:^VmStackValue = VmTupleRef 1;
// vm_tupref_any$_ {n:#} ref:^(VmTuple (n + 2)) = VmTupleRef (n + 2);
// vm_tuple_nil$_ = VmTuple 0;
// vm_tuple_tcons$_ {n:#} head:(VmTupleRef n) tail:^VmStackValue = VmTuple (n + 1);
// vm_stk_tuple#07 len:(## 16) data:(VmTuple len) = VmStackValue;

function parseStackValue(cs: Slice): any {
    let kind = cs.readUintNumber(8);
    if (kind === 0) {
        return { type: 'null' };
    } else if (kind === 1) {
        return { type: 'int', value: cs.readInt(64).toString(10) };
    } else if (kind === 2) {
        if (cs.readIntNumber(8) === 1) {
            return { type: 'int', value: cs.readInt(257).toString(10) };
        } else {
            return { type: 'nan' };
        }
    } else if (kind === 3) {
        return { type: 'cell', cell: cs.readCell().toBoc({ idx: false }).toString('base64') };
    } else if (kind === 4) {
        let startBits = cs.readUintNumber(10);
        let endBits = cs.readUintNumber(10);
        let rs = cs.readCell().beginParse();
        rs.skip(startBits);
        let dt = rs.readBitString(endBits - startBits);
        return { type: 'slice', cell: new Cell('ordinary', dt).toBoc({ idx: false }).toString('base64') };
    } else if (kind === 5) {
        return { type: 'builder', cell: cs.readCell().toBoc({ idx: false }).toString('base64') };
    } else {
        throw Error('Unsupported');
    }
}

export function parseStack(cs: Slice) {
    let items: number[] = [];
    let stackDepth = cs.readUintNumber(24);
    for (let i = 0; i < stackDepth; i++) {
        let next = cs.readRef();
        items.push(parseStackValue(cs));
        cs = next;
    }
    return items;
}