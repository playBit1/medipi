'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Email validation function
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset error state
    setError('');

    // Form validation
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (!result?.ok) {
        setError('Invalid email or password');
      } else {
        router.push('/'); // Redirect to dashboard on success
        router.refresh(); // Refresh to update session data
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-100'>
      <div className='w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-blue-700'>MediPi</h1>
          <p className='mt-2 text-gray-600'>Automated Medication Dispenser</p>
        </div>

        {error && (
          <div className='alert alert-error'>
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className='mt-8 space-y-6'>
          <div>
            <label
              htmlFor='email'
              className='block text-sm font-medium text-gray-700'>
              Email
            </label>
            <input
              id='email'
              name='email'
              type='email'
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='input input-bordered w-full mt-1'
              placeholder='admin@medipi.com'
            />
          </div>

          <div>
            <label
              htmlFor='password'
              className='block text-sm font-medium text-gray-700'>
              Password
            </label>
            <input
              id='password'
              name='password'
              type='password'
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='input input-bordered w-full mt-1'
              placeholder='••••••••'
            />
          </div>

          <button
            type='submit'
            disabled={isLoading}
            className='btn btn-primary w-full'>
            {isLoading ? (
              <span className='loading loading-spinner loading-sm'></span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
