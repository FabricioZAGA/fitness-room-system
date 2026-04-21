/**
 * Authentication context using AWS Cognito.
 * Provides user state, login, logout, and signup functions.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  confirmSignIn,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchAuthSession,
  type SignInInput,
  type SignUpInput,
} from "aws-amplify/auth";

export interface User {
  userId: string;
  email: string;
  name?: string;
  groups: string[];
}

export type AuthStep = "login" | "newPasswordRequired" | "forgotPassword" | "confirmReset";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authStep: AuthStep;
  login: (email: string, password: string) => Promise<void>;
  completeNewPassword: (newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  confirmForgotPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  resetAuthStep: () => void;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  confirmAccount: (email: string, code: string) => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authStep, setAuthStep] = useState<AuthStep>("login");

  const isLocalDev = import.meta.env.VITE_APP_ENV === "local";

  const checkUser = useCallback(async () => {
    try {
      if (isLocalDev) {
        // Local dev bypass
        setUser({
          userId: "local-dev-user",
          email: "dev@fitness-room.local",
          name: "Dev User",
          groups: ["admin"],
        });
        setIsLoading(false);
        return;
      }

      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const groups = (session.tokens?.accessToken?.payload?.["cognito:groups"] as string[]) ?? [];

      setUser({
        userId: currentUser.userId,
        email: currentUser.signInDetails?.loginId ?? "",
        name: currentUser.username,
        groups,
      });
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [isLocalDev]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const login = async (email: string, password: string): Promise<void> => {
    const input: SignInInput = { username: email, password };
    const result = await signIn(input);

    if (
      result.nextStep?.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
    ) {
      setAuthStep("newPasswordRequired");
      return;
    }

    await checkUser();
  };

  const completeNewPassword = async (newPassword: string): Promise<void> => {
    await confirmSignIn({ challengeResponse: newPassword });
    setAuthStep("login");
    await checkUser();
  };

  const forgotPassword = async (email: string): Promise<void> => {
    await resetPassword({ username: email });
    setAuthStep("confirmReset");
  };

  const confirmForgotPassword = async (
    email: string,
    code: string,
    newPassword: string,
  ): Promise<void> => {
    await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
    setAuthStep("login");
  };

  const resetAuthStep = (): void => {
    setAuthStep("login");
  };

  const logout = async (): Promise<void> => {
    await signOut();
    setUser(null);
  };

  const signup = async (email: string, password: string, name: string): Promise<void> => {
    const input: SignUpInput = {
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          name,
        },
      },
    };
    await signUp(input);
  };

  const confirmAccount = async (email: string, code: string): Promise<void> => {
    await confirmSignUp({ username: email, confirmationCode: code });
  };

  const getAccessToken = async (): Promise<string | null> => {
    if (isLocalDev) return "local-dev-token";
    try {
      const session = await fetchAuthSession();
      return session.tokens?.accessToken?.toString() ?? null;
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        authStep,
        login,
        completeNewPassword,
        forgotPassword,
        confirmForgotPassword,
        resetAuthStep,
        logout,
        signup,
        confirmAccount,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
