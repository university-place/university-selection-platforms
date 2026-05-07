'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AuthFormProps {
  title: string;
  description?: string;
  fields: {
    name: string;
    label: string;
    type: string;
    placeholder: string;
    required?: boolean;
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
  blue: 'from-blue-50 to-blue-100 border-blue-200',
  purple: 'from-purple-50 to-purple-100 border-purple-200',
  green: 'from-green-50 to-green-100 border-green-200',
  orange: 'from-orange-50 to-orange-100 border-orange-200',
};

const themeButtonClasses = {
  blue: 'bg-blue-600 hover:bg-blue-700',
  purple: 'bg-purple-600 hover:bg-purple-700',
  green: 'bg-green-600 hover:bg-green-700',
  orange: 'bg-orange-600 hover:bg-orange-700',
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className={`w-full max-w-md bg-gradient-to-br ${themeClasses[theme]} rounded-2xl shadow-xl border p-8`}>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">{title}</h1>
        {description && <p className="text-center text-gray-600 mb-6">{description}</p>}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              <Input
                id={field.name}
                name={field.name}
                type={field.type}
                placeholder={field.placeholder}
                value={formData[field.name]}
                onChange={handleChange}
                required={field.required !== false}
                disabled={isSubmitting || loading}
                className={formErrors[field.name] ? 'border-red-500' : ''}
              />
              {formErrors[field.name] && (
                <p className="mt-1 text-sm text-red-600">{formErrors[field.name]}</p>
              )}
            </div>
          ))}

          <Button
            type="submit"
            disabled={isSubmitting || loading}
            className={`w-full text-white font-semibold py-2 rounded-lg transition-colors ${
              themeButtonClasses[theme]
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting || loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                {submitButtonText}
              </div>
            ) : (
              submitButtonText
            )}
          </Button>
        </form>

        {footerText && footerLink && (
          <p className="mt-6 text-center text-gray-600 text-sm">
            {footerText}{' '}
            <a href={footerLink.href} className={`text-${theme}-600 hover:text-${theme}-700 font-semibold`}>
              {footerLink.text}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
