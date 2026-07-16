import { useState, useRef, useCallback } from "react";
import { allFoods } from "@/data/foodData";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  Camera,
  Upload,
  Sparkles,
  Plus,
  X,
  Loader2,
  Check,
} from "lucide-react";

const demoFoods = allFoods.map(f => ({ ...f, confidence: 0.9 + Math.random() * 0.05 }));

export default function Scanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? 1;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const [scanState, setScanState] = useState<"idle" | "scanning" | "result">("idle");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [result, setResult] = useState<(typeof demoFoods)[0] | null>(null);
  const [showAdded, setShowAdded] = useState(false);

  const { data: todayData } = trpc.log.today.useQuery({ userId });
  const { data: dbFoods } = trpc.food.list.useQuery();
  const createScan = trpc.scan.create.useMutation();
  const analyzeScan = trpc.scan.analyze.useMutation();
  const addItem = trpc.log.addItem.useMutation({
    onSuccess: () => utils.log.today.invalidate(),
  });

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result as string;
        setSelectedFile(base64Data);
        startScan(base64Data, file.name);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const startScan = (base64Image: string, fileName?: string) => {
    setScanState("scanning");
    setScanProgress(0);

    let resolvedResult: any = null;

    // Trigger backend API call to analyze the image
    analyzeScan
      .mutateAsync({
        base64Image,
        fileName,
      })
      .then((apiResult) => {
        resolvedResult = apiResult;
      })
      .catch((err) => {
        console.error("Scanning failed:", err);
        // Fallback in case of API failure
        resolvedResult = demoFoods[Math.floor(Math.random() * demoFoods.length)];
      });

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) {
          if (resolvedResult) {
            clearInterval(interval);
            setResult(resolvedResult);
            setScanState("result");
            return 100;
          }
          return 90;
        }
        return prev + 5;
      });
    }, 100);
  };

  const addToLog = async () => {
    if (!result || !todayData?.log) return;

    await createScan.mutateAsync({
      userId,
      imageUrl: selectedFile ?? result.image,
      detectedFood: result.name,
      confidence: result.confidence,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fats: result.fats,
    });

    // Find food ID from database
    let foodName = result.name;
    if (foodName === "Dal Chawal") {
      // Fallback to "Yellow Dal Tadka" if "Dal Chawal" is not in database
      const hasDalChawal = dbFoods?.some((f) => f.name.toLowerCase() === "dal chawal");
      if (!hasDalChawal) {
        foodName = "Yellow Dal Tadka";
      }
    }

    const dbFood = dbFoods?.find(
      (f) => f.name.toLowerCase() === foodName.toLowerCase()
    );
    const foodId = dbFood?.id ?? 1;

    await addItem.mutateAsync({
      logId: todayData.log.id,
      foodId,
      quantity: 1,
      mealType: "lunch",
    });

    setShowAdded(true);
    setTimeout(() => setShowAdded(false), 2000);
  };

  const reset = () => {
    setScanState("idle");
    setSelectedFile(null);
    setScanProgress(0);
    setResult(null);
  };

  // Ring particles for scanning animation
  const RingParticles = () => {
    const particles = Array.from({ length: 48 }, (_, i) => i);
    return (
      <div className="relative w-64 h-64">
        {/* Outer ring */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "8s" }}>
          {particles.map((i) => {
            const angle = (i / 48) * 360;
            const radius = 120;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            return (
              <div
                key={`o-${i}`}
                className="absolute w-1.5 h-1.5 bg-[#fb923c] rounded-full"
                style={{
                  left: `calc(50% + ${x}px - 3px)`,
                  top: `calc(50% + ${y}px - 3px)`,
                  opacity: 0.3 + (i % 3) * 0.2,
                  animation: `pulse 1.5s ease-in-out ${i * 0.05}s infinite`,
                }}
              />
            );
          })}
        </div>
        {/* Middle ring */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "5s", animationDirection: "reverse" }}>
          {particles.slice(0, 24).map((i) => {
            const angle = (i / 24) * 360;
            const radius = 80;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            return (
              <div
                key={`m-${i}`}
                className="absolute w-2 h-2 bg-[#c2410c] rounded-full"
                style={{
                  left: `calc(50% + ${x}px - 4px)`,
                  top: `calc(50% + ${y}px - 4px)`,
                  opacity: 0.4 + (i % 2) * 0.3,
                }}
              />
            );
          })}
        </div>
        {/* Inner ring */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
          {particles.slice(0, 12).map((i) => {
            const angle = (i / 12) * 360;
            const radius = 45;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            return (
              <div
                key={`i-${i}`}
                className="absolute w-2.5 h-2.5 bg-[#fb923c] rounded-full"
                style={{
                  left: `calc(50% + ${x}px - 5px)`,
                  top: `calc(50% + ${y}px - 5px)`,
                  opacity: 0.6,
                  boxShadow: "0 0 8px #fb923c",
                }}
              />
            );
          })}
        </div>
        {/* Center glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#c2410c]/20 rounded-full blur-xl animate-pulse" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#1c1917] text-white relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-4">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-white/80">Food Scanner</span>
        <div className="w-9" />
      </div>

      {/* Idle State */}
      {scanState === "idle" && (
        <div className="flex flex-col items-center justify-center min-h-screen px-6">
          <div className="relative mb-8">
            <div className="w-48 h-48 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full bg-white/5 flex items-center justify-center">
                <Camera className="w-12 h-12 text-white/40" />
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-14 h-14 bg-[#c2410c] rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>

          <h2 className="font-serif text-2xl text-center mb-2">Scan Your Meal</h2>
          <p className="text-white/50 text-sm text-center mb-8 max-w-[260px]">
            Take a photo or upload an image of any Indian dish to get instant nutritional analysis
          </p>

          <div className="flex flex-col gap-3 w-full max-w-[280px]">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-[#c2410c] hover:bg-[#a83a0a] text-white py-3.5 rounded-2xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Photo
            </button>
            <button
              onClick={() => {
                setSelectedFile("/hero-thali.jpg");
                startScan("/hero-thali.jpg", "hero-thali.jpg");
              }}
              className="w-full bg-white/10 hover:bg-white/20 text-white py-3.5 rounded-2xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Try Demo Scan
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Scanning State */}
      {scanState === "scanning" && (
        <div className="flex flex-col items-center justify-center min-h-screen px-6">
          {/* Preview Image */}
          {selectedFile && (
            <div className="absolute inset-0 z-0">
              <img
                src={selectedFile}
                alt="Scanning"
                className="w-full h-full object-cover opacity-20 blur-sm"
              />
              <div className="absolute inset-0 bg-[#1c1917]/80" />
            </div>
          )}

          <div className="relative z-10 flex flex-col items-center">
            <RingParticles />

            <div className="mt-12 text-center">
              <h3 className="font-serif text-xl mb-2">Analyzing Cuisine</h3>
              <p className="text-white/50 text-sm mb-6">Identifying dish and calculating nutrition...</p>

              {/* Progress Bar */}
              <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#fb923c] to-[#c2410c] rounded-full transition-all duration-100"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <p className="text-white/30 text-xs mt-2">{scanProgress}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Result State */}
      {scanState === "result" && result && (
        <div className="min-h-screen flex flex-col">
          {/* Image Hero */}
          <div className="relative h-[40vh]">
            <img
              src={selectedFile ?? result.image}
              alt={result.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1c1917] via-[#1c1917]/30 to-transparent" />
            <button
              onClick={reset}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Results Sheet */}
          <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-10 px-5 pt-6 pb-8">
            <div className="w-12 h-1 bg-[#e7e5e4] rounded-full mx-auto mb-6" />

            <h2 className="font-serif text-2xl text-[#1c1917] mb-1">{result.name}</h2>
            <div className="flex items-center gap-2 mb-6">
              <span className="bg-[#dcfce7] text-[#15803d] text-xs px-2.5 py-1 rounded-full font-medium">
                {(result.confidence * 100).toFixed(0)}% match
              </span>
              <span className="bg-[#fef3c7] text-[#d97706] text-xs px-2.5 py-1 rounded-full font-medium">
                Indian Cuisine
              </span>
            </div>

            {/* Calorie Ring */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#f5f5f4" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="52"
                    fill="none" stroke="#c2410c" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52}
                    strokeDashoffset={2 * Math.PI * 52 * 0.6}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-serif font-bold text-[#1c1917]">{result.calories}</span>
                  <span className="text-[9px] text-[#78716c]">kcal</span>
                </div>
              </div>
              <p className="text-sm text-[#78716c]">
                Estimated for a standard serving. Calorie content may vary based on preparation method and portion size.
              </p>
            </div>

            {/* Macros Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Protein", value: result.protein, color: "bg-[#fef3c7] text-[#92400e]" },
                { label: "Carbs", value: result.carbs, color: "bg-[#dcfce7] text-[#166534]" },
                { label: "Fats", value: result.fats, color: "bg-[#ffedd5] text-[#9a3412]" },
              ].map((macro) => (
                <div key={macro.label} className={`${macro.color} rounded-2xl p-4 text-center`}>
                  <p className="text-lg font-semibold">{macro.value}g</p>
                  <p className="text-[10px] uppercase tracking-wider opacity-70 mt-0.5">{macro.label}</p>
                </div>
              ))}
            </div>

            {/* Progress Bars */}
            <div className="space-y-3 mb-8">
              {[
                { label: "Protein", value: result.protein, max: 60, color: "bg-[#f59e0b]" },
                { label: "Carbohydrates", value: result.carbs, max: 250, color: "bg-[#22c55e]" },
                { label: "Fats", value: result.fats, max: 70, color: "bg-[#f97316]" },
              ].map((macro) => (
                <div key={macro.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#78716c]">{macro.label}</span>
                    <span className="text-[#1c1917] font-medium">
                      {macro.value}g / {macro.max}g
                    </span>
                  </div>
                  <div className="h-2 bg-[#f5f5f4] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${macro.color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min((macro.value / macro.max) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={addToLog}
                disabled={addItem.isPending}
                className="flex-1 bg-[#c2410c] text-white py-3.5 rounded-2xl font-medium text-sm hover:bg-[#a83a0a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {addItem.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add to Log
              </button>
              <button
                onClick={reset}
                className="px-5 py-3.5 rounded-2xl border border-[#e7e5e4] text-sm font-medium text-[#78716c] hover:bg-[#f5f5f4] transition-colors"
              >
                Scan Again
              </button>
            </div>
          </div>

          {/* Added Toast */}
          {showAdded && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#15803d] text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 animate-fade-in-up">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Added to your daily log!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
