export type RoundNumber = 4 | 5 | 6;

export type RlProjectInfo = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  bio: string;
  address: string;
  bannerImageUrl: string;
  profileImageUrl: string;
  impactCategory: string[];
  primaryCategory: string;
  recategorization: string;
  prelimResult: string;
  reportReason: string;
  includedInBallots: number;
};
