import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Calendar, 
  Heart, 
  BookOpen, 
  Volume2, 
  Home, 
  X, 
  Loader, 
  ChevronLeft, 
  Share2 
} from 'lucide-react';
import { Question, DiaryEntry, IWindow } from './types';

// --- 题库 ---
const FULL_QUESTION_BANK: Question[] = [
  { text: "奶奶，今天中午吃了什么菜？合不合胃口？", type: "short_term" },
  { text: "今天有没有喝水？记得喝了几杯吗？", type: "health" },
  { text: "今天天气怎么样？看见太阳了吗？", type: "orientation" },
  { text: "奶奶，你年轻的时候最拿手的菜是什么？", type: "nostalgia" },
  { text: "以前过年的时候，家里都会包什么样的饺子？", type: "nostalgia" },
  { text: "还记得爷爷/老伴年轻时候长什么样吗？", type: "nostalgia" },
  { text: "奶奶，你觉得两个人过日子，最重要的是什么？", type: "legacy" },
  { text: "你最喜欢什么花？牡丹、月季还是菊花？", type: "preference" }
];

type Step = 'welcome' | 'asking' | 'saving' | 'finished' | 'history';

export default function GrandmaVoiceDiary() {
  const [currentStep, setCurrentStep] = useState<Step>('welcome'); 
  const [question, setQuestion] = useState<Question>(FULL_QUESTION_BANK[0]);
  const [transcript, setTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [history, setHistory] = useState<DiaryEntry[]>([]);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false); // Used for saving state logic
  
  // 语音识别引用 (转文字)
  const recognitionRef = useRef<any>(null);
  // 媒体录音引用 (存声音)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  const debounceTimer = useRef<number | null>(null);

  // --- 初始化 ---
  useEffect(() => {
    // ------------------------------------------------------
    // [模式 A] 本地存储模式
    // ------------------------------------------------------
    const saved = localStorage.getItem('grandma_diary_logs');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    // 初始化语音识别 (转文字)
    const win = window as unknown as IWindow;
    if (win.webkitSpeechRecognition || win.SpeechRecognition) {
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-CN';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setTranscript(prev => prev + event.results[i][0].transcript);
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.warn("Speech recognition error", event.error);
        setIsListening(false);
      };
    }
  }, []);

  // --- 逻辑控制 ---
  
  // 关键：防抖动点击处理 (Anti-Tremor Click Handler)
  const handleSafeClick = (action: () => void) => {
    if (debounceTimer.current) return;
    action();
    debounceTimer.current = window.setTimeout(() => {
      debounceTimer.current = null;
    }, 1000);
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (!text) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.85; 
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startNewSession = () => {
    const randomIndex = Math.floor(Math.random() * FULL_QUESTION_BANK.length);
    const randomQ = FULL_QUESTION_BANK[randomIndex];
    setQuestion(randomQ);
    setTranscript('');
    setCurrentStep('asking');
    speakText(randomQ.text);
  };

  const cancelSession = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
    }
    setIsListening(false);
    setCurrentStep('welcome');
    speakText(""); 
  };

  // --- 自动下载音频文件 ---
  const downloadAudioBlob = () => {
    if (audioChunksRef.current.length === 0) return;

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp4' }); 
    const audioUrl = URL.createObjectURL(audioBlob);
    
    const a = document.createElement('a');
    a.href = audioUrl;
    const dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-');
    const timeStr = `${new Date().getHours()}点${new Date().getMinutes()}分`;
    const fileName = `奶奶日记_${dateStr}_${timeStr}.mp4`;
    
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(audioUrl);
  };

  const finishEntry = async () => {
    setIsSaving(true);
    
    const newEntry: DiaryEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('zh-CN'),
      time: new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'}),
      question: question.text,
      answer: transcript.trim() ? transcript : "（奶奶今天静静地听了一会儿）",
      mood: "recorded" 
    };

    // ------------------------------------------------------
    // [模式 A] 本地存储模式
    // ------------------------------------------------------
    const newHistory = [newEntry, ...history];
    setHistory(newHistory);
    localStorage.setItem('grandma_diary_logs', JSON.stringify(newHistory));

    setIsSaving(false);
    setCurrentStep('finished');
    setShowCelebration(true);
    speakText("记录好啦！音频已经下载到平板里了。");
  };

  // --- 启动/停止 双引擎 ---
  const toggleRecording = async () => {
    if (isListening) {
      // --- 停止录音 ---
      if (recognitionRef.current) recognitionRef.current.stop();
      
      // 停止音频录制
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop(); // 这会触发 onstop 事件并自动下载
      } else {
         // Fallback if media recorder failed to start but we want to finish flow
         setIsListening(false);
         setCurrentStep('saving');
         setTimeout(() => {
           finishEntry();
         }, 1000);
      }
      
    } else {
      // --- 开始录音 ---
      setTranscript('');
      
      try {
        // 1. 获取麦克风权限流
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // 2. 启动音频录制器 (MediaRecorder)
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        // 当录音停止时，触发下载
        mediaRecorder.onstop = () => {
          downloadAudioBlob();
          // 停止所有轨道，释放麦克风
          stream.getTracks().forEach(track => track.stop());
          
          setIsListening(false);
          setCurrentStep('saving');
          setTimeout(() => {
            finishEntry();
          }, 1000);
        };

        mediaRecorder.start();
        
        // 3. 启动文字识别器 (SpeechRecognition)
        if (recognitionRef.current) {
          recognitionRef.current.start();
        }
        
        setIsListening(true);
        
      } catch (e) {
        console.error("麦克风启动失败:", e);
        alert("无法启动录音，请检查是否允许了麦克风权限。");
      }
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: '时光录音机',
      text: `【奶奶的日记】\n时间：${new Date().toLocaleDateString()}\n问题：${question.text}\n回答：${transcript || '（奶奶听了听，笑了笑）'}\n\n-- 来自时光录音机`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        speakText("分享成功啦！");
      } catch (err) {
        console.log('分享取消', err);
      }
    } else {
      alert("请直接截图发给家人哦");
    }
  };

  const fontClass = "font-sans tracking-wide"; 

  // --- UI 部分 ---
  if (currentStep === 'welcome') {
    return (
      <div className={`min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center select-none ${fontClass}`}>
        {/* 标题 */}
        <h1 
          className="text-5xl md:text-6xl font-bold text-stone-800 mb-8 drop-shadow-sm font-kaiti" 
        >
          时光录音机
        </h1>
        
        {/* 日期框 */}
        <div className="bg-white px-8 py-4 rounded-2xl shadow-sm border border-stone-200 mb-12 transform hover:scale-105 transition-transform">
          <p className="text-xl md:text-2xl text-stone-500 font-medium flex items-center">
            <Calendar className="mr-3 text-emerald-500" size={24}/>
            {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div 
          onClick={() => handleSafeClick(startNewSession)}
          className="w-72 h-72 bg-emerald-500 rounded-full flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-all duration-300 cursor-pointer border-8 border-emerald-100 hover:bg-emerald-400"
        >
          <Mic size={90} className="text-white" strokeWidth={2} />
          <span className="text-3xl text-white font-bold mt-4 tracking-wider">点我 说话</span>
        </div>

        <button 
          onClick={() => setCurrentStep('history')}
          className="mt-20 flex items-center text-stone-600 bg-white px-10 py-5 rounded-full shadow-md text-xl font-bold active:bg-stone-100 transition-colors border border-stone-100 hover:shadow-lg"
        >
          <BookOpen className="mr-3" strokeWidth={2.5} size={28} />
          看看以前说的话
        </button>
      </div>
    );
  }

  if (currentStep === 'asking') {
    return (
      <div className={`min-h-screen bg-stone-50 flex flex-col p-4 md:p-6 select-none relative overflow-hidden ${fontClass}`}>
        <div className="flex justify-between items-center mb-6">
          <button onClick={cancelSession} className="p-4 bg-stone-200 rounded-full text-stone-600 active:bg-stone-300 transition-colors hover:bg-stone-300">
            <X size={32} />
          </button>
          <span className="text-stone-400 font-bold text-lg animate-pulse">正在记录...</span>
          <div className="w-12"></div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto z-10">
          <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl w-full border-t-8 border-emerald-500 relative">
             <button 
               onClick={() => speakText(question.text)} 
               className="absolute top-6 right-6 p-4 bg-emerald-50 rounded-full text-emerald-600 hover:bg-emerald-100 active:scale-90 transition-transform"
             >
               <Volume2 size={36} />
             </button>
            <div className="mb-6">
              <span className="bg-emerald-100 text-emerald-800 px-5 py-2 rounded-full text-xl font-bold tracking-wide">问题</span>
            </div>
            <p className="text-3xl md:text-5xl font-bold text-stone-800 leading-snug tracking-tight font-kaiti">
              {question.text}
            </p>
          </div>
          
          <div className="mt-10 w-full min-h-[120px] text-center px-4">
            {transcript ? (
              <p className="text-2xl md:text-4xl text-stone-700 font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-2">
                “{transcript}”
              </p>
            ) : (
              <p className="text-xl md:text-2xl text-stone-400 font-medium">
                （ 想好了就按下面大按钮，开始说话 ）
              </p>
            )}
          </div>
        </div>
        
        <div className="mb-8 w-full flex justify-center z-10">
          {!isListening ? (
            <div 
              onClick={() => handleSafeClick(toggleRecording)} 
              className="w-full max-w-xs aspect-square bg-emerald-500 rounded-[3rem] flex flex-col items-center justify-center shadow-xl active:bg-emerald-600 active:scale-95 transition-all cursor-pointer border-4 border-emerald-200 hover:bg-emerald-400"
            >
              <Mic size={100} color="white" />
              <span className="text-3xl text-white font-bold mt-4">开始 说</span>
            </div>
          ) : (
            <div 
              onClick={() => handleSafeClick(toggleRecording)} 
              className="w-full max-w-xs aspect-square bg-rose-500 rounded-[3rem] flex flex-col items-center justify-center shadow-xl active:bg-rose-600 active:scale-95 transition-all cursor-pointer relative border-4 border-rose-200 hover:bg-rose-400"
            >
              <div className="absolute inset-0 bg-rose-500 rounded-[3rem] animate-ping opacity-20"></div>
              <Square size={90} className="fill-white text-white" />
              <span className="text-3xl text-white font-bold mt-4">说完了</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentStep === 'saving') {
    return (
        <div className={`min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center ${fontClass}`}>
            <div className="bg-white p-12 rounded-[3rem] shadow-xl flex flex-col items-center w-full max-w-md">
            <Loader size={80} className="text-emerald-500 animate-spin mb-6" />
            <h2 className="text-3xl font-bold text-stone-700">正在保存...</h2>
            <p className="text-stone-400 mt-4 text-xl">音频将下载到平板</p>
            </div>
        </div>
    );
  }

  if (currentStep === 'finished') {
    return (
      <div className={`min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 text-center ${fontClass}`}>
        <div className={`transform transition-all duration-700 ${showCelebration ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
          <div className="bg-white p-8 rounded-full shadow-lg mb-8 inline-block">
             <Heart size={120} className="text-rose-500 fill-current animate-bounce" />
          </div>
        </div>
        <h2 className="text-5xl font-extrabold text-stone-800 mb-6 drop-shadow-sm font-kaiti">记录成功！</h2>
        <p className="text-2xl text-stone-600 mb-12 font-medium max-w-md mx-auto leading-relaxed">奶奶真棒！<br/>今天的事情都已经记下来啦。</p>

        <div className="w-full max-w-sm mb-10">
           <button 
             onClick={() => handleSafeClick(handleShare)}
             className="w-full py-6 bg-amber-400 text-amber-900 rounded-3xl text-2xl font-bold shadow-lg active:scale-95 active:bg-amber-500 transition-all flex items-center justify-center mb-3 hover:bg-amber-300"
           >
             <Share2 className="mr-3" size={32} strokeWidth={2.5} />
             告诉孩子们
           </button>
           <p className="text-emerald-700/60 text-lg font-medium">点一下，发给微信群或家里人</p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-sm">
          <button onClick={() => setCurrentStep('welcome')} className="w-full py-6 bg-emerald-600 text-white rounded-3xl text-3xl font-bold shadow-xl active:scale-95 active:bg-emerald-700 transition-all flex items-center justify-center hover:bg-emerald-500">
            <Home className="mr-3" size={36} strokeWidth={3} /> 回到主页
          </button>
          <button onClick={() => setCurrentStep('history')} className="w-full py-5 bg-white text-emerald-700 rounded-3xl text-xl font-bold shadow-md active:scale-95 transition-all mt-2 hover:bg-stone-50">
            看看刚才录的
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 'history') {
    return (
      <div className={`min-h-screen bg-stone-50 p-6 ${fontClass}`}>
        <div className="flex items-center mb-10 sticky top-0 bg-stone-50/95 backdrop-blur-sm py-4 z-20 border-b border-stone-200">
          <button onClick={() => setCurrentStep('welcome')} className="bg-white p-4 rounded-2xl shadow-md text-stone-600 active:bg-stone-100 transition-colors mr-6 border border-stone-100 hover:shadow-lg">
            <ChevronLeft size={32} />
          </button>
          <h2 className="text-4xl font-extrabold text-stone-800 font-kaiti">回忆小本本</h2>
        </div>
        
        <div className="grid gap-8 max-w-3xl mx-auto pb-20">
            {history.length === 0 ? (
              <div className="text-center py-32 flex flex-col items-center">
                 <div className="bg-stone-200 w-32 h-32 rounded-full flex items-center justify-center mb-8">
                   <BookOpen size={64} className="text-stone-400" />
                 </div>
                 <p className="text-stone-400 text-3xl font-medium font-kaiti">还没有记录哦，<br/>快去录第一条吧！</p>
              </div>
            ) : (
              history.map((entry) => (
                <div key={entry.id} className="bg-white p-8 rounded-[2rem] shadow-sm border-l-8 border-emerald-300 transform transition-all hover:scale-[1.01] hover:shadow-md">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center text-emerald-700 font-bold text-2xl bg-emerald-50 px-5 py-3 rounded-xl">
                      <Calendar className="mr-3" size={28} /> {entry.date} <span className="mx-2 text-emerald-300">|</span> {entry.time}
                    </div>
                  </div>
                  <div className="mb-6">
                    <span className="bg-stone-100 text-stone-500 text-xl px-4 py-2 rounded-lg font-bold">问</span>
                    <p className="text-stone-600 text-3xl font-medium mt-3 leading-relaxed font-kaiti">{entry.question}</p>
                  </div>
                  <div className="bg-stone-50 p-8 rounded-2xl border border-stone-100">
                    <p className="text-stone-800 text-4xl font-medium leading-loose text-justify font-kaiti">“{entry.answer}”</p>
                  </div>
                </div>
              ))
            )}
        </div>
      </div>
    );
  }

  return null;
}