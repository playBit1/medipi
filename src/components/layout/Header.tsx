'use client';

import { signOut, useSession } from 'next-auth/react';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className='navbar bg-base-100 border-b'>
      <div className='flex-1'>
        <div className='flex-none lg:hidden'>
          <label
            htmlFor='drawer-toggle'
            className='btn btn-square btn-ghost'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              className='inline-block w-6 h-6 stroke-current'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M4 6h16M4 12h16M4 18h16'></path>
            </svg>
          </label>
        </div>
      </div>
      <div className='flex-none'>
        {session?.user && (
          <div className='dropdown dropdown-end'>
            <label
              tabIndex={0}
              className='btn btn-ghost btn-circle avatar placeholder'>
              <div className='bg-neutral text-neutral-content rounded-full w-10'>
                <span className='content-center'>
                  {session.user.name?.charAt(0) || 'U'}
                </span>
              </div>
            </label>
            <ul
              tabIndex={0}
              className='menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52'>
              <li className='p-2 text-sm opacity-70'>{session.user.email}</li>
              <li>
                <a onClick={() => signOut()}>Logout</a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}
