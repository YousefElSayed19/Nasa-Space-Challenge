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
| NTRS 20150008247, early versus late design decisions | https://ntrs.nasa.gov/citations/20150008247 | **All missions:** margins by phase; the rule that late changes cost more (change-request fees) |
| NTRS 20150022911, concurrent engineering centers | https://ntrs.nasa.gov/citations/20150022911 | **Team play:** the idea behind the four roles |
| NASA Earthdata, Sun–satellite interactions | https://www.earthdata.nasa.gov/learn/articles/sun-satellite-interactions | **Solar storm event:** bit flips, safe mode, drag (May 2024 examples) |
| NASA Launch Services Program fact sheet | *link to add* | **Rockets:** Atlas V, Vulcan Centaur, Falcon Heavy capacities to low Earth orbit |
| NASA Small Spacecraft Technology State of the Art, Power | *link to add* | **Power:** sunlight falls with the square of distance; solar cell and battery figures in the glossary |

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

All 3D models, textures and sounds are generated in code. No third-party models, images or sound files are used.

## Values that are game assumptions (marked approximate)

- Per-instrument mass, power and data on every mission (instrument names with “-style” are not the real instruments’ numbers).
- Solar array sizes other than the real one on each mission, the smaller antennas, battery, shielding, heat-shield and parachute values.
- Rocket capacity to each destination and prices for Vulcan Centaur and Falcon Heavy (Atlas V uses the real MRO launch cost).
- Extra Δv for other burns on Mars, all Δv values for Europa, descent Δv and parachute savings for the Mars Lander.
- Budgets for the Lunar Orbiter and the Mars Lander (no NASA cost figure found).
- Scoring weights, event chances, change-request fees, and the size and interest of extra funding.
