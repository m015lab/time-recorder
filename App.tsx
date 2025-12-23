import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Calendar, 
  Heart, 
  BookOpen, 
  Home, 
  X, 
  Loader, 
  ChevronLeft, 
  Share2 
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Question, DiaryEntry, IWindow } from './types';

// --- 题库 ---
const FULL_QUESTION_BANK: Question[] = [
  // --- 现在的感觉 (Immediate / Health) ---
  { text: "奶奶，今天中午吃了什么菜？合不合胃口？", type: "short_term" },
  { text: "今天有没有喝水？记得喝了几杯吗？", type: "health" },
  { text: "今天天气怎么样？看见太阳了吗？", type: "orientation" },
  { text: "昨晚睡得好不好？有没有做梦？", type: "health" },
  { text: "现在腿脚感觉怎么样？有没有哪里不舒服？", type: "health" },
  { text: "今天心情怎么样？有没有什么开心的事？", type: "short_term" },
  { text: "刚刚在做什么呢？有没有看电视或者听广播？", type: "short_term" },
  { text: "如果明天天气好，想出去晒晒太阳吗？", type: "short_term" },
  { text: "最近有没有什么想买的东西？", type: "desire" },
  { text: "今天开心吗？", type: "emotion" },

  // --- 童年记忆 (Childhood) ---
  { text: "奶奶，你小时候住在哪里？家门口有什么？", type: "childhood" },
  { text: "小时候你最喜欢的玩具是什么？", type: "childhood" },
  { text: "你小时候最好的朋友叫什么名字？还记得吗？", type: "childhood" },
  { text: "小时候上学吗？学校里有什么好玩的事？", type: "childhood" },
  { text: "小时候家里谁最疼你？", type: "childhood" },
  { text: "小时候过年，最期待的是什么？", type: "childhood" },
  { text: "小时候有没有闯过祸？挨过打吗？", type: "childhood" },
  { text: "还记得小时候穿的衣服都是谁做的吗？", type: "childhood" },
  { text: "小时候最爱吃的一道零食是什么？", type: "childhood" },
  { text: "小时候家里养过猫或者狗吗？", type: "childhood" },
  { text: "小时候怕黑吗？", type: "childhood" },
  { text: "还会唱小时候的儿歌吗？唱两句？", type: "skill" },

  // --- 青春岁月 (Youth) ---
  { text: "奶奶，你年轻的时候留什么发型？", type: "youth" },
  { text: "你第一份工作是做什么的？", type: "youth" },
  { text: "年轻的时候，最流行穿什么衣服？", type: "youth" },
  { text: "还记得第一次领工资买了什么吗？", type: "youth" },
  { text: "年轻的时候，平时放假都去哪里玩？", type: "youth" },
  { text: "那时候有没有特别崇拜的明星或者偶像？", type: "youth" },
  { text: "年轻的时候，觉得自己性格怎么样？", type: "youth" },
  { text: "第一次坐火车或者是坐飞机是什么时候？", type: "travel" },

  // --- 爱情与家庭 (Family & Love) ---
  { text: "还记得爷爷/老伴年轻时候长什么样吗？", type: "nostalgia" },
  { text: "你们是怎么认识的？是谁介绍的吗？", type: "nostalgia" },
  { text: "结婚那天穿的什么衣服？热闹吗？", type: "nostalgia" },
  { text: "刚结婚的时候，日子过得怎么样？", type: "nostalgia" },
  { text: "爸爸/妈妈（儿女）小时候听话吗？", type: "family" },
  { text: "孩子小时候，哪件事让你最头疼？", type: "family" },
  { text: "孩子小时候，哪件事让你觉得最骄傲？", type: "family" },
  { text: "以前一家人最喜欢一起做什么？", type: "family" },
  { text: "那时候结婚要准备什么彩礼或者嫁妆？", type: "custom" },
  { text: "以前家里谁说了算？", type: "family" },
  { text: "这一生中，谁对你的帮助最大？", type: "gratitude" },

  // --- 饮食喜好 (Food) ---
  { text: "奶奶，你年轻的时候最拿手的菜是什么？", type: "preference" },
  { text: "以前过年的时候，家里都会包什么样的饺子？", type: "preference" },
  { text: "你最喜欢吃甜的还是咸的？", type: "preference" },
  { text: "有没有哪道菜，是现在特别想吃的？", type: "preference" },
  { text: "夏天的时候，你最喜欢吃什么消暑？", type: "preference" },
  { text: "冬天最喜欢吃什么热乎乎的东西？", type: "preference" },
  { text: "以前家里谁做饭最好吃？", type: "preference" },
  { text: "觉得现在的饭菜和以前的比，哪个更好吃？", type: "comparison" },

  // --- 生活智慧 (Wisdom) ---
  { text: "奶奶，如果能回到20岁，你最想对自己说什么？", type: "wisdom" },
  { text: "你觉得这辈子最正确的决定是什么？", type: "wisdom" },
  { text: "现在看，什么事情是最不值得生气的？", type: "wisdom" },
  { text: "对于现在的年轻人，你有什么建议吗？", type: "wisdom" },
  { text: "你觉得什么是幸福？", type: "wisdom" },
  { text: "遇到困难的时候，你是怎么熬过来的？", type: "wisdom" },
  { text: "奶奶，你觉得两个人过日子，最重要的是什么？", type: "legacy" },
  { text: "你最喜欢的一句老话或者谚语是什么？", type: "wisdom" },
  { text: "觉得这辈子过得值不值？", type: "reflection" },

  // --- 个人偏好 (Preferences) ---
  { text: "你最喜欢什么花？牡丹、月季还是菊花？", type: "preference" },
  { text: "你最喜欢什么颜色？", type: "preference" },
  { text: "有没有哪首歌，是你特别喜欢哼的？", type: "preference" },
  { text: "你最喜欢的季节是哪个？为什么？", type: "preference" },
  { text: "如果可以去旅游，你现在最想去哪里？", type: "preference" },
  { text: "更喜欢养猫还是养狗？", type: "preference" },
  { text: "你最喜欢的一件衣服是什么样子的？", type: "fashion" },

  // --- 时代变迁 (History) ---
  { text: "奶奶，你觉得现在的生活和以前比，最大的变化是什么？", type: "history" },
  { text: "第一次看见电视机的时候，是什么感觉？", type: "history" },
  { text: "以前没有手机的时候，大家怎么联系？", type: "history" },
  { text: "你觉得现在的科技，哪个最方便？", type: "history" },
  { text: "以前家里是怎么取暖的？", type: "life" },
  { text: "以前怎么洗衣服？", type: "life" },
  
  // --- 补充随机 ---
  { text: "讲一个你小时候听过的故事吧？", type: "story" },
  { text: "如果中了大奖，你想买什么？", type: "imagination" },
  { text: "你觉得自己最像爸爸还是最像妈妈？", type: "identity" },
  { text: "家里以前有什么老物件是你最舍不得扔的？", type: "memory" },
  { text: "以前过节的时候，有什么特别的习俗吗？", type: "culture" },
  { text: "小时候玩过踢毽子或者跳皮筋吗？", type: "play" },
  { text: "有没有哪个老师让你印象特别深刻？", type: "school" },
  { text: "有没有什么遗憾的事情？", type: "life" },
  { text: "给孙子/孙女说一句祝福的话吧？", type: "love" },
  { text: "今天有没有想起哪个老朋友？", type: "social" },
  { text: "以前夏天怎么避暑？", type: "life" },
  { text: "最喜欢的一张老照片是哪张？", type: "memory" },
  { text: "你觉得自己是个急性子还是慢性子？", type: "identity" },
  { text: "以前生病了都怎么治？", type: "health_history" },
  { text: "有没有特别想见的人？", type: "longing" }
];

type Step = 'welcome' | 'asking' | 'saving' | 'finished' | 'history';

export default function GrandmaVoiceDiary() {
  const [currentStep, setCurrentStep] = useState<Step>('welcome'); 
  const [question, setQuestion] = useState<Question>(FULL_QUESTION_BANK[0]);
  
  // 录音状态
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isLoadingMic, setIsLoadingMic] = useState<boolean>(false);
  const [realtimeText, setRealtimeText] = useState<string>(""); // 实时识别文本
  
  // 数据状态
  const [history, setHistory] = useState<DiaryEntry[]>([]);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [savingStatus, setSavingStatus] = useState<string>(''); 
  
  // 媒体录音引用 (存声音)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  
  // 原生语音识别引用 (转文字)
  const recognitionRef = useRef<any>(null);
  const recognizedTextRef = useRef<string>(""); // 使用ref防止闭包问题

  const debounceTimer = useRef<number | null>(null);

  // --- 初始化 ---
  useEffect(() => {
    const saved = localStorage.getItem('grandma_diary_logs');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    // 初始化浏览器原生语音识别 (支持 iOS Safari, Android Chrome, 等)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true; // 开启实时结果
      recognition.lang = 'zh-CN'; // 强制中文
      
      recognition.onresult = (event: any) => {
        let final = "";
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        // 如果有最终结果，累加到 ref
        if (final) {
          recognizedTextRef.current += final;
        }
        // UI 显示：已确认的部分 + 正在说的部分
        setRealtimeText(recognizedTextRef.current + interim);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error", event.error);
        // 不做过多处理，失败了自然会没有文本，最后降级到 Gemini
      };

      recognitionRef.current = recognition;
    }

    // 清理
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // --- 工具函数 ---
  
  const handleSafeClick = (action: () => void) => {
    if (debounceTimer.current) return;
    action();
    debounceTimer.current = window.setTimeout(() => {
      debounceTimer.current = null;
    }, 1000);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64String = result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // --- AI 转录 (降级方案) ---
  const transcribeAudio = async (audioBlob: Blob, questionText: string): Promise<string> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = await blobToBase64(audioBlob);
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp', 
        contents: {
          parts: [
            { 
              inlineData: { 
                mimeType: audioBlob.type || 'audio/webm', 
                data: base64Data 
              } 
            },
            { text: `任务：准确转录这段中文录音。
背景问题：${questionText}
要求：
1. 请根据问题语境修正同音字（如"七"听成"吃"等）。
2. 输出标准简体中文。
3. 去除口头禅。
4. 仅输出内容。` }
          ]
        },
        config: { temperature: 0.1 }
      });
      return response.text?.trim() || "";
    } catch (error) {
      console.error("Transcription error:", error);
      return "";
    }
  };

  // --- 业务逻辑 ---

  const startNewSession = () => {
    const randomIndex = Math.floor(Math.random() * FULL_QUESTION_BANK.length);
    const randomQ = FULL_QUESTION_BANK[randomIndex];
    setQuestion(randomQ);
    setCurrentStep('asking');
    setRealtimeText(""); // 清空上一轮的文本
    recognizedTextRef.current = "";
  };

  const cancelSession = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setIsLoadingMic(false);
    setRealtimeText("");
    setCurrentStep('welcome');
  };

  const downloadAudioBlob = (blob: Blob) => {
    const audioUrl = URL.createObjectURL(blob);
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

  const processAndFinishEntry = async (audioBlob: Blob) => {
    setSavingStatus('正在下载音频...');
    downloadAudioBlob(audioBlob);

    let finalContent = "";
    
    // 策略：优先使用原生识别的结果
    const nativeText = recognizedTextRef.current.trim();
    
    if (nativeText && nativeText.length > 2) {
       // 如果原生识别有较长内容，直接使用
       console.log("Using native speech recognition result");
       finalContent = nativeText;
    } else {
       // 否则降级使用 AI
       setSavingStatus('正在请 AI 仔细听辨...');
       try {
          finalContent = await transcribeAudio(audioBlob, question.text);
       } catch (e) {
          console.error("AI failed", e);
       }
    }

    if (!finalContent) {
        finalContent = "（未识别到清晰语音）";
    }
    
    const newEntry: DiaryEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('zh-CN'),
      time: new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'}),
      question: question.text,
      answer: finalContent,
      mood: "recorded" 
    };

    const newHistory = [newEntry, ...history];
    setHistory(newHistory);
    localStorage.setItem('grandma_diary_logs', JSON.stringify(newHistory));

    setCurrentStep('finished');
    setShowCelebration(true);
    // 重置状态
    setRealtimeText("");
    recognizedTextRef.current = "";
  };

  const toggleRecording = async () => {
    if (navigator.vibrate) navigator.vibrate(200);

    if (isListening) {
      // --- 停止 ---
      if (recognitionRef.current) {
        recognitionRef.current.stop(); // 停止原生识别
      }

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop(); // 停止录音，触发 onstop
        setIsListening(false);
        setCurrentStep('saving');
        setSavingStatus('正在保存...');
      }
    } else {
      // --- 开始 ---
      setIsLoadingMic(true);
      setRealtimeText("");
      recognizedTextRef.current = "";
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          stream.getTracks().forEach(track => track.stop()); // 关掉麦克风
          processAndFinishEntry(audioBlob);
        };

        // 启动原生识别 (如果有)
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.warn("Failed to start native recognition", e);
          }
        }

        mediaRecorder.start();
        setIsListening(true);
        
      } catch (e) {
        console.error("麦克风启动失败:", e);
        alert("无法启动录音，请检查权限。");
      } finally {
        setIsLoadingMic(false);
      }
    }
  };

  const handleShare = async () => {
    const latestEntry = history[0];
    const content = latestEntry ? latestEntry.answer : '（奶奶听了听，笑了笑）';
    const shareData = {
      title: '时光录音机',
      text: `【奶奶的日记】\n时间：${new Date().toLocaleDateString()}\n问题：${question.text}\n回答：${content}\n\n-- 来自时光录音机`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
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
        <h1 className="text-5xl md:text-6xl font-bold text-stone-800 mb-8 drop-shadow-sm font-kaiti">
          时光录音机
        </h1>
        
        <div className="bg-white px-8 py-4 rounded-2xl shadow-sm border border-stone-200 mb-12 transform hover:scale-105 transition-transform">
          <p className="text-xl md:text-2xl text-stone-500 font-medium flex items-center">
            <Calendar className="mr-3 text-emerald-500" size={24}/>
            {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div 
          onClick={() => handleSafeClick(startNewSession)}
          className="w-72 h-72 bg-emerald-500 rounded-full flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-all duration-300 cursor-pointer border-8 border-emerald-100 hover:bg-emerald-400 hover:shadow-emerald-200/50 hover:shadow-2xl"
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
        {isListening && (
           <div className="absolute top-0 left-0 w-full h-2 bg-rose-500 animate-pulse z-50"></div>
        )}

        <div className="flex justify-between items-center mb-4">
          <button onClick={cancelSession} className="p-4 bg-stone-200 rounded-full text-stone-600 active:bg-stone-300 transition-colors hover:bg-stone-300">
            <X size={32} />
          </button>
          
          <div className="w-12"></div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-start w-full max-w-3xl mx-auto z-10 pt-4">
          <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl w-full border-t-8 border-emerald-500 relative transition-all">
            <div className="mb-6 flex justify-center">
              <span className="bg-emerald-100 text-emerald-800 px-6 py-2 rounded-full text-xl font-bold tracking-wide">
                请回答
              </span>
            </div>
            <p className="text-3xl md:text-5xl font-bold text-stone-800 leading-snug tracking-tight font-kaiti text-center">
              {question.text}
            </p>
          </div>
          
          <div className="mt-8 w-full min-h-[120px] text-center px-4 flex-1 flex flex-col justify-center">
            {isListening ? (
               <div className="flex flex-col items-center w-full">
                  {/* 实时文字显示区域 */}
                  {realtimeText ? (
                    <div className="mb-4 p-4 bg-stone-100 rounded-xl w-full">
                      <p className="text-2xl text-stone-800 font-medium font-kaiti leading-relaxed animate-pulse">
                        “{realtimeText}”
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-2 mb-4 h-8 items-center">
                       <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                       <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                       <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  )}
                  <p className="text-xl text-stone-500 font-kaiti">
                    {realtimeText ? "正在记录..." : "正在认真听奶奶说话..."}
                  </p>
               </div>
            ) : (
              <p className="text-2xl text-stone-400 font-medium font-kaiti opacity-50">
                （ 您的回答会记录在这里 ）
              </p>
            )}
          </div>
        </div>
        
        <div className="mb-8 w-full flex flex-col items-center z-10">
          
          <div className="mb-6 text-center h-16 flex items-center justify-center">
            {isLoadingMic ? (
              <p className="text-2xl text-emerald-600 font-bold animate-pulse">正在启动录音...</p>
            ) : isListening ? (
               <div className="animate-pulse flex flex-col items-center">
                  <p className="text-3xl text-rose-600 font-bold mb-1">正在录音中...</p>
                  <p className="text-xl text-stone-500">说完请点击下方<span className="text-rose-600 font-bold">红色按钮</span></p>
               </div>
            ) : (
               <div className="flex flex-col items-center">
                  <p className="text-2xl text-stone-600 font-bold mb-1">准备好了吗？</p>
                  <p className="text-xl text-stone-500">点击下方<span className="text-emerald-600 font-bold">绿色按钮</span>开始录音</p>
               </div>
            )}
          </div>

          {isLoadingMic ? (
             <div 
              className="w-full max-w-xs aspect-square bg-emerald-400 rounded-[3rem] flex flex-col items-center justify-center shadow-xl border-4 border-emerald-200 cursor-wait"
             >
               <Loader size={80} className="text-white animate-spin" />
               <span className="text-3xl text-white font-bold mt-4">启动中...</span>
             </div>
          ) : !isListening ? (
            <div 
              onClick={() => handleSafeClick(toggleRecording)} 
              className="w-full max-w-xs aspect-square bg-emerald-500 rounded-[3rem] flex flex-col items-center justify-center shadow-xl active:bg-emerald-600 active:scale-95 transition-all cursor-pointer border-4 border-emerald-200 hover:bg-emerald-400"
            >
              <Mic size={90} color="white" />
              <span className="text-4xl text-white font-bold mt-4 tracking-widest">开始录音</span>
            </div>
          ) : (
            <div 
              onClick={() => handleSafeClick(toggleRecording)} 
              className="w-full max-w-xs aspect-square bg-rose-500 rounded-[3rem] flex flex-col items-center justify-center shadow-xl active:bg-rose-600 active:scale-95 transition-all cursor-pointer relative border-4 border-rose-200 hover:bg-rose-400"
            >
              <div className="absolute inset-0 bg-rose-500 rounded-[3rem] animate-ping opacity-20"></div>
              <Square size={80} className="fill-white text-white" />
              <span className="text-4xl text-white font-bold mt-4 tracking-widest">结束录音</span>
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
            <h2 className="text-3xl font-bold text-stone-700">{savingStatus || '正在保存...'}</h2>
            <p className="text-stone-400 mt-4 text-xl font-kaiti">稍等一下，正在把话记到本本上</p>
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