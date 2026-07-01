import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaEnvelope } from 'react-icons/fa';

export default function SiteHeader({
  isScrolled,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateToSection = section => {
    onCloseMenu?.();

    if (location.pathname === '/') {
      const element = document.getElementById(section);

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });

        window.history.replaceState(null, '', `/#${section}`);
      }

      return;
    }

    navigate(`/#${section}`);
  };

  return (
    <>
      <header
        className={`fixed left-1/2 top-0 z-50 mt-3 flex w-[min(95%,72rem)] -translate-x-1/2 items-center justify-between rounded-2xl border px-4 py-3 backdrop-blur-xl transition-all duration-300 ${
          isScrolled
            ? 'border-blue-400/30 bg-black/85 shadow-xl shadow-blue-500/10'
            : 'border-zinc-800/80 bg-zinc-900/70 hover:border-zinc-700'
        }`}
      >
        <Link
          to='/'
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className='flex items-center gap-3 transition hover:text-blue-300'
        >
          <span className='text-lg font-semibold tracking-wide'>PulseSoft</span>
        </Link>

        <nav className='hidden items-center gap-6 text-sm text-zinc-300 md:flex'>
          <button
            onClick={() => navigateToSection('features')}
            className='transition hover:text-blue-300'
          >
            Services
          </button>

          <button
            onClick={() => navigateToSection('case-studies')}
            className='transition hover:text-blue-300'
          >
            Case Studies
          </button>

          <button
            onClick={() => navigateToSection('pricing')}
            className='transition hover:text-blue-300'
          >
            Approach
          </button>

          <button
            onClick={() => navigateToSection('faq')}
            className='transition hover:text-blue-300'
          >
            FAQ
          </button>

          <Link to='/blog' className='transition hover:text-blue-300'>
            Blog
          </Link>
        </nav>

        <button
          onClick={onToggleMenu}
          className='mr-2 cursor-pointer rounded-lg border border-zinc-700 px-3 py-2 text-xs transition hover:border-blue-400 md:hidden'
        >
          <span className='flex items-center gap-2'>
            <FaBars />
            Menu
          </span>
        </button>

        <button
          onClick={() => (window.location.href = 'mailto:contact@pulsesoft.io')}
          className='hidden cursor-pointer rounded-lg border border-zinc-700 px-5 py-2 text-sm font-medium transition hover:border-blue-400 hover:text-blue-300 md:inline-flex md:items-center md:gap-2'
        >
          <FaEnvelope />
          Book a Consultation
        </button>
      </header>

      {menuOpen && (
        <div className='fixed left-1/2 top-20 z-40 w-[min(95%,72rem)] -translate-x-1/2 rounded-2xl border border-zinc-800 bg-zinc-900/95 p-4 md:hidden'>
          <div className='flex flex-col gap-3 text-sm text-zinc-300'>
            <button
              onClick={() => navigateToSection('features')}
              className='text-left transition hover:text-blue-300'
            >
              Services
            </button>

            <button
              onClick={() => navigateToSection('case-studies')}
              className='text-left transition hover:text-blue-300'
            >
              Case Studies
            </button>

            <button
              onClick={() => navigateToSection('pricing')}
              className='text-left transition hover:text-blue-300'
            >
              Approach
            </button>

            <button
              onClick={() => navigateToSection('faq')}
              className='text-left transition hover:text-blue-300'
            >
              FAQ
            </button>

            <Link
              to='/blog'
              onClick={onCloseMenu}
              className='transition hover:text-blue-300'
            >
              Blog
            </Link>

            <button
              onClick={() => {
                onCloseMenu();
                window.location.href = 'mailto:contact@pulsesoft.io';
              }}
              className='mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-400'
            >
              <FaEnvelope />
              Book a Consultation
            </button>
          </div>
        </div>
      )}
    </>
  );
}
