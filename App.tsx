
import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  CheckCircle2, 
  Circle, 
  Loader2, 
  Copy, 
  Check, 
  Settings2, 
  FileText, 
  Mic, 
  Video, 
  Image as ImageIcon, 
  Search, 
  Anchor,
  Moon,
  Sun,
  Trash2,
  History,
  Download,
  X,
  FileDown,
  Clock,
  ChevronRight
} from 'lucide-react';
import { WorkflowStep, WorkflowOutput, HistoryItem } from './types';
import { generateStep } from './services/geminiService';

// Fix: Declaring Pink (alias for ImageIcon) before it's used in STEPS_CONFIG to avoid "used before its declaration" error.
const Pink = ImageIcon;

const STEPS_CONFIG = [
  { id: WorkflowStep.SCRIPT, label: 'Kịch bản', icon: FileText, color: 'text-blue-500 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-400/10', borderColor: 'border-blue-200 dark:border-blue-400/20' },
  { id: WorkflowStep.TTS, label: 'Voice AI', icon: Mic, color: 'text-purple-500 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-400/10', borderColor: 'border-purple-200 dark:border-purple-400/20' },
  { id: WorkflowStep.STORYBOARD, label: 'Storyboard', icon: Anchor, color: 'text-emerald-500 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-400/10', borderColor: 'border-emerald-200 dark:border-emerald-400/20' },
  { id: WorkflowStep.VIDEO_PROMPTS, label: 'Video Prompts', icon: Video, color: 'text-orange-500 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-400/10', borderColor: 'border-orange-200 dark:border-orange-400/20' },
  { id: WorkflowStep.THUMBNAILS, label: 'Thumbnails', icon: Pink, color: 'text-pink-500 dark:text-pink-400', bgColor: 'bg-pink-50 dark:bg-pink-400/10', borderColor: 'border-pink-200 dark:border-pink-400/20' },
  { id: WorkflowStep.HOOKS, label: 'Hook 5s', icon: Settings2, color: 'text-indigo-500 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-400/10', borderColor: 'border-indigo-200 dark:border-indigo-400/20' },
  { id: WorkflowStep.SEO, label: 'SEO Assets', icon: Search, color: 'text-cyan-500 dark:text-cyan-400', bgColor: 'bg-cyan-50 dark:bg-cyan-400/10', borderColor: 'border-cyan-200 dark:border-cyan-400/20' },
];

const LOCAL_STORAGE_KEY = 'faceless_ai_history';
const THEME_KEY = 'faceless_ai_theme';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return (saved as 'light' | 'dark') || 'dark';
  });
  const [scriptPrompt, setScriptPrompt] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [outputs, setOutputs] = useState<WorkflowOutput>({});
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const workflowRunningRef = useRef(false);

  // Theme Sync
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startWorkflow = async () => {
    if (!scriptPrompt || !videoTitle || isLoading) return;
    setIsLoading(true);
    setCurrentStepIndex(0);
    setActiveTab(0);
    setOutputs({});
    workflowRunningRef.current = true;
  };

  const resetWorkflow = () => {
    setScriptPrompt('');
    setVideoTitle('');
    setCurrentStepIndex(-1);
    setActiveTab(0);
    setOutputs({});
    setIsLoading(false);
    workflowRunningRef.current = false;
  };

  const saveToHistory = (finalOutputs: WorkflowOutput) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      title: videoTitle,
      date: new Date().toLocaleString('vi-VN'),
      inputs: { title: videoTitle, scriptPrompt },
      outputs: finalOutputs
    };
    setHistory(prev => [newItem, ...prev]);
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setVideoTitle(item.inputs.title);
    setScriptPrompt(item.inputs.scriptPrompt);
    setOutputs(item.outputs);
    setCurrentStepIndex(STEPS_CONFIG.length);
    setActiveTab(0);
    setIsHistoryOpen(false);
  };

  useEffect(() => {
    if (!workflowRunningRef.current || currentStepIndex < 0 || currentStepIndex >= STEPS_CONFIG.length) {
      if (currentStepIndex === STEPS_CONFIG.length && workflowRunningRef.current) {
        setIsLoading(false);
        workflowRunningRef.current = false;
        saveToHistory(outputs);
      }
      return;
    }

    const runStep = async () => {
      const stepConfig = STEPS_CONFIG[currentStepIndex];
      setActiveTab(currentStepIndex);
      try {
        const result = await generateStep(stepConfig.id, { scriptPrompt, title: videoTitle }, outputs);
        const newOutputs = { ...outputs, [getOutputKey(stepConfig.id)]: result };
        setOutputs(newOutputs);
        setCurrentStepIndex(prev => prev + 1);
      } catch (error: any) {
        console.error("Step failed:", error);
        setIsLoading(false);
        workflowRunningRef.current = false;
        let errorMessage = "Có lỗi xảy ra trong quá trình tạo nội dung. Vui lòng thử lại.";
        
        if (error instanceof Error) {
          if (error.message.includes("API Key (APP_GEMINI_API_KEY) is missing")) {
            errorMessage = "Lỗi: API Key (APP_GEMINI_API_KEY) chưa được cấu hình. Vui lòng thêm biến môi trường 'APP_GEMINI_API_KEY' vào cài đặt Vercel của bạn.";
          } else if (error.message.includes("API key") || error.message.includes("authentication")) {
            errorMessage = "Lỗi xác thực API. Vui lòng kiểm tra lại API Key trên Vercel hoặc môi trường triển khai của bạn.";
          } else if (error.message.includes("network") || error.message.includes("fetch")) {
            errorMessage = "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet hoặc thử lại sau.";
          }
        }
        alert(errorMessage);
      }
    };
    runStep();
  }, [currentStepIndex]);

  const getOutputKey = (stepId: WorkflowStep) => {
    switch (stepId) {
      case WorkflowStep.SCRIPT: return 'script';
      case WorkflowStep.TTS: return 'tts';
      case WorkflowStep.STORYBOARD: return 'storyboard';
      case WorkflowStep.VIDEO_PROMPTS: return 'videoPrompts';
      case WorkflowStep.THUMBNAILS: return 'thumbnails';
      case WorkflowStep.HOOKS: return 'hooks';
      case WorkflowStep.SEO: return 'seo';
      default: return '';
    }
  };

  const downloadFile = (format: 'txt' | 'md') => {
    let content = "";
    const separator = format === 'md' ? "\n\n---\n\n" : "\n\n" + "=".repeat(30) + "\n\n";
    if (format === 'md') content += `# ${videoTitle}\n\n`;
    else content += `TIÊU ĐỀ: ${videoTitle}\n\n`;

    STEPS_CONFIG.forEach(step => {
      const val = outputs[getOutputKey(step.id) as keyof WorkflowOutput];
      if (val) {
        content += (format === 'md' ? `## ${step.label}` : step.label.toUpperCase()) + "\n";
        content += val + separator;
      }
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${videoTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a] pb-20 overflow-x-hidden transition-colors duration-300">
      {/* Sidebar History */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-white dark:bg-[#111] border-l border-neutral-200 dark:border-white/5 z-[60] transform transition-transform duration-300 shadow-2xl ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-neutral-200 dark:border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white text-neutral-900">
              <History className="w-5 h-5 text-emerald-500" />
              Lịch sử dự án
            </h2>
            <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-20 dark:text-white text-neutral-900">
                <Clock className="w-12 h-12 mb-4" />
                <p className="text-sm">Chưa có dự án nào được lưu.</p>
              </div>
            ) : (
              history.map(item => (
                <div 
                  key={item.id}
                  onClick={() => loadHistoryItem(item)}
                  className="group p-4 bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-200 dark:border-white/5 rounded-xl cursor-pointer hover:border-emerald-500/50 hover:bg-white dark:hover:bg-[#222] transition-all relative"
                >
                  <p className="text-xs text-neutral-400 dark:text-white/30 mb-1">{item.date}</p>
                  <p className="text-sm font-medium text-neutral-800 dark:text-white/80 line-clamp-2 pr-6">{item.title}</p>
                  <button 
                    onClick={(e) => deleteHistoryItem(item.id, e)}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[55]" onClick={() => setIsHistoryOpen(false)}/>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-neutral-200 dark:border-white/5 py-4 px-6 mb-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Moon className={`w-6 h-6 text-emerald-500 ${theme === 'light' ? 'hidden' : 'block'}`} />
              <Sun className={`w-6 h-6 text-emerald-500 ${theme === 'dark' ? 'hidden' : 'block'}`} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight serif text-neutral-900 dark:text-white">Finance Faceless AI</h1>
              <p className="text-xs text-neutral-400 dark:text-white/40 uppercase tracking-widest font-medium">Production Workflow System</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-full text-neutral-500 dark:text-white/60 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
              title={theme === 'dark' ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-neutral-600 dark:text-white/60 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
            >
              <History className="w-4 h-4" />
              <span className="hidden md:inline">Lịch sử</span>
            </button>
            {currentStepIndex !== -1 && (
              <button 
                onClick={resetWorkflow}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-neutral-600 dark:text-white/60 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden md:inline">Làm mới</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white dark:bg-[#111] border border-neutral-200 dark:border-white/5 rounded-2xl p-6 shadow-xl dark:shadow-2xl transition-colors">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-neutral-900 dark:text-white">
              <Settings2 className="w-5 h-5 text-emerald-500" />
              Dự án mới
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-500 dark:text-white/50 mb-1.5 ml-1 font-medium">Tiêu đề video</label>
                <input 
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  disabled={isLoading}
                  placeholder="Ví dụ: Vì sao bạn luôn hết tiền..."
                  className="w-full bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-neutral-900 dark:text-white disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-500 dark:text-white/50 mb-1.5 ml-1 font-medium">Prompt kịch bản chuẩn</label>
                <textarea 
                  value={scriptPrompt}
                  onChange={(e) => setScriptPrompt(e.target.value)}
                  disabled={isLoading}
                  placeholder="Dán prompt kịch bản của bạn..."
                  rows={8}
                  className="w-full bg-neutral-50 dark:bg-[#1a1a1a] border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none text-neutral-900 dark:text-white disabled:opacity-50"
                />
              </div>
              <button
                onClick={startWorkflow}
                disabled={isLoading || !scriptPrompt || !videoTitle}
                className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg ${
                  isLoading 
                  ? 'bg-neutral-100 dark:bg-white/5 text-neutral-400 dark:text-white/20 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/10 dark:shadow-emerald-900/20 active:scale-[0.98]'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang xử lý bước {currentStepIndex + 1}/7
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Bắt đầu Workflow
                  </>
                )}
              </button>
            </div>
          </section>

          <div className="bg-white dark:bg-[#111] border border-neutral-200 dark:border-white/5 rounded-2xl p-6 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 dark:text-white/30">Trạng thái Workflow</span>
              {currentStepIndex >= 0 && (
                <span className="text-xs font-bold text-emerald-500">
                  {Math.min(Math.round((currentStepIndex / 7) * 100), 100)}%
                </span>
              )}
            </div>
            <div className="w-full bg-neutral-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden mb-6">
              <div 
                className="bg-emerald-500 h-full transition-all duration-1000"
                style={{ width: `${(Math.max(0, currentStepIndex) / 7) * 100}%` }}
              />
            </div>
            <div className="space-y-2">
              {STEPS_CONFIG.map((step, idx) => {
                const isCurrent = currentStepIndex === idx;
                const isDone = currentStepIndex > idx;
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-neutral-200 dark:text-white/10" />}
                    <span className={`text-xs font-medium ${isCurrent ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-white/30'}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-8 space-y-6">
          {currentStepIndex === -1 ? (
            <div className="h-full min-h-[500px] border-2 border-dashed border-neutral-200 dark:border-white/5 rounded-3xl flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-white/[0.02]">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-neutral-300 dark:text-white/20" />
              </div>
              <h3 className="text-2xl font-light serif mb-2 text-neutral-700 dark:text-white/80">Chưa có nội dung sản xuất</h3>
              <p className="text-neutral-400 dark:text-white/40 max-w-sm">
                Sử dụng form bên trái để bắt đầu quy trình tạo nội dung tự động 7 bước.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full space-y-4">
              <div className="bg-white dark:bg-[#111] border border-neutral-200 dark:border-white/5 p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth transition-colors">
                {STEPS_CONFIG.map((step, idx) => {
                  const isAccessible = currentStepIndex >= idx;
                  const isActive = activeTab === idx;
                  const isDone = currentStepIndex > idx;
                  return (
                    <button
                      key={step.id}
                      disabled={!isAccessible}
                      onClick={() => setActiveTab(idx)}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 text-xs font-bold uppercase tracking-wider relative ${
                        isActive 
                        ? `${step.bgColor} ${step.color} shadow-md ring-1 ${step.borderColor}` 
                        : isAccessible 
                          ? 'text-neutral-500 dark:text-white/60 hover:bg-neutral-50 dark:hover:bg-white/5' 
                          : 'text-neutral-200 dark:text-white/10 cursor-not-allowed'
                      }`}
                    >
                      <step.icon className={`w-4 h-4 ${isActive ? step.color : ''}`} />
                      <span className="whitespace-nowrap">{step.label}</span>
                      {isDone && !isActive && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 bg-white dark:bg-[#111] border border-neutral-200 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-xl dark:shadow-2xl min-h-[600px] transition-colors">
                <div className="px-8 py-5 border-b border-neutral-100 dark:border-white/5 bg-neutral-50 dark:bg-[#161616] flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${STEPS_CONFIG[activeTab].bgColor}`}>
                      {React.createElement(STEPS_CONFIG[activeTab].icon, { className: `w-5 h-5 ${STEPS_CONFIG[activeTab].color}` })}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-800 dark:text-white/90">{STEPS_CONFIG[activeTab].label}</h3>
                      <p className="text-[10px] text-neutral-400 dark:text-white/30 uppercase tracking-tighter">PHẦN {activeTab + 1} / 7</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {activeTab === currentStepIndex && isLoading ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-500 font-bold italic animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Đang tạo dữ liệu...
                      </div>
                    ) : outputs[getOutputKey(STEPS_CONFIG[activeTab].id) as keyof WorkflowOutput] ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleCopy(outputs[getOutputKey(STEPS_CONFIG[activeTab].id) as keyof WorkflowOutput]!, STEPS_CONFIG[activeTab].id)}
                          className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 border border-neutral-200 dark:border-white/10 rounded-lg text-xs font-bold text-neutral-700 dark:text-white transition-all active:scale-95 shadow-sm"
                        >
                          {copiedId === STEPS_CONFIG[activeTab].id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-500">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 opacity-50" />
                              Sao chép nội dung
                            </>
                          )}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.02),transparent)] transition-colors">
                  {outputs[getOutputKey(STEPS_CONFIG[activeTab].id) as keyof WorkflowOutput] ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-white/80 font-normal selection:bg-emerald-500/30 animate-in fade-in duration-500">
                      {outputs[getOutputKey(STEPS_CONFIG[activeTab].id) as keyof WorkflowOutput]}
                    </div>
                  ) : activeTab === currentStepIndex && isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                      <div className="relative">
                        <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-6" />
                        <div className="absolute inset-0 blur-xl bg-emerald-500/20 rounded-full animate-pulse" />
                      </div>
                      <p className="text-lg serif italic text-neutral-800 dark:text-white">Hệ thống đang suy nghĩ...</p>
                      <p className="text-xs uppercase tracking-widest mt-2 text-neutral-500 dark:text-white/50">Dữ liệu tài chính faceless đang được phân tích</p>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20 dark:text-white text-neutral-900">
                      <Clock className="w-12 h-12 mb-4" />
                      <p className="text-sm font-medium">Chưa có dữ liệu cho bước này.</p>
                    </div>
                  )}
                </div>

                {currentStepIndex === STEPS_CONFIG.length && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 border-t border-emerald-100 dark:border-emerald-500/10 flex items-center justify-between animate-in slide-in-from-bottom-2 transition-colors">
                    <div className="flex items-center gap-2 ml-4">
                      <FileDown className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-200 uppercase tracking-wider">XUẤT DỮ LIỆU</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => downloadFile('txt')}
                        className="px-5 py-2.5 bg-emerald-100 dark:bg-emerald-600/20 hover:bg-emerald-200 dark:hover:bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-xl transition-all border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-2"
                      >
                        DOWNLOAD .TXT
                      </button>
                      <button 
                        onClick={() => downloadFile('md')}
                        className="px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-black hover:opacity-90 text-[10px] font-black rounded-xl transition-all flex items-center gap-2 shadow-xl shadow-black/10 dark:shadow-black/20"
                      >
                        DOWNLOAD .MD
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {currentStepIndex > 0 && (
                <div className="flex justify-between items-center px-2">
                  <button 
                    disabled={activeTab === 0}
                    onClick={() => setActiveTab(prev => prev - 1)}
                    className="p-2 text-neutral-300 dark:text-white/20 hover:text-neutral-600 dark:hover:text-white disabled:opacity-0 transition-all"
                  >
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                  <div className="flex gap-1.5">
                    {STEPS_CONFIG.map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-1 rounded-full transition-all duration-500 ${
                          activeTab === i ? 'w-8 bg-emerald-500' : 'w-2 bg-neutral-200 dark:bg-white/10'
                        } ${currentStepIndex < i ? 'opacity-0' : 'opacity-100'}`}
                      />
                    ))}
                  </div>
                  <button 
                    disabled={activeTab >= currentStepIndex || activeTab === STEPS_CONFIG.length - 1}
                    onClick={() => setActiveTab(prev => prev + 1)}
                    className="p-2 text-neutral-300 dark:text-white/20 hover:text-neutral-600 dark:hover:text-white disabled:opacity-0 transition-all"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      <footer className="mt-20 border-t border-neutral-200 dark:border-white/5 py-12 px-6 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 opacity-30">
          <p className="text-xs uppercase tracking-widest font-black text-neutral-900 dark:text-white">© 2024 Faceless Content Engine</p>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-900 dark:text-white">
            <span>Powered by Gemini 3 Pro</span>
            <span className="text-emerald-500">Production Ready</span>
            <span>Local History Saved</span>
          </div>
        </div>
      </footer>
    </div>
  );
}