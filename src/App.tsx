import { useState } from 'react'
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import type { AnalysisData, NicheOption } from "@/shared/types";

// Layout
import AppLayout from "./components/AppLayout";

// New Core Pages
import Overview from "./pages/Overview";
import Analyze from "./pages/Analyze";
import PreUpload from "./pages/PreUpload";
import Scripts from "./pages/Scripts";
import Trends from "./pages/Trends";
import Competitors from "./pages/Competitors";
import DailyBrief from "./pages/DailyBrief";
import Reports from "./pages/Reports";

// Original Pages
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

// Diagnose
import VideoDeath from "./pages/diagnose/VideoDeath";
import ChannelRoast from "./pages/diagnose/ChannelRoast";
import HealthCheck from "./pages/diagnose/HealthCheck";
import GrowthIntelligence from "./pages/diagnose/GrowthIntelligence";
import AlgorithmIntelligence from "./pages/diagnose/AlgorithmIntelligence";
import PlateauBreaker from "./pages/diagnose/PlateauBreaker";
import AlgorithmMap from "./pages/diagnose/AlgorithmMap";
import GrowthPredictor from "./pages/diagnose/GrowthPredictor";

// Create
import VideoMachine from "./pages/create/VideoMachine";
import HookScore from "./pages/create/HookScore";
import TitleTester from "./pages/create/TitleTester";
import ThumbnailStudio from "./pages/create/ThumbnailStudio";
import ScriptImprover from "./pages/create/ScriptImprover";
import Teleprompter from "./pages/create/Teleprompter";
import ThumbnailLab from "./pages/create/ThumbnailLab";
import TitlePsychology from "./pages/create/TitlePsychology";
import ThumbnailPsychology from "./pages/create/ThumbnailPsychology";

// Grow
import LightningLab from "./pages/grow/LightningLab";
import NicheGapRadar from "./pages/grow/NicheGapRadar";
import HiddenGold from "./pages/grow/HiddenGold";
import SponsorReadiness from "./pages/grow/SponsorReadiness";
import CollabMatcher from "./pages/grow/CollabMatcher";
import BurnoutPredictor from "./pages/grow/BurnoutPredictor";
import RecreateBest from "./pages/grow/RecreateBest";
import AudiencePersona from "./pages/grow/AudiencePersona";
import BurnoutRecovery from "./pages/grow/BurnoutRecovery";
import AudienceIntelligence from "./pages/grow/AudienceIntelligence";
import LaunchPlan from "./pages/grow/LaunchPlan";
import CommentIntelligence from "./pages/grow/CommentIntelligence";

// Strategy
import CompetitorSpy from "./pages/strategy/CompetitorSpy";
import IdeaValidator from "./pages/strategy/IdeaValidator";
import ViralWindow from "./pages/strategy/ViralWindow";
import NextVideo from "./pages/strategy/NextVideo";
import TrendRadar from "./pages/strategy/TrendRadar";
import TopicGraveyard from "./pages/strategy/TopicGraveyard";
import SeriesPlanner from "./pages/strategy/SeriesPlanner";
import CollabScriptGenerator from "./pages/strategy/CollabScriptGenerator";

// Analyze
import SubscriberConverter from "./pages/analyze/SubscriberConverter";
import VideoAnalyser from "./pages/analyze/VideoAnalyser";
import WarRoom from "./pages/analyze/WarRoom";
import ShortsVsLongs from "./pages/analyze/ShortsVsLongs";
import OutlierSpotter from "./pages/analyze/OutlierSpotter";
import DeadVideoRevival from "./pages/analyze/DeadVideoRevival";
import CommentMiner from "./pages/analyze/CommentMiner";
import BestUploadTime from "./pages/analyze/BestUploadTime";
import SentimentTimeline from "./pages/analyze/SentimentTimeline";
import ViralMoments from "./pages/analyze/ViralMoments";
import NicheAuthority from "./pages/analyze/NicheAuthority";
import RetentionPredictor from "./pages/analyze/RetentionPredictor";

// Coach
import AICoach from "./pages/coach/AICoach";

const queryClient = new QueryClient();
const withLayout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;

const App = () => {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [niche, setNiche] = useState<NicheOption>('General');

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Overview analysisData={analysisData} setAnalysisData={setAnalysisData} />} />
            <Route path="/analyze" element={<Analyze setAnalysisData={setAnalysisData} />} />
            <Route path="/preupload" element={withLayout(<PreUpload />)} />
            <Route path="/scripts" element={withLayout(<Scripts />)} />
            <Route path="/trends" element={withLayout(<Trends />)} />
            <Route path="/competitors" element={withLayout(<Competitors />)} />
            <Route path="/daily-brief" element={withLayout(<DailyBrief niche={niche} />)} />
            <Route path="/reports" element={withLayout(<Reports analysisData={analysisData} />)} />

            <Route path="/landing" element={<Landing />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/dashboard" element={withLayout(<Dashboard />)} />

          {/* DIAGNOSE */}
          <Route path="/diagnose/video-death" element={withLayout(<VideoDeath />)} />
          <Route path="/diagnose/roast" element={withLayout(<ChannelRoast />)} />
          <Route path="/diagnose/health-check" element={withLayout(<HealthCheck />)} />
          <Route path="/diagnose/growth-intelligence" element={withLayout(<GrowthIntelligence />)} />
          <Route path="/diagnose/algorithm-intelligence" element={withLayout(<AlgorithmIntelligence />)} />
          <Route path="/diagnose/plateau" element={withLayout(<PlateauBreaker />)} />
          <Route path="/diagnose/algorithm-map" element={withLayout(<AlgorithmMap />)} />
          <Route path="/diagnose/growth-predictor" element={withLayout(<GrowthPredictor />)} />

          {/* CREATE */}
          <Route path="/create/video-machine" element={withLayout(<VideoMachine />)} />
          <Route path="/create/hook-score" element={withLayout(<HookScore />)} />
          <Route path="/create/title-tester" element={withLayout(<TitleTester />)} />
          <Route path="/create/thumbnail-studio" element={withLayout(<ThumbnailStudio />)} />
          <Route path="/create/script-improver" element={withLayout(<ScriptImprover />)} />
          <Route path="/create/teleprompter" element={withLayout(<Teleprompter />)} />
          <Route path="/create/thumbnail-lab" element={withLayout(<ThumbnailLab />)} />
          <Route path="/create/title-psychology" element={withLayout(<TitlePsychology />)} />
          <Route path="/create/thumbnail-psychology" element={withLayout(<ThumbnailPsychology />)} />

          {/* GROW */}
          <Route path="/grow/lightning-lab" element={withLayout(<LightningLab />)} />
          <Route path="/grow/niche-gap" element={withLayout(<NicheGapRadar />)} />
          <Route path="/grow/hidden-gold" element={withLayout(<HiddenGold />)} />
          <Route path="/grow/sponsor" element={withLayout(<SponsorReadiness />)} />
          <Route path="/grow/collab-matcher" element={withLayout(<CollabMatcher />)} />
          <Route path="/grow/content-battery" element={withLayout(<BurnoutPredictor />)} />
          <Route path="/grow/recreate-best" element={withLayout(<RecreateBest />)} />
          <Route path="/grow/persona" element={withLayout(<AudiencePersona />)} />
          <Route path="/grow/burnout" element={withLayout(<BurnoutRecovery />)} />
          <Route path="/grow/audience-intelligence" element={withLayout(<AudienceIntelligence />)} />
          <Route path="/grow/launch-plan" element={withLayout(<LaunchPlan />)} />
          <Route path="/grow/comment-intelligence" element={withLayout(<CommentIntelligence />)} />

          {/* STRATEGY */}
          <Route path="/strategy/competitor-spy" element={withLayout(<CompetitorSpy />)} />
          <Route path="/strategy/idea-validator" element={withLayout(<IdeaValidator />)} />
          <Route path="/strategy/viral-window" element={withLayout(<ViralWindow />)} />
          <Route path="/strategy/next-video" element={withLayout(<NextVideo />)} />
          <Route path="/strategy/trend-radar" element={withLayout(<TrendRadar />)} />
          <Route path="/strategy/topic-graveyard" element={withLayout(<TopicGraveyard />)} />
          <Route path="/strategy/series-planner" element={withLayout(<SeriesPlanner />)} />
          <Route path="/strategy/collab-script" element={withLayout(<CollabScriptGenerator />)} />

          {/* ANALYZE */}
          <Route path="/analyze/subscriber-converter" element={withLayout(<SubscriberConverter />)} />
          <Route path="/analyze/video-analyser" element={withLayout(<VideoAnalyser />)} />
          <Route path="/analyze/war-room" element={withLayout(<WarRoom />)} />
          <Route path="/analyze/shorts-vs-longs" element={withLayout(<ShortsVsLongs />)} />
          <Route path="/analyze/outliers" element={withLayout(<OutlierSpotter />)} />
          <Route path="/analyze/revival" element={withLayout(<DeadVideoRevival />)} />
          <Route path="/analyze/comments" element={withLayout(<CommentMiner />)} />
          <Route path="/analyze/best-upload-time" element={withLayout(<BestUploadTime />)} />
          <Route path="/analyze/sentiment-timeline" element={withLayout(<SentimentTimeline />)} />
          <Route path="/analyze/viral-moments" element={withLayout(<ViralMoments />)} />
          <Route path="/analyze/niche-authority" element={withLayout(<NicheAuthority />)} />
          <Route path="/analyze/retention-predictor" element={withLayout(<RetentionPredictor />)} />

          {/* COACH */}
          <Route path="/coach" element={withLayout(<AICoach />)} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
