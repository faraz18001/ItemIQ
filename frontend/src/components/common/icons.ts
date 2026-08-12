import {
  Book, ClipboardList, TrendingUp, Home, FilePlus2, Layers, Bell, CheckCircle2,
  Award, BarChart3, Users, FileText, Activity, type LucideIcon,
} from 'lucide-react';

/** Maps the string icon keys used in role navigation to Lucide components. */
export const ICONS: Record<string, LucideIcon> = {
  book: Book,
  clipboard: ClipboardList,
  chartUp: TrendingUp,
  home: Home,
  filePlus: FilePlus2,
  layers: Layers,
  bell: Bell,
  checkCircle: CheckCircle2,
  award: Award,
  chart: BarChart3,
  users: Users,
  file: FileText,
  activity: Activity,
};
