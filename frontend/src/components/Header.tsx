"use client";

import Link from "next/link";
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold group-hover:bg-indigo-700 transition-colors">
              P
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-800">
              Price Tracker
            </span>
          </Link>
          <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded font-bold border border-slate-200">
            v1.0.0
          </span>
        </div>
        <nav className="flex gap-6 text-sm font-bold">
          <Link
            href="/"
            className={`${
              pathname === '/' 
                ? 'text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-slate-500 hover:text-indigo-600'
            } pb-1 transition-colors`}
          >
            tracker
          </Link>
          <Link
            href="/search"
            className={`${
              pathname === '/search' 
                ? 'text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-slate-500 hover:text-indigo-600'
            } pb-1 transition-colors`}
          >
            search
          </Link>
        </nav>
      </div>
    </header>
  );
}
