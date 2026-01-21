import React from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, LogIn } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-center p-4 overflow-hidden">
      <div className="relative mb-8 w-32 h-32 flex items-center justify-center">
        <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-pulse"></div>
        <div className="relative bg-slate-800 p-6 rounded-full border-2 border-slate-700 shadow-lg">
          <UtensilsCrossed className="text-emerald-500" size={56} />
        </div>
      </div>
      <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
        RestaurantOS: <span className="text-emerald-500">Nanded Edition</span>
      </h1>
      <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
        The ultimate digital operating system for your restaurant, designed for Nanded. Join our mission to feed street animals with every order.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          to="/login"
          className="bg-emerald-600 text-white font-semibold py-3 px-8 rounded-lg hover:bg-emerald-500 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-glow-emerald"
        >
          <LogIn size={20} />
          Login / Get Started
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;