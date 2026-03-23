import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "primary" | "secondary" | "accent" | "success" | "warning";
}

const variantStyles = {
  primary: "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
  secondary: "bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground",
  accent: "bg-gradient-to-br from-accent to-accent/80 text-accent-foreground",
  success: "bg-gradient-to-br from-success to-success/80 text-success-foreground",
  warning: "bg-gradient-to-br from-warning to-warning/80 text-warning-foreground",
};

const iconContainerStyles = {
  primary: "bg-primary-foreground/20",
  secondary: "bg-secondary-foreground/20",
  accent: "bg-accent-foreground/20",
  success: "bg-success-foreground/20",
  warning: "bg-warning-foreground/20",
};

export const StatsCard = ({
  title,
  value,
  icon: Icon,
  trend,
  variant = "primary",
}: StatsCardProps) => {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] h-full",
        variantStyles[variant]
      )}
    >
      <CardContent className="p-6 flex items-center justify-center h-full">
        <div className="flex items-center justify-between w-full">
          <div className="space-y-2">
            <p className="text-sm font-medium opacity-90">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {trend && (
              <p className="text-xs opacity-80">
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% este mês
              </p>
            )}
          </div>
          <div className={cn("rounded-full p-3", iconContainerStyles[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
      <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
    </Card>
  );
};
