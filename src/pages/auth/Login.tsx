import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast, { Toaster } from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginSchemaType = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, isAuthenticated, error: authError } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema)
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data: LoginSchemaType) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      toast.success('Successfully logged in!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-indigo-950 via-indigo-900 to-slate-900 relative overflow-hidden">
      {/* Decorative background glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full filter blur-3xl opacity-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl opacity-10 animate-pulse delay-700"></div>

      <div className="relative w-full max-w-md p-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl mx-4">
        <Toaster position="top-right" />
        
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 bg-primary text-white rounded-xl shadow-lg shadow-indigo-600/30 mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">DPS Agency OS</h1>
          <p className="text-sm text-indigo-200 mt-1">Sign in to manage your digital agency</p>
        </div>

        {/* Auth Error Display */}
        {authError && (
          <div className="p-3 mb-6 text-sm text-red-200 bg-red-950/40 border border-red-500/30 rounded-lg">
            {authError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-indigo-100 uppercase tracking-wide">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-300">
                <Mail size={16} />
              </span>
              <input
                type="email"
                {...register('email')}
                className="w-full py-2.5 pl-10 pr-4 text-sm text-white bg-indigo-950/50 border border-indigo-700/50 rounded-lg placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder="admin@digitalprod.com"
                disabled={isSubmitting}
              />
            </div>
            {errors.email && (
              <p className="text-xs font-medium text-red-300">{errors.email.message}</p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-indigo-100 uppercase tracking-wide">
                Password
              </label>
              <a href="#" className="text-xs text-primary hover:text-indigo-400 font-medium">
                Forgot?
              </a>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-300">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className="w-full py-2.5 pl-10 pr-10 text-sm text-white bg-indigo-950/50 border border-indigo-700/50 rounded-lg placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder="••••••••"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-indigo-300 hover:text-white"
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs font-medium text-red-300">{errors.password.message}</p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full py-2.5 mt-2 flex items-center justify-center font-semibold text-white bg-primary hover:bg-primary-dark active:bg-indigo-700 rounded-lg shadow-md shadow-indigo-600/20 focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-center mt-6">
          <p className="text-xs text-indigo-300">
            For demo login: <span className="font-semibold text-white">admin@digitalprod.com</span> / <span className="font-semibold text-white">adminpass</span>
          </p>
        </div>
      </div>
    </div>
  );
}
