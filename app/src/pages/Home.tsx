import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { ScanLine, UtensilsCrossed, TrendingUp, Flame, Award } from "lucide-react";


export default function Home() {
  const { user } = useAuth();
  const userId = user?.id ?? 0;
  const { data: todayData } = trpc.log.today.useQuery(
    { userId: userId || 1 },
    { enabled: true }
  );

  const { data: popularFoods } = trpc.food.popular.useQuery();
  const { data: categories } = trpc.food.categories.useQuery();

  const totals = todayData?.totals ?? { calories: 0, protein: 0, carbs: 0, fats: 0 };
  const log = todayData?.log;
  const calorieGoal = log?.calorieGoal ?? 2000;
  const calPercent = Math.min((totals.calories / calorieGoal) * 100, 100);


  const activityItems = popularFoods?.slice(0, 6).map((food, i) => ({
    id: food.id,
    name: food.name,
    calories: food.calories,
    image: food.image ?? "/hero-thali.jpg",
    category: categories?.find((c) => c.id === food.categoryId)?.name ?? "",
    span: i % 3 === 0 ? "row-span-2" : "row-span-1",
  })) ?? [];

  return (
    <div className="max-w-lg mx-auto">
      {/* Hero Section */}
      <section className="relative -mt-[60px] h-[70vh] overflow-hidden">
        <img
          src="/hero-thali.jpg"
          alt="Indian Thali"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-10">
          <h1 className="font-serif text-4xl font-medium text-white leading-tight mb-2">
            Discover the
            <br />
            Rhythm of Your Plate
          </h1>
          <p className="text-white/70 text-sm font-sans mb-5">
            Track tradition, one macro at a time.
          </p>
          <Link
            to="/scanner"
            className="inline-flex items-center gap-2 bg-white text-[#1c1917] px-5 py-2.5 rounded-full text-sm font-medium hover:bg-white/90 transition-colors shadow-lg"
          >
            <ScanLine className="w-4 h-4" />
            Scan Your Meal
          </Link>
        </div>
      </section>

      {/* Daily Summary Card */}
      <section className="px-4 -mt-6 relative z-10">
        <div className="bg-white rounded-3xl shadow-lg border border-[#e7e5e4]/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg text-[#1c1917]">Today&apos;s Nourishment</h2>
            <Link
              to="/tracker"
              className="text-xs text-[#c2410c] font-medium flex items-center gap-1"
            >
              <TrendingUp className="w-3 h-3" />
              View All
            </Link>
          </div>

          {/* Calorie Ring */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#f5f5f4" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="52"
                  fill="none"
                  stroke={calPercent > 100 ? "#dc2626" : "#c2410c"}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - calPercent / 100)}
                  className="transition-all duration-1000"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#1c1917]">
                {Math.round(calPercent)}%
              </span>
            </div>
            <div className="flex-1">
              <p className="text-2xl font-serif text-[#1c1917]">
                {totals.calories}
                <span className="text-sm text-[#78716c] ml-1">/ {calorieGoal} kcal</span>
              </p>
              <div className="flex gap-3 mt-1.5">
                <span className="text-xs bg-[#fef3c7] text-[#92400e] px-2 py-0.5 rounded-full">
                  P: {totals.protein.toFixed(0)}g
                </span>
                <span className="text-xs bg-[#dcfce7] text-[#166534] px-2 py-0.5 rounded-full">
                  C: {totals.carbs.toFixed(0)}g
                </span>
                <span className="text-xs bg-[#ffedd5] text-[#9a3412] px-2 py-0.5 rounded-full">
                  F: {totals.fats.toFixed(0)}g
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/thali"
              className="flex items-center gap-3 bg-[#fdfbf5] hover:bg-[#fef3c7] transition-colors rounded-2xl p-3.5 border border-[#e7e5e4]/50"
            >
              <div className="w-10 h-10 bg-[#c2410c]/10 rounded-xl flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-[#c2410c]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1c1917]">Build Thali</p>
                <p className="text-[10px] text-[#78716c]">Create your plate</p>
              </div>
            </Link>
            <Link
              to="/scanner"
              className="flex items-center gap-3 bg-[#fdfbf5] hover:bg-[#fef3c7] transition-colors rounded-2xl p-3.5 border border-[#e7e5e4]/50"
            >
              <div className="w-10 h-10 bg-[#c2410c]/10 rounded-xl flex items-center justify-center">
                <ScanLine className="w-5 h-5 text-[#c2410c]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1c1917]">Scan Food</p>
                <p className="text-[10px] text-[#78716c]">AI recognition</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Streak & Points */}
      <section className="px-4 mt-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-[#fef3c7] to-[#fde68a] rounded-2xl p-4">
            <Flame className="w-5 h-5 text-[#d97706] mb-2" />
            <p className="text-2xl font-serif text-[#92400e]">{log?.streakCount ?? 0}</p>
            <p className="text-xs text-[#b45309]">Day Streak</p>
          </div>
          <div className="bg-gradient-to-br from-[#c2410c] to-[#ea580c] rounded-2xl p-4">
            <Award className="w-5 h-5 text-white/80 mb-2" />
            <p className="text-2xl font-serif text-white">{log?.pointsEarned ?? 0}</p>
            <p className="text-xs text-white/70">Points Earned</p>
          </div>
        </div>
      </section>

      {/* Featured Thali */}
      <section className="px-4 mt-6">
        <div className="bg-[#fef3c7] rounded-3xl p-5">
          <h2 className="font-serif text-xl text-[#1c1917] mb-1">Featured Balanced Thali</h2>
          <p className="text-xs text-[#78716c] mb-4">A nutritious combination for a healthy day</p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { name: "Dal Makhani", cal: 320, img: "/dal-makhani.jpg" },
              { name: "Jeera Rice", cal: 210, img: "/jeera-rice.jpg" },
              { name: "Paneer Tikka", cal: 280, img: "/paneer-tikka.jpg" },
            ].map((item) => (
              <div key={item.name} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <img src={item.img} alt={item.name} className="w-full h-20 object-cover" />
                <div className="p-2">
                  <p className="text-[10px] font-medium text-[#1c1917] leading-tight">{item.name}</p>
                  <p className="text-[9px] text-[#78716c]">{item.cal} kcal</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between bg-white/60 rounded-xl px-4 py-2.5">
            <span className="text-sm text-[#1c1917] font-medium">Total</span>
            <span className="text-sm text-[#c2410c] font-serif font-medium">810 kcal</span>
          </div>
        </div>
      </section>

      {/* Activity Feed - Masonry Grid */}
      <section className="px-4 mt-6 pb-8">
        <h2 className="font-serif text-xl text-[#1c1917] mb-4">Explore Foods</h2>
        <div className="grid grid-cols-2 gap-3">
          {activityItems.map((item) => (
            <Link
              key={item.id}
              to="/thali"
              className={`${item.span} group relative rounded-2xl overflow-hidden bg-white shadow-sm border border-[#e7e5e4]/50`}
            >
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                style={{ minHeight: item.span === "row-span-2" ? "200px" : "100px" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white text-xs font-medium leading-tight">{item.name}</p>
                <p className="text-white/70 text-[10px]">{item.calories} kcal</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
