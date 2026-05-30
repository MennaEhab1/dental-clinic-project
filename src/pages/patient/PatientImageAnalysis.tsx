// import { useState, useCallback } from 'react';
// import { motion } from 'framer-motion';
// import { DashboardLayout } from '@/components/layout/DashboardLayout';
// import { ImageUpload } from '@/components/ai/ImageUpload';
// import { CameraCapture } from '@/components/ai/CameraCapture';
// import { AnalysisResultBox } from '@/components/ai/AnalysisResultBox';
// import { AIChatWidget } from '@/components/ai/AIChatWidget';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// import {
//   Upload,
//   Camera,
//   Sparkles,
//   RotateCcw,
//   ShieldCheck,
// } from 'lucide-react';

// import {
//   analyzeImage,
//   type AnalysisResponse,
// } from '@/services/aiAnalysisService';

// export default function PatientImageAnalysis() {
//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [imagePreview, setImagePreview] = useState<string | null>(null);

//   const [isAnalyzing, setIsAnalyzing] = useState(false);
//   const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);

//   const [activeTab, setActiveTab] = useState('upload');

//   const [showChat, setShowChat] = useState(false);

//   const handleImageSelect = useCallback((file: File, preview: string) => {
//     setImageFile(file);
//     setImagePreview(preview);

//     setAnalysis(null);
//     setShowChat(false);
//   }, []);

//   const handleClear = useCallback(() => {
//     setImageFile(null);
//     setImagePreview(null);

//     setAnalysis(null);
//     setShowChat(false);
//   }, []);

//   const handleAnalyze = useCallback(async () => {
//     if (!imageFile) return;

//     setIsAnalyzing(true);

//     try {
//       const result = await analyzeImage(imageFile);

//       setAnalysis(result);

//       // ✅ افتح الشات لو فيه نتيجة
//       if (result.results.length > 0) {
//         setShowChat(true);
//       } else {
//         setShowChat(false);
//       }

//     } catch (error) {
//       console.error('Analysis failed:', error);

//       const fallbackAnalysis: AnalysisResponse = {
//         results: [],
//         summary: '❌ Failed to analyze image.',
//         analyzedAt: new Date().toISOString(),
//       };

//       setAnalysis(fallbackAnalysis);
//       setShowChat(false);
//     } finally {
//       setIsAnalyzing(false);
//     }
//   }, [imageFile]);

//   const handleReset = useCallback(() => {
//     setImageFile(null);
//     setImagePreview(null);
//     setAnalysis(null);
//     setShowChat(false);
//   }, []);

//   return (
//     <DashboardLayout role="patient">
//       <div className="max-w-3xl mx-auto space-y-6">

//         {/* HERO */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="gradient-hero-bg rounded-2xl p-6 md:p-8"
//         >
//           <div className="flex items-start gap-4">
//             <div className="p-3 rounded-xl gradient-bg shrink-0">
//               <Sparkles className="w-6 h-6 text-primary-foreground" />
//             </div>

//             <div>
//               <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
//                 AI Dental Image Analysis
//               </h1>

//               <p className="text-muted-foreground text-sm md:text-base">
//                 Upload or capture a dental image and let our AI analyze it.
//               </p>
//             </div>
//           </div>
//         </motion.div>

//         {/* UPLOAD */}
//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center gap-2">
//               <Camera className="w-5 h-5 text-primary" />
//               Capture or Upload Image
//             </CardTitle>
//           </CardHeader>

//           <CardContent className="space-y-4">

//             <Tabs value={activeTab} onValueChange={setActiveTab}>
//               <TabsList className="grid grid-cols-2 w-full">
//                 <TabsTrigger value="upload">
//                   <Upload className="w-4 h-4 mr-2" />
//                   Upload
//                 </TabsTrigger>

//                 <TabsTrigger value="camera">
//                   <Camera className="w-4 h-4 mr-2" />
//                   Camera
//                 </TabsTrigger>
//               </TabsList>

//               <TabsContent value="upload">
//                 <ImageUpload
//                   onImageSelect={handleImageSelect}
//                   currentPreview={imagePreview}
//                   onClear={handleClear}
//                 />
//               </TabsContent>

//               <TabsContent value="camera">
//                 <CameraCapture
//                   onCapture={handleImageSelect}
//                   onClose={() => setActiveTab('upload')}
//                 />
//               </TabsContent>
//             </Tabs>

//             {/* BUTTONS */}
//             <div className="flex flex-col sm:flex-row gap-3 pt-2">

//               <Button
//                 className="flex-1 gradient-bg border-0 h-11"
//                 disabled={!imageFile || isAnalyzing}
//                 onClick={handleAnalyze}
//               >
//                 {isAnalyzing ? (
//                   <>
//                     <Sparkles className="w-4 h-4 mr-2 animate-spin" />
//                     Analyzing...
//                   </>
//                 ) : (
//                   <>
//                     <Sparkles className="w-4 h-4 mr-2" />
//                     Analyze Image
//                   </>
//                 )}
//               </Button>

//               <Button
//                 variant="secondary"
//                 className="flex-1 h-11"
//                 disabled={!analysis || analysis.results.length === 0}
//                 onClick={() => setShowChat(true)}
//               >
//                 💬 Start Chat
//               </Button>

//               {(imageFile || analysis) && (
//                 <Button variant="outline" onClick={handleReset}>
//                   <RotateCcw className="w-4 h-4 mr-2" />
//                   Reset
//                 </Button>
//               )}
//             </div>

//           </CardContent>
//         </Card>

//         {/* RESULTS */}
//         {analysis && !isAnalyzing && (
//           <AnalysisResultBox analysis={analysis} />
//         )}

//         {/* DISCLAIMER */}
//         <Card className="bg-muted/50">
//           <CardContent className="p-4 flex gap-3">
//             <ShieldCheck className="w-5 h-5" />
//             <p className="text-xs text-muted-foreground">
//               This AI analysis is for informational purposes only.
//             </p>
//           </CardContent>
//         </Card>

//       </div>

//       {/* CHAT (FIXED) */}
//       {showChat && analysis?.results?.length > 0 && (
//         <AIChatWidget
//           context={analysis.summary}
//         />
//       )}
//     </DashboardLayout>
//   );
// }










// import { useState, useCallback } from 'react';
// import { motion } from 'framer-motion';
// import { DashboardLayout } from '@/components/layout/DashboardLayout';
// import { ImageUpload } from '@/components/ai/ImageUpload';
// import { CameraCapture } from '@/components/ai/CameraCapture';
// import { AnalysisResultBox } from '@/components/ai/AnalysisResultBox';
// import { AIChatWidget } from '@/components/ai/AIChatWidget';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Upload, Camera, Sparkles, RotateCcw, ShieldCheck } from 'lucide-react';
// import { analyzeImage, type AnalysisResponse } from '@/services/aiAnalysisService';

// export default function PatientImageAnalysis() {
//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [imagePreview, setImagePreview] = useState<string | null>(null);
//   const [isAnalyzing, setIsAnalyzing] = useState(false);
//   const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
//   const [activeTab, setActiveTab] = useState('upload');
//   const [showChat, setShowChat] = useState(false);

//   const handleImageSelect = useCallback((file: File, preview: string) => {
//     setImageFile(file);
//     setImagePreview(preview);
//     setAnalysis(null);
//     setShowChat(false);
//   }, []);

//   const handleClear = useCallback(() => {
//     setImageFile(null);
//     setImagePreview(null);
//     setAnalysis(null);
//     setShowChat(false);
//   }, []);

//   const handleAnalyze = useCallback(async () => {
//     if (!imageFile) return;

//     setIsAnalyzing(true);

//     try {
//       const result = await analyzeImage(imageFile);
//       setAnalysis(result);
//       setShowChat((result.results?.length ?? 0) > 0);
//     } catch (error) {
//       console.error('Analysis failed:', error);
//       setAnalysis({
//   disease: '',        // ← أضف السطر ده
//   results: [],
//   summary: '❌ Failed to analyze image.',
//   analyzedAt: new Date().toISOString(),
// });
//       setShowChat(false);
//     } finally {
//       setIsAnalyzing(false);
//     }
//   }, [imageFile]);

//   const handleReset = useCallback(() => {
//     setImageFile(null);
//     setImagePreview(null);
//     setAnalysis(null);
//     setShowChat(false);
//   }, []);

//   const hasResults = (analysis?.results?.length ?? 0) > 0;

//   return (
//     <DashboardLayout role="patient">
//       <div className="max-w-3xl mx-auto space-y-6">

//         {/* HERO */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="gradient-hero-bg rounded-2xl p-6 md:p-8"
//         >
//           <div className="flex items-start gap-4">
//             <div className="p-3 rounded-xl gradient-bg shrink-0">
//               <Sparkles className="w-6 h-6 text-primary-foreground" />
//             </div>
//             <div>
//               <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
//                 AI Dental Image Analysis
//               </h1>
//               <p className="text-muted-foreground text-sm md:text-base">
//                 Upload or capture a dental image and let our AI analyze it.
//               </p>
//             </div>
//           </div>
//         </motion.div>

//         {/* UPLOAD */}
//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center gap-2">
//               <Camera className="w-5 h-5 text-primary" />
//               Capture or Upload Image
//             </CardTitle>
//           </CardHeader>

//           <CardContent className="space-y-4">
//             <Tabs value={activeTab} onValueChange={setActiveTab}>
//               <TabsList className="grid grid-cols-2 w-full">
//                 <TabsTrigger value="upload">
//                   <Upload className="w-4 h-4 mr-2" />
//                   Upload
//                 </TabsTrigger>
//                 <TabsTrigger value="camera">
//                   <Camera className="w-4 h-4 mr-2" />
//                   Camera
//                 </TabsTrigger>
//               </TabsList>

//               <TabsContent value="upload">
//                 <ImageUpload
//                   onImageSelect={handleImageSelect}
//                   currentPreview={imagePreview}
//                   onClear={handleClear}
//                 />
//               </TabsContent>

//               <TabsContent value="camera">
//                 <CameraCapture
//                   onCapture={handleImageSelect}
//                   onClose={() => setActiveTab('upload')}
//                 />
//               </TabsContent>
//             </Tabs>

//             {/* BUTTONS */}
//             <div className="flex flex-col sm:flex-row gap-3 pt-2">
//               <Button
//                 className="flex-1 gradient-bg border-0 h-11"
//                 disabled={!imageFile || isAnalyzing}
//                 onClick={handleAnalyze}
//               >
//                 {isAnalyzing ? (
//                   <>
//                     <Sparkles className="w-4 h-4 mr-2 animate-spin" />
//                     Analyzing...
//                   </>
//                 ) : (
//                   <>
//                     <Sparkles className="w-4 h-4 mr-2" />
//                     Analyze Image
//                   </>
//                 )}
//               </Button>

//               <Button
//                 variant="secondary"
//                 className="flex-1 h-11"
//                 disabled={!hasResults}
//                 onClick={() => setShowChat(true)}
//               >
//                 💬 Start Chat
//               </Button>

//               {(imageFile !== null || analysis !== null) && (
//                 <Button variant="outline" onClick={handleReset}>
//                   <RotateCcw className="w-4 h-4 mr-2" />
//                   Reset
//                 </Button>
//               )}
//             </div>
//           </CardContent>
//         </Card>

//         {/* RESULTS */}
//         {analysis !== null && !isAnalyzing && (
//           <AnalysisResultBox analysis={analysis} />
//         )}

//         {/* DISCLAIMER */}
//         <Card className="bg-muted/50">
//           <CardContent className="p-4 flex gap-3">
//             <ShieldCheck className="w-5 h-5" />
//             <p className="text-xs text-muted-foreground">
//               This AI analysis is for informational purposes only.
//             </p>
//           </CardContent>
//         </Card>
//       </div>

//       {/* CHAT (FIXED) */}
//       {showChat && hasResults && (
//          <AIChatWidget disease={analysis!.disease} />
//       )}
//     </DashboardLayout>
//   );
// }








import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ImageUpload } from '@/components/ai/ImageUpload';
import { CameraCapture } from '@/components/ai/CameraCapture';
import { AnalysisResultBox } from '@/components/ai/AnalysisResultBox';
import { AIChatWidget } from '@/components/ai/AIChatWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Camera, Sparkles, RotateCcw, ShieldCheck } from 'lucide-react';
import { analyzeImage, type AnalysisResponse } from '@/services/aiAnalysisService';

export default function PatientImageAnalysis() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [showChat, setShowChat] = useState(false);

  const hasResults = (analysis?.results?.length ?? 0) > 0;
  const hasDisease = !!analysis?.disease && analysis.disease !== "";
  const canChat = hasDisease || hasResults;

  const handleImageSelect = useCallback((file: File, preview: string) => {
    setImageFile(file);
    setImagePreview(preview);
    setAnalysis(null);
    setShowChat(false);
  }, []);

  const handleClear = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setAnalysis(null);
    setShowChat(false);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!imageFile) return;

    setIsAnalyzing(true);

    try {
      const result = await analyzeImage(imageFile);
      setAnalysis(result);
      const disease = !!result.disease && result.disease !== "";
      const results = (result.results?.length ?? 0) > 0;
      setShowChat(disease || results);
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysis({
        disease: '',
        results: [],
        summary: '❌ Failed to analyze image.',
        analyzedAt: new Date().toISOString(),
      });
      setShowChat(false);
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageFile]);

  const handleReset = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setAnalysis(null);
    setShowChat(false);
  }, []);

  return (
    <DashboardLayout role="patient">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-hero-bg rounded-2xl p-6 md:p-8"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl gradient-bg shrink-0">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                AI Dental Image Analysis
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Upload or capture a dental image and let our AI analyze it.
              </p>
            </div>
          </div>
        </motion.div>

        {/* UPLOAD */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Capture or Upload Image
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="camera">
                  <Camera className="w-4 h-4 mr-2" />
                  Camera
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload">
                <ImageUpload
                  onImageSelect={handleImageSelect}
                  currentPreview={imagePreview}
                  onClear={handleClear}
                />
              </TabsContent>

              <TabsContent value="camera">
                <CameraCapture
                  onCapture={handleImageSelect}
                  onClose={() => setActiveTab('upload')}
                />
              </TabsContent>
            </Tabs>

            {/* BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                className="flex-1 gradient-bg border-0 h-11"
                disabled={!imageFile || isAnalyzing}
                onClick={handleAnalyze}
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze Image
                  </>
                )}
              </Button>

              <Button
                variant="secondary"
                className="flex-1 h-11"
                disabled={!canChat}
                onClick={() => setShowChat(true)}
              >
                💬 Start Chat
              </Button>

              {(imageFile !== null || analysis !== null) && (
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* RESULTS */}
        {analysis !== null && !isAnalyzing && (
          <AnalysisResultBox analysis={analysis} />
        )}

        {/* DISCLAIMER */}
        <Card className="bg-muted/50">
          <CardContent className="p-4 flex gap-3">
            <ShieldCheck className="w-5 h-5" />
            <p className="text-xs text-muted-foreground">
              This AI analysis is for informational purposes only.
            </p>
          </CardContent>
        </Card>

      </div>

      {/* CHAT */}
      {showChat && canChat && (
  <AIChatWidget
    disease={analysis!.disease}
    isOpen={showChat}
    onClose={() => setShowChat(false)}
  />
)}
    </DashboardLayout>
  );
}