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
    <nav className="fixed bottom-0 left-0 right-0 border-t-3 sm:border-t-4 border-neo-black bg-neo-white z-40 shadow-neo-xl overflow-x-auto">
      <div className="flex justify-start sm:justify-around items-center gap-1 sm:gap-0 h-16 sm:h-20 px-2 sm:px-4 min-w-min sm:min-w-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/trips' && pathname.startsWith('/trips'));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-12 sm:w-auto sm:flex-1 h-12 sm:h-16 px-2 sm:px-3 rounded-neo border-2 sm:border-3 transition-all duration-150 font-neo-black text-xs sm:text-sm flex-shrink-0 ${
                isActive
                  ? 'bg-neo-cyan text-neo-black border-neo-black shadow-neo-cyan'
                  : 'bg-neo-gray text-neo-black border-neo-black hover:bg-neo-yellow'
              }`}
            >
              <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-neo-xs mt-0.5 sm:mt-1 hidden sm:inline whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
