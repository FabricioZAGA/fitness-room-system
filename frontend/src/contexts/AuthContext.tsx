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

export type AdminRole = "admin" | "receptionist";

export interface User {
  userId: string;
  email: string;
  name?: string;
  groups: string[];
  role: AdminRole;
}

export type AuthStep = "login" | "newPasswordRequired" | "forgotPassword" | "confirmReset";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  authStep: AuthStep;
  login: (email: string, password: string) => Promise<void>;
  completeNewPassword: (newPassword: string, givenName: string, familyName: string) => Promise<void>;
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
          role: "admin",
        });
        setIsLoading(false);
        return;
      }

      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const groups = (session.tokens?.accessToken?.payload?.["cognito:groups"] as string[]) ?? [];

      const adminAllowed = ["admin", "receptionist"] as const;
      const role = adminAllowed.find((r) => groups.includes(r));
      if (!role) {
        await signOut();
        setUser(null);
        return;
      }

      setUser({
        userId: currentUser.userId,
        email: currentUser.signInDetails?.loginId ?? "",
        name: currentUser.username,
        groups,
        role,
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

    const session = await fetchAuthSession();
    const groups = (session.tokens?.accessToken?.payload?.["cognito:groups"] as string[]) ?? [];
    const adminAllowed = ["admin", "receptionist"];
    if (!adminAllowed.some((r) => groups.includes(r))) {
      await signOut();
      throw new Error("No tienes permisos para acceder. Si eres alumno, ingresa en portal.fitnessroom.mx");
    }

    await checkUser();
  };

  const completeNewPassword = async (
    newPassword: string,
    givenName: string,
    familyName: string,
  ): Promise<void> => {
    await confirmSignIn({
      challengeResponse: newPassword,
      options: {
        userAttributes: {
          given_name: givenName,
          family_name: familyName,
        },
      },
    });

    const session = await fetchAuthSession();
    const groups = (session.tokens?.accessToken?.payload?.["cognito:groups"] as string[]) ?? [];
    const adminAllowed = ["admin", "receptionist"];
    if (!adminAllowed.some((r) => groups.includes(r))) {
      await signOut();
      throw new Error("No tienes permisos para acceder. Si eres alumno, ingresa en portal.fitnessroom.mx");
    }

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
        isAdmin: user?.role === "admin",
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
