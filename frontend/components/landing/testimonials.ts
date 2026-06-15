export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  location: string;
  avatar?: string;
  initials?: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "sandra",
    quote: "Recuperamos a Rocky en Playa Grande en 15 minutos.",
    name: "Sandra",
    location: "Punta Mogotes",
    avatar: "/assets/sandra-punta-mogotes.png",
  },
  {
    id: "martin",
    quote: "Encontraron a Nina cerca del Bristol en menos de media hora.",
    name: "Martín",
    location: "La Perla",
    initials: "M",
  },
  {
    id: "carla",
    quote: "El chat interno es genial, nadie vio mi número.",
    name: "Carla",
    location: "Güemes",
    initials: "C",
  },
  {
    id: "diego",
    quote: "La chapita QR nos salvó un domingo de pánico.",
    name: "Diego",
    location: "Centro",
    initials: "D",
  },
  {
    id: "lucia",
    quote: "Honey nos avisó mientras estábamos en la playa.",
    name: "Lucía",
    location: "Stella Maris",
    initials: "L",
  },
];
