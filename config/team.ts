/**
 * Leadership team shown on the About page.
 * Every field can be set from the environment; by default a neutral SVG avatar is used.
 *
 * To use a real photo: put the file in /public/images/team/ (e.g. ceo.jpg) and set
 *   NEXT_PUBLIC_TEAM_CEO_IMAGE=/images/team/ceo.jpg
 * (a full https:// URL also works). Leave it empty to keep the default SVG.
 */
const env = (value: string | undefined, fallback: string) =>
  value && value.trim() ? value.trim() : fallback;

export const teamConfig = [
  {
    name: env(process.env.NEXT_PUBLIC_TEAM_CEO_NAME, "Chief Executive"),
    role: env(process.env.NEXT_PUBLIC_TEAM_CEO_ROLE, "CEO & Founder"),
    description: env(
      process.env.NEXT_PUBLIC_TEAM_CEO_DESCRIPTION,
      "Leading our vision of fresh, affordable groceries for every home"
    ),
    image: env(process.env.NEXT_PUBLIC_TEAM_CEO_IMAGE, "/images/team/ceo.svg"),
  },
  {
    name: env(process.env.NEXT_PUBLIC_TEAM_CTO_NAME, "Chief Technology Officer"),
    role: env(process.env.NEXT_PUBLIC_TEAM_CTO_ROLE, "CTO"),
    description: env(
      process.env.NEXT_PUBLIC_TEAM_CTO_DESCRIPTION,
      "Driving the technology behind our online store"
    ),
    image: env(process.env.NEXT_PUBLIC_TEAM_CTO_IMAGE, "/images/team/cto.svg"),
  },
  {
    name: env(process.env.NEXT_PUBLIC_TEAM_DESIGN_NAME, "Design Lead"),
    role: env(process.env.NEXT_PUBLIC_TEAM_DESIGN_ROLE, "Head of Design"),
    description: env(
      process.env.NEXT_PUBLIC_TEAM_DESIGN_DESCRIPTION,
      "Creating a simple, friendly shopping experience"
    ),
    image: env(
      process.env.NEXT_PUBLIC_TEAM_DESIGN_IMAGE,
      "/images/team/design.svg"
    ),
  },
];
