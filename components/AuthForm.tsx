'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Lock, User, ShieldCheck, Mail, GraduationCap } from 'lucide-react';

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
  theme?: 'blue' | 'purple' | 'green' | 'orange';
}

const themeClasses = {
  blue: 'from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-800/10 border-blue-200 dark:border-blue-800',
  purple: 'from-purple-50 to-purple-100 dark:from-purple-900/10 dark:to-purple-800/10 border-purple-200 dark:border-purple-800',
  green: 'from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-800/10 border-green-200 dark:border-green-800',
  orange: 'from-orange-50 to-orange-100 dark:from-orange-900/10 dark:to-orange-800/10 border-orange-200 dark:border-orange-800',
};

const themeButtonClasses = {
  blue: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20',
  purple: 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20',
  green: 'bg-green-600 hover:bg-green-700 shadow-green-500/20',
  orange: 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20',
};

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
  theme = 'blue',
}: AuthFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>(
    fields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {})
  );
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className={`w-full max-w-2xl bg-gradient-to-br ${themeClasses[theme]} rounded-[3rem] shadow-2xl border p-12 lg:p-16 animate-in fade-in zoom-in duration-500`}>
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-foreground mb-4 tracking-tighter">{title}</h1>
          {description && <p className="text-xl font-medium text-muted-foreground">{description}</p>}
        </div>

        {error && (
          <div className="mb-8 p-6 bg-destructive/10 border border-destructive/20 rounded-2xl animate-in slide-in-from-top-2">
            <p className="text-destructive text-lg font-bold text-center">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {fields.map((field) => (
            <div key={field.name} className="relative group">
              <label htmlFor={field.name} className="block text-sm font-black text-muted-foreground uppercase tracking-widest mb-3 ml-2">
                {field.label}
              </label>
              <div className="relative">
                {field.icon && (
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    {(() => {
                      const Icon = iconMap[field.icon];
                      return <Icon size={24} />;
                    })()}
                  </div>
                )}
                <Input
                  id={field.name}
                  name={field.name}
                  type={field.type === 'password' ? (showPassword[field.name] ? 'text' : 'password') : field.type}
                  placeholder={field.placeholder}
                  value={formData[field.name]}
                  onChange={handleChange}
                  required={field.required !== false}
                  disabled={isSubmitting || loading}
                  className={`h-20 text-xl font-bold rounded-3xl border-2 bg-background/50 backdrop-blur-sm px-6 ${field.icon ? 'pl-16' : ''} ${field.type === 'password' ? 'pr-16' : ''} focus:ring-4 focus:ring-primary/10 transition-all ${formErrors[field.name] ? 'border-destructive' : 'border-border group-hover:border-primary/50'}`}
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(field.name)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                  >
                    {showPassword[field.name] ? <EyeOff size={24} /> : <Eye size={24} />}
                  </button>
                )}
              </div>
              {formErrors[field.name] && (
                <p className="mt-2 text-base font-bold text-destructive ml-2">{formErrors[field.name]}</p>
              )}
            </div>
          ))}

          <Button
            type="submit"
            disabled={isSubmitting || loading}
            className={`w-full h-20 text-white font-black text-xl uppercase tracking-[0.2em] rounded-3xl transition-all duration-500 shadow-2xl ${
              themeButtonClasses[theme]
            } disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95`}
          >
            {isSubmitting || loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-4 border-white border-t-transparent mr-4"></div>
                Processing...
              </div>
            ) : (
              submitButtonText
            )}
          </Button>
        </form>

        {footerText && footerLink && (
          <p className="mt-12 text-center text-muted-foreground text-lg font-bold">
            {footerText}{' '}
            <a href={footerLink.href} className="text-primary hover:underline underline-offset-8 decoration-2 transition-all">
              {footerLink.text}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
