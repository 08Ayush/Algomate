'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface PageLoaderProps {
  message?: string;
  subMessage?: string;
  size?: 'sm' | 'md' | 'lg';
}

function Ring({ size, delay, direction = 1 }: { size: number; delay: number; direction?: 1 | -1 }) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        border: '2.5px solid transparent',
        background: `linear-gradient(#fff 0 0) padding-box,
          conic-gradient(from 0deg, #4D869C 0%, #CDE8E5 40%, transparent 60%, #7AB2B2 80%, #4D869C 100%) border-box`,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}
      animate={{ rotate: direction === 1 ? 360 : -360 }}
      transition={{ duration: 2.5 + delay, repeat: Infinity, ease: 'linear' }}
    />
  );
}

function LoaderCore({ message = 'Loading...', subMessage, size = 'md' }: PageLoaderProps) {
  const isLg = size === 'lg';
  const isSm = size === 'sm';
  const center = isLg ? 110 : isSm ? 60 : 85;
  const logoBox = isLg ? 56 : isSm ? 32 : 44;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Ring system */}
      <div className="relative" style={{ width: center, height: center }}>
        {/* Glow */}
        <motion.div
          className="absolute rounded-full"
          style={{
            inset: 0,
            background: 'radial-gradient(circle, rgba(77,134,156,0.18) 30%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        <Ring size={center} delay={0} direction={1} />
        <Ring size={center * 0.78} delay={0.4} direction={-1} />
        <Ring size={center * 0.56} delay={0.8} direction={1} />

        {/* Center icon */}
        <motion.div
          className="absolute rounded-full flex items-center justify-center shadow-lg"
          style={{
            width: logoBox,
            height: logoBox,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, #4D869C 0%, #7AB2B2 100%)',
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg width={logoBox * 0.55} height={logoBox * 0.55} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="1.5" fill="white" />
            <path d="M12 4.5v3.5M12 16v3.5M4.5 12H8M16 12h3.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" />
            <motion.path
              d="M9.5 9.5L11 13.5L12 11L13 13.5L14.5 9.5L12 11Z"
              fill="white"
              animate={{ rotate: [0, 8, -8, 0] }}
              style={{ transformOrigin: '12px 12px' }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </svg>
        </motion.div>

        {/* Orbiting dots */}
        {[0, 90, 180, 270].map((deg, i) => {
          const r = center * 0.46;
          const rad = (deg * Math.PI) / 180;
          const x = center / 2 + r * Math.cos(rad) - 3;
          const y = center / 2 + r * Math.sin(rad) - 3;
          return (
            <motion.span
              key={deg}
              className="absolute block rounded-full"
              style={{
                width: 6,
                height: 6,
                background: i % 2 === 0 ? '#4D869C' : '#7AB2B2',
                left: x,
                top: y,
                transformOrigin: `${-(center / 2 - x - 3)}px ${-(center / 2 - y - 3)}px`,
              }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: 'linear' }}
            />
          );
        })}
      </div>

      {/* Text */}
      <div className="text-center space-y-1.5">
        <motion.p
          className={`font-semibold text-gray-700 ${isLg ? 'text-base' : isSm ? 'text-xs' : 'text-sm'}`}
          animate={{ opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          {message}
        </motion.p>
        {subMessage && (
          <motion.p
            className={`text-gray-400 ${isSm ? 'text-[10px]' : 'text-xs'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {subMessage}
          </motion.p>
        )}
        <div className="flex justify-center gap-1.5 pt-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block rounded-full"
              style={{ width: 5, height: 5, background: '#4D869C' }}
              animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: i * 0.18 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Full-screen route-segment loader (use in Next.js loading.tsx) */
export function PageLoader({ message = 'Loading...', subMessage, size = 'lg' }: PageLoaderProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #CDE8E5 0%, #EEF7FF 45%, #b8d8d8 100%)' }}
    >
      {/* Background bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {([
          { w: 320, t: '8%',  l: '3%',  op: 0.06, dur: 5.5 },
          { w: 180, t: '65%', l: '78%', op: 0.08, dur: 4.2 },
          { w: 240, t: '25%', l: '68%', op: 0.05, dur: 6.1 },
          { w: 140, t: '72%', l: '12%', op: 0.07, dur: 4.8 },
          { w: 200, t: '42%', l: '40%', op: 0.04, dur: 5.0 },
        ] as Array<{ w: number; t: string; l: string; op: number; dur: number }>).map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ width: p.w, height: p.w, top: p.t, left: p.l, background: `rgba(77,134,156,${p.op})` }}
            animate={{ y: [0, -20, 0], opacity: [p.op, p.op * 2, p.op] }}
            transition={{ duration: p.dur, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
          />
        ))}
      </div>

      {/* Glass card */}
      <motion.div
        className="relative flex flex-col items-center gap-0 rounded-3xl px-14 py-12 shadow-2xl"
        style={{
          background: 'rgba(255,255,255,0.68)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(77,134,156,0.18)',
        }}
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Brand */}
        <motion.div
          className="flex items-center gap-2 mb-7"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow"
            style={{ background: 'linear-gradient(135deg, #4D869C, #7AB2B2)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.8" />
              <path d="M9.5 9.5L11 13.5L12 11L13 13.5L14.5 9.5L12 11Z" fill="white" />
            </svg>
          </div>
          <span className="font-bold text-base tracking-tight" style={{ color: '#4D869C' }}>
            Algomate
          </span>
        </motion.div>

        <LoaderCore message={message} subMessage={subMessage} size={size} />
      </motion.div>
    </div>
  );
}

/** In-page card loader */
export function CardLoader({ message = 'Loading...', subMessage, size = 'md' }: PageLoaderProps) {
  return (
    <div className="w-full flex items-center justify-center py-16">
      <LoaderCore message={message} subMessage={subMessage} size={size} />
    </div>
  );
}

/** Tiny inline spinner */
export function SpinnerLoader({ size = 'sm', message }: { size?: 'sm' | 'md'; message?: string }) {
  const dim = size === 'md' ? 28 : 18;
  return (
    <span className="inline-flex items-center gap-2">
      <motion.span
        className="inline-block rounded-full"
        style={{
          width: dim,
          height: dim,
          border: `2.5px solid rgba(77,134,156,0.2)`,
          borderTopColor: '#4D869C',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}
      />
      {message && <span className="text-sm text-gray-500">{message}</span>}
    </span>
  );
}

/** Full-screen overlay for async actions */
export function OverlayLoader({ message = 'Processing...', visible }: { message?: string; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(5px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center"
            style={{ border: '1px solid rgba(77,134,156,0.18)' }}
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.88, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <LoaderCore message={message} size="md" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PageLoader;
