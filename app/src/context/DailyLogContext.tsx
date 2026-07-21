import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface LoggedItem {
  id: string;
  foodId: number;
  name: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize?: string;
  image?: string;
  categoryId?: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  timestamp?: number;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface MealCategoryLog {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  items: LoggedItem[];
}

export interface DailyLogData {
  date: string;
  streakCount: number;
  pointsEarned: number;
  totals: MacroTotals;
  items: LoggedItem[];
  meals: {
    breakfast: MealCategoryLog;
    lunch: MealCategoryLog;
    dinner: MealCategoryLog;
    snack: MealCategoryLog;
  };
}

interface DailyLogContextType {
  dailyLog: DailyLogData;
  saveMealLog: (
    mealType: "breakfast" | "lunch" | "dinner" | "snack",
    newItems: {
      foodId: number;
      name: string;
      quantity: number;
      calories: number;
      protein: number;
      carbs: number;
      fats: number;
      servingSize?: string;
      image?: string;
      categoryId?: number;
    }[]
  ) => { pointsEarned: number; newStreak: number };
  removeItemLog: (itemId: string) => void;
  refreshLog: () => void;
  getTodayKey: () => string;
}

export function getTodayDateStr(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayStorageKey(): string {
  return `nourish_daily_log_${getTodayDateStr()}`;
}

const emptyMealCategory = (): MealCategoryLog => ({
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
  items: [],
});

const defaultLogData = (dateStr: string = getTodayDateStr()): DailyLogData => ({
  date: dateStr,
  streakCount: 1,
  pointsEarned: 0,
  totals: { calories: 0, protein: 0, carbs: 0, fats: 0 },
  items: [],
  meals: {
    breakfast: emptyMealCategory(),
    lunch: emptyMealCategory(),
    dinner: emptyMealCategory(),
    snack: emptyMealCategory(),
  },
});

function computeLogTotals(items: LoggedItem[]) {
  const totals: MacroTotals = { calories: 0, protein: 0, carbs: 0, fats: 0 };
  const meals = {
    breakfast: emptyMealCategory(),
    lunch: emptyMealCategory(),
    dinner: emptyMealCategory(),
    snack: emptyMealCategory(),
  };

  items.forEach((item) => {
    totals.calories += item.calories;
    totals.protein += item.protein;
    totals.carbs += item.carbs;
    totals.fats += item.fats;

    const mType = item.mealType || "lunch";
    if (meals[mType]) {
      meals[mType].items.push(item);
      meals[mType].calories += item.calories;
      meals[mType].protein += item.protein;
      meals[mType].carbs += item.carbs;
      meals[mType].fats += item.fats;
    }
  });

  return { totals, meals };
}

function loadLogFromStorage(): DailyLogData {
  const todayStr = getTodayDateStr();
  const key = getTodayStorageKey();
  
  let persistentPoints = 0;
  const storedPoints = localStorage.getItem("nourish_user_points");
  if (storedPoints) {
    persistentPoints = parseInt(storedPoints, 10) || 0;
  }

  let streakCount = 1;
  const streakMetaStr = localStorage.getItem("nourish_user_streak");
  if (streakMetaStr) {
    try {
      const streakMeta = JSON.parse(streakMetaStr);
      if (streakMeta.lastLoggedDate === todayStr) {
        streakCount = streakMeta.streakCount || 1;
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
        if (streakMeta.lastLoggedDate === yStr) {
          streakCount = streakMeta.streakCount || 1;
        } else {
          streakCount = 1;
        }
      }
    } catch (e) {}
  }

  const existingStr = localStorage.getItem(key);
  if (existingStr) {
    try {
      const parsed = JSON.parse(existingStr);
      const items: LoggedItem[] = parsed.items || [];
      const { totals, meals } = computeLogTotals(items);
      return {
        date: todayStr,
        streakCount: parsed.streakCount ?? streakCount,
        pointsEarned: parsed.pointsEarned ?? persistentPoints,
        totals,
        items,
        meals,
      };
    } catch (e) {
      console.error("Failed to parse nourish daily log:", e);
    }
  }

  // Fallback / legacy check: 'daily_thali_log'
  const legacyStr = localStorage.getItem("daily_thali_log");
  if (legacyStr) {
    try {
      const legacy = JSON.parse(legacyStr);
      if (legacy.date === new Date().toDateString() && legacy.items && legacy.items.length > 0) {
        const migratedItems: LoggedItem[] = legacy.items.map((it: any, idx: number) => ({
          id: `legacy-${idx}-${Date.now()}`,
          foodId: it.foodId,
          name: it.name,
          quantity: it.quantity || 1,
          calories: Math.round((it.calories || 0) * (it.quantity || 1)),
          protein: (it.protein || 0) * (it.quantity || 1),
          carbs: (it.carbs || 0) * (it.quantity || 1),
          fats: (it.fats || 0) * (it.quantity || 1),
          mealType: "lunch",
        }));
        const { totals, meals } = computeLogTotals(migratedItems);
        const migratedLog: DailyLogData = {
          date: todayStr,
          streakCount,
          pointsEarned: persistentPoints > 0 ? persistentPoints : 50,
          totals,
          items: migratedItems,
          meals,
        };
        localStorage.setItem(key, JSON.stringify(migratedLog));
        return migratedLog;
      }
    } catch (e) {}
  }

  return {
    ...defaultLogData(todayStr),
    streakCount,
    pointsEarned: persistentPoints,
  };
}

const DailyLogContext = createContext<DailyLogContextType | null>(null);

export const DailyLogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dailyLog, setDailyLog] = useState<DailyLogData>(loadLogFromStorage);

  const refreshLog = useCallback(() => {
    const updated = loadLogFromStorage();
    setDailyLog(updated);
  }, []);

  useEffect(() => {
    refreshLog();
    const handleSync = () => refreshLog();
    window.addEventListener("storage", handleSync);
    window.addEventListener("nourish_log_updated", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("nourish_log_updated", handleSync);
    };
  }, [refreshLog]);

  const saveMealLog = useCallback(
    (
      mealType: "breakfast" | "lunch" | "dinner" | "snack",
      newItems: {
        foodId: number;
        name: string;
        quantity: number;
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        servingSize?: string;
        image?: string;
        categoryId?: number;
      }[]
    ) => {
      const todayStr = getTodayDateStr();
      const key = getTodayStorageKey();

      const current = loadLogFromStorage();

      // Streak update logic
      let newStreak = current.streakCount;
      const streakMetaStr = localStorage.getItem("nourish_user_streak");
      if (streakMetaStr) {
        try {
          const streakMeta = JSON.parse(streakMetaStr);
          if (streakMeta.lastLoggedDate !== todayStr) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
            if (streakMeta.lastLoggedDate === yStr) {
              newStreak = (streakMeta.streakCount || 1) + 1;
            } else {
              newStreak = 1;
            }
          }
        } catch (e) {}
      } else {
        newStreak = Math.max(1, current.streakCount);
      }

      localStorage.setItem(
        "nourish_user_streak",
        JSON.stringify({ lastLoggedDate: todayStr, streakCount: newStreak })
      );

      // Award +50 points
      const pointsAdded = 50;
      const totalPoints = current.pointsEarned + pointsAdded;
      localStorage.setItem("nourish_user_points", totalPoints.toString());

      // Format logged items
      const formattedItems: LoggedItem[] = newItems.map((item, idx) => ({
        id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        foodId: item.foodId,
        name: item.name,
        quantity: item.quantity,
        calories: Math.round(item.calories * item.quantity),
        protein: item.protein * item.quantity,
        carbs: item.carbs * item.quantity,
        fats: item.fats * item.quantity,
        servingSize: item.servingSize,
        image: item.image,
        categoryId: item.categoryId,
        mealType,
        timestamp: Date.now(),
      }));

      const combinedItems = [...current.items, ...formattedItems];
      const { totals, meals } = computeLogTotals(combinedItems);

      const updatedLogData: DailyLogData = {
        date: todayStr,
        streakCount: newStreak,
        pointsEarned: totalPoints,
        totals,
        items: combinedItems,
        meals,
      };

      localStorage.setItem(key, JSON.stringify(updatedLogData));
      // Also sync legacy key for backwards compatibility
      localStorage.setItem(
        "daily_thali_log",
        JSON.stringify({
          date: new Date().toDateString(),
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          fats: totals.fats,
          items: combinedItems,
        })
      );

      setDailyLog(updatedLogData);
      window.dispatchEvent(new CustomEvent("nourish_log_updated"));

      return { pointsEarned: pointsAdded, newStreak };
    },
    []
  );

  const removeItemLog = useCallback((itemId: string) => {
    const todayStr = getTodayDateStr();
    const key = getTodayStorageKey();
    const current = loadLogFromStorage();

    const filteredItems = current.items.filter((i) => i.id !== itemId);
    const { totals, meals } = computeLogTotals(filteredItems);

    const updatedLogData: DailyLogData = {
      ...current,
      totals,
      items: filteredItems,
      meals,
    };

    localStorage.setItem(key, JSON.stringify(updatedLogData));
    setDailyLog(updatedLogData);
    window.dispatchEvent(new CustomEvent("nourish_log_updated"));
  }, []);

  return (
    <DailyLogContext.Provider
      value={{
        dailyLog,
        saveMealLog,
        removeItemLog,
        refreshLog,
        getTodayKey: getTodayStorageKey,
      }}
    >
      {children}
    </DailyLogContext.Provider>
  );
};

export function useDailyLog() {
  const context = useContext(DailyLogContext);
  if (!context) {
    throw new Error("useDailyLog must be used within a DailyLogProvider");
  }
  return context;
}
