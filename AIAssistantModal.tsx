import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Bot, User, Copy, Check, AlertTriangle, Info } from 'lucide-react';
import { ChatMessage, UserCollege } from '../types';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  college?: UserCollege;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  initialQuery,
  college = 'كلية الشريعة',
}) => {
  const isOtherMajor = college === 'تخصص آخر';

  const getWelcomeMessage = (otherMajor: boolean): ChatMessage => {
    if (otherMajor) {
      return {
        id: 'msg_welcome',
        sender: 'assistant',
        text: 'السلام عليكم ورحمة الله وبركاته، أهلاً بكِ في مساعد سَبيل الأكاديمي الذكي.\nأسعد بمساعدتكِ في تلخيص المحاضرات، شرح المفاهيم العلمية والأدبية، تنظيم المذاكرة، وإعداد أسئلة المراجعة لمقرراتكِ الجامعية.',
        timestamp: 'الآن',
      };
    }
    return {
      id: 'msg_welcome',
      sender: 'assistant',
      text: 'السلام عليكم ورحمة الله وبركاته، أهلاً بكِ في مساعد سَبيل العلمي والشرعي المؤصل (لتخصصات الشريعة والقانون/الأنظمة).\nأركز على الفقه، أصول الفقه، القواعد الفقهية، المقاصد، والأنظمة المقارنة بالأحكام الشرعية، مع الاستناد حصراً للمراجع المعتمدة (الدرر السنية، المكتبة الشاملة، فتاوى وشروحات ابن باز وابن عثيمين رحمهما الله).',
      timestamp: 'الآن',
      sources: ['الدرر السنية', 'المكتبة الشاملة', 'فتاوى وشروحات ابن باز وابن عثيمين'],
    };
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => [getWelcomeMessage(isOtherMajor)]);

  // Update welcome message when major switches
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'msg_welcome') {
        return [getWelcomeMessage(isOtherMajor)];
      }
      return prev.map((m) => (m.id === 'msg_welcome' ? getWelcomeMessage(isOtherMajor) : m));
    });
  }, [isOtherMajor]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && initialQuery) {
      setInputMessage(initialQuery);
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  if (!isOpen) return null;

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInputMessage('');
    setIsLoading(true);

    let userGender = 'أنثى';
    try {
      const stored = localStorage.getItem('sabeel_current_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.gender) userGender = u.gender;
      }
    } catch {}

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          college,
          gender: userGender,
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
        console.warn(`[AIAssistantModal] Server error ${res.status}:`, data || errorMsg);
        const assistantMessage: ChatMessage = {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: errorMsg,
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        return;
      }

      const assistantMessage: ChatMessage = {
        id: `a_${Date.now()}`,
        sender: 'assistant',
        text: data.reply || (isOtherMajor ? 'تمت الإجابة وتلخيص المطلوب.' : 'تمت الإجابة وفق المنهج الشرعي المعتمد.'),
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errMsg = `[خطأ اتصال بالشبكة] ${err?.message || 'تعذر الوصول إلى الخادم، يرجى التحقق من اتصال الشبكة والمحاولة مجدداً.'}`;
      console.warn('[AIAssistantModal] Network/Fetch error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: errMsg,
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const suggestions = isOtherMajor
    ? [
        'لخّص لي خطوات المذاكرة الفعالة وتنظيم الوقت قبل الاختبارات',
        'اشرح لي هذا المفهوم الأكاديمي بأسلوب مبسط في نقاط',
        'أنشئ لي 5 أسئلة مراجعة (اختيار من متعدد) حول موضوع محاضرتي',
      ]
    : [
        'ما هو الفرق بين الواجب العيني والواجب الكفائي؟',
        'اشرح لي أركان العقد وشروط صحته بين الفقه والنظام.',
        'ما هو ضابط القاعدة الفقهية (اليقين لا يزول بالشك) وتطبيقاتها؟',
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs animate-fade-in text-right">
      <div className="relative w-full max-w-2xl bg-[#fdfdfc] rounded-3xl shadow-2xl border border-[#2e493b]/15 overflow-hidden flex flex-col h-[650px] max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#2e493b] text-white p-5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                {isOtherMajor
                  ? 'مساعد سَبيل الأكاديمي الذكي'
                  : 'مساعد سَبيل العلمي والشرعي المؤصل'}
              </h3>
              <p className="text-[11px] text-emerald-100/85">
                {isOtherMajor
                  ? 'تلخيص المحاضرات · شرح المفاهيم · تنظيم المذاكرة · أسئلة مراجعة'
                  : 'الشريعة والقانون · الدرر السنية · المكتبة الشاملة · ابن باز وابن عثيمين'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-100" />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#faf9f6]">
          {messages.map((m) => {
            const isMe = m.sender === 'user';
            return (
              <React.Fragment key={m.id}>
                <div
                  className={`flex gap-3 max-w-xl ${isMe ? 'mr-auto flex-row-reverse text-left' : 'ml-auto text-right'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isMe
                        ? 'bg-stone-700 text-white'
                        : m.id.startsWith('err_')
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-[#2e493b] text-white shadow-2xs'
                    }`}
                  >
                    {isMe ? (
                      <User className="w-4 h-4" />
                    ) : m.id.startsWith('err_') ? (
                      <AlertTriangle className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-2xs ${
                        isMe
                          ? 'bg-[#2e493b] text-white rounded-tl-xs'
                          : m.id.startsWith('err_')
                          ? 'bg-rose-50/95 text-rose-950 border-2 border-rose-300 rounded-tr-xs font-sans text-xs sm:text-sm'
                          : 'bg-white text-stone-900 border border-stone-200/80 rounded-tr-xs font-amiri text-base'
                      }`}
                    >
                      {m.id.startsWith('err_') && (
                        <div className="flex items-center gap-1.5 font-bold text-rose-800 mb-2 pb-1.5 border-b border-rose-200 text-xs">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>تنبيه حالة الاتصال بسيرفر الذكاء الاصطناعي</span>
                        </div>
                      )}
                      {m.text}
                    </div>

                    <div className="flex items-center justify-between px-1 text-[10px] text-stone-400">
                      <span>{m.timestamp}</span>
                      {!isMe && (
                        <div className="flex items-center gap-2">
                          <span className={m.id.startsWith('err_') ? 'text-rose-700 font-semibold' : 'text-emerald-800 font-semibold'}>
                            {m.id.startsWith('err_')
                              ? 'يرجى مراجعة رمز ورسالة الخطأ أعلاه'
                              : isOtherMajor
                              ? 'للمساعدة الأكاديمية والاستذكار الدراسي'
                              : 'للاستذكار والمساعدة العلمية فقط · لستُ من أهل الفتوى ولا يُعتمد عليّ فيها'}
                          </span>
                          <button
                            onClick={() => handleCopy(m.id, m.text)}
                            className="hover:text-stone-700 flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedId === m.id ? 'تم النسخ' : 'نسخ'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* تنبيه إخلاء مسؤولية ثابت وواضح حسب التخصص مباشرة بعد العبارة الترحيبية */}
                {m.id === 'msg_welcome' && (
                  isOtherMajor ? (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 text-[#20352a] text-xs leading-relaxed shadow-2xs flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-[#2e493b] shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold">
                          تنبيه أكاديمي: هذا المساعد الذكي مخصص للمساعدة في الاستذكار، تلخيص المحاضرات، وشرح المفاهيم الدراسية بشكل مبسط، ويُنصح دائماً بمراجعة المقرر المعتمد من أستاذ المادة.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/95 border border-amber-300/90 text-amber-950 text-xs leading-relaxed shadow-2xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold">
                          تنبيه: هذا المساعد يعمل بالذكاء الاصطناعي للمساعدة الدراسية والاسترشاد فقط، وليس من أهل الفتوى ولا يُعتمد على إجاباته كفتوى شرعية أو مرجع نهائي. يجب الرجوع في الفتاوى والأحكام إلى العلماء المعتمدين والمصادر الموثوقة.
                        </p>
                      </div>
                    </div>
                  )
                )}
              </React.Fragment>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 max-w-sm ml-auto text-right animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-[#2e493b] text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="p-3.5 bg-white rounded-2xl border border-stone-200/80 text-xs text-stone-600">
                {isOtherMajor ? 'جاري إعداد الشرح الأكاديمي...' : 'جاري إعداد الجواب المؤصل...'}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions Strip */}
        <div className="px-4 py-2 bg-stone-100/70 border-t border-stone-200/70 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-bold text-stone-500 whitespace-nowrap">مقترحات:</span>
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(s)}
              disabled={isLoading}
              className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-stone-700 hover:text-[#2e493b] border border-stone-200 rounded-lg text-[11px] whitespace-nowrap transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 sm:p-4 bg-white border-t border-stone-200/80">
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
              placeholder="اكتب سؤالك أو استفسارك هنا..."
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:bg-white focus:border-[#2e493b] focus:outline-none transition-all placeholder:text-stone-400"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="p-2.5 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-40"
              title="إرسال"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
