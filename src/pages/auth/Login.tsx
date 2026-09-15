import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, KeyRound, MessageCircle } from 'lucide-react';
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
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    <div className="relative min-h-screen bg-[#111B21] overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[222px] bg-wa-banner" />

      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#202C33', color: '#E9EDEF', border: '1px solid #2A3942' },
        }}
      />

      <div className="relative z-10 flex min-h-screen items-start justify-center px-4 pt-16 sm:pt-24">
        <div className="w-full max-w-[460px] bg-bg-card rounded-sm shadow-2xl px-8 py-10 sm:px-12">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-[#111B21] mb-4">
              <MessageCircle size={32} fill="currentColor" />
            </div>
            <h1 className="text-[28px] font-light text-text-main tracking-tight">DPS Agency OS</h1>
            <p className="text-[14px] text-text-sub mt-1 text-center">
              Use DPS OS on your computer. Simple, reliable, private.
            </p>
          </div>

          {authError && (
            <div className="p-3 mb-6 text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg">
              {authError}
            </div>
          )}

          {!otpRequired ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-text-sub">
                  Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-wa-icon">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full py-2.5 pl-10 pr-4 text-[15px] text-text-main bg-wa-panel border-0 border-b-2 border-border-card rounded-none focus:outline-none focus:ring-0 focus:border-primary placeholder-text-sub/70 transition-colors"
                    placeholder="you@digitalprod.com"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs font-medium text-danger">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[13px] font-medium text-text-sub">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-wa-icon">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className="w-full py-2.5 pl-10 pr-10 text-[15px] text-text-main bg-wa-panel border-0 border-b-2 border-border-card rounded-none focus:outline-none focus:ring-0 focus:border-primary placeholder-text-sub/70 transition-colors"
                    placeholder="••••••••"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-wa-icon hover:text-text-main"
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs font-medium text-danger">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-4 flex items-center justify-center font-semibold text-[14px] uppercase tracking-wide text-[#111B21] bg-primary hover:bg-primary-dark rounded-full focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center bg-wa-panel p-4 rounded-lg space-y-1">
                <KeyRound className="mx-auto text-primary" size={28} />
                <h2 className="text-[15px] font-medium text-text-main">Security verification</h2>
                <p className="text-[13px] text-text-sub">
                  A 6-digit code was sent to<br />
                  <span className="font-medium text-text-main">{otpEmail}</span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-medium text-text-sub block text-center">
                  Enter verification code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-3 text-center text-xl font-semibold tracking-[0.4em] text-text-main bg-wa-panel border-0 border-b-2 border-border-card rounded-none focus:outline-none focus:ring-0 focus:border-primary"
                  placeholder="000000"
                  disabled={isVerifyingOtp}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 flex items-center justify-center font-semibold text-[14px] uppercase tracking-wide text-[#111B21] bg-primary hover:bg-primary-dark rounded-full focus:outline-none transition-colors disabled:opacity-50"
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
                className="w-full flex items-center justify-center text-[13px] text-primary hover:underline"
                disabled={isVerifyingOtp}
              >
                <ArrowLeft size={14} className="mr-1" />
                Back to login
              </button>
            </form>
          )}

          <p className="text-center mt-8 text-[12px] text-text-sub">
            End-to-end protected login with OTP for superadmin.
          </p>
        </div>
      </div>
    </div>
  );
}
