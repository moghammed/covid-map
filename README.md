# covid-map
The easiest way to create your own local covid-19 map

To create your own covid-19 map you'll need 3 things; 

1. A webserver
2. A clone of this google sheet: https://docs.google.com/spreadsheets/d/1p9RV9poM7QzCPxTFTAUKDrtl2H6cdhkTxfIFR3BPF_s/edit?usp=sharing
3. A free mapbox account: https://account.mapbox.com/auth/signup/?route-to=%22https://account.mapbox.com/%22

To get your map up and running, you only need to follow these easy steps:

1. Clone the repo to your server.
2. Make a copy of the spreadsheet in your own google drive.
3. Publish the spreadsheet as "tsv" and copy the link.
4. Update `settings.js` on your webserver with the tsv link where it says `SHEET_URL`.
5. Get a mapbox access token at https://account.mapbox.com/ and copy it.
6. Update `settings.js` on your webserver with the mapbox access token where it says `ACCESSTOKEN`.
7. Start filling the sheet with the cases as they appear.
