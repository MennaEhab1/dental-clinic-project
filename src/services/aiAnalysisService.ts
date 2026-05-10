








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