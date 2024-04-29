export const ABI_JSON = [
  {
    type: "constructor",
    stateMutability: "undefined",
    payable: false,
    inputs: [
      {
        type: "address",
        name: "registry",
      },
    ],
  },
  {
    type: "error",
    name: "AccessDenied",
    inputs: [],
  },
  {
    type: "error",
    name: "AlreadyRevoked",
    inputs: [],
  },
  {
    type: "error",
    name: "AlreadyRevokedOffchain",
    inputs: [],
  },
  {
    type: "error",
    name: "AlreadyTimestamped",
    inputs: [],
  },
  {
    type: "error",
    name: "InsufficientValue",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidAttestation",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidAttestations",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidExpirationTime",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidLength",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidOffset",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidRegistry",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidRevocation",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidRevocations",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidSchema",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidSignature",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidVerifier",
    inputs: [],
  },
  {
    type: "error",
    name: "Irrevocable",
    inputs: [],
  },
  {
    type: "error",
    name: "NotFound",
    inputs: [],
  },
  {
    type: "error",
    name: "NotPayable",
    inputs: [],
  },
  {
    type: "error",
    name: "WrongSchema",
    inputs: [],
  },
  {
    type: "event",
    anonymous: false,
    name: "Attested",
    inputs: [
      {
        type: "address",
        name: "recipient",
        indexed: true,
      },
      {
        type: "address",
        name: "attestor",
        indexed: true,
      },
      {
        type: "bytes32",
        name: "uid",
        indexed: false,
      },
      {
        type: "bytes32",
        name: "schema",
        indexed: true,
      },
    ],
  },
  {
    type: "event",
    anonymous: false,
    name: "Revoked",
    inputs: [
      {
        type: "address",
        name: "recipient",
        indexed: true,
      },
      {
        type: "address",
        name: "attestor",
        indexed: true,
      },
      {
        type: "bytes32",
        name: "uid",
        indexed: false,
      },
      {
        type: "bytes32",
        name: "schema",
        indexed: true,
      },
    ],
  },
  {
    type: "event",
    anonymous: false,
    name: "RevokedOffchain",
    inputs: [
      {
        type: "address",
        name: "revoker",
        indexed: true,
      },
      {
        type: "bytes32",
        name: "data",
        indexed: true,
      },
      {
        type: "uint64",
        name: "timestamp",
        indexed: true,
      },
    ],
  },
  {
    type: "event",
    anonymous: false,
    name: "Timestamped",
    inputs: [
      {
        type: "bytes32",
        name: "data",
        indexed: true,
      },
      {
        type: "uint64",
        name: "timestamp",
        indexed: true,
      },
    ],
  },
  {
    type: "function",
    name: "VERSION",
    constant: true,
    stateMutability: "view",
    payable: false,
    inputs: [],
    outputs: [
      {
        type: "string",
        name: "",
      },
    ],
  },
  {
    type: "function",
    name: "attest",
    constant: false,
    stateMutability: "payable",
    payable: true,
    inputs: [
      {
        type: "tuple",
        name: "request",
        components: [
          {
            type: "bytes32",
            name: "schema",
          },
          {
            type: "tuple",
            name: "data",
            components: [
              {
                type: "address",
                name: "recipient",
              },
              {
                type: "uint64",
                name: "expirationTime",
              },
              {
                type: "bool",
                name: "revocable",
              },
              {
                type: "bytes32",
                name: "refUID",
              },
              {
                type: "bytes",
                name: "data",
              },
              {
                type: "uint256",
                name: "value",
              },
            ],
          },
        ],
      },
    ],
    outputs: [
      {
        type: "bytes32",
        name: "",
      },
    ],
  },
  {
    type: "function",
    name: "attestByDelegation",
    constant: false,
    stateMutability: "payable",
    payable: true,
    inputs: [
      {
        type: "tuple",
        name: "delegatedRequest",
        components: [
          {
            type: "bytes32",
            name: "schema",
          },
          {
            type: "tuple",
            name: "data",
            components: [
              {
                type: "address",
                name: "recipient",
              },
              {
                type: "uint64",
                name: "expirationTime",
              },
              {
                type: "bool",
                name: "revocable",
              },
              {
                type: "bytes32",
                name: "refUID",
              },
              {
                type: "bytes",
                name: "data",
              },
              {
                type: "uint256",
                name: "value",
              },
            ],
          },
          {
            type: "tuple",
            name: "signature",
            components: [
              {
                type: "uint8",
                name: "v",
              },
              {
                type: "bytes32",
                name: "r",
              },
              {
                type: "bytes32",
                name: "s",
              },
            ],
          },
          {
            type: "address",
            name: "attestor",
          },
        ],
      },
    ],
    outputs: [
      {
        type: "bytes32",
        name: "",
      },
    ],
  },
  {
    type: "function",
    name: "getAttestTypeHash",
    constant: true,
    stateMutability: "pure",
    payable: false,
    inputs: [],
    outputs: [
      {
        type: "bytes32",
        name: "",
      },
    ],
  },
  {
    type: "function",
    name: "getAttestation",
    constant: true,
    stateMutability: "view",
    payable: false,
    inputs: [
      {
        type: "bytes32",
        name: "uid",
      },
    ],
    outputs: [
      {
        type: "tuple",
        name: "",
        components: [
          {
            type: "bytes32",
            name: "uid",
          },
          {
            type: "bytes32",
            name: "schema",
          },
          {
            type: "uint64",
            name: "time",
          },
          {
            type: "uint64",
            name: "expirationTime",
          },
          {
            type: "uint64",
            name: "revocationTime",
          },
          {
            type: "bytes32",
            name: "refUID",
          },
          {
            type: "address",
            name: "recipient",
          },
          {
            type: "address",
            name: "attestor",
          },
          {
            type: "bool",
            name: "revocable",
          },
          {
            type: "bytes",
            name: "data",
          },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getDomainSeparator",
    constant: true,
    stateMutability: "view",
    payable: false,
    inputs: [],
    outputs: [
      {
        type: "bytes32",
        name: "",
      },
    ],
  },
  {
    type: "function",
    name: "getNonce",
    constant: true,
    stateMutability: "view",
    payable: false,
    inputs: [
      {
        type: "address",
        name: "account",
      },
    ],
    outputs: [
      {
        type: "uint256",
        name: "",
      },
    ],
  },
  {
    type: "function",
    name: "getRevokeOffchain",
    constant: true,
    stateMutability: "view",
    payable: false,
    inputs: [
      {
        type: "address",
        name: "revoker",
      },
      {
        type: "bytes32",
        name: "data",
      },
    ],
    outputs: [
      {
        type: "uint64",
        name: "",
      },
    ],
  },
  {
    type: "function",
    name: "getRevokeTypeHash",
    constant: true,
    stateMutability: "pure",
    payable: false,
    inputs: [],
    outputs: [
      {
        type: "bytes32",
        name: "",
      },
    ],
  },
  {
    type: "function",
    name: "getSchemaRegistry",
    constant: true,
    stateMutability: "view",
    payable: false,
    inputs: [],
    outputs: [
      {
        type: "address",
        name: "",
      },
    ],
  },
  {
    type: "function",
    name: "getTimestamp",
    constant: true,
    stateMutability: "view",
    payable: false,
    inputs: [
      {
        type: "bytes32",
        name: "data",
      },
    ],
    outputs: [
      {
        type: "uint64",
        name: "",
      },
    ],
  },
  {
    type: "function",
    name: "isAttestationValid",
    constant: true,
    stateMutability: "view",
    payable: false,
    inputs: [
      {
        type: "bytes32",
        name: "uid",
      },
    ],
    outputs: [
      {
        type: "bool",
        name: "",
      },
    ],
  },
  {
    type: "function",
    name: "multiAttest",
    constant: false,
    stateMutability: "payable",
    payable: true,
    inputs: [
      {
        type: "tuple[]",
        name: "multiRequests",
        components: [
          {
            type: "bytes32",
            name: "schema",
          },
          {
            type: "tuple[]",
            name: "data",
            components: [
              {
                type: "address",
                name: "recipient",
              },
              {
                type: "uint64",
                name: "expirationTime",
              },
              {
                type: "bool",
                name: "revocable",
              },
              {
                type: "bytes32",
                name: "refUID",
              },
              {
                type: "bytes",
                name: "data",
              },
              {
                type: "uint256",
                name: "value",
              },
            ],
          },
        ],
      },
    ],
    outputs: [
      {
        type: "bytes32[]",
        name: "",
      },
    ],
  },
  {
    type: "function",
    name: "multiAttestByDelegation",
    constant: false,
    stateMutability: "payable",
    payable: true,
    inputs: [
      {
        type: "tuple[]",
        name: "multiDelegatedRequests",
        components: [
          {
            type: "bytes32",
            name: "schema",
          },
          {
            type: "tuple[]",
            name: "data",
            components: [
              {
                type: "address",
                name: "recipient",
              },
              {
                type: "uint64",
                name: "expirationTime",
              },
              {
                type: "bool",
                name: "revocable",
              },
              {
                type: "bytes32",
                name: "refUID",
              },
              {
                type: "bytes",
                name: "data",
              },
              {
                type: "uint256",
                name: "value",
              },
            ],
          },
          {
            type: "tuple[]",
            name: "signatures",
            components: [
              {
                type: "uint8",
                name: "v",
              },
              {
                type: "bytes32",
                name: "r",
              },
              {
                type: "bytes32",
                name: "s",
              },
            ],
          },
          {
            type: "address",
            name: "attestor",
          },
        ],
      },
    ],
    outputs: [
      {
        type: "bytes32[]",
        name: "",
      },
    ],
  },
  {
    type: "function",
    name: "multiRevoke",
    constant: false,
    stateMutability: "payable",
    payable: true,
    inputs: [
      {
        type: "tuple[]",
        name: "multiRequests",
        components: [
          {
            type: "bytes32",
            name: "schema",
          },
          {
            type: "tuple[]",
            name: "data",
            components: [
              {
                type: "bytes32",
                name: "uid",
              },
              {
                type: "uint256",
                name: "value",
              },
            ],
          },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "multiRevokeByDelegation",
    constant: false,
    stateMutability: "payable",
    payable: true,
    inputs: [
      {
        type: "tuple[]",
        name: "multiDelegatedRequests",
        components: [
          {
            type: "bytes32",
            name: "schema",
          },
          {
            type: "tuple[]",
            name: "data",
            components: [
              {
                type: "bytes32",
                name: "uid",
              },
              {
                type: "uint256",
                name: "value",
              },
            ],
          },
          {
            type: "tuple[]",
            name: "signatures",
            components: [
              {
                type: "uint8",
                name: "v",
              },
              {
                type: "bytes32",
                name: "r",
              },
              {
                type: "bytes32",
                name: "s",
              },
            ],
          },
          {
            type: "address",
            name: "revoker",
          },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "multiRevokeOffchain",
    constant: false,
    payable: false,
    inputs: [
      {
        type: "bytes32[]",
        name: "data",
      },
    ],
    outputs: [
      {
        type: "uint64",
        name: "",
      },
    ],
  },
  {
    type: "function",
    name: "multiTimestamp",
    constant: false,
    payable: false,
    inputs: [
      {
        type: "bytes32[]",
        name: "data",
      },
    ],
    outputs: [
      {
        type: "uint64",
        name: "",
      },
    ],
  },
  {
    type: "function",
    name: "revoke",
    constant: false,
    stateMutability: "payable",
    payable: true,
    inputs: [
      {
        type: "tuple",
        name: "request",
        components: [
          {
            type: "bytes32",
            name: "schema",
          },
          {
            type: "tuple",
            name: "data",
            components: [
              {
                type: "bytes32",
                name: "uid",
              },
              {
                type: "uint256",
                name: "value",
              },
            ],
          },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "revokeByDelegation",
    constant: false,
    stateMutability: "payable",
    payable: true,
    inputs: [
      {
        type: "tuple",
        name: "delegatedRequest",
        components: [
          {
            type: "bytes32",
            name: "schema",
          },
          {
            type: "tuple",
            name: "data",
            components: [
              {
                type: "bytes32",
                name: "uid",
              },
              {
                type: "uint256",
                name: "value",
              },
            ],
          },
          {
            type: "tuple",
            name: "signature",
            components: [
              {
                type: "uint8",
                name: "v",
              },
              {
                type: "bytes32",
                name: "r",
              },
              {
                type: "bytes32",
                name: "s",
              },
            ],
          },
          {
            type: "address",
            name: "revoker",
          },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "revokeOffchain",
    constant: false,
    payable: false,
    inputs: [
      {
        type: "bytes32",
        name: "data",
      },
    ],
    outputs: [
      {
        type: "uint64",
        name: "",
      },
    ],
  },
  {
    type: "function",
    name: "timestamp",
    constant: false,
    payable: false,
    inputs: [
      {
        type: "bytes32",
        name: "data",
      },
    ],
    outputs: [
      {
        type: "uint64",
        name: "",
      },
    ],
  },
];
