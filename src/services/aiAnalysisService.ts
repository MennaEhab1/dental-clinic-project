

// export interface AnalysisResult {
//   id: string;
//   condition: string;
//   confidence: number;
//   severity: 'low' | 'moderate' | 'high';
//   description: string;
//   recommendation: string;
// }

// export interface AnalysisResponse {
//   disease: string;
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

//     const text = await res.text(); // مهم عشان نعرف نقرأ كل الحالات

//     // 🟡 لو backend رجع 404 برسالة
//     if (!res.ok) {
//      return {
//   disease: "",
//   results: [],
//   summary: text || "No result found",
//   analyzedAt: new Date().toISOString(),
// };
//     }

//     const data = JSON.parse(text);

//     console.log("API RESPONSE:", data);
//     type Prediction = {
//   disease: string;
//   confidence: number;
// };

// type ApiResponse = {
//   disease: string;
//   predictions: Prediction[];
//   speciality: string;
//   disclaimer: string;
// };
//     const results = (data.predictions || []).map((item: Prediction, index: number) => ({
//       id: `res-${index}`,
//       condition: item.disease,
//       confidence: Math.round(item.confidence * 100),
//       severity:
//         item.confidence > 0.85
//           ? "high"
//           : item.confidence > 0.6
//           ? "moderate"
//           : "low",
//       description: `Detected possible ${item.disease}`,
//       recommendation: `Consult a ${data.speciality || "dentist"} for proper diagnosis.`,
//     }));

//     return {
//   disease: data.disease || "",
//   results,
//   summary: `${data.disease || "Analysis complete"}\n\n${data.disclaimer || ""}`,
//   analyzedAt: new Date().toISOString(),
// };
//   } catch (error) {
//     console.error("Analysis error:", error);

//    return {
//   disease: "",
//   results: [],
//   summary: "❌ Failed to analyze image. Please try again later.",
//   analyzedAt: new Date().toISOString(),
// };
//   }
// }








// export interface AnalysisResult {
//   id: string;
//   condition: string;
//   confidence: number;
//   severity: 'low' | 'moderate' | 'high';
//   description: string;
//   recommendation: string;
// }

// export interface AnalysisResponse {
//   disease: string;
//   results: AnalysisResult[];
//   summary: string;
//   analyzedAt: string;
// }

// type Prediction = {
//   disease: string;
//   confidence: number;
//   speciality: string;
// };

// type ApiResponse = {
//   topDisease: {
//     disease: string;
//     confidence: number;
//     speciality: string;
//     doctorName: string;
//   };
//   otherPredictions: Prediction[];
// };

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

//     const text = await res.text();

//     if (!res.ok) {
//       return {
//         disease: "",
//         results: [],
//         summary: text || "No result found",
//         analyzedAt: new Date().toISOString(),
//       };
//     }

//     const data = JSON.parse(text);
//     console.log("API RESPONSE:", data);

//     const api = data as ApiResponse;

//     const topResult: AnalysisResult = {
//       id: 'res-0',
//       condition: api.topDisease.disease,
//       confidence: Math.round(api.topDisease.confidence),
//       severity: api.topDisease.confidence > 85 ? 'high' : api.topDisease.confidence > 60 ? 'moderate' : 'low',
//       description: `Detected: ${api.topDisease.disease}`,
//       recommendation: `Consult a ${api.topDisease.speciality} for proper diagnosis.`,
//     };

//     const otherResults: AnalysisResult[] = (api.otherPredictions || []).map((item, index) => ({
//       id: `res-${index + 1}`,
//       condition: item.disease,
//       confidence: Math.round(item.confidence),
//       severity: item.confidence > 85 ? 'high' : item.confidence > 60 ? 'moderate' : 'low',
//       description: `Detected possible ${item.disease}`,
//       recommendation: `Consult a ${item.speciality} for proper diagnosis.`,
//     }));

//     return {
//       disease: api.topDisease.disease,
//       results: [topResult, ...otherResults],
//       summary: `Top diagnosis: ${api.topDisease.disease} (${Math.round(api.topDisease.confidence)}% confidence)\nSpeciality: ${api.topDisease.speciality}`,
//       analyzedAt: new Date().toISOString(),
//     };

//   } catch (error) {
//     console.error("Analysis error:", error);

//     return {
//       disease: "",
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
  disease: string;
  results: AnalysisResult[];
  summary: string;
  analyzedAt: string;
}

type Prediction = {
  disease: string;
  confidence: number;
  speciality: string;
};

type ApiResponse = {
  topDisease: {
    disease: string;
    confidence: number;
    speciality: string;
    doctorName: string;
  };
  otherPredictions: Prediction[];
};

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

    const text = await res.text();

    if (!res.ok) {
      return {
        disease: "",
        results: [],
        summary: text || "No result found",
        analyzedAt: new Date().toISOString(),
      };
    }

    const data = JSON.parse(text);
    console.log("API RESPONSE:", data);

    const api = data as ApiResponse;

    const topResult: AnalysisResult = {
      id: 'res-0',
      condition: api.topDisease.disease,
      confidence: Math.round(api.topDisease.confidence),
      severity: api.topDisease.confidence > 85 ? 'high' : api.topDisease.confidence > 60 ? 'moderate' : 'low',
      description: `Detected: ${api.topDisease.disease}`,
      recommendation: `Consult a ${api.topDisease.speciality} for proper diagnosis.`,
    };

    const otherResults: AnalysisResult[] = (api.otherPredictions || []).map((item, index) => ({
      id: `res-${index + 1}`,
      condition: item.disease,
      confidence: Math.round(item.confidence),
      severity: item.confidence > 85 ? 'high' : item.confidence > 60 ? 'moderate' : 'low',
      description: `Detected possible ${item.disease}`,
      recommendation: `Consult a ${item.speciality} for proper diagnosis.`,
    }));

    return {
      disease: api.topDisease.disease,
      results: [topResult, ...otherResults],
      summary: `Top diagnosis: ${api.topDisease.disease} (${Math.round(api.topDisease.confidence)}% confidence)\nSpeciality: ${api.topDisease.speciality}`,
      analyzedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error("Analysis error:", error);

    return {
      disease: "",
      results: [],
      summary: "❌ Failed to analyze image. Please try again later.",
      analyzedAt: new Date().toISOString(),
    };
  }
}