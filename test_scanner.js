import fs from 'fs';



const apiKey = process.env.KIMI_API_KEY || '';

const testImages = [
    { name: "Sev Puri", url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400" },
    { name: "Kadai Paneer", url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc0?w=400" },
    { name: "Rava Dosa", url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400" },
    { name: "Butter Chicken", url: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400" },
    { name: "Dal Makhani", url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400" },
    { name: "Chicken Biryani", url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400" },
    { name: "Masala Dosa", url: "https://images.unsplash.com/photo-1627308595229-7830b5c91f9f?w=400" },
    { name: "Idli Sambar", url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400" }, 
    { name: "Samosa", url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400" }, 
    { name: "Paneer Tikka", url: "https://images.unsplash.com/photo-1599487405270-81f1857997ea?w=400" },
    { name: "Pizza", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400" },
    { name: "Cheeseburger", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400" },
    { name: "Caesar Salad", url: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400" },
    { name: "Pasta Carbonara", url: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400" },
    { name: "Sushi Roll", url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400" }
];

async function runTests() {
    console.log("Starting E2E tests for Food Scanner Pipeline...");
    const results = [];
    
    for (const item of testImages) {
        console.log(`\nTesting: ${item.name}`);
        try {
            const imgRes = await fetch(item.url);
            const arrayBuffer = await imgRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Data = buffer.toString('base64');
            const mimeType = 'image/jpeg';
            
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
                            text: `Analyze the image and identify the food (whether Indian or global). Estimate the nutrition for a standard serving size (e.g. 1 bowl, 1 slice, 1 piece). Return a JSON object with: { "detectedFood": "Name of the dish", "confidence": a number from 0.0 to 1.0 representing how confident you are, "calories": estimated calories as integer, "protein": estimated protein in grams, "carbs": estimated carbs in grams, "fats": estimated fats in grams }`,
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
              
              if (response.ok) {
                  const data = await response.json();
                  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (textResponse) {
                      const parsed = JSON.parse(textResponse);
                      console.log("-> Success:", parsed);
                      results.push({ name: item.name, result: parsed });
                  } else {
                      console.log("-> Failed to parse text:", data);
                  }
              } else {
                  console.log("-> API Error:", await response.text());
              }
        } catch (e) {
            console.error("-> Error:", e.message);
        }
        
        await new Promise(r => setTimeout(r, 2000));
    }
    
    fs.writeFileSync('test_results.json', JSON.stringify(results, null, 2));
    console.log("\nDone! Results saved to test_results.json");
}

runTests();
