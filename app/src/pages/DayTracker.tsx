import {} from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  Sun,
  Sunset,
  Moon,
  Coffee,
  Trash2,
  TrendingUp,
  Flame,
  Target,
  ChevronRight,
} from "lucide-react";

import { useDailyLog } from "@/context/DailyLogContext";
import { allFoods } from "@/data/foodData";

const mealIcons = {
  breakfast: { icon: Coffee, color: "bg-[#fef3c7] text-[#d97706]" },
  lunch: { icon: Sun, color: "bg-[#dcfce7] text-[#15803d]" },
  dinner: { icon: Sunset, color: "bg-[#fed7aa] text-[#c2410c]" },
  snack: { icon: Moon, color: "bg-[#e0e7ff] text-[#4f46e5]" },
};

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DayTracker() {
  const { user } = useAuth();
  const userId = user?.id ?? 1;
  const utils = trpc.useUtils();
  const { dailyLog, removeItemLog } = useDailyLog();

  const { data: todayData } = trpc.log.today.useQuery({ userId });
  const removeItem = trpc.log.removeItem.useMutation({
    onSuccess: () => utils.log.today.invalidate(),
  });

  const log = todayData?.log;
  const calorieGoal = log?.calorieGoal ?? 2000;
  const proteinGoal = log?.proteinGoal ?? 60;
  const carbsGoal = log?.carbsGoal ?? 250;
  const fatsGoal = log?.fatsGoal ?? 70;

  const today = new Date();
  const currentDay = today.getDay();

  // Combine items from dailyLog (localStorage primary) and DB fallback
  const localItems = dailyLog.items;
  const dbItems = (todayData?.items ?? []).map((i) => ({
    id: String(i.id),
    foodId: i.foodId,
    name: i.foodName ?? "Food",
    quantity: Number(i.quantity),
    calories: i.calories,
    protein: Number(i.protein),
    carbs: Number(i.carbs),
    fats: Number(i.fats),
    servingSize: i.servingSize,
    image: i.foodImage ?? undefined,
    mealType: i.mealType as "breakfast" | "lunch" | "dinner" | "snack",
  }));

  const items = localItems.length > 0 ? localItems : dbItems;

  const totals = localItems.length > 0 ? dailyLog.totals : (todayData?.totals ?? { calories: 0, protein: 0, carbs: 0, fats: 0 });
  const streak = dailyLog.streakCount > 0 ? dailyLog.streakCount : (log?.streakCount ?? 1);

  // Group items by meal type
  const mealsByType = {
    breakfast: items.filter((i) => i.mealType === "breakfast"),
    lunch: items.filter((i) => i.mealType === "lunch"),
    dinner: items.filter((i) => i.mealType === "dinner"),
    snack: items.filter((i) => i.mealType === "snack"),
  };

  const macroData = [
    {
      label: "Calories",
      current: totals.calories,
      goal: calorieGoal,
      color: "#c2410c",
      bgColor: "bg-[#c2410c]",
      percent: Math.min((totals.calories / calorieGoal) * 100, 100),
    },
    {
      label: "Protein",
      current: totals.protein,
      goal: proteinGoal,
      color: "#f59e0b",
      bgColor: "bg-[#f59e0b]",
      percent: Math.min((totals.protein / proteinGoal) * 100, 100),
    },
    {
      label: "Carbs",
      current: totals.carbs,
      goal: carbsGoal,
      color: "#22c55e",
      bgColor: "bg-[#22c55e]",
      percent: Math.min((totals.carbs / carbsGoal) * 100, 100),
    },
    {
      label: "Fats",
      current: totals.fats,
      goal: fatsGoal,
      color: "#f97316",
      bgColor: "bg-[#f97316]",
      percent: Math.min((totals.fats / fatsGoal) * 100, 100),
    },
  ];

  const handleRemoveItem = (itemId: string) => {
    removeItemLog(itemId);
    const numId = parseInt(itemId, 10);
    if (!isNaN(numId)) {
      removeItem.mutate({ itemId: numId });
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between py-4 mb-2">
        <div>
          <h1 className="font-serif text-2xl text-[#1c1917]">Day Tracker</h1>
          <p className="text-xs text-[#78716c]">
            {today.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#fef3c7] px-3 py-1.5 rounded-full border border-[#fde68a]">
          <Flame className="w-4 h-4 text-[#d97706]" />
          <span className="text-sm font-semibold text-[#92400e]">{streak} Day Streak</span>
        </div>
      </div>

      {/* Week Strip */}
      <div className="flex justify-between mb-5 bg-white rounded-2xl p-3 border border-[#e7e5e4]/50 shadow-sm">
        {daysOfWeek.map((day, i) => {
          const isToday = i === currentDay;
          return (
            <div
              key={day}
              className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all ${
                isToday ? "bg-[#c2410c] text-white" : "text-[#78716c]"
              }`}
            >
              <span className="text-[10px] font-medium">{day}</span>
              <span
                className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold ${
                  isToday ? "bg-white/20" : ""
                }`}
              >
                {today.getDate() - currentDay + i}
              </span>
            </div>
          );
        })}
      </div>

      {/* Calorie Ring */}
      <div className="bg-white rounded-3xl p-5 border border-[#e7e5e4]/50 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-[#1c1917]">Daily Progress</h2>
          <Link
            to="/profile"
            className="text-xs text-[#c2410c] flex items-center gap-0.5 font-medium hover:underline"
          >
            <Target className="w-3 h-3" />
            Edit Goals
          </Link>
        </div>

        <div className="flex items-center gap-5">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#f5f5f4" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="50"
                fill="none"
                stroke={totals.calories > calorieGoal ? "#dc2626" : "#c2410c"}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 50}
                strokeDashoffset={2 * Math.PI * 50 * (1 - macroData[0].percent / 100)}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-serif font-bold text-[#1c1917]">{totals.calories}</span>
              <span className="text-[9px] text-[#78716c]">/ {calorieGoal} kcal</span>
            </div>
          </div>

          <div className="flex-1 space-y-2.5">
            {macroData.slice(1).map((macro) => (
              <div key={macro.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#78716c]">{macro.label}</span>
                  <span className="text-[#1c1917] font-medium">
                    {macro.current.toFixed(0)} / {macro.goal}g
                  </span>
                </div>
                <div className="h-2 bg-[#f5f5f4] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500`}
                    style={{
                      width: `${macro.percent}%`,
                      backgroundColor: macro.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {totals.calories > calorieGoal && (
          <div className="mt-3 bg-[#fef2f2] text-[#dc2626] text-xs px-3 py-2 rounded-xl flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" />
            You have exceeded your daily calorie goal by {totals.calories - calorieGoal} kcal
          </div>
        )}
      </div>

      {/* Meal Sections */}
      <div className="space-y-4">
        {(Object.entries(mealsByType) as [keyof typeof mealsByType, typeof items][]).map(
          ([mealType, mealItems]) => {
            const { icon: Icon, color } = mealIcons[mealType];
            const mealCalories = mealItems.reduce((sum, i) => sum + i.calories, 0);

            return (
              <div key={mealType} className="bg-white rounded-2xl border border-[#e7e5e4]/50 shadow-sm overflow-hidden">
                {/* Meal Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#e7e5e4]/30 bg-[#fafaf9]">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 ${color} rounded-xl flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1c1917] capitalize">{mealType}</p>
                      <p className="text-[10px] text-[#78716c]">{mealItems.length} items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#1c1917]">{mealCalories} kcal</span>
                    <Link
                      to="/thali"
                      className="w-7 h-7 bg-[#f5f5f4] rounded-lg flex items-center justify-center hover:bg-[#e7e5e4] transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-[#78716c]" />
                    </Link>
                  </div>
                </div>

                {/* Meal Items */}
                {mealItems.length > 0 ? (
                  <div className="divide-y divide-[#f5f5f4]">
                    {mealItems.map((item) => {
                      const dbFood = allFoods.find((f) => f.id === item.foodId);
                      const displayImg = item.image || dbFood?.image;
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#fdfbf5] transition-colors">
                          {displayImg ? (
                            <img
                              src={displayImg}
                              alt={item.name}
                              className="w-10 h-10 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-[#f5f5f4] rounded-xl flex items-center justify-center font-serif font-bold text-[#c2410c] text-xs">
                              {item.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#1c1917] font-medium truncate">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-[#78716c]">
                              {Number(item.quantity).toFixed(0)}x {item.servingSize || "serving"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#c2410c]">
                              {item.calories} kcal
                            </span>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="w-6 h-6 rounded-full bg-[#fef2f2] flex items-center justify-center hover:bg-[#fecaca] transition-colors"
                              title="Delete item"
                            >
                              <Trash2 className="w-3 h-3 text-[#dc2626]" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-5 text-center">
                    <p className="text-xs text-[#78716c]">
                      No items logged for {mealType}.{" "}
                      <Link to="/thali" className="text-[#c2410c] font-medium hover:underline">
                        + Add food
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>

      {/* Quick Add FAB */}
      <Link
        to="/thali"
        className="fixed bottom-24 right-4 w-14 h-14 bg-[#c2410c] rounded-full shadow-lg flex items-center justify-center hover:bg-[#a83a0a] transition-colors z-30"
      >
        <Sun className="w-6 h-6 text-white" />
      </Link>
    </div>
  );
}
