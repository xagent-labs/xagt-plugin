import { useAuth } from "@/lib/auth";
import { useWallet } from "@/lib/wallet";

const shortenWallet = (address: string) =>
  `${address.slice(0, 4)}...${address.slice(-4)}`;

export const useIdentity = () => {
  const auth = useAuth();
  const wallet = useWallet();

  const storageScope = auth.emailIdentity
    ? `email:${auth.emailIdentity.email}`
    : wallet.address
      ? `wallet:${wallet.address}`
      : "guest";

  const currentIdentityLabel = auth.emailIdentity?.email
    ?? wallet.shortAddress
    ?? auth.identityLabel;

  return {
    ...auth,
    ...wallet,
    storageScope,
    currentIdentityLabel,
    walletBadgeLabel: wallet.shortAddress ?? "Phantom",
    emailBadgeLabel: auth.emailIdentity?.email ?? auth.identityLabel,
    hasWalletIdentity: !!wallet.address,
    hasEmailIdentity: !!auth.emailIdentity,
    shortenWallet,
  };
};
