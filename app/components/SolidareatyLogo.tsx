import type { SVGProps } from "react";

type SolidareatyLogoProps = SVGProps<SVGSVGElement> & {
  decorative?: boolean;
};

/** Animated Solidareaty community-network mark, derived from the user's supplied SVG. */
export default function SolidareatyLogo({
  decorative = false,
  className,
  ...props
}: SolidareatyLogoProps) {
  return (
    <svg
      viewBox="0 0 360 100"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Solidareaty — The Community Network"}
      aria-hidden={decorative ? true : undefined}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {!decorative && <title>Solidareaty — The Community Network</title>}
      <defs>
        <linearGradient id="solidareaty-wordmark" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#29343C" />
          <stop offset="1" stopColor="#73818C" />
        </linearGradient>
        <path id="solid-flow-up-1" d="M50 50 L50 14" />
        <path id="solid-flow-down-1" d="M50 14 L50 50" />
        <path id="solid-flow-up-2" d="M50 50 L81.2 28.5" />
        <path id="solid-flow-down-2" d="M81.2 28.5 L50 50" />
        <path id="solid-flow-up-3" d="M50 50 L69.4 81.5" />
        <path id="solid-flow-down-3" d="M69.4 81.5 L50 50" />
        <path id="solid-flow-up-4" d="M50 50 L30.6 81.5" />
        <path id="solid-flow-down-4" d="M30.6 81.5 L50 50" />
        <path id="solid-flow-up-5" d="M50 50 L18.8 28.5" />
        <path id="solid-flow-down-5" d="M18.8 28.5 L50 50" />
      </defs>
      <g transform="translate(5 0)">
        <circle cx="50" cy="50" r="36" fill="none" stroke="#FAC796" strokeWidth="2" strokeDasharray="3 3" />
        <path d="M50 50 50 14M50 50 81.2 28.5M50 50 69.4 81.5M50 50 30.6 81.5M50 50 18.8 28.5" fill="none" stroke="#FAC796" strokeOpacity=".65" strokeWidth="1.5" />
        <circle r="3" fill="#E69F5C"><animateMotion dur="2s" repeatCount="indefinite"><mpath href="#solid-flow-up-1" /></animateMotion></circle>
        <circle r="2.5" fill="#9F5358"><animateMotion dur="2.5s" repeatCount="indefinite"><mpath href="#solid-flow-down-1" /></animateMotion></circle>
        <circle r="3" fill="#E69F5C"><animateMotion dur="2.2s" begin=".4s" repeatCount="indefinite"><mpath href="#solid-flow-up-2" /></animateMotion></circle>
        <circle r="2.5" fill="#DC8175"><animateMotion dur="2.7s" begin=".3s" repeatCount="indefinite"><mpath href="#solid-flow-down-2" /></animateMotion></circle>
        <circle r="3" fill="#E69F5C"><animateMotion dur="2.1s" begin=".8s" repeatCount="indefinite"><mpath href="#solid-flow-up-3" /></animateMotion></circle>
        <circle r="2.5" fill="#73818C"><animateMotion dur="2.4s" begin=".6s" repeatCount="indefinite"><mpath href="#solid-flow-down-3" /></animateMotion></circle>
        <circle r="3" fill="#E69F5C"><animateMotion dur="2.3s" begin="1.2s" repeatCount="indefinite"><mpath href="#solid-flow-up-4" /></animateMotion></circle>
        <circle r="2.5" fill="#9F5358"><animateMotion dur="2.6s" begin=".9s" repeatCount="indefinite"><mpath href="#solid-flow-down-4" /></animateMotion></circle>
        <circle r="3" fill="#E69F5C"><animateMotion dur="2s" begin="1.6s" repeatCount="indefinite"><mpath href="#solid-flow-up-5" /></animateMotion></circle>
        <circle r="2.5" fill="#DC8175"><animateMotion dur="2.2s" begin="1.2s" repeatCount="indefinite"><mpath href="#solid-flow-down-5" /></animateMotion></circle>
        <circle cx="50" cy="50" r="9" fill="#29343C" />
        <circle cx="50" cy="50" r="4" fill="#E69F5C">
          <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="50" cy="14" r="4.5" fill="#E69F5C" />
        <circle cx="81.2" cy="28.5" r="4.5" fill="#FAC796" />
        <circle cx="69.4" cy="81.5" r="4.5" fill="#DC8175" />
        <circle cx="30.6" cy="81.5" r="4.5" fill="#9F5358" />
        <circle cx="18.8" cy="28.5" r="4.5" fill="#73818C" />
      </g>
      <text x="115" y="58" fontSize="27" fontWeight="900" fill="url(#solidareaty-wordmark)" letterSpacing="-.8" fontFamily="Arial, Helvetica, sans-serif">
        Solidar<tspan fill="#E69F5C">eaty</tspan><tspan fill="#9F5358">.</tspan>
      </text>
      <text x="117" y="78" fontSize="8" fontWeight="800" fill="#73818C" letterSpacing="2.1" fontFamily="Arial, Helvetica, sans-serif">
        THE COMMUNITY NETWORK
      </text>
    </svg>
  );
}
