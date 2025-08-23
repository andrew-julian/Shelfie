export interface BookDemoItem {
  title: string;
  author: string;
  w: number; // width in mm
  h: number; // height in mm
  t: number; // thickness in mm
  cover: string;
}

// Sample books with realistic dimensions and covers for demo shelf
export const demoBooksData: BookDemoItem[] = [
  {
    title: "Capital in the Twenty-First Century",
    author: "Thomas Piketty",
    w: 156,
    h: 234,
    t: 35,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='156' height='234' viewBox='0 0 156 234'%3E%3Crect width='156' height='234' fill='%23ffffff' stroke='%23dc2626' stroke-width='3'/%3E%3Ctext x='50%25' y='20%25' dominant-baseline='middle' text-anchor='middle' fill='%23dc2626' font-family='serif' font-size='14' font-weight='bold'%3ECAPITAL%3C/text%3E%3Ctext x='50%25' y='30%25' dominant-baseline='middle' text-anchor='middle' fill='%23000' font-family='serif' font-size='10'%3Ein the Twenty-First Century%3C/text%3E%3Ctext x='50%25' y='80%25' dominant-baseline='middle' text-anchor='middle' fill='%23000' font-family='serif' font-size='12' font-weight='bold'%3ETHOMAS%3C/text%3E%3Ctext x='50%25' y='85%25' dominant-baseline='middle' text-anchor='middle' fill='%23000' font-family='serif' font-size='12' font-weight='bold'%3EPIKETTY%3C/text%3E%3C/svg%3E"
  },
  {
    title: "Capital: Karl Marx",
    author: "Karl Marx",
    w: 129,
    h: 198,
    t: 28,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='129' height='198' viewBox='0 0 129 198'%3E%3Crect width='129' height='198' fill='%23dc2626'/%3E%3Ctext x='50%25' y='25%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='sans-serif' font-size='16' font-weight='bold'%3ECAPITAL%3C/text%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='sans-serif' font-size='20' font-weight='bold'%3EKARL%3C/text%3E%3Ctext x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='sans-serif' font-size='20' font-weight='bold'%3EMARX%3C/text%3E%3C/svg%3E"
  },
  {
    title: "The Underground Railroad",
    author: "Colson Whitehead",
    w: 140,
    h: 210,
    t: 24,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='210' viewBox='0 0 140 210'%3E%3Crect width='140' height='210' fill='%23ea580c'/%3E%3Cpath d='M20,40 Q70,20 120,40 Q70,60 20,40' fill='%23fbbf24'/%3E%3Cpath d='M20,80 Q70,60 120,80 Q70,100 20,80' fill='%23fbbf24'/%3E%3Ctext x='50%25' y='25%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='10' font-weight='bold'%3ECOLSON%3C/text%3E%3Ctext x='50%25' y='150%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='9'%3EWHITEHEAD%3C/text%3E%3C/svg%3E"
  },
  {
    title: "The Rise and Fall of American Growth",
    author: "Robert J. Gordon",
    w: 155,
    h: 235,
    t: 40,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='155' height='235' viewBox='0 0 155 235'%3E%3Crect width='155' height='235' fill='%23475569'/%3E%3Ctext x='50%25' y='20%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='12' font-weight='bold'%3ETHE RISE%3C/text%3E%3Ctext x='50%25' y='25%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='10'%3EAND%3C/text%3E%3Ctext x='50%25' y='30%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='12' font-weight='bold'%3EFALL OF%3C/text%3E%3Ctext x='50%25' y='35%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='12' font-weight='bold'%3EAMERICAN%3C/text%3E%3Ctext x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='12' font-weight='bold'%3EGROWTH%3C/text%3E%3C/svg%3E"
  },
  {
    title: "Invitation to a Banquet",
    author: "Fuchsia Dunlop",
    w: 145,
    h: 222,
    t: 22,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='145' height='222' viewBox='0 0 145 222'%3E%3Crect width='145' height='222' fill='%23eab308'/%3E%3Ctext x='50%25' y='25%25' dominant-baseline='middle' text-anchor='middle' fill='%23000' font-family='serif' font-size='11' font-weight='bold'%3EInvitation%3C/text%3E%3Ctext x='50%25' y='30%25' dominant-baseline='middle' text-anchor='middle' fill='%23000' font-family='serif' font-size='11' font-weight='bold'%3Eto a%3C/text%3E%3Ctext x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' fill='%23000' font-family='serif' font-size='16' font-weight='bold'%3EBanquet%3C/text%3E%3Ctext x='50%25' y='75%25' dominant-baseline='middle' text-anchor='middle' fill='%23000' font-family='serif' font-size='10'%3EFUCHSIA DUNLOP%3C/text%3E%3C/svg%3E"
  },
  {
    title: "Titan: The Life of John D. Rockefeller",
    author: "Ron Chernow",
    w: 135,
    h: 203,
    t: 30,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='135' height='203' viewBox='0 0 135 203'%3E%3Crect width='135' height='203' fill='%23059669'/%3E%3Ctext x='50%25' y='30%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='18' font-weight='bold'%3ETITAN%3C/text%3E%3Ctext x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='8'%3ETHE LIFE OF%3C/text%3E%3Ctext x='50%25' y='45%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='10' font-weight='bold'%3EJOHN D. ROCKEFELLER%3C/text%3E%3Ctext x='50%25' y='75%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='10'%3ERON CHERNOW%3C/text%3E%3C/svg%3E"
  },
  {
    title: "Grant",
    author: "Ron Chernow",
    w: 156,
    h: 234,
    t: 35,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='156' height='234' viewBox='0 0 156 234'%3E%3Crect width='156' height='234' fill='%23000'/%3E%3Ctext x='50%25' y='75%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='32' font-weight='bold'%3EGRANT%3C/text%3E%3Ctext x='50%25' y='85%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='12'%3ERON CHERNOW%3C/text%3E%3C/svg%3E"
  },
  {
    title: "Alexander Hamilton",
    author: "Ron Chernow",
    w: 135,
    h: 203,
    t: 28,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='135' height='203' viewBox='0 0 135 203'%3E%3Crect width='135' height='203' fill='%23f59e0b'/%3E%3Ctext x='50%25' y='30%25' dominant-baseline='middle' text-anchor='middle' fill='%23000' font-family='serif' font-size='12' font-weight='bold'%3EALEXANDER%3C/text%3E%3Ctext x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' fill='%23000' font-family='serif' font-size='16' font-weight='bold'%3EHAMILTON%3C/text%3E%3Ctext x='50%25' y='75%25' dominant-baseline='middle' text-anchor='middle' fill='%23000' font-family='serif' font-size='10'%3ERON CHERNOW%3C/text%3E%3C/svg%3E"
  },
  {
    title: "The House of Morgan",
    author: "Ron Chernow",
    w: 140,
    h: 210,
    t: 32,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='210' viewBox='0 0 140 210'%3E%3Crect width='140' height='210' fill='%23374151'/%3E%3Ctext x='50%25' y='30%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='12' font-weight='bold'%3ETHE%3C/text%3E%3Ctext x='50%25' y='40%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='16' font-weight='bold'%3EHOUSE%3C/text%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='12' font-weight='bold'%3EOF%3C/text%3E%3Ctext x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='16' font-weight='bold'%3EMORGAN%3C/text%3E%3C/svg%3E"
  },
  {
    title: "Palo Alto",
    author: "Malcolm Harris",
    w: 152,
    h: 229,
    t: 26,
    cover: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='152' height='229' viewBox='0 0 152 229'%3E%3Crect width='152' height='229' fill='%2306b6d4'/%3E%3Ctext x='50%25' y='35%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='sans-serif' font-size='20' font-weight='bold'%3EPALO%3C/text%3E%3Ctext x='50%25' y='45%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='sans-serif' font-size='20' font-weight='bold'%3EALTO%3C/text%3E%3Ctext x='50%25' y='75%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='serif' font-size='10'%3EMALCOLM HARRIS%3C/text%3E%3C/svg%3E"
  }
];