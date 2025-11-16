import { useState } from "react";
import { LoginForm } from "@/components/login-form";
import { RegisterForm } from "@/components/register-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md">
        {isLogin ? (
          <LoginForm
            onRegisterClick={() => setIsLogin(false)}
          />
        ) : (
          <RegisterForm
            onLoginClick={() => setIsLogin(true)}
          />
        )}
      </div>
    </div>
  );
}
