import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  Award,
  Settings,
  Flame,
  Utensils,
  Scan,
  Target,
  Leaf,
  Heart,
  Dumbbell,
  ChevronRight,
  Crown,
} from "lucide-react";


const badgeIcons: Record<string, React.ElementType> = {
  utensils: Utensils,
  "calendar-check": Award,
  flame: Flame,
  scan: Scan,
  plate: Utensils,
  heart: Heart,
  dumbbell: Dumbbell,
  compass: Target,
  leaf: Leaf,
  trophy: Crown,
};

export default function Profile() {
  const { user } = useAuth();
  const userId = user?.id ?? 1;

  const { data: badgeData } = trpc.badge.myBadges.useQuery(
    { userId },
    { enabled: !!userId }
  );
  const { data: todayData } = trpc.log.today.useQuery({ userId });
  const { data: recentLogs } = trpc.log.recent.useQuery(
    { userId, limit: 30 },
    { enabled: !!userId }
  );

  const utils = trpc.useUtils();
  const updateGoals = trpc.log.updateGoals.useMutation({
    onSuccess: () => utils.log.today.invalidate(),
  });

  const handleUpdateGoal = (field: string, delta: number) => {
    if (!todayData?.log) return;
    const currentVal = (todayData.log as any)[field];
    updateGoals.mutate({
      logId: todayData.log.id,
      [field]: Math.max(0, currentVal + delta),
    });
  };

  const [showSettings, setShowSettings] = useState(false);
  const [localGoals, setLocalGoals] = useState(() => {
    const saved = localStorage.getItem("localGoals");
    return saved ? JSON.parse(saved) : {
      calorieGoal: 2000,
      proteinGoal: 60,
      carbsGoal: 250,
      fatsGoal: 70
    };
  });
  const [dietaryPref, setDietaryPref] = useState(() => localStorage.getItem("dietaryPref") || "None");
  const [healthFocus, setHealthFocus] = useState(() => localStorage.getItem("healthFocus") || "None");

  const handleUpdateLocalGoal = (field: "calorieGoal" | "proteinGoal" | "carbsGoal" | "fatsGoal", delta: number) => {
    const newVal = Math.max(0, localGoals[field] + delta);
    const newGoals = { ...localGoals, [field]: newVal };
    setLocalGoals(newGoals);
    localStorage.setItem("localGoals", JSON.stringify(newGoals));
  };

  const earned = badgeData?.earned ?? [];
  const available = badgeData?.available ?? [];
  const totalPoints = badgeData?.totalPoints ?? 0;
  const log = todayData?.log;

  const stats = [
    {
      label: "Day Streak",
      value: log?.streakCount ?? 0,
      icon: Flame,
      color: "text-[#d97706] bg-[#fef3c7]",
    },
    {
      label: "Total Points",
      value: totalPoints,
      icon: Award,
      color: "text-[#c2410c] bg-[#ffedd5]",
    },
    {
      label: "Meals Logged",
      value: (recentLogs ?? []).length,
      icon: Utensils,
      color: "text-[#15803d] bg-[#dcfce7]",
    },
    {
      label: "Badges Earned",
      value: earned.length,
      icon: Crown,
      color: "text-[#7c3aed] bg-[#ede9fe]",
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 pb-8">
      {/* Profile Header */}
      <div className="flex flex-col items-center py-6">
        <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-[#c2410c]/20 mb-3">
          <img
            src={
              user?.avatar ??
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id ?? "user"}`
            }
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="font-serif text-xl text-[#1c1917]">
          {user?.name ?? "Guest User"}
        </h1>
        <p className="text-xs text-[#78716c] mt-0.5">{user?.email ?? "Sign in to track your progress"}</p>

        {!user && (
          <Link
            to="/login"
            className="mt-3 px-5 py-2 bg-[#c2410c] text-white rounded-full text-sm font-medium hover:bg-[#a83a0a] transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-3 border border-[#e7e5e4]/50 text-center"
            >
              <div
                className={`w-9 h-9 ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-1.5`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-lg font-serif font-bold text-[#1c1917]">{stat.value}</p>
              <p className="text-[9px] text-[#78716c] leading-tight">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Admin Verification Link */}
      <Link
        to="/admin/images"
        className="w-full flex items-center justify-between bg-[#fff7ed] rounded-2xl p-4 border border-[#ffedd5] mb-4 hover:bg-[#ffedd5] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#ffedd5] rounded-xl flex items-center justify-center">
            <Settings className="w-4 h-4 text-[#c2410c]" />
          </div>
          <div className="text-left">
            <span className="text-sm font-medium text-[#c2410c] block">Staging Verification</span>
            <span className="text-[10px] text-[#9a3412] block">Verify food database photography</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#c2410c]" />
      </Link>

      {/* Settings Toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="w-full flex items-center justify-between bg-white rounded-2xl p-4 border border-[#e7e5e4]/50 mb-4 hover:bg-[#fafaf9] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5f5f4] rounded-xl flex items-center justify-center">
            <Settings className="w-4 h-4 text-[#78716c]" />
          </div>
          <span className="text-sm font-medium text-[#1c1917]">Daily Goals</span>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-[#78716c] transition-transform ${showSettings ? "rotate-90" : ""}`}
        />
      </button>

      {/* Goals Settings */}
      {showSettings && (
        <div className="bg-white rounded-2xl p-4 border border-[#e7e5e4]/50 mb-5 space-y-4 animate-fade-in-up">
          {[
            {
              label: "Calorie Goal",
              field: "calorieGoal" as const,
              step: 50,
              value: localGoals.calorieGoal,
              unit: "kcal",
              color: "text-[#c2410c]",
            },
            {
              label: "Protein Goal",
              field: "proteinGoal" as const,
              step: 5,
              value: localGoals.proteinGoal,
              unit: "g",
              color: "text-[#f59e0b]",
            },
            {
              label: "Carbs Goal",
              field: "carbsGoal" as const,
              step: 10,
              value: localGoals.carbsGoal,
              unit: "g",
              color: "text-[#22c55e]",
            },
            {
              label: "Fats Goal",
              field: "fatsGoal" as const,
              step: 5,
              value: localGoals.fatsGoal,
              unit: "g",
              color: "text-[#f97316]",
            },
          ].map((goal) => (
            <div key={goal.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#1c1917]">{goal.label}</p>
                <p className={`text-xs ${goal.color} font-semibold`}>
                  {goal.value} {goal.unit}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleUpdateLocalGoal(goal.field, -goal.step)}
                  className="w-7 h-7 rounded-lg bg-[#f5f5f4] flex items-center justify-center text-[#78716c] hover:bg-[#e7e5e4] transition-colors text-sm font-bold"
                >
                  -
                </button>
                <button 
                  onClick={() => handleUpdateLocalGoal(goal.field, goal.step)}
                  className="w-7 h-7 rounded-lg bg-[#f5f5f4] flex items-center justify-center text-[#78716c] hover:bg-[#e7e5e4] transition-colors text-sm font-bold"
                >
                  +
                </button>
              </div>
            </div>
          ))}

          <div className="border-t border-[#e7e5e4] pt-3">
            <p className="text-xs text-[#78716c] mb-2">Dietary Preference</p>
            <div className="flex gap-2">
              {["None", "Vegetarian", "Vegan", "Gluten Free"].map((pref) => (
                <button
                  key={pref}
                  onClick={() => { setDietaryPref(pref); localStorage.setItem("dietaryPref", pref); }}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors ${
                    dietaryPref === pref
                      ? "bg-[#c2410c] text-white"
                      : "bg-[#f5f5f4] text-[#78716c] hover:bg-[#c2410c] hover:text-white"
                  }`}
                >
                  {pref}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[#e7e5e4] pt-3">
            <p className="text-xs text-[#78716c] mb-2">Health Focus</p>
            <div className="flex gap-2 flex-wrap">
              {["None", "Diabetes", "Heart Health", "Weight Loss", "Muscle Gain"].map(
                (focus) => (
                  <button
                    key={focus}
                    onClick={() => { setHealthFocus(focus); localStorage.setItem("healthFocus", focus); }}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors ${
                      healthFocus === focus
                        ? "bg-[#c2410c] text-white"
                        : "bg-[#f5f5f4] text-[#78716c] hover:bg-[#c2410c] hover:text-white"
                    }`}
                  >
                    {focus}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Badges Section */}
      <div className="mb-5">
        <h2 className="font-serif text-lg text-[#1c1917] mb-3">Your Badges</h2>

        {earned.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {earned.map((badge) => {
              const Icon = badgeIcons[badge.icon ?? "award"] ?? Award;
              return (
                <div
                  key={badge.id}
                  className="bg-white rounded-2xl p-4 border border-[#e7e5e4]/50 flex items-center gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: badge.color ? `${badge.color}20` : "#c2410c20",
                    }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: badge.color ?? "#c2410c" }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#1c1917] leading-tight truncate">
                      {badge.name}
                    </p>
                    <p className="text-[9px] text-[#78716c] mt-0.5">+{badge.points} pts</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-[#e7e5e4]/50 text-center">
            <Award className="w-8 h-8 text-[#d6d3d1] mx-auto mb-2" />
            <p className="text-sm text-[#78716c]">
              Start logging meals to earn your first badge!
            </p>
            <Link
              to="/thali"
              className="inline-block mt-3 text-xs text-[#c2410c] font-medium"
            >
              Build your first thali
            </Link>
          </div>
        )}
      </div>

      {/* Available Badges */}
      {available.length > 0 && (
        <div>
          <h2 className="font-serif text-lg text-[#1c1917] mb-3">Next Badges</h2>
          <div className="space-y-2">
            {available.slice(0, 5).map((badge) => {
              const Icon = badgeIcons[badge.icon ?? "award"] ?? Award;
              return (
                <div
                  key={badge.id}
                  className="bg-white rounded-xl p-3 border border-[#e7e5e4]/50 flex items-center gap-3 opacity-60"
                >
                  <div className="w-9 h-9 bg-[#f5f5f4] rounded-xl flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#d6d3d1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#1c1917] truncate">
                      {badge.name}
                    </p>
                    <p className="text-[9px] text-[#78716c] truncate">
                      {badge.description}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#78716c] font-medium">
                    +{badge.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sign Out */}
      {user && (
        <div className="mt-8 pb-4 text-center">
          <a
            href="/api/oauth/signout"
            className="text-xs text-[#78716c] hover:text-[#c2410c] transition-colors"
          >
            Sign Out
          </a>
        </div>
      )}
    </div>
  );
}
