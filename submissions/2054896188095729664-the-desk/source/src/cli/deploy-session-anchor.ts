import fs from "node:fs";
import process from "node:process";
import solc from "solc";
import { ContractFactory, JsonRpcProvider, Wallet, type InterfaceAbi } from "ethers";
import { XLAYER_TESTNET_CHAIN_ID, XLAYER_TESTNET_EXPLORER_URL, XLAYER_TESTNET_RPC_URL } from "../anchor/xlayer-anchor.js";

const sourcePath = "contracts/SessionAnchor.sol";
const privateKey = env("DESK_XLAYER_ANCHOR_PRIVATE_KEY");
const rpcUrl = process.env.DESK_XLAYER_RPC_URL || XLAYER_TESTNET_RPC_URL;

if (!privateKey) {
  throw new Error("DESK_XLAYER_ANCHOR_PRIVATE_KEY is required to deploy SessionAnchor on X Layer testnet");
}

const artifact = compileSessionAnchor();
const provider = new JsonRpcProvider(rpcUrl, XLAYER_TESTNET_CHAIN_ID);
const network = await provider.getNetwork();
if (Number(network.chainId) !== XLAYER_TESTNET_CHAIN_ID) {
  throw new Error(`refusing deploy: RPC returned chainId ${network.chainId}; expected X Layer testnet chainId 1952`);
}

const wallet = new Wallet(privateKey, provider);
const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
const contract = await factory.deploy();
await contract.waitForDeployment();

const address = await contract.getAddress();
console.log(`SessionAnchor deployed: ${address}`);
console.log(`X Layer explorer: ${XLAYER_TESTNET_EXPLORER_URL}/address/${address}`);
console.log("Set DESK_XLAYER_SESSION_ANCHOR_ADDRESS to this address before running the demo.");

function compileSessionAnchor() {
  const source = fs.readFileSync(sourcePath, "utf8");
  const input = {
    language: "Solidity",
    sources: {
      "SessionAnchor.sol": {
        content: source,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"],
        },
      },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input))) as {
    errors?: Array<{ severity: string; formattedMessage: string }>;
    contracts?: Record<string, Record<string, { abi: unknown[]; evm: { bytecode: { object: string } } }>>;
  };
  const errors = output.errors?.filter((item) => item.severity === "error") ?? [];
  if (errors.length > 0) {
    throw new Error(errors.map((item) => item.formattedMessage).join("\n"));
  }
  const contract = output.contracts?.["SessionAnchor.sol"]?.SessionAnchor;
  if (!contract?.evm.bytecode.object) {
    throw new Error("solc did not return SessionAnchor bytecode");
  }
  return {
    abi: contract.abi as InterfaceAbi,
    bytecode: `0x${contract.evm.bytecode.object}`,
  };
}

function env(key: string) {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}
