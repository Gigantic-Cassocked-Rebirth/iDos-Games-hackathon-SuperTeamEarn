// The iDos wallet package (@idosgames/wallet 0.6.4) hard-codes Solana's public RPC
// (api.mainnet-beta.solana.com) for on-chain deposits, and that endpoint answers every browser
// request (one carrying an Origin header) with 403 "Access forbidden" — so in-game deposits fail
// with "Could not read the token from the network". Until the SDK lets a title pick its RPC, this
// rewrites those requests to a browser-friendly Solana RPC. Import it before anything that loads
// @solana/web3.js.

/** Browser-friendly Solana mainnet RPC (Helius; the key is public and domain-restricted).
 *  Empty = leave requests alone. */
export const SOLANA_RPC_URL: string = import.meta.env.VITE_SOLANA_RPC_URL ?? "";

const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

const nativeFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = (input, init) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (!SOLANA_RPC_URL || !url.startsWith(PUBLIC_RPC)) return nativeFetch(input, init);
  // web3.js posts JSON-RPC to the bare endpoint; keep the body and headers, swap the URL.
  if (input instanceof Request) return nativeFetch(new Request(SOLANA_RPC_URL, input), init);
  return nativeFetch(SOLANA_RPC_URL, init);
};
