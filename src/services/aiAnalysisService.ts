/**
 * AI Dental Image Analysis Service (Mock)
 * 
 * Simulates AI-powered dental image analysis.
 * 
 * TODO: Replace with real AI API integration:
 * 1. Update analyzeImage() to POST the image to your AI endpoint
 * 2. Parse the real API response into AnalysisResult format
 * 3. Remove the mock delay and random result selection
 */

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

const mockResults: AnalysisResult[][] = [
  [
    {
      id: 'res-1',
      condition: 'Possible Cavity Detected',
      confidence: 87,
      severity: 'moderate',
      description: 'A dark spot has been identified on the upper right molar, which may indicate early-stage tooth decay (dental caries).',
      recommendation: 'Schedule an appointment with your dentist for a clinical examination and possible X-ray to confirm the diagnosis.',
    },
    {
      id: 'res-2',
      condition: 'Minor Plaque Buildup',
      confidence: 72,
      severity: 'low',
      description: 'Slight plaque accumulation detected along the gum line in the lower front teeth area.',
      recommendation: 'Maintain regular brushing and flossing. Consider a professional cleaning appointment.',
    },
  ],
  [
    {
      id: 'res-3',
      condition: 'Signs of Gum Inflammation',
      confidence: 91,
      severity: 'high',
      description: 'Redness and swelling detected in the gum tissue, particularly around the lower molars. This may indicate early gingivitis.',
      recommendation: 'Please consult your dentist as soon as possible. Early treatment can prevent progression to periodontitis.',
    },
  ],
  [
    {
      id: 'res-4',
      condition: 'No Visible Issues Detected',
      confidence: 95,
      severity: 'low',
      description: 'The dental image appears normal with no visible signs of cavities, gum disease, or other dental conditions.',
      recommendation: 'Continue your regular dental hygiene routine and schedule your next routine check-up.',
    },
  ],
  [
    {
      id: 'res-5',
      condition: 'Tooth Discoloration',
      confidence: 78,
      severity: 'low',
      description: 'Surface staining detected on several teeth, likely caused by dietary habits (coffee, tea) or lifestyle factors.',
      recommendation: 'Consider a professional teeth whitening consultation or ask about cosmetic options at your next visit.',
    },
    {
      id: 'res-6',
      condition: 'Possible Enamel Erosion',
      confidence: 65,
      severity: 'moderate',
      description: 'Thinning enamel detected on the biting surfaces of the premolars. This could be due to acidic diet or grinding.',
      recommendation: 'Avoid acidic foods and drinks. A custom night guard may be recommended if bruxism is suspected.',
    },
  ],
];

const mockSummaries = [
  'Analysis complete. Moderate attention recommended — please review the findings with your dentist.',
  'Analysis complete. Immediate dental consultation recommended for the identified condition.',
  'Analysis complete. Your dental health looks good! Keep up the great work.',
  'Analysis complete. Minor cosmetic concerns identified. No urgent action needed.',
];

/**
 * Analyzes a dental image and returns mock AI results.
 * 
 * TODO: Replace with real API call:
 * const formData = new FormData();
 * formData.append('image', imageFile);
 * const response = await fetch(`${API_BASE_URL}/ai/analyze`, {
 *   method: 'POST',
 *   headers: { 'Authorization': `Bearer ${getAuthToken()}` },
 *   body: formData,
 * });
 * return response.json();
 */
export async function analyzeImage(_imageFile: File): Promise<AnalysisResponse> {
  // Simulate API processing delay (2-4 seconds)
  const processingTime = 2000 + Math.random() * 2000;
  await new Promise(resolve => setTimeout(resolve, processingTime));

  const index = Math.floor(Math.random() * mockResults.length);

  return {
    results: mockResults[index],
    summary: mockSummaries[index],
    analyzedAt: new Date().toISOString(),
  };
}
