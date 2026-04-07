import {
  Mic,
  FileText,
  Shield,
  Smartphone,
  Heart,
  ShieldCheck,
  Users,
  Clock,
  type LucideIcon,
} from "lucide-react";

type LandingItem = {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
};

export const FEATURES: LandingItem[] = [
  { icon: Mic, titleKey: "feature1Title", descKey: "feature1Desc" },
  { icon: FileText, titleKey: "feature2Title", descKey: "feature2Desc" },
  { icon: Shield, titleKey: "feature3Title", descKey: "feature3Desc" },
  { icon: Smartphone, titleKey: "feature4Title", descKey: "feature4Desc" },
];

export const BENEFITS: LandingItem[] = [
  { icon: Heart, titleKey: "benefit1Title", descKey: "benefit1Desc" },
  { icon: ShieldCheck, titleKey: "benefit2Title", descKey: "benefit2Desc" },
  { icon: Users, titleKey: "benefit3Title", descKey: "benefit3Desc" },
  { icon: Clock, titleKey: "benefit4Title", descKey: "benefit4Desc" },
];

export function buildFaqItems(t: (key: string) => string) {
  return Array.from({ length: 10 }, (_, i) => ({
    question: t(`faq${i + 1}Q`),
    answer: t(`faq${i + 1}A`),
  }));
}
