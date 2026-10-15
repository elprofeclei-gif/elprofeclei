export function Logo() {
  return (
    <div className="flex items-center gap-1 font-code font-bold text-xl">
      <span className="text-vs-orange dark:text-vs-orange">&lt;</span>
      {/* Rostro de Robot Minimalista */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="4"
          y="6"
          width="16"
          height="12"
          rx="2"
          className="fill-vs-green/20 stroke-vs-green"
          strokeWidth="2"
        />
        <circle cx="9" cy="12" r="1.5" className="fill-vs-bg dark:fill-vs-bg" />
        <circle cx="15" cy="12" r="1.5" className="fill-vs-bg dark:fill-vs-bg" />
        <path d="M12 6V3" className="stroke-vs-blue" strokeWidth="2" />
        <circle cx="12" cy="2.5" r="1.5" className="fill-vs-blue" />
      </svg>
      <span className="text-vs-orange dark:text-vs-orange">&gt;</span>
      <span className="ml-2">
        <span className="text-vs-blue dark:text-vs-blue">el</span>
        <span className="text-vs-yellow dark:text-vs-yellow">profe</span>
        <span className="text-vs-orange dark:text-vs-orange">clei</span>
      </span>
    </div>
  );
}
