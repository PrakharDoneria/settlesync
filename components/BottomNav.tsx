'use client';

import React from 'react';
import {
  HomeIcon,
  MapIcon,
  ReceiptRefundIcon,
  WalletIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  UserCircleIcon,
} from '@heroicons/react/24/solid';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Home', icon: HomeIcon, href: '/' },
  { label: 'My Trips', icon: MapIcon, href: '/trips' },
  { label: 'Expenses', icon: ReceiptRefundIcon, href: '/expenses' },
  { label: 'Settle', icon: WalletIcon, href: '/settle' },
  { label: 'Chat', icon: ChatBubbleLeftRightIcon, href: '/chat' },
  { label: 'Analytics', icon: ChartBarIcon, href: '/analytics' },
  { label: 'Profile', icon: UserCircleIcon, href: '/profile' },
];

export const BottomNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t-3 sm:border-t-4 border-neo-black bg-neo-white z-40 shadow-neo-xl pb-safe">
      <div className="flex justify-around items-center h-16 sm:h-20 px-1 sm:px-4 max-w-4xl mx-auto w-full">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === '/trips' && pathname.startsWith('/trips')) ||
            (item.href === '/expenses' && pathname.startsWith('/expenses'));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 sm:py-2 mx-0.5 sm:mx-1 rounded-neo border-2 sm:border-3 transition-all duration-150 font-neo-black text-[10px] sm:text-xs text-center ${
                isActive
                  ? 'bg-neo-cyan text-neo-black border-neo-black shadow-neo'
                  : 'bg-neo-gray text-neo-black border-neo-black hover:bg-neo-yellow'
              }`}
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
              <span className="mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[50px] sm:max-w-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
