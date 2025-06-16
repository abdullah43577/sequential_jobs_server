import { Request } from "express";

interface SubdomainToCountry {
  gb: string; // UK
  ca: string; // Canada
  ae: string; // UAE
  ng: string; // Nigeria
  za: string; // South Africa
  ke: string; // Kenya
  gh: string; // Ghana
  ug: string; // Uganda
  tz: string; // Tanzania
  ma: string; // Morocco
  tn: string; // Tunisia
  dz: string; // Algeria
  zw: string; // Zimbabwe
  ph: string; // Philippines
}

export const getDomainHost = function (req: Request) {
  // Get the hostname from the requests
  const hostname = req.headers.host || "";

  console.log(hostname, "host name here");

  if (hostname === "sequentialjobs.com") {
    return "United States";
  }

  if (hostname.includes(".sequentialjobs.com")) {
    const subdomain = hostname.split(".")[0] as keyof SubdomainToCountry;

    // Map subdomain to country code
    const subdomainToCountry: SubdomainToCountry = {
      gb: "United Kingdom",
      ca: "Canada",
      ae: "United Arab Emirates",
      ng: "Nigeria",
      za: "South Africa",
      ke: "Kenya",
      gh: "Ghana",
      ug: "Uganda",
      tz: "Tanzania",
      ma: "Morocco",
      tn: "Tunisia",
      dz: "Algeria",
      zw: "Zimbabwe",
      ph: "Philippines",
    };

    return subdomainToCountry[subdomain] || null;
  }

  return null;
};
