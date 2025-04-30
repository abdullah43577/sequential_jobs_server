import { Request, Response } from "express";

interface SubdomainToCountry {
  ng: string;
  gh: string;
  ae: string;
  gb: string;
  ca: string;
  ke: string;
  ph: string;
}

export const getDomainHost = function (req: Request) {
  // Get the hostname from the request
  const hostname = req.headers.host || "";

  if (hostname.includes(".sequentialjobs.com")) {
    const subdomain = hostname.split(".")[0] as keyof SubdomainToCountry;

    // Map subdomain to country code
    const subdomainToCountry: SubdomainToCountry = {
      ng: "Nigeria",
      gh: "Ghana",
      ae: "United Arab Emirates",
      gb: "United Kingdom",
      ca: "Canada",
      ke: "Kenya",
      ph: "Philippines",
    };

    return subdomainToCountry[subdomain] || null;
  }

  return null;
};
