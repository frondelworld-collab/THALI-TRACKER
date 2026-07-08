interface FoodPlateProps {
  activeLayers: {
    dal: boolean;
    rice: boolean;
    curry: boolean;
    roti: boolean;
  };
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  calorieGoal?: number;
}

export default function FoodPlate({ activeLayers, nutrition, calorieGoal = 2000 }: FoodPlateProps) {
  const calPercent = calorieGoal > 0
    ? Math.min((nutrition?.calories ?? 0) / calorieGoal * 100, 100)
    : 0;

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (calPercent / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      {/* Plate */}
      <div className="plate-container">
        <div className="plate">
          {/* Plate Base */}
          <svg className="plate-base" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="#f5f5f4" stroke="#e7e5e4" strokeWidth="2" />
            <circle cx="100" cy="100" r="70" fill="none" stroke="#d6d3d1" strokeWidth="1" />
            <circle cx="80" cy="80" r="10" fill="white" opacity="0.4" />
          </svg>

          {/* Rice Layer */}
          <svg
            className={`layer rice-layer ${activeLayers.rice ? "active" : ""}`}
            viewBox="0 0 200 200"
            style={{ opacity: activeLayers.rice ? 1 : 0 }}
          >
            <ellipse cx="100" cy="110" rx="45" ry="20" fill="#000" opacity="0.1" />
            <path d="M 70 110 Q 100 60 130 110 Z" fill="#fefce8" />
            <ellipse cx="90" cy="95" rx="3" ry="1.5" fill="#fef9c3" />
            <ellipse cx="100" cy="85" rx="3" ry="1.5" fill="#fef9c3" />
            <ellipse cx="110" cy="95" rx="3" ry="1.5" fill="#fef9c3" />
            <ellipse cx="95" cy="100" rx="3" ry="1.5" fill="#fef9c3" />
            <ellipse cx="105" cy="100" rx="3" ry="1.5" fill="#fef9c3" />
            <ellipse cx="85" cy="105" rx="3" ry="1.5" fill="#fef9c3" />
            <ellipse cx="115" cy="105" rx="3" ry="1.5" fill="#fef9c3" />
            <ellipse cx="95" cy="90" rx="3" ry="1.5" fill="#fef9c3" />
            <ellipse cx="105" cy="90" rx="3" ry="1.5" fill="#fef9c3" />
            <ellipse cx="100" cy="105" rx="3" ry="1.5" fill="#fef9c3" />
            <ellipse cx="90" cy="110" rx="3" ry="1.5" fill="#fef9c3" />
            <ellipse cx="110" cy="110" rx="3" ry="1.5" fill="#fef9c3" />
          </svg>

          {/* Dal Layer */}
          <svg
            className={`layer dal-layer ${activeLayers.dal ? "active" : ""}`}
            viewBox="0 0 200 200"
            style={{ opacity: activeLayers.dal ? 1 : 0 }}
          >
            <ellipse cx="130" cy="130" rx="35" ry="15" fill="#000" opacity="0.1" />
            <circle cx="130" cy="130" r="30" fill="#ffedd5" />
            <circle cx="130" cy="130" r="25" fill="#fb923c" opacity="0.8" />
            <circle cx="120" cy="125" r="1" fill="#c2410c" />
            <circle cx="135" cy="135" r="1.5" fill="#c2410c" />
            <circle cx="125" cy="138" r="1" fill="#c2410c" />
            <circle cx="140" cy="128" r="1" fill="#c2410c" />
          </svg>

          {/* Curry Layer */}
          <svg
            className={`layer curry-layer ${activeLayers.curry ? "active" : ""}`}
            viewBox="0 0 200 200"
            style={{ opacity: activeLayers.curry ? 1 : 0 }}
          >
            <ellipse cx="70" cy="140" rx="35" ry="15" fill="#000" opacity="0.1" />
            <circle cx="70" cy="140" r="30" fill="#f5f5f4" />
            <circle cx="70" cy="140" r="25" fill="#b91c1c" opacity="0.85" />
            <path d="M 65 135 Q 70 125 75 135 Z" fill="#166534" />
            <path d="M 60 140 Q 65 130 70 140 Z" fill="#166534" />
            <path d="M 70 138 Q 75 128 80 138 Z" fill="#166534" />
          </svg>

          {/* Roti Layer */}
          <svg
            className={`layer roti-layer ${activeLayers.roti ? "active" : ""}`}
            viewBox="0 0 200 200"
            style={{ opacity: activeLayers.roti ? 1 : 0 }}
          >
            <ellipse cx="140" cy="80" rx="35" ry="20" fill="#000" opacity="0.1" />
            <path d="M 110 80 Q 140 40 170 80 Q 140 120 110 80 Z" fill="#fde68a" />
            <path
              d="M 125 70 Q 130 75 135 70 M 145 80 Q 150 85 155 80 M 130 85 Q 135 90 140 85"
              fill="none"
              stroke="#d97706"
              strokeWidth="0.5"
              opacity="0.6"
            />
          </svg>
        </div>
      </div>

      {/* Nutrition Overlay */}
      {nutrition && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md rounded-2xl px-5 py-3 shadow-lg border border-[#e7e5e4]/50 min-w-[240px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#e7e5e4"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#c2410c"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#1c1917]">
                {Math.round(calPercent)}%
              </span>
            </div>
            <div>
              <p className="text-xs text-[#78716c]">Calories</p>
              <p className="text-lg font-serif font-medium text-[#1c1917]">
                {nutrition.calories}
                <span className="text-xs text-[#78716c] ml-1">/ {calorieGoal}</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[#fef3c7] rounded-lg px-2 py-1.5">
              <p className="text-[9px] text-[#78716c] uppercase tracking-wider">Protein</p>
              <p className="text-sm font-medium text-[#1c1917]">{nutrition.protein.toFixed(0)}g</p>
            </div>
            <div className="bg-[#dcfce7] rounded-lg px-2 py-1.5">
              <p className="text-[9px] text-[#78716c] uppercase tracking-wider">Carbs</p>
              <p className="text-sm font-medium text-[#1c1917]">{nutrition.carbs.toFixed(0)}g</p>
            </div>
            <div className="bg-[#ffedd5] rounded-lg px-2 py-1.5">
              <p className="text-[9px] text-[#78716c] uppercase tracking-wider">Fats</p>
              <p className="text-sm font-medium text-[#1c1917]">{nutrition.fats.toFixed(0)}g</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
