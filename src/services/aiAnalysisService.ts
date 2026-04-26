// /**
//  * AI Dental Image Analysis Service (Mock)
//  * 
//  * Simulates AI-powered dental image analysis.
//  * 
//  * TODO: Replace with real AI API integration:
//  * 1. Update analyzeImage() to POST the image to your AI endpoint
//  * 2. Parse the real API response into AnalysisResult format
//  * 3. Remove the mock delay and random result selection
//  */

// export interface AnalysisResult {
//   id: string;
//   condition: string;
//   confidence: number;
//   severity: 'low' | 'moderate' | 'high';
//   description: string;
//   recommendation: string;
// }

// export interface AnalysisResponse {
//   results: AnalysisResult[];
//   summary: string;
//   analyzedAt: string;
// }

// const mockResults: AnalysisResult[][] = [
//   [
//     {
//       id: 'res-1',
//       condition: 'Possible Cavity Detected',
//       confidence: 87,
//       severity: 'moderate',
//       description: 'A dark spot has been identified on the upper right molar, which may indicate early-stage tooth decay (dental caries).',
//       recommendation: 'Schedule an appointment with your dentist for a clinical examination and possible X-ray to confirm the diagnosis.',
//     },
//     {
//       id: 'res-2',
//       condition: 'Minor Plaque Buildup',
//       confidence: 72,
//       severity: 'low',
//       description: 'Slight plaque accumulation detected along the gum line in the lower front teeth area.',
//       recommendation: 'Maintain regular brushing and flossing. Consider a professional cleaning appointment.',
//     },
//   ],
//   [
//     {
//       id: 'res-3',
//       condition: 'Signs of Gum Inflammation',
//       confidence: 91,
//       severity: 'high',
//       description: 'Redness and swelling detected in the gum tissue, particularly around the lower molars. This may indicate early gingivitis.',
//       recommendation: 'Please consult your dentist as soon as possible. Early treatment can prevent progression to periodontitis.',
//     },
//   ],
//   [
//     {
//       id: 'res-4',
//       condition: 'No Visible Issues Detected',
//       confidence: 95,
//       severity: 'low',
//       description: 'The dental image appears normal with no visible signs of cavities, gum disease, or other dental conditions.',
//       recommendation: 'Continue your regular dental hygiene routine and schedule your next routine check-up.',
//     },
//   ],
//   [
//     {
//       id: 'res-5',
//       condition: 'Tooth Discoloration',
//       confidence: 78,
//       severity: 'low',
//       description: 'Surface staining detected on several teeth, likely caused by dietary habits (coffee, tea) or lifestyle factors.',
//       recommendation: 'Consider a professional teeth whitening consultation or ask about cosmetic options at your next visit.',
//     },
//     {
//       id: 'res-6',
//       condition: 'Possible Enamel Erosion',
//       confidence: 65,
//       severity: 'moderate',
//       description: 'Thinning enamel detected on the biting surfaces of the premolars. This could be due to acidic diet or grinding.',
//       recommendation: 'Avoid acidic foods and drinks. A custom night guard may be recommended if bruxism is suspected.',
//     },
//   ],
// ];

// const mockSummaries = [
//   'Analysis complete. Moderate attention recommended — please review the findings with your dentist.',
//   'Analysis complete. Immediate dental consultation recommended for the identified condition.',
//   'Analysis complete. Your dental health looks good! Keep up the great work.',
//   'Analysis complete. Minor cosmetic concerns identified. No urgent action needed.',
// ];

// /**
//  * Analyzes a dental image and returns mock AI results.
//  * 
//  * TODO: Replace with real API call:
//  * const formData = new FormData();
//  * formData.append('image', imageFile);
//  * const response = await fetch(`${API_BASE_URL}/ai/analyze`, {
//  *   method: 'POST',
//  *   headers: { 'Authorization': `Bearer ${getAuthToken()}` },
//  *   body: formData,
//  * });
//  * return response.json();
//  */
// export async function analyzeImage(_imageFile: File): Promise<AnalysisResponse> {
//   // Simulate API processing delay (2-4 seconds)
//   const processingTime = 2000 + Math.random() * 2000;
//   await new Promise(resolve => setTimeout(resolve, processingTime));

//   const index = Math.floor(Math.random() * mockResults.length);

//   return {
//     results: mockResults[index],
//     summary: mockSummaries[index],
//     analyzedAt: new Date().toISOString(),
//   };
// }
/**
 * AI Dental Image Analysis Service (REAL API VERSION)
 */
















// export interface AnalysisResult {
//   id: string;
//   condition: string;
//   confidence: number;
//   severity: 'low' | 'moderate' | 'high';
//   description: string;
//   recommendation: string;
// }

// export interface AnalysisResponse {
//   results: AnalysisResult[];
//   summary: string;
//   analyzedAt: string;
// }

// /**
//  * Sends dental image to backend AI service and returns analysis result
//  */
// export async function analyzeImage(imageFile: File): Promise<AnalysisResponse> {
//   try {
//     const formData = new FormData();
//     formData.append("image", imageFile);

//     const res = await fetch(
//       "https://smart-teeth-care.runasp.net/api/AiService/analyze",
//       {
//         method: "POST",
//         body: formData,
//       }
//     );

//     if (!res.ok) {
//       throw new Error("Failed to analyze image");
//     }

//     const data = await res.json();

//     return {
//       results: data.results,
//       summary: data.summary,
//       analyzedAt: data.analyzedAt || new Date().toISOString(),
//     };
//   } catch (error) {
//     return {
//       results: [],
//       summary: "❌ Failed to analyze image. Please try again later.",
//       analyzedAt: new Date().toISOString(),
//     };
//   }
// }










export interface AnalysisResult {
  id: string;
  condition: string;
  confidence: number;
  severity: 'low' | 'moderate' | 'high';
  description: string;
  recommendation: string;
}

export interface AnalysisResponse {
  results: AnalysisResult[];
  summary: string;
  analyzedAt: string;
}

/**
 * Sends dental image to backend AI service and returns analysis result
 */
export async function analyzeImage(imageFile: File): Promise<AnalysisResponse> {
  try {
    const formData = new FormData();
    formData.append("image", imageFile);

    const res = await fetch(
      "https://smart-teeth-care.runasp.net/api/AiService/analyze",
      {
        method: "POST",
        body: formData,
      }
    );

    const text = await res.text(); // مهم عشان نعرف نقرأ كل الحالات

    // 🟡 لو backend رجع 404 برسالة
    if (!res.ok) {
      return {
        results: [],
        summary: text || "No result found",
        analyzedAt: new Date().toISOString(),
      };
    }

    const data = JSON.parse(text);

    console.log("API RESPONSE:", data);
    type Prediction = {
  disease: string;
  confidence: number;
};

type ApiResponse = {
  disease: string;
  predictions: Prediction[];
  speciality: string;
  disclaimer: string;
};
    const results = (data.predictions || []).map((item: Prediction, index: number) => ({
      id: `res-${index}`,
      condition: item.disease,
      confidence: Math.round(item.confidence * 100),
      severity:
        item.confidence > 0.85
          ? "high"
          : item.confidence > 0.6
          ? "moderate"
          : "low",
      description: `Detected possible ${item.disease}`,
      recommendation: `Consult a ${data.speciality || "dentist"} for proper diagnosis.`,
    }));

    return {
      results,
      summary: `${data.disease || "Analysis complete"}\n\n${data.disclaimer || ""}`,
      analyzedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error("Analysis error:", error);

    return {
      results: [],
      summary: "❌ Failed to analyze image. Please try again later.",
      analyzedAt: new Date().toISOString(),
    };
  }
}