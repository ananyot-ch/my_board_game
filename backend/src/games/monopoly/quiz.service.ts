import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface QuizQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
}

const TOPICS = [
  'ประวัติศาสตร์ไทย', 'ประวัติศาสตร์โลก', 'ภูมิศาสตร์', 'วิทยาศาสตร์ทั่วไป',
  'คณิตศาสตร์', 'ดาราศาสตร์', 'วรรณคดีไทย', 'ภาษาอังกฤษ',
  'กีฬา', 'อาหารไทย', 'สัตว์', 'เทคโนโลยี',
];

const FALLBACK_QUESTIONS: QuizQuestion[] = [
  { question: 'เมืองหลวงของประเทศไทยคือ?', choices: ['กรุงเทพมหานคร','เชียงใหม่','ภูเก็ต','ขอนแก่น','พัทยา'], correctIndex: 0 },
  { question: 'ดาวเคราะห์ใดอยู่ใกล้ดวงอาทิตย์ที่สุด?', choices: ['ศุกร์','โลก','พุธ','อังคาร','พฤหัสบดี'], correctIndex: 2 },
  { question: '7 × 8 = ?', choices: ['54','56','58','64','48'], correctIndex: 1 },
  { question: 'แม่น้ำที่ยาวที่สุดในโลกคือ?', choices: ['อะเมซอน','ไนล์','แยงซี','มิสซิสซิปปี','โขง'], correctIndex: 1 },
  { question: 'สัตว์เลี้ยงลูกด้วยนมที่บินได้คือ?', choices: ['นกอินทรี','ค้างคาว','ไก่','ผีเสื้อ','แมลงปอ'], correctIndex: 1 },
  { question: '"Hello" แปลว่าอะไร?', choices: ['ลาก่อน','ขอบคุณ','สวัสดี','ขอโทษ','ยินดี'], correctIndex: 2 },
  { question: 'ภาคใดของไทยมีจังหวัดมากที่สุด?', choices: ['เหนือ','กลาง','อีสาน','ใต้','ตะวันออก'], correctIndex: 2 },
  { question: 'น้ำเดือดที่อุณหภูมิเท่าไรในระดับน้ำทะเล (°C)?', choices: ['90','95','100','105','110'], correctIndex: 2 },
  { question: 'ผู้ใดเขียน "พระอภัยมณี"?', choices: ['สุนทรภู่','รัชกาลที่ 5','ศรีปราชญ์','พุทธทาสภิกขุ','คึกฤทธิ์ ปราโมช'], correctIndex: 0 },
  { question: 'กีฬาใดใช้แร็กเก็ต?', choices: ['ฟุตบอล','บาสเกตบอล','แบดมินตัน','ว่ายน้ำ','รักบี้'], correctIndex: 2 },
  { question: 'ทวีปใดใหญ่ที่สุด?', choices: ['แอฟริกา','ยุโรป','อเมริกาเหนือ','เอเชีย','ออสเตรเลีย'], correctIndex: 3 },
  { question: 'ใครเป็นผู้ก่อตั้ง Microsoft?', choices: ['สตีฟ จ็อบส์','บิล เกตส์','มาร์ค ซักเคอร์เบิร์ก','อีลอน มัสก์','เจฟฟ์ เบโซส'], correctIndex: 1 },
];

const PROMPT_TEMPLATE = (topic: string) =>
`สร้างคำถามแบบเลือกตอบ 1 ข้อ เป็นภาษาไทย หัวข้อ "${topic}" ระดับง่ายถึงปานกลาง
ส่งกลับเป็น JSON เท่านั้น (ห้ามใส่ markdown / code fence / ข้อความอื่น) ในรูปแบบ:
{"question":"คำถาม","choices":["ตัวเลือก1","ตัวเลือก2","ตัวเลือก3","ตัวเลือก4","ตัวเลือก5"],"correctIndex":0}
- choices ต้องมี 5 ข้อ
- correctIndex เป็น 0-4 ตามตำแหน่งคำตอบที่ถูกต้อง
- ห้ามมีคำตอบที่กำกวมหรือมีหลายข้อถูก`;

const FETCH_TIMEOUT_MS = 8000;

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);
  constructor(private readonly config: ConfigService) {}

  async generate(): Promise<QuizQuestion> {
    const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
    const prompt = PROMPT_TEMPLATE(topic);

    const providers: Array<() => Promise<QuizQuestion | null>> = [
      () => this.tryGemini(prompt),
      () => this.tryGroq(prompt),
      () => this.tryCloudflare(prompt),
      () => this.tryOpenRouter(prompt),
    ];

    for (const fn of providers) {
      try {
        const q = await fn();
        if (q && this.isValid(q)) return q;
      } catch (err: any) {
        this.logger.warn(`Provider failed: ${err?.message ?? err}`);
      }
    }

    this.logger.warn('All providers failed — using local fallback');
    return FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
  }

  // ─── providers ──────────────────────────────────────────────────────────────

  private async tryGemini(prompt: string): Promise<QuizQuestion | null> {
    const key = this.config.get<string>('GEMINI_API_KEY');
    if (!key) return null;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    const res = await this.fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.9 },
      }),
    });
    const text: string | undefined = res?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? this.parseQuiz(text) : null;
  }

  private async tryGroq(prompt: string): Promise<QuizQuestion | null> {
    const key = this.config.get<string>('GROQ_API_KEY');
    if (!key) return null;
    const res = await this.fetchJson('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.9,
      }),
    });
    const text: string | undefined = res?.choices?.[0]?.message?.content;
    return text ? this.parseQuiz(text) : null;
  }

  private async tryCloudflare(prompt: string): Promise<QuizQuestion | null> {
    const key = this.config.get<string>('CLOUDFLARE_API_KEY');
    const account = this.config.get<string>('CLOUDFLARE_ACCOUNT_ID');
    if (!key || !account) return null;
    const url = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/meta/llama-3.1-8b-instruct`;
    const res = await this.fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
      }),
    });
    const text: string | undefined = res?.result?.response;
    return text ? this.parseQuiz(text) : null;
  }

  private async tryOpenRouter(prompt: string): Promise<QuizQuestion | null> {
    const key = this.config.get<string>('OPENROUTER_API_KEY');
    if (!key) return null;
    const res = await this.fetchJson('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
      }),
    });
    const text: string | undefined = res?.choices?.[0]?.message?.content;
    return text ? this.parseQuiz(text) : null;
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  private async fetchJson(url: string, init: RequestInit): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /** Extract first JSON object from text (handles markdown, surrounding text) */
  private parseQuiz(text: string): QuizQuestion | null {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as QuizQuestion;
    } catch {
      return null;
    }
  }

  private isValid(q: QuizQuestion): boolean {
    return (
      typeof q.question === 'string' && q.question.trim().length > 0 &&
      Array.isArray(q.choices) && q.choices.length === 5 &&
      q.choices.every(c => typeof c === 'string' && c.trim().length > 0) &&
      typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 5
    );
  }
}
