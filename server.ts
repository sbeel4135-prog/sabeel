import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

// Persistent Users Database File setup
const DATA_DIR = path.resolve(__dirname, 'data');
const USERS_FILE = path.resolve(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface StoredSecurityQuestions {
  fullName: string;
  birthYear: string;
  city: string;
  roleModel: string;
  favoriteBookOrSubject: string;
}

interface StoredUser {
  id: string;
  username: string;
  password: string;
  college: 'كلية الشريعة' | 'قانون / أنظمة' | 'تخصص آخر';
  fullName?: string;
  gender?: 'ذكر' | 'أنثى';
  securityQuestions?: StoredSecurityQuestions;
  createdAt: string;
}

function getStoredUsers(): StoredUser[] {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading users file:', err);
    return [];
  }
}

function saveStoredUsers(users: StoredUser[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving users file:', err);
  }
}

// User Authentication Endpoints
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, college, fullName, gender, securityQuestions } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'الرجاء إدخال اسم المستخدم.' });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'الرجاء إدخال كلمة المرور.' });
    }
    if (
      !college ||
      (college !== 'كلية الشريعة' && college !== 'قانون / أنظمة' && college !== 'تخصص آخر')
    ) {
      return res.status(400).json({ error: 'الرجاء تحديد التخصص الجامعي.' });
    }

    const cleanUsername = username.trim();
    const users = getStoredUsers();

    // Check if username is already taken (case-insensitive)
    const exists = users.some(
      (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
    );

    if (exists) {
      return res.status(400).json({
        error: 'اسم المستخدم هذا مستخدم مسبقاً، الرجاء اختيار اسم آخر',
      });
    }

    const newUser: StoredUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: cleanUsername,
      password: password.trim(),
      college,
      fullName: (fullName || cleanUsername).trim(),
      gender: gender === 'ذكر' ? 'ذكر' : 'أنثى',
      securityQuestions: securityQuestions
        ? {
            fullName: String(securityQuestions.fullName || '').trim(),
            birthYear: String(securityQuestions.birthYear || '').trim(),
            city: String(securityQuestions.city || '').trim(),
            roleModel: String(securityQuestions.roleModel || '').trim(),
            favoriteBookOrSubject: String(securityQuestions.favoriteBookOrSubject || '').trim(),
          }
        : undefined,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveStoredUsers(users);

    // Return safe user object
    res.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        college: newUser.college,
        gender: newUser.gender,
        securityQuestions: newUser.securityQuestions,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'حدث خطأ في الخادم أثناء تسجيل الحساب.' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'الرجاء إدخال اسم المستخدم وكلمة المرور.' });
    }

    const cleanUsername = username.trim();
    const users = getStoredUsers();

    const matched = users.find(
      (u) =>
        u.username.toLowerCase() === cleanUsername.toLowerCase() &&
        u.password === password.trim()
    );

    if (!matched) {
      return res.status(400).json({
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة، يرجى التحقق وإعادة المحاولة',
      });
    }

    res.json({
      success: true,
      user: {
        id: matched.id,
        username: matched.username,
        fullName: matched.fullName,
        college: matched.college,
        gender: matched.gender || 'أنثى',
        securityQuestions: matched.securityQuestions,
        createdAt: matched.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'حدث خطأ في الخادم أثناء تسجيل الدخول.' });
  }
});

// Reset password endpoint verifying 5 security questions
app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { username, answers, newPassword } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'الرجاء إدخال اسم المستخدم.' });
    }
    if (!newPassword || !newPassword.trim()) {
      return res.status(400).json({ error: 'الرجاء إدخال كلمة المرور الجديدة.' });
    }
    if (!answers) {
      return res.status(400).json({ error: 'الرجاء الإجابة على جميع الأسئلة السرية.' });
    }

    const cleanUsername = username.trim();
    const users = getStoredUsers();
    const userIndex = users.findIndex(
      (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
    );

    if (userIndex === -1) {
      return res.status(404).json({ error: 'لم يتم العثور على حساب بهذا الاسم.' });
    }

    const targetUser = users[userIndex];
    const stored = targetUser.securityQuestions;

    if (!stored) {
      return res.status(400).json({
        error: 'هذا الحساب لم يقم بضبط الأسئلة السرية مسبقاً.',
      });
    }

    const norm = (str: any) => String(str || '').trim().toLowerCase();

    const matchesFullName = norm(answers.fullName) === norm(stored.fullName);
    const matchesBirthYear = norm(answers.birthYear) === norm(stored.birthYear);
    const matchesCity = norm(answers.city) === norm(stored.city);
    const matchesRoleModel = norm(answers.roleModel) === norm(stored.roleModel);
    const matchesFav = norm(answers.favoriteBookOrSubject) === norm(stored.favoriteBookOrSubject);

    if (!matchesFullName || !matchesBirthYear || !matchesCity || !matchesRoleModel || !matchesFav) {
      return res.status(400).json({
        error: 'إجابات الأسئلة السرية غير متطابقة، يرجى التأكد وإعادة المحاولة.',
      });
    }

    // Update password
    targetUser.password = newPassword.trim();
    users[userIndex] = targetUser;
    saveStoredUsers(users);

    res.json({
      success: true,
      message: 'تم تعيين كلمة المرور الجديدة بنجاح!',
      user: {
        id: targetUser.id,
        username: targetUser.username,
        fullName: targetUser.fullName,
        college: targetUser.college,
        gender: targetUser.gender || 'أنثى',
        securityQuestions: targetUser.securityQuestions,
        createdAt: targetUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'حدث خطأ في الخادم أثناء استعادة كلمة المرور.' });
  }
});

// Initialize GoogleGenAI client securely on server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Error formatting utility to log full Google server error details and return human-actionable Arabic messages
function formatGeminiError(error: any, context: string) {
  const rawStatus = error?.status || error?.statusCode;
  const rawMessage = error?.message || (typeof error === 'string' ? error : 'Unknown error occurred');
  
  const status = rawStatus || 
    (String(rawMessage).includes('429') ? 429 : 
    (String(rawMessage).includes('403') ? 403 : 
    (String(rawMessage).includes('503') ? 503 : 
    (String(rawMessage).includes('404') ? 404 : 500))));

  const isQuota = status === 429 || String(rawMessage).includes('429') || String(rawMessage).toLowerCase().includes('quota') || String(rawMessage).toLowerCase().includes('resource_exhausted');
  const isKeyMissing = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim().length === 0;

  console.log(`[Gemini API Handled] [${context}] Status: ${status} | QuotaExceeded: ${isQuota} | KeyMissing: ${isKeyMissing}`);
  console.log(`[Gemini API Handled] Details: ${rawMessage}`);

  let userFriendly = '';
  if (isKeyMissing) {
    userFriendly = '[خطأ تكوين] مفتاح GEMINI_API_KEY غير موجود في ملف البيئة (.env / Secrets). يرجى إضافة مفتاح صالح.';
  } else if (isQuota) {
    userFriendly = `[خطأ 429 Quota Exceeded] تم استنفاد الحصة اليومية لمفتاح Google AI Studio الحالي (429 Quota Exceeded). رسالة سيرفر Google: "${rawMessage}". يرجى تحديث مفتاح GEMINI_API_KEY في ملف البيئة بمفتاح جديد للاستمرار.`;
  } else if (status === 403) {
    userFriendly = `[خطأ 403 Forbidden] مفتاح الـ API غير مصرح له أو مقيد: ${rawMessage}`;
  } else if (status === 503) {
    userFriendly = `[خطأ 503 Service Unavailable] ضغط مؤقت على خوادم Google: ${rawMessage}. يرجى المحاولة بعد لحظات.`;
  } else if (status === 404) {
    userFriendly = `[خطأ 404 Model Not Found] اسم المودل غير متاح أو لم يعد مدعوماً: ${rawMessage}`;
  } else {
    userFriendly = `[خطأ ${status}] ${rawMessage}`;
  }

  return {
    status,
    isQuota,
    error: userFriendly,
    rawMessage,
    details: rawMessage,
  };
}

// Robust Gemini content generator with automatic fallback and retry
async function generateGeminiContent(params: {
  contents: any;
  config?: any;
  model?: string;
  fallbackModels?: string[];
  timeoutMs?: number;
}) {
  const primaryModel = params.model || 'gemini-3.1-flash-lite';
  const defaultFallback =
    primaryModel === 'gemini-3.5-transcribe'
      ? ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash']
      : ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

  const modelChain = [
    primaryModel,
    ...(params.fallbackModels || defaultFallback),
  ].filter((m, index, self) => index === self.findIndex((o) => o === m));

  const timeoutMs = params.timeoutMs || 90000; // Generous 90s default to prevent false timeouts

  let lastError: any = null;
  let quotaError: any = null;

  for (const modelName of modelChain) {
    const maxRetries = 2; // Retry on transient errors

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // gemini-3.5-transcribe rejects developer instruction (systemInstruction) with 400 INVALID_ARGUMENT
        let sanitizedConfig = params.config ? { ...params.config } : undefined;
        if (modelName === 'gemini-3.5-transcribe' && sanitizedConfig) {
          delete sanitizedConfig.systemInstruction;
        }

        const callPromise = ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: sanitizedConfig,
        });

        let timer: any;
        const timeoutPromise = new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`Timeout after ${timeoutMs}ms on model ${modelName}`)),
            timeoutMs
          );
        });

        try {
          const response = (await Promise.race([callPromise, timeoutPromise])) as any;
          clearTimeout(timer);
          return response;
        } finally {
          clearTimeout(timer);
        }
      } catch (err: any) {
        lastError = err;
        const isQuota =
          err?.status === 429 ||
          String(err?.message).includes('429') ||
          String(err?.message).toLowerCase().includes('quota') ||
          String(err?.message).toLowerCase().includes('resource_exhausted');
        if (isQuota) {
          quotaError = err;
        }

        const is503 =
          err?.status === 503 ||
          String(err?.message).includes('503') ||
          String(err?.message).toLowerCase().includes('high demand') ||
          String(err?.message).toLowerCase().includes('service unavailable');

        if ((is503 || isQuota) && attempt < maxRetries) {
          const backoff = 1500 * Math.pow(2, attempt - 1) + Math.random() * 500;
          console.log(
            `[AI Engine] Model ${modelName} received ${is503 ? '503 (high demand)' : '429 (rate limit)'}, retrying in ${Math.round(backoff)}ms (attempt ${attempt}/${maxRetries})...`
          );
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }

        console.log(
          `[AI Engine] Model ${modelName} attempt ${attempt} failed (${err?.status || err?.message || 'unknown'}), checking candidate chain...`
        );
        break; // Proceed to next candidate model
      }
    }
  }

  // If quota was exhausted across all attempts, prioritize throwing it so client gets clear guidance
  if (quotaError) {
    throw quotaError;
  }
  throw lastError;
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Proxy endpoint for official Umm Al-Qura prayer times (Buraidah & Saudi cities)
app.get('/api/prayer-times', async (req, res) => {
  try {
    const lat = req.query.latitude || '26.3260';
    const lng = req.query.longitude || '43.9750';
    const method = req.query.method || '4';

    const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=${method}`;
    const apiRes = await fetch(url, { headers: { Accept: 'application/json' } });
    if (apiRes.ok) {
      const data = await apiRes.json();
      return res.json(data);
    }
    res.status(apiRes.status).json({ error: 'Failed to fetch prayer times from upstream API' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Server error fetching prayer times' });
  }
});

// AI Academic Tutor Chat Route
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, courseTitle, bookTitle, history, extractedContext, college, gender } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'الرجاء إدخال السؤال أو الاستفسار.' });
    }

    const isOtherMajor = college === 'تخصص آخر';
    const isFemale = gender !== 'ذكر';
    const genderInstruction = isFemale
      ? `قواعد التخاطب الإلزامية: خاطب المتعلم بصيغة المؤنث حصراً: "يا طالبة العلم"، واستخدم أفعال وصيغ المؤنث: (تدرسين، راجعي، استذكري، أحسنتِ بارك الله فيكِ). يُمنع منعاً باتاً مخاطبتها بصيغة المذكر.`
      : `قواعد التخاطب الإلزامية: خاطب المتعلم بصيغة المذكر حصراً: "يا طالب العلم"، واستخدم أفعال وصيغ المذكر: (تدرس، راجع، استذكر، أحسنتَ بارك الله فيكَ). يُمنع منعاً باتاً مخاطبته بصيغة المؤنث.`;

    const systemInstruction = isOtherMajor
      ? `
أنت "مساعد سَبيل الأكاديمي الذكي" (لتخصصات العلوم العامة والأدبية والعلمية وإدارة الأعمال والحاسب والطب وغيرها).
${genderInstruction}

توجيهك ومنهجك الإلزامي:
1. الدور الأكاديمي العام والتقيد بالنص:
   - تعمل كمساعد دراسي ذكي يساعد في استذكار المقررات الجامعية بكل كفاءة ووضوح.
   - ركّز على: تلخيص المحاضرات، شرح المفاهيم العلمية والأدبية والإدارية والتقنية، تنظيم خطط المذاكرة، وتوليد أسئلة مراجعة للمقررات.
   - اسم المقرر (${courseTitle || 'المقرر'}) هو مجرد تسمية تعريفية للعرض فقط؛ لا تفترض أي كتب خارجية لم تُرفق نصوصها.
   - تقيد بنسبة 100% بالنصوص المرفقة أدناه إن وُجدت.

2. الأسلوب:
   - التزم باللغة العربية الفصحى الواضحة والأسلوب الأكاديمي المنظم.
   - رتّب الإجابات في نقاط وعناوين واضحة تسهل الفهم والمراجعة.

${courseTitle ? `المقرر الحالي (للعرض فقط): ${courseTitle}` : ''}
${bookTitle ? `المستند المرفق: ${bookTitle}` : ''}
${extractedContext ? `\nالمحتوى المرجعي المصرح به من ملفات المقرر:\n"""\n${extractedContext}\n"""` : ''}
`
      : `
أنت "مساعد سَبيل العلمي والشرعي المؤصل" (مخصص لطلبة وطالبات تخصصي الشريعة والقانون/الأنظمة).
${genderInstruction}

ضوابط منهجية وأكاديمية حاسمة:
1. التقيّد التام بالنصوص المرفقة وعدم اختلاق المراجع:
   - اسم المقرر (مثل: "${courseTitle || 'المقرر'}") هو مجرد تسمية تعريفية للعرض فقط.
   - يُمنع منعاً باتاً ومطلقاً افتراض أو استدعاء أي كتب أو متون خارجية (مثل: روضة الناظر، أو الروض المربع، أو زاد المستقنع، أو غيرها) بناءً على مجرد تشابه اسم المقرر، ما لم يكن الكتاب مرفقاً صراحة في النصوص المرجعية أدناه.
   - إذا تم تزويدك بمحتوى مرجعي مستخرج من صفحات الكتاب أو المحاضرة، يجب أن تكون إجابتك مقيدة ومستندة بنسبة 100% إلى هذا المحتوى المرفق فقط دون زيادة أو اختلاق.
   - إذا لم يكن الموضوع مذكوراً في النص المرفق، وضحي ذلك بأمانة علمية: "لم يرد بيان هذه المسألة في صفحات المقرر المرفقة".

2. مسار الشريعة والقانون المؤصل والأدب العلمي:
   - تركز في إجاباتك على: الفقه، أصول الفقه، القواعد الفقهية، والأنظمة المقارنة.
   - التزم بالأدب العلمي الرصين، واللغة العربية الفصحى، وترتيب الإجابة في نقاط واضحة ومؤصلة.
   - لا تختلق أرقام صفحات أو نصوص أو مواد نظامية غير صحيحة مطلقاً.

3. التنبيه الإلزامي:
   - اختم إجابتك دائماً بتنبيه واضح بأن هذه الإجابات للمساعدة الدراسية والاسترشاد العلمي فقط وليست فتوى شرعية.

${courseTitle ? `المقرر الحالي (للعرض فقط): ${courseTitle}` : ''}
${bookTitle ? `الكتاب/المصدر المرفق: ${bookTitle}` : ''}
${extractedContext ? `\nالمحتوى المرجعي المستخرج من ملفات المقرر المعتمدة حصراً:\n"""\n${extractedContext}\n"""` : ''}
`;

    const contents: any[] = [];

    // Append prior conversational history if provided
    if (Array.isArray(history) && history.length > 0) {
      for (const turn of history.slice(-6)) {
        contents.push({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.content }],
        });
      }
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [
        {
          text: `سؤال الطالب: ${message}`,
        },
      ],
    });

    const response = await generateGeminiContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.3, // Lower temperature for faithful academic grounding
      },
    });

    const reply = response.text || 'عذرًا، لم أتمكن من استخلاص الإجابة في الوقت الحالي. يرجى إعادة المحاولة.';
    res.json({ reply });
  } catch (error: any) {
    const formatted = formatGeminiError(error, 'Chat');
    res.status(formatted.status >= 400 && formatted.status < 600 ? formatted.status : 500).json({
      error: formatted.error,
      errorCode: formatted.status,
      details: formatted.details,
      isQuota: formatted.isQuota,
    });
  }
});

// AI Audio/Video Transcription & Strict Lecture Summarization Route
app.post('/api/gemini/transcribe-and-summarize', async (req, res) => {
  try {
    const {
      audioBase64,
      mimeType,
      existingTranscript,
      lectureTitle,
      courseTitle,
      summaryMode = 'quick',
      gender,
    } = req.body;

    let transcriptText = existingTranscript ? String(existingTranscript).trim() : '';

    // Step 1: Transcribe audio/video strictly verbatim if audioBase64 is provided
    if (audioBase64 && !transcriptText) {
      let rawBase64 = String(audioBase64).trim();
      // Strip any data URI prefix (e.g. data:audio/mp3;base64, or data:audio/mp4;base64,)
      if (rawBase64.includes(';base64,')) {
        rawBase64 = rawBase64.split(';base64,')[1];
      } else if (rawBase64.includes(',')) {
        rawBase64 = rawBase64.split(',')[1];
      }

      let cleanMimeType = (mimeType || 'audio/mp3').split(';')[0].trim().toLowerCase();
      if (cleanMimeType === 'audio/x-m4a' || cleanMimeType === 'audio/m4a') {
        cleanMimeType = 'audio/mp4';
      } else if (cleanMimeType === 'audio/mpeg') {
        cleanMimeType = 'audio/mp3';
      } else if (cleanMimeType === 'audio/x-wav' || cleanMimeType === 'audio/wave') {
        cleanMimeType = 'audio/wav';
      } else if (cleanMimeType === 'video/quicktime') {
        cleanMimeType = 'video/mp4';
      } else if (!cleanMimeType || cleanMimeType === 'application/octet-stream') {
        cleanMimeType = 'audio/mp3';
      }

      const mediaPart = {
        inlineData: {
          mimeType: cleanMimeType,
          data: rawBase64,
        },
      };

      const isVideo = cleanMimeType.startsWith('video/');

      const transcribePrompt = `فرّغ هذا التسجيل (${isVideo ? 'فيديو' : 'صوت'} المحاضرة الشرعية) إلى نص عربي فصيح ودقيق ومطابق حرفياً لكلام المحاضر، مع كتابة المصطلحات الفقهية والآيات القرآنية والأحاديث النبوية وأسماء العلماء بدقة وإملاء سليم، وبأمانة علمية تامة دون اختصار أو زيادة.`;

      try {
        const transRes = await generateGeminiContent({
          model: 'gemini-3.5-transcribe',
          fallbackModels: ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'],
          contents: [mediaPart, transcribePrompt],
          timeoutMs: 120000,
          config: {
            temperature: 0.0,
          },
        });
        transcriptText = (transRes?.text || transRes?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
      } catch (transErr: any) {
        console.error('[Transcription] Error during speech recognition:', transErr?.message || transErr);
        const formatted = formatGeminiError(transErr, 'Transcription');
        return res.status(formatted.status >= 400 && formatted.status < 600 ? formatted.status : 500).json({
          error: formatted.isQuota
            ? 'تم الوصول إلى الحد المؤقت لطلبات الذكاء الاصطناعي (Quota Limit)، يرجى الانتظار دقيقة واحدة ثم إعادة المحاولة.'
            : formatted.error || 'تعذر تفريغ المقطع الصوتي في الوقت الحالي. التسجيل محفوظ، يرجى المحاولة مجدداً.',
          errorCode: formatted.status,
          isQuota: formatted.isQuota,
          details: formatted.details,
        });
      }
    }

    if (
      !transcriptText ||
      transcriptText.includes('[لا يوجد كلام مسموع في التسجيل]') ||
      transcriptText.length < 3
    ) {
      const fallbackTopic = lectureTitle
        ? `محاضرة: ${lectureTitle}${courseTitle ? ` (${courseTitle})` : ''}`
        : 'لم يتم رصد كلام مسموع وواضح في التسجيل.';
      return res.json({
        transcript: 'لم يتم رصد كلام مسموع وواضح في التسجيل المرفق (يرجى التأكد من وضوح الصوت أو التحدث بالقرب من الميكروفون).',
        summaryMode: summaryMode || 'quick',
        summary: {
          mainTopics: [fallbackTopic, 'لم يرد كلام مسموع كافٍ في التسجيل لاستخلاص محاور تفصيلية.'],
          scientificIssues: ['لم تُذكر مسائل علمية أو فقهية مسموعة في هذا التسجيل.'],
          benefitsAndRules: ['لم ترد فوائد أو ضوابط مسموعة في هذا التسجيل.'],
        },
      });
    }

    // Step 2: Summarize strictly from the verbatim transcript with selectable mode (Quick vs Deep)
    const isDeep = summaryMode === 'deep';
    const modePrompt = isDeep
      ? 'نوع التلخيص المطلوب: [تلخيص عميق وشامل]\n- استخرج تفصيلياً كل مسألة وفائدة وحكم وضابط علمي أو فقهي أو أكاديمي ذكره المحاضر.\n- فصّل وبسط النقاط واذكر الأدلة والتعليلات والفروع المذكورة في النص دون اختصار مخل، مع التقيد بنسبة 100% بكلام المحاضر فقط.'
      : 'نوع التلخيص المطلوب: [تلخيص سريع ومكثف]\n- استخلص أبرز النقاط الجوهرية واللباب المركز وخلاصة المحاضرة في نقاط واضحة ومباشرة ومركزة دون إسهاب.';

    const isFemale = gender !== 'ذكر';
    const genderNote = isFemale
      ? 'خاطب الطالبة بصيغة المؤنث (يا طالبة العلم، راجعي، تدرسين).'
      : 'خاطب الطالب بصيغة المذكر (يا طالب العلم، راجع، تدرس).';

    const summaryPrompt = `بناءً على النص المفرغ التالي لكلام المحاضر فقط، قم بتلخيص ما ورد فيه دون أي اختلاق أو زيادة كلام غير موجود في النص نهائياً (No Hallucination).
إذا لم يذكر المحاضر مسألة فقهية أو ضابطاً في كلامه، اذكر بوضوح أنه "لم يرد في كلام المحاضر" ولا تختلق أي معلومات من خارج النص.

${modePrompt}
${genderNote}

النص المفرغ لكلام المحاضر:
"""
${transcriptText}
"""

قسّم التلخيص إلى الأقسام الثلاثة التالية حصراً:
1) أبرز المحاور (mainTopics)
2) المسائل العلمية والفقهية المذكورة (scientificIssues)
3) الفوائد والضوابط المستنبطة (benefitsAndRules)`;

    let parsedSummary = {
      mainTopics: [] as string[],
      scientificIssues: [] as string[],
      benefitsAndRules: [] as string[],
    };

    try {
      const summaryRes = await generateGeminiContent({
        model: 'gemini-3.1-flash-lite',
        fallbackModels: ['gemini-3.8-flash', 'gemini-flash-latest'],
        contents: summaryPrompt,
        config: {
          systemInstruction:
            'أنت مساعد علمي أمين ودقيق. التزم التزاماً حرفياً وتاماً بما ورد في نص كلام المحاضر فقط. يُمنع منعاً باتاً إضافة أو اختلاق أي معلومة أو مسألة أو فائدة لم ينطق بها المحاضر في النص المرفق.',
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mainTopics: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'أبرز المحاور التي تحدث عنها المحاضر في النص فقط',
              },
              scientificIssues: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'المسائل العلمية والفقهية المذكورة في كلام المحاضر فقط',
              },
              benefitsAndRules: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'الفوائد والضوابط المستنبطة مما ذكره المحاضر في النص فقط',
              },
            },
            required: ['mainTopics', 'scientificIssues', 'benefitsAndRules'],
          },
        },
      });

      const rawText = (summaryRes.text || '{}')
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      parsedSummary = JSON.parse(rawText);
    } catch {
      parsedSummary = {
        mainTopics: [transcriptText],
        scientificIssues: ['حسب ما ورد في النص المفرغ أعلاه.'],
        benefitsAndRules: ['حسب ما ورد في النص المفرغ أعلاه.'],
      };
    }

    res.json({
      transcript: transcriptText,
      summary: {
        mainTopics:
          Array.isArray(parsedSummary.mainTopics) && parsedSummary.mainTopics.length > 0
            ? parsedSummary.mainTopics
            : ['لم ترد محاور إضافية غير ما ذُكر في النص المفرغ.'],
        scientificIssues:
          Array.isArray(parsedSummary.scientificIssues) && parsedSummary.scientificIssues.length > 0
            ? parsedSummary.scientificIssues
            : ['لم تُذكر مسائل علمية أو فقهية محددة في هذا المقطع.'],
        benefitsAndRules:
          Array.isArray(parsedSummary.benefitsAndRules) && parsedSummary.benefitsAndRules.length > 0
            ? parsedSummary.benefitsAndRules
            : ['لم ترد فوائد أو ضوابط إضافية في هذا المقطع.'],
      },
    });
  } catch (error: any) {
    console.error('Gemini Transcribe & Summarize Error:', error);
    res.json({
      transcript: 'تم حفظ التسجيل بنجاح، وتعذر استخراج النص الصوتي تلقائياً لحجم الملف أو صيغته.',
      summary: {
        mainTopics: ['تم حفظ ملف المحاضرة بنجاح ويمكنك الاستماع إليه أو إعادة طلب التلخيص.'],
        scientificIssues: ['اضغط على زر إعادة التفريغ والتلخيص لاستخراج المسائل العلمية.'],
        benefitsAndRules: ['اضغط على زر إعادة التفريغ والتلخيص لاستخراج الفوائد والضوابط.'],
      },
    });
  }
});

// AI Book / Document Summary Route (Triggered after attaching a PDF book or lecture file)
app.post('/api/gemini/summarize-book', async (req, res) => {
  try {
    const {
      pdfBase64,
      mimeType,
      fileName,
      courseTitle,
      textContent,
      extractedText,
      pageImageBase64,
      summaryType = 'balanced',
      scope = 'all',
      startPage,
      endPage,
      gender,
    } = req.body;

    const cleanText = (textContent || extractedText || '').trim();
    const hasEnoughText = cleanText.length >= 20;

    if (!hasEnoughText && !pageImageBase64) {
      return res.status(400).json({
        error:
          'عذراً، لم يتم العثور على نص مقروء كافٍ أو صورة للصفحة لإعداد التلخيص (قد تكون الصفحة فارغة). يُرجى اختيار صفحة تحتوي على محتوى علمي.',
      });
    }

    let depthInstruction = '';
    if (summaryType === 'comprehensive') {
      depthInstruction = `نوع التلخيص المطلوب: [شامل وتفصيلي]
- استقصاء دقيق لكافة المحاور الواردة دون إغفال أي جزئية علمية.
- استعراض مفصل لكل مسألة علمية أو فقهية أو نظامية وردت في النص.
- سرد شامل للفوائد والضوابط والقواعد المذكورة حصراً في النص المرفق.`;
    } else if (summaryType === 'brief') {
      depthInstruction = `نوع التلخيص المطلوب: [موجز سريع]
- تقديم تلخيص مكثف ومباشر يركز على لب الموضوع وخلاصته المذكورة في النص المرفق.
- نقاط سريعة وعالية الأهمية بدون إسهاب أو تفريعات جانبية.`;
    } else {
      depthInstruction = `نوع التلخيص المطلوب: [متوسط ومركّز]
- عرض متوازن وواضح لأهم المحاور والمسائل والفوائد الواردة حصراً في النص المرفق.`;
    }

    let scopeInstruction = '';
    let scopeLabel = 'كامل الكتاب / الملف';
    if (scope === 'range' && startPage && endPage) {
      scopeInstruction = `نطاق التلخيص الإلزامي:
يقتصر التلخيص حصراً على الصفحات من صفحة [${startPage}] إلى صفحة [${endPage}] فقط. يُمنع منعاً باتاً تلخيص أو استعراض أي صفحات خارج هذا النطاق المحدد.`;
      scopeLabel = `من صفحة ${startPage} إلى ${endPage}`;
    }

    let contentsInput: any;
    let systemInstructionText =
      '«أنت مقيد بنسبة 100% بالنص المرفق فقط من الكتاب. يُمنع منعاً باتاً استدعاء أي معلومة أو سؤال أو صياغة تلخيص من خارج هذا النص تحديداً».';

    const summarySchema = {
      type: Type.OBJECT,
      properties: {
        executiveSummary: {
          type: Type.STRING,
          description: 'نبذة جامعة ومكثفة عن خلاصة التلخيص ومضمونه من النص فقط',
        },
        mainTopics: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'أبرز المحاور والأبواب الرئيسية في النص المرفق فقط',
        },
        scientificIssues: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'أهم المسائل العلمية أو الفقهية أو النظامية الواردة في النص المرفق فقط',
        },
        benefitsAndRules: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'الفوائد والضوابط والقواعد المذكورة في النص المرفق فقط',
        },
      },
      required: ['mainTopics', 'scientificIssues', 'benefitsAndRules'],
    };

    let parsedSummary = {
      executiveSummary: '',
      mainTopics: [] as string[],
      scientificIssues: [] as string[],
      benefitsAndRules: [] as string[],
    };

    // Check if chunking is needed for Full Book / Large ranges (15-20 pages / > 15,000 chars)
    const CHUNK_LIMIT = 20000;
    const isLargeBook = hasEnoughText && (cleanText.length > CHUNK_LIMIT || scope === 'all');

    if (isLargeBook) {
      console.log(`[Summarize] Processing large full book content (${cleanText.length} chars) in sequential 15-20 page chunks...`);
      // Split by page markers "[صفحة " or double newlines into sequential chunks
      const rawChunks: string[] = [];
      const pageSections = cleanText.split(/(?=\[صفحة\s+\d+\])/g);
      let currentChunk = '';

      for (const section of pageSections) {
        if ((currentChunk + section).length > CHUNK_LIMIT && currentChunk.length > 0) {
          rawChunks.push(currentChunk.trim());
          currentChunk = section;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + section;
        }
      }
      if (currentChunk.trim()) {
        rawChunks.push(currentChunk.trim());
      }

      // Process key sections across the book concurrently (up to 3 representative chunks)
      const activeChunks = rawChunks.slice(0, 3);
      const chunkPromises = activeChunks.map(async (chunk, i) => {
        try {
          const chunkPrompt = `تعليمات صارمة وإلزامية (Strict Context Grounding):
«أنت مقيد بنسبة 100% بالنص المرفق فقط من الكتاب. يُمنع منعاً باتاً استدعاء أي معلومة أو سؤال أو صياغة تلخيص من خارج هذا النص تحديداً».
الجزء (${i + 1} من ${activeChunks.length}) من كتاب (${fileName || courseTitle}):
${depthInstruction}

النص المرفق لهذا الجزء من صفحات الكتاب:
"""
${chunk}
"""

لخص هذا الجزء بدقة مع استخراج:
1) executiveSummary: نبذة مختصرة عن هذا الجزء
2) mainTopics: المحاور الرئيسية الواردة
3) scientificIssues: المسائل العلمية أو الفقهية المذكورة
4) benefitsAndRules: الضوابط والقواعد المستنبطة
أرجع النتيجة بصيغة JSON حصراً.`;

          const chunkRes = await generateGeminiContent({
            model: 'gemini-3.8-flash',
            contents: chunkPrompt,
            timeoutMs: 60000,
            config: {
              systemInstruction: systemInstructionText,
              temperature: 0.1,
              responseMimeType: 'application/json',
              responseSchema: summarySchema,
            },
          });

          const rawChunkText = (chunkRes.text || '{}')
            .replace(/^```json\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();
          return JSON.parse(rawChunkText);
        } catch (cErr) {
          console.error(`Error summarizing chunk ${i + 1}:`, cErr);
          return null;
        }
      });

      const settled = await Promise.all(chunkPromises);
      const partialSummaries = settled.filter(Boolean);

      // Synthesize combined summary from partial summaries following the table of contents
      if (partialSummaries.length > 0) {
        const synthesisPrompt = `أنت أستاذ أكاديمي متخصص. أمامك ملخصات أجزاء وفصول كامل كتاب (${fileName || courseTitle}) لمقرر (${courseTitle || 'المقرر الدراسي'}).
المطلوب: دمج خلاصات الأجزاء في تلخيص نهائي موحد، جامع، ومنسق ومرتب وفق فهرس وأبواب الكتاب، يركز على أبرز القواعد والمحاور الكلية دون تكرار أو فقدان للمسائل الجوهرية:

ملخصات الأجزاء المستخرجة:
${JSON.stringify(partialSummaries, null, 2)}

المطلوب إرجاعه كـ JSON حصراً مع الحقول:
1. executiveSummary: نبذة جامعة ومكثفة وشاملة عن مضمون الكتاب بالكامل.
2. mainTopics: مصفوفة الأبواب والمحاور الرئيسية مرتبة حسب تسلسل الكتاب.
3. scientificIssues: مصفوفة المسائل العلمية والفقهية والمنهجية الأساسية المحررة في الكتاب.
4. benefitsAndRules: مصفوفة الفوائد والقواعد والضوابط الكلية المستفادة من عموم الكتاب.`;

        try {
          const synthRes = await generateGeminiContent({
            model: 'gemini-3.8-flash',
            contents: synthesisPrompt,
            config: {
              systemInstruction: 'أنت أستاذ أكاديمي خبير. قم بدمج وتنسيق الخلاصات بأمانة علمية تامة دون إضافة أي معلومات خارجية.',
              temperature: 0.1,
              responseMimeType: 'application/json',
              responseSchema: summarySchema,
            },
          });

          const synthRaw = (synthRes.text || '{}')
            .replace(/^```json\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();
          parsedSummary = JSON.parse(synthRaw);
        } catch (synthErr) {
          console.error('Synthesis error, falling back to manual merge:', synthErr);
          parsedSummary = {
            executiveSummary: partialSummaries.map((p) => p.executiveSummary).filter(Boolean).join(' '),
            mainTopics: Array.from(new Set(partialSummaries.flatMap((p) => p.mainTopics || []))),
            scientificIssues: Array.from(new Set(partialSummaries.flatMap((p) => p.scientificIssues || []))),
            benefitsAndRules: Array.from(new Set(partialSummaries.flatMap((p) => p.benefitsAndRules || []))),
          };
        }
      }
    } else {
      // Standard single-shot summarization (under chunk limit or single page / scanned image)
      let contentsInput: any;
      if (hasEnoughText) {
        contentsInput = `تعليمات صارمة وإلزامية (Strict Context Grounding):
«أنت مقيد بنسبة 100% بالنص المرفق فقط من الكتاب. يُمنع منعاً باتاً استدعاء أي معلومة أو سؤال أو صياغة تلخيص من خارج هذا النص تحديداً».
يُمنع منعاً باتاً جلب أي شروحات أو أمثلة أو معلومات خارجية لم ترد في النص المرفق أدناه، ويقتصر التلخيص بالكامل وحصراً على نصوص صفحات الكتاب المرفقة أدناه فقط.

${depthInstruction}
${scopeInstruction}

قم بقراءة وتلخيص صفحات الكتاب المرفقة (${fileName || 'الكتاب المرفق'}) لمقرر (${courseTitle || 'المقرر الدراسي'}) تلخيصاً علمياً وأكاديمياً مستمداً حصراً وبنسبة 100% مما ورد في النص التالي:

النص المستخرج الفعلي من صفحات الكتاب:
"""
${cleanText}
"""

قسّم التلخيص إلى:
1) نبذة جامعة (executiveSummary)
2) أبرز المحاور (mainTopics)
3) المسائل العلمية والفقهية المذكورة (scientificIssues)
4) الفوائد والضوابط المستنبطة (benefitsAndRules)
أرجع النتيجة بصيغة JSON حصراً.`;
      } else {
        // Scanned Page Multimodal Vision Fallback
        contentsInput = {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: pageImageBase64.replace(/^data:image\/\w+;base64,/, ''),
              },
            },
            {
              text: `تعليمات صارمة وإلزامية (Strict Context Grounding):
«لخص ما تراه في هذه الصفحة من الكتاب بدقة علمية، ولا تأتِ بمعلومات من خارجها».
«أنت مقيد بنسبة 100% بالنص والمحتوى الظاهر في صورة هذه الصفحة المرفقة فقط. يُمنع منعاً باتاً استدعاء أي معلومة أو صياغة تلخيص من خارج ما تراه في هذه الصفحة تحديداً».

${depthInstruction}
${scopeInstruction}

قم بقراءة وتلخيص محتوى هذه الصفحة من الكتاب المرفق (${fileName || 'الكتاب المرفق'}) لمقرر (${courseTitle || 'المقرر الدراسي'}) تلخيصاً علمياً وأكاديمياً مستمداً حصراً وبنسبة 100% مما هو مكتوب ومطبوع في صورة هذه الصفحة فقط.

قسّم التلخيص إلى:
1) نبذة جامعة (executiveSummary)
2) أبرز المحاور (mainTopics)
3) المسائل العلمية والفقهية المذكورة (scientificIssues)
4) الفوائد والضوابط المستنبطة (benefitsAndRules)
أرجع النتيجة بتنسيق JSON حصراً.`,
            },
          ],
        };
      }

      const summaryConfig: any = {
        systemInstruction: systemInstructionText,
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: summarySchema,
      };

      const summaryRes = await generateGeminiContent({
        model: 'gemini-3.8-flash',
        contents: contentsInput,
        config: summaryConfig,
      });

      try {
        const rawText = (summaryRes.text || '{}')
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        parsedSummary = JSON.parse(rawText);
      } catch {
        parsedSummary = {
          executiveSummary: `خلاصة تلخيص ${scopeLabel} لكتاب ${fileName || courseTitle}`,
          mainTopics: [`ملخص كتاب: ${fileName || courseTitle}`],
          scientificIssues: ['تم استخلاص المسائل الواردة بالنص المرفق فقط.'],
          benefitsAndRules: ['تم استخلاص الفوائد الواردة بالنص المرفق فقط.'],
        };
      }
    }

    res.json({
      summary: {
        summaryType,
        scopeLabel,
        executiveSummary: parsedSummary.executiveSummary || undefined,
        mainTopics:
          Array.isArray(parsedSummary.mainTopics) && parsedSummary.mainTopics.length > 0
            ? parsedSummary.mainTopics
            : [`محاور مستخلصة من النص المرفق`],
        scientificIssues:
          Array.isArray(parsedSummary.scientificIssues) && parsedSummary.scientificIssues.length > 0
            ? parsedSummary.scientificIssues
            : ['المسائل المقررة في النص المرفق.'],
        benefitsAndRules:
          Array.isArray(parsedSummary.benefitsAndRules) && parsedSummary.benefitsAndRules.length > 0
            ? parsedSummary.benefitsAndRules
            : ['الفوائد والضوابط المستخلصة من النص المرفق.'],
      },
    });
  } catch (error: any) {
    const formatted = formatGeminiError(error, 'Summarize-Book');
    res.status(formatted.status >= 400 && formatted.status < 600 ? formatted.status : 500).json({
      error: formatted.error,
      errorCode: formatted.status,
      details: formatted.details,
      isQuota: formatted.isQuota,
    });
  }
});

// AI Schedule Image / PDF Parser Route (Extracts lectures and distributes them across days of the week)
app.post('/api/gemini/parse-schedule', async (req, res) => {
  try {
    const { fileBase64, mimeType, isShariaMajor } = req.body;

    if (!fileBase64) {
      return res.status(400).json({ error: 'يرجى إرفاق صورة أو ملف الجدول الدراسي.' });
    }

    const cleanMime = (mimeType || 'image/png').split(';')[0].trim();

    const prompt = `اقرأ صورة أو ملف الجدول الدراسي الجامعي المرفق بعناية فائقة، واستخرج جميع المحاضرات والمقررات الدراسية الواردة فيه ووزّعها بدقة على أيام الأسبوع الدراسية (الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس).

ملاحظات هامة جداً لقراءة الجداول الجامعية (مثل جدول جامعة القصيم ونظام البانر):
1. قد تكون الأيام مكتوبة بالعربية (الأحد، الاثنين، الثلاثاء، الأربعاء، الخميس) أو بالرموز (ح، ن، ث، ر، خ) أو بالإنجليزية (Sun, Mon, Tue, Wed, Thu / U, M, T, W, R).
2. إذا كانت المحاضرة تتكرر في أكثر من يوم في الأسبوع (مثلاً الأحد والثلاثاء)، قم بإنشاء عنصر مستقل لكل يوم حتى تتوزع المحاضرات بشكل صحيح في جدول كل يوم.
3. استخرج:
   - day: اليوم الدراسي ويجب أن يكون واحداً من هذه القيم الخمس حصراً: "الأحد" أو "الإثنين" أو "الثلاثاء" أو "الأربعاء" أو "الخميس".
   - title: اسم المقرر الدراسي بوضوح.
   - courseCode: رمز المقرر أو رقم الشعبة (إن وجد، أو اتركه مختصراً).
   - time: وقت المحاضرة من البداية إلى النهاية (مثال: "08:00 ص - 09:30 ص").
   - location: رقم القاعة أو المبنى أو الكلية (إن وجد، أو اكتب "قاعة المحاضرات").
   - instructor: اسم دكتور أو أستاذ المقرر (إن وجد، أو اكتب "أستاذ المقرر").`;

    const response = await generateGeminiContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: fileBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        systemInstruction:
          'أنت محلل جداول دراسية جامعية دقيق جداً. مهمتك استخراج كافة المحاضرات من صورة أو ملف الجدول الدراسي وتوزيعها على أيام الأسبوع (الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس) بدقة تامة.',
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: {
                type: Type.STRING,
                description: 'اليوم الدراسي: الأحد | الإثنين | الثلاثاء | الأربعاء | الخميس',
              },
              title: {
                type: Type.STRING,
                description: 'اسم المقرر الدراسي',
              },
              courseCode: {
                type: Type.STRING,
                description: 'رمز المقرر أو رقم الشعبة',
              },
              time: {
                type: Type.STRING,
                description: 'وقت المحاضرة مثل 08:00 ص - 09:40 ص',
              },
              location: {
                type: Type.STRING,
                description: 'القاعة أو المبنى',
              },
              instructor: {
                type: Type.STRING,
                description: 'اسم المحاضر أو الدكتور',
              },
            },
            required: ['day', 'title', 'time'],
          },
        },
      },
    });

    const rawText = (response.text || '[]')
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const parsedItems = JSON.parse(rawText);

    const validDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'] as const;
    const normalizeDay = (d: string): (typeof validDays)[number] => {
      const s = String(d || '').trim();
      if (s.includes('أحد') || s.includes('احد') || s === 'ح' || /sun/i.test(s)) return 'الأحد';
      if (s.includes('إثنين') || s.includes('اثنين') || s === 'ن' || /mon/i.test(s)) return 'الإثنين';
      if (s.includes('ثلاثاء') || s === 'ث' || /tue/i.test(s)) return 'الثلاثاء';
      if (s.includes('أربعاء') || s.includes('اربعاء') || s === 'ر' || /wed/i.test(s)) return 'الأربعاء';
      if (s.includes('خميس') || s === 'خ' || /thu/i.test(s)) return 'الخميس';
      return 'الأحد';
    };

    const normalizedSchedule = (Array.isArray(parsedItems) ? parsedItems : []).map(
      (item: any, idx: number) => ({
        id: `sch_ai_${Date.now()}_${idx}`,
        day: normalizeDay(item.day),
        title: String(item.title || (isShariaMajor ? 'مقرر دراسي' : 'محاضرة جامعية')).trim(),
        courseCode: String(item.courseCode || '').trim(),
        time: String(item.time || '08:00 ص - 09:30 ص').trim(),
        location: String(item.location || 'قاعة المحاضرات').trim(),
        instructor: String(item.instructor || '').trim(),
        type: 'محاضرة' as const,
      })
    );

    res.json({ items: normalizedSchedule });
  } catch (error: any) {
    const formatted = formatGeminiError(error, 'Parse-Schedule');
    res.status(formatted.status >= 400 && formatted.status < 600 ? formatted.status : 500).json({
      error: formatted.error,
      errorCode: formatted.status,
      details: formatted.details,
      isQuota: formatted.isQuota,
    });
  }
});

// AI Lesson Summary Route
app.post('/api/gemini/summarize', async (req, res) => {
  try {
    const { topicTitle, contentText } = req.body;

    if (!topicTitle && !contentText) {
      return res.status(400).json({ error: 'الرجاء تزويد المساعد بعنوان الدرس أو النص المراد تلخيصه.' });
    }

    const prompt = `
قم بإعداد ملخص أكاديمي منهجي ودقيق للنص التالي دون اختلاق أو زيادة معلومات غير موجودة:
عنوان الدرس: ${topicTitle || 'درس أكاديمي'}
النص:
${contentText || ''}

صغ التلخيص بالهيكلية التالية:
1. أبرز المحاور
2. المسائل العلمية والفقهية المذكورة
3. الفوائد والضوابط المستنبطة
`;

    const response = await generateGeminiContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'أنت أستاذ أكاديمي متخصص في تلخيص العلوم الشرعية بأمانة علمية تامة دون اختلاق أو زيادة على النص المرفق.',
        temperature: 0.1,
      },
    });

    res.json({
      reply: response?.text || 'تم التلخيص بنجاح.',
      summary: response?.text || 'تم التلخيص بنجاح.',
    });
  } catch (error: any) {
    const formatted = formatGeminiError(error, 'Summarize');
    res.status(formatted.status >= 400 && formatted.status < 600 ? formatted.status : 500).json({
      error: formatted.error,
      errorCode: formatted.status,
      details: formatted.details,
      isQuota: formatted.isQuota,
    });
  }
});

// AI Revision Quiz Generator (Strictly grounded in attached Book or Lecture, varied, on-demand)
app.post('/api/gemini/generate-questions', async (req, res) => {
  try {
    const {
      courseName,
      quizMode = 'mixed',
      sourceText = '',
      pageImageBase64,
      pdfBase64,
      pdfMimeType,
      previousQuestions = [],
      count = 5,
      gender,
    } = req.body;

    const cleanSource = (sourceText || '').trim();
    const hasActualExtracts = cleanSource.length >= 20;

    const isFemale = gender !== 'ذكر';
    const genderInstruction = isFemale
      ? 'خاطب الطالبة في الشروحات والتعليلات بصيغة المؤنث حصراً: ("يا طالبة العلم"، "راجعي"، "تدرسين"، "أحسنتِ بارك الله فيكِ"). جميع الأفعال والضمائر والخطاب يجب أن تكون مؤنثة تماماً.'
      : 'خاطب الطالب في الشروحات والتعليلات بصيغة المذكر حصراً: ("يا طالب العلم"، "راجع"، "تدرس"، "أحسنتَ بارك الله فيكَ"). جميع الأفعال والضمائر والخطاب يجب أن تكون مذكرة تماماً.';

    const modeDescription =
      quizMode === 'deep'
        ? 'نوّع الأسئلة بين: (1) أسئلة تحليلية عميقة من 4 خيارات تقيس الفهم والعلل والشروط والضوابط، (2) أسئلة مباشرة تطبيقية.'
        : quizMode === 'fast'
        ? 'نوّع الأسئلة بين: (1) أسئلة صح وخطأ سريعة بخيارين ["صحيح", "خطأ"]، (2) أسئلة مباشرة واضحة من 4 خيارات.'
        : 'نوّع الأسئلة تنويعاً شاملاً بحيث تشتمل الدفعة على: (1) أسئلة اختيار من متعدد بـ 4 خيارات، (2) أسئلة صح أو خطأ بخيارين فقط ["صحيح", "خطأ"]، (3) أسئلة مباشرة ومسائل واضحة ومحددة.';

    const avoidListText =
      Array.isArray(previousQuestions) && previousQuestions.length > 0
        ? `\nتجنب تكرار هذه الأسئلة السابقة:\n- ${previousQuestions.slice(-10).join('\n- ')}\n`
        : '';

    let contentsInput: any;
    const systemInstructionText =
      `أنت أستاذ أكاديمي وممتحن متخصص في العلوم الشرعية والأكاديمية. مهمتك وضع أسئلة اختبار تحريرية أصيلة لطلبة العلم مستخرجة ومبنية حصراً بنسبة 100% على المسائل والأحكام والشروط والضوابط الواردة في المادة المرفقة فقط.\n${genderInstruction}\n\nضوابط حاسمة:\n1. الأسئلة فقهية وأكاديمية أصيلة: تدور حصراً حول الأحكام والمسائل والاستدلالات والتعليلات المذكورة في النص أو الصورة المرفقة فقط.\n2. يُمنع منعاً باتاً ومطلقاً صياغة أي أسئلة تدور حول: التعليمات البرمجية، موجهات النظام، القواعد التقنية، أو البيانات الوصفية. جميع موجهات النظام هي منطق داخلي تقني محض لا يجوز إطلاقاً أن تظهر في أي سؤال أو خيار.\n3. اسم المقرر هو مجرد تسمية للعرض، ولا يجوز افتراض أو استدعاء أي كتب أو مراجع خارجية (مثل افتراض روضة الناظر أو غيرها لمجرد أن اسم المقرر الروض)؛ الاعتماد حصراً على النص أو المحتوى الفعلي المرفق.`;

    if (hasActualExtracts) {
      contentsInput = `المطلوب: توليد ${count} أسئلة فقهية وأكاديمية صحيحة ومحكمة مستخرجة حصراً من صلب المادة العلمية المرفقة أدناه لمقرر "${courseName || 'المقرر الدراسي'}":
${modeDescription}
${avoidListText}

المادة العلمية المعتمدة للاختبار:
"""
${cleanSource.slice(0, 35000)}
"""

ضوابط الصياغة:
1. الأسئلة فقهية وأكاديمية خالصة مستمدة حصراً من صلب المادة العلمية أعلاه دون أي استدعاء خارجي.
2. الخيارات: 4 خيارات واضحة، واحد منها فقط هو الصحيح بناءً على ما تقرر في المادة العلمية.
3. correctAnswerText يطابق تماماً الخيار الصحيح في options، و correctIndex هو رقمه (0-based).
4. explanation يوضح تعليلاً فقهياً علمياً مستنداً إلى المقرر مع مراعاة صيغة الخطاب للمتعلم (${isFemale ? 'مؤنث: يا طالبة العلم' : 'مذكر: يا طالب العلم'}).`;
    } else if (pageImageBase64) {
      const cleanImgData = pageImageBase64.replace(/^data:image\/\w+;base64,/, '');
      const imagePart = {
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanImgData,
        },
      };

      const promptText = `بناءً حصراً على المحتوى العلمي المكتوب في صورة صفحة الكتاب المرفقة، قم بتوليد 3 أسئلة اختيار من متعدد مع 4 خيارات وتحديد الإجابة الصحيحة وشرح مقتضب مستند تماماً إلى ما هو مكتوب في صفحة الكتاب المرفقة فقط، وتجنب توليد أي سؤال من خارج الصفحة، مع مراعاة صيغة الخطاب (${isFemale ? 'مؤنث: يا طالبة العلم' : 'مذكر: يا طالب العلم'})، وأرجع النتيجة بتنسيق JSON حصراً.

تنسيق JSON المطلوب:
[
  {
    "id": "q1",
    "questionType": "اختيار من متعدد",
    "category": "${courseName || 'من صفحة الكتاب'}",
    "question": "نص السؤال الدقيق من صلب الصفحة المرفقة",
    "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
    "correctAnswerText": "الخيار الصحيح",
    "correctIndex": 0,
    "explanation": "شرح مقتضب ومستند تماماً إلى نص صفحة الكتاب المرفقة"
  }
]`;

      contentsInput = {
        parts: [imagePart, { text: promptText }],
      };
    } else {
      contentsInput = `المطلوب: توليد ${count} أسئلة اختبار أكاديمية دقيقة لمقرر "${courseName || 'المقرر الدراسي'}" تراعي المنهج الأكاديمي وضوابط الصياغة المحكمة:
${modeDescription}
${avoidListText}

ضوابط الصياغة:
1. أسئلة أكاديمية محكمة تناسب طالب العلم.
2. الخيارات: 4 خيارات واضحة، واحد منها فقط هو الصحيح.
3. correctAnswerText يطابق الخيار الصحيح في options، و correctIndex هو رقمه (0-based).
4. explanation يوضح التعليل العلمي بأسلوب تأصيلي مع مخاطبة المتعلم بصيغة (${isFemale ? 'المؤنث: يا طالبة العلم' : 'المذكر: يا طالب العلم'}).`;
    }

    const quizResponseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          questionType: {
            type: Type.STRING,
            description: 'نوع السؤال: اختيار من متعدد',
          },
          category: {
            type: Type.STRING,
            description: 'اسم المبحث أو المحور من المحتوى المرفق فقط',
          },
          question: {
            type: Type.STRING,
            description: 'نص السؤال بصياغة واضحة ومباشرة مستمدة حصراً من المحتوى المرفق',
          },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '4 خيارات واضحة، واحد منها فقط هو الصحيح بناءً على النص أو الصورة المرفقة',
          },
          correctAnswerText: {
            type: Type.STRING,
            description: 'النص الحرفي للخيار الصحيح من options',
          },
          correctIndex: {
            type: Type.INTEGER,
            description: 'رقم الفهرس الصحيح في مصفوفة options يبدأ من 0',
          },
          explanation: {
            type: Type.STRING,
            description: 'شرح مقتضب وتعليل علمي مستند تماماً إلى نص الكتاب المرفق',
          },
        },
        required: [
          'id',
          'questionType',
          'category',
          'question',
          'options',
          'correctAnswerText',
          'correctIndex',
          'explanation',
        ],
      },
    };

    const quizConfig: any = {
      systemInstruction: systemInstructionText,
      responseMimeType: 'application/json',
      temperature: 0.1,
      responseSchema: quizResponseSchema,
    };

    const response = await generateGeminiContent({
      model: 'gemini-3.1-flash-lite',
      fallbackModels: ['gemini-3.8-flash', 'gemini-flash-latest'],
      contents: contentsInput,
      config: quizConfig,
    });

    let rawQuestions: any[] = [];
    if (response && response.text) {
      const rawText = response.text.trim();
      let parsedData: any = null;
      try {
        const cleanedJson = rawText
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        parsedData = JSON.parse(cleanedJson);
      } catch (parseErr) {
        const firstBracket = rawText.indexOf('[');
        const lastBracket = rawText.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket > firstBracket) {
          try {
            parsedData = JSON.parse(rawText.substring(firstBracket, lastBracket + 1));
          } catch (innerErr) {}
        }
        if (!parsedData) {
          const firstBrace = rawText.indexOf('{');
          const lastBrace = rawText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            try {
              parsedData = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
            } catch (innerErr) {}
          }
        }
      }

      if (Array.isArray(parsedData)) {
        rawQuestions = parsedData;
      } else if (parsedData && Array.isArray(parsedData.questions)) {
        rawQuestions = parsedData.questions;
      } else if (parsedData && Array.isArray(parsedData.items)) {
        rawQuestions = parsedData.items;
      } else if (parsedData && Array.isArray(parsedData.data)) {
        rawQuestions = parsedData.data;
      } else if (parsedData && typeof parsedData === 'object' && parsedData.question) {
        rawQuestions = [parsedData];
      }
    }

    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      return res.status(422).json({
        error:
          'لم يتمكن النظام من صياغة أسئلة من محتوى هذه الصفحة. يرجى التأكد من وضوح الصفحة أو اختيار صفحة أخرى تحتوي على مسائل علمية.',
      });
    }

    const isMetaQuestion = (text: string) => {
      const metaRegex =
        /(strict|grounding|system\s*instruction|system\s*prompt|metadata|توجيهات النظام|الذكاء الاصطناعي|ملف pdf|حجم الملف|بكسل|توكن|رمز برمجي|موجه النظام|تعليمات برمجية|prompt|الموجه|تعليمات|النظام البرمجي|نموذج الذكاء|قواعد تقنية|شروط النظام|ضوابط النظام)/i;
      return metaRegex.test(text);
    };

    const cleanRawQuestions = (Array.isArray(rawQuestions) ? rawQuestions : []).filter((q: any) => {
      const qText = String(q.question || '');
      const expText = String(q.explanation || '');
      const catText = String(q.category || '');
      const optsText = Array.isArray(q.options) ? q.options.join(' ') : '';
      return (
        !isMetaQuestion(qText) &&
        !isMetaQuestion(expText) &&
        !isMetaQuestion(catText) &&
        !isMetaQuestion(optsText)
      );
    });

    const verifiedQuestions = cleanRawQuestions.map(
      (q: any, idx: number) => {
        const opts: string[] =
          Array.isArray(q.options) && q.options.length >= 2
            ? q.options.map((o: any) => String(o).trim())
            : ['صحيح', 'خطأ'];

        let verifiedIdx = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
        if (q.correctAnswerText) {
          const exactMatch = opts.findIndex(
            (opt) => opt === String(q.correctAnswerText).trim()
          );
          if (exactMatch !== -1) {
            verifiedIdx = exactMatch;
          } else {
            const partialMatch = opts.findIndex(
              (opt) =>
                opt.includes(String(q.correctAnswerText).trim()) ||
                String(q.correctAnswerText).trim().includes(opt)
            );
            if (partialMatch !== -1) {
              verifiedIdx = partialMatch;
            }
          }
        }
        if (verifiedIdx < 0 || verifiedIdx >= opts.length) {
          verifiedIdx = 0;
        }

        return {
          id: q.id || `gen_q_${Date.now()}_${idx}`,
          questionType: q.questionType || (opts.length === 2 ? 'صح أو خطأ' : 'اختيار من متعدد'),
          category: q.category || courseName || 'من المحتوى المرفق',
          question: String(q.question || '').trim(),
          options: opts,
          correctAnswerText: opts[verifiedIdx] || String(q.correctAnswerText || opts[0]),
          correctIndex: verifiedIdx,
          explanation: String(q.explanation || 'مستخرج من صلب صفحة الكتاب المرفقة.').trim(),
        };
      }
    );

    res.json({ questions: verifiedQuestions });
  } catch (error: any) {
    const formatted = formatGeminiError(error, 'Generate-Questions');
    res.status(formatted.status >= 400 && formatted.status < 600 ? formatted.status : 500).json({
      error: formatted.error,
      errorCode: formatted.status,
      details: formatted.details,
      isQuota: formatted.isQuota,
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`بوابة طلاب العلم خادم يعمل بنجاح على المنفذ: ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('فشل بدء الخادم:', err);
});
