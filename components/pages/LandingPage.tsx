
import React from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, LogIn } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-center p-4">
      <div className="mb-8">
        <UtensilsCrossed className="text-emerald-500 mx-auto" size={80} />
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
          className="bg-emerald-600 text-white font-semibold py-3 px-8 rounded-lg hover:bg-emerald-500 transition-all duration-300 flex items-center justify-center gap-2"
        >
          <LogIn size={20} />
          Login
        </Link>
        <Link
          to="/login"
          className="bg-slate-800 text-white font-semibold py-3 px-8 rounded-lg hover:bg-slate-700 transition-all duration-300"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;
