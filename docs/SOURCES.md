# MissionForge sources

Every source the project used, its link, and exactly what we used it for.
Values in the game that no NASA source supports are marked **approximate** in the game and in `src/data`.
Last checked 12 November 2026. If a link is marked *link to add*, the source was read but its address was not recorded; find and add it before submission.

## A. NASA data used for numbers in the game

| Source | Link | What we used it for |
|---|---|---|
| JPL Mars Reconnaissance Orbiter launch press kit | https://www.jpl.nasa.gov/news/press_kits/mro-launch-Aug05.pdf | **Mars Orbiter mission:** launch mass 2,180 kg, 139 kg science payload, hydrazine tank 1,220 kg, about 2,000 W at Mars, up to 6 Mbps, cost about $720M (450 spacecraft, 90 launch, 180 operations), orbit insertion about 1,000 m/s and 25 minutes, 20 m² arrays, 3 m antenna, nickel-hydrogen batteries, Atlas V 401 |
| JPL Europa Clipper press kit, Quick Facts | https://www.jpl.nasa.gov/press-kits/europa-clipper/quick-facts/ | **Europa mission:** about 5,800 kg at launch including about 2,750 kg of propellant; radiation vault walls up to 9.2 mm thick |
| europa.nasa.gov, spacecraft | https://europa.nasa.gov/spacecraft | **Europa mission:** the aluminum-zinc radiation vault (the Radiation Vault part) |
| NASA Science, Europa Clipper spacecraft instruments | https://science.nasa.gov/mission/europa-clipper/spacecraft-instruments/ | **Europa mission:** names and roles of the instruments (EIS, MISE, REASON, E-THEMIS, ECM, MASPEX) |
| JPL Europa Clipper spacecraft page and mission FAQ | *link to add* | **Europa mission:** about 102 m² arrays, at least 700 W at Jupiter, 3 m antenna with seven backups, about 50 flybys, antenna pointing away during flybys |
| JPL InSight launch press kit, Quick Facts | https://www.jpl.nasa.gov/news/press_kits/insight/launch/facts | **Mars Lander mission:** about 694 kg at launch, 2.64 m aeroshell, arrays about 600–700 W on a clear Martian day and 200–300 W when dusty, lithium-ion batteries |
| JPL InSight landing press kit, Quick Facts | https://www.jpl.nasa.gov/news/press_kits/insight/landing/facts | **Mars Lander mission:** heat shield slightly thicker than Phoenix’s (the Thick Heat Shield part) |
| JPL InSight landing press kit, spacecraft | https://www.jpl.nasa.gov/news/press_kits/insight/landing/mission/spacecraft | **Mars Lander mission:** two round solar arrays (the round array shape) |
| NTRS 20110007093, LRO mission paper | https://ntrs.nasa.gov/citations/20110007093 | **Lunar Orbiter mission:** total Δv 1,258 m/s, lunar orbit insertion 555 m/s, 50 km polar orbit, 5-day trip |
| NTRS 20180000056, LRO paper | https://ntrs.nasa.gov/citations/20180000056 | **Lunar Orbiter mission:** about 823 W average power, 100 Mbps Ka-band downlink, about 894 kg of fuel |
| NASA NSSDC catalog entry for LRO (archived) | https://webarchive.library.unt.edu/web/20130222001006/http://nssdc.gsfc.nasa.gov/database/MasterCatalog?sc=LUNARRO | **Lunar Orbiter mission:** 92 kg of science payload |
| NASA GSFC LRO mission design paper (Houghton and Tooley, IAC-07-C1.7.06) | *link to add* | **Lunar Orbiter mission:** about 1,845 kg total mass (design value) |
| NASA LRO fact sheet (archived) | *link to add* | **Lunar Orbiter mission:** instrument list, orbit, Atlas V 401 launch |
| NASA Glenn, Ideal Rocket Equation | https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/ | **All missions:** the rocket equation that sets how much propellant each design needs |
| NASA Glenn, Specific Impulse | https://www.grc.nasa.gov/www/BGH/specimp.html | **All missions:** definition of specific impulse used in the propellant formula and the glossary |
| NTRS 19970010493, small spacecraft propulsion | https://ntrs.nasa.gov/citations/19970010493 | **All missions:** hydrazine specific impulse of 223 s |
| NTRS 20120013284, margin guidelines | https://ntrs.nasa.gov/citations/20120013284 | **All missions:** the 25–30% safety margin (white tick on every bar), 30% power and data contingency, 5% attitude-control propellant allowance |
| NTRS 20150008247, early versus late design decisions | https://ntrs.nasa.gov/citations/20150008247 | **All missions:** margins by phase; the rule that late changes cost more (change-request fees, and the fee for going back to an earlier stage) |
| NTRS 20150022911, concurrent engineering centers | https://ntrs.nasa.gov/citations/20150022911 | **Team play:** the idea behind the four roles |
| NASA Earthdata, Sun–satellite interactions | https://www.earthdata.nasa.gov/learn/articles/sun-satellite-interactions | **Solar storm event:** bit flips, safe mode, drag (May 2024 examples) |
| NASA Launch Services Program fact sheet | *link to add* | **Rockets:** Atlas V, Vulcan Centaur, Falcon Heavy capacities to low Earth orbit |
| NASA Small Spacecraft Technology State of the Art, Power | *link to add* | **Power:** sunlight falls with the square of distance; solar cell and battery figures in the glossary |

## A2. Instrument figures (added in version 0.20)

Every instrument card in the game shows its mass and power. Where a NASA source gives the figure, the card says **NASA figures** and links the source; otherwise it says **Approximate values**. The rest of each spacecraft (the bus) is sized so that each mission's real design keeps the same total mass and power as before.

| Source | Link | What we used it for |
|---|---|---|
| NASA Science: MRO science instruments | https://science.nasa.gov/mission/mars-reconnaissance-orbiter/science-instruments/ | **Mars Orbiter:** HiRISE 65 kg, 60 W; CRISM 32.92 kg, 44.4–47.3 W; MCS 9 kg, 11 W; SHARAD 15 kg (10 W transmit power); CTX 3 kg, 7 W; MARCI 481 g, under 5 W; plus resolutions, swath widths and wavelengths shown on the cards |
| JPL MRO launch press kit, science instruments section | https://www.jpl.nasa.gov/news/press_kits/mro-launch-Aug05.pdf | **Mars Orbiter:** HiRISE 50 cm mirror, CRISM 544 wavelengths, SHARAD 15–25 MHz with a 10 m antenna, MARCI 180° view |
| NASA LRO/LCROSS launch press kit (2009), instrument figures as reproduced by Spaceflight Now | https://spaceflightnow.com/atlas/av020/090610lro.html | **Lunar Orbiter:** LROC 19.2 kg, 24.0 W; LOLA 11.3 kg, 33.4 W; Diviner 11.0 kg, 24.7 W; LAMP 6.1 kg, 4.0 W; LEND 25.8 kg, 11.6 W; CRaTER 5.4 kg, 7.3 W; Mini-RF 13.8 kg, 7.0 W. The original NASA press kit link should be added if found. |
| NASA GSFC LRO mission design paper (Houghton and Tooley), archived copy | https://corpora.tika.apache.org/base/docs/govdocs1/698/698820.pdf | **Lunar Orbiter:** effective specific impulse 212.2 s (used for the Moon mission's propellant), total mass 1,845 kg, Atlas V 401 limit of 2,000 kg |
| NASA Science: LRO spacecraft and instruments | https://science.nasa.gov/mission/lro/spacecraft-and-instruments/ | **Lunar Orbiter:** payload capacity about 100 kg and 100 W |
| NASA Science: InSight science instruments | https://science.nasa.gov/mission/insight/science-instruments/ | **Mars Lander:** SEIS up to 8.5 W and 38 Mb per day; HP3 about 3 kg and 2 W; RISE 7.3 kg and 78 W for up to one hour a day (about 3.3 W averaged) |
| JPL InSight landing press kit: quick facts | https://www.jpl.nasa.gov/news/press_kits/insight/landing/facts | **Mars Lander:** science payload about 50 kg (used to size the instruments without their own NASA figure) |
| JPL Europa Clipper project newsletter: Weigh Your Options Carefully | https://europa.nasa.gov/internal_resources/116 | **Europa:** 352 kg allocated to the nine instruments, 3,241 kg dry, 2,750 kg propellant, 6,001 kg maximum wet mass, 273 kg (8.4%) project reserve. Per-instrument figures are not published there, so Europa instruments are marked approximate. |

New real instruments added in this version: Mini-RF (LRO), Europa-UVS, PIMS and SUDA (Europa Clipper). New optional part: a bipropellant main engine in the Engine Bay (game values, marked approximate); without it the spacecraft uses hydrazine thrusters at 223 s (NTRS 19970010493), or 212.2 s for the Moon mission.

## A3. Flight tour and extra camera options (added in version 0.21)

| Source | Link | What we used it for |
|---|---|---|
| JPL MRO launch press kit | https://www.jpl.nasa.gov/news/press_kits/mro-launch-Aug05.pdf | **Flight tour (Mars and Lander):** Atlas V booster burns about 4 minutes, Centaur fires twice, separation under an hour after liftoff at about 11,000 m/s; five planned trajectory corrections; orbit insertion about 25 minutes and about 1,000 m/s; about six months of aerobraking; Mars 227.7 million km from the Sun, gravity 38%, day 24 h 39 min; data rate about 600 kbit/s at the farthest distance, signals up to about 21 minutes |
| NASA Science: MRO science instruments | https://science.nasa.gov/mission/mars-reconnaissance-orbiter/science-instruments/ | **Camera classes on every mission:** HiRISE-class (65 kg, 60 W), CTX-class (3 kg, 7 W) and MARCI-class (481 g, 5 W) options use the mass and power these cameras flew with on MRO; resolution at other worlds depends on orbit height |
| NTRS 20110007093, NTRS 20180000056, NASA GSFC LRO paper | see section A | **Flight tour (Moon):** 5-day trip, 1,258 m/s total Δv, 555 m/s insertion into a 50 km orbit, 100 Mbit/s downlink, 2,000 kg Atlas V limit |
| JPL Europa Clipper Quick Facts | https://www.jpl.nasa.gov/press-kits/europa-clipper/quick-facts/ | **Flight tour (Europa):** about 5,800 kg at launch, radiation vault walls up to 9.2 mm |

General background in the tour (the Moon about 384,000 km away, the Sun at the centre of every orbit, gravity assists, the asteroid belt being mostly empty) is standard astronomy and is not given a single source.

All four missions in the game are one-way robotic missions: none of the real spacecraft returns to Earth. The game shows the real “return”, the science data sent home by radio.

## A4. Landing and flight equations (added in version 0.24)

| Source | Link | What we used it for |
|---|---|---|
| JPL InSight landing press kit: mission overview | https://www.jpl.nasa.gov/news/press_kits/insight/landing/mission/ | **Mars Lander landing, step by step:** cruise stage dropped 7 minutes before entry; entry at 128 km and about 5.5 km/s with about 608 kg; peak heating about 1,500 °C; nearly 99.5% of the energy removed before the parachute; up to 7.5 g; parachute at 11.1 km and about 385 m/s with about 55,600 N; heat shield dropped and legs out within 25 s; lander separation at about 1 km and 60 m/s, 45 s before touchdown, 12 descent engines; constant velocity at 50 m and 7.7 m/s; touchdown at about 2.24 m/s; about 6.5 minutes in total; 6 planned trajectory corrections and a 205-day cruise |
| JPL InSight landing press kit: quick facts | https://www.jpl.nasa.gov/news/press_kits/insight/landing/facts | **Mars Lander:** lander about 358 kg, aeroshell 189 kg, cruise stage 79 kg, 67 kg of propellant and pressurant; 11.8 m parachute; SLA-561V heat shield 2.64 m wide; U.S. investment $813.8 million including about $163.4 million for the launch |

**Equations shown during the flight**, using the player's own design:
- Kinetic energy at entry: KE = ½·m·v², with v = 5.5 km/s from the press kit.
- Powered descent Δv ≈ (60 − 2.24) m/s + 3.71 m/s² × 45 s ≈ 225 m/s, from the press kit's separation speed, touchdown speed and timing, and Mars gravity of 38% of Earth's (MRO press kit). For InSight's 358 kg lander at a hydrazine Isp of 223 s this needs about 35 kg of propellant, consistent with the 67 kg loaded for the whole flight.
- Capture burn for orbiters: m_prop = m_dry·(e^(Δv / (Isp·g₀)) − 1), the NASA Glenn rocket equation.
- Altitude and speed between the press kit's points are interpolated, and the card says so.

## B. NASA guidance used for game rules and wording

| Source | Link | What we used it for |
|---|---|---|
| NASA Systems Engineering Handbook, Configuration Management | *link to add* | Locked stages (baselines) and change requests |
| NASA S3001 risk management guideline | *link to add* | Low, medium and high risk in the Go/No-Go review |
| NASA PI Masters Forum, Level 1 and 2 requirements | *link to add* | Writing mission objectives with result-based verbs |
| NASA, Artemis II flight readiness review | *link to add* | The idea of polling each team for Go before launch |
| NASA images and media guidelines | https://www.nasa.gov/nasa-brand-center/images-and-media | No NASA logos, credit NASA, no implied endorsement |

## C. Event rules

| Source | Link | What we used it for |
|---|---|---|
| Space Mission Design Game challenge repository | https://github.com/NASA-SPACEAPP-2026/Space-Mission-Design-Game | Challenge requirements, scoring ideas and suggested extras |
| Space Apps participant terms and conditions | https://spaceappschallenge.org/legal | Open-source licence, citing sources, originality, content rules |
| Cairo Hackathon Guide 2026 | Provided by the organizers (no public link) | Schedule, judging criteria, submission checklist |

## D. Consulted but not used for game numbers

| Source | Link | Why it is not used |
|---|---|---|
| eoPortal, LRO | https://eoportal.org/satellite-missions/lro | Not a NASA source; only showed that LRO figures differ between sources |
| JPL Horizons system | https://ssd-api.jpl.nasa.gov | Live planet positions are not used; the game draws schematic paths |
| NASA Eyes on the Solar System | *link to add* | Visual reference only; no licence stated |
| National Academies, Controlling Cost Growth of NASA Missions | *link to add* | Context on why costs grow; not a NASA source |

## E. Software

| Library | Link | Licence | What we used it for |
|---|---|---|---|
| React | https://react.dev | MIT | The game interface |
| Three.js | https://threejs.org | MIT | The 3D hangar, spacecraft and mission flights |
| Vite | https://vitejs.dev | MIT | Building the website |
| Vitest | https://vitest.dev | MIT | Testing the simulation engine |
| MQTT.js 5.10.1 | https://github.com/mqttjs/MQTT.js | MIT | Online multiplayer (loaded only when hosting or joining) |
| EMQX and HiveMQ public MQTT brokers | https://www.emqx.com/en/mqtt/public-mqtt5-broker · https://www.hivemq.com/mqtt/public-mqtt-broker/ | Free public test brokers | Passing multiplayer messages between players |

All 3D models, textures and sounds are generated in code. No third-party models, images or sound files are used.

## Values that are game assumptions (marked approximate)

- Per-instrument mass and power on Europa (only the 352 kg total is published), SEIS mass, and the InSight arm, weather sensors and magnetometer; data volumes in game units on every mission.
- Instrument prices (no per-instrument NASA cost figures were found).
- The bipropellant engine's efficiency, mass and price.
- Solar array sizes other than the real one on each mission, the smaller antennas, battery, shielding, heat-shield and parachute values.
- Rocket capacity to each destination and prices for Vulcan Centaur and Falcon Heavy (Atlas V uses the real MRO launch cost).
- Extra Δv for other burns on Mars, all Δv values for Europa, descent Δv and parachute savings for the Mars Lander.
- Budgets for the Lunar Orbiter and the Mars Lander (no NASA cost figure found).
- Scoring weights, event chances, change-request fees, and the size and interest of extra funding.
