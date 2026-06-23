import { FaEnvelope, FaLinkedin, FaPhone, FaTwitter } from 'react-icons/fa';

export default function SiteFooter() {
  return (
    <footer className='mt-20 border-t border-zinc-800 py-8 text-sm text-zinc-400'>
      <div className='flex flex-col items-center gap-4 sm:flex-row sm:justify-between'>
        <div className='flex flex-col items-center gap-3 sm:items-start'>
          <div className='flex items-center justify-center gap-5'>
            <a
              href='mailto:contact@pulsesoft.io'
              className='inline-flex items-center gap-2 hover:text-blue-300'
            >
              <FaEnvelope />
              contact@pulsesoft.io
            </a>
            <a
              href='tel:+17329077250'
              className='inline-flex items-center gap-2 hover:text-blue-300'
            >
              <FaPhone />
              +1 (732) 907-7250
            </a>
          </div>

          <div className='flex items-center justify-center gap-5'>
            <a
              href='https://www.linkedin.com/company/pulsesoft-llc/?lipi=urn%3Ali%3Apage%3Ad_flagship3_search_srp_companies%3BjxZAri7mRAKhcuujKmGByw%3D%3D'
              className='inline-flex items-center gap-2 hover:text-blue-300'
            >
              <FaLinkedin />
              LinkedIn
            </a>
            {/* <a
              href='#'
              className='inline-flex items-center gap-2 hover:text-blue-300'
            >
              <FaTwitter />X / Twitter
            </a> */}
          </div>
        </div>
        <p className='text-center sm:text-right'>
          © 2026 PulseSoft LLC. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
