# MissionForge source register

Every page and document the research opened, with what it supports and what to watch for.
All were read on 10 November 2026. The `id` column matches `source_id` in `src/data/sources.json`.
Add a source here the moment it is used (GDD section 13).

Type key: **NASA** = NASA or JPL official page. **NTRS** = NASA Technical Reports Server paper.
**Event** = Space Apps organiser material. **Other** = not a NASA source; must not supply game numbers.

## 1. Event and challenge

| id | Source | Type | Supports | Caveat |
|---|---|---|---|---|
| challenge-repo | Space-Mission-Design-Game repository (github.com/NASA-SPACEAPP-2026/Space-Mission-Design-Game) | Event | Challenge text, requirements, scoring ideas, suggested extras | The official challenge page on spaceappschallenge.org could not be opened; confirm against it |
| sa-faq | Space Apps participant FAQ | Event | Global event dates, guides, age rules | Gives global dates (14 and 15 Nov); the Cairo event is 13 and 14 Nov |
| sa-legal | Participant terms and conditions (spaceappschallenge.org/legal) | Event | Originality, open source, citation, export control, content rules | Silent on pre-event work and AI |
| sa-submission | Project submission guide | Event | Submission requirements, AI disclosure | Page showed dates from a previous year; use the Cairo guide for dates |
| cairo-guide | Cairo Hackathon Guide 2026 and acceptance email | Event | Schedule, mentorship, checklist, judging criteria, venue rules | No public URL; keep the original files |
| nasa-media | NASA images and media guidelines (nasa.gov/nasa-brand-center/images-and-media) | NASA | Use of NASA images, credit, no logos, no implied endorsement | Not legal advice |

## 2. Systems engineering, risk, margins and costs

| id | Source | Type | Supports | Caveat |
|---|---|---|---|---|
| seh-cm | NASA Systems Engineering Handbook, Configuration Management | NASA | Baselines, change control boards, major versus minor changes | Implies, but does not state, that late changes cost more |
| ntrs-earlylate | NTRS 20150008247, early versus late design decisions | NTRS | Cheap early changes, costly later; 25/20/15% margins by phase; 25% budget margin | Qualitative; no cost multiplier; some figures are images not read |
| ntrs-margins | NTRS 20120013284, margin guidelines | NTRS | Contingency and margin definitions; 30% power; 30% data; 3 dB link; propellant allowances | Guidelines for one design centre; no cost margin |
| s3001 | NASA S3001 risk management guideline | NASA | Likelihood scale, five-by-five matrix, response options | Worked example does not match a simple product; consequence table was an image |
| ntrs-cec | NTRS 20150022911, concurrent engineering centres | NTRS | Team roles; how models show cross-subsystem effects | Describes six centres; our four roles are our own grouping |
| pi-l1 | PI Masters Forum, Level 1 and 2 requirements | NASA | How science objectives are written | Does not define baseline versus threshold missions |
| nap-cost | National Academies, Controlling Cost Growth of NASA Missions, ch. 3 | Other | Context: most cost growth comes after critical design review | Not NASA; only the first part was read |
| artemis-frr | NASA, Artemis II flight readiness review | NASA | NASA holds a flight readiness review and polls Go | Does not describe who is polled or how |

## 3. Spacecraft design and environment

| id | Source | Type | Supports | Caveat |
|---|---|---|---|---|
| smallsat-power | NASA Small Spacecraft State of the Art, Power Subsystems | NASA | Cell efficiency, panel W/kg, batteries, inverse-square sunlight | Small spacecraft; only the first part was read; RTG figures not read |
| lsp-sheet | NASA Launch Services Program fact sheet | NASA | Rocket list and capacities to low Earth orbit | Capacity to LEO is not capacity to the Moon, Mars or Jupiter |
| earthdata-sun | NASA Earthdata, Sun–satellite interactions | NASA | Solar storm effects (bit flips, drag, link disruption), May 2024 examples | Does not cover charging or panel degradation |
| horizons | JPL Horizons manual (API at ssd-api.jpl.nasa.gov) | NASA | Public API for planets and 253 spacecraft | Only the first part of the manual was read |
| eyes | Eyes on the Solar System (data.gov listing) | NASA | Existence of a 3D real-data visualisation | No licence stated; visual reference only |

## 4. Mission data

| id | Source | Type | Supports | Caveat |
|---|---|---|---|---|
| clipper-facts | JPL Europa Clipper quick facts | NASA | Mass, propellant, size, trajectory, cost, radiation vault, flybys | No wattage or data rate; instruments not named |
| clipper-craft | JPL Europa Clipper spacecraft page | NASA | Arrays, power values, antennas, vault, engines, detector cooling | No data rates; instruments not named |
| clipper-faq | NASA Europa Clipper mission FAQ | NASA | Instrument roles, goals, about 50 flybys, 25 km closest approach, radiation approach | Instruments not named |
| mro-kit | JPL MRO launch press kit | NASA | Mass breakdown, hydrazine, power, data rate, cost, orbit insertion | Internal inconsistencies (data return, cruise time, launch period); last part not read |
| lro-sheet | NASA LRO fact sheet (archived) | NASA | LRO instruments, orbit, rocket, goals | No mass, power or data rate |
| lro-ntrs-1 | NTRS 20110007093, LRO mission paper | NTRS | Delta-v 1,258 m/s, 555 m/s insertion, 50 km orbit, 113 min period, 5-day transit | No spacecraft mass, power or cost |
| lro-ntrs-2 | NTRS 20180000056, LRO paper | NTRS | Dry mass 810 kg, fuel 894 kg, 823 W, 100 Mbps Ka band | Conflicts with eoPortal; no launch mass |
| lro-eoportal | eoPortal, LRO | Other | Only to show a disagreement (949 kg dry, 897 kg fuel, 824 W) | Not NASA; do not use for game numbers |

NTRS papers can be opened at `https://ntrs.nasa.gov/citations/<number>`.


## 5. Sources added on 11 November 2026

| id | Source | Type | Supports | Caveat |
|---|---|---|---|---|
| grc-rocket-eq | NASA Glenn, Ideal Rocket Equation (www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/) | NASA | The rocket equation used for propellant | Educational page; the game adds a 5% attitude-control allowance from NTRS 20120013284 |
| grc-isp | NASA Glenn, Specific Impulse (grc.nasa.gov/www/BGH/specimp.html) | NASA | Definition of specific impulse, Isp = Veq / g0 | Definition only, no propellant values |
| ntrs-hydrazine-isp | NTRS 19970010493, small spacecraft propulsion comparison | NTRS | Hydrazine monopropellant Isp of 223 s | Small-spacecraft study; used for all three missions |
| clipper-instruments | NASA Science, Europa Clipper spacecraft instruments (science.nasa.gov/mission/europa-clipper/spacecraft-instruments/) | NASA | Names and roles of the nine instruments | No mass, power or data rate per instrument |
| clipper-europa-site | europa.nasa.gov/spacecraft | NASA | About 6,000 kg at launch, about 2,750 kg propellant | Rounded figures |
| lro-gsfc-paper | Houghton and Tooley, Mission design and operations considerations for LRO (NASA GSFC, IAC-07-C1.7.06) | NASA | LRO total mass about 1,845 kg | Pre-launch design value |
| lro-nssdc | NASA NSSDC Master Catalog, LRO (archived) | NASA | 92 kg of scientific payload | Archived page |

## 6. Pages that could not be opened

- The official challenge page on spaceappschallenge.org (blocked for automated reading). Open it by hand and compare with the repository text.
- NASA Systems Engineering Handbook, section 6.4 (technical risk management). The S3001 guideline was used instead.

## 7. Values that are game assumptions (shown as approximate in the game)

- Per-instrument mass, power and data (only the 139 kg MRO total is from NASA).
- Solar array sizes other than 20 m², the 2 m antenna, battery and shielding masses.
- Rocket capacity to Mars and prices for Vulcan Centaur and Falcon Heavy.
- The extra Δv for other burns on Mars (400 m/s) and all Δv values for Europa.
- LRO cost, Europa Clipper data rate, and per-instrument values on every mission (names on the Moon say "-style" for this reason).
- Scoring weights, event chances and change-request fees.

## 8. Sources still needed (GDD 15.1)

| Gap | Why it matters |
|---|---|
| A NASA value for the solar power flux at Earth | Needed for the solar power formula |
| Rocket capacity toward the Moon, Mars and Jupiter | The fact sheet gives only capacity to Earth orbit |
| Launch prices | Rocket cost is a core trade-off |
| Mass, power and data rate per instrument | The catalog needs per-part values |
| LRO cost; reconcile LRO launch mass (1,845 kg design value vs other published figures) | Mission 1 budget is a game value |
| Radioisotope power data; Europa Clipper data rate | The catalog and Mission 3 need them |
| Propellants used by launch vehicles | Needed before labelling any rocket propellant |

**Rule (GDD 13.1):** a search snippet is not a source. Open the NASA or JPL page first, then record the URL, what it supports and the date read.
