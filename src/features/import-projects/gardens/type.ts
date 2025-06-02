export type GardenProjectInfo = {
  id: string;
  chainId: number | string;
  url?: string; // only for artbitrum sepolia
  name?: string; // only for artbitrum sepolia
  communityName?: string;
  covenantIpfsHash?: string;
  alloAddress?: string;
  registerToken?: string;
  isValid?: boolean;
  isTestnet?: boolean; // only for artbitrum sepolia
};