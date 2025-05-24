'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export default function Sidebar() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: '/',
      label: 'Dashboard',
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-5 w-5'
          viewBox='0 0 20 20'
          fill='currentColor'>
          <path d='M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z' />
          <path d='M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z' />
        </svg>
      ),
    },
    {
      href: '/patients',
      label: 'Patients',
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-5 w-5'
          viewBox='0 0 20 20'
          fill='currentColor'>
          <path d='M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z' />
        </svg>
      ),
    },
    {
      href: '/medications',
      label: 'Medications',
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-5 w-5'
          viewBox='0 0 20 20'
          fill='currentColor'>
          <path
            fillRule='evenodd'
            d='M17.707 8.293a1 1 0 00-1.414 0L13 11.586V8a1 1 0 00-2 0v3.586l-3.293-3.293a1 1 0 00-1.414 1.414L10.414 14H7a1 1 0 000 2h3.414l-4.121 4.121a1 1 0 001.414 1.414L12 17.242l4.293 4.293a1 1 0 001.414-1.414L13.414 16H17a1 1 0 000-2h-3.586l4.293-4.293a1 1 0 000-1.414z'
            clipRule='evenodd'
          />
        </svg>
      ),
    },
    {
      href: '/dispensers',
      label: 'Dispensers',
      icon: (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          className='h-5 w-5'
          viewBox='0 0 20 20'
          fill='currentColor'>
          <path
            fillRule='evenodd'
            d='M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z'
            clipRule='evenodd'
          />
        </svg>
      ),
    },
  ];

  return (
    <aside className='w-64 h-full'>
      <div className='h-full py-4 px-3 bg-base-200'>
        <div className='flex items-center pl-2.5 mb-5'>
          <span className='self-center text-xl font-semibold whitespace-nowrap'>
            MediPi
          </span>
        </div>

        <ul className='space-y-2'>
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center p-2 text-base font-normal rounded-lg ${
                  pathname === item.href
                    ? 'bg-primary text-primary-content'
                    : 'hover:bg-base-300'
                }`}>
                {item.icon}
                <span className='ml-3'>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
