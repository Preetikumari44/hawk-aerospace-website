const HawkLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={28}
    height={28}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M16 2L26 16L16 14L6 16L16 2Z" fill="currentColor" />
    <path
      d="M16 14L26 16L16 30L16 14Z"
      fill="currentColor"
      fillOpacity="0.55"
    />
    <path
      d="M16 14L6 16L16 30L16 14Z"
      fill="currentColor"
      fillOpacity="0.8"
    />
  </svg>
);

export default HawkLogo;
