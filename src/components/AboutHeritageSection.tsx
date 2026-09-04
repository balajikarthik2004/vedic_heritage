import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * Carousel images. Every file dropped into src/assets/slide is picked up here
 * automatically at build time and sorted by filename - no code change needed to
 * add or remove a slide. swami-guru.png lives in that folder too, so it is one
 * of the slides rather than a special case.
 */
const slideImages: string[] = Object.entries(
  import.meta.glob<string>('../assets/slide/*.{png,jpg,jpeg,webp,avif}', {
    eager: true,
    import: 'default',
  })
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, src]) => src);

const AUTOPLAY_MS = 5000;

export interface AboutHeritageSectionProps {
  onExploreClick?: () => void;
}

export const AboutHeritageSection: React.FC<AboutHeritageSectionProps> = ({
  onExploreClick,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const totalSlides = slideImages.length;

  // Advance on a timer. Clicking a dot resets the countdown because activeSlide
  // is in the dependency list, so the interval is torn down and restarted.
  useEffect(() => {
    if (totalSlides < 2) return;

    const timer = setInterval(
      () => setActiveSlide((current) => (current + 1) % totalSlides),
      AUTOPLAY_MS
    );

    return () => clearInterval(timer);
  }, [activeSlide, totalSlides]);

  const highlights = [
    'Daily Arti',
    'Sunderkand Havan',
    'Bhajans & Katha',
    'Festivals',
    'Community',
  ];

  return (
    <section className="w-full bg-[#FFFFFF] py-4 sm:py-6 md:py-8 px-2 sm:px-4 md:px-6">
      <div className="w-full max-w-[1340px] mx-auto">

        {/*
          Main card, straight off the Figma layout panel:
            width 1340 - gap 80 - padding 100
            radius: top-left 182, bottom-left 40, bottom-right 40, top-right 0 (sharp)
            border-left 12px, border-right 12px, no top or bottom border

          The two coloured strokes ARE the card's own left and right borders. Because the
          top and bottom borders are zero-width, each stroke tapers away to nothing as it
          sweeps through a rounded corner - that taper is what produces the yellow's sweep
          out of the top-left and the orange's turn into the bottom-right.
        */}
        <div className="relative bg-[#FFECD6] rounded-tl-[64px] sm:rounded-tl-[110px] lg:rounded-tl-[146px] xl:rounded-tl-[182px] rounded-tr-none rounded-bl-[20px] sm:rounded-bl-[30px] xl:rounded-bl-[40px] rounded-br-[20px] sm:rounded-br-[30px] xl:rounded-br-[40px] border-y-0 border-l-[6px] sm:border-l-[8px] xl:border-l-[12px] border-l-[#FFD238] border-r-[6px] sm:border-r-[8px] xl:border-r-[12px] border-r-[#F07B00] p-4 sm:p-6 md:p-8 lg:p-10 xl:px-[100px] xl:py-[64px] shadow-sm flex flex-col justify-center">

          {/*
            Figma auto-layout: a fixed 390px image column, the text column fills the rest,
            80px gap. Those exact numbers only fit from ~1340px up, so below xl the image
            column narrows and the gap tightens - otherwise the 100px padding would squeeze
            the text column to ~314px at 1024 and wreck the badge row and paragraph.
          */}
          <div className="relative z-20 grid grid-cols-1 lg:grid-cols-[288px_minmax(0,1fr)] gap-8 lg:gap-16 xl:gap-[80px] items-center justify-items-center lg:justify-items-start">

            {/* Left Column: Heading + Guru Portrait */}
            <div className="flex flex-col items-start">
              <h3 className="font-['Alga','Bodoni_Moda','Playfair_Display',Georgia,serif] text-2xl sm:text-3xl lg:text-[24px] xl:text-[36px] text-[#2F2A24] mb-4 font-normal tracking-tight leading-[1.15] text-left">
                About <br />
                Vedic Heritage!
              </h3>

              {/* Image Carousel: slides crossfade, one stacked <img> per file */}
              <div
                className="relative overflow-hidden group bg-[#FDF2E6]"
                style={{
                  width: '288px',
                  height: '288px',
                  borderTopLeftRadius: '4px',
                  borderTopRightRadius: '93px',
                  borderBottomRightRadius: '24px',
                  borderBottomLeftRadius: '24px'
                }}
              >
                {slideImages.map((src, idx) => (
                  <img
                    key={src}
                    src={src}
                    alt={`Vedic Heritage temple life, image ${idx + 1} of ${totalSlides}`}
                    aria-hidden={idx !== activeSlide}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className={`absolute inset-0 w-full h-full object-cover object-top transform transition-all duration-700 ease-out group-hover:scale-105 ${idx === activeSlide ? 'opacity-100' : 'opacity-0'
                      }`}
                  />
                ))}

                {/* Short bottom scrim: keeps the pagination dots legible without dulling the portrait */}
                <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />

                {/* Carousel Pagination Dots */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-1.5 z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
                  {Array.from({ length: totalSlides }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveSlide(idx)}
                      aria-label={`Go to slide ${idx + 1}`}
                      className={`transition-all duration-300 rounded-full cursor-pointer ${idx === activeSlide
                        ? 'w-3 h-3 bg-white shadow-md ring-2 ring-white/50'
                        : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/90'
                        }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Information, Badges & CTA */}
            <div className="flex flex-col space-y-4 text-left">
              <div>
                {/*
                  Both lines share one type scale - in the design they are the same size and
                  only the weight differs. They had drifted apart (h4 at 48px vs h2 at 36px),
                  which inverted the hierarchy on tablet.
                */}
                <h4 className="font-['Outfit',sans-serif] text-xl sm:text-2xl md:text-3xl lg:text-[28px] xl:text-[32px] font-medium text-[#2F2A24] tracking-tight">
                  More Than a Temple.
                </h4>
                <h2 className="font-['Outfit',sans-serif] text-2xl sm:text-3xl md:text-4xl lg:text-[36px] xl:text-[40px] font-black text-[#140E0A] leading-[1.15] mt-1 tracking-tight">
                  A Living Heritage.
                </h2>
              </div>

              {/* 3 Badges */}
              <div className="flex flex-wrap gap-3 sm:gap-4 items-center">

                {/* Badge 1: Rooted in tradition with Stepped Temple Shikhara Icon */}
                <div className="inline-flex items-center gap-3 bg-[#FFFFFF] pl-2 pr-5 py-2 rounded-full shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 rounded-full bg-[#FFECD6] flex items-center justify-center shrink-0">
                    <svg
                      className="w-[18px] h-[18px] text-[#F07B00]"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Spire + kalash finial */}
                      <path d="M12 1.2l1 1.9h-2l1-1.9Z" />
                      <circle cx="12" cy="4.2" r="1" />
                      {/* Stepped gopuram tiers */}
                      <path d="M10.5 5.9h3l.5 1.7h-4l.5-1.7Z" />
                      <path d="M9.2 8.5h5.6l.6 2.1H8.6l.6-2.1Z" />
                      <path d="M7.7 11.5h8.6l.7 2.3H7l.7-2.3Z" />
                      {/* Sanctum base with arched doorway and plinth */}
                      <path d="M6 14.7h12v5.1h-4v-2.9a2 2 0 0 0-4 0v2.9H6v-5.1Z" />
                      <path d="M4.9 20.6h14.2v1.6H4.9v-1.6Z" />
                    </svg>
                  </div>
                  <span className="text-xs sm:text-[13px] font-bold text-[#2F2A24] leading-tight">
                    Rooted in <br /> tradition
                  </span>
                </div>

                {/* Badge 2: Guided by devotion */}
                <div className="inline-flex items-center gap-3 bg-[#FFFFFF] pl-2 pr-5 py-2 rounded-full shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 rounded-full bg-[#FFECD6] flex items-center justify-center shrink-0">
                    <span className="text-[#F07B00] text-[13px] font-semibold leading-none">1</span>
                  </div>
                  <span className="text-xs sm:text-[13px] font-bold text-[#2F2A24] leading-tight">
                    Guided by <br /> devotion
                  </span>
                </div>

                {/* Badge 3: United as one community */}
                <div className="inline-flex items-center gap-3 bg-[#FFFFFF] pl-2 pr-5 py-2 rounded-full shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 rounded-full bg-[#FFECD6] flex items-center justify-center shrink-0">
                    <span className="text-[#F07B00] text-[13px] font-semibold leading-none">1</span>
                  </div>
                  <span className="text-xs sm:text-[13px] font-bold text-[#2F2A24] leading-tight">
                    United as one <br /> community.
                  </span>
                </div>

              </div>

              {/* Description Paragraph - Bold/Medium font style per user request */}
              <p className="font-['Outfit',sans-serif] text-[#2F2A24] text-xs sm:text-sm leading-[1.65] font-medium">
                Vedic Heritage is a sacred space in Long Island, New York, where devotion, culture,
                and community come together. Home to Sri Hanuman Temple and Sri Shiv Shakti Mandir,
                we preserve and celebrate India&apos;s timeless spiritual traditions through daily
                worship, sacred rituals, vibrant festivals, cultural programs, and community gatherings.
              </p>

              {/* Highlights row with small crisp dot design */}
              {/* Plain static labels - not links, no hover state, muted gray per the design */}
              <div className="font-['Outfit',sans-serif] flex flex-wrap items-center text-xs sm:text-sm font-medium text-[#7A736C]">
                {highlights.map((item, idx) => (
                  <React.Fragment key={item}>
                    <span>{item}</span>
                    {idx < highlights.length - 1 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F07B00] inline-block mx-3.5 shrink-0 select-none" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Explore Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onExploreClick}
                  className="group inline-flex items-center justify-center gap-2.5 bg-[#ED7E00] hover:bg-[#D96B00] text-[#FFFFFF] font-bold text-xs sm:text-sm uppercase tracking-wider px-5 sm:px-7 py-3.5 rounded-[14px] shadow-md hover:shadow-lg transform active:scale-98 transition-all duration-200 cursor-pointer"
                >
                  <span className="whitespace-nowrap">EXPLORE VEDIC HERITAGE</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutHeritageSection;
