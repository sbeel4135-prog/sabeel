import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Send,
  Sparkles,
  BookOpen,
  FileText,
  RotateCcw,
  CheckCircle2,
  Copy,
  Check,
  HelpCircle,
  BookmarkCheck,
  Bot,
  User,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';
import { ChatMessage } from '../../types';

const STUDY_DESK_IMG = '/src/assets/images/academic_study_desk_1791754882068.jpg';

export const AIAssistantView: React.FC = () => {
  const { courses, files, showToast } = useApp();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'assistant',
      text: 'السلام عليكم ورحمة الله وبركاته، أهلاً بك في المساعد العلمي الذكي لمنصة سَبيل.\nإجاباتي الشرعية والعلمية مؤصلة ومستندة حصراً إلى المراجع المعتمدة لدى أهل السنة والجماعة: موقع الدرر السنية (الموسوعة العقدية والحديثية والفقهية)، المكتبة الشاملة، وفتاوى وشروحات الشيخ ابن باز والشيخ ابن عثيمين رحمهما الله، مع الالتزام بالأدب العلمي وعزو الأقوال إلى مصادرها.',
      timestamp: 'الآن',
      sources: ['موقع الدرر السنية', 'المكتبة الشاملة', 'فتاوى وشروحات ابن باز وابن عثيمين'],
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedFileId, setSelectedFileId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputMessage;
    if (!promptToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      sender: 'user',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInputMessage('');
    setIsLoading(true);

    try {
      // Find selected course and file contexts
      const selectedCourse = courses.find((c) => c.id === selectedCourseId);
      const selectedFile = files.find((f) => f.id === selectedFileId);

      // Prepare context for backend proxy
      const extractedContext = selectedFile?.previewText
        ? `[اسم الملف: ${selectedFile.title}]\n${selectedFile.previewText}`
        : selectedCourse
        ? `[المقرر المستهدف: ${selectedCourse.title} - ${selectedCourse.description}]`
        : '';

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptToSend,
          courseTitle: selectedCourse?.title,
          bookTitle: selectedFile?.title,
          extractedContext,
          history: messages.map((m) => ({ role: m.sender, content: m.text })),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.reply) {
        const errorMsg =
          data?.error ||
          (data?.details
            ? `[خطأ ${res.status}] ${data.details}`
            : `[خطأ ${res.status}] لم يتم استلام رد من خادم الذكاء الاصطناعي.`);
        console.warn(`[AIAssistantView] Server error ${res.status}:`, data || errorMsg);
        const errorMessage: ChatMessage = {
          id: `msg_err_${Date.now()}`,
          sender: 'assistant',
          text: errorMsg,
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMessage]);
        showToast(errorMsg, 'error');
        return;
      }

      const assistantMessage: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'تمت الإجابة بناءً على القواعد المعتمدة.',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        sources: selectedFile ? [selectedFile.title] : selectedCourse ? [selectedCourse.title] : ['المقررات الشرعية المعتمدة'],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errMsg = `[خطأ اتصال بالشبكة] ${err?.message || 'تعذر الاتصال بالخادم، يرجى التحقق من اتصال الشبكة.'}`;
      console.warn('[AIAssistantView] Network error:', err);
      const errorMessage: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'assistant',
        text: errMsg,
        timestamp: 'الآن',
      };
      setMessages((prev) => [...prev, errorMessage]);
      showToast(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('تم نسخ الإجابة إلى الحافظة', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Quick scholarly prompts
  const quickPrompts = [
    {
      title: 'شرح أركان القياس',
      prompt: 'اشرح لي أركان القياس الأربعة وشروطه بإيجاز مع ضرب مثال فقهي واضح من كتاب روضة الناظر.',
    },
    {
      title: 'مسألة من الروض المربع',
      prompt: 'ما هو ضابط الماء الطهور والماء الطاهر والنجس في كتاب الروض المربع بشرح زاد المستقنع؟',
    },
    {
      title: 'الفرق بين العيني والكفائي',
      prompt: 'وضح الفرق بين الواجب العيني والواجب الكفائي مع التمثيل لكل منهما من مسائل الفقه.',
    },
    {
      title: 'أحكام بيع المرابحة',
      prompt: 'ما هي شروط وضوابط بيع المرابحة للآمر بالشراء في المعاملات المالية المعاصرة؟',
    },
  ];

  return (
    <div className="space-y-6 text-right">
      {/* Header and Reference Source Selection Bar */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-800 font-semibold">
              المساعد الأكاديمي المعتمد في المتون الشرعية
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900">
            المساعد الدراسي الذكي (Gemini 3.8 Flash)
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            محاور شرعي رصين يلتزم بالنصوص المرفقة ولا يختلق أرقام صفحات أو مراجع وهمية
          </p>
        </div>

        {/* Filters for Grounding Context */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-0.5">
              تحديد المقرر المرجعي:
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                setSelectedFileId('all');
              }}
              className="py-1.5 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#14532d]"
            >
              <option value="all">جميع المقررات العامة</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-0.5">
              تحديد كتاب / ملف مرجعي:
            </label>
            <select
              value={selectedFileId}
              onChange={(e) => setSelectedFileId(e.target.value)}
              className="py-1.5 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#14532d]"
            >
              <option value="all">جميع ملفات ومصادر المقرر</option>
              {files
                .filter((f) => selectedCourseId === 'all' || f.courseId === selectedCourseId)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs flex flex-col h-[650px] overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-stone-50/40">
          {messages.map((m) => {
            const isMe = m.sender === 'user';
            return (
              <React.Fragment key={m.id}>
                <div
                  className={`flex gap-3 max-w-3xl ${isMe ? 'mr-auto flex-row-reverse text-left' : 'ml-auto text-right'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isMe
                        ? 'bg-stone-800 text-white'
                        : m.id.startsWith('msg_err_')
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-[#14532d] text-emerald-100 shadow-xs'
                    }`}
                  >
                    {isMe ? (
                      <User className="w-5 h-5" />
                    ) : m.id.startsWith('msg_err_') ? (
                      <AlertTriangle className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div className="space-y-1.5 flex-1">
                    <div
                      className={`p-4 sm:p-5 rounded-2xl text-sm leading-relaxed whitespace-pre-line shadow-xs ${
                        isMe
                          ? 'bg-[#14532d] text-white rounded-tl-xs'
                          : m.id.startsWith('msg_err_')
                          ? 'bg-rose-50/95 text-rose-950 border-2 border-rose-300 rounded-tr-xs font-sans text-sm'
                          : 'bg-white text-stone-900 border border-stone-200/90 rounded-tr-xs font-amiri text-base sm:text-lg'
                      }`}
                    >
                      {m.id.startsWith('msg_err_') && (
                        <div className="flex items-center gap-1.5 font-bold text-rose-800 mb-2 pb-1.5 border-b border-rose-200 text-xs">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>تنبيه حالة الاتصال بسيرفر الذكاء الاصطناعي</span>
                        </div>
                      )}
                      {m.text}
                    </div>

                    {/* Metadata and Citations footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-stone-400">
                      <div className="flex items-center gap-3">
                        <span>{m.timestamp}</span>

                        {m.sources && m.sources.length > 0 && !m.id.startsWith('msg_err_') && (
                          <span className="flex items-center gap-1 text-emerald-800 font-sans">
                            <BookmarkCheck className="w-3.5 h-3.5" />
                            <span>عزو معتمد: {m.sources.join('، ')}</span>
                          </span>
                        )}
                      </div>

                      {!isMe && (
                        <div className="flex items-center gap-3">
                          <span className={m.id.startsWith('msg_err_') ? 'text-rose-700 font-semibold' : 'text-emerald-800 font-semibold'}>
                            {m.id.startsWith('msg_err_')
                              ? 'يرجى مراجعة رمز وتفاصيل الخطأ أعلاه'
                              : 'للاستذكار والمساعدة العلمية فقط · لستُ من أهل الفتوى ولا يُعتمد عليّ فيها'}
                          </span>
                          <button
                            onClick={() => handleCopyMessage(m.id, m.text)}
                            className="hover:text-stone-700 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            {copiedId === m.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedId === m.id ? 'تم النسخ' : 'نسخ'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* تنبيه إخلاء مسؤولية ثابت وواضح مباشرة بعد العبارة الترحيبية */}
                {m.id === 'msg_welcome' && (
                  <div className="p-4 rounded-2xl bg-amber-50/95 border border-amber-300/90 text-amber-950 text-xs sm:text-sm leading-relaxed shadow-2xs space-y-1">
                    <p className="font-semibold">
                      تنبيه: هذا المساعد يعمل بالذكاء الاصطناعي للمساعدة الدراسية والاسترشاد فقط، وليس من أهل الفتوى ولا يُعتمد على إجاباته كفتوى شرعية أو مرجع نهائي. يجب الرجوع في الفتاوى والأحكام إلى العلماء المعتمدين والمصادر الموثوقة.
                    </p>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-md ml-auto text-right animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-[#14532d] text-emerald-100 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-4 bg-white rounded-2xl border border-stone-200 text-xs text-stone-600 flex items-center gap-2">
                <span>جاري استقراء المتون الشرعية وإعداد الجواب المؤصل...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Prompts Strip */}
        <div className="px-4 py-2.5 bg-stone-100/70 border-t border-stone-200/80 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-stone-500 whitespace-nowrap flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
            أسئلة نموذجية:
          </span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp.prompt)}
              disabled={isLoading}
              className="px-3 py-1 bg-white hover:bg-emerald-50 text-stone-700 hover:text-[#14532d] border border-stone-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
            >
              {qp.title}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-stone-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="اكتب مسألتك أو استفسارك هنا (مثال: ما معنى الاستصحاب عند الأصوليين؟)..."
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-stone-50 border border-stone-200 rounded-2xl text-sm text-stone-900 focus:bg-white focus:border-[#14532d] focus:outline-none transition-all placeholder:text-stone-400"
            />

            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="p-3 bg-[#14532d] hover:bg-[#166534] text-white rounded-2xl shadow-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="إرسال"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-[11px] text-stone-400 text-center mt-2">
            مبني وفق نموذج Gemini 3.8 Flash مع عزو حصري للمقررات الأكاديمية ونصوص التراث المعتمدة.
          </p>
        </div>
      </div>
    </div>
  );
};
