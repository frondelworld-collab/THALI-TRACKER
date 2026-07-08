import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import FoodPlate from "@/components/FoodPlate";
import {
  ArrowLeft,
  Wheat,
  Beef,
  Carrot,
  Bean,
  Milk,
  Cookie,
  CupSoda,
  Cake,
  Plus,
  Minus,
  Check,
} from "lucide-react";

const categoryIcons: Record<string, React.ElementType> = {
  wheat: Wheat,
  beef: Beef,
  carrot: Carrot,
  bean: Bean,
  milk: Milk,
  cookie: Cookie,
  cupSoda: CupSoda,
  cake: Cake,
};

const layerMap: Record<number, keyof typeof defaultLayers> = {
  4: "dal",    // Lentils & Dal
  6: "rice",   // Rice
  2: "curry",  // Proteins (treated as curry on plate)
  5: "curry",  // Dairy (paneer dishes as curry)
  3: "curry",  // Vegetables
  1: "roti",   // Grains & Breads
};

const defaultLayers = { dal: false, rice: false, curry: false, roti: false };

export default function ThaliBuilder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? 1;
  const utils = trpc.useUtils();

  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [thaliItems, setThaliItems] = useState<
    { foodId: number; name: string; quantity: number; categoryId: number; calories: number; protein: number; carbs: number; fats: number }[]
  >([]);
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [showConfirm, setShowConfirm] = useState(false);

  const categories = [
    { id: 1, name: "Grains & Breads", icon: "wheat" },
    { id: 2, name: "Proteins", icon: "beef" },
    { id: 4, name: "Lentils & Dal", icon: "bean" },
    { id: 6, name: "Rice", icon: "wheat" }
  ];

  const popularFoods = [
    { id: 1, name: "Dal Makhani", calories: 320, image: "/dal-makhani.jpg", categoryId: 4, protein: 14, carbs: 30, fats: 16, servingSize: "1 bowl" },
    { id: 2, name: "Jeera Rice", calories: 210, image: "/jeera-rice.jpg", categoryId: 6, protein: 4, carbs: 42, fats: 3, servingSize: "1 bowl" },
    { id: 3, name: "Paneer Tikka", calories: 280, image: "/paneer-tikka.jpg", categoryId: 2, protein: 18, carbs: 8, fats: 20, servingSize: "6 pieces" },
    { id: 4, name: "Chole Bhature", calories: 450, image: "/chole-masala.jpg", categoryId: 4, protein: 12, carbs: 55, fats: 15, servingSize: "1 plate" },
    { id: 5, name: "Tandoori Roti", calories: 120, image: "/tandoori-roti.jpg", categoryId: 1, protein: 4, carbs: 24, fats: 1, servingSize: "1 piece" },
    { id: 6, name: "Butter Chicken", calories: 490, image: "/butter-chicken.jpg", categoryId: 2, protein: 35, carbs: 12, fats: 34, servingSize: "1 bowl" }
  ];

  const foods = selectedCategory 
    ? popularFoods.filter(f => f.categoryId === selectedCategory) 
    : popularFoods;
  const { data: todayData } = trpc.log.today.useQuery({ userId });
  const addItem = trpc.log.addItem.useMutation({
    onSuccess: () => {
      utils.log.today.invalidate();
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 2000);
    },
  });

  const calorieGoal = todayData?.log?.calorieGoal ?? 2000;

  // Compute active layers based on what's in the thali
  const activeLayers = useMemo(() => {
    const layers = { ...defaultLayers };
    thaliItems.forEach((item) => {
      const layerKey = layerMap[item.categoryId];
      if (layerKey) layers[layerKey] = true;
    });
    return layers;
  }, [thaliItems]);

  // Compute nutrition totals
  const nutrition = useMemo(() => {
    return thaliItems.reduce(
      (acc, item) => ({
        calories: acc.calories + Math.round(item.calories * item.quantity),
        protein: acc.protein + item.protein * item.quantity,
        carbs: acc.carbs + item.carbs * item.quantity,
        fats: acc.fats + item.fats * item.quantity,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [thaliItems]);

  const addToThali = (food: NonNullable<typeof foods>[0]) => {
    const existing = thaliItems.find((t) => t.foodId === food.id);
    if (existing) {
      setThaliItems(
        thaliItems.map((t) =>
          t.foodId === food.id ? { ...t, quantity: t.quantity + 1 } : t
        )
      );
    } else {
      setThaliItems([
        ...thaliItems,
        {
          foodId: food.id,
          name: food.name,
          quantity: 1,
          categoryId: food.categoryId,
          calories: food.calories,
          protein: Number(food.protein),
          carbs: Number(food.carbs),
          fats: Number(food.fats),
        },
      ]);
    }
  };

  const updateQuantity = (foodId: number, delta: number) => {
    setThaliItems(
      thaliItems
        .map((t) =>
          t.foodId === foodId ? { ...t, quantity: Math.max(0, t.quantity + delta) } : t
        )
        .filter((t) => t.quantity > 0)
    );
  };

  const saveThali = async () => {
    if (!todayData?.log || thaliItems.length === 0) return;
    for (const item of thaliItems) {
      await addItem.mutateAsync({
        logId: todayData.log.id,
        foodId: item.foodId,
        quantity: item.quantity,
        mealType,
      });
    }
    setThaliItems([]);
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#fdfbf5]/95 backdrop-blur-md border-b border-[#e7e5e4]/50 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 -ml-2 rounded-xl hover:bg-[#1c1917]/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#1c1917]" />
          </button>
          <h1 className="font-serif text-xl text-[#1c1917]">Build Your Thali</h1>
        </div>

        {/* Meal Type Pills */}
        <div className="flex gap-2 mb-3">
          {(["breakfast", "lunch", "dinner", "snack"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setMealType(type)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                mealType === type
                  ? "bg-[#c2410c] text-white"
                  : "bg-[#f5f5f4] text-[#78716c] hover:bg-[#e7e5e4]"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Progress Pills */}
        <div className="flex gap-2">
          {[
            { label: "Protein", current: nutrition.protein, goal: todayData?.log?.proteinGoal ?? 60, color: "bg-amber-100 text-amber-800" },
            { label: "Carbs", current: nutrition.carbs, goal: todayData?.log?.carbsGoal ?? 250, color: "bg-green-100 text-green-800" },
            { label: "Fats", current: nutrition.fats, goal: todayData?.log?.fatsGoal ?? 70, color: "bg-orange-100 text-orange-800" },
          ].map((macro) => (
            <div
              key={macro.label}
              className={`flex-1 ${macro.color} rounded-lg px-2.5 py-1.5 text-center`}
            >
              <p className="text-[9px] uppercase tracking-wider opacity-70">{macro.label}</p>
              <p className="text-xs font-semibold">
                {macro.current.toFixed(0)} / {macro.goal}g
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Animated Plate */}
      <div className="px-4 py-6">
        <FoodPlate
          activeLayers={activeLayers}
          nutrition={nutrition}
          calorieGoal={calorieGoal}
        />
      </div>

      {/* Thali Items List */}
      {thaliItems.length > 0 && (
        <div className="px-4 mb-4">
          <div className="bg-white rounded-2xl border border-[#e7e5e4]/50 p-3 space-y-2">
            {thaliItems.map((item) => (
              <div key={item.foodId} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-[#1c1917] font-medium truncate">
                  {item.name}
                </span>
                <span className="text-xs text-[#78716c]">
                  {Math.round(item.calories * item.quantity)} kcal
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.foodId, -1)}
                    className="w-6 h-6 rounded-full bg-[#f5f5f4] flex items-center justify-center hover:bg-[#e7e5e4] transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.foodId, 1)}
                    className="w-6 h-6 rounded-full bg-[#f5f5f4] flex items-center justify-center hover:bg-[#e7e5e4] transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      {thaliItems.length > 0 && (
        <div className="px-4 mb-4">
          <button
            onClick={saveThali}
            disabled={addItem.isPending}
            className="w-full bg-[#c2410c] text-white py-3 rounded-2xl font-medium text-sm hover:bg-[#a83a0a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {addItem.isPending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save to Daily Log
              </>
            )}
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategory === null
                ? "bg-[#1c1917] text-white"
                : "bg-[#f5f5f4] text-[#78716c] hover:bg-[#e7e5e4]"
            }`}
          >
            All Foods
          </button>
          {categories?.map((cat) => {
            const Icon = categoryIcons[cat.icon ?? "wheat"] ?? Wheat;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? "bg-[#c2410c] text-white"
                    : "bg-[#f5f5f4] text-[#78716c] hover:bg-[#e7e5e4]"
                }`}
              >
                <Icon className="w-3 h-3" />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Food Grid */}
      <div className="px-4 pb-8">
        <div className="grid grid-cols-2 gap-3">
          {foods?.map((food) => {
            const inThali = thaliItems.find((t) => t.foodId === food.id);
            return (
              <button
                key={food.id}
                onClick={() => addToThali(food)}
                className={`relative bg-white rounded-2xl overflow-hidden border text-left transition-all hover:shadow-md ${
                  inThali ? "border-[#c2410c] ring-1 ring-[#c2410c]/20" : "border-[#e7e5e4]/50"
                }`}
              >
                {food.image && (
                  <img
                    src={food.image}
                    alt={food.name}
                    className="w-full h-28 object-cover"
                  />
                )}
                <div className="p-3">
                  <p className="text-xs font-medium text-[#1c1917] leading-tight mb-0.5">
                    {food.name}
                  </p>
                  <p className="text-[10px] text-[#78716c]">{food.servingSize}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-semibold text-[#c2410c]">
                      {food.calories} kcal
                    </span>
                    {inThali && (
                      <span className="w-5 h-5 bg-[#c2410c] rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Success Toast */}
      {showConfirm && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#15803d] text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 animate-fade-in-up">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">Saved to your daily log!</span>
        </div>
      )}
    </div>
  );
}
