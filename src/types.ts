export interface DetailedJob {
  jobId?: string;
  source: string;
  title?: string;
  company?: string;
  companyLogo?: string;
  location?: string;
  timezone?: string;
  employmentType?: string;
  postedDate?: string;
  applyLink?: string;
  aboutCompany?: string;
  roleOverview?: string;
  responsibilities?: string[];
  requirements?: string[];
  seniorityLevel?: string;
  howRecent?: string;
  scrapedAt: string;
  url?: string;
}

export interface ScrapeOptions {
  writeToFile?: boolean;
}

