import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        brand: {
          start: "#3B4FD4",
          end: "#E0607E",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #3B4FD4 0%, #E0607E 100%)",
        "brand-gradient-hover":
          "linear-gradient(135deg, #4a5ee0 0%, #e87292 100%)",
      },
    },
  },
};

export default config;
