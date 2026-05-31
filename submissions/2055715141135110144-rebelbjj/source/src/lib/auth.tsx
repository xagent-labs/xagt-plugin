import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "@/components/ui/sonner";
import { useLocale } from "@/lib/locale";
import { readScopedStorageItem, writeScopedStorageItem } from "@/lib/storage";

type EmailIdentity = {
  email: string;
  displayName: string;
  createdAt: number;
};

type AuthContextValue = {
  authScope: string;
  identityLabel: string;
  emailIdentity: EmailIdentity | null;
  isEmailAuthenticated: boolean;
  signInWithEmail: (email: string) => Promise<boolean>;
  signOutEmail: () => void;
};

const AUTH_EMAIL_STORAGE_KEY = "phantom-mat-auth-email-v1";

const AuthContext = createContext<AuthContextValue | null>(null);

const sanitizeEmail = (value: string) => value.trim().toLowerCase();

const isLikelyEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const deriveDisplayName = (email: string) => {
  const [localPart] = email.split("@");
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    || "Mat Agent";
};

const buildAuthScope = (identity: EmailIdentity | null) =>
  identity ? `email:${identity.email}` : "guest";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { pick } = useLocale();
  const [emailIdentity, setEmailIdentity] = useState<EmailIdentity | null>(() => {
    const raw = readScopedStorageItem(AUTH_EMAIL_STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.email === "string" &&
        typeof parsed.displayName === "string" &&
        typeof parsed.createdAt === "number"
      ) {
        return parsed as EmailIdentity;
      }
    } catch {
      return null;
    }

    return null;
  });

  useEffect(() => {
    if (!emailIdentity) return;
    writeScopedStorageItem(
      AUTH_EMAIL_STORAGE_KEY,
      JSON.stringify(emailIdentity),
    );
  }, [emailIdentity]);

  const signInWithEmail = async (emailInput: string) => {
    const email = sanitizeEmail(emailInput);
    if (!isLikelyEmail(email)) {
      toast.error(
        pick({
          "zh-CN": "请输入有效的邮箱地址。",
          "zh-TW": "請輸入有效的信箱地址。",
          en: "Please enter a valid email address.",
          ja: "有効なメールアドレスを入力してください。",
        }),
      );
      return false;
    }

    const nextIdentity: EmailIdentity = {
      email,
      displayName: deriveDisplayName(email),
      createdAt: Date.now(),
    };

    setEmailIdentity(nextIdentity);
    toast.success(
      pick({
        "zh-CN": `邮箱身份已启用：${email}`,
        "zh-TW": `信箱身份已啟用：${email}`,
        en: `Email identity enabled: ${email}`,
        ja: `メールIDを有効化しました：${email}`,
      }),
    );
    return true;
  };

  const signOutEmail = () => {
    setEmailIdentity(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_EMAIL_STORAGE_KEY);
    }
    toast.success(
      pick({
        "zh-CN": "邮箱身份已退出。",
        "zh-TW": "信箱身份已登出。",
        en: "Email identity signed out.",
        ja: "メールIDからサインアウトしました。",
      }),
    );
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      authScope: buildAuthScope(emailIdentity),
      identityLabel: emailIdentity?.displayName ?? pick({
        "zh-CN": "访客",
        "zh-TW": "訪客",
        en: "Guest",
        ja: "ゲスト",
      }),
      emailIdentity,
      isEmailAuthenticated: !!emailIdentity,
      signInWithEmail,
      signOutEmail,
    }),
    [emailIdentity, pick],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
