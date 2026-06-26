import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, RefreshCw, Shield, ArrowRight } from 'lucide-react';

const Landing: React.FC = () => {
  return (
    <div className="min-height-screen flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-center py-6">
        <div className="flex items-center space-x-2">
          <Clock className="h-8 w-8 text-primary-500 animate-pulse" />
          <span className="text-2xl font-bold tracking-tight text-white">
            Time<span className="text-primary-500">Trade</span>
          </span>
        </div>
        <div className="space-x-4">
          <Link
            to="/login"
            className="text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-all"
          >
            Log In
          </Link>
          <Link
            to="/login?signup=true"
            className="bg-primary-600 hover:bg-primary-500 text-white font-medium px-5 py-2.5 rounded-lg shadow-lg hover:shadow-primary-500/20 transition-all duration-300"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="my-16 text-center lg:text-left flex flex-col lg:flex-row items-center justify-between gap-12">
        <div className="lg:w-1/2 space-y-6">
          <div className="inline-flex items-center space-x-2 bg-primary-950/40 border border-primary-500/30 rounded-full px-3 py-1 text-sm text-primary-400">
            <span className="flex h-2 w-2 rounded-full bg-primary-400"></span>
            <span>Skill bartering reimagined.</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Exchange Skills, <br />
            Using <span className="text-primary-500 bg-gradient-to-r from-primary-400 to-violet-500 bg-clip-text text-transparent">Time</span> as Currency
          </h1>
          <p className="text-lg text-gray-400 max-w-xl">
            No money, no pricing bias. 1 hour of your skill equals 1 hour of someone else’s skill. Teach coding, learn French, or swap guitar classes in local or multi-person trade loops.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Link
              to="/login?signup=true"
              className="bg-primary-600 hover:bg-primary-500 text-white font-semibold px-8 py-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-primary-500/20 hover:scale-[1.02] transition-all duration-300"
            >
              <span>Join the Circle</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#how-it-works"
              className="glass-card text-white hover:bg-gray-800/40 font-semibold px-8 py-4 rounded-xl flex items-center justify-center transition-all duration-300"
            >
              See How It Works
            </a>
          </div>
        </div>

        {/* Visual Mockup Card */}
        <div className="lg:w-1/2 w-full max-w-md">
          <div className="glass-panel p-8 rounded-3xl shadow-2xl relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary-600/10 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary-500/5 rounded-full blur-3xl -z-10"></div>
            
            <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 text-primary-500 animate-spin" style={{ animationDuration: '8s' }} />
              <span>Active Cycle Trade Match</span>
            </h3>
            
            {/* Cycle Diagram representation */}
            <div className="space-y-6 relative">
              <div className="flex items-center space-x-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center font-bold text-white">A</div>
                <div>
                  <h4 className="font-semibold text-white">Alice (You)</h4>
                  <p className="text-xs text-gray-400">Offers: React Development</p>
                </div>
                <div className="ml-auto text-primary-400 text-xs">Sends 2h</div>
              </div>

              <div className="flex items-center space-x-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="h-10 w-10 rounded-full bg-secondary-600 flex items-center justify-center font-bold text-white">B</div>
                <div>
                  <h4 className="font-semibold text-white">Bob</h4>
                  <p className="text-xs text-gray-400">Offers: French Tutoring</p>
                </div>
                <div className="ml-auto text-secondary-400 text-xs">Sends 1h</div>
              </div>

              <div className="flex items-center space-x-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="h-10 w-10 rounded-full bg-violet-600 flex items-center justify-center font-bold text-white">C</div>
                <div>
                  <h4 className="font-semibold text-white">Charlie</h4>
                  <p className="text-xs text-gray-400">Offers: Guitar Lessons</p>
                </div>
                <div className="ml-auto text-violet-400 text-xs">Sends 1h</div>
              </div>

              {/* Connecting Loop Overlay */}
              <div className="absolute left-9 top-4 bottom-4 w-[2px] bg-gradient-to-b from-primary-500 via-secondary-500 to-violet-500 -z-10"></div>
            </div>
            
            <div className="mt-6 text-center text-xs text-gray-400 bg-gray-900/50 py-2 rounded-lg">
              Perfect 3-way swap loop matching your skill wants!
            </div>
          </div>
        </div>
      </main>

      <section id="how-it-works" className="py-20 border-t border-white/5">
        <h2 className="text-3xl font-bold text-center text-white mb-12">The TimeTrade Network</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-6 rounded-2xl">
            <div className="h-12 w-12 rounded-xl bg-primary-950/50 border border-primary-500/30 flex items-center justify-center text-primary-400 mb-4">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Time-Credit Currency</h3>
            <p className="text-gray-400 text-sm">
              All transactions are recorded in hours. Provide a service to earn time credits, and spend your credits to receive services from others.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="h-12 w-12 rounded-xl bg-secondary-950/50 border border-secondary-500/30 flex items-center justify-center text-secondary-400 mb-4">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Cycle-Detection Matching</h3>
            <p className="text-gray-400 text-sm">
              Can't swap directly? Our smart algorithm builds directed trade cycles (3+ people) where everyone's wants and offers link together.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="h-12 w-12 rounded-xl bg-violet-950/50 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Double-Entry Ledger</h3>
            <p className="text-gray-400 text-sm">
              A highly secured ledger tracks transaction histories, credit transfers, ratings, and basic disputes to protect trust and accountability.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 pt-8 text-center text-gray-500 text-xs">
        <p>&copy; {new Date().getFullYear()} TimeTrade Inc. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Landing;
