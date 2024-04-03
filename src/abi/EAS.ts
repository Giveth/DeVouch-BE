import * as ethers from 'ethers'
import {LogEvent, Func, ContractBase} from './abi.support'
import {ABI_JSON} from './EAS.abi'

export const abi = new ethers.Interface(ABI_JSON);

export const events = {
    Attested: new LogEvent<([recipient: string, attester: string, uid: string, schema: string] & {recipient: string, attester: string, uid: string, schema: string})>(
        abi, '0x8bf46bf4cfd674fa735a3d63ec1c9ad4153f033c290341f3a588b75685141b35'
    ),
    Revoked: new LogEvent<([recipient: string, attester: string, uid: string, schema: string] & {recipient: string, attester: string, uid: string, schema: string})>(
        abi, '0xf930a6e2523c9cc298691873087a740550b8fc85a0680830414c148ed927f615'
    ),
    RevokedOffchain: new LogEvent<([revoker: string, data: string, timestamp: bigint] & {revoker: string, data: string, timestamp: bigint})>(
        abi, '0x92a1f7a41a7c585a8b09e25b195e225b1d43248daca46b0faf9e0792777a2229'
    ),
    Timestamped: new LogEvent<([data: string, timestamp: bigint] & {data: string, timestamp: bigint})>(
        abi, '0x5aafceeb1c7ad58e4a84898bdee37c02c0fc46e7d24e6b60e8209449f183459f'
    ),
}

export const functions = {
    VERSION: new Func<[], {}, string>(
        abi, '0xffa1ad74'
    ),
    attest: new Func<[request: ([schema: string, data: ([recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint] & {recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint})] & {schema: string, data: ([recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint] & {recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint})})], {request: ([schema: string, data: ([recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint] & {recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint})] & {schema: string, data: ([recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint] & {recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint})})}, string>(
        abi, '0xf17325e7'
    ),
    attestByDelegation: new Func<[delegatedRequest: ([schema: string, data: ([recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint] & {recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint}), signature: ([v: number, r: string, s: string] & {v: number, r: string, s: string}), attester: string] & {schema: string, data: ([recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint] & {recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint}), signature: ([v: number, r: string, s: string] & {v: number, r: string, s: string}), attester: string})], {delegatedRequest: ([schema: string, data: ([recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint] & {recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint}), signature: ([v: number, r: string, s: string] & {v: number, r: string, s: string}), attester: string] & {schema: string, data: ([recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint] & {recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint}), signature: ([v: number, r: string, s: string] & {v: number, r: string, s: string}), attester: string})}, string>(
        abi, '0xe13458fc'
    ),
    getAttestTypeHash: new Func<[], {}, string>(
        abi, '0x12b11a17'
    ),
    getAttestation: new Func<[uid: string], {uid: string}, ([uid: string, schema: string, time: bigint, expirationTime: bigint, revocationTime: bigint, refUID: string, recipient: string, attester: string, revocable: boolean, data: string] & {uid: string, schema: string, time: bigint, expirationTime: bigint, revocationTime: bigint, refUID: string, recipient: string, attester: string, revocable: boolean, data: string})>(
        abi, '0xa3112a64'
    ),
    getDomainSeparator: new Func<[], {}, string>(
        abi, '0xed24911d'
    ),
    getNonce: new Func<[account: string], {account: string}, bigint>(
        abi, '0x2d0335ab'
    ),
    getRevokeOffchain: new Func<[revoker: string, data: string], {revoker: string, data: string}, bigint>(
        abi, '0xb469318d'
    ),
    getRevokeTypeHash: new Func<[], {}, string>(
        abi, '0xb83010d3'
    ),
    getSchemaRegistry: new Func<[], {}, string>(
        abi, '0xf10b5cc8'
    ),
    getTimestamp: new Func<[data: string], {data: string}, bigint>(
        abi, '0xd45c4435'
    ),
    isAttestationValid: new Func<[uid: string], {uid: string}, boolean>(
        abi, '0xe30bb563'
    ),
    multiAttest: new Func<[multiRequests: Array<([schema: string, data: Array<([recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint] & {recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint})>] & {schema: string, data: Array<([recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint] & {recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint})>})>], {multiRequests: Array<([schema: string, data: Array<([recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint] & {recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint})>] & {schema: string, data: Array<([recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint] & {recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint})>})>}, Array<string>>(
        abi, '0x44adc90e'
    ),
    multiAttestByDelegation: new Func<[multiDelegatedRequests: Array<([schema: string, data: Array<([recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint] & {recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint})>, signatures: Array<([v: number, r: string, s: string] & {v: number, r: string, s: string})>, attester: string] & {schema: string, data: Array<([recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint] & {recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint})>, signatures: Array<([v: number, r: string, s: string] & {v: number, r: string, s: string})>, attester: string})>], {multiDelegatedRequests: Array<([schema: string, data: Array<([recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint] & {recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint})>, signatures: Array<([v: number, r: string, s: string] & {v: number, r: string, s: string})>, attester: string] & {schema: string, data: Array<([recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint] & {recipient: string, expirationTime: bigint, revocable: boolean, refUID: string, data: string, value: bigint})>, signatures: Array<([v: number, r: string, s: string] & {v: number, r: string, s: string})>, attester: string})>}, Array<string>>(
        abi, '0x831e05a1'
    ),
    multiRevoke: new Func<[multiRequests: Array<([schema: string, data: Array<([uid: string, value: bigint] & {uid: string, value: bigint})>] & {schema: string, data: Array<([uid: string, value: bigint] & {uid: string, value: bigint})>})>], {multiRequests: Array<([schema: string, data: Array<([uid: string, value: bigint] & {uid: string, value: bigint})>] & {schema: string, data: Array<([uid: string, value: bigint] & {uid: string, value: bigint})>})>}, []>(
        abi, '0x4cb7e9e5'
    ),
    multiRevokeByDelegation: new Func<[multiDelegatedRequests: Array<([schema: string, data: Array<([uid: string, value: bigint] & {uid: string, value: bigint})>, signatures: Array<([v: number, r: string, s: string] & {v: number, r: string, s: string})>, revoker: string] & {schema: string, data: Array<([uid: string, value: bigint] & {uid: string, value: bigint})>, signatures: Array<([v: number, r: string, s: string] & {v: number, r: string, s: string})>, revoker: string})>], {multiDelegatedRequests: Array<([schema: string, data: Array<([uid: string, value: bigint] & {uid: string, value: bigint})>, signatures: Array<([v: number, r: string, s: string] & {v: number, r: string, s: string})>, revoker: string] & {schema: string, data: Array<([uid: string, value: bigint] & {uid: string, value: bigint})>, signatures: Array<([v: number, r: string, s: string] & {v: number, r: string, s: string})>, revoker: string})>}, []>(
        abi, '0xe45d03f9'
    ),
    multiRevokeOffchain: new Func<[data: Array<string>], {data: Array<string>}, bigint>(
        abi, '0x13893f61'
    ),
    multiTimestamp: new Func<[data: Array<string>], {data: Array<string>}, bigint>(
        abi, '0xe71ff365'
    ),
    revoke: new Func<[request: ([schema: string, data: ([uid: string, value: bigint] & {uid: string, value: bigint})] & {schema: string, data: ([uid: string, value: bigint] & {uid: string, value: bigint})})], {request: ([schema: string, data: ([uid: string, value: bigint] & {uid: string, value: bigint})] & {schema: string, data: ([uid: string, value: bigint] & {uid: string, value: bigint})})}, []>(
        abi, '0x46926267'
    ),
    revokeByDelegation: new Func<[delegatedRequest: ([schema: string, data: ([uid: string, value: bigint] & {uid: string, value: bigint}), signature: ([v: number, r: string, s: string] & {v: number, r: string, s: string}), revoker: string] & {schema: string, data: ([uid: string, value: bigint] & {uid: string, value: bigint}), signature: ([v: number, r: string, s: string] & {v: number, r: string, s: string}), revoker: string})], {delegatedRequest: ([schema: string, data: ([uid: string, value: bigint] & {uid: string, value: bigint}), signature: ([v: number, r: string, s: string] & {v: number, r: string, s: string}), revoker: string] & {schema: string, data: ([uid: string, value: bigint] & {uid: string, value: bigint}), signature: ([v: number, r: string, s: string] & {v: number, r: string, s: string}), revoker: string})}, []>(
        abi, '0xe57a6b1b'
    ),
    revokeOffchain: new Func<[data: string], {data: string}, bigint>(
        abi, '0xcf190f34'
    ),
    timestamp: new Func<[data: string], {data: string}, bigint>(
        abi, '0x4d003070'
    ),
}

export class Contract extends ContractBase {

    VERSION(): Promise<string> {
        return this.eth_call(functions.VERSION, [])
    }

    getAttestTypeHash(): Promise<string> {
        return this.eth_call(functions.getAttestTypeHash, [])
    }

    getAttestation(uid: string): Promise<([uid: string, schema: string, time: bigint, expirationTime: bigint, revocationTime: bigint, refUID: string, recipient: string, attester: string, revocable: boolean, data: string] & {uid: string, schema: string, time: bigint, expirationTime: bigint, revocationTime: bigint, refUID: string, recipient: string, attester: string, revocable: boolean, data: string})> {
        return this.eth_call(functions.getAttestation, [uid])
    }

    getDomainSeparator(): Promise<string> {
        return this.eth_call(functions.getDomainSeparator, [])
    }

    getNonce(account: string): Promise<bigint> {
        return this.eth_call(functions.getNonce, [account])
    }

    getRevokeOffchain(revoker: string, data: string): Promise<bigint> {
        return this.eth_call(functions.getRevokeOffchain, [revoker, data])
    }

    getRevokeTypeHash(): Promise<string> {
        return this.eth_call(functions.getRevokeTypeHash, [])
    }

    getSchemaRegistry(): Promise<string> {
        return this.eth_call(functions.getSchemaRegistry, [])
    }

    getTimestamp(data: string): Promise<bigint> {
        return this.eth_call(functions.getTimestamp, [data])
    }

    isAttestationValid(uid: string): Promise<boolean> {
        return this.eth_call(functions.isAttestationValid, [uid])
    }
}
