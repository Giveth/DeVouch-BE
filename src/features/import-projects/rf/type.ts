export interface RfProjectInfo {
  id: string;
  category: string;
  organization: string | null;
  name: string;
  description: string;
  profileAvatarUrl: string;
  projectCoverImageUrl: string;
  team: string[];
  github: string[];
  packages: string[];
  links: string[];
}

export interface RfApiResponse {
  meta: {
    has_next: boolean;
    total_returned: number;
    next_offset: number;
  };
  data: RfProjectInfo[];
}
