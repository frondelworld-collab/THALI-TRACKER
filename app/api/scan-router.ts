import { z } from "zod";
import { createRouter, publicQuery } from "./middleware.js";
import { getDb } from "./queries/connection.js";
import { scanHistory, foods } from "@db/schema.js";
import { eq, desc } from "drizzle-orm";

export const scanRouter = createRouter({
  // Analyze image using Gemini (with keyword fallback)
  analyze: publicQuery
    .input(
      z.object({
        base64Image: z.string(),
        fileName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const allDbFoods = await db.select().from(foods);
      const foodNames = allDbFoods.map((f) => f.name);

      let apiKey = process.env.GEMINI_API_KEY;
      let detectedName = "";
      let confidence = 0.95;
      let calories = 350;
      let protein = 10;
      let carbs = 50;
      let fats = 8;
      let servingSize = "1 serving (~250g)";
      let servingSizeG = 250;

      if (apiKey && input.base64Image.startsWith("data:")) {
        try {
          const match = input.base64Image.match(/^data:(image\/\w+);base64,(.+)$/);
          if (!match) throw new Error("Invalid image format");
          const mimeType = match[1];
          const base64Data = match[2];

          let maxRetries = 3;
          let attempt = 0;
          let response;

          while (attempt < maxRetries) {
            response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        {
                          text: `Analyze the image and identify the food. Pick the closest match from this list if possible: ${foodNames.join(", ")}. Return a JSON object with: { "detectedFood": "Name of the dish", "confidence": a number from 0.0 to 1.0 representing how confident you are, "calories": estimated calories as integer, "protein": estimated protein in grams, "carbs": estimated carbs in grams, "fats": estimated fats in grams, "servingSize": estimated portion description e.g. "1 bowl (200g)", "servingSizeG": estimated weight in grams e.g. 200 }`,
                        },
                        {
                          inlineData: {
                            mimeType,
                            data: base64Data,
                          },
                        },
                      ],
                    },
                  ],
                  generationConfig: {
                    responseMimeType: "application/json",
                  },
                }),
              }
            );

            if (response.status === 429) {
              attempt++;
              console.warn(`Gemini API rate limited (429). Retrying attempt ${attempt}...`);
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
              continue;
            }
            break;
          }

          if (response.ok) {
            const data = (await response.json()) as any;
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResponse) {
              const parsed = JSON.parse(textResponse);
              detectedName = parsed.detectedFood;
              confidence = parsed.confidence ?? 0.95;
              calories = parsed.calories ?? 350;
              protein = parsed.protein ?? 10;
              carbs = parsed.carbs ?? 50;
              fats = parsed.fats ?? 8;
              servingSize = parsed.servingSize ?? "1 serving (~250g)";
              servingSizeG = parsed.servingSizeG ?? 250;
            }
          } else {
            console.error("Gemini API error:", await response.text());
          }
        } catch (e) {
          console.error("Failed to classify image with Gemini:", e);
        }
      }

      // Fallback if API key is missing or classification failed
      if (!detectedName) {
        if (input.fileName) {
          const lowerName = input.fileName.toLowerCase();
          const cleanName = lowerName.replace(/[-_]/g, " ").replace(/\.[^/.]+$/, "");
          detectedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
          confidence = 0.8;
        } else {
          detectedName = "Unrecognized Food";
          confidence = 0.3;
        }
      }

      // Get the database food item details for the final classification
      const matchedDbFood = allDbFoods.find(
        (f) => f.name.toLowerCase() === detectedName.toLowerCase() || detectedName.toLowerCase().includes(f.name.toLowerCase())
      );

      return {
        name: matchedDbFood?.name || detectedName,
        calories: matchedDbFood ? matchedDbFood.calories : calories,
        protein: matchedDbFood ? matchedDbFood.protein : protein,
        carbs: matchedDbFood ? matchedDbFood.carbs : carbs,
        fats: matchedDbFood ? matchedDbFood.fats : fats,
        servingSize: matchedDbFood?.servingSize || servingSize,
        servingSizeG: matchedDbFood?.servingSizeG || servingSizeG,
        confidence,
        image: matchedDbFood?.image ?? `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800&query=${encodeURIComponent(detectedName)}`,
      };
    }),

  // Create a new scan entry
  create: publicQuery
    .input(
      z.object({
        userId: z.number(),
        imageUrl: z.string(),
        detectedFood: z.string(),
        confidence: z.number().min(0).max(1),
        calories: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fats: z.number(),
        fullResult: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(scanHistory).values({
        userId: input.userId,
        imageUrl: input.imageUrl,
        detectedFood: input.detectedFood,
        confidence: Number(input.confidence.toFixed(2)),
        calories: input.calories,
        protein: Number(input.protein.toFixed(1)),
        carbs: Number(input.carbs.toFixed(1)),
        fats: Number(input.fats.toFixed(1)),
        fullResult: input.fullResult ?? null,
        isAddedToLog: false,
      });
      return { success: true, id: Number((result as unknown as { insertId: number }).insertId ?? 0) };
    }),

  // Get scan history for user
  history: publicQuery
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(scanHistory)
        .where(eq(scanHistory.userId, input.userId))
        .orderBy(desc(scanHistory.createdAt));
    }),

  // Get single scan
  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(scanHistory)
        .where(eq(scanHistory.id, input.id));
      return result[0] ?? null;
    }),

  // Mark scan as added to log
  markAdded: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(scanHistory)
        .set({ isAddedToLog: true })
        .where(eq(scanHistory.id, input.id));
      return { success: true };
    }),
});
