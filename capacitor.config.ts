import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.dompetkita.app",
  appName: "Dompet Kita",
  webDir: "out",
  plugins: {
    SocialLogin: {
      providers: {
        google: true,
        apple: false,
        facebook: false,
        twitter: false,
        linkedin: false,
        tiktok: false,
        telegram: false,
      },
    },
  },
};

export default config;
