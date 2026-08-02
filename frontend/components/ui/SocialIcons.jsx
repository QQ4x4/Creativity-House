export const Whatsapp = (props) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" {...props}>
      <path d="M12.004 0C5.378 0 .004 5.373.004 12c0 2.112.546 4.17 1.587 5.973L0 24l6.19-1.623A11.966 11.966 0 0012.004 24c6.626 0 12-5.373 12-12s-5.374-12-12-12zm6.753 16.974c-.263.742-1.526 1.349-2.1 1.423-.574.073-1.077.29-3.593-.75-3.218-1.328-5.281-4.6-5.441-4.814-.16-.215-1.293-1.721-1.293-3.284 0-1.563.812-2.33 1.1-2.616.29-.286.63-.357.84-.357.21 0 .42.002.6-.007.19-.009.45-.078.7.525.263.633.9 2.193.978 2.352.078.158.13.342.026.55-.104.21-.157.34-.314.524-.157.185-.33.41-.47.55-.157.15-.32.314-.136.63.184.313.82 1.353 1.76 2.19.144.13.275.25.394.35 1.208 1.01 2.268 1.49 3.09 1.832.262.11.5.21.723.29.3.1.58.083.8-.15.286-.299.7-.769.9-.966.2-.197.4-.167.68-.066.28.1 1.76.83 2.06.98.3.15.5.22.57.35.07.13.07.75-.19 1.49z" />
  </svg>
);

export const Facebook = (props) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export const Instagram = (props) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export const Linkedin = (props) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
  </svg>
);

export const Youtube = (props) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2a29 29 0 0 0-.46 5.33 29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
  </svg>
);

export const socialLinks = [
  { icon: Whatsapp, href: "https://wa.me/60312345678" },
  { icon: Facebook, href: "https://www.facebook.com/talaat.alawadhi.33" },
  { icon: Instagram, href: "https://www.instagram.com/the.creativity_house/" },
  { icon: Linkedin, href: "https://www.linkedin.com/in/talaat-alawadhi-%D8%B7%D9%84%D8%B9%D8%AA-%D8%A7%D9%84%D8%B9%D9%88%D8%A7%D8%B6%D9%8A-5b238823?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" },
  { icon: Youtube, href: "https://www.youtube.com/@talaatalawadhi2050" }
];
