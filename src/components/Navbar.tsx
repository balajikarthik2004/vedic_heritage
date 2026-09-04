import { useState } from 'react';
import logoImg from '../assets/logo.png';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-[0_1px_8px_rgba(0,0,0,0.07)] relative z-40">
      <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between h-[70px]">
        {/* ── Logo + Brand Name ── */}
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="Vedic Heritage Logo"
            className="w-12 h-12 object-contain"
          />
          <div className="leading-[1.2]">
            <div className="text-[15px] font-black text-[#c97d1e] tracking-[0.12em] font-['Outfit',sans-serif]">
              VEDIC HERITAGE
            </div>
            <div className="text-[8.5px] font-bold text-gray-400 tracking-[0.28em] mt-px uppercase font-['Outfit',sans-serif]">
              HANUMAN MANDIR
            </div>
          </div>
        </div>

        {/* ── Desktop Nav Links ── */}
        <div className="hidden md:flex items-center gap-9">
          {[
            { label: 'Home', active: true },
            { label: 'Artist', active: false },
            { label: 'About the event', active: false },
            { label: 'Sponsorship', active: false },
          ].map(({ label, active }) => (
            <a
              key={label}
              href="#"
              className={`text-[13.5px] font-semibold tracking-[0.01em] font-['Outfit',sans-serif] transition-colors duration-200 no-underline ${
                active ? 'text-[#e98314]' : 'text-gray-600 hover:text-[#e98314]'
              }`}
            >
              {label}
            </a>
          ))}

          {/* Book Now button */}
          <button className="bg-[#e98314] text-white border-none rounded-full px-6 py-2.5 text-[13px] font-bold tracking-[0.04em] cursor-pointer font-['Outfit',sans-serif] shadow-[0_4px_16px_rgba(233,131,20,0.38)] transition-all duration-200 hover:bg-[#d07210] hover:-translate-y-px">
            Book Now
          </button>
        </div>

        {/* ── Mobile Hamburger ── */}
        <button
          className="md:hidden bg-transparent border-none cursor-pointer p-1.5"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <div className="w-[22px] h-[2px] bg-gray-600 mb-[5px] rounded-[2px]" />
          <div className="w-[22px] h-[2px] bg-gray-600 mb-[5px] rounded-[2px]" />
          <div className="w-[22px] h-[2px] bg-gray-600 rounded-[2px]" />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="bg-white border-t border-gray-100 py-4 px-8 flex flex-col gap-3.5 md:hidden">
          {['Home', 'Artist', 'About the event', 'Sponsorship'].map(label => (
            <a
              key={label}
              href="#"
              className={`text-sm font-semibold no-underline ${
                label === 'Home' ? 'text-[#e98314]' : 'text-gray-600'
              }`}
            >
              {label}
            </a>
          ))}
          <button className="bg-[#e98314] text-white border-none rounded-full px-6 py-2.5 text-[13px] font-bold cursor-pointer self-start">
            Book Now
          </button>
        </div>
      )}
    </nav>
  );
}
