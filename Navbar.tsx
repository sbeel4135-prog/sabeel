import React from 'react';
import { Sparkles, LogOut, User as UserIcon, GraduationCap, Scale } from 'lucide-react';
import { User } from '../types';
import { SABEEL_LOGO_BASE64 } from '../assets/sabeelLogoBase64';

interface NavbarProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenAssistant: () => void;
  onToggleCollege?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenAssistant,
  onToggleCollege,
}) => {
  const getUserFullName = (user: User): string => {
    if (user.fullName && user.fullName.trim() && user.fullName !== user.username) {
      return user.fullName.trim();
    }
    if (user.name && user.name.trim() && user.name !== user.username) {
      return user.name.trim();
    }
    if (user.securityQuestions?.fullName && user.securityQuestions.fullName.trim()) {
      return user.securityQuestions.fullName.trim();
    }
    try {
      const raw = localStorage.getItem('sabeel_users_v2');
      if (raw) {
        const accounts = JSON.parse(raw);
        if (Array.isArray(accounts)) {
          const found = accounts.find(
            (a: any) =>
              (user.username && a.username?.toLowerCase() === user.username?.toLowerCase()) ||
              (user.id && a.id === user.id)
          );
          if (found?.fullName && found.fullName.trim()) return found.fullName.trim();
          if (found?.name && found.name.trim()) return found.name.trim();
          if (found?.securityQuestions?.fullName && found.securityQuestions.fullName.trim()) {
            return found.securityQuestions.fullName.trim();
          }
        }
      }
    } catch {}
    return user.fullName || user.name || user.username || 'طالب العلم';
  };

  const getCollegeDisplay = (college?: string) => {
    if (college === 'كلية الشريعة' || college === 'قانون / أنظمة') return 'المسار: شريعة وأنظمة';
    if (college) return `المسار: ${college}`;
    return 'المسار: شريعة';
  };

  return (
    <header className="w-full bg-[#faf9f6]/95 backdrop-blur-md border-b border-[#2e493b]/10 sticky top-0 z-30 transition-all">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand with Official High-Resolution Transparent Sabeel Logo Only */}
        <div className="flex items-center">
          <img
            src={SABEEL_LOGO_BASE64}
            alt="شعار سَبِيل"
            className="h-10 sm:h-11 w-auto object-contain shrink-0 select-none transition-transform hover:scale-105"
          />
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            /* Logged in User Bar: Full Name from profile + Saved Major Badge + Explicit Logout */
            <div className="flex items-center gap-2.5 bg-white border border-[#2e493b]/15 rounded-2xl py-1.5 px-3 shadow-2xs text-right">
              <div className="w-7 h-7 rounded-full bg-[#e8eee9] text-[#2e493b] flex items-center justify-center">
                {currentUser.college === 'كلية الشريعة' ? (
                  <GraduationCap className="w-4 h-4 text-[#2e493b]" />
                ) : currentUser.college === 'قانون / أنظمة' ? (
                  <Scale className="w-4 h-4 text-[#2e493b]" />
                ) : (
                  <UserIcon className="w-4 h-4 text-[#2e493b]" />
                )}
              </div>

              <div className="flex flex-col leading-tight">
                <span className="text-xs font-bold text-[#20352a]">
                  {getUserFullName(currentUser)}
                </span>
                <span className="text-[10px] text-[#3a5d4a] font-semibold text-right">
                  {getCollegeDisplay(currentUser.college)}
                </span>
              </div>

              {/* Explicit Logout Button */}
              <button
                onClick={onLogout}
                className="mr-1 p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                title="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-semibold">تسجيل الخروج</span>
              </button>
            </div>
          ) : (
            /* Guest / Not logged in: Open Auth Modal */
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-[#2e493b] bg-white border border-[#2e493b]/20 hover:bg-[#f0f4f1] rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>تسجيل الدخول / حساب جديد</span>
            </button>
          )}

          {/* Quick Assistant Button */}
          <button
            onClick={onOpenAssistant}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2e493b] bg-[#e9eee9] hover:bg-[#dfe6df] rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#3a5d4a]" />
            <span className="hidden sm:inline">المساعد الذكي</span>
          </button>
        </div>
      </div>
    </header>
  );
};
