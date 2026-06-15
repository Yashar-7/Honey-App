"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Card } from "@/components/ui/card";
import { TESTIMONIALS, type Testimonial } from "./testimonials";

const MARQUEE_DURATION = 45;

function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <Card className="w-[min(100vw-3rem,320px)] shrink-0 border-border bg-card p-5 sm:w-[340px] sm:p-6">
      <div className="flex items-start gap-4">
        {item.avatar ? (
          <img
            src={item.avatar}
            alt={`${item.name}, ${item.location}`}
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-honey/30"
            decoding="async"
            draggable={false}
          />
        ) : (
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-honey/15 text-lg font-bold text-honey ring-2 ring-honey/20"
            aria-hidden="true"
          >
            {item.initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm leading-relaxed text-white/90">
            &ldquo;{item.quote}&rdquo;
          </p>
          <p className="mt-2 text-xs font-semibold text-muted">
            {item.name} · {item.location}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function TestimonialsMarquee() {
  const controls = useAnimationControls();
  const trackRef = useRef<HTMLDivElement>(null);
  const items = [...TESTIMONIALS, ...TESTIMONIALS];

  const startMarquee = () => {
    controls.start({
      x: "-50%",
      transition: {
        duration: MARQUEE_DURATION,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop",
      },
    });
  };

  useEffect(() => {
    startMarquee();
    return () => controls.stop();
  }, [controls]);

  return (
    <div
      className="relative mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
      onMouseEnter={() => controls.stop()}
      onMouseLeave={startMarquee}
      aria-label="Valoraciones de dueños en Mar del Plata"
      role="region"
    >
      <motion.div
        ref={trackRef}
        className="flex w-max gap-4 px-2"
        animate={controls}
        initial={{ x: "0%" }}
      >
        {items.map((item, index) => (
          <TestimonialCard key={`${item.id}-${index}`} item={item} />
        ))}
      </motion.div>
    </div>
  );
}
