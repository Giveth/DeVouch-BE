export type GitcoinProjectInfo = {
  id: string;
  name: string;
  metadata: GitcoinMetadata;
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
