# juno clock

A clock that moves toward midnight on documented evidence that AI systems are not under control. Static site, no build.

The record is `events.json`. Each entry: `date`, `w` (weight 1 to 5, see the rules table on the site), `title`, `body`, `source`. The clock starts at 23:30:00 and each weight point advances it 30 seconds. Sixty points is midnight.

To propose an entry, open an issue with the date, one line on what happened, the primary source, and the weight you think it deserves.

Run locally: `python3 -m http.server 5231` in this folder.
