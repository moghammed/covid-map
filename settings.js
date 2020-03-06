const ACCESSTOKEN = '<replace this with your mapbox access token>';
const SHEET_URL = '<replace this with your spreadsheet url>';

const INITIAL_CENTER = [4.4444, 52.5252];
const INITIAL_ZOOM = 7;

const GROUP_COLORS = {
  confirmed: [1,'#f28cb1', 25, '#ff0000'],
  unconfirmed: [1,'#ffffaa', 25, '#ffaa00'],
  deceased: [1,'#aaaaaa', 25, '#000000'],
  recovered: [1,'#ddffdd', 25, '#88ff44'],
  suspected: [1,'#aaddff', 25, '#0000ff']
}

const CLUSTER_SIZES = [
  0,
  0,
  1,
  10,
  100,
  200
]

const CLUSTER_GROWTH = [
  'interpolate',
  ["linear"],
]

const STATUS_ORDER = [
  'confirmed',
  'deceased',
  'recovered',
  'suspected',
  'unconfirmed',
]

const BUTTON_OFF_BACKGROUNDCOLOR = '#ffffff';
const BUTTON_OFF_TEXTCOLOR = '#000000';
