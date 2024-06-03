export type GitcoinProjectInfo = {
  id: string;
  name: string;
  applications: GitcoinApplication[];
  metadata: GitcoinMetadata;
};

type GitcoinApplication = {
  roundId: string;
  chainId: number;
  id: string;
};

type GitcoinMetadata = {
  type: string;
  title: string;
  logoImg: string;
  website: string;
  bannerImg: string;
  createdAt: number;
  credentials: {};
  description: string;
  logoImgData: {};
  bannerImgData: {};
  projectTwitter: string;
};
