export interface BookDemoItem {
  title: string;
  author: string;
  w: number; // width in mm
  h: number; // height in mm
  t: number; // thickness in mm
  cover: string;
}

// Sample books with realistic dimensions for demo shelf
export const demoBooksData: BookDemoItem[] = [
  {
    title: "Stolen Focus",
    author: "Johann Hari",
    w: 129,
    h: 198,
    t: 22,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='129' height='198' viewBox='0 0 129 198'%3E%3Crect width='129' height='198' fill='%23E74C3C'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='12' font-weight='bold'%3EStolen Focus%3C/text%3E%3C/svg%3E"
  },
  {
    title: "Horology",
    author: "Remi Casteran",
    w: 170,
    h: 240,
    t: 30,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='170' height='240' viewBox='0 0 170 240'%3E%3Crect width='170' height='240' fill='%232C3E50'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='14' font-weight='bold'%3EHorology%3C/text%3E%3C/svg%3E"
  },
  {
    title: "The Thursday Murder Club",
    author: "Richard Osman",
    w: 110,
    h: 180,
    t: 18,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='180' viewBox='0 0 110 180'%3E%3Crect width='110' height='180' fill='%23F39C12'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='10' font-weight='bold'%3EThursday Murder Club%3C/text%3E%3C/svg%3E"
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    w: 140,
    h: 210,
    t: 25,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='210' viewBox='0 0 140 210'%3E%3Crect width='140' height='210' fill='%2327AE60'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='12' font-weight='bold'%3EAtomic Habits%3C/text%3E%3C/svg%3E"
  },
  {
    title: "Project Hail Mary",
    author: "Andy Weir",
    w: 125,
    h: 195,
    t: 20,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='125' height='195' viewBox='0 0 125 195'%3E%3Crect width='125' height='195' fill='%238E44AD'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='11' font-weight='bold'%3EProject Hail Mary%3C/text%3E%3C/svg%3E"
  },
  {
    title: "Klara and the Sun",
    author: "Kazuo Ishiguro",
    w: 135,
    h: 205,
    t: 23,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='135' height='205' viewBox='0 0 135 205'%3E%3Crect width='135' height='205' fill='%23E67E22'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='11' font-weight='bold'%3EKlara and the Sun%3C/text%3E%3C/svg%3E"
  },
  {
    title: "The Seven Husbands of Evelyn Hugo",
    author: "Taylor Jenkins Reid",
    w: 105,
    h: 175,
    t: 16,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='105' height='175' viewBox='0 0 105 175'%3E%3Crect width='105' height='175' fill='%23D35400'/%3E%3Ctext x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='9' font-weight='bold'%3EThe Seven Husbands%3C/text%3E%3Ctext x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='9' font-weight='bold'%3Eof Evelyn Hugo%3C/text%3E%3C/svg%3E"
  },
  {
    title: "The Midnight Library",
    author: "Matt Haig",
    w: 130,
    h: 200,
    t: 21,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='130' height='200' viewBox='0 0 130 200'%3E%3Crect width='130' height='200' fill='%2334495E'/%3E%3Ctext x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='11' font-weight='bold'%3EThe Midnight%3C/text%3E%3Ctext x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='11' font-weight='bold'%3ELibrary%3C/text%3E%3C/svg%3E"
  },
  {
    title: "Educated",
    author: "Tara Westover",
    w: 145,
    h: 215,
    t: 28,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='145' height='215' viewBox='0 0 145 215'%3E%3Crect width='145' height='215' fill='%23C0392B'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='13' font-weight='bold'%3EEducated%3C/text%3E%3C/svg%3E"
  },
  {
    title: "The Silent Patient",
    author: "Alex Michaelides",
    w: 120,
    h: 190,
    t: 19,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='190' viewBox='0 0 120 190'%3E%3Crect width='120' height='190' fill='%2316A085'/%3E%3Ctext x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='10' font-weight='bold'%3EThe Silent%3C/text%3E%3Ctext x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='10' font-weight='bold'%3EPatient%3C/text%3E%3C/svg%3E"
  }
];