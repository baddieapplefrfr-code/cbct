export interface Channel {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  customUrl: string
  subscriberCount: number
  videoCount: number
  viewCount: number
}

export interface Video {
  id: string
  title: string
  thumbnailUrl: string
  viewCount: number
  likeCount: number
  commentCount: number
  publishedAt: string
  daysSinceUpload: number
  viewVelocity: number
  engagementRate: number
  publishHour: number
  publishDay: number
  duration: string
  description: string
}

export interface Metrics {
  averageViews: number
  averageVelocity: number
  averageLikes: number
  averageComments: number
  uploadFrequencyDays: number
  topPerformingVideo: Video | null
  weakestVideo: Video | null
  commonTitleWords: { word: string; count: number }[]
}

export interface HealthScore {
  total: number
  velocity: number
  consistency: number
  titleDiversity: number
  engagement: number
}

export interface Series {
  name: string
  videoCount: number
  averageViews: number
  averageVelocity: number
  performanceMultiplier: number
}

export interface UploadTimeInsights {
  bestDay: string
  worstDay: string
  bestTimeBlock: string
  performanceMultiplier: number
  dayBreakdown: { day: string; avgViews: number; videoCount: number }[]
  timeBreakdown: { timeBlock: string; avgViews: number; videoCount: number }[]
}

export interface ContentFingerprint {
  dominantNiche: string
  contentStyle: string
  averageTitleLength: string
  bestPerformingFormat: string
}

export interface SponsorDeal {
  brand: string
  videoTitle: string
  videoId: string
}

export interface AnalysisData {
  channel: Channel
  videos: Video[]
  metrics: Metrics
  healthScore: HealthScore
  series: Series[]
  uploadTimeInsights: UploadTimeInsights
  strategicInsights: string[]
  contentFingerprint: ContentFingerprint
  sponsorDeals: SponsorDeal[]
}

export interface CompetitorData {
  channelId: string
  channelTitle: string
  thumbnailUrl: string
  subscriberCount: number
  avgViews: number
  recentTitles: string[]
  strengthSummary?: string
  weaknessSummary?: string
  titleFormula?: string
  postingPattern?: string
}

export interface CompetitorAnalysis {
  competitors: CompetitorData[]
  contentGaps: string[]
  opportunities: string[]
  threatLevel: 'Low' | 'Medium' | 'High'
  winStrategy: string
}

export interface Trend {
  topic: string
  stage: 'Rising' | 'Peak' | 'Early'
  window: string
  competition: 'High' | 'Medium' | 'Low'
  trendScore: number
  suggestedTitle: string
}

export interface PreUploadResult {
  hookScore: number
  shadowScore: number
  retentionRisk: 'Low' | 'Medium' | 'High'
  improvedTitles: string[]
  viralHooks: string[]
  thumbnailConcept: {
    textOverlay: string
    visualSuggestion: string
    emotion: string
  }
}

export interface ScriptSection {
  title: string
  content: string
  duration: string
  microHook: string
}

export interface ScriptResult {
  hook: string
  intro: string
  sections: ScriptSection[]
  cta: string
  endScreen: string
  titles: string[]
  description: string
  hashtags: string[]
  thumbnailConcept: string
}

export interface DailyBrief {
  greeting: string
  dayName: string
  isGoodDay: boolean
  dateStr: string
  videoForToday: {
    title: string
    reason: string
  }
  thingsToKnow: {
    title: string
    body: string
  }[]
}

export interface ChannelReport {
  weekSummary: string
  bestContentInsight: string
  biggestMiss: string
  priorities: string[]
  stopDoing: string
  startDoing: string
  projection: string
}

export type StyleOption = 'Educational' | 'Entertainment' | 'Motivational' | 'Story'
export type DurationOption = '60sec' | '5min' | '10min' | '15min'
export type NicheOption = 'Education' | 'Finance' | 'Gaming' | 'Tech' | 'Fitness' | 'Motivation' | 'General'
export type CountryOption = 'India' | 'US' | 'UK' | 'Canada' | 'Australia' | 'Global'
