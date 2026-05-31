import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import solc from "solc";

test("SessionAnchor contract compiles with commit(bytes32)", () => {
  const source = fs.readFileSync("contracts/SessionAnchor.sol", "utf8");
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
    contracts?: Record<string, Record<string, { abi: Array<{ name?: string; type: string }>; evm: { bytecode: { object: string } } }>>;
  };
  const errors = output.errors?.filter((item) => item.severity === "error") ?? [];
  assert.deepEqual(errors, []);
  const contract = output.contracts?.["SessionAnchor.sol"]?.SessionAnchor;
  assert.ok(contract?.evm.bytecode.object);
  assert.ok(contract.abi.some((item) => item.type === "function" && item.name === "commit"));
  assert.ok(contract.abi.some((item) => item.type === "event" && item.name === "SessionCommitted"));
});
