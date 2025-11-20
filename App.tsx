import React, { useState, useRef } from 'react';
import { Upload, BrainCircuit, Eye, Code2, Calculator, RefreshCw, ArrowRight, AlertTriangle } from 'lucide-react';
import { analyzeBeamImage, generateStructuralReport } from './services/geminiService';
import { AnalysisResult, BeamStructure, BeamLoad } from './types';
import { BeamVisualizer } from './components/BeamVisualizer';
import { CodeBlock } from './components/CodeBlock';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check for API Key availability
  const hasApiKey = !!process.env.API_KEY;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
      setReport(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const base64Content = base64Data.split(',')[1];
        try {
          const analysis = await analyzeBeamImage(base64Content, file.type);
          setResult(analysis);
        } catch (err: any) {
            console.error(err);
            setError("Analysis failed. Please check your API key or try a clearer image.");
        } finally {
          setIsAnalyzing(false);
        }
      };
    } catch (e) {
      setError("Error reading file.");
      setIsAnalyzing(false);
    }
  };

  const handleSolve = async () => {
    if (!result) return;
    setIsSolving(true);
    try {
      const markdown = await generateStructuralReport(result.structure);
      setReport(markdown);
    } catch (e) {
      setError("Failed to generate report.");
    } finally {
      setIsSolving(false);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  // --- Update Logic ---
  
  const updateDimension = (dimId: string, newValue: number) => {
    if (!result) return;
    
    const dimIndex = result.structure.dimensions.findIndex(d => d.id === dimId);
    if (dimIndex === -1) return;

    const oldDim = result.structure.dimensions[dimIndex];
    const diff = newValue - oldDim.value;

    const newStructure = { ...result.structure };
    
    // 1. Update the specific dimension
    newStructure.dimensions[dimIndex] = { ...oldDim, value: newValue, end: oldDim.start + newValue };

    // 2. Shift all subsequent nodes and dimensions
    // We define "subsequent" as anything starting at or after the OLD end of this dimension
    const pivotX = oldDim.end;

    // Update other dimensions starting after this one
    newStructure.dimensions.forEach((d, i) => {
        if (i !== dimIndex && d.start >= pivotX - 0.001) {
            d.start += diff;
            d.end += diff;
        }
    });

    // Update nodes
    newStructure.nodes.forEach(n => {
        if (n.position >= pivotX - 0.001) {
            n.position += diff;
        }
    });

    // Update Loads
    newStructure.loads.forEach(l => {
        if (l.start >= pivotX - 0.001) {
            l.start += diff;
            l.end += diff; // Assuming point loads move entirely
        } else if (l.end >= pivotX - 0.001 && l.start < pivotX) {
            // Load straddles the change point (e.g. distributed load). 
            // Stretch it if it covers the dimension, or move end if strictly after.
            // Simplify: If start is before, we just extend end.
            l.end += diff;
        }
    });
    
    // Recalculate total length
    newStructure.totalLength = Math.max(...newStructure.nodes.map(n => n.position));

    setResult({ ...result, structure: newStructure });
  };

  const updateLoad = (loadId: string, field: keyof BeamLoad, value: any) => {
      if (!result) return;
      const newStructure = { ...result.structure };
      const idx = newStructure.loads.findIndex(l => l.id === loadId);
      if (idx !== -1) {
          newStructure.loads[idx] = { ...newStructure.loads[idx], [field]: value };
          setResult({ ...result, structure: newStructure });
      }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
              <BrainCircuit size={20} />
            </div>
            <span className="font-bold text-slate-800 text-xl tracking-tight">StructuraLens</span>
          </div>
          <div className="flex gap-4 items-center">
            {result && (
                <button 
                    onClick={() => { setResult(null); setFile(null); setPreviewUrl(null); setReport(null); }}
                    className="text-sm font-medium text-slate-500 hover:text-slate-800"
                >
                    New Analysis
                </button>
            )}
            <div className="text-xs font-medium px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                Gemini 2.5 Vision
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* API Key Warning Banner */}
        {!hasApiKey && (
            <div className="mb-6 max-w-2xl mx-auto bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4 shadow-sm animate-in slide-in-from-top-2">
                <div className="bg-amber-100 p-2 rounded-lg text-amber-600 shrink-0">
                    <AlertTriangle size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-amber-900 text-sm">API Key Required</h3>
                    <p className="text-amber-800 text-sm mt-1 leading-relaxed">
                        To use this application locally, you must provide a Google GenAI API Key.
                        <br/>
                        Please ensure <code>process.env.API_KEY</code> is configured (e.g., create a <code>.env</code> file in the current folder containing <code>API_KEY=your_key_here</code>).
                    </p>
                </div>
            </div>
        )}

        {!result ? (
           /* Upload View */
            <div className="max-w-2xl mx-auto mt-8 space-y-8">
                <div className="text-center space-y-4">
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight lg:text-5xl">
                    Structural Analysis <br/> <span className="text-indigo-600">Reimagined</span>
                </h1>
                <p className="text-lg text-slate-600">
                    Upload a beam diagram. We'll parameterize it, visualize it, and solve it.
                </p>
                </div>

                <div 
                    onClick={triggerFileInput}
                    className={`
                    relative group cursor-pointer border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ease-out
                    ${previewUrl ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-300 hover:border-indigo-400 hover:bg-white bg-slate-100/50'}
                    `}
                >
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                    {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="max-h-64 object-contain rounded-lg shadow-md" />
                    ) : (
                        <>
                        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Upload size={32} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-lg font-semibold text-slate-900">Drop diagram here</p>
                            <p className="text-sm text-slate-500">Supports hand-sketches & screenshots</p>
                        </div>
                        </>
                    )}
                    </div>
                </div>

                {file && (
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !hasApiKey}
                        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-xl transition-all
                        ${(isAnalyzing || !hasApiKey) ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-1'}
                        flex justify-center items-center gap-2`}
                        title={!hasApiKey ? "API Key missing in .env file" : ""}
                    >
                        {isAnalyzing ? <RefreshCw className="animate-spin" /> : <BrainCircuit />}
                        {isAnalyzing ? 'Analyzing Geometry...' : 'Parameterize & Analyze'}
                    </button>
                )}
                 {error && <div className="text-red-500 text-center bg-red-50 p-3 rounded-lg">{error}</div>}
            </div>
        ) : (
            /* Main Interface Grid */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT COLUMN: Visualizer & Report (Span 8) */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Visualization Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <Eye size={18} className="text-indigo-600"/> Interactive Diagram
                            </h2>
                            <span className="text-xs text-slate-400 font-mono">SVG / Interactive</span>
                        </div>
                        <div className="p-6 bg-slate-50/50 flex justify-center">
                            <BeamVisualizer data={result.structure} />
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex gap-4">
                         <button 
                            onClick={handleSolve}
                            disabled={isSolving || !hasApiKey}
                            className={`flex-1 px-6 py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95
                             ${(isSolving || !hasApiKey) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'}`}
                        >
                            {isSolving ? <RefreshCw className="animate-spin"/> : <Calculator />}
                            Generate Mathematical Solution
                         </button>
                    </div>

                    {/* Solution Report */}
                    {report && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                            <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                                <h2 className="font-bold text-emerald-900 flex items-center gap-2">
                                    <Calculator size={18} /> Structural Analysis Report
                                </h2>
                            </div>
                            <div className="p-8 prose prose-slate max-w-none">
                                {/* Simple markdown rendering since we can't use heavy libs */}
                                <div className="whitespace-pre-wrap font-serif leading-relaxed text-slate-800">
                                    {report.replace(/```markdown/g, '').replace(/```/g, '')}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LaTeX Code */}
                    <div className="bg-slate-900 rounded-2xl shadow-lg overflow-hidden">
                        <div className="p-4 border-b border-slate-800 flex items-center gap-2 text-slate-100">
                            <Code2 size={18} /> <span>TikZ Code</span>
                        </div>
                        <CodeBlock code={result.latexCode} language="latex" />
                    </div>
                </div>

                {/* RIGHT COLUMN: Parameter Editor (Span 4) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <RefreshCw size={16} className="text-slate-400" />
                            Parameters
                        </h3>
                        
                        <div className="space-y-6">
                            {/* Dimensions Section */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Geometry (Spans)</h4>
                                <div className="space-y-3">
                                    {result.structure.dimensions.map((dim) => (
                                        <div key={dim.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <div className="w-8 h-8 rounded flex items-center justify-center bg-white border border-slate-200 font-mono text-xs font-bold text-indigo-600">
                                                {dim.symbol}
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs text-slate-500 block">Length ({dim.unit})</label>
                                                <input 
                                                    type="number" 
                                                    value={dim.value}
                                                    onChange={(e) => updateDimension(dim.id, parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-transparent font-semibold text-slate-900 outline-none border-b border-transparent focus:border-indigo-500 transition-colors"
                                                />
                                            </div>
                                            <ArrowRight size={14} className="text-slate-300" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Loads Section */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Loads</h4>
                                <div className="space-y-3">
                                    {result.structure.loads.map((load) => (
                                        <div key={load.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                             <div className="w-8 h-8 rounded flex items-center justify-center bg-white border border-slate-200 font-mono text-xs font-bold text-rose-600">
                                                {load.symbol}
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs text-slate-500 block">Magnitude ({load.unit})</label>
                                                <input 
                                                    type="number" 
                                                    value={load.magnitude}
                                                    onChange={(e) => updateLoad(load.id, 'magnitude', parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-transparent font-semibold text-slate-900 outline-none border-b border-transparent focus:border-rose-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="p-3 bg-indigo-50 rounded-lg text-xs text-indigo-800 leading-relaxed">
                                <strong>Tip:</strong> Updating geometry automatically shifts connected nodes. Click "Generate Solution" to solve the updated system.
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        )}
      </main>
    </div>
  );
};

export default App;