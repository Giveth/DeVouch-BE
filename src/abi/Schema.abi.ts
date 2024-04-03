export const ABI_JSON = [
    {
        "type": "error",
        "name": "AlreadyExists",
        "inputs": []
    },
    {
        "type": "event",
        "anonymous": false,
        "name": "Registered",
        "inputs": [
            {
                "type": "bytes32",
                "name": "uid",
                "indexed": true
            },
            {
                "type": "address",
                "name": "registerer",
                "indexed": false
            }
        ]
    },
    {
        "type": "function",
        "name": "VERSION",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [],
        "outputs": [
            {
                "type": "string",
                "name": ""
            }
        ]
    },
    {
        "type": "function",
        "name": "getSchema",
        "constant": true,
        "stateMutability": "view",
        "payable": false,
        "inputs": [
            {
                "type": "bytes32",
                "name": "uid"
            }
        ],
        "outputs": [
            {
                "type": "tuple",
                "name": "",
                "components": [
                    {
                        "type": "bytes32",
                        "name": "uid"
                    },
                    {
                        "type": "address",
                        "name": "resolver"
                    },
                    {
                        "type": "bool",
                        "name": "revocable"
                    },
                    {
                        "type": "string",
                        "name": "schema"
                    }
                ]
            }
        ]
    },
    {
        "type": "function",
        "name": "register",
        "constant": false,
        "payable": false,
        "inputs": [
            {
                "type": "string",
                "name": "schema"
            },
            {
                "type": "address",
                "name": "resolver"
            },
            {
                "type": "bool",
                "name": "revocable"
            }
        ],
        "outputs": [
            {
                "type": "bytes32",
                "name": ""
            }
        ]
    }
]
