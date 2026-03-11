import FeaturePage from "@/components/FeaturePage";
import { Construction } from "lucide-react";

interface ComingSoonProps {
  emoji: string;
  title: string;
  description: string;
}

export default function ComingSoon({ emoji, title, description }: ComingSoonProps) {
  return (
    <FeaturePage emoji={emoji} title={title} description={description}>
      <div className="text-center py-16">
        <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
          <Construction className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-lg font-medium mb-2">Coming Soon</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This feature is being built. Connect your YouTube channel to unlock it when it's ready.
        </p>
      </div>
    </FeaturePage>
  );
}
