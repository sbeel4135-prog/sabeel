import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Lock,
  GraduationCap,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  KeyRound,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { User, UserCollege, SecurityQuestions } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  notice?: string;
}

interface StoredLocalAccount {
  id: string;
  username: string;
  password: string;
  fullName: string;
  college: UserCollege;
  gender: 'ذكر' | 'أنثى';
  securityQuestions?: SecurityQuestions;
  createdAt: string;
}

const ACCOUNTS_STORAGE_KEY = 'sabeel_accounts_registry';

export function getLocalAccounts(): StoredLocalAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalAccounts(accounts: StoredLocalAccount[]) {
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error(e);
  }
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  notice,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>('login');

  // Login & Register Form fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'ذكر' | 'أنثى'>('أنثى');
  const [college, setCollege] = useState<UserCollege>('تخصص آخر');

  // 5 Security Questions fields for Sign Up
  const [qFullName, setQFullName] = useState('');
  const [qBirthYear, setQBirthYear] = useState('');
  const [qCity, setQCity] = useState('');
  const [qRoleModel, setQRoleModel] = useState('');
  const [qFavoriteBook, setQFavoriteBook] = useState('');

  // Password Reset flow fields
  const [resetUsername, setResetUsername] = useState('');
  const [resetQFullName, setResetQFullName] = useState('');
  const [resetQBirthYear, setResetQBirthYear] = useState('');
  const [resetQCity, setResetQCity] = useState('');
  const [resetQRoleModel, setResetQRoleModel] = useState('');
  const [resetQFavoriteBook, setResetQFavoriteBook] = useState('');
  const [isResetVerified, setIsResetVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const resetAllFormStates = () => {
    setErrorMessage('');
    setResetSuccessMessage('');
    setIsResetVerified(false);
  };

  const switchMode = (newMode: 'login' | 'register' | 'forgot_password') => {
    setMode(newMode);
    resetAllFormStates();
  };

  // Helper for case-insensitive, trimmed comparison
  const normalize = (str: any) => String(str || '').trim().toLowerCase();

  // Handle Login & Register submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMessage('الرجاء إدخال اسم المستخدم وكلمة المرور.');
      return;
    }

    if (mode === 'register') {
      if (!fullName.trim()) {
        setErrorMessage('الرجاء إدخال الاسم الكامل.');
        return;
      }
      if (
        !qFullName.trim() ||
        !qBirthYear.trim() ||
        !qCity.trim() ||
        !qRoleModel.trim() ||
        !qFavoriteBook.trim()
      ) {
        setErrorMessage('الرجاء الإجابة على جميع الأسئلة السرية الخمسة لحماية حسابك.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const localAccounts = getLocalAccounts();
      const existingIdx = localAccounts.findIndex(
        (acc) => acc.username.toLowerCase() === cleanUsername.toLowerCase()
      );

      if (mode === 'register') {
        if (existingIdx !== -1) {
          setErrorMessage('اسم المستخدم هذا مسجل مسبقاً، الرجاء اختيار اسم آخر أو تسجيل الدخول.');
          setIsLoading(false);
          return;
        }

        const secQuestions: SecurityQuestions = {
          fullName: qFullName.trim(),
          birthYear: qBirthYear.trim(),
          city: qCity.trim(),
          roleModel: qRoleModel.trim(),
          favoriteBookOrSubject: qFavoriteBook.trim(),
        };

        let newUserId = `usr_${cleanUsername.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

        // Attempt server-side sync
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: cleanUsername,
              password: cleanPassword,
              fullName: fullName.trim(),
              gender,
              college,
              securityQuestions: secQuestions,
            }),
          });
          const data = await res.json();
          if (res.ok && data.user?.id) {
            newUserId = data.user.id;
          }
        } catch {
          // Local storage is primary
        }

        const newAccount: StoredLocalAccount = {
          id: newUserId,
          username: cleanUsername,
          password: cleanPassword,
          fullName: fullName.trim(),
          gender,
          college,
          securityQuestions: secQuestions,
          createdAt: new Date().toISOString(),
        };

        localAccounts.push(newAccount);
        saveLocalAccounts(localAccounts);

        const userObj: User = {
          id: newAccount.id,
          username: newAccount.username,
          fullName: newAccount.fullName,
          gender: newAccount.gender,
          college: newAccount.college,
          securityQuestions: newAccount.securityQuestions,
          createdAt: newAccount.createdAt,
        };

        localStorage.setItem('sabeel_current_user', JSON.stringify(userObj));
        onSuccess(userObj);
        onClose();
      } else {
        // Mode: Login
        if (existingIdx !== -1) {
          const matched = localAccounts[existingIdx];
          if (matched.password !== cleanPassword) {
            setErrorMessage('كلمة المرور غير صحيحة، يرجى التأكد وإعادة المحاولة.');
            setIsLoading(false);
            return;
          }

          const userObj: User = {
            id: matched.id,
            username: matched.username,
            fullName: matched.fullName || matched.username,
            gender: matched.gender || 'أنثى',
            college: matched.college,
            securityQuestions: matched.securityQuestions,
            createdAt: matched.createdAt,
          };

          localStorage.setItem('sabeel_current_user', JSON.stringify(userObj));
          onSuccess(userObj);
          onClose();
          return;
        }

        // Check server for credentials
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
          });
          const data = await res.json();
          if (res.ok && data.user) {
            const syncedAccount: StoredLocalAccount = {
              id: data.user.id,
              username: data.user.username,
              password: cleanPassword,
              fullName: data.user.fullName || data.user.username,
              gender: data.user.gender || 'أنثى',
              college: data.user.college,
              securityQuestions: data.user.securityQuestions,
              createdAt: data.user.createdAt || new Date().toISOString(),
            };
            localAccounts.push(syncedAccount);
            saveLocalAccounts(localAccounts);

            const userObj: User = {
              id: syncedAccount.id,
              username: syncedAccount.username,
              fullName: syncedAccount.fullName,
              gender: syncedAccount.gender,
              college: syncedAccount.college,
              securityQuestions: syncedAccount.securityQuestions,
              createdAt: syncedAccount.createdAt,
            };
            localStorage.setItem('sabeel_current_user', JSON.stringify(userObj));
            onSuccess(userObj);
            onClose();
            return;
          } else if (data.error) {
            setErrorMessage(data.error);
            setIsLoading(false);
            return;
          }
        } catch {
          // ignore
        }

        setErrorMessage('اسم المستخدم غير مسجل، يمكنك إنشاء حساب جديد بكل سهولة.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('حدث خطأ غير متوقع، يرجى إعادة المحاولة.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1 of Password Reset: Verify the 5 security questions
  const handleVerifySecurityQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanUsername = resetUsername.trim();
    if (!cleanUsername) {
      setErrorMessage('الرجاء إدخال اسم المستخدم.');
      return;
    }

    if (
      !resetQFullName.trim() ||
      !resetQBirthYear.trim() ||
      !resetQCity.trim() ||
      !resetQRoleModel.trim() ||
      !resetQFavoriteBook.trim()
    ) {
      setErrorMessage('الرجاء تعبئة إجابات جميع الأسئلة الخمسة.');
      return;
    }

    setIsLoading(true);

    try {
      const localAccounts = getLocalAccounts();
      const matched = localAccounts.find(
        (a) => a.username.toLowerCase() === cleanUsername.toLowerCase()
      );

      if (matched && matched.securityQuestions) {
        const sq = matched.securityQuestions;
        const m1 = normalize(resetQFullName) === normalize(sq.fullName);
        const m2 = normalize(resetQBirthYear) === normalize(sq.birthYear);
        const m3 = normalize(resetQCity) === normalize(sq.city);
        const m4 = normalize(resetQRoleModel) === normalize(sq.roleModel);
        const m5 = normalize(resetQFavoriteBook) === normalize(sq.favoriteBookOrSubject);

        if (m1 && m2 && m3 && m4 && m5) {
          setIsResetVerified(true);
          setErrorMessage('');
          setIsLoading(false);
          return;
        }
      }

      // Check on server if not matched locally
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: cleanUsername,
            answers: {
              fullName: resetQFullName.trim(),
              birthYear: resetQBirthYear.trim(),
              city: resetQCity.trim(),
              roleModel: resetQRoleModel.trim(),
              favoriteBookOrSubject: resetQFavoriteBook.trim(),
            },
            newPassword: 'temp_check_only_verify_intent_123',
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setIsResetVerified(true);
          setIsLoading(false);
          return;
        }
      } catch {}

      setErrorMessage('إجابات الأسئلة السرية غير متطابقة مع البيانات المسجلة. يرجى التحقق وإعادة المحاولة.');
    } catch (err) {
      console.error(err);
      setErrorMessage('حدث خطأ أثناء التحقق.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 of Password Reset: Set new password and log in
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanNewPass = newPassword.trim();
    if (!cleanNewPass || cleanNewPass.length < 3) {
      setErrorMessage('الرجاء إدخال كلمة مرور جديدة لا تقل عن 3 أحرف.');
      return;
    }

    setIsLoading(true);

    try {
      const cleanUsername = resetUsername.trim();
      const localAccounts = getLocalAccounts();
      const targetIdx = localAccounts.findIndex(
        (a) => a.username.toLowerCase() === cleanUsername.toLowerCase()
      );

      let targetUser: StoredLocalAccount | null = null;
      if (targetIdx !== -1) {
        localAccounts[targetIdx].password = cleanNewPass;
        saveLocalAccounts(localAccounts);
        targetUser = localAccounts[targetIdx];
      }

      // Sync with server
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: cleanUsername,
            answers: {
              fullName: resetQFullName.trim(),
              birthYear: resetQBirthYear.trim(),
              city: resetQCity.trim(),
              roleModel: resetQRoleModel.trim(),
              favoriteBookOrSubject: resetQFavoriteBook.trim(),
            },
            newPassword: cleanNewPass,
          }),
        });
        const data = await res.json();
        if (res.ok && data.user) {
          targetUser = {
            id: data.user.id,
            username: data.user.username,
            password: cleanNewPass,
            fullName: data.user.fullName || data.user.username,
            gender: data.user.gender || 'أنثى',
            college: data.user.college,
            securityQuestions: data.user.securityQuestions,
            createdAt: data.user.createdAt,
          };
        }
      } catch {}

      if (targetUser) {
        const userObj: User = {
          id: targetUser.id,
          username: targetUser.username,
          fullName: targetUser.fullName,
          gender: targetUser.gender || 'أنثى',
          college: targetUser.college,
          securityQuestions: targetUser.securityQuestions,
          createdAt: targetUser.createdAt,
        };

        localStorage.setItem('sabeel_current_user', JSON.stringify(userObj));
        setResetSuccessMessage('تم تغيير كلمة المرور بنجاح! جاري تسجيل الدخول...');
        setTimeout(() => {
          onSuccess(userObj);
          onClose();
        }, 800);
      } else {
        setErrorMessage('تعذر تحديث الحساب، يرجى المحاولة مرة أخرى.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('حدث خطأ أثناء حفظ كلمة المرور.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in text-right">
      <div className="relative w-full max-w-lg bg-[#fdfdfc] rounded-3xl shadow-2xl border border-[#2e493b]/15 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#2e493b] text-white p-5 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-right">
            <h3 className="text-lg font-bold font-cairo">
              {mode === 'login'
                ? 'تسجيل الدخول إلى سَبيل'
                : mode === 'register'
                ? 'إنشاء حساب جديد في سَبيل'
                : 'استعادة كلمة المرور'}
            </h3>
            <p className="text-xs text-emerald-100/80">
              {mode === 'login'
                ? 'أدخل بيانات حسابك للمتابعة وحفظ مقرراتك وملاحظاتك'
                : mode === 'register'
                ? 'أدخل بياناتك وحدد تخصصك والأسئلة السرية للأمان'
                : 'أجب على الأسئلة السرية الخمسة لتعيين كلمة مرور جديدة'}
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs (Login vs Register) */}
        {mode !== 'forgot_password' && (
          <div className="flex border-b border-stone-200/80 bg-stone-100/60 p-1.5 m-4 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#20352a] shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#20352a] shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              حساب جديد
            </button>
          </div>
        )}

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto px-6 pb-6 pt-2 flex-1 space-y-4">
          {/* Gentle Notice / Contextual Banner */}
          {notice && !errorMessage && !resetSuccessMessage && (
            <div className="p-3.5 bg-[#e8eee9] border border-[#2e493b]/25 rounded-2xl flex items-center gap-2.5 text-[#20352a] text-xs font-bold leading-relaxed shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-[#2e493b] shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Alert */}
          {resetSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{resetSuccessMessage}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 1. LOGIN MODE                                                             */}
          {/* ========================================================================= */}
          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  اسم المستخدم
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    className="w-full py-2.5 pr-10 pl-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:bg-white focus:border-[#2e493b] focus:outline-none transition-all"
                  />
                  <UserIcon className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-stone-700">كلمة المرور</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetUsername(username);
                      switchMode('forgot_password');
                    }}
                    className="text-[11px] font-semibold text-[#2e493b] hover:text-[#1f3328] underline decoration-dotted cursor-pointer"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full py-2.5 pr-10 pl-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:bg-white focus:border-[#2e493b] focus:outline-none transition-all"
                  />
                  <Lock className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* 2. SIGN UP / REGISTER MODE                                                */}
          {/* ========================================================================= */}
          {mode === 'register' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: سارة بنت أحمد أو محمد بن علي"
                  className="w-full py-2.5 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:bg-white focus:border-[#2e493b] focus:outline-none transition-all"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  اسم المستخدم (Username)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="اسم المستخدم للدخول"
                    className="w-full py-2.5 pr-10 pl-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:bg-white focus:border-[#2e493b] focus:outline-none transition-all"
                  />
                  <UserIcon className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full py-2.5 pr-10 pl-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:bg-white focus:border-[#2e493b] focus:outline-none transition-all"
                  />
                  <Lock className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Gender Selector: ذكر / أنثى */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  الجنس (لتخصيص الخطاب والترحيب):
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGender('أنثى')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      gender === 'أنثى'
                        ? 'border-[#2e493b] bg-emerald-50 text-[#20352a] shadow-2xs ring-1 ring-[#2e493b]'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50 text-stone-600'
                    }`}
                  >
                    <span>أنثى (طالبة)</span>
                    {gender === 'أنثى' && <CheckCircle2 className="w-3.5 h-3.5 text-[#2e493b]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('ذكر')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      gender === 'ذكر'
                        ? 'border-[#2e493b] bg-emerald-50 text-[#20352a] shadow-2xs ring-1 ring-[#2e493b]'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50 text-stone-600'
                    }`}
                  >
                    <span>ذكر (طالب)</span>
                    {gender === 'ذكر' && <CheckCircle2 className="w-3.5 h-3.5 text-[#2e493b]" />}
                  </button>
                </div>
              </div>

              {/* Major / College Selection: شريعة / أنظمة vs تخصص آخر */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  التخصص الجامعي:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Option 1: شريعة */}
                  <div
                    onClick={() => setCollege('كلية الشريعة')}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      college !== 'تخصص آخر'
                        ? 'border-[#2e493b] bg-emerald-50/60 text-[#20352a] shadow-2xs'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/60 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <GraduationCap
                        className={`w-4 h-4 ${
                          college !== 'تخصص آخر' ? 'text-[#2e493b]' : 'text-stone-400'
                        }`}
                      />
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          college !== 'تخصص آخر'
                            ? 'border-[#2e493b] bg-[#2e493b]'
                            : 'border-stone-300'
                        }`}
                      >
                        {college !== 'تخصص آخر' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#1f3328]">شريعة</span>
                    <span className="text-[10px] text-stone-500 font-normal mt-0.5 leading-tight">
                      يشمل الأنظمة والقانون
                    </span>
                  </div>

                  {/* Option 2: تخصص آخر */}
                  <div
                    onClick={() => setCollege('تخصص آخر')}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      college === 'تخصص آخر'
                        ? 'border-[#2e493b] bg-emerald-50/60 text-[#20352a] shadow-2xs'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/60 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <UserIcon
                        className={`w-4 h-4 ${
                          college === 'تخصص آخر' ? 'text-[#2e493b]' : 'text-stone-400'
                        }`}
                      />
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          college === 'تخصص آخر'
                            ? 'border-[#2e493b] bg-[#2e493b]'
                            : 'border-stone-300'
                        }`}
                      >
                        {college === 'تخصص آخر' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#1f3328]">تخصص آخر</span>
                    <span className="text-[10px] text-stone-500 font-normal mt-0.5 leading-tight">
                      العلوم والمقررات الجامعية العامة
                    </span>
                  </div>
                </div>
              </div>

              {/* 5 Mandatory Security Questions */}
              <div className="pt-2 p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>الأسئلة السرية الخمسة (مطلوبة لاستعادة كلمة المرور عند نسيانها):</span>
                </div>

                <div className="space-y-2.5 text-right">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                      1. الاسم الثلاثي
                    </label>
                    <input
                      type="text"
                      required
                      value={qFullName}
                      onChange={(e) => setQFullName(e.target.value)}
                      placeholder="اسمك الثلاثي"
                      className="w-full py-2 px-3 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:border-[#2e493b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                      2. عام الميلاد
                    </label>
                    <input
                      type="text"
                      required
                      value={qBirthYear}
                      onChange={(e) => setQBirthYear(e.target.value)}
                      placeholder="مثال: 2002 أو 1423"
                      className="w-full py-2 px-3 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:border-[#2e493b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                      3. مدينتك
                    </label>
                    <input
                      type="text"
                      required
                      value={qCity}
                      onChange={(e) => setQCity(e.target.value)}
                      placeholder="مثال: بريدة، الرياض، مكة"
                      className="w-full py-2 px-3 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:border-[#2e493b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                      4. اسم شخص تحبه أو قدوتك
                    </label>
                    <input
                      type="text"
                      required
                      value={qRoleModel}
                      onChange={(e) => setQRoleModel(e.target.value)}
                      placeholder="اسم الشخص أو القدوة"
                      className="w-full py-2 px-3 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:border-[#2e493b] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-0.5">
                      5. كتابك أو مادتك المفضلة
                    </label>
                    <input
                      type="text"
                      required
                      value={qFavoriteBook}
                      onChange={(e) => setQFavoriteBook(e.target.value)}
                      placeholder="اسم الكتاب أو المادة الدراسية"
                      className="w-full py-2 px-3 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:border-[#2e493b] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب وبدء الاستخدام'}
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* 3. FORGOT PASSWORD / RESET FLOW                                           */}
          {/* ========================================================================= */}
          {mode === 'forgot_password' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-[#2e493b] cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>العودة لتسجيل الدخول</span>
                </button>
                <span className="text-xs font-bold text-stone-800">إعادة تعيين كلمة المرور</span>
              </div>

              {!isResetVerified ? (
                /* Step 1: Input username and answer 5 security questions */
                <form onSubmit={handleVerifySecurityQuestions} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      اسم المستخدم المطلوب استعادة كلمة المرور له
                    </label>
                    <input
                      type="text"
                      required
                      value={resetUsername}
                      onChange={(e) => setResetUsername(e.target.value)}
                      placeholder="أدخل اسم المستخدم"
                      className="w-full py-2.5 px-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:bg-white focus:border-[#2e493b] focus:outline-none"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-2.5">
                    <p className="text-xs font-bold text-[#20352a]">
                      أدخل إجابات الأسئلة السرية المسجلة عند إنشاء الحساب:
                    </p>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        1. الاسم الثلاثي
                      </label>
                      <input
                        type="text"
                        required
                        value={resetQFullName}
                        onChange={(e) => setResetQFullName(e.target.value)}
                        placeholder="إجابتك المسجلة"
                        className="w-full py-2 px-3 bg-white border border-stone-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        2. عام الميلاد
                      </label>
                      <input
                        type="text"
                        required
                        value={resetQBirthYear}
                        onChange={(e) => setResetQBirthYear(e.target.value)}
                        placeholder="إجابتك المسجلة"
                        className="w-full py-2 px-3 bg-white border border-stone-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        3. مدينتك
                      </label>
                      <input
                        type="text"
                        required
                        value={resetQCity}
                        onChange={(e) => setResetQCity(e.target.value)}
                        placeholder="إجابتك المسجلة"
                        className="w-full py-2 px-3 bg-white border border-stone-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        4. اسم شخص تحبه أو قدوتك
                      </label>
                      <input
                        type="text"
                        required
                        value={resetQRoleModel}
                        onChange={(e) => setResetQRoleModel(e.target.value)}
                        placeholder="إجابتك المسجلة"
                        className="w-full py-2 px-3 bg-white border border-stone-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-600 mb-0.5">
                        5. كتابك أو مادتك المفضلة
                      </label>
                      <input
                        type="text"
                        required
                        value={resetQFavoriteBook}
                        onChange={(e) => setResetQFavoriteBook(e.target.value)}
                        placeholder="إجابتك المسجلة"
                        className="w-full py-2 px-3 bg-white border border-stone-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'جاري التحقق من الإجابات...' : 'التحقق من الإجابات'}
                  </button>
                </form>
              ) : (
                /* Step 2: Set New Password after verification */
                <form onSubmit={handleSaveNewPassword} className="space-y-4 animate-fade-in">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>تم التحقق من هويتك بنجاح! يمكنك الآن إدخال كلمة المرور الجديدة.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      كلمة المرور الجديدة
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        autoFocus
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور الجديدة"
                        className="w-full py-2.5 pr-10 pl-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:bg-white focus:border-[#2e493b] focus:outline-none"
                      />
                      <KeyRound className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-[#2e493b] hover:bg-[#385947] text-white rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'جاري التحديث...' : 'تعيين كلمة المرور الجديدة والدخول'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
