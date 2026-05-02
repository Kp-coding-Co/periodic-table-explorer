/* =============================================================================
   PERIODIC TABLE — DATA
   =============================================================================
   Pure-data module. Three element-keyed structures plus two display configs.
   Loaded before app.js. All names are attached to window so the rest of the
   codebase can use them as bare globals (same as before the split).

   ELEMENTS[]            — positional array, see field comment on its line
   ELEMENT_EXTRA{}       — supplemental fields per atomic number
   ELEMENT_ORIGIN{}      — nucleosynthetic origin per atomic number
   CATEGORIES{}          — category → {label, color} display map
   ORIGIN_CONFIG[]       — stardust chip ordering + labels
   ============================================================================= */

// Element data: [number, symbol, name, mass, category, group, period, electronConfig, electronegativity, meltingK, boilingK, density, discoveredBy, year, description]
const ELEMENTS = [
  [1,"H","Hydrogen",1.008,"nonmetal",1,1,"1s¹",2.20,13.99,20.271,0.00008988,"Henry Cavendish",1766,"The lightest and most abundant element in the universe, hydrogen powers the stars and forms the bulk of the cosmos. On Earth it appears almost exclusively in compounds, most notably water."],
  [2,"He","Helium",4.0026,"noble",18,1,"1s²",null,0.95,4.222,0.0001785,"Pierre Janssen",1868,"A noble gas first detected in the Sun's spectrum during a solar eclipse, hence the name from Helios. Inert, colourless, and the second most abundant element in the universe."],
  [3,"Li","Lithium",6.94,"alkali",1,2,"[He] 2s¹",0.98,453.65,1603,0.534,"Johan August Arfwedson",1817,"The lightest metal, soft enough to cut with a knife. Essential to modern rechargeable batteries and a long-standing treatment in psychiatric medicine."],
  [4,"Be","Beryllium",9.0122,"alkaline",2,2,"[He] 2s²",1.57,1560,2742,1.85,"Louis Nicolas Vauquelin",1798,"A rare, light, steel-grey metal. Used in aerospace and X-ray windows, but its dust is highly toxic to the lungs."],
  [5,"B","Boron",10.81,"metalloid",13,2,"[He] 2s² 2p¹",2.04,2349,4200,2.34,"Joseph Louis Gay-Lussac",1808,"A metalloid essential to plant life and central to borosilicate glass (Pyrex). Compounds include borax and boric acid."],
  [6,"C","Carbon",12.011,"nonmetal",14,2,"[He] 2s² 2p²",2.55,3823,4098,2.267,"Ancient",-3750,"The backbone of all known life. Appears as diamond, graphite, graphene, and fullerenes. Its bonding versatility makes organic chemistry possible."],
  [7,"N","Nitrogen",14.007,"nonmetal",15,2,"[He] 2s² 2p³",3.04,63.15,77.355,0.0012506,"Daniel Rutherford",1772,"Comprises 78% of Earth's atmosphere. Inert as N₂, but its compounds drive both fertilisers and explosives."],
  [8,"O","Oxygen",15.999,"nonmetal",16,2,"[He] 2s² 2p⁴",3.44,54.36,90.188,0.001429,"Carl Wilhelm Scheele",1771,"Essential to respiration and combustion, oxygen makes up 21% of our atmosphere and nearly half of Earth's crust by mass."],
  [9,"F","Fluorine",18.998,"halogen",17,2,"[He] 2s² 2p⁵",3.98,53.48,85.03,0.001696,"Henri Moissan",1886,"The most reactive and electronegative element. Pale yellow gas that attacks nearly anything it touches; essential to Teflon and toothpaste."],
  [10,"Ne","Neon",20.180,"noble",18,2,"[He] 2s² 2p⁶",null,24.56,27.104,0.0008999,"William Ramsay",1898,"A noble gas famous for its red-orange glow in discharge tubes — the colour of vintage signs in twentieth-century cities."],
  [11,"Na","Sodium",22.990,"alkali",1,3,"[Ne] 3s¹",0.93,370.944,1156.09,0.971,"Humphry Davy",1807,"A soft, silver-white alkali metal that reacts violently with water. Combines with chlorine to make common salt."],
  [12,"Mg","Magnesium",24.305,"alkaline",2,3,"[Ne] 3s²",1.31,923,1363,1.738,"Joseph Black",1755,"A light structural metal that burns with brilliant white flame. Central to chlorophyll and human metabolism."],
  [13,"Al","Aluminium",26.982,"post-transition",13,3,"[Ne] 3s² 3p¹",1.61,933.47,2743,2.70,"Hans Christian Ørsted",1825,"Earth's most abundant metal, yet so difficult to extract that it was once more valuable than gold. Now ubiquitous in cans and aircraft."],
  [14,"Si","Silicon",28.085,"metalloid",14,3,"[Ne] 3s² 3p²",1.90,1687,3538,2.3296,"Jöns Jakob Berzelius",1824,"The semiconductor that built the digital age. Second most abundant element in Earth's crust, primarily as silica and silicates."],
  [15,"P","Phosphorus",30.974,"nonmetal",15,3,"[Ne] 3s² 3p³",2.19,317.3,553.65,1.82,"Hennig Brand",1669,"Discovered by an alchemist boiling urine in search of gold. White phosphorus glows in the dark and ignites in air; essential to DNA and ATP."],
  [16,"S","Sulfur",32.06,"nonmetal",16,3,"[Ne] 3s² 3p⁴",2.58,388.36,717.8,2.067,"Ancient",-2000,"The biblical brimstone. A bright yellow nonmetal known since antiquity, central to gunpowder, vulcanised rubber, and sulphuric acid."],
  [17,"Cl","Chlorine",35.45,"halogen",17,3,"[Ne] 3s² 3p⁵",3.16,171.6,239.11,0.003214,"Carl Wilhelm Scheele",1774,"A pale green, choking gas. Used as a chemical weapon in WWI; today it disinfects water supplies and forms table salt with sodium."],
  [18,"Ar","Argon",39.95,"noble",18,3,"[Ne] 3s² 3p⁶",null,83.81,87.302,0.0017837,"Lord Rayleigh",1894,"The most abundant noble gas in Earth's atmosphere at nearly 1%. Used to fill incandescent bulbs and shield welding arcs."],
  [19,"K","Potassium",39.098,"alkali",1,4,"[Ar] 4s¹",0.82,336.7,1032,0.862,"Humphry Davy",1807,"A soft alkali metal essential to plant growth and human nerve function. Reacts vigorously with water, often igniting."],
  [20,"Ca","Calcium",40.078,"alkaline",2,4,"[Ar] 4s²",1.00,1115,1757,1.54,"Humphry Davy",1808,"The structural element of bone and shell. Limestone, marble, and chalk are all calcium carbonate."],
  [21,"Sc","Scandium",44.956,"transition",3,4,"[Ar] 3d¹ 4s²",1.36,1814,3109,2.989,"Lars Fredrik Nilson",1879,"A rare transition metal predicted by Mendeleev as 'eka-boron' before its discovery confirmed his table's predictive power."],
  [22,"Ti","Titanium",47.867,"transition",4,4,"[Ar] 3d² 4s²",1.54,1941,3560,4.506,"William Gregor",1791,"A strong, light, corrosion-resistant metal. Used in aerospace, medical implants, and white pigment (titanium dioxide)."],
  [23,"V","Vanadium",50.942,"transition",5,4,"[Ar] 3d³ 4s²",1.63,2183,3680,6.0,"Andrés Manuel del Río",1801,"Named for the Norse goddess Vanadís. Adds strength to steel and forms vivid coloured compounds across multiple oxidation states."],
  [24,"Cr","Chromium",51.996,"transition",6,4,"[Ar] 3d⁵ 4s¹",1.66,2180,2944,7.15,"Louis Nicolas Vauquelin",1797,"Source of chrome plating and stainless steel's corrosion resistance. Its name derives from the Greek for colour, owing to its vivid compounds."],
  [25,"Mn","Manganese",54.938,"transition",7,4,"[Ar] 3d⁵ 4s²",1.55,1519,2334,7.21,"Johan Gottlieb Gahn",1774,"Essential to steel production and human enzymes. Manganese nodules carpet portions of the deep ocean floor."],
  [26,"Fe","Iron",55.845,"transition",8,4,"[Ar] 3d⁶ 4s²",1.83,1811,3134,7.874,"Ancient",-5000,"The metal that defined an age. Forms Earth's molten core and the haemoglobin in our blood. The most common element on Earth by mass."],
  [27,"Co","Cobalt",58.933,"transition",9,4,"[Ar] 3d⁷ 4s²",1.88,1768,3200,8.90,"Georg Brandt",1735,"Source of deep blue glass and ceramic glazes for centuries. Essential to vitamin B₁₂ and modern lithium-ion batteries."],
  [28,"Ni","Nickel",58.693,"transition",10,4,"[Ar] 3d⁸ 4s²",1.91,1728,3003,8.908,"Axel Fredrik Cronstedt",1751,"A silvery transition metal central to stainless steel and rechargeable batteries. Coins, magnets, and meteorites are common sources."],
  [29,"Cu","Copper",63.546,"transition",11,4,"[Ar] 3d¹⁰ 4s¹",1.90,1357.77,2835,8.96,"Ancient",-9000,"Among the first metals worked by humans. Excellent conductor of heat and electricity; alloys with tin to form bronze."],
  [30,"Zn","Zinc",65.38,"transition",12,4,"[Ar] 3d¹⁰ 4s²",1.65,692.68,1180,7.14,"Andreas Sigismund Marggraf",1746,"Galvanises steel against rust. Essential trace nutrient for immune function. Alloys with copper to form brass."],
  [31,"Ga","Gallium",69.723,"post-transition",13,4,"[Ar] 3d¹⁰ 4s² 4p¹",1.81,302.9146,2673,5.91,"Lecoq de Boisbaudran",1875,"Famously melts in your hand at 30°C. Predicted by Mendeleev as 'eka-aluminium'; today essential to LEDs and semiconductors."],
  [32,"Ge","Germanium",72.630,"metalloid",14,4,"[Ar] 3d¹⁰ 4s² 4p²",2.01,1211.40,3106,5.323,"Clemens Winkler",1886,"A grey-white metalloid predicted by Mendeleev as 'eka-silicon'. Used in fibre optics and infrared optics."],
  [33,"As","Arsenic",74.922,"metalloid",15,4,"[Ar] 3d¹⁰ 4s² 4p³",2.18,1090,887,5.727,"Albertus Magnus",1250,"Notorious for its toxicity and history as a poison. Used in semiconductors and historically in pigments and pesticides."],
  [34,"Se","Selenium",78.971,"nonmetal",16,4,"[Ar] 3d¹⁰ 4s² 4p⁴",2.55,494,958,4.81,"Jöns Jakob Berzelius",1817,"Named for Selene, the Moon. A trace nutrient essential to thyroid function; its conductivity changes with light, enabling early photocopiers."],
  [35,"Br","Bromine",79.904,"halogen",17,4,"[Ar] 3d¹⁰ 4s² 4p⁵",2.96,265.8,332.0,3.1028,"Antoine Jérôme Balard",1826,"One of only two elements liquid at room temperature. Reddish-brown, corrosive, and named from the Greek for stench."],
  [36,"Kr","Krypton",83.798,"noble",18,4,"[Ar] 3d¹⁰ 4s² 4p⁶",3.00,115.78,119.93,0.003733,"William Ramsay",1898,"A noble gas used in high-performance lighting and once defined the metre via its emission spectrum."],
  [37,"Rb","Rubidium",85.468,"alkali",1,5,"[Kr] 5s¹",0.82,312.45,961,1.532,"Robert Bunsen",1861,"A soft, silvery alkali metal that ignites in air. Used in atomic clocks and certain forms of laser cooling research."],
  [38,"Sr","Strontium",87.62,"alkaline",2,5,"[Kr] 5s²",0.95,1050,1655,2.64,"William Cruickshank",1787,"Gives fireworks their crimson red colour. Strontium-90 is a hazardous fallout product from nuclear weapons."],
  [39,"Y","Yttrium",88.906,"transition",3,5,"[Kr] 4d¹ 5s²",1.22,1799,3203,4.472,"Johan Gadolin",1794,"Named for the Swedish village of Ytterby, which has lent its name to four elements. Used in red phosphors and superconductors."],
  [40,"Zr","Zirconium",91.224,"transition",4,5,"[Kr] 4d² 5s²",1.33,2128,4682,6.52,"Martin Heinrich Klaproth",1789,"Highly resistant to corrosion. Essential to nuclear reactor cladding and the gemstone cubic zirconia."],
  [41,"Nb","Niobium",92.906,"transition",5,5,"[Kr] 4d⁴ 5s¹",1.6,2750,5017,8.57,"Charles Hatchett",1801,"Named for Niobe, daughter of Tantalus. Used in superconducting magnets and high-strength steel alloys."],
  [42,"Mo","Molybdenum",95.95,"transition",6,5,"[Kr] 4d⁵ 5s¹",2.16,2896,4912,10.28,"Carl Wilhelm Scheele",1781,"A high-melting refractory metal that strengthens steel alloys. Essential trace nutrient in nitrogen-fixing enzymes."],
  [43,"Tc","Technetium",98,"transition",7,5,"[Kr] 4d⁵ 5s²",1.9,2430,4538,11,"Carlo Perrier",1937,"The first artificially produced element. All its isotopes are radioactive; widely used in medical imaging."],
  [44,"Ru","Ruthenium",101.07,"transition",8,5,"[Kr] 4d⁷ 5s¹",2.2,2607,4423,12.45,"Karl Ernst Claus",1844,"A platinum-group metal that hardens platinum and palladium alloys. Used in electrical contacts and chemotherapy drugs."],
  [45,"Rh","Rhodium",102.91,"transition",9,5,"[Kr] 4d⁸ 5s¹",2.28,2237,3968,12.41,"William Hyde Wollaston",1804,"One of the rarest and most expensive metals on Earth. Catalytic converters consume the bulk of global production."],
  [46,"Pd","Palladium",106.42,"transition",10,5,"[Kr] 4d¹⁰",2.20,1828.05,3236,12.023,"William Hyde Wollaston",1803,"Named for the asteroid Pallas. A platinum-group metal central to catalytic converters and hydrogen storage."],
  [47,"Ag","Silver",107.87,"transition",11,5,"[Kr] 4d¹⁰ 5s¹",1.93,1234.93,2435,10.49,"Ancient",-5000,"The most reflective metal and best electrical conductor known. Long valued in coinage, jewellery, and photography."],
  [48,"Cd","Cadmium",112.41,"transition",12,5,"[Kr] 4d¹⁰ 5s²",1.69,594.22,1040,8.65,"Friedrich Stromeyer",1817,"A toxic heavy metal used historically in yellow pigments and now mostly in rechargeable batteries (NiCd)."],
  [49,"In","Indium",114.82,"post-transition",13,5,"[Kr] 4d¹⁰ 5s² 5p¹",1.78,429.7485,2345,7.31,"Ferdinand Reich",1863,"A soft, silvery metal whose oxide gives touchscreens their transparent conductivity (indium tin oxide)."],
  [50,"Sn","Tin",118.71,"post-transition",14,5,"[Kr] 4d¹⁰ 5s² 5p²",1.96,505.08,2875,7.265,"Ancient",-3500,"Alloyed with copper to form bronze, ushering in the Bronze Age. Plates steel cans to prevent rust."],
  [51,"Sb","Antimony",121.76,"metalloid",15,5,"[Kr] 4d¹⁰ 5s² 5p³",2.05,903.78,1908,6.685,"Ancient",-3000,"Used as kohl eyeliner in antiquity and later in printing-press type alloys. A semiconductor and flame retardant."],
  [52,"Te","Tellurium",127.60,"metalloid",16,5,"[Kr] 4d¹⁰ 5s² 5p⁴",2.1,722.66,1261,6.232,"Franz-Joseph Müller",1782,"Named from Tellus, the Latin for Earth. Used in solar panels and to improve the machinability of steel."],
  [53,"I","Iodine",126.90,"halogen",17,5,"[Kr] 4d¹⁰ 5s² 5p⁵",2.66,386.85,457.4,4.933,"Bernard Courtois",1811,"A purple-black solid that sublimates into violet vapour. Essential to thyroid hormones; common antiseptic."],
  [54,"Xe","Xenon",131.29,"noble",18,5,"[Kr] 4d¹⁰ 5s² 5p⁶",2.6,161.40,165.051,0.005887,"William Ramsay",1898,"Once thought wholly inert, xenon was the first noble gas shown to form true compounds. Used in high-intensity lamps and ion thrusters."],
  [55,"Cs","Caesium",132.91,"alkali",1,6,"[Xe] 6s¹",0.79,301.7,944,1.93,"Robert Bunsen",1860,"Among the most reactive metals; melts just above room temperature. The second-based atomic clock is defined by caesium-133."],
  [56,"Ba","Barium",137.33,"alkaline",2,6,"[Xe] 6s²",0.89,1000,2118,3.51,"Humphry Davy",1808,"Gives fireworks their green colour. Barium sulphate is opaque to X-rays and used as a contrast medium for medical imaging."],
  [57,"La","Lanthanum",138.91,"lanthanide",3,6,"[Xe] 5d¹ 6s²",1.10,1193,3737,6.162,"Carl Gustaf Mosander",1839,"Namesake of the lanthanide series. Used in carbon arc lamps, hybrid car batteries, and high-quality optical glass."],
  [58,"Ce","Cerium",140.12,"lanthanide",null,6,"[Xe] 4f¹ 5d¹ 6s²",1.12,1068,3716,6.770,"Jöns Jakob Berzelius",1803,"Named after the dwarf planet Ceres. The most abundant rare earth element; used in catalytic converters and lighter flints."],
  [59,"Pr","Praseodymium",140.91,"lanthanide",null,6,"[Xe] 4f³ 6s²",1.13,1208,3793,6.77,"Carl Auer von Welsbach",1885,"Greek for 'green twin'. Used to colour glass and ceramics yellow-green; combined with neodymium in powerful magnets."],
  [60,"Nd","Neodymium",144.24,"lanthanide",null,6,"[Xe] 4f⁴ 6s²",1.14,1297,3347,7.01,"Carl Auer von Welsbach",1885,"Source of the most powerful permanent magnets known, found in headphones, hard drives, and wind turbines."],
  [61,"Pm","Promethium",145,"lanthanide",null,6,"[Xe] 4f⁵ 6s²",1.13,1315,3273,7.26,"Charles D. Coryell",1945,"Named for Prometheus. The only radioactive lanthanide; once used in glow-in-the-dark watch dials."],
  [62,"Sm","Samarium",150.36,"lanthanide",null,6,"[Xe] 4f⁶ 6s²",1.17,1345,2067,7.52,"Lecoq de Boisbaudran",1879,"Used in samarium-cobalt magnets that withstand high temperatures. The first element named after a person (the mineral discoverer Samarsky)."],
  [63,"Eu","Europium",151.96,"lanthanide",null,6,"[Xe] 4f⁷ 6s²",1.2,1099,1802,5.244,"Eugène-Anatole Demarçay",1901,"Named for Europe. Provides the red phosphor in colour television and the blue in fluorescent bulbs; key anti-counterfeiting marker in euro banknotes."],
  [64,"Gd","Gadolinium",157.25,"lanthanide",null,6,"[Xe] 4f⁷ 5d¹ 6s²",1.20,1585,3546,7.90,"Jean Charles Galissard",1880,"Strongly paramagnetic; used as a contrast agent in MRI scans and in nuclear reactor control rods."],
  [65,"Tb","Terbium",158.93,"lanthanide",null,6,"[Xe] 4f⁹ 6s²",1.2,1629,3503,8.23,"Carl Gustaf Mosander",1843,"Another element named for Ytterby, Sweden. Used in green phosphors for displays and in solid-state devices that change shape in magnetic fields."],
  [66,"Dy","Dysprosium",162.50,"lanthanide",null,6,"[Xe] 4f¹⁰ 6s²",1.22,1680,2840,8.540,"Lecoq de Boisbaudran",1886,"Greek for 'hard to obtain'. Critical to high-temperature magnets in electric vehicles and wind turbines."],
  [67,"Ho","Holmium",164.93,"lanthanide",null,6,"[Xe] 4f¹¹ 6s²",1.23,1734,2993,8.79,"Per Teodor Cleve",1878,"Has the highest magnetic permeability of any element. Used in the strongest artificial magnetic fields and in solid-state lasers."],
  [68,"Er","Erbium",167.26,"lanthanide",null,6,"[Xe] 4f¹² 6s²",1.24,1802,3141,9.066,"Carl Gustaf Mosander",1843,"Erbium-doped fibre amplifiers boost signals across the world's undersea cables, making the modern internet possible."],
  [69,"Tm","Thulium",168.93,"lanthanide",null,6,"[Xe] 4f¹³ 6s²",1.25,1818,2223,9.32,"Per Teodor Cleve",1879,"The least abundant naturally occurring lanthanide. Used in portable X-ray devices and high-power lasers."],
  [70,"Yb","Ytterbium",173.05,"lanthanide",null,6,"[Xe] 4f¹⁴ 6s²",1.1,1097,1469,6.90,"Jean Charles Galissard",1878,"The fourth and final element named after Ytterby, Sweden. Used in atomic clocks of extraordinary precision."],
  [71,"Lu","Lutetium",174.97,"lanthanide",3,6,"[Xe] 4f¹⁴ 5d¹ 6s²",1.27,1925,3675,9.841,"Carl Auer von Welsbach",1906,"Named for Lutetia, the Roman name for Paris. The hardest, densest, and rarest of the lanthanides."],
  [72,"Hf","Hafnium",178.49,"transition",4,6,"[Xe] 4f¹⁴ 5d² 6s²",1.3,2506,4876,13.31,"Dirk Coster",1923,"Named for Copenhagen (Hafnia). Crucial in nuclear reactor control rods due to its high neutron absorption."],
  [73,"Ta","Tantalum",180.95,"transition",5,6,"[Xe] 4f¹⁴ 5d³ 6s²",1.5,3290,5731,16.69,"Anders Gustaf Ekeberg",1802,"Named for Tantalus of Greek myth. Used in capacitors throughout consumer electronics; a major component of mobile phones."],
  [74,"W","Tungsten",183.84,"transition",6,6,"[Xe] 4f¹⁴ 5d⁴ 6s²",2.36,3695,6203,19.25,"Juan José Elhuyar",1783,"Has the highest melting point of any metal. Powers incandescent bulb filaments and the cutting edges of industrial tools."],
  [75,"Re","Rhenium",186.21,"transition",7,6,"[Xe] 4f¹⁴ 5d⁵ 6s²",1.9,3459,5869,21.02,"Walter Noddack",1925,"One of the rarest stable elements in Earth's crust. Used in jet engine turbine blades for its extreme heat resistance."],
  [76,"Os","Osmium",190.23,"transition",8,6,"[Xe] 4f¹⁴ 5d⁶ 6s²",2.2,3306,5285,22.59,"Smithson Tennant",1803,"The densest naturally occurring element. Used in fountain pen tips, electrical contacts, and as a hardener for platinum alloys."],
  [77,"Ir","Iridium",192.22,"transition",9,6,"[Xe] 4f¹⁴ 5d⁷ 6s²",2.20,2719,4403,22.56,"Smithson Tennant",1803,"Among the most corrosion-resistant metals known. Iridium-rich layers in geological strata mark the asteroid impact that ended the dinosaurs."],
  [78,"Pt","Platinum",195.08,"transition",10,6,"[Xe] 4f¹⁴ 5d⁹ 6s¹",2.28,2041.4,4098,21.45,"Antonio de Ulloa",1735,"A precious silvery-white metal more valuable than gold. Catalyses chemical reactions in cars and chemotherapy drugs."],
  [79,"Au","Gold",196.97,"transition",11,6,"[Xe] 4f¹⁴ 5d¹⁰ 6s¹",2.54,1337.33,3243,19.3,"Ancient",-6000,"The metal of monarchs, currency, and circuit boards. Highly malleable and one of the few elements found pure in nature."],
  [80,"Hg","Mercury",200.59,"transition",12,6,"[Xe] 4f¹⁴ 5d¹⁰ 6s²",2.00,234.321,629.88,13.534,"Ancient",-1500,"The only metal liquid at room temperature. Once used in thermometers and barometers; now restricted due to its toxicity."],
  [81,"Tl","Thallium",204.38,"post-transition",13,6,"[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹",1.62,577,1746,11.85,"William Crookes",1861,"A soft, highly toxic metal favoured historically by poisoners. Used today in specialised glass and infrared detectors."],
  [82,"Pb","Lead",207.2,"post-transition",14,6,"[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²",2.33,600.61,2022,11.34,"Ancient",-7000,"The dense, soft metal of Roman plumbing (whence the name plumbing). Toxic and now removed from petrol, paint, and pipes wherever possible."],
  [83,"Bi","Bismuth",208.98,"post-transition",15,6,"[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³",2.02,544.7,1837,9.78,"Ancient",-1500,"Forms iridescent, geometric crystals. Used in cosmetics, low-melting alloys, and Pepto-Bismol."],
  [84,"Po","Polonium",209,"post-transition",16,6,"[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴",2.0,527,1235,9.196,"Marie Curie",1898,"Named by Marie Curie for her native Poland. Intensely radioactive; infamous as the agent in the 2006 poisoning of Alexander Litvinenko."],
  [85,"At","Astatine",210,"halogen",17,6,"[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵",2.2,575,610,6.35,"Dale R. Corson",1940,"The rarest naturally occurring element on Earth — only fractions of a gram exist in the entire crust. All isotopes are radioactive."],
  [86,"Rn","Radon",222,"noble",18,6,"[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶",null,202,211.5,0.00973,"Friedrich Ernst Dorn",1900,"A radioactive noble gas seeping from uranium-bearing rocks. A leading cause of lung cancer in non-smokers."],
  [87,"Fr","Francium",223,"alkali",1,7,"[Rn] 7s¹",0.7,300,950,1.87,"Marguerite Perey",1939,"The second rarest naturally occurring element. So radioactive that no visible quantity has ever been assembled."],
  [88,"Ra","Radium",226,"alkaline",2,7,"[Rn] 7s²",0.9,1233,2010,5.5,"Marie Curie",1898,"Discovered by the Curies. Once painted onto watch dials before its dangers were understood; the source of the original 'radioactive' branding."],
  [89,"Ac","Actinium",227,"actinide",3,7,"[Rn] 6d¹ 7s²",1.1,1500,3471,10.0,"André-Louis Debierne",1899,"Namesake of the actinide series. Glows pale blue in the dark from its own radioactivity."],
  [90,"Th","Thorium",232.04,"actinide",null,7,"[Rn] 6d² 7s²",1.3,2023,5061,11.7,"Jöns Jakob Berzelius",1828,"Named for the Norse god Thor. A potential nuclear fuel three times more abundant than uranium."],
  [91,"Pa","Protactinium",231.04,"actinide",null,7,"[Rn] 5f² 6d¹ 7s²",1.5,1841,4300,15.37,"Otto Hahn",1913,"One of the rarest and costliest naturally occurring elements. Highly toxic and intensely radioactive."],
  [92,"U","Uranium",238.03,"actinide",null,7,"[Rn] 5f³ 6d¹ 7s²",1.38,1405.3,4404,19.1,"Martin Heinrich Klaproth",1789,"Named for the planet Uranus, discovered eight years earlier. Powers nuclear reactors and atomic weapons; once used to colour glass."],
  [93,"Np","Neptunium",237,"actinide",null,7,"[Rn] 5f⁴ 6d¹ 7s²",1.36,917,4273,20.45,"Edwin McMillan",1940,"The first transuranium element produced. Named for Neptune, the planet beyond Uranus."],
  [94,"Pu","Plutonium",244,"actinide",null,7,"[Rn] 5f⁶ 7s²",1.28,912.5,3505,19.85,"Glenn T. Seaborg",1940,"Named for Pluto. Created in nuclear reactors; powers space probes and the warhead of the Nagasaki bomb."],
  [95,"Am","Americium",243,"actinide",null,7,"[Rn] 5f⁷ 7s²",1.13,1449,2880,12,"Glenn T. Seaborg",1944,"Named for the Americas. The radioactive heart of common household smoke detectors."],
  [96,"Cm","Curium",247,"actinide",null,7,"[Rn] 5f⁷ 6d¹ 7s²",1.28,1613,3383,13.51,"Glenn T. Seaborg",1944,"Named for Marie and Pierre Curie. Powers some spacecraft and supplies energy to scientific instruments on Mars rovers."],
  [97,"Bk","Berkelium",247,"actinide",null,7,"[Rn] 5f⁹ 7s²",1.3,1259,2900,14.78,"Glenn T. Seaborg",1949,"Named for Berkeley, California. Used to synthesise heavier elements in particle accelerators."],
  [98,"Cf","Californium",251,"actinide",null,7,"[Rn] 5f¹⁰ 7s²",1.3,1173,1743,15.1,"Glenn T. Seaborg",1950,"A powerful neutron source used to start nuclear reactors and locate gold and silver ore deposits."],
  [99,"Es","Einsteinium",252,"actinide",null,7,"[Rn] 5f¹¹ 7s²",1.3,1133,1269,8.84,"Albert Ghiorso",1952,"Discovered in fallout from the first hydrogen bomb test. Named in honour of Albert Einstein."],
  [100,"Fm","Fermium",257,"actinide",null,7,"[Rn] 5f¹² 7s²",1.3,1800,null,9.7,"Albert Ghiorso",1952,"Last element produced by neutron capture; everything heavier requires particle accelerators. Named for Enrico Fermi."],
  [101,"Md","Mendelevium",258,"actinide",null,7,"[Rn] 5f¹³ 7s²",1.3,1100,null,10.3,"Albert Ghiorso",1955,"Named in honour of Dmitri Mendeleev, the architect of the periodic table itself."],
  [102,"No","Nobelium",259,"actinide",null,7,"[Rn] 5f¹⁴ 7s²",1.3,1100,null,9.9,"Albert Ghiorso",1966,"Named for Alfred Nobel. Only ever produced in trace amounts for research purposes."],
  [103,"Lr","Lawrencium",266,"actinide",3,7,"[Rn] 5f¹⁴ 7s² 7p¹",1.3,1900,null,15.6,"Albert Ghiorso",1961,"Named for Ernest Lawrence, inventor of the cyclotron. The last actinide on the table."],
  [104,"Rf","Rutherfordium",267,"transition",4,7,"[Rn] 5f¹⁴ 6d² 7s²",null,2400,5800,23.2,"JINR / LBNL",1964,"Named for Ernest Rutherford. The first transactinide element, with isotopes lasting only minutes."],
  [105,"Db","Dubnium",268,"transition",5,7,"[Rn] 5f¹⁴ 6d³ 7s²",null,null,null,29.3,"JINR / LBNL",1968,"Named for Dubna, Russia, site of the Joint Institute for Nuclear Research."],
  [106,"Sg","Seaborgium",269,"transition",6,7,"[Rn] 5f¹⁴ 6d⁴ 7s²",null,null,null,35.0,"LBNL",1974,"Named for Glenn Seaborg, the only person honoured this way during their lifetime."],
  [107,"Bh","Bohrium",270,"transition",7,7,"[Rn] 5f¹⁴ 6d⁵ 7s²",null,null,null,37.1,"GSI",1981,"Named for Niels Bohr. Synthesised by bombarding bismuth with chromium nuclei."],
  [108,"Hs","Hassium",269,"transition",8,7,"[Rn] 5f¹⁴ 6d⁶ 7s²",null,null,null,40.7,"GSI",1984,"Named after the German state of Hesse. One of the densest elements ever produced."],
  [109,"Mt","Meitnerium",278,"transition",9,7,"[Rn] 5f¹⁴ 6d⁷ 7s²",null,null,null,37.4,"GSI",1982,"Named for Lise Meitner, the physicist who explained nuclear fission."],
  [110,"Ds","Darmstadtium",281,"transition",10,7,"[Rn] 5f¹⁴ 6d⁸ 7s²",null,null,null,34.8,"GSI",1994,"Named for Darmstadt, Germany, where it was first synthesised."],
  [111,"Rg","Roentgenium",282,"transition",11,7,"[Rn] 5f¹⁴ 6d⁹ 7s²",null,null,null,28.7,"GSI",1994,"Named for Wilhelm Röntgen, who discovered X-rays."],
  [112,"Cn","Copernicium",285,"transition",12,7,"[Rn] 5f¹⁴ 6d¹⁰ 7s²",null,null,357,23.7,"GSI",1996,"Named for Nicolaus Copernicus. Predicted to be a liquid at room temperature, like mercury."],
  [113,"Nh","Nihonium",286,"post-transition",13,7,"[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹",null,700,1430,16,"RIKEN",2004,"The first element discovered in Asia; named for Japan (Nihon). Synthesised in Saitama Prefecture."],
  [114,"Fl","Flerovium",289,"post-transition",14,7,"[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²",null,340,420,14,"JINR / LLNL",1998,"Named for the Flerov Laboratory of Nuclear Reactions in Dubna."],
  [115,"Mc","Moscovium",290,"post-transition",15,7,"[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³",null,670,1400,13.5,"JINR / LLNL",2003,"Named for the Moscow region. All isotopes are intensely radioactive with short half-lives."],
  [116,"Lv","Livermorium",293,"post-transition",16,7,"[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴",null,709,1085,12.9,"JINR / LLNL",2000,"Named for Lawrence Livermore National Laboratory, which collaborated on its synthesis."],
  [117,"Ts","Tennessine",294,"halogen",17,7,"[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵",null,723,883,7.2,"ORNL / JINR",2010,"Named for Tennessee, home of Oak Ridge National Laboratory. The second-heaviest known element."],
  [118,"Og","Oganesson",294,"noble",18,7,"[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶",null,325,450,5.0,"JINR / LLNL",2002,"The heaviest known element, named for Yuri Oganessian. Despite its noble gas position, it may behave as a solid at room temperature."]
];

const CATEGORIES = {
  "alkali": { label: "Alkali Metals", color: "var(--cat-alkali)" },
  "alkaline": { label: "Alkaline Earth", color: "var(--cat-alkaline)" },
  "transition": { label: "Transition Metals", color: "var(--cat-transition)" },
  "post-transition": { label: "Post-Transition", color: "var(--cat-post-transition)" },
  "metalloid": { label: "Metalloids", color: "var(--cat-metalloid)" },
  "nonmetal": { label: "Nonmetals", color: "var(--cat-nonmetal)" },
  "halogen": { label: "Halogens", color: "var(--cat-halogen)" },
  "noble": { label: "Noble Gases", color: "var(--cat-noble)" },
  "lanthanide": { label: "Lanthanides", color: "var(--cat-lanthanide)" },
  "actinide": { label: "Actinides", color: "var(--cat-actinide)" }
};

// Supplemental data, keyed by atomic number.
// [empirical_radius_pm, abundance_mg_per_kg, state_at_RT, radioactive]
// state values: 'solid' | 'liquid' | 'gas'
//   (synthetic elements have their actual or best-predicted phase here;
//    the synthetic flag itself lives in ELEMENT_SYNTHETIC below)
// abundance: mg/kg in Earth's crust (synthetic/very rare → null)
const ELEMENT_EXTRA = {
  1:  [25,    1400,    'gas',       false],
  2:  [120,   0.008,   'gas',       false],
  3:  [145,   20,      'solid',     false],
  4:  [105,   2.8,     'solid',     false],
  5:  [85,    10,      'solid',     false],
  6:  [70,    200,     'solid',     false],
  7:  [65,    19,      'gas',       false],
  8:  [60,    461000,  'gas',       false],
  9:  [50,    585,     'gas',       false],
  10: [160,   0.005,   'gas',       false],
  11: [180,   23600,   'solid',     false],
  12: [150,   23300,   'solid',     false],
  13: [125,   82300,   'solid',     false],
  14: [110,   282000,  'solid',     false],
  15: [100,   1050,    'solid',     false],
  16: [100,   350,     'solid',     false],
  17: [100,   145,     'gas',       false],
  18: [71,    3.5,     'gas',       false],
  19: [220,   20900,   'solid',     false],
  20: [180,   41500,   'solid',     false],
  21: [160,   22,      'solid',     false],
  22: [140,   5650,    'solid',     false],
  23: [135,   120,     'solid',     false],
  24: [140,   102,     'solid',     false],
  25: [140,   950,     'solid',     false],
  26: [140,   56300,   'solid',     false],
  27: [135,   25,      'solid',     false],
  28: [135,   84,      'solid',     false],
  29: [135,   60,      'solid',     false],
  30: [135,   70,      'solid',     false],
  31: [130,   19,      'solid',     false],
  32: [125,   1.5,     'solid',     false],
  33: [115,   1.8,     'solid',     false],
  34: [115,   0.05,    'solid',     false],
  35: [115,   2.4,     'liquid',    false],
  36: [88,    0.0001,  'gas',       false],
  37: [235,   90,      'solid',     false],
  38: [200,   370,     'solid',     false],
  39: [180,   33,      'solid',     false],
  40: [155,   165,     'solid',     false],
  41: [145,   20,      'solid',     false],
  42: [145,   1.2,     'solid',     false],
  43: [135,   null,    'solid',     true],
  44: [130,   0.001,   'solid',     false],
  45: [135,   0.001,   'solid',     false],
  46: [140,   0.015,   'solid',     false],
  47: [160,   0.075,   'solid',     false],
  48: [155,   0.15,    'solid',     false],
  49: [155,   0.25,    'solid',     false],
  50: [145,   2.3,     'solid',     false],
  51: [145,   0.2,     'solid',     false],
  52: [140,   0.001,   'solid',     false],
  53: [140,   0.45,    'solid',     false],
  54: [108,   0.00003, 'gas',       false],
  55: [260,   3,       'solid',     false],
  56: [215,   425,     'solid',     false],
  57: [195,   39,      'solid',     false],
  58: [185,   66.5,    'solid',     false],
  59: [185,   9.2,     'solid',     false],
  60: [185,   41.5,    'solid',     false],
  61: [185,   null,    'solid',     true],
  62: [185,   7.05,    'solid',     false],
  63: [185,   2,       'solid',     false],
  64: [180,   6.2,     'solid',     false],
  65: [175,   1.2,     'solid',     false],
  66: [175,   5.2,     'solid',     false],
  67: [175,   1.3,     'solid',     false],
  68: [175,   3.5,     'solid',     false],
  69: [175,   0.52,    'solid',     false],
  70: [175,   3.2,     'solid',     false],
  71: [175,   0.8,     'solid',     false],
  72: [155,   3,       'solid',     false],
  73: [145,   2,       'solid',     false],
  74: [135,   1.25,    'solid',     false],
  75: [135,   0.0007,  'solid',     false],
  76: [130,   0.0015,  'solid',     false],
  77: [135,   0.001,   'solid',     false],
  78: [135,   0.005,   'solid',     false],
  79: [135,   0.004,   'solid',     false],
  80: [150,   0.085,   'liquid',    false],
  81: [190,   0.85,    'solid',     false],
  82: [180,   14,      'solid',     false],
  83: [160,   0.009,   'solid',     true],
  84: [190,   0.0000000000001, 'solid', true],
  85: [127,   null,    'solid',     true],
  86: [120,   0.0000000000004, 'gas', true],
  87: [260,   null,    'solid',     true],
  88: [215,   0.0000009, 'solid',   true],
  89: [195,   null,    'solid',     true],
  90: [180,   9.6,     'solid',     true],
  91: [180,   0.0000014, 'solid',   true],
  92: [175,   2.7,     'solid',     true],
  93: [175,   null,    'solid',     true],
  94: [175,   null,    'solid',     true],
  95: [175,   null,    'solid',     true],
  96: [176,   null,    'solid',     true],
  97: [175,   null,    'solid',     true],
  98: [175,   null,    'solid',     true],
  99: [175,   null,    'solid',     true],
  100: [175,  null,    'solid',     true],
  101: [175,  null,    'solid',     true],
  102: [175,  null,    'solid',     true],
  103: [175,  null,    'solid',     true],
  104: [157,  null,    'solid',     true],
  105: [149,  null,    'solid',     true],
  106: [143,  null,    'solid',     true],
  107: [141,  null,    'solid',     true],
  108: [134,  null,    'solid',     true],
  109: [129,  null,    'solid',     true],
  110: [128,  null,    'solid',     true],
  111: [121,  null,    'solid',     true],
  112: [122,  null,    'solid',     true],
  113: [136,  null,    'solid',     true],
  114: [143,  null,    'solid',     true],
  115: [162,  null,    'solid',     true],
  116: [175,  null,    'solid',     true],
  117: [165,  null,    'solid',     true],
  118: [157,  null,    'gas',       true]
};

// Synthetic elements — those that don't occur naturally in measurable
// quantities and are produced only in particle accelerators or reactors.
// Kept as a separate Set (not a tuple slot) so the synthetic flag is
// orthogonal to physical state in both the data model and the UI: an
// element can be "solid + synthetic" (e.g. technetium) or just "solid"
// (e.g. iron) without conflating the two dimensions.
//
// Phases for elements past 111 are theoretical predictions — most of these
// nuclei decay within seconds, so direct measurement is impossible. The
// values used in ELEMENT_EXTRA reflect the conventional Aufbau-based
// textbook predictions; recent relativistic-effects research suggests some
// (notably Cn, Fl, Og) may behave differently, but consensus is unsettled.
const ELEMENT_SYNTHETIC = new Set([
  43, 61,
  93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103,
  104, 105, 106, 107, 108, 109, 110, 111, 112,
  113, 114, 115, 116, 117, 118
]);

// Nucleosynthetic origin — where each element was forged in the cosmos.
// Categorization follows the standard astrophysical breakdown commonly used in
// origin-of-the-elements periodic tables. Each element is assigned its *dominant*
// production source; reality is messier (most elements are made via multiple
// pathways) but this is the textbook simplification.
//
// Process keys:
//   bigbang    — Big Bang nucleosynthesis (first ~20 min after the Big Bang)
//   cosmicray  — Cosmic ray spallation (cosmic rays hitting heavier nuclei)
//   smallstars — Fusion in low-to-intermediate mass stars (incl. AGB s-process)
//   bigstars   — Fusion in massive stars (up through iron peak)
//   supernova  — Exploding massive stars (core-collapse supernovae)
//   merger     — Neutron star mergers (heavy r-process elements)
//   synthetic  — Human-made in reactors / accelerators
const ELEMENT_ORIGIN = {
  1: 'bigbang', 2: 'bigbang',
  3: 'bigbang',  // also cosmicray contribution
  4: 'cosmicray', 5: 'cosmicray',
  6: 'smallstars', 7: 'smallstars', 8: 'smallstars', 9: 'smallstars',
  10: 'smallstars', 11: 'smallstars', 12: 'smallstars',
  13: 'bigstars', 14: 'bigstars', 15: 'bigstars', 16: 'bigstars',
  17: 'bigstars', 18: 'bigstars', 19: 'bigstars', 20: 'bigstars',
  21: 'supernova', 22: 'bigstars', 23: 'supernova',
  24: 'bigstars', 25: 'supernova', 26: 'bigstars',
  27: 'supernova', 28: 'bigstars',
  29: 'supernova', 30: 'supernova',
  31: 'supernova', 32: 'smallstars', 33: 'supernova',
  34: 'smallstars', 35: 'supernova', 36: 'smallstars',
  37: 'supernova', 38: 'smallstars', 39: 'supernova',
  40: 'smallstars', 41: 'supernova', 42: 'smallstars',
  43: 'synthetic', 44: 'supernova', 45: 'supernova',
  46: 'smallstars', 47: 'supernova', 48: 'smallstars',
  49: 'supernova', 50: 'smallstars', 51: 'supernova',
  52: 'smallstars', 53: 'supernova', 54: 'smallstars',
  55: 'supernova', 56: 'smallstars',
  57: 'smallstars', 58: 'smallstars', 59: 'smallstars',
  60: 'smallstars', 61: 'synthetic', 62: 'smallstars',
  63: 'merger', 64: 'merger', 65: 'merger',
  66: 'merger', 67: 'merger', 68: 'merger',
  69: 'merger', 70: 'merger', 71: 'merger',
  72: 'smallstars', 73: 'supernova', 74: 'smallstars',
  75: 'supernova', 76: 'merger', 77: 'merger',
  78: 'merger', 79: 'merger', 80: 'merger',
  81: 'supernova', 82: 'smallstars', 83: 'merger',
  84: 'merger', 85: 'merger', 86: 'merger',
  87: 'merger', 88: 'merger', 89: 'merger',
  90: 'merger', 91: 'merger', 92: 'merger',
  93: 'synthetic', 94: 'synthetic', 95: 'synthetic',
  96: 'synthetic', 97: 'synthetic', 98: 'synthetic',
  99: 'synthetic', 100: 'synthetic', 101: 'synthetic',
  102: 'synthetic', 103: 'synthetic', 104: 'synthetic',
  105: 'synthetic', 106: 'synthetic', 107: 'synthetic',
  108: 'synthetic', 109: 'synthetic', 110: 'synthetic',
  111: 'synthetic', 112: 'synthetic', 113: 'synthetic',
  114: 'synthetic', 115: 'synthetic', 116: 'synthetic',
  117: 'synthetic', 118: 'synthetic'
};

// Display config for stardust origin chips — order matters (this is the
// chronological/cosmological order: Big Bang → modern lab).
const ORIGIN_CONFIG = [
  { key: 'bigbang',    label: 'Big Bang',          short: 'Big Bang' },
  { key: 'cosmicray',  label: 'Cosmic Rays',       short: 'Cosmic' },
  { key: 'smallstars', label: 'Small Stars',       short: 'Small' },
  { key: 'bigstars',   label: 'Massive Stars',     short: 'Massive' },
  { key: 'supernova',  label: 'Supernovae',        short: 'Supernova' },
  { key: 'merger',     label: 'Neutron Mergers',   short: 'Merger' },
  { key: 'synthetic',  label: 'Human-Made',        short: 'Lab' }
];

// Expose to the global scope for app.js / games.js to read.
window.ELEMENTS       = ELEMENTS;
window.ELEMENT_EXTRA  = ELEMENT_EXTRA;
window.ELEMENT_ORIGIN = ELEMENT_ORIGIN;
window.CATEGORIES     = CATEGORIES;
window.ORIGIN_CONFIG  = ORIGIN_CONFIG;
