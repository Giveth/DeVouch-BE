import * as ethers from 'ethers'
import {LogEvent, Func, ContractBase} from './abi.support'
import {ABI_JSON} from './Schema.abi'

export const abi = new ethers.Interface(ABI_JSON);

export const events = {
    Registered: new LogEvent<([uid: string, registerer: string] & {uid: string, registerer: string})>(
        abi, '0x7d917fcbc9a29a9705ff9936ffa599500e4fd902e4486bae317414fe967b307c'
    ),
}

export const functions = {
    VERSION: new Func<[], {}, string>(
        abi, '0xffa1ad74'
    ),
    getSchema: new Func<[uid: string], {uid: string}, ([uid: string, resolver: string, revocable: boolean, schema: string] & {uid: string, resolver: string, revocable: boolean, schema: string})>(
        abi, '0xa2ea7c6e'
    ),
    register: new Func<[schema: string, resolver: string, revocable: boolean], {schema: string, resolver: string, revocable: boolean}, string>(
        abi, '0x60d7a278'
    ),
}

export class Contract extends ContractBase {

    VERSION(): Promise<string> {
        return this.eth_call(functions.VERSION, [])
    }

    getSchema(uid: string): Promise<([uid: string, resolver: string, revocable: boolean, schema: string] & {uid: string, resolver: string, revocable: boolean, schema: string})> {
        return this.eth_call(functions.getSchema, [uid])
    }
}
