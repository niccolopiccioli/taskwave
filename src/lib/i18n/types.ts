export type Locale = 'en' | 'es' | 'fr' | 'it';

export type Messages = {
  nav: {
    features: string;
    pricing: string;
    about: string;
    contact: string;
    login: string;
    signup: string;
    signupShort: string;
    closeMenu: string;
    openMenu: string;
    mainNav: string;
    mobileMenu: string;
  };
  footer: {
    tagline: string;
    product: string;
    legal: string;
    features: string;
    pricing: string;
    about: string;
    docs: string;
    privacy: string;
    optOut: string;
    cookies: string;
    terms: string;
    rights: string;
  };
  landing: {
    heroTitle: string;
    heroSubtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    socialProof: string;
    colTodo: string;
    colProgress: string;
    colDone: string;
    featuresTitle: string;
    featuresSubtitle: string;
    exploreFeatures: string;
    testimonialsTitle: string;
    testimonialsSubtitle: string;
    features: Array<{ title: string; description: string; benefit: string }>;
    testimonials: Array<{ name: string; role: string; company: string; quote: string }>;
  };
  dashboard: {
    navigation: string;
    dashboard: string;
    docs: string;
    inviteTeam: string;
    inviteShort: string;
  };
  auth: {
    login: string;
    register: string;
  };
};
