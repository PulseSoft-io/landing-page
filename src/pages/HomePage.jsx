import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import BackToTopButton from '../components/common/BackToTopButton';
import SiteFooter from '../components/layout/SiteFooter';
import SiteHeader from '../components/layout/SiteHeader';
import LandingSections from '../components/sections/LandingSections';

import {
  faqs,
  features,
  integrations,
  pricing,
  services,
  showcases,
  stats,
  team,
  testimonials,
  workflowSteps,
} from '../data/landingData';

import { useAutoRotate } from '../hooks/useAutoRotate';
import { useRevealOnScroll } from '../hooks/useRevealOnScroll';
import { useScrollState } from '../hooks/useScrollState';
import useCarousel from '../hooks/useCarousel';

function HomePage() {
  const location = useLocation();

  const [annualBilling, setAnnualBilling] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const showcaseCarousel = useCarousel(showcases.length);

  useRevealOnScroll();

  const { isScrolled, showTopButton } = useScrollState();

  useAutoRotate(setActiveTestimonial, testimonials.length, 4500);

  useEffect(() => {
    if (!location.hash) return;

    const id = location.hash.substring(1);

    const scroll = () => {
      const element = document.getElementById(id);

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    };

    requestAnimationFrame(scroll);

    const timeout = setTimeout(scroll, 150);

    return () => clearTimeout(timeout);
  }, [location]);

  return (
    <div className='relative min-h-screen overflow-hidden bg-black text-zinc-100'>
      <div className='glow glow-cyan' />
      <div className='glow glow-violet' />
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]' />

      <div className='mx-auto max-w-6xl px-6 py-24 lg:px-8'>
        <SiteHeader
          isScrolled={isScrolled}
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen(prev => !prev)}
          onCloseMenu={() => setMenuOpen(false)}
        />

        <LandingSections
          stats={stats}
          workflowSteps={workflowSteps}
          services={services}
          showcases={showcases}
          showcaseCarousel={showcaseCarousel}
          features={features}
          testimonials={testimonials}
          activeTestimonial={activeTestimonial}
          setActiveTestimonial={setActiveTestimonial}
          integrations={integrations}
          pricing={pricing}
          annualBilling={annualBilling}
          setAnnualBilling={setAnnualBilling}
          team={team}
          faqs={faqs}
          openFaq={openFaq}
          setOpenFaq={setOpenFaq}
        />

        <SiteFooter />
      </div>

      <BackToTopButton show={showTopButton} />
    </div>
  );
}

export default HomePage;
