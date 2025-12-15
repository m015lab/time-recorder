export interface Question {
  text: string;
  type: string;
}

export interface DiaryEntry {
  id: number;
  date: string;
  time: string;
  question: string;
  answer: string;
  mood: string;
}

// Type definitions for Web Speech API which might not be in standard lib.dom.d.ts depending on environment
export interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}
