'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  KeyRound, 
  ShieldAlert, 
  CheckCircle2, 
  Loader2, 
  User, 
  Lock, 
  Mail, 
  ShieldCheck, 
  GraduationCap, 
  Eye, 
  EyeOff 
} from 'lucide-react';

interface AuthFormProps {
  title: string;
  description?: string;
  fields: {
    name: string;
    label: string;
    type: string;
    placeholder: string;
    required?: boolean;
    icon?: 'user' | 'lock' | 'mail' | 'shield' | 'grad';
  }[];
  onSubmit: (formData: Record<string, string>) => Promise<void>;
  loading?: boolean;
  error?: string;
  submitButtonText?: string;
  footerText?: string;
  footerLink?: { text: string; href: string };
  forgotPasswordLink?: { text: string; href: string };
  successMessage?: string;
  theme?: 'blue' | 'purple' | 'green' | 'orange';
}

const iconMap = {
  user: User,
  lock: Lock,
  mail: Mail,
  shield: ShieldCheck,
  grad: GraduationCap,
};

export function AuthForm({
  title,
  description,
  fields,
  onSubmit,
  loading = false,
  error,
  submitButtonText = 'Submit',
  footerText,
  footerLink,
  forgotPasswordLink,
  successMessage,
}: AuthFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, string>>(
    fields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {})
  );
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = (name: string) => {
    setShowPassword(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      console.error('Form submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine header icon dynamically based on title
  const titleLower = title.toLowerCase();
  let HeaderIcon = Lock;
  if (titleLower.includes('register') || titleLower.includes('create') || titleLower.includes('sign up')) {
    HeaderIcon = User;
  } else if (titleLower.includes('reset') || titleLower.includes('forgot') || titleLower.includes('change')) {
    HeaderIcon = KeyRound;
  } else if (titleLower.includes('moe') || titleLower.includes('admin') || titleLower.includes('platform')) {
    HeaderIcon = ShieldCheck;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[120px]" />

      <div className="w-full max-w-md bg-card/50 border border-border/50 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4 animate-bounce">
            <HeaderIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-200 to-violet-400 bg-clip-text text-transparent">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground text-sm mt-2">
              {description}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-2xl flex items-start gap-3 text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 rounded-2xl flex items-start gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <label htmlFor={field.name} className="block text-xs font-black uppercase tracking-wider text-muted-foreground">
                {field.label}
              </label>
              <div className="relative">
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type === 'password' ? (showPassword[field.name] ? 'text' : 'password') : field.type}
                  placeholder={field.placeholder}
                  value={formData[field.name]}
                  onChange={handleChange}
                  required={field.required !== false}
                  disabled={isSubmitting || loading}
                  className="w-full bg-background/60 border border-input focus:border-primary rounded-2xl px-4 py-3.5 text-sm font-semibold outline-none transition text-foreground placeholder:text-muted-foreground"
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(field.name)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition focus:outline-none"
                  >
                    {showPassword[field.name] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
              {field.type === 'password' && forgotPasswordLink && (
                <div className="flex justify-end mt-1">
                  <a 
                    href={forgotPasswordLink.href} 
                    className="text-xs font-bold text-blue-400 hover:underline transition-all"
                  >
                    {forgotPasswordLink.text}
                  </a>
                </div>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold py-3.5 px-4 rounded-2xl text-sm transition shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 cursor-pointer"
          >
            {isSubmitting || loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              submitButtonText
            )}
          </button>
        </form>

        {footerText && footerLink && (
          <p className="mt-6 text-center text-muted-foreground text-sm font-bold">
            {footerText}{' '}
            <a href={footerLink.href} className="text-blue-400 hover:underline underline-offset-4 decoration-2 transition-all">
              {footerLink.text}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
