/**
 * Default brand assets for the three NOC companies.
 * Stored values from the admin settings DB take precedence; these are
 * used only when a field is empty (lets the admin always override).
 */

export const DEFAULT_LOGOS = {
  vizva:
    "https://egvjgtfjstxgszpzvvbx.supabase.co/storage/v1/object/public/images/20250611_1634_3D%20Logo%20Design_remix_01jxgb3x1qebfa2hsxw7sdagw1%20(1).png",
  silverspace:
    "https://egvjgtfjstxgszpzvvbx.supabase.co/storage/v1/object/public/images/20250610_1111_3D%20Gradient%20Logo_remix_01jxd69dc9ex29jbj9r701yjkf%20(2).png",
  /* Vizva-UK shares Vizva's brand by default; admin can upload a UK-specific
     logo via Admin → Company Profiles. */
  "vizva-uk":
    "https://egvjgtfjstxgszpzvvbx.supabase.co/storage/v1/object/public/images/20250611_1634_3D%20Logo%20Design_remix_01jxgb3x1qebfa2hsxw7sdagw1%20(1).png",
  flawless: "",
};

/* Same signature is used as the default for all three companies until
   the admin uploads a per-company override in the Signatory section. */
export const DEFAULT_SIGNATURE_URL = "/default-signature.svg";

export function defaultLogoFor(slug) {
  return DEFAULT_LOGOS[slug] || "";
}

export function defaultSignatureFor(_slug) {
  return DEFAULT_SIGNATURE_URL;
}
