# Source register (game numbers)

Every number in `src/data` must trace to one of these sources, or be marked `"approximate": true` (GDD section 13).
The machine-readable copy is `src/data/sources.json`. Add a source here the moment it is used.

| id | Source | Supports |
|---|---|---|
| mro-kit | JPL MRO launch press kit | Launch mass 2,180 kg, 139 kg science payload, hydrazine tank 1,220 kg, about 2,000 W at Mars, up to 6 Mbps, cost about $720M, orbit insertion about 1,000 m/s and 25 minutes |
| ntrs-margins | NTRS 20120013284 | Margin and contingency definitions, 30% power contingency, 5% attitude-control propellant |
| ntrs-earlylate | NTRS 20150008247 | 25/20/15% margins by phase; late changes cost more |
| lsp-sheet | NASA Launch Services Program fact sheet | Rocket capacities to low Earth orbit |
| earthdata-sun | NASA Earthdata, Sun–satellite interactions | Solar storm effects |
| seh-cm | NASA Systems Engineering Handbook, Configuration Management | Baselines and change control |
| artemis-frr | NASA Artemis II flight readiness review | Readiness reviews poll Go |

## Values that are game assumptions (shown as approximate in the game)

- Per-instrument mass, power and data (only the 139 kg total is from NASA).
- Solar array sizes other than 20 m², the 2 m antenna, battery and shielding masses.
- Rocket capacity to Mars and prices for Vulcan Centaur and Falcon Heavy.
- Specific impulse 220 s for hydrazine and the extra 400 m/s for other burns.
- Scoring weights, event chances and change-request fees.

## Still needed before submission (GDD 15.1)

- A NASA page for the rocket equation.
- A NASA value for hydrazine specific impulse.
- Rocket capacity toward Mars from a NASA source.
