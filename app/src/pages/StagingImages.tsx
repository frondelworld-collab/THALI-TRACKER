import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { 
  Check, 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  ArrowLeft, 
  Sparkles,
  HelpCircle,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ManifestItem {
  id: number;
  name: string;
  image_path: string;
  jpg_path: string;
  category_id: number;
  generation_status: string;
  verification_flag: boolean;
  prompt: string;
  serving_ware: string;
}

export default function StagingImages() {
  const { data: manifest, refetch, isLoading } = trpc.food.stagingManifest.useQuery();
  const { data: foods } = trpc.food.list.useQuery({ limit: 100 });
  const { data: categories } = trpc.food.categories.useQuery();
  
  const setVerificationMutation = trpc.food.setVerification.useMutation();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "fallback">("all");
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");
  const [selectedItem, setSelectedItem] = useState<ManifestItem | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-[#c2410c] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#78716c] font-medium">Loading Staging Manifest...</p>
      </div>
    );
  }

  // Convert manifest object to array
  const manifestList: ManifestItem[] = manifest 
    ? Object.keys(manifest).map(key => manifest[key] as ManifestItem)
    : [];

  // Filter items
  const filteredItems = manifestList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "approved" && item.verification_flag) ||
      (statusFilter === "pending" && !item.verification_flag) ||
      (statusFilter === "fallback" && item.generation_status === "fallback");
      
    const matchesCategory = 
      categoryFilter === "all" || item.category_id === categoryFilter;
      
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const stats = {
    total: manifestList.length,
    approved: manifestList.filter(i => i.verification_flag).length,
    pending: manifestList.filter(i => !i.verification_flag).length,
    fallback: manifestList.filter(i => i.generation_status === "fallback").length,
  };

  const handleApprove = async (foodId: number) => {
    try {
      await setVerificationMutation.mutateAsync({ foodId, verified: true });
      refetch();
      // Update selected item in local state if open
      if (selectedItem && selectedItem.id === foodId) {
        setSelectedItem(prev => prev ? { ...prev, verification_flag: true } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevoke = async (foodId: number) => {
    try {
      await setVerificationMutation.mutateAsync({ foodId, verified: false });
      refetch();
      // Update selected item in local state if open
      if (selectedItem && selectedItem.id === foodId) {
        setSelectedItem(prev => prev ? { ...prev, verification_flag: false } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getCategoryName = (catId: number) => {
    return categories?.find(c => c.id === catId)?.name ?? "Other";
  };

  // Find macro data from foods query list
  const getFoodMacros = (name: string) => {
    const food = foods?.find(f => f.name.toLowerCase() === name.toLowerCase());
    return food ? {
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      serving: food.servingSize
    } : null;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Link to="/profile" className="p-2 hover:bg-[#f5f5f4] rounded-full transition-colors text-[#78716c]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#1c1917]">Staging Image Verification</h1>
          <p className="text-xs text-[#78716c]">Review, verify, and approve generated food photography before production deployment</p>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-[#e7e5e4] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#78716c] uppercase font-bold tracking-wider">Total Database Items</span>
          <span className="text-2xl font-serif text-[#1c1917] mt-1">{stats.total}</span>
        </div>
        <div className="bg-[#dcfce7] p-4 rounded-2xl border border-[#bbf7d0] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#15803d] uppercase font-bold tracking-wider">Approved (Live)</span>
          <span className="text-2xl font-serif text-[#166534] mt-1 flex items-center gap-1.5">
            {stats.approved}
            <span className="text-xs font-sans text-[#15803d]">
              ({stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%)
            </span>
          </span>
        </div>
        <div className="bg-[#fef3c7] p-4 rounded-2xl border border-[#fde68a] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#b45309] uppercase font-bold tracking-wider">Pending Verification</span>
          <span className="text-2xl font-serif text-[#92400e] mt-1">{stats.pending}</span>
        </div>
        <div className="bg-[#f5f5f4] p-4 rounded-2xl border border-[#e7e5e4] shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-[#57534e] uppercase font-bold tracking-wider">Pillow Fallbacks</span>
          <span className="text-2xl font-serif text-[#44403c] mt-1">{stats.fallback}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left List & Filters (Span 2) */}
        <div className="md:col-span-2 space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#e7e5e4] shadow-sm space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#a8a29e]" />
              <Input
                placeholder="Search food by name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 bg-[#fafaf9] border-[#e7e5e4] rounded-xl text-sm"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#78716c] font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status:
              </span>
              {(["all", "pending", "approved", "fallback"] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-full border transition-all ${
                    statusFilter === status
                      ? "bg-[#c2410c] text-white border-[#c2410c] font-medium"
                      : "bg-white text-[#57534e] border-[#e7e5e4] hover:bg-[#fafaf9]"
                  }`}
                >
                  {status.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs border-t border-[#f5f5f4] pt-3">
              <span className="text-[#78716c] font-medium mr-1">Category:</span>
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-3 py-1 rounded-full border transition-all ${
                  categoryFilter === "all"
                    ? "bg-[#1c1917] text-white border-[#1c1917] font-medium"
                    : "bg-white text-[#57534e] border-[#e7e5e4] hover:bg-[#fafaf9]"
                }`}
              >
                ALL
              </button>
              {categories?.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-full border transition-all ${
                    categoryFilter === cat.id
                      ? "bg-[#1c1917] text-white border-[#1c1917] font-medium"
                      : "bg-white text-[#57534e] border-[#e7e5e4] hover:bg-[#fafaf9]"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Grid items */}
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map(item => {
              const macros = getFoodMacros(item.name);
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`bg-white rounded-2xl overflow-hidden border p-2 text-left cursor-pointer transition-all hover:shadow-md ${
                    selectedItem?.id === item.id 
                      ? "border-[#c2410c] ring-2 ring-[#c2410c]/20" 
                      : "border-[#e7e5e4]"
                  }`}
                >
                  {/* Staging UI Explore Card Component Render (with lazy load fallback) */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#f5f5f4] mb-2.5">
                    <img
                      src={item.image_path}
                      alt={item.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* Status Icons */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {item.verification_flag ? (
                        <span className="p-1 bg-[#22c55e] text-white rounded-full shadow-md">
                          <Check className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="p-1 bg-[#eab308] text-white rounded-full shadow-md">
                          <Clock className="w-3 h-3" />
                        </span>
                      )}
                      {item.generation_status === "fallback" && (
                        <span className="p-1 bg-[#78716c] text-white rounded-full shadow-md text-[8px] font-bold px-1.5 leading-tight uppercase">
                          PIL
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-xs font-semibold leading-tight">{item.name}</p>
                      <p className="text-white/80 text-[10px]">{macros?.calories ?? 0} kcal</p>
                    </div>
                  </div>

                  <div className="px-1 flex justify-between items-center text-[10px]">
                    <span className="text-[#a8a29e] font-semibold uppercase">#{item.id.toString().padStart(3, '0')}</span>
                    <span className="text-[#78716c]">{getCategoryName(item.category_id)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="bg-white p-8 rounded-2xl border border-[#e7e5e4] text-center space-y-2">
              <HelpCircle className="w-8 h-8 mx-auto text-[#a8a29e]" />
              <p className="text-sm font-medium text-[#1c1917]">No staging items found</p>
              <p className="text-xs text-[#78716c]">Try modifying search queries or status filters.</p>
            </div>
          )}
        </div>

        {/* Right Info Panel (Span 1) */}
        <div className="md:col-span-1">
          {selectedItem ? (
            <div className="bg-white rounded-2xl border border-[#e7e5e4] shadow-sm p-4 sticky top-6 space-y-4">
              <div className="flex justify-between items-start border-b border-[#f5f5f4] pb-3">
                <div>
                  <span className="text-[10px] text-[#c2410c] uppercase font-bold tracking-wider">ID #{selectedItem.id.toString().padStart(3, '0')}</span>
                  <h2 className="font-serif text-lg font-semibold text-[#1c1917] leading-tight mt-0.5">{selectedItem.name}</h2>
                  <p className="text-xs text-[#78716c] mt-0.5">{getCategoryName(selectedItem.category_id)}</p>
                </div>
                
                <Badge variant={selectedItem.verification_flag ? "default" : "secondary"} className={
                  selectedItem.verification_flag ? "bg-[#dcfce7] text-[#15803d] border-none" : "bg-[#fef3c7] text-[#b45309] border-none"
                }>
                  {selectedItem.verification_flag ? "Approved" : "Pending"}
                </Badge>
              </div>

              {/* Large Image Preview */}
              <div className="relative aspect-square rounded-2xl overflow-hidden border border-[#e7e5e4] bg-[#fafaf9]">
                <img
                  src={selectedItem.jpg_path}
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                  JPG Preview (Original)
                </div>
              </div>

              {/* WebP and Optimization Info */}
              <div className="bg-[#fafaf9] p-3 rounded-xl border border-[#e7e5e4] space-y-2 text-xs text-[#57534e]">
                <div className="flex justify-between">
                  <span className="font-medium text-[#78716c]">WebP Optimization:</span>
                  <span className="text-emerald-600 font-medium">Completed (&lt;200KB)</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Serving Ware:</span>
                  <span className="italic text-[#78716c]">{selectedItem.serving_ware}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Status:</span>
                  <span className="capitalize">{selectedItem.generation_status}</span>
                </div>
              </div>

              {/* Macros Panel */}
              {(() => {
                const macros = getFoodMacros(selectedItem.name);
                if (!macros) return null;
                return (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-[#1c1917] uppercase tracking-wider">Macros & Nutrition</h3>
                    <div className="bg-[#fdfbf5] p-3 rounded-xl border border-[#fde68a]/50 grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="border-r border-[#e7e5e4] last:border-none">
                        <span className="text-[9px] text-[#78716c] block">Calories</span>
                        <span className="font-bold text-[#c2410c]">{macros.calories}</span>
                      </div>
                      <div className="border-r border-[#e7e5e4] last:border-none">
                        <span className="text-[9px] text-[#78716c] block">Protein</span>
                        <span className="font-bold text-[#166534]">{macros.protein}g</span>
                      </div>
                      <div className="border-r border-[#e7e5e4] last:border-none">
                        <span className="text-[9px] text-[#78716c] block">Carbs</span>
                        <span className="font-bold text-[#92400e]">{macros.carbs}g</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#78716c] block">Fats</span>
                        <span className="font-bold text-[#9a3412]">{macros.fats}g</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Prompt template display */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#1c1917] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Style-Locked Prompt
                </span>
                <p className="text-[10px] bg-stone-900 text-stone-200 p-2.5 rounded-xl leading-relaxed max-h-32 overflow-y-auto select-all">
                  {selectedItem.prompt}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-[#f5f5f4]">
                {selectedItem.verification_flag ? (
                  <Button
                    onClick={() => handleRevoke(selectedItem.id)}
                    variant="outline"
                    className="flex-1 bg-white hover:bg-[#fafaf9] border-[#e7e5e4] text-[#78716c] text-xs font-medium py-4 rounded-xl"
                  >
                    Revoke Approval
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleApprove(selectedItem.id)}
                    className="flex-1 bg-[#166534] hover:bg-[#15803d] text-white text-xs font-medium py-4 rounded-xl shadow-md transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" /> Approve Staging
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#fafaf9] rounded-2xl border border-dashed border-[#d6d3d1] p-8 text-center text-[#78716c] space-y-2 sticky top-6">
              <Database className="w-10 h-10 mx-auto text-[#d6d3d1] mb-2" />
              <p className="text-sm font-semibold">Select an item</p>
              <p className="text-xs">Click on any food card in the grid to view details, verify web image aspect ratios, and approve staging deployment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
