import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast, { Toaster } from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginSchemaType = z.infer<typeof loginSchema>;

export default function Login() {
  const { login, verifyOTP, isAuthenticated, error: authError } = useAuthStore();
  const navigate = useNavigate();
  
  // Login Form states
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // OTP Verification states
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

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
      const response = await login(data.email, data.password);
      if (response.otp_required) {
        setOtpEmail(response.email || data.email);
        setOtpRequired(true);
        toast.success('Verification code sent to your email!');
      } else {
        toast.success('Successfully logged in!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue.length !== 6) {
      toast.error('Please enter a 6-digit verification code.');
      return;
    }
    setIsVerifyingOtp(true);
    try {
      await verifyOTP(otpEmail, otpValue);
      toast.success('Access code verified! Logging in...');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
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

        {!otpRequired ? (
          /* Normal Credentials Form */
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
        ) : (
          /* OTP Verification Form */
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center bg-indigo-950/30 border border-indigo-500/20 p-4 rounded-xl space-y-1">
              <KeyRound className="mx-auto text-primary" size={28} />
              <h2 className="text-sm font-semibold text-white">Security Verification</h2>
              <p className="text-xs text-indigo-200">
                A 6-digit access code has been sent to your email:<br />
                <span className="font-semibold text-white">{otpEmail}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-indigo-100 uppercase tracking-wide block text-center">
                Enter Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                className="w-full py-3 text-center text-xl font-bold tracking-widest text-white bg-indigo-950/50 border border-indigo-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder="000000"
                disabled={isVerifyingOtp}
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 flex items-center justify-center font-semibold text-white bg-primary hover:bg-primary-dark active:bg-indigo-700 rounded-lg shadow-md focus:outline-none transition-all duration-200 disabled:opacity-50"
              disabled={isVerifyingOtp || otpValue.length !== 6}
            >
              {isVerifyingOtp ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Log In'
              )}
            </button>

            <button
              type="button"
              onClick={() => setOtpRequired(false)}
              className="w-full flex items-center justify-center text-xs text-indigo-300 hover:text-white transition-colors"
              disabled={isVerifyingOtp}
            >
              <ArrowLeft size={14} className="mr-1" />
              Back to Login
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="text-center mt-6">
          <p className="text-xs text-indigo-300">
            Secure login with system-grade OTP access validation.
          </p>
        </div>
      </div>
    </div>
  );
}
